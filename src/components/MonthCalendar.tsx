import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatMonthLabel, monthGrid, monthKey, toIsoDate, todayIso, weekdayLabels } from '../domain/dates.ts'
import { totalMinutes } from '../domain/ledger.ts'
import { formatDuration } from '../domain/time.ts'
import type { Shift, WeekStartsOn } from '../domain/types.ts'
import { cn } from '../lib/cn.ts'

export function MonthCalendar({
  month,
  shifts,
  weekStartsOn,
  selected,
  onSelect,
  onPrevious,
  onNext,
}: {
  month: string
  shifts: Shift[]
  weekStartsOn: WeekStartsOn
  selected: string | null
  onSelect: (isoDate: string) => void
  onPrevious: () => void
  onNext: () => void
}) {
  const days = monthGrid(month, weekStartsOn)
  const labels = weekdayLabels(weekStartsOn)
  const today = todayIso()
  const byDate = new Map<string, Shift[]>()
  for (const shift of shifts) {
    const list = byDate.get(shift.date) ?? []
    list.push(shift)
    byDate.set(shift.date, list)
  }
  const monthShifts = shifts.filter((shift) => monthKey(shift.date) === month)

  return (
    <section className="rounded-3xl bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.05)] ring-1 ring-slate-200/80 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={onPrevious} className="rounded-full p-2 text-slate-600 hover:bg-slate-100" aria-label="Mois précédent">
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <h2 className="text-lg font-semibold capitalize">{formatMonthLabel(month)}</h2>
          <p className="text-sm text-slate-500">{formatDuration(totalMinutes(monthShifts))} travaillées</p>
        </div>
        <button type="button" onClick={onNext} className="rounded-full p-2 text-slate-600 hover:bg-slate-100" aria-label="Mois suivant">
          <ChevronRight size={20} />
        </button>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-1">
        {labels.map((label) => (
          <div key={label} className="pb-1 text-center text-xs font-medium text-slate-400">
            {label}
          </div>
        ))}
        {days.map((day) => {
          const iso = toIsoDate(day)
          const inMonth = monthKey(iso) === month
          const dayShifts = byDate.get(iso) ?? []
          const minutes = totalMinutes(dayShifts)
          const isSelected = selected === iso
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelect(iso)}
              className={cn(
                'flex min-h-14 flex-col items-center justify-center rounded-2xl px-1 py-1 text-sm transition sm:min-h-16',
                isSelected && 'bg-teal-700 text-white',
                !isSelected && inMonth && minutes > 0 && 'bg-teal-50 text-slate-900',
                !isSelected && inMonth && minutes === 0 && 'text-slate-700 hover:bg-slate-50',
                !inMonth && 'text-slate-300',
                !isSelected && iso === today && 'ring-1 ring-teal-600',
              )}
            >
              <span className="font-semibold">{day.getDate()}</span>
              {minutes > 0 ? (
                <span className={cn('mt-0.5 max-w-full truncate text-[10px] font-semibold', isSelected ? 'text-teal-50' : 'text-teal-800')}>
                  {formatDuration(minutes)}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </section>
  )
}
