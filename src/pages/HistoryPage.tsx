import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { AddShiftButton, useDialogs } from '../components/Layout.tsx'
import { MonthCalendar } from '../components/MonthCalendar.tsx'
import { Button, ConfirmDialog, Page, PageHeader, ShiftBadge } from '../components/ui.tsx'
import { shiftsToCsv } from '../data/csv.ts'
import { currentMonthKey, formatDateFr, formatDateLong, shiftMonth, todayIso } from '../domain/dates.ts'
import { filterShifts, rangeOf } from '../domain/filters.ts'
import type { PeriodPreset } from '../domain/filters.ts'
import { SHIFT_LABEL } from '../domain/labels.ts'
import { shiftAmountCents, shiftMinutes, totalEarnedCents, totalMinutes } from '../domain/ledger.ts'
import { formatMoney } from '../domain/money.ts'
import { formatDuration, formatRange } from '../domain/time.ts'
import type { Shift, ShiftType } from '../domain/types.ts'
import { usePageTitle } from '../hooks/usePageTitle.ts'
import { downloadText } from '../lib/download.ts'
import { cn } from '../lib/cn.ts'
import { useApp } from '../state/AppState.tsx'

const PRESETS: Array<{ id: PeriodPreset; label: string }> = [
  { id: 'week', label: 'Cette semaine' },
  { id: 'month', label: 'Ce mois' },
  { id: 'prev-month', label: 'Mois dernier' },
  { id: 'year', label: 'Cette année' },
  { id: 'all', label: 'Tout' },
  { id: 'custom', label: 'Personnalisé' },
]

const TYPES: Array<{ id: 'tous' | ShiftType; label: string }> = [
  { id: 'tous', label: 'Tous' },
  { id: 'midi', label: 'Midi' },
  { id: 'soir', label: 'Soir' },
  { id: 'autre', label: 'Autre' },
]

export function HistoryPage() {
  usePageTitle('Historique')
  const { dataset, mode, deleteShift } = useApp()
  const dialogs = useDialogs()
  const [preset, setPreset] = useState<PeriodPreset>('month')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [type, setType] = useState<'tous' | ShiftType>('tous')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'desc' | 'asc'>('desc')
  const [view, setView] = useState<'liste' | 'calendrier'>('liste')
  const [month, setMonth] = useState(currentMonthKey())
  const [selected, setSelected] = useState<string | null>(todayIso())
  const [pending, setPending] = useState<Shift | null>(null)

  const query = {
    preset,
    from,
    to,
    type,
    query: search,
    sort,
    weekStartsOn: dataset.settings.weekStartsOn,
  }
  const range = rangeOf(query)
  const filtered = filterShifts(dataset.shifts, query)
  const dayShifts = dataset.shifts
    .filter((shift) => shift.date === selected)
    .sort((a, b) => a.start.localeCompare(b.start))

  function choosePreset(next: PeriodPreset) {
    setPreset(next)
    if (next === 'custom') {
      const current = currentMonthKey()
      setFrom((value) => value || `${current}-01`)
      setTo((value) => value || todayIso())
    }
  }

  function exportSelection() {
    const suffix = mode === 'demo' ? 'demonstration' : 'reel'
    downloadText(`services-${suffix}-${todayIso()}.csv`, shiftsToCsv(filtered), 'text/csv;charset=utf-8')
  }

  return (
    <Page>
      <PageHeader
        eyebrow="Archives"
        title="Historique"
        description="Filtrez vos services, consultez le calendrier et corrigez une saisie."
        action={<AddShiftButton />}
      />

      <div className="mt-6 flex flex-wrap gap-2">
        {PRESETS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => choosePreset(item.id)}
            className={cn('rounded-full px-3 py-1.5 text-sm font-medium', preset === item.id ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200')}
          >
            {item.label}
          </button>
        ))}
      </div>

      {preset === 'custom' ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-slate-600">
            Du
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2" />
          </label>
          <label className="text-sm text-slate-600">
            Au
            <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2" />
          </label>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {TYPES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setType(item.id)}
            className={cn('rounded-full px-3 py-1.5 text-sm font-medium', type === item.id ? 'bg-teal-700 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200')}
          >
            {item.label}
          </button>
        ))}
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Rechercher une date (20/10/2026)"
          className="min-w-52 flex-1 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
        />
        <select value={sort} onChange={(event) => setSort(event.target.value === 'asc' ? 'asc' : 'desc')} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm">
          <option value="desc">Plus récent</option>
          <option value="asc">Plus ancien</option>
        </select>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="grid grid-cols-2 rounded-2xl bg-slate-100 p-1 text-sm">
          <button type="button" className={cn('rounded-xl px-3 py-1.5 font-medium', view === 'liste' ? 'bg-white shadow-sm' : 'text-slate-500')} onClick={() => setView('liste')}>
            Liste
          </button>
          <button type="button" className={cn('rounded-xl px-3 py-1.5 font-medium', view === 'calendrier' ? 'bg-white shadow-sm' : 'text-slate-500')} onClick={() => setView('calendrier')}>
            Calendrier
          </button>
        </div>
        {view === 'liste' ? (
          <p className="text-sm font-medium tabular-nums text-slate-600">
            {filtered.length} service{filtered.length > 1 ? 's' : ''} · {formatDuration(totalMinutes(filtered))} · {formatMoney(totalEarnedCents(filtered))}
          </p>
        ) : (
          <p className="text-sm text-slate-500">Le calendrier affiche tous les services, indépendamment des filtres.</p>
        )}
      </div>

      {view === 'liste' ? (
        <section className="mt-4">
          {range === 'invalid' ? <p className="text-sm text-rose-600">Choisissez une période personnalisée valide.</p> : null}
          {range !== 'invalid' && filtered.length === 0 ? (
            <p className="rounded-3xl bg-white p-6 text-sm text-slate-500 ring-1 ring-slate-200/80">Aucun service pour ces filtres.</p>
          ) : null}
          <div className="mt-3 space-y-2 md:hidden">
            {filtered.map((shift) => (
              <article key={shift.id} className="rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{formatDateFr(shift.date)}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <ShiftBadge type={shift.type} />
                      <span className="text-sm">{formatRange(shift.start, shift.end)}</span>
                    </div>
                  </div>
                  <p className="text-right text-sm tabular-nums">
                    <span className="block font-semibold">{formatMoney(shiftAmountCents(shift))}</span>
                    <span className="text-slate-500">{formatDuration(shiftMinutes(shift))}</span>
                  </p>
                </div>
                <RowActions shift={shift} onEdit={() => dialogs.openShift({ id: shift.id })} onDelete={() => setPending(shift)} />
              </article>
            ))}
          </div>
          <div className="mt-3 hidden overflow-x-auto rounded-3xl bg-white ring-1 ring-slate-200/80 md:block">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-slate-500">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Service</th>
                  <th className="px-4 py-3 font-medium">Horaires</th>
                  <th className="px-4 py-3 font-medium">Durée</th>
                  <th className="px-4 py-3 text-right font-medium">Montant</th>
                  <th className="px-4 py-3 font-medium"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((shift) => (
                  <tr key={shift.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-3">{formatDateFr(shift.date)}</td>
                    <td className="px-4 py-3"><ShiftBadge type={shift.type} /></td>
                    <td className="px-4 py-3">{formatRange(shift.start, shift.end)}</td>
                    <td className="px-4 py-3 tabular-nums">{formatDuration(shiftMinutes(shift))}</td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">{formatMoney(shiftAmountCents(shift))}</td>
                    <td className="px-4 py-3">
                      <RowActions shift={shift} onEdit={() => dialogs.openShift({ id: shift.id })} onDelete={() => setPending(shift)} />
                    </td>
                  </tr>
                ))}
              </tbody>
              {filtered.length > 0 ? (
                <tfoot>
                  <tr className="border-t border-slate-200 font-semibold">
                    <td className="px-4 py-3" colSpan={3}>Total de la sélection</td>
                    <td className="px-4 py-3 tabular-nums">{formatDuration(totalMinutes(filtered))}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatMoney(totalEarnedCents(filtered))}</td>
                    <td />
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>
          <Button variant="secondary" className="mt-4" onClick={exportSelection} disabled={filtered.length === 0}>
            Exporter cette sélection (CSV)
          </Button>
        </section>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <MonthCalendar
              month={month}
              shifts={dataset.shifts}
              weekStartsOn={dataset.settings.weekStartsOn}
              selected={selected}
              onSelect={setSelected}
              onPrevious={() => {
                setMonth((current) => shiftMonth(current, -1))
                setSelected(null)
              }}
              onNext={() => {
                setMonth((current) => shiftMonth(current, 1))
                setSelected(null)
              }}
            />
          </div>
          <section className="rounded-3xl bg-white p-5 ring-1 ring-slate-200/80 lg:col-span-2">
            {selected ? (
              <>
                <h2 className="text-lg font-semibold">{formatDateLong(selected)}</h2>
                <p className="mt-1 text-sm tabular-nums text-slate-500">
                  {formatDuration(totalMinutes(dayShifts))} · {formatMoney(totalEarnedCents(dayShifts))}
                </p>
                {dayShifts.length === 0 ? <p className="mt-4 text-sm text-slate-500">Aucun service ce jour-là.</p> : null}
                <ul className="mt-4 space-y-3">
                  {dayShifts.map((shift) => (
                    <li key={shift.id} className="rounded-2xl bg-slate-50 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <ShiftBadge type={shift.type} />
                        <span className="text-sm font-semibold tabular-nums">{formatMoney(shiftAmountCents(shift))}</span>
                      </div>
                      <p className="mt-2 text-sm">{formatRange(shift.start, shift.end)} · {formatDuration(shiftMinutes(shift))}</p>
                      {shift.notes ? <p className="mt-1 text-sm text-slate-500">{shift.notes}</p> : null}
                      <RowActions shift={shift} onEdit={() => dialogs.openShift({ id: shift.id })} onDelete={() => setPending(shift)} />
                    </li>
                  ))}
                </ul>
                <Button className="mt-4 w-full" onClick={() => dialogs.openShift({ date: selected })}>
                  Ajouter un service ce jour
                </Button>
              </>
            ) : (
              <p className="text-sm text-slate-500">Choisissez une journée pour voir le détail.</p>
            )}
          </section>
        </div>
      )}

      <ConfirmDialog
        open={pending !== null}
        title="Supprimer ce service ?"
        message={pending ? `Supprimer le service du ${formatDateFr(pending.date)} (${SHIFT_LABEL[pending.type]}, ${formatMoney(shiftAmountCents(pending))}) ?` : ''}
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

function RowActions({ shift, onEdit, onDelete }: { shift: Shift; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex justify-end">
      <button type="button" className="inline-flex h-11 w-11 items-center justify-center rounded-2xl text-slate-500 hover:bg-slate-100" aria-label={`Modifier le ${formatDateFr(shift.date)}`} onClick={onEdit}>
        <Pencil size={18} />
      </button>
      <button type="button" className="inline-flex h-11 w-11 items-center justify-center rounded-2xl text-slate-500 hover:bg-rose-50 hover:text-rose-700" aria-label="Supprimer" onClick={onDelete}>
        <Trash2 size={18} />
      </button>
    </div>
  )
}
