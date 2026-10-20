import {
  currentMonthKey,
  endOfWeekIso,
  formatDateFr,
  isRealDate,
  monthBounds,
  shiftMonth,
  startOfWeekIso,
  todayIso,
} from './dates.ts'
import type { Shift, ShiftType, WeekStartsOn } from './types.ts'

export type PeriodPreset = 'week' | 'month' | 'prev-month' | 'year' | 'all' | 'custom'

export interface ShiftQuery {
  preset: PeriodPreset
  from: string
  to: string
  type: 'tous' | ShiftType
  query: string
  sort: 'asc' | 'desc'
  weekStartsOn: WeekStartsOn
  now?: Date
}

export function rangeOf(query: ShiftQuery): { from: string; to: string } | 'all' | 'invalid' {
  const now = query.now ?? new Date()
  if (query.preset === 'all') return 'all'
  if (query.preset === 'custom') {
    if (!isRealDate(query.from) || !isRealDate(query.to) || query.from > query.to) return 'invalid'
    return { from: query.from, to: query.to }
  }
  if (query.preset === 'week') {
    return { from: startOfWeekIso(todayIso(now), query.weekStartsOn), to: endOfWeekIso(todayIso(now), query.weekStartsOn) }
  }
  if (query.preset === 'month') return monthBounds(currentMonthKey(now))
  if (query.preset === 'prev-month') return monthBounds(shiftMonth(currentMonthKey(now), -1))
  const year = now.getFullYear()
  return { from: `${year}-01-01`, to: `${year}-12-31` }
}

export function filterShifts(shifts: Shift[], query: ShiftQuery): Shift[] {
  const range = rangeOf(query)
  if (range === 'invalid') return []
  const needle = query.query.trim().toLowerCase()
  return shifts
    .filter((shift) => {
      if (range !== 'all' && (shift.date < range.from || shift.date > range.to)) return false
      if (query.type !== 'tous' && shift.type !== query.type) return false
      if (!needle) return true
      const pretty = formatDateFr(shift.date).toLowerCase()
      return (
        pretty.includes(needle) ||
        pretty.replaceAll('/', '.').includes(needle) ||
        pretty.replaceAll('/', '-').includes(needle) ||
        shift.date.includes(needle)
      )
    })
    .sort((a, b) => {
      const compared = a.date.localeCompare(b.date) || a.start.localeCompare(b.start) || a.id.localeCompare(b.id)
      return query.sort === 'asc' ? compared : -compared
    })
}
