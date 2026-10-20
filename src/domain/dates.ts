import { eachDayOfInterval, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { WeekStartsOn } from './types.ts'

const WEEKDAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'] as const

export function parseDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, (month ?? 1) - 1, day ?? 1)
}

export function toIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function isRealDate(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false
  return toIsoDate(parseDate(iso)) === iso
}

export function todayIso(now = new Date()): string {
  return toIsoDate(now)
}

export function formatDateFr(isoDate: string): string {
  return format(parseDate(isoDate), 'dd/MM/yyyy')
}

export function formatDateLong(isoDate: string): string {
  const label = format(parseDate(isoDate), 'EEEE d MMMM yyyy', { locale: fr })
  return capitalize(label)
}

export function formatMonthLabel(month: string): string {
  return capitalize(format(parseDate(`${month}-01`), 'MMMM yyyy', { locale: fr }))
}

export function formatMonthLower(month: string): string {
  return format(parseDate(`${month}-01`), 'MMMM yyyy', { locale: fr })
}

export function capitalize(value: string): string {
  if (!value) return value
  return value.charAt(0).toLocaleUpperCase('fr-FR') + value.slice(1)
}

export function monthKey(isoDate: string): string {
  return isoDate.slice(0, 7)
}

export function currentMonthKey(now = new Date()): string {
  return toIsoDate(now).slice(0, 7)
}

export function shiftMonth(month: string, delta: number): string {
  const date = parseDate(`${month}-01`)
  const next = new Date(date.getFullYear(), date.getMonth() + delta, 1)
  return toIsoDate(next).slice(0, 7)
}

export function monthBounds(month: string): { from: string; to: string } {
  const start = parseDate(`${month}-01`)
  return { from: toIsoDate(startOfMonth(start)), to: toIsoDate(endOfMonth(start)) }
}

export function startOfWeekIso(isoDate: string, weekStartsOn: WeekStartsOn): string {
  return toIsoDate(startOfWeek(parseDate(isoDate), { weekStartsOn }))
}

export function endOfWeekIso(isoDate: string, weekStartsOn: WeekStartsOn): string {
  return toIsoDate(endOfWeek(parseDate(isoDate), { weekStartsOn }))
}

export function weekStartKey(isoDate: string, weekStartsOn: WeekStartsOn = 1): string {
  return startOfWeekIso(isoDate, weekStartsOn)
}

export function weekdayLabels(weekStartsOn: WeekStartsOn): string[] {
  if (weekStartsOn === 1) return [...WEEKDAYS.slice(1), WEEKDAYS[0]]
  return [...WEEKDAYS]
}

export function monthGrid(month: string, weekStartsOn: WeekStartsOn): Date[] {
  const first = parseDate(`${month}-01`)
  const start = startOfWeek(startOfMonth(first), { weekStartsOn })
  const end = endOfWeek(endOfMonth(first), { weekStartsOn })
  return eachDayOfInterval({ start, end })
}
