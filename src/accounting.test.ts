import { describe, expect, it } from 'vitest'
import { parseBackup, serializeBackup } from './data/backup.ts'
import { parseShiftsCsv, paymentsToCsv, shiftsToCsv } from './data/csv.ts'
import { createLocalRepository } from './data/repository.ts'
import { STORAGE_CORRUPT_KEY, STORAGE_KEY, STORAGE_PREVIOUS_KEY, createInitialState, createMemoryStore } from './data/storage.ts'
import { createShift } from './domain/drafts.ts'
import { activeDataset, balanceCents, equivalentMinutes, shiftAmountCents, shiftMinutes, summarize, totalEarnedCents, weeklySeries } from './domain/ledger.ts'
import { amountCents, formatMoney, parseEurosToCents } from './domain/money.ts'
import { defaultSettings } from './domain/settings.ts'
import { formatDuration, workedMinutes } from './domain/time.ts'
import type { Payment, Shift } from './domain/types.ts'
import { reducer } from './state/reducer.ts'

const NOW = new Date(2026, 9, 20, 12, 0, 0)

function makeShift(overrides: Partial<Shift> & Pick<Shift, 'id' | 'start' | 'end'>): Shift {
  return {
    date: '2026-10-20',
    type: 'midi',
    breakMinutes: 0,
    hourlyRateCents: 1200,
    notes: '',
    createdAt: '2026-10-20T08:00:00.000Z',
    updatedAt: '2026-10-20T08:00:00.000Z',
    ...overrides,
  }
}

function makePayment(overrides: Partial<Payment> & Pick<Payment, 'id' | 'amountCents'>): Payment {
  return {
    date: '2026-10-20',
    method: 'virement',
    period: '',
    notes: '',
    createdAt: '2026-10-20T18:00:00.000Z',
    updatedAt: '2026-10-20T18:00:00.000Z',
    ...overrides,
  }
}

describe('durées et centimes', () => {
  it('formate les durées en heures et minutes', () => {
    expect(formatDuration(0)).toBe('0 h')
    expect(formatDuration(60)).toBe('1 h')
    expect(formatDuration(90)).toBe('1 h 30')
    expect(formatDuration(270)).toBe('4 h 30')
    expect(formatDuration(450)).toBe('7 h 30')
  })

  it('arrondit le salaire au centime', () => {
    expect(amountCents(180, 1200)).toBe(3600)
    expect(amountCents(270, 1200)).toBe(5400)
    expect(amountCents(1, 1150)).toBe(19)
    expect(amountCents(20, 1150)).toBe(383)
    expect(parseEurosToCents('12,50')).toBe(1250)
    expect(parseEurosToCents('1 020,50 €')).toBe(102050)
    expect(parseEurosToCents('12,555')).toBeNull()
    expect(formatMoney(102050).replace(/\s/g, ' ')).toBe('1 020,50 €')
  })

  it('compte un service qui passe minuit', () => {
    expect(workedMinutes('19:00', '00:30', 0)).toBe(330)
    expect(amountCents(330, 1200)).toBe(6600)
  })

  it('retire la pause non rémunérée', () => {
    expect(workedMinutes('18:30', '23:30', 30)).toBe(270)
    expect(workedMinutes('12:00', '15:30', 20)).toBe(190)
    const rejected = createShift({
      date: '2026-10-20',
      type: 'midi',
      start: '12:00',
      end: '15:00',
      breakMinutes: 200,
      hourlyRateCents: 1200,
      notes: '',
    })
    expect(rejected.ok).toBe(false)
  })
})

describe('solde', () => {
  it('compte deux services le même jour', () => {
    const shifts = [
      makeShift({ id: 'midi', type: 'midi', start: '12:00', end: '15:00' }),
      makeShift({ id: 'soir', type: 'soir', start: '19:00', end: '23:30' }),
    ]
    expect(shifts.filter((shift) => shift.date === '2026-10-20')).toHaveLength(2)
    expect(shiftMinutes(shifts[0])).toBe(180)
    expect(shiftMinutes(shifts[1])).toBe(270)
    expect(totalEarnedCents(shifts)).toBe(9000)
  })

  it('calcule un paiement partiel et les heures équivalentes', () => {
    const shifts = [makeShift({ id: 'jour', start: '08:00', end: '04:00' })]
    const payments = [makePayment({ id: 'acompte', amountCents: 15000 })]
    expect(totalEarnedCents(shifts)).toBe(24000)
    expect(balanceCents(shifts, payments)).toBe(9000)
    expect(equivalentMinutes(9000, 1200)).toBe(450)
    expect(formatDuration(450)).toBe('7 h 30')
  })

  it('remet le solde à zéro sans effacer l’historique quand le paiement est complet', () => {
    let state = createInitialState()
    const shift = makeShift({ id: 'jour', start: '08:00', end: '04:00' })
    state = reducer(state, { type: 'save-shift', shift })
    state = reducer(state, { type: 'save-payment', payment: makePayment({ id: 'solde', amountCents: 24000 }) })
    expect(state.real.shifts).toHaveLength(1)
    expect(balanceCents(state.real.shifts, state.real.payments)).toBe(0)
    expect(equivalentMinutes(0, 1200)).toBe(0)
  })

  it('ouvre un nouveau solde avec les heures saisies après un paiement complet', () => {
    let state = createInitialState()
    state = reducer(state, { type: 'save-shift', shift: makeShift({ id: 'jour', start: '08:00', end: '04:00' }) })
    state = reducer(state, { type: 'save-payment', payment: makePayment({ id: 'solde', amountCents: 24000 }) })
    state = reducer(state, {
      type: 'save-shift',
      shift: makeShift({ id: 'suite', type: 'soir', start: '12:00', end: '17:00' }),
    })
    expect(balanceCents(state.real.shifts, state.real.payments)).toBe(6000)
    expect(state.real.shifts).toHaveLength(2)
    expect(state.real.payments).toHaveLength(1)
  })

  it('additionne plusieurs paiements successifs', () => {
    const shifts = [makeShift({ id: 'jour', start: '08:00', end: '04:00' })]
    const payments = [
      makePayment({ id: 'p1', amountCents: 10000, createdAt: '2026-10-18T10:00:00.000Z' }),
      makePayment({ id: 'p2', amountCents: 5000, createdAt: '2026-10-19T10:00:00.000Z' }),
    ]
    expect(balanceCents(shifts, payments)).toBe(9000)
  })

  it('ne modifie pas les montants historiques quand le taux habituel change', () => {
    let state = createInitialState()
    const shift = makeShift({ id: 'ancien', start: '12:00', end: '15:00', hourlyRateCents: 1150 })
    state = reducer(state, { type: 'save-shift', shift })
    state = reducer(state, {
      type: 'update-settings',
      settings: { ...defaultSettings(), hourlyRateCents: 1500 },
    })
    expect(shiftAmountCents(state.real.shifts[0])).toBe(3450)
    expect(state.real.settings.hourlyRateCents).toBe(1500)
  })

  it('recalcule uniquement le service modifié', () => {
    let state = createInitialState()
    const first = makeShift({ id: 'a', start: '12:00', end: '15:00' })
    const second = makeShift({ id: 'b', type: 'soir', start: '19:00', end: '23:00' })
    state = reducer(state, { type: 'save-shift', shift: first })
    state = reducer(state, { type: 'save-shift', shift: second })
    state = reducer(state, { type: 'save-shift', shift: { ...first, end: '16:00', updatedAt: '2026-10-21T00:00:00.000Z' } })
    const updated = state.real.shifts.find((shift) => shift.id === 'a')
    const untouched = state.real.shifts.find((shift) => shift.id === 'b')
    expect(shiftAmountCents(updated!)).toBe(4800)
    expect(shiftAmountCents(untouched!)).toBe(4800)
    expect(untouched).toEqual(second)
  })

  it('recalcule le solde après la suppression d’un paiement', () => {
    let state = createInitialState()
    state = reducer(state, { type: 'save-shift', shift: makeShift({ id: 'jour', start: '08:00', end: '04:00' }) })
    state = reducer(state, { type: 'save-payment', payment: makePayment({ id: 'p1', amountCents: 10000 }) })
    state = reducer(state, { type: 'save-payment', payment: makePayment({ id: 'p2', amountCents: 5000 }) })
    expect(balanceCents(state.real.shifts, state.real.payments)).toBe(9000)
    state = reducer(state, { type: 'delete-payment', id: 'p1' })
    expect(state.real.payments).toHaveLength(1)
    expect(balanceCents(state.real.shifts, state.real.payments)).toBe(19000)
  })

  it('garde la démonstration à part des données réelles', () => {
    let state = createInitialState()
    state = reducer(state, { type: 'save-shift', shift: makeShift({ id: 'reel', start: '12:00', end: '15:00' }) })
    state = reducer(state, { type: 'set-mode', mode: 'demo' })
    expect(state.demo.shifts.some((shift) => shift.id === 'reel')).toBe(false)
    expect(state.real.shifts).toHaveLength(1)
    const summary = summarize(activeDataset(state), NOW)
    expect(summary.monthEarnedCents).toBe(53600)
    expect(summary.balanceCents).toBe(33600)
    expect(summary.equivalentMinutes).toBe(28 * 60)
    expect(summary.monthMinutes).toBe(2680)
    expect(summary.previousMonthMinutes).toBe(2550)
    const september = state.demo.shifts.filter((shift) => shift.date.startsWith('2026-09'))
    expect(totalEarnedCents(september)).toBe(50850)
  })
})

describe('conservation et import', () => {
  it('conserve les données après rechargement', () => {
    const store = createMemoryStore()
    const repository = createLocalRepository(store)
    let state = repository.load()
    state = reducer(state, { type: 'save-shift', shift: makeShift({ id: 'persiste', start: '12:00', end: '15:00' }) })
    repository.save(state)
    const reloaded = createLocalRepository(store).load()
    expect(reloaded.real.shifts.map((shift) => shift.id)).toEqual(['persiste'])
    expect(shiftAmountCents(reloaded.real.shifts[0])).toBe(3600)

    const edited = reducer(reloaded, {
      type: 'save-payment',
      payment: makePayment({ id: 'pay', amountCents: 1000 }),
    })
    repository.save(edited)
    const previous = store.getItem(STORAGE_PREVIOUS_KEY)
    expect(previous).toContain('persiste')
    expect(createLocalRepository(store).load().real.payments[0].amountCents).toBe(1000)
  })

  it('valide une sauvegarde JSON avant remplacement', () => {
    const dataset = {
      settings: defaultSettings(),
      shifts: [makeShift({ id: 's', start: '12:00', end: '15:00', notes: 'Il a dit "ok"' })],
      payments: [makePayment({ id: 'p', amountCents: 1000 })],
    }
    const raw = serializeBackup(dataset)
    const parsed = parseBackup(raw)
    expect(parsed.ok).toBe(true)
    if (parsed.ok) expect(parsed.dataset.shifts[0].notes).toBe('Il a dit "ok"')
    expect(parseBackup('{').ok).toBe(false)
    expect(parseBackup('{"version":1}').ok).toBe(false)

    let state = createInitialState()
    state = reducer(state, { type: 'save-shift', shift: makeShift({ id: 'reel', start: '19:00', end: '23:00' }) })
    if (!parsed.ok) throw new Error('sauvegarde invalide')
    state = reducer(state, { type: 'replace-dataset', dataset: parsed.dataset })
    expect(state.real.shifts.map((shift) => shift.id)).toEqual(['s'])
    expect(state.demo.shifts.length).toBeGreaterThan(1)

    const csv = shiftsToCsv(parsed.dataset.shifts)
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    expect(csv).toContain(';')
    expect(csv).toContain('20/10/2026')
    expect(csv).toContain('""ok""')
    expect(paymentsToCsv(parsed.dataset.payments)).toContain('10,00')
  })

  it('ne remplace pas une sauvegarde illisible', () => {
    const store = createMemoryStore()
    store.setItem(STORAGE_KEY, '{ceci n’est pas du json')
    const loaded = createLocalRepository(store).load()
    expect(loaded.real.shifts).toHaveLength(0)
    expect(store.getItem(STORAGE_CORRUPT_KEY)).toContain('json')
  })

  it('regroupe les heures de la bonne semaine', () => {
    const series = weeklySeries(createInitialState().demo.shifts, 1, NOW, 8)
    const current = series.find((point) => point.key === '2026-10-19')
    const previous = series.find((point) => point.key === '2026-10-12')
    expect(current?.minutes).toBe(180)
    expect(previous?.minutes).toBe(960)
  })

  it('réimporte un CSV de services au format de l’export', () => {
    const source = [
      makeShift({
        id: 'midi',
        type: 'midi',
        start: '12:00',
        end: '15:00',
        notes: 'Il a dit "ok"',
      }),
      makeShift({
        id: 'soir',
        type: 'soir',
        start: '19:00',
        end: '00:30',
        breakMinutes: 30,
        hourlyRateCents: 1250,
      }),
    ]
    const csv = shiftsToCsv(source)
    const parsed = parseShiftsCsv(csv, NOW)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) throw new Error(parsed.error)
    expect(parsed.shifts).toHaveLength(2)
    expect(parsed.shifts[0]).toMatchObject({
      date: '2026-10-20',
      type: 'midi',
      start: '12:00',
      end: '15:00',
      breakMinutes: 0,
      hourlyRateCents: 1200,
      notes: 'Il a dit "ok"',
    })
    expect(shiftAmountCents(parsed.shifts[0])).toBe(3600)
    expect(parsed.shifts[1]).toMatchObject({
      type: 'soir',
      start: '19:00',
      end: '00:30',
      breakMinutes: 30,
      hourlyRateCents: 1250,
    })
    expect(shiftAmountCents(parsed.shifts[1])).toBe(6250)

    let state = createInitialState()
    state = reducer(state, { type: 'save-shift', shift: makeShift({ id: 'existant', start: '10:00', end: '11:00' }) })
    state = reducer(state, { type: 'import-shifts', shifts: parsed.shifts })
    expect(state.real.shifts).toHaveLength(3)
    expect(totalEarnedCents(state.real.shifts)).toBe(1200 + 3600 + 6250)
  })

  it('refuse un CSV de services invalide', () => {
    expect(parseShiftsCsv('Date;Service\r\n20/10/2026;Midi').ok).toBe(false)
    expect(parseShiftsCsv('').ok).toBe(false)
  })

  it('accepte un CSV réécrit par Excel avec secondes et taux entier', () => {
    const excelCsv =
      '\uFEFFDate;Service;Début;Fin;Pause (min);Durée (min);Durée;Taux horaire;Montant;Notes\r\n' +
      '08/10/2026;Midi;11:30:00;14:30:00;0;180;3 h;10;30;\r\n' +
      '10/10/2026;Soir;18:30:00;00:00:00;0;330;5 h 30;10;55;\r\n'
    const parsed = parseShiftsCsv(excelCsv, NOW)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) throw new Error(parsed.error)
    expect(parsed.shifts).toHaveLength(2)
    expect(parsed.shifts[0]).toMatchObject({
      date: '2026-10-08',
      type: 'midi',
      start: '11:30',
      end: '14:30',
      hourlyRateCents: 1000,
    })
    expect(parsed.shifts[1]).toMatchObject({
      start: '18:30',
      end: '00:00',
      hourlyRateCents: 1000,
    })
    expect(shiftAmountCents(parsed.shifts[1])).toBe(5500)
  })
})
