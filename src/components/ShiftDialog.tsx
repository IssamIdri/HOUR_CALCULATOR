import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { formatDateFr, todayIso } from '../domain/dates.ts'
import { createShift } from '../domain/drafts.ts'
import { latestShift, shiftAmountCents, shiftMinutes, totalEarnedCents, totalMinutes } from '../domain/ledger.ts'
import { amountCents, centsToInput, formatMoney, parseEurosToCents } from '../domain/money.ts'
import { formatDuration, formatRange, isOvernight, isTime, workedMinutes } from '../domain/time.ts'
import type { Settings, Shift, ShiftType } from '../domain/types.ts'
import { Button, Modal, Segmented, ShiftBadge, TextArea, TextField } from './ui.tsx'

interface Draft {
  date: string
  type: ShiftType
  start: string
  end: string
  breakMinutes: string
  rate: string
  notes: string
}

function createDraft(shift: Shift | undefined, settings: Settings, date?: string): Draft {
  if (shift) {
    return {
      date: shift.date,
      type: shift.type,
      start: shift.start,
      end: shift.end,
      breakMinutes: String(shift.breakMinutes),
      rate: centsToInput(shift.hourlyRateCents),
      notes: shift.notes,
    }
  }
  return {
    date: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : todayIso(),
    type: 'midi',
    start: settings.midiStart,
    end: settings.midiEnd,
    breakMinutes: String(settings.defaultBreakMinutes),
    rate: centsToInput(settings.hourlyRateCents),
    notes: '',
  }
}

export function ShiftDialog({
  shift,
  initialDate,
  settings,
  shifts,
  onClose,
  onSave,
}: {
  shift?: Shift
  initialDate?: string
  settings: Settings
  shifts: Shift[]
  onClose: () => void
  onSave: (shift: Shift, another: boolean) => void
}) {
  const [draft, setDraft] = useState(() => createDraft(shift, settings, initialDate))
  const [error, setError] = useState<string | null>(null)
  const editing = Boolean(shift)
  const previous = useMemo(() => latestShift(shifts, shift?.id), [shifts, shift?.id])
  const rateCents = parseEurosToCents(draft.rate)
  const breakValue = /^\d+$/.test(draft.breakMinutes.trim()) ? Number(draft.breakMinutes) : null
  const timesOk = isTime(draft.start) && isTime(draft.end) && draft.start !== draft.end
  const minutes = timesOk && breakValue !== null ? workedMinutes(draft.start, draft.end, breakValue) : null
  const previewAmount = minutes !== null && rateCents !== null ? amountCents(minutes, rateCents) : null
  const overnight = timesOk ? isOvernight(draft.start, draft.end) : false
  const sameDay = shifts.filter((item) => item.date === draft.date && item.id !== shift?.id)
  const dayMinutes = totalMinutes(sameDay) + (minutes ?? 0)
  const dayAmount = totalEarnedCents(sameDay) + (previewAmount ?? 0)

  function chooseType(type: ShiftType) {
    setDraft((current) => {
      if (editing) return { ...current, type }
      if (type === 'midi') return { ...current, type, start: settings.midiStart, end: settings.midiEnd }
      if (type === 'soir') return { ...current, type, start: settings.soirStart, end: settings.soirEnd }
      return { ...current, type }
    })
  }

  function reuse() {
    if (!previous) return
    setDraft((current) => ({
      ...current,
      type: previous.type,
      start: previous.start,
      end: previous.end,
      breakMinutes: String(previous.breakMinutes),
      rate: centsToInput(previous.hourlyRateCents),
    }))
  }

  function submit(another: boolean) {
    if (rateCents === null) {
      setError('Indiquez un taux horaire valide, par exemple 12,50.')
      return
    }
    if (breakValue === null) {
      setError('Indiquez la pause en minutes entières. Mettez 0 s’il n’y en a pas.')
      return
    }
    const result = createShift({
      date: draft.date,
      type: draft.type,
      start: draft.start,
      end: draft.end,
      breakMinutes: breakValue,
      hourlyRateCents: rateCents,
      notes: draft.notes,
      existing: shift,
    })
    if (!result.ok) {
      setError(result.error)
      return
    }
    setError(null)
    onSave(result.shift, another)
    if (another) setDraft((current) => ({ ...current, notes: '' }))
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    submit(false)
  }

  return (
    <Modal
      title={editing ? 'Modifier le service' : 'Ajouter un service'}
      description="La durée et le salaire se calculent dès la saisie. Le taux est conservé pour ce service."
      onClose={onClose}
    >
      <form onSubmit={onSubmit} className="px-5 pb-5">
        <div className="grid gap-4">
          <TextField id="shift-date" label="Date du travail" type="date" value={draft.date} onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))} required />
          <Segmented
            label="Type de service"
            value={draft.type}
            onChange={chooseType}
            options={[
              { value: 'midi', label: 'Midi' },
              { value: 'soir', label: 'Soir' },
              { value: 'autre', label: 'Autre' },
            ]}
          />
          <div className="grid grid-cols-2 gap-3">
            <TextField id="shift-start" label="Heure de début" type="time" step={60} value={draft.start} onChange={(event) => setDraft((current) => ({ ...current, start: event.target.value }))} required />
            <TextField id="shift-end" label="Heure de fin" type="time" step={60} value={draft.end} onChange={(event) => setDraft((current) => ({ ...current, end: event.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TextField
              id="shift-break"
              label="Pause non payée"
              inputMode="numeric"
              value={draft.breakMinutes}
              onChange={(event) => setDraft((current) => ({ ...current, breakMinutes: event.target.value.replace(/[^\d]/g, '') }))}
              hint="Minutes"
            />
            <TextField
              id="shift-rate"
              label="Taux horaire"
              inputMode="decimal"
              value={draft.rate}
              onChange={(event) => setDraft((current) => ({ ...current, rate: event.target.value }))}
              hint="€ / h"
            />
          </div>
          <TextArea id="shift-notes" label="Notes facultatives" value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Remplacement, fermeture, inventaire…" />
          <div className="rounded-2xl bg-teal-50 px-4 py-3 text-sm text-teal-950" aria-live="polite">
            {minutes !== null && previewAmount !== null ? (
              <>
                <p className="font-semibold">Durée nette : {formatDuration(minutes)}</p>
                <p>Salaire de ce service : {formatMoney(previewAmount)}</p>
                {overnight ? <p className="mt-1">Ce service passe minuit. Il est compté sur la date de début.</p> : null}
                {minutes === 0 ? <p className="mt-1">La pause annule la durée. Réduisez-la pour enregistrer le service.</p> : null}
              </>
            ) : (
              <p>Renseignez les horaires pour voir la durée et le montant.</p>
            )}
            {sameDay.length > 0 ? (
              <div className="mt-3 border-t border-teal-100 pt-3">
                <p className="font-medium">Déjà saisi le {formatDateFr(draft.date)}</p>
                <ul className="mt-1 space-y-1">
                  {sameDay.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <ShiftBadge type={item.type} />
                        {formatRange(item.start, item.end)}
                      </span>
                      <span className="tabular-nums">
                        {formatDuration(shiftMinutes(item))} · {formatMoney(shiftAmountCents(item))}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 font-semibold tabular-nums">
                  Total du jour : {formatDuration(dayMinutes)} · {formatMoney(dayAmount)}
                </p>
              </div>
            ) : null}
          </div>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        </div>
        <div className="sticky bottom-0 -mx-5 mt-4 flex flex-col gap-2 border-t border-slate-100 bg-white px-5 py-4">
          <Button type="button" variant="secondary" onClick={reuse} disabled={!previous}>
            Reprendre les horaires précédents
          </Button>
          <div className="grid gap-2 sm:grid-cols-2">
            {!editing ? (
              <Button type="button" variant="secondary" onClick={() => submit(true)}>
                Enregistrer et ajouter un autre
              </Button>
            ) : (
              <Button type="button" variant="ghost" onClick={onClose}>
                Annuler
              </Button>
            )}
            <Button type="submit">{editing ? 'Enregistrer les modifications' : 'Enregistrer'}</Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
