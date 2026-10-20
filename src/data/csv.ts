import { formatDateFr } from '../domain/dates.ts'
import { SHIFT_LABEL, METHOD_LABEL } from '../domain/labels.ts'
import { shiftAmountCents, shiftMinutes, sortPayments } from '../domain/ledger.ts'
import { csvNumber } from '../domain/money.ts'
import { formatDuration } from '../domain/time.ts'
import type { Payment, Shift } from '../domain/types.ts'

export function shiftsToCsv(shifts: Shift[]): string {
  const rows: string[][] = [
    ['Date', 'Service', 'Début', 'Fin', 'Pause (min)', 'Durée (min)', 'Durée', 'Taux horaire', 'Montant', 'Notes'],
  ]
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

function toCsv(rows: string[][]): string {
  const body = rows.map((row) => row.map(csvEscape).join(';')).join('\r\n')
  return `\uFEFF${body}`
}

function csvEscape(value: string): string {
  return `"${value.replaceAll('"', '""')}"`
}
