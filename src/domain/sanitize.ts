import { isRealDate } from './dates.ts'
import { isTime } from './time.ts'
import { workedMinutes } from './time.ts'
import { emptyDataset } from './settings.ts'
import { defaultSettings } from './settings.ts'
import type { Dataset, Payment, PaymentMethod, Settings, Shift, ShiftType, WeekStartsOn } from './types.ts'

const SHIFT_TYPES: ShiftType[] = ['midi', 'soir', 'autre']
const METHODS: PaymentMethod[] = ['virement', 'especes', 'cheque', 'autre']

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function readDataset(
  value: unknown,
  mode: 'strict' | 'lenient',
): { ok: true; dataset: Dataset } | { ok: false; error: string } {
  if (!isRecord(value)) {
    if (mode === 'lenient') return { ok: true, dataset: emptyDataset() }
    return { ok: false, error: 'La sauvegarde ne contient pas de données exploitables.' }
  }
  const settingsResult = readSettings(value.settings, mode)
  if (!settingsResult.ok) return settingsResult
  if (!Array.isArray(value.shifts) || !Array.isArray(value.payments)) {
    if (mode === 'strict') return { ok: false, error: 'La sauvegarde doit contenir les services et les paiements.' }
    return { ok: true, dataset: { settings: settingsResult.settings, shifts: [], payments: [] } }
  }
  if (value.shifts.length > 5000) return { ok: false, error: 'La sauvegarde contient trop de services.' }
  if (value.payments.length > 2000) return { ok: false, error: 'La sauvegarde contient trop de paiements.' }

  const shifts: Shift[] = []
  const shiftIds = new Set<string>()
  for (let index = 0; index < value.shifts.length; index += 1) {
    const result = readShift(value.shifts[index])
    if (!result.ok) {
      if (mode === 'strict') return { ok: false, error: `Service n°${index + 1} : ${result.error}` }
      continue
    }
    if (shiftIds.has(result.shift.id)) {
      if (mode === 'strict') return { ok: false, error: `Identifiant de service en double : ${result.shift.id}.` }
      continue
    }
    shiftIds.add(result.shift.id)
    shifts.push(result.shift)
  }

  const payments: Payment[] = []
  const paymentIds = new Set<string>()
  for (let index = 0; index < value.payments.length; index += 1) {
    const result = readPayment(value.payments[index])
    if (!result.ok) {
      if (mode === 'strict') return { ok: false, error: `Paiement n°${index + 1} : ${result.error}` }
      continue
    }
    if (paymentIds.has(result.payment.id)) {
      if (mode === 'strict') return { ok: false, error: `Identifiant de paiement en double : ${result.payment.id}.` }
      continue
    }
    paymentIds.add(result.payment.id)
    payments.push(result.payment)
  }

  return { ok: true, dataset: { settings: settingsResult.settings, shifts, payments } }
}

function readSettings(
  value: unknown,
  mode: 'strict' | 'lenient',
): { ok: true; settings: Settings } | { ok: false; error: string } {
  const defaults = defaultSettings()
  if (!isRecord(value)) {
    if (mode === 'strict') return { ok: false, error: 'Les paramètres sont manquants ou illisibles.' }
    return { ok: true, settings: defaults }
  }

  let hourlyRateCents = defaults.hourlyRateCents
  if (value.hourlyRateCents !== undefined) {
    const rate = readInt(value.hourlyRateCents, 1, 50_000)
    if (rate === null) {
      if (mode === 'strict') return { ok: false, error: 'Le taux horaire de la sauvegarde est invalide.' }
    } else hourlyRateCents = rate
  } else if (mode === 'strict') {
    return { ok: false, error: 'Le taux horaire est manquant.' }
  }

  let restaurantName = defaults.restaurantName
  if (value.restaurantName !== undefined) {
    if (typeof value.restaurantName !== 'string') {
      if (mode === 'strict') return { ok: false, error: 'Le nom du restaurant est invalide.' }
    } else restaurantName = value.restaurantName.trim().slice(0, 80)
  }

  let defaultBreakMinutes = defaults.defaultBreakMinutes
  if (value.defaultBreakMinutes !== undefined) {
    const minutes = readInt(value.defaultBreakMinutes, 0, 720)
    if (minutes === null) {
      if (mode === 'strict') return { ok: false, error: 'La pause par défaut est invalide.' }
    } else defaultBreakMinutes = minutes
  }

  const midiStart = readTimeField(value.midiStart, defaults.midiStart, mode, "L'heure de début du midi est invalide.")
  if (typeof midiStart !== 'string') return midiStart
  const midiEnd = readTimeField(value.midiEnd, defaults.midiEnd, mode, "L'heure de fin du midi est invalide.")
  if (typeof midiEnd !== 'string') return midiEnd
  const soirStart = readTimeField(value.soirStart, defaults.soirStart, mode, "L'heure de début du soir est invalide.")
  if (typeof soirStart !== 'string') return soirStart
  const soirEnd = readTimeField(value.soirEnd, defaults.soirEnd, mode, "L'heure de fin du soir est invalide.")
  if (typeof soirEnd !== 'string') return soirEnd

  if (mode === 'strict' && midiStart === midiEnd) {
    return { ok: false, error: 'Les horaires habituels du midi sont identiques.' }
  }
  if (mode === 'strict' && soirStart === soirEnd) {
    return { ok: false, error: 'Les horaires habituels du soir sont identiques.' }
  }

  let weekStartsOn: WeekStartsOn = 1
  if (value.weekStartsOn !== undefined) {
    if (value.weekStartsOn !== 0 && value.weekStartsOn !== 1) {
      if (mode === 'strict') return { ok: false, error: 'Le premier jour de la semaine doit être lundi ou dimanche.' }
    } else weekStartsOn = value.weekStartsOn
  }

  if (value.currency !== undefined && value.currency !== 'EUR') {
    if (mode === 'strict') return { ok: false, error: 'Seule la devise euro est prise en charge.' }
  }

  return {
    ok: true,
    settings: {
      hourlyRateCents,
      currency: 'EUR',
      restaurantName,
      defaultBreakMinutes,
      midiStart: midiStart === midiEnd ? defaults.midiStart : midiStart,
      midiEnd: midiStart === midiEnd ? defaults.midiEnd : midiEnd,
      soirStart: soirStart === soirEnd ? defaults.soirStart : soirStart,
      soirEnd: soirStart === soirEnd ? defaults.soirEnd : soirEnd,
      weekStartsOn,
    },
  }
}

function readShift(value: unknown): { ok: true; shift: Shift } | { ok: false; error: string } {
  if (!isRecord(value)) return { ok: false, error: 'entrée illisible.' }
  const id = readId(value.id)
  if (!id) return { ok: false, error: 'identifiant manquant.' }
  if (typeof value.date !== 'string' || !isRealDate(value.date)) return { ok: false, error: 'date invalide.' }
  if (!isShiftType(value.type)) return { ok: false, error: 'type de service invalide.' }
  if (typeof value.start !== 'string' || !isTime(value.start)) return { ok: false, error: 'heure de début invalide.' }
  if (typeof value.end !== 'string' || !isTime(value.end)) return { ok: false, error: 'heure de fin invalide.' }
  const breakMinutes = readInt(value.breakMinutes, 0, 24 * 60)
  if (breakMinutes === null) return { ok: false, error: 'pause invalide.' }
  const hourlyRateCents = readInt(value.hourlyRateCents, 1, 50_000)
  if (hourlyRateCents === null) return { ok: false, error: 'taux horaire invalide.' }
  if (workedMinutes(value.start, value.end, breakMinutes) <= 0) {
    return { ok: false, error: 'la durée nette doit être positive.' }
  }
  if (value.notes !== undefined && typeof value.notes !== 'string') return { ok: false, error: 'note invalide.' }
  const notes = typeof value.notes === 'string' ? value.notes.slice(0, 500) : ''
  return {
    ok: true,
    shift: {
      id,
      date: value.date,
      type: value.type,
      start: value.start,
      end: value.end,
      breakMinutes,
      hourlyRateCents,
      notes,
      createdAt: readTimestamp(value.createdAt),
      updatedAt: readTimestamp(value.updatedAt ?? value.createdAt),
    },
  }
}

function readPayment(value: unknown): { ok: true; payment: Payment } | { ok: false; error: string } {
  if (!isRecord(value)) return { ok: false, error: 'entrée illisible.' }
  const id = readId(value.id)
  if (!id) return { ok: false, error: 'identifiant manquant.' }
  if (typeof value.date !== 'string' || !isRealDate(value.date)) return { ok: false, error: 'date invalide.' }
  const amountCents = readInt(value.amountCents, 1, 10_000_000)
  if (amountCents === null) return { ok: false, error: 'montant invalide.' }
  if (!isMethod(value.method)) return { ok: false, error: 'moyen de paiement invalide.' }
  if (value.period !== undefined && typeof value.period !== 'string') return { ok: false, error: 'période invalide.' }
  if (value.notes !== undefined && typeof value.notes !== 'string') return { ok: false, error: 'commentaire invalide.' }
  return {
    ok: true,
    payment: {
      id,
      date: value.date,
      amountCents,
      method: value.method,
      period: typeof value.period === 'string' ? value.period.slice(0, 80) : '',
      notes: typeof value.notes === 'string' ? value.notes.slice(0, 500) : '',
      createdAt: readTimestamp(value.createdAt),
      updatedAt: readTimestamp(value.updatedAt ?? value.createdAt),
    },
  }
}

function readTimeField(
  value: unknown,
  fallback: string,
  mode: 'strict' | 'lenient',
  error: string,
): string | { ok: false; error: string } {
  if (value === undefined) return fallback
  if (typeof value === 'string' && isTime(value)) return value
  if (mode === 'strict') return { ok: false, error }
  return fallback
}

function readInt(value: unknown, min: number, max: number): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) return null
  return value
}

function readId(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const id = value.trim()
  if (!id || id.length > 80) return null
  return id
}

function readTimestamp(value: unknown): string {
  if (typeof value === 'string' && !Number.isNaN(Date.parse(value))) return value
  return new Date(0).toISOString()
}

function isShiftType(value: unknown): value is ShiftType {
  return typeof value === 'string' && SHIFT_TYPES.includes(value as ShiftType)
}

function isMethod(value: unknown): value is PaymentMethod {
  return typeof value === 'string' && METHODS.includes(value as PaymentMethod)
}
