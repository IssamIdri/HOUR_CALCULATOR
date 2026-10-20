import { createDemoDataset } from './demo.ts'
import { readDataset } from '../domain/sanitize.ts'
import { isRecord } from '../domain/sanitize.ts'
import { emptyDataset } from '../domain/settings.ts'
import type { PersistedState } from '../domain/types.ts'

export const STORAGE_KEY = 'restaurant-heures-v1'
export const STORAGE_PREVIOUS_KEY = 'restaurant-heures-v1-previous'
export const STORAGE_CORRUPT_KEY = 'restaurant-heures-v1-corrupt'

export interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export function createMemoryStore(): KeyValueStore {
  const map = new Map<string, string>()
  return {
    getItem(key) {
      return map.get(key) ?? null
    },
    setItem(key, value) {
      map.set(key, value)
    },
  }
}

export function createInitialState(): PersistedState {
  return {
    version: 1,
    mode: 'real',
    real: emptyDataset(),
    demo: createDemoDataset(),
  }
}

export function loadState(store: KeyValueStore): PersistedState {
  let raw: string | null = null
  try {
    raw = store.getItem(STORAGE_KEY)
  } catch {
    return createInitialState()
  }
  if (!raw) return createInitialState()
  try {
    const parsed = readPersistedState(JSON.parse(raw) as unknown)
    if (!parsed) {
      keepCorruptCopy(store, raw)
      return createInitialState()
    }
    return parsed
  } catch {
    keepCorruptCopy(store, raw)
    return createInitialState()
  }
}

export function saveState(store: KeyValueStore, state: PersistedState): void {
  const current = store.getItem(STORAGE_KEY)
  if (current) store.setItem(STORAGE_PREVIOUS_KEY, current)
  store.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function readPersistedState(value: unknown): PersistedState | null {
  if (!isRecord(value) || value.version !== 1) return null
  const mode = value.mode === 'demo' ? 'demo' : 'real'
  const real = readDataset(value.real, 'lenient')
  const demo = readDataset(value.demo, 'lenient')
  if (!real.ok || !demo.ok) return null
  return {
    version: 1,
    mode,
    real: real.dataset,
    demo: isRecord(value.demo) ? demo.dataset : createDemoDataset(),
  }
}

function keepCorruptCopy(store: KeyValueStore, raw: string) {
  try {
    store.setItem(STORAGE_CORRUPT_KEY, raw)
  } catch {
    // La copie de secours est facultative si le stockage est bloqué.
  }
}
