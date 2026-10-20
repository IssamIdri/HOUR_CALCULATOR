import { isRealDate } from './dates.ts'
import { createId } from './id.ts'
import { grossMinutes } from './time.ts'
import type { Payment, PaymentMethod, Shift, ShiftType } from './types.ts'

const SHIFT_TYPES: ShiftType[] = ['midi', 'soir', 'autre']
const METHODS: PaymentMethod[] = ['virement', 'especes', 'cheque', 'autre']

export function createShift(input: {
  date: string
  type: ShiftType
  start: string
  end: string
  breakMinutes: number
  hourlyRateCents: number
  notes: string
  existing?: Shift
  now?: Date
}): { ok: true; shift: Shift } | { ok: false; error: string } {
  if (!isRealDate(input.date)) return { ok: false, error: 'Indiquez une date valide.' }
  if (!SHIFT_TYPES.includes(input.type)) return { ok: false, error: 'Choisissez un type de service.' }
  if (!isClock(input.start) || !isClock(input.end)) {
    return { ok: false, error: 'Indiquez une heure de début et de fin.' }
  }
  if (input.start === input.end) {
    return { ok: false, error: "L'heure de fin doit être différente de l'heure de début." }
  }
  if (!Number.isInteger(input.breakMinutes) || input.breakMinutes < 0 || input.breakMinutes > 24 * 60) {
    return { ok: false, error: 'La pause doit être un nombre de minutes entier.' }
  }
  const gross = grossMinutes(input.start, input.end)
  if (input.breakMinutes > gross) {
    return { ok: false, error: 'La pause ne peut pas dépasser la durée du service.' }
  }
  if (gross - input.breakMinutes <= 0) {
    return { ok: false, error: 'La durée nette doit être supérieure à zéro.' }
  }
  if (!Number.isInteger(input.hourlyRateCents) || input.hourlyRateCents <= 0 || input.hourlyRateCents > 50_000) {
    return { ok: false, error: 'Indiquez un taux horaire supérieur à zéro.' }
  }
  const notes = input.notes.trim()
  if (notes.length > 500) return { ok: false, error: 'La note ne peut pas dépasser 500 caractères.' }
  const nowIso = (input.now ?? new Date()).toISOString()
  return {
    ok: true,
    shift: {
      id: input.existing?.id ?? createId(),
      date: input.date,
      type: input.type,
      start: input.start,
      end: input.end,
      breakMinutes: input.breakMinutes,
      hourlyRateCents: input.hourlyRateCents,
      notes,
      createdAt: input.existing?.createdAt ?? nowIso,
      updatedAt: nowIso,
    },
  }
}

export function createPayment(input: {
  date: string
  amountCents: number
  method: PaymentMethod
  period: string
  notes: string
  existing?: Payment
  now?: Date
}): { ok: true; payment: Payment } | { ok: false; error: string } {
  if (!isRealDate(input.date)) return { ok: false, error: 'Indiquez une date de paiement valide.' }
  if (!METHODS.includes(input.method)) return { ok: false, error: 'Choisissez un moyen de paiement.' }
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    return { ok: false, error: 'Indiquez un montant supérieur à zéro.' }
  }
  if (input.amountCents > 10_000_000) {
    return { ok: false, error: 'Le montant dépasse 100 000 €. Vérifiez la saisie.' }
  }
  const period = input.period.trim()
  const notes = input.notes.trim()
  if (period.length > 80) return { ok: false, error: 'La période est trop longue.' }
  if (notes.length > 500) return { ok: false, error: 'Le commentaire ne peut pas dépasser 500 caractères.' }
  const nowIso = (input.now ?? new Date()).toISOString()
  return {
    ok: true,
    payment: {
      id: input.existing?.id ?? createId(),
      date: input.date,
      amountCents: input.amountCents,
      method: input.method,
      period,
      notes,
      createdAt: input.existing?.createdAt ?? nowIso,
      updatedAt: nowIso,
    },
  }
}

function isClock(value: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value)
}
