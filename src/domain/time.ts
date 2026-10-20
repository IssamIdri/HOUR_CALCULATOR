const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/

export function isTime(value: string): boolean {
  return TIME.test(value)
}

export function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

export function isOvernight(start: string, end: string): boolean {
  return toMinutes(end) < toMinutes(start)
}

/** Durée brute. Si la fin est avant le début, le service passe minuit. */
export function grossMinutes(start: string, end: string): number {
  const startMinutes = toMinutes(start)
  let endMinutes = toMinutes(end)
  if (endMinutes < startMinutes) endMinutes += 24 * 60
  return endMinutes - startMinutes
}

export function workedMinutes(start: string, end: string, breakMinutes: number): number {
  return Math.max(0, grossMinutes(start, end) - Math.max(0, breakMinutes))
}

export function formatDuration(totalMinutes: number): string {
  const sign = totalMinutes < 0 ? '−' : ''
  const absolute = Math.abs(Math.round(totalMinutes))
  const hours = Math.floor(absolute / 60)
  const minutes = absolute % 60
  if (minutes === 0) return `${sign}${hours} h`
  return `${sign}${hours} h ${String(minutes).padStart(2, '0')}`
}

export function formatTimeFr(time: string): string {
  const [hours, minutes] = time.split(':')
  const hour = String(Number(hours))
  if (minutes === '00') return `${hour}h`
  return `${hour}h${minutes}`
}

export function formatRange(start: string, end: string): string {
  const suffix = isOvernight(start, end) ? ' (+1 j)' : ''
  return `${formatTimeFr(start)}–${formatTimeFr(end)}${suffix}`
}
