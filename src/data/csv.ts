import { formatDateFr, isRealDate, toIsoDate, parseDate } from '../domain/dates.ts'
import { createShift } from '../domain/drafts.ts'
import { SHIFT_LABEL, METHOD_LABEL } from '../domain/labels.ts'
import { shiftAmountCents, shiftMinutes, sortPayments } from '../domain/ledger.ts'
import { csvNumber, parseEurosToCents } from '../domain/money.ts'
import { formatDuration, isTime } from '../domain/time.ts'
import type { Payment, Shift, ShiftType } from '../domain/types.ts'

const SHIFT_HEADERS = [
  'Date',
  'Service',
  'Début',
  'Fin',
  'Pause (min)',
  'Durée (min)',
  'Durée',
  'Taux horaire',
  'Montant',
  'Notes',
] as const

const SHIFT_TYPE_FROM_LABEL: Record<string, ShiftType> = {
  midi: 'midi',
  soir: 'soir',
  autre: 'autre',
}

export function shiftsToCsv(shifts: Shift[]): string {
  const rows: string[][] = [[...SHIFT_HEADERS]]
  const sorted = [...shifts].sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start))
  for (const shift of sorted) {
    const minutes = shiftMinutes(shift)
    rows.push([
      formatDateFr(shift.date),
      SHIFT_LABEL[shift.type],
      shift.start,
      shift.end,
      String(shift.breakMinutes),
      String(minutes),
      formatDuration(minutes),
      csvNumber(shift.hourlyRateCents),
      csvNumber(shiftAmountCents(shift)),
      shift.notes,
    ])
  }
  return toCsv(rows)
}

export function paymentsToCsv(payments: Payment[]): string {
  const rows: string[][] = [['Date', 'Montant', 'Moyen', 'Période', 'Commentaire']]
  for (const payment of sortPayments(payments, 'asc')) {
    rows.push([
      formatDateFr(payment.date),
      csvNumber(payment.amountCents),
      METHOD_LABEL[payment.method],
      payment.period,
      payment.notes,
    ])
  }
  return toCsv(rows)
}

export function parseShiftsCsv(
  raw: string,
  now = new Date(),
): { ok: true; shifts: Shift[] } | { ok: false; error: string } {
  const text = stripBom(raw).trim()
  if (!text) return { ok: false, error: 'Le fichier CSV est vide.' }

  const delimiter = detectDelimiter(text)
  const rows = parseDelimited(text, delimiter)
  if (rows.length < 2) {
    return { ok: false, error: 'Le fichier CSV doit contenir une ligne d’en-tête et au moins un service.' }
  }

  const header = rows[0].map(normalizeHeader)
  const index = {
    date: findColumn(header, ['date']),
    service: findColumn(header, ['service', 'type']),
    start: findColumn(header, ['debut', 'début', 'start', 'heuredebut', 'heuredébut']),
    end: findColumn(header, ['fin', 'end', 'heurefin']),
    breakMinutes: findColumn(header, ['pausemin', 'pause', 'break']),
    rate: findColumn(header, ['tauxhoraire', 'taux', 'rate']),
    notes: findColumn(header, ['notes', 'note', 'commentaire']),
  }

  if (index.date < 0 || index.service < 0 || index.start < 0 || index.end < 0 || index.rate < 0) {
    return {
      ok: false,
      error:
        'Colonnes attendues : Date ; Service ; Début ; Fin ; Pause (min) ; Taux horaire ; Notes. Utilisez un CSV exporté par l’application.',
    }
  }

  if (rows.length - 1 > 5000) {
    return { ok: false, error: 'Le fichier contient trop de services (maximum 5 000).' }
  }

  const shifts: Shift[] = []
  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex]
    if (row.every((cell) => cell.trim() === '')) continue

    const date = parseCsvDate(cell(row, index.date))
    if (!date) {
      return { ok: false, error: `Ligne ${rowIndex + 1} : date invalide. Attendu jj/mm/aaaa, comme 20/10/2026.` }
    }

    const type = parseShiftType(cell(row, index.service))
    if (!type) {
      return { ok: false, error: `Ligne ${rowIndex + 1} : le service doit être Midi, Soir ou Autre.` }
    }

    const start = normalizeClock(cell(row, index.start))
    const end = normalizeClock(cell(row, index.end))
    if (!start || !end) {
      return { ok: false, error: `Ligne ${rowIndex + 1} : heures invalides. Attendu 12:00 ou 19:00.` }
    }

    const breakRaw = index.breakMinutes >= 0 ? cell(row, index.breakMinutes).trim() : '0'
    if (breakRaw !== '' && !/^\d+$/.test(breakRaw)) {
      return { ok: false, error: `Ligne ${rowIndex + 1} : la pause doit être un nombre de minutes entier.` }
    }
    const breakMinutes = breakRaw === '' ? 0 : Number(breakRaw)

    const rateCents = parseEurosToCents(cell(row, index.rate))
    if (rateCents === null || rateCents <= 0) {
      return { ok: false, error: `Ligne ${rowIndex + 1} : taux horaire invalide. Attendu 12,00.` }
    }

    const notes = index.notes >= 0 ? cell(row, index.notes) : ''
    const result = createShift({
      date,
      type,
      start,
      end,
      breakMinutes,
      hourlyRateCents: rateCents,
      notes,
      now,
    })
    if (!result.ok) return { ok: false, error: `Ligne ${rowIndex + 1} : ${result.error}` }
    shifts.push(result.shift)
  }

  if (shifts.length === 0) {
    return { ok: false, error: 'Aucun service valide n’a été trouvé dans ce fichier.' }
  }

  return { ok: true, shifts }
}

function toCsv(rows: string[][]): string {
  const body = rows.map((row) => row.map(csvEscape).join(';')).join('\r\n')
  return `\uFEFF${body}`
}

function csvEscape(value: string): string {
  return `"${value.replaceAll('"', '""')}"`
}

function stripBom(value: string): string {
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value
}

function detectDelimiter(text: string): ';' | ',' {
  const firstLine = text.split(/\r\n|\n|\r/, 1)[0] ?? ''
  const semicolons = (firstLine.match(/;/g) ?? []).length
  const commas = (firstLine.match(/,/g) ?? []).length
  return semicolons >= commas ? ';' : ','
}

function parseDelimited(text: string, delimiter: ';' | ','): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const next = text[index + 1]

    if (inQuotes) {
      if (char === '"' && next === '"') {
        cell += '"'
        index += 1
        continue
      }
      if (char === '"') {
        inQuotes = false
        continue
      }
      cell += char
      continue
    }

    if (char === '"') {
      inQuotes = true
      continue
    }
    if (char === delimiter) {
      row.push(cell)
      cell = ''
      continue
    }
    if (char === '\r') continue
    if (char === '\n') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
      continue
    }
    cell += char
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }

  return rows
}

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('fr-FR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '')
}

function findColumn(header: string[], aliases: string[]): number {
  return header.findIndex((name) => aliases.includes(name))
}

function cell(row: string[], index: number): string {
  return row[index] ?? ''
}

function parseCsvDate(value: string): string | null {
  const trimmed = value.trim()
  if (isRealDate(trimmed)) return trimmed
  const match = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(trimmed)
  if (!match) return null
  const day = Number(match[1])
  const month = Number(match[2])
  const year = Number(match[3])
  const iso = toIsoDate(new Date(year, month - 1, day))
  if (!isRealDate(iso)) return null
  const parsed = parseDate(iso)
  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) return null
  return iso
}

function parseShiftType(value: string): ShiftType | null {
  const key = value
    .trim()
    .toLocaleLowerCase('fr-FR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  return SHIFT_TYPE_FROM_LABEL[key] ?? null
}

function normalizeClock(value: string): string | null {
  const trimmed = value.trim().replace('h', ':').replace('H', ':')
  const match = /^(\d{1,2}):(\d{2})$/.exec(trimmed)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  const clock = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  return isTime(clock) ? clock : null
}
