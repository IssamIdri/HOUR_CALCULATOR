import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Banknote, Clock3, Scale, Wallet } from 'lucide-react'
import { EquivalentHours } from '../components/EquivalentHours.tsx'
import { HoursChart } from '../components/HoursChart.tsx'
import { AddShiftButton, useDialogs } from '../components/Layout.tsx'
import { Page, PageHeader, ShiftBadge } from '../components/ui.tsx'
import { formatDateFr, formatDateLong, formatMonthLabel, todayIso } from '../domain/dates.ts'
import { comparisonLabel, shiftAmountCents, shiftMinutes, usesRateOtherThan } from '../domain/ledger.ts'
import { formatMoney } from '../domain/money.ts'
import { formatDuration, formatRange } from '../domain/time.ts'
import { usePageTitle } from '../hooks/usePageTitle.ts'
import { cn } from '../lib/cn.ts'
import { useApp } from '../state/AppState.tsx'

const card =
  'rise flex h-full flex-col rounded-3xl bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.05)] ring-1 ring-slate-200/80'
const balanceCard =
  'rise flex h-full flex-col rounded-3xl p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.05)]'

export function DashboardPage() {
  usePageTitle('Tableau de bord')
  const { dataset, summary, setMode } = useApp()
  const dialogs = useDialogs()
  const varied = usesRateOtherThan(dataset.shifts, dataset.settings.hourlyRateCents)
  const empty = dataset.shifts.length === 0 && dataset.payments.length === 0
  const balance = summary.balanceCents
  const balanceClass =
    balance > 0
      ? 'bg-slate-900 text-white'
      : balance < 0
        ? 'bg-indigo-950 text-white'
        : empty
          ? 'bg-white text-slate-900 ring-1 ring-slate-200/80'
          : 'bg-teal-800 text-white'
  const recent = [...dataset.shifts]
    .sort((a, b) => b.date.localeCompare(a.date) || b.start.localeCompare(a.start))
    .slice(0, 5)

  return (
    <Page>
      <PageHeader
        eyebrow={formatDateLong(todayIso())}
        title="Tableau de bord"
        description={dataset.settings.restaurantName || 'Suivez vos heures, votre salaire et ce qu’il reste à payer.'}
        action={<AddShiftButton />}
      />

      {empty ? (
        <section className="rise mt-6 rounded-3xl bg-white p-6 ring-1 ring-slate-200/80 sm:p-8">
          <h2 className="text-xl font-semibold">Aucune heure enregistrée</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
            Ajoutez un service du midi ou du soir. Le salaire et le reste à payer se mettent à jour tout de suite.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <AddShiftButton />
            <button type="button" className="rounded-2xl px-4 py-2.5 text-sm font-semibold text-teal-800 hover:bg-teal-50" onClick={() => setMode('demo')}>
              Voir un exemple fictif
            </button>
          </div>
        </section>
      ) : null}

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className={cn(card, 'order-2 xl:order-1')}>
          <CardLabel icon={<Clock3 size={18} />} label="Heures travaillées" />
          <p className="mt-4 text-3xl font-semibold tracking-tight tabular-nums">{formatDuration(summary.monthMinutes)}</p>
          <p className="mt-1 text-sm text-slate-500">{formatMonthLabel(summary.monthKey)}</p>
          <p className="mt-4 text-sm text-slate-600">Depuis le début : {formatDuration(summary.allMinutes)}</p>
          <p className="mt-2 text-sm leading-5 text-slate-500">
            {comparisonLabel(summary.monthMinutes, summary.previousMonthMinutes, summary.previousMonthKey)}
          </p>
        </article>

        <article className={cn(card, 'order-3 xl:order-2')}>
          <CardLabel icon={<Banknote size={18} />} label="Salaire gagné" />
          <p className="mt-4 text-3xl font-semibold tracking-tight tabular-nums">{formatMoney(summary.monthEarnedCents)}</p>
          <p className="mt-1 text-sm text-slate-500">Estimé pour {formatMonthLabel(summary.monthKey).toLocaleLowerCase('fr-FR')}</p>
          <p className="mt-auto pt-4 text-sm text-slate-600">Depuis le début : {formatMoney(summary.allEarnedCents)}</p>
        </article>

        <article className={cn(card, 'order-4 xl:order-3')}>
          <CardLabel icon={<Wallet size={18} />} label="Montant reçu" />
          <p className="mt-4 text-3xl font-semibold tracking-tight tabular-nums">{formatMoney(summary.allPaidCents)}</p>
          <p className="mt-1 text-sm text-slate-500">Total des paiements enregistrés</p>
          <p className="mt-auto pt-4 text-sm text-slate-600">
            {summary.lastPayment
              ? `Dernier paiement : ${formatDateFr(summary.lastPayment.date)} · ${formatMoney(summary.lastPayment.amountCents)}`
              : 'Aucun paiement'}
          </p>
        </article>

        <article className={cn(balanceCard, balanceClass, 'order-1 xl:order-4')}>
          <CardLabel icon={<Scale size={18} />} label="Solde restant" light={balance !== 0 || !empty} />
          <p className="mt-4 text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl">{formatMoney(balance)}</p>
          <p className={cn('mt-1 text-sm', balance === 0 && empty ? 'text-slate-500' : 'text-slate-300')}>
            {balance > 0 ? 'Votre employeur vous doit ce montant.' : balance < 0 ? 'Avance déjà versée.' : empty ? 'Aucun montant en attente.' : 'Tout est réglé.'}
          </p>
          <div className="mt-auto pt-4">
            {empty ? null : (
              <EquivalentHours
                balance={balance}
                minutes={summary.equivalentMinutes}
                hourlyRateCents={dataset.settings.hourlyRateCents}
                varied={varied}
                tone={balance === 0 && empty ? 'light' : 'dark'}
                compact
              />
            )}
            <p className={cn('mt-2 text-xs', balance === 0 && empty ? 'text-slate-400' : 'text-slate-300')}>Solde = total gagné − total payé</p>
          </div>
        </article>
      </section>

      {empty ? null : (
        <div className="mt-4 grid gap-4 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <HoursChart shifts={dataset.shifts} weekStartsOn={dataset.settings.weekStartsOn} />
          </div>
          <section className="rounded-3xl bg-white p-5 ring-1 ring-slate-200/80 lg:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Derniers services</h2>
              <Link to="/historique" className="text-sm font-semibold text-teal-800">
                Historique
              </Link>
            </div>
            <ul className="mt-4 space-y-3">
              {recent.map((shift) => (
                <li key={shift.id}>
                  <button type="button" onClick={() => dialogs.openShift({ id: shift.id })} className="flex w-full items-center justify-between gap-3 rounded-2xl px-2 py-2 text-left hover:bg-slate-50">
                    <span>
                      <span className="flex items-center gap-2">
                        <ShiftBadge type={shift.type} />
                        <span className="text-sm font-medium">{formatDateFr(shift.date)}</span>
                      </span>
                      <span className="mt-1 block text-sm text-slate-500">{formatRange(shift.start, shift.end)}</span>
                    </span>
                    <span className="text-right text-sm tabular-nums">
                      <span className="block font-semibold">{formatMoney(shiftAmountCents(shift))}</span>
                      <span className="text-slate-500">{formatDuration(shiftMinutes(shift))}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <Link to="/releve" className="mt-4 inline-flex text-sm font-semibold text-teal-800">
              Ouvrir le relevé mensuel
            </Link>
          </section>
        </div>
      )}
    </Page>
  )
}

function CardLabel({ icon, label, light = false }: { icon: ReactNode; label: string; light?: boolean }) {
  return (
    <div className={cn('flex items-center gap-2 text-sm font-medium', light ? 'text-slate-300' : 'text-slate-500')}>
      {icon}
      {label}
    </div>
  )
}
