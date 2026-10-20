import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { EquivalentHours } from '../components/EquivalentHours.tsx'
import { useDialogs } from '../components/Layout.tsx'
import { Button, ConfirmDialog, MethodBadge, Page, PageHeader } from '../components/ui.tsx'
import { formatDateFr } from '../domain/dates.ts'
import { sortPayments, usesRateOtherThan } from '../domain/ledger.ts'
import { formatMoney } from '../domain/money.ts'
import { usePageTitle } from '../hooks/usePageTitle.ts'
import { useApp } from '../state/AppState.tsx'
import type { Payment } from '../domain/types.ts'

export function PaymentsPage() {
  usePageTitle('Paiements')
  const { dataset, summary, deletePayment } = useApp()
  const dialogs = useDialogs()
  const [pending, setPending] = useState<Payment | null>(null)
  const payments = sortPayments(dataset.payments)
  const varied = usesRateOtherThan(dataset.shifts, dataset.settings.hourlyRateCents)
  const balance = summary.balanceCents

  return (
    <Page>
      <PageHeader
        eyebrow="Encaissements"
        title="Paiements"
        description="Chaque paiement est déduit du solde. Rien n’est effacé de l’historique."
        action={
          <Button onClick={() => dialogs.openPayment()} variant="secondary">
            Ajouter un paiement
          </Button>
        }
      />

      <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryItem label="Total gagné" value={formatMoney(summary.allEarnedCents)} />
        <SummaryItem label="Déjà payé" value={formatMoney(summary.allPaidCents)} />
        <SummaryItem label={balance < 0 ? 'Avance' : 'Reste à payer'} value={formatMoney(Math.abs(balance))} emphasis />
        <div className="rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">
          <p className="text-sm text-slate-500">Heures équivalentes</p>
          <div className="mt-2">
            <EquivalentHours
              balance={balance}
              minutes={summary.equivalentMinutes}
              hourlyRateCents={dataset.settings.hourlyRateCents}
              varied={varied}
            />
          </div>
        </div>
      </section>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <Button onClick={() => dialogs.openPayment({ settle: true })} disabled={balance <= 0}>
          Enregistrer le règlement du solde
        </Button>
        <Button variant="secondary" className="sm:hidden" onClick={() => dialogs.openPayment()}>
          Ajouter un paiement
        </Button>
      </div>
      {balance <= 0 ? (
        <p className="mt-2 text-sm text-slate-500">
          {balance === 0 ? 'Le solde est déjà réglé.' : 'Une avance est déjà enregistrée. Un nouveau paiement l’augmenterait.'}
        </p>
      ) : null}

      {payments.length === 0 ? (
        <section className="mt-6 rounded-3xl bg-white p-6 ring-1 ring-slate-200/80">
          <h2 className="text-lg font-semibold">Aucun paiement</h2>
          <p className="mt-2 text-sm text-slate-500">Le reste à payer est égal au salaire gagné tant qu’aucun versement n’est saisi.</p>
        </section>
      ) : (
        <ul className="mt-6 space-y-2">
          {payments.map((payment) => (
            <li key={payment.id} className="flex items-center gap-3 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-base font-semibold tabular-nums">{formatMoney(payment.amountCents)}</p>
                  <MethodBadge method={payment.method} />
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {formatDateFr(payment.date)}
                  {payment.period ? ` · ${payment.period}` : ''}
                </p>
                {payment.notes ? <p className="mt-1 text-sm break-words text-slate-500">{payment.notes}</p> : null}
              </div>
              <button type="button" className="inline-flex h-11 w-11 items-center justify-center rounded-2xl text-slate-500 hover:bg-slate-100" aria-label="Modifier le paiement" onClick={() => dialogs.openPayment({ id: payment.id })}>
                <Pencil size={18} />
              </button>
              <button type="button" className="inline-flex h-11 w-11 items-center justify-center rounded-2xl text-slate-500 hover:bg-rose-50 hover:text-rose-700" aria-label="Supprimer le paiement" onClick={() => setPending(payment)}>
                <Trash2 size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 max-w-2xl text-sm leading-6 text-slate-500">
        Chaque service conserve le taux saisi au moment de l’enregistrement. Un paiement vient en déduction du total, sans effacer l’historique. Solde = total gagné − total payé.
      </p>

      <ConfirmDialog
        open={pending !== null}
        title="Supprimer ce paiement ?"
        message={pending ? `Supprimer ce paiement de ${formatMoney(pending.amountCents)} ? Le solde à recevoir augmentera d’autant.` : ''}
        confirmLabel="Supprimer"
        danger
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending) deletePayment(pending.id)
          setPending(null)
        }}
      />
    </Page>
  )
}

function SummaryItem({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className={emphasis ? 'rounded-3xl bg-slate-900 p-4 text-white' : 'rounded-3xl bg-white p-4 ring-1 ring-slate-200/80'}>
      <p className={emphasis ? 'text-sm text-slate-300' : 'text-sm text-slate-500'}>{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  )
}
