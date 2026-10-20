import { createDemoDataset } from '../data/demo.ts'
import type { Dataset, Payment, PersistedState, Settings, Shift } from '../domain/types.ts'
import type { AppMode } from '../domain/types.ts'

export type Action =
  | { type: 'set-mode'; mode: AppMode }
  | { type: 'update-settings'; settings: Settings }
  | { type: 'save-shift'; shift: Shift }
  | { type: 'delete-shift'; id: string }
  | { type: 'save-payment'; payment: Payment }
  | { type: 'delete-payment'; id: string }
  | { type: 'replace-dataset'; dataset: Dataset }
  | { type: 'import-shifts'; shifts: Shift[] }
  | { type: 'reset-demo' }
  | { type: 'clear-real' }

export function reducer(state: PersistedState, action: Action): PersistedState {
  switch (action.type) {
    case 'set-mode':
      return { ...state, mode: action.mode }
    case 'update-settings':
      return withActive(state, (dataset) => ({ ...dataset, settings: action.settings }))
    case 'save-shift':
      return withActive(state, (dataset) => ({ ...dataset, shifts: upsert(dataset.shifts, action.shift) }))
    case 'delete-shift':
      return withActive(state, (dataset) => ({
        ...dataset,
        shifts: dataset.shifts.filter((shift) => shift.id !== action.id),
      }))
    case 'save-payment':
      return withActive(state, (dataset) => ({ ...dataset, payments: upsert(dataset.payments, action.payment) }))
    case 'delete-payment':
      return withActive(state, (dataset) => ({
        ...dataset,
        payments: dataset.payments.filter((payment) => payment.id !== action.id),
      }))
    case 'replace-dataset':
      return withActive(state, () => action.dataset)
    case 'import-shifts':
      return withActive(state, (dataset) => ({
        ...dataset,
        shifts: [...dataset.shifts, ...action.shifts],
      }))
    case 'reset-demo':
      return { ...state, demo: createDemoDataset() }
    case 'clear-real':
      return { ...state, real: { ...state.real, shifts: [], payments: [] } }
    default:
      return state
  }
}

function withActive(state: PersistedState, update: (dataset: Dataset) => Dataset): PersistedState {
  if (state.mode === 'demo') return { ...state, demo: update(state.demo) }
  return { ...state, real: update(state.real) }
}

function upsert<T extends { id: string }>(items: T[], next: T): T[] {
  const index = items.findIndex((item) => item.id === next.id)
  if (index === -1) return [...items, next]
  const copy = items.slice()
  copy[index] = next
  return copy
}
