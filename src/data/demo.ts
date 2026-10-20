import { defaultSettings } from '../domain/settings.ts'
import type { Dataset, Payment, Shift } from '../domain/types.ts'

/** Données fictives, séparées des saisies réelles. */
function shift(
  partial: Pick<Shift, 'id' | 'date' | 'type' | 'start' | 'end'> &
    Partial<Pick<Shift, 'breakMinutes' | 'hourlyRateCents' | 'notes'>>,
): Shift {
  const createdAt = `${partial.date}T12:00:00.000Z`
  return {
    breakMinutes: 0,
    hourlyRateCents: 1200,
    notes: '',
    createdAt,
    updatedAt: createdAt,
    ...partial,
  }
}

function payment(partial: Pick<Payment, 'id' | 'date' | 'amountCents' | 'method' | 'period' | 'notes'>): Payment {
  const createdAt = `${partial.date}T18:00:00.000Z`
  return { createdAt, updatedAt: createdAt, ...partial }
}

export function createDemoDataset(): Dataset {
  return {
    settings: {
      ...defaultSettings(),
      restaurantName: 'Le Comptoir',
      hourlyRateCents: 1200,
    },
    shifts: [
      shift({ id: 'demo-0902-midi', date: '2026-09-02', type: 'midi', start: '12:00', end: '15:00' }),
      shift({ id: 'demo-0902-soir', date: '2026-09-02', type: 'soir', start: '19:00', end: '23:30' }),
      shift({ id: 'demo-0905-soir', date: '2026-09-05', type: 'soir', start: '19:00', end: '23:00' }),
      shift({ id: 'demo-0909-midi', date: '2026-09-09', type: 'midi', start: '12:00', end: '15:00' }),
      shift({
        id: 'demo-0912-soir',
        date: '2026-09-12',
        type: 'soir',
        start: '18:30',
        end: '23:30',
        breakMinutes: 30,
        notes: 'Pause repas',
      }),
      shift({ id: 'demo-0916-midi', date: '2026-09-16', type: 'midi', start: '12:00', end: '15:00' }),
      shift({
        id: 'demo-0918-soir',
        date: '2026-09-18',
        type: 'soir',
        start: '19:00',
        end: '00:30',
        notes: 'Fermeture après minuit',
      }),
      shift({ id: 'demo-0923-midi', date: '2026-09-23', type: 'midi', start: '12:00', end: '15:00' }),
      shift({ id: 'demo-0923-soir', date: '2026-09-23', type: 'soir', start: '19:00', end: '23:30' }),
      shift({ id: 'demo-0926-soir', date: '2026-09-26', type: 'soir', start: '19:00', end: '23:30' }),
      shift({
        id: 'demo-0930-midi',
        date: '2026-09-30',
        type: 'midi',
        start: '12:00',
        end: '15:00',
        hourlyRateCents: 1150,
        notes: 'Ancien taux horaire',
      }),
      shift({ id: 'demo-1001-midi', date: '2026-10-01', type: 'midi', start: '12:00', end: '15:00' }),
      shift({ id: 'demo-1001-soir', date: '2026-10-01', type: 'soir', start: '19:00', end: '23:30' }),
      shift({ id: 'demo-1003-soir', date: '2026-10-03', type: 'soir', start: '19:00', end: '23:30' }),
      shift({ id: 'demo-1006-midi', date: '2026-10-06', type: 'midi', start: '12:00', end: '15:00' }),
      shift({
        id: 'demo-1008-soir',
        date: '2026-10-08',
        type: 'soir',
        start: '19:00',
        end: '00:30',
        notes: 'Fermeture après minuit',
      }),
      shift({
        id: 'demo-1010-midi',
        date: '2026-10-10',
        type: 'midi',
        start: '12:00',
        end: '15:30',
        breakMinutes: 20,
      }),
      shift({
        id: 'demo-1011-autre',
        date: '2026-10-11',
        type: 'autre',
        start: '10:00',
        end: '12:00',
        notes: 'Inventaire du matin',
      }),
      shift({ id: 'demo-1013-soir', date: '2026-10-13', type: 'soir', start: '19:00', end: '23:00' }),
      shift({ id: 'demo-1015-midi', date: '2026-10-15', type: 'midi', start: '12:00', end: '15:00' }),
      shift({ id: 'demo-1015-soir', date: '2026-10-15', type: 'soir', start: '19:00', end: '23:30' }),
      shift({
        id: 'demo-1017-soir',
        date: '2026-10-17',
        type: 'soir',
        start: '18:30',
        end: '23:30',
        breakMinutes: 30,
        notes: 'Pause repas',
      }),
      shift({ id: 'demo-1020-midi', date: '2026-10-20', type: 'midi', start: '12:00', end: '15:00' }),
    ],
    payments: [
      payment({
        id: 'demo-pay-sept',
        date: '2026-09-30',
        amountCents: 50850,
        method: 'virement',
        period: 'Septembre 2026',
        notes: 'Salaire de septembre',
      }),
      payment({
        id: 'demo-pay-oct',
        date: '2026-10-15',
        amountCents: 20000,
        method: 'especes',
        period: 'Octobre 2026',
        notes: 'Acompte',
      }),
    ],
  }
}
