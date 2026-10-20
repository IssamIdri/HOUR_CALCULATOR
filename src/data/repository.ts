import type { PersistedState } from '../domain/types.ts'
import { loadState, saveState } from './storage.ts'
import type { KeyValueStore } from './storage.ts'

/**
 * Contrat de persistance.
 * L'implémentation actuelle écrit dans le navigateur (un seul appareil).
 * Une future classe Supabase pourra respecter la même interface pour ajouter
 * l'authentification et la synchronisation, sans réécrire les écrans.
 * localStorage ne synchronise pas plusieurs appareils.
 */
export interface HoursRepository {
  load(): PersistedState
  save(state: PersistedState): void
}

export function createLocalRepository(store: KeyValueStore): HoursRepository {
  return {
    load: () => loadState(store),
    save: (state) => saveState(store, state),
  }
}
