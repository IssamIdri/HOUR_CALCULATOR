import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { parseBackup, serializeBackup } from '../data/backup.ts'
import { paymentsToCsv, shiftsToCsv } from '../data/csv.ts'
import { Button, ConfirmDialog, Page, PageHeader, TextField } from '../components/ui.tsx'
import { todayIso } from '../domain/dates.ts'
import { centsToInput, parseEurosToCents } from '../domain/money.ts'
import { validateSettings } from '../domain/settings.ts'
import type { Dataset, WeekStartsOn } from '../domain/types.ts'
import { usePageTitle } from '../hooks/usePageTitle.ts'
import { downloadText } from '../lib/download.ts'
import { useApp } from '../state/AppState.tsx'

interface Draft {
  rate: string
  restaurantName: string
  defaultBreakMinutes: string
  midiStart: string
  midiEnd: string
  soirStart: string
  soirEnd: string
  weekStartsOn: WeekStartsOn
}

function toDraft(settings: Dataset['settings']): Draft {
  return {
    rate: centsToInput(settings.hourlyRateCents),
    restaurantName: settings.restaurantName,
    defaultBreakMinutes: String(settings.defaultBreakMinutes),
    midiStart: settings.midiStart,
    midiEnd: settings.midiEnd,
    soirStart: settings.soirStart,
    soirEnd: settings.soirEnd,
    weekStartsOn: settings.weekStartsOn,
  }
}

export function SettingsPage() {
  usePageTitle('Paramètres')
  const { dataset, mode, setMode, updateSettings, importDataset, resetDemo, clearReal } = useApp()
  const [seenSettings, setSeenSettings] = useState(dataset.settings)
  const [draft, setDraft] = useState(() => toDraft(dataset.settings))
  if (seenSettings !== dataset.settings) {
    setSeenSettings(dataset.settings)
    setDraft(toDraft(dataset.settings))
  }
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [pendingImport, setPendingImport] = useState<Dataset | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function saveSettings() {
    const rate = parseEurosToCents(draft.rate)
    if (rate === null) {
      setError('Indiquez un taux horaire valide, par exemple 12,50.')
      setSaved(false)
      return
    }
    if (!/^\d+$/.test(draft.defaultBreakMinutes.trim())) {
      setError('La pause par défaut doit être un nombre de minutes entier.')
      setSaved(false)
      return
    }
    const result = validateSettings({
      hourlyRateCents: rate,
      currency: 'EUR',
      restaurantName: draft.restaurantName,
      defaultBreakMinutes: Number(draft.defaultBreakMinutes),
      midiStart: draft.midiStart,
      midiEnd: draft.midiEnd,
      soirStart: draft.soirStart,
      soirEnd: draft.soirEnd,
      weekStartsOn: draft.weekStartsOn,
    })
    if (!result.ok) {
      setError(result.error)
      setSaved(false)
      return
    }
    updateSettings(result.settings)
    setError(null)
    setSaved(true)
  }

  function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : ''
      const result = parseBackup(text)
      if (!result.ok) {
        setImportError(result.error)
        setPendingImport(null)
        return
      }
      setImportError(null)
      setPendingImport(result.dataset)
    }
    reader.readAsText(file)
  }

  function download(kind: 'shifts' | 'payments' | 'json') {
    const suffix = mode === 'demo' ? 'demonstration' : 'reel'
    const stamp = todayIso()
    if (kind === 'shifts') downloadText(`services-${suffix}-${stamp}.csv`, shiftsToCsv(dataset.shifts), 'text/csv;charset=utf-8')
    if (kind === 'payments') downloadText(`paiements-${suffix}-${stamp}.csv`, paymentsToCsv(dataset.payments), 'text/csv;charset=utf-8')
    if (kind === 'json') downloadText(`sauvegarde-${suffix}-${stamp}.json`, serializeBackup(dataset), 'application/json')
  }

  return (
    <Page>
      <PageHeader
        eyebrow="Réglages"
        title="Paramètres"
        description="Le taux habituel sert aux prochaines saisies. Il ne modifie pas les services déjà enregistrés."
      />

      <section className="mt-6 rounded-3xl bg-white p-5 ring-1 ring-slate-200/80">
        <h2 className="text-lg font-semibold">Travail</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <TextField id="rate" label="Taux horaire habituel" inputMode="decimal" value={draft.rate} onChange={(event) => setDraft((current) => ({ ...current, rate: event.target.value }))} hint="En euros, par exemple 12,50" />
          <TextField id="currency" label="Devise" value="Euro (€)" readOnly />
          <TextField id="restaurant" label="Nom du restaurant, facultatif" value={draft.restaurantName} onChange={(event) => setDraft((current) => ({ ...current, restaurantName: event.target.value }))} />
          <TextField id="break" label="Pause par défaut" inputMode="numeric" value={draft.defaultBreakMinutes} onChange={(event) => setDraft((current) => ({ ...current, defaultBreakMinutes: event.target.value.replace(/[^\d]/g, '') }))} hint="Minutes" />
          <TextField id="midi-start" label="Midi, début habituel" type="time" step={60} value={draft.midiStart} onChange={(event) => setDraft((current) => ({ ...current, midiStart: event.target.value }))} />
          <TextField id="midi-end" label="Midi, fin habituelle" type="time" step={60} value={draft.midiEnd} onChange={(event) => setDraft((current) => ({ ...current, midiEnd: event.target.value }))} />
          <TextField id="soir-start" label="Soir, début habituel" type="time" step={60} value={draft.soirStart} onChange={(event) => setDraft((current) => ({ ...current, soirStart: event.target.value }))} />
          <TextField id="soir-end" label="Soir, fin habituelle" type="time" step={60} value={draft.soirEnd} onChange={(event) => setDraft((current) => ({ ...current, soirEnd: event.target.value }))} />
          <label className="block text-sm font-medium text-slate-700">
            Premier jour de la semaine
            <select
              className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-base font-normal"
              value={draft.weekStartsOn}
              onChange={(event) => setDraft((current) => ({ ...current, weekStartsOn: event.target.value === '0' ? 0 : 1 }))}
            >
              <option value="1">Lundi</option>
              <option value="0">Dimanche</option>
            </select>
          </label>
        </div>
        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
        {saved && !error ? <p className="mt-3 text-sm text-teal-800">Paramètres enregistrés. Les anciens montants n’ont pas changé.</p> : null}
        <Button className="mt-4" onClick={saveSettings}>
          Enregistrer les paramètres
        </Button>
      </section>

      <section className="mt-4 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
        <h2 className="text-base font-semibold">Où sont vos données ?</h2>
        <p className="mt-2">
          Elles restent enregistrées sur cet appareil, dans ce navigateur. Elles peuvent être perdues si le navigateur est réinitialisé ou si ses données sont effacées. Elles ne sont pas synchronisées avec votre téléphone ou un autre ordinateur.
        </p>
        <p className="mt-2">Téléchargez régulièrement une sauvegarde JSON. Une synchronisation entre appareils n’est pas disponible dans cette version.</p>
      </section>

      <section className="mt-4 rounded-3xl bg-white p-5 ring-1 ring-slate-200/80">
        <h2 className="text-lg font-semibold">Export et sauvegarde</h2>
        <p className="mt-1 text-sm text-slate-500">Les fichiers concernent le mode actuellement ouvert : {mode === 'demo' ? 'démonstration' : 'données réelles'}.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => download('json')}>Sauvegarde JSON</Button>
          <Button variant="secondary" onClick={() => download('shifts')}>Services (CSV)</Button>
          <Button variant="secondary" onClick={() => download('payments')}>Paiements (CSV)</Button>
          <Link to="/releve" className="inline-flex items-center justify-center rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50">
            Relevé mensuel (PDF)
          </Link>
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>Importer une sauvegarde</Button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onFile} />
        </div>
        {importError ? <p className="mt-3 text-sm text-rose-600">{importError}</p> : null}
      </section>

      <section className="mt-4 rounded-3xl bg-white p-5 ring-1 ring-slate-200/80">
        <h2 className="text-lg font-semibold">Démonstration et données réelles</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          L’exemple fictif est stocké à part. L’explorer ne mélange pas vos heures. Revenir à vos données ne supprime pas l’exemple.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {mode === 'demo' ? (
            <Button onClick={() => setMode('real')}>Revenir à mes données</Button>
          ) : (
            <Button variant="secondary" onClick={() => setMode('demo')}>Explorer la démonstration</Button>
          )}
          <Button variant="secondary" onClick={() => setConfirmReset(true)}>Réinitialiser l’exemple</Button>
          <Button variant="danger" onClick={() => setConfirmClear(true)}>Effacer mes données réelles</Button>
        </div>
      </section>

      <ConfirmDialog
        open={pendingImport !== null}
        title="Remplacer les données de ce mode ?"
        message={
          pendingImport
            ? `Cette sauvegarde contient ${pendingImport.shifts.length} service${pendingImport.shifts.length > 1 ? 's' : ''} et ${pendingImport.payments.length} paiement${pendingImport.payments.length > 1 ? 's' : ''}. Elle remplacera les données ${mode === 'demo' ? 'de la démonstration' : 'réelles'} sur cet appareil. L’autre mode n’est pas modifié.`
            : ''
        }
        confirmLabel="Remplacer"
        danger
        onCancel={() => setPendingImport(null)}
        onConfirm={() => {
          if (pendingImport) importDataset(pendingImport)
          setPendingImport(null)
        }}
      />
      <ConfirmDialog
        open={confirmReset}
        title="Réinitialiser l’exemple ?"
        message="Les données fictives actuelles seront remplacées par l’exemple d’origine. Vos données réelles ne changent pas."
        confirmLabel="Réinitialiser"
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          resetDemo()
          setConfirmReset(false)
        }}
      />
      <ConfirmDialog
        open={confirmClear}
        title="Effacer les données réelles ?"
        message="Tous vos services et paiements réels seront supprimés de cet appareil. Les paramètres et la démonstration sont conservés. Cette action est définitive."
        confirmLabel="Effacer"
        danger
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => {
          clearReal()
          setConfirmClear(false)
        }}
      />
    </Page>
  )
}
