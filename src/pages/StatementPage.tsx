import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Page } from '../components/ui.tsx'
import { currentMonthKey, formatDateFr, formatMonthLabel, monthKey, shiftMonth, todayIso } from '../domain/dates.ts'
import { METHOD_LABEL, SHIFT_LABEL } from '../domain/labels.ts'
import { shiftAmountCents, shiftMinutes, sortPayments, totalEarnedCents, totalMinutes, totalPaidCents } from '../domain/ledger.ts'
import { formatMoney } from '../domain/money.ts'
import { formatDuration, formatRange } from '../domain/time.ts'
import { usePageTitle } from '../hooks/usePageTitle.ts'
import { useApp } from '../state/AppState.tsx'

export function StatementPage() {
  usePageTitle('Relevé mensuel')
  const { dataset, summary, mode } = useApp()
  const [month, setMonth] = useState(currentMonthKey())
  const shifts = [...dataset.shifts]
    .filter((shift) => monthKey(shift.date) === month)
    .sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start))
  const payments = sortPayments(
    dataset.payments.filter((payment) => monthKey(payment.date) === month),
    'asc',
  )
  const monthList = Array.from(
    new Set([
      month,
      currentMonthKey(),
      ...dataset.shifts.map((shift) => monthKey(shift.date)),
      ...dataset.payments.map((payment) => monthKey(payment.date)),
    ]),
  ).sort((a, b) => b.localeCompare(a))

  return (
    <Page>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link to="/" className="text-sm font-semibold text-teal-800">
          Retour au tableau de bord
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="rounded-2xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-white" onClick={() => setMonth((current) => shiftMonth(current, -1))}>
            Mois précédent
          </button>
          <select value={month} onChange={(event) => setMonth(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm">
            {monthList.map((item) => (
              <option key={item} value={item}>
                {formatMonthLabel(item)}
              </option>
            ))}
          </select>
          <button type="button" className="rounded-2xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-white" onClick={() => setMonth((current) => shiftMonth(current, 1))}>
            Mois suivant
          </button>
          <button type="button" className="rounded-2xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white" onClick={() => window.print()}>
            Imprimer / enregistrer en PDF
          </button>
        </div>
      </div>

      <article className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80 print:rounded-none print:p-0 print:shadow-none print:ring-0 sm:p-8">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <p className="text-sm text-slate-500">Relevé mensuel</p>
            <h1 className="text-2xl font-semibold">{dataset.settings.restaurantName || 'Suivi des heures'}</h1>
            <p className="mt-1 text-slate-600">{formatMonthLabel(month)}</p>
          </div>
          <p className="text-sm text-slate-500">
            Généré le {formatDateFr(todayIso())}
            {mode === 'demo' ? ' · données fictives' : ''}
          </p>
        </header>

        <section className="mt-6 grid gap-3 sm:grid-cols-3">
          <Figure label="Heures du mois" value={formatDuration(totalMinutes(shifts))} />
          <Figure label="Montant gagné" value={formatMoney(totalEarnedCents(shifts))} />
          <Figure label="Paiements du mois" value={formatMoney(totalPaidCents(payments))} />
        </section>

        <h2 className="mt-8 text-lg font-semibold">Services</h2>
        {shifts.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Aucun service ce mois-ci.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="py-2 pr-3 font-medium">Date</th>
                  <th className="py-2 pr-3 font-medium">Service</th>
                  <th className="py-2 pr-3 font-medium">Horaires</th>
                  <th className="py-2 pr-3 font-medium">Durée</th>
                  <th className="py-2 text-right font-medium">Montant</th>
                </tr>
              </thead>
              <tbody>
                {shifts.map((shift) => (
                  <tr key={shift.id} className="border-b border-slate-100">
                    <td className="py-2 pr-3">{formatDateFr(shift.date)}</td>
                    <td className="py-2 pr-3">{SHIFT_LABEL[shift.type]}</td>
                    <td className="py-2 pr-3">{formatRange(shift.start, shift.end)}</td>
                    <td className="py-2 pr-3 tabular-nums">{formatDuration(shiftMinutes(shift))}</td>
                    <td className="py-2 text-right tabular-nums">{formatMoney(shiftAmountCents(shift))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <h2 className="mt-8 text-lg font-semibold">Paiements datés de ce mois</h2>
        {payments.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Aucun paiement sur cette période.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {payments.map((payment) => (
              <li key={payment.id} className="flex flex-wrap justify-between gap-2 border-b border-slate-100 py-2">
                <span>
                  {formatDateFr(payment.date)} · {METHOD_LABEL[payment.method]}
                  {payment.period ? ` · ${payment.period}` : ''}
                  {payment.notes ? ` · ${payment.notes}` : ''}
                </span>
                <span className="font-medium tabular-nums">{formatMoney(payment.amountCents)}</span>
              </li>
            ))}
          </ul>
        )}

        <section className="mt-8 rounded-2xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Solde global à ce jour</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{formatMoney(summary.balanceCents)}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Total gagné depuis le début : {formatMoney(summary.allEarnedCents)}. Total payé : {formatMoney(summary.allPaidCents)}. Le solde ne se limite pas à {formatMonthLabel(month).toLocaleLowerCase('fr-FR')} : un paiement n’est pas affecté à des services précis.
          </p>
        </section>

        <p className="mt-6 text-xs leading-5 text-slate-500">
          Les montants sont calculés en centimes, au taux enregistré pour chaque service. Changer le taux habituel plus tard ne réécrit pas cet historique.
        </p>
      </article>
    </Page>
  )
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  )
}
