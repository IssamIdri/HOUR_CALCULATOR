import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { capitalize, currentMonthKey, formatMonthLower, monthKey, parseDate, shiftMonth, toIsoDate } from './dates.ts'
import { amountCents, formatMoney } from './money.ts'
import { formatDuration, workedMinutes } from './time.ts'
import type { Dataset, Payment, Shift, WeekStartsOn } from './types.ts'

export function shiftMinutes(shift: Shift): number {
  return workedMinutes(shift.start, shift.end, shift.breakMinutes)
}

export function shiftAmountCents(shift: Shift): number {
  return amountCents(shiftMinutes(shift), shift.hourlyRateCents)
}

export function totalMinutes(shifts: Shift[]): number {
  return shifts.reduce((sum, shift) => sum + shiftMinutes(shift), 0)
}

export function totalEarnedCents(shifts: Shift[]): number {
  return shifts.reduce((sum, shift) => sum + shiftAmountCents(shift), 0)
}

export function totalPaidCents(payments: Payment[]): number {
  return payments.reduce((sum, payment) => sum + payment.amountCents, 0)
}

export function balanceCents(shifts: Shift[], payments: Payment[]): number {
  return totalEarnedCents(shifts) - totalPaidCents(payments)
}

export function availableCents(shifts: Shift[], payments: Payment[], exceptPaymentId?: string): number {
  const paid = payments.reduce((sum, payment) => {
    if (payment.id === exceptPaymentId) return sum
    return sum + payment.amountCents
  }, 0)
  return totalEarnedCents(shifts) - paid
}

/** Heures équivalentes au taux habituel. Estimation, pas un décompte d'heures affectées. */
export function equivalentMinutes(balance: number, hourlyRateCents: number): number | null {
  if (hourlyRateCents <= 0) return null
  return Math.round((balance * 60) / hourlyRateCents)
}

export function usesRateOtherThan(shifts: Shift[], hourlyRateCents: number): boolean {
  return shifts.some((shift) => shift.hourlyRateCents !== hourlyRateCents)
}

export interface Summary {
  monthKey: string
  previousMonthKey: string
  monthMinutes: number
  previousMonthMinutes: number
  allMinutes: number
  monthEarnedCents: number
  allEarnedCents: number
  allPaidCents: number
  balanceCents: number
  lastPayment: Payment | null
  equivalentMinutes: number | null
}

export function summarize(dataset: Dataset, now = new Date()): Summary {
  const month = currentMonthKey(now)
  const previous = shiftMonth(month, -1)
  const monthShifts = dataset.shifts.filter((shift) => monthKey(shift.date) === month)
  const previousShifts = dataset.shifts.filter((shift) => monthKey(shift.date) === previous)
  const earned = totalEarnedCents(dataset.shifts)
  const paid = totalPaidCents(dataset.payments)
  const balance = earned - paid
  const lastPayment = sortPayments(dataset.payments)[0] ?? null
  return {
    monthKey: month,
    previousMonthKey: previous,
    monthMinutes: totalMinutes(monthShifts),
    previousMonthMinutes: totalMinutes(previousShifts),
    allMinutes: totalMinutes(dataset.shifts),
    monthEarnedCents: totalEarnedCents(monthShifts),
    allEarnedCents: earned,
    allPaidCents: paid,
    balanceCents: balance,
    lastPayment,
    equivalentMinutes: equivalentMinutes(balance, dataset.settings.hourlyRateCents),
  }
}

export function comparisonLabel(currentMinutes: number, previousMinutes: number, previousMonth: string): string {
  const previousLabel = formatMonthLower(previousMonth)
  if (currentMinutes === 0 && previousMinutes === 0) {
    return `Aucune heure ce mois-ci, ni en ${previousLabel}.`
  }
  if (previousMinutes === 0) return `Pas de comparaison : aucune heure en ${previousLabel}.`
  const delta = currentMinutes - previousMinutes
  if (delta === 0) return `Même volume d'heures qu'en ${previousLabel}.`
  const percent = Math.round((Math.abs(delta) / previousMinutes) * 100)
  const direction = delta > 0 ? '+' : '−'
  const percentPart = percent >= 1 ? ` (${direction}${percent} %)` : ''
  return `${direction}${formatDuration(Math.abs(delta))} par rapport à ${previousLabel}${percentPart}.`
}

export function advanceMessage(amount: number, available: number): string {
  const next = available - amount
  if (available > 0) {
    const surplus = amount - available
    return `Ce paiement dépasse le solde de ${formatMoney(available)}. Le surplus de ${formatMoney(surplus)} sera comptabilisé comme une avance. Le solde passera à ${formatMoney(next)}. L'historique est conservé.`
  }
  if (available === 0) {
    return `Le solde est déjà à zéro. Ce paiement de ${formatMoney(amount)} sera comptabilisé comme une avance.`
  }
  return `Une avance de ${formatMoney(Math.abs(available))} est déjà enregistrée. Ce paiement portera l'avance à ${formatMoney(Math.abs(next))}.`
}

export interface ChartPoint {
  key: string
  label: string
  minutes: number
  earnedCents: number
}

export function weeklySeries(
  shifts: Shift[],
  weekStartsOn: WeekStartsOn,
  now = new Date(),
  weeks = 8,
): ChartPoint[] {
  const start = startOfLocalWeek(now, weekStartsOn)
  const starts: Date[] = []
  for (let index = weeks - 1; index >= 0; index -= 1) {
    starts.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() - index * 7))
  }
  return starts.map((weekStart) => {
    const from = toIsoDate(weekStart)
    const endDate = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6)
    const to = toIsoDate(endDate)
    const inWeek = shifts.filter((shift) => shift.date >= from && shift.date <= to)
    return {
      key: from,
      label: format(weekStart, 'd MMM', { locale: fr }).replace('.', ''),
      minutes: totalMinutes(inWeek),
      earnedCents: totalEarnedCents(inWeek),
    }
  })
}

export function monthlySeries(shifts: Shift[], now = new Date(), count = 6): ChartPoint[] {
  const current = currentMonthKey(now)
  const keys = Array.from({ length: count }, (_, index) => shiftMonth(current, index - (count - 1)))
  return keys.map((key) => {
    const inMonth = shifts.filter((shift) => monthKey(shift.date) === key)
    const raw = format(parseDate(`${key}-01`), 'MMM yy', { locale: fr }).replace('.', '')
    return {
      key,
      label: capitalize(raw),
      minutes: totalMinutes(inMonth),
      earnedCents: totalEarnedCents(inMonth),
    }
  })
}

function startOfLocalWeek(now: Date, weekStartsOn: WeekStartsOn): Date {
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const day = date.getDay()
  const diff = weekStartsOn === 1 ? (day + 6) % 7 : day
  date.setDate(date.getDate() - diff)
  return date
}

export function sortPayments(payments: Payment[], order: 'asc' | 'desc' = 'desc'): Payment[] {
  return [...payments].sort((a, b) => {
    const compared = a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt)
    return order === 'asc' ? compared : -compared
  })
}

export function latestShift(shifts: Shift[], exceptId?: string): Shift | undefined {
  return [...shifts]
    .filter((shift) => shift.id !== exceptId)
    .sort((a, b) => {
      const compared =
        a.date.localeCompare(b.date) || a.start.localeCompare(b.start) || a.createdAt.localeCompare(b.createdAt)
      return -compared
    })[0]
}

export function groupShiftsByDate(shifts: Shift[]): Array<{ date: string; shifts: Shift[] }> {
  const sorted = [...shifts].sort((a, b) => {
    const compared = a.date.localeCompare(b.date) || a.start.localeCompare(b.start) || a.id.localeCompare(b.id)
    return -compared
  })
  const groups: Array<{ date: string; shifts: Shift[] }> = []
  for (const shift of sorted) {
    const last = groups[groups.length - 1]
    if (!last || last.date !== shift.date) groups.push({ date: shift.date, shifts: [shift] })
    else last.shifts.push(shift)
  }
  return groups
}

export function activeDataset(state: { mode: 'real' | 'demo'; real: Dataset; demo: Dataset }): Dataset {
  return state.mode === 'demo' ? state.demo : state.real
}
