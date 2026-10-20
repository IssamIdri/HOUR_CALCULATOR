import { useState } from 'react'
import type { FormEvent } from 'react'
import { todayIso } from '../domain/dates.ts'
import { createPayment } from '../domain/drafts.ts'
import { advanceMessage } from '../domain/ledger.ts'
import { centsToInput, formatMoney, parseEurosToCents } from '../domain/money.ts'
import type { Payment, PaymentMethod } from '../domain/types.ts'
import { Button, ConfirmDialog, Modal, Segmented, TextArea, TextField } from './ui.tsx'

export function PaymentDialog({
  payment,
  settle,
  available,
  onClose,
  onSave,
}: {
  payment?: Payment
  settle: boolean
  available: number
  onClose: () => void
  onSave: (payment: Payment) => void
}) {
  const [date, setDate] = useState(payment?.date ?? todayIso())
  const [amount, setAmount] = useState(
    payment ? centsToInput(payment.amountCents) : settle && available > 0 ? centsToInput(available) : '',
  )
  const [method, setMethod] = useState<PaymentMethod>(payment?.method ?? 'virement')
  const [period, setPeriod] = useState(payment?.period ?? '')
  const [notes, setNotes] = useState(payment?.notes ?? '')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<Payment | null>(null)
  const parsed = parseEurosToCents(amount)
  const remaining = parsed === null ? null : available - parsed

  function submit(event: FormEvent) {
    event.preventDefault()
    if (parsed === null) {
      setError('Indiquez un montant valide, par exemple 150,00.')
      return
    }
    const result = createPayment({
      date,
      amountCents: parsed,
      method,
      period,
      notes,
      existing: payment,
    })
    if (!result.ok) {
      setError(result.error)
      return
    }
    setError(null)
    if (result.payment.amountCents > available) {
      setPending(result.payment)
      return
    }
    onSave(result.payment)
  }

  const title = payment ? 'Modifier le paiement' : settle ? 'Régler le solde' : 'Enregistrer un paiement'

  return (
    <>
      <Modal
        title={title}
        description={
          settle
            ? 'Le montant restant est prérempli. Vous pouvez le réduire pour un acompte.'
            : 'Le montant reçu est déduit du solde. Les services déjà saisis restent dans l’historique.'
        }
        onClose={onClose}
        dismissible={pending === null}
      >
        <form onSubmit={submit} className="px-5 pb-5">
          <div className="grid gap-4">
            <TextField id="payment-date" label="Date du paiement" type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
            <TextField
              id="payment-amount"
              label="Montant reçu"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="150,00"
              required
            />
            <Segmented
              label="Moyen de paiement"
              value={method}
              onChange={setMethod}
              columns="grid-cols-2"
              options={[
                { value: 'virement', label: 'Virement' },
                { value: 'especes', label: 'Espèces' },
                { value: 'cheque', label: 'Chèque' },
                { value: 'autre', label: 'Autre' },
              ]}
            />
            <TextField id="payment-period" label="Période concernée, facultative" value={period} onChange={(event) => setPeriod(event.target.value)} placeholder="Octobre 2026" />
            <TextArea id="payment-notes" label="Commentaire facultatif" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Acompte, salaire du mois…" />
            <p className={remaining !== null && remaining < 0 ? 'text-sm text-amber-700' : 'text-sm text-slate-600'}>
              {remaining === null
                ? `Solde avant ce paiement : ${formatMoney(available)}.`
                : remaining < 0
                  ? `Après ce paiement, avance de ${formatMoney(Math.abs(remaining))}.`
                  : `Après ce paiement, il restera ${formatMoney(remaining)}.`}
            </p>
            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          </div>
          <div className="sticky bottom-0 -mx-5 mt-4 flex flex-col gap-2 border-t border-slate-100 bg-white px-5 py-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit">{payment ? 'Enregistrer les modifications' : 'Enregistrer le paiement'}</Button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog
        open={pending !== null}
        title="Enregistrer une avance ?"
        message={pending ? advanceMessage(pending.amountCents, available) : ''}
        confirmLabel="Enregistrer l'avance"
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending) onSave(pending)
        }}
      />
    </>
  )
}
