import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { AddShiftButton, useDialogs } from '../components/Layout.tsx'
import { ConfirmDialog, Page, PageHeader, ShiftBadge } from '../components/ui.tsx'
import { formatDateFr, formatDateLong, formatMonthLabel, monthKey } from '../domain/dates.ts'
import { groupShiftsByDate, shiftAmountCents, shiftMinutes, totalEarnedCents, totalMinutes } from '../domain/ledger.ts'
import { SHIFT_LABEL } from '../domain/labels.ts'
import { formatMoney } from '../domain/money.ts'
import { formatDuration, formatRange } from '../domain/time.ts'
import { usePageTitle } from '../hooks/usePageTitle.ts'
import { useApp } from '../state/AppState.tsx'
import type { Shift } from '../domain/types.ts'

export function ShiftsPage() {
  usePageTitle('Services')
  const { dataset, deleteShift } = useApp()
  const dialogs = useDialogs()
  const [month, setMonth] = useState('all')
  const [pending, setPending] = useState<Shift | null>(null)
  const months = Array.from(new Set(dataset.shifts.map((shift) => monthKey(shift.date)))).sort((a, b) => b.localeCompare(a))
  const visible = month === 'all' ? dataset.shifts : dataset.shifts.filter((shift) => monthKey(shift.date) === month)
  const groups = groupShiftsByDate(visible)

  return (
    <Page>
      <PageHeader
        eyebrow="Saisie"
        title="Services"
        description="Plusieurs services peuvent être enregistrés le même jour, y compris pour une date passée."
        action={<AddShiftButton />}
      />
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <label className="text-sm text-slate-600">
          Période
          <select
            className="ml-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
          >
            <option value="all">Tous les mois</option>
            {months.map((item) => (
              <option key={item} value={item}>
                {formatMonthLabel(item)}
              </option>
            ))}
          </select>
        </label>
        <p className="text-sm font-medium tabular-nums text-slate-600">
          {formatDuration(totalMinutes(visible))} · {formatMoney(totalEarnedCents(visible))}
        </p>
      </div>

      {groups.length === 0 ? (
        <section className="mt-6 rounded-3xl bg-white p-6 ring-1 ring-slate-200/80">
          <h2 className="text-lg font-semibold">Aucun service sur cette période</h2>
          <p className="mt-2 text-sm text-slate-500">Ajoutez un service avec le bouton en bas de l’écran, ou changez de période.</p>
        </section>
      ) : (
        <div className="mt-6 space-y-6">
          {groups.map((group) => (
            <section key={group.date}>
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-base font-semibold">{formatDateLong(group.date)}</h2>
                <p className="text-sm tabular-nums text-slate-500">
                  {formatDuration(totalMinutes(group.shifts))} · {formatMoney(totalEarnedCents(group.shifts))}
                </p>
              </div>
              <ul className="space-y-2">
                {group.shifts.map((shift) => (
                  <li key={shift.id} className="flex items-center gap-3 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <ShiftBadge type={shift.type} />
                        <span className="text-sm font-medium">{formatRange(shift.start, shift.end)}</span>
                      </div>
                      <p className="mt-1 text-sm tabular-nums text-slate-500">
                        {formatDuration(shiftMinutes(shift))} · {formatMoney(shiftAmountCents(shift))} · {formatMoney(shift.hourlyRateCents)}/h
                      </p>
                      {shift.notes ? <p className="mt-1 text-sm break-words text-slate-500">{shift.notes}</p> : null}
                    </div>
                    <div className="flex shrink-0">
                      <button type="button" className="inline-flex h-11 w-11 items-center justify-center rounded-2xl text-slate-500 hover:bg-slate-100" aria-label={`Modifier le service du ${formatDateFr(shift.date)}`} onClick={() => dialogs.openShift({ id: shift.id })}>
                        <Pencil size={18} />
                      </button>
                      <button type="button" className="inline-flex h-11 w-11 items-center justify-center rounded-2xl text-slate-500 hover:bg-rose-50 hover:text-rose-700" aria-label="Supprimer le service" onClick={() => setPending(shift)}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={pending !== null}
        title="Supprimer ce service ?"
        message={
          pending
            ? `Supprimer le service du ${formatDateFr(pending.date)} (${SHIFT_LABEL[pending.type]}, ${formatMoney(shiftAmountCents(pending))}) ? Le total gagné sera recalculé. Les paiements déjà saisis restent en place.`
            : ''
        }
        confirmLabel="Supprimer"
        danger
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending) deleteShift(pending.id)
          setPending(null)
        }}
      />
    </Page>
  )
}
