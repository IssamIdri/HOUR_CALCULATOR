import { createContext, useContext, useEffect, useMemo, useReducer, useState } from 'react'
import type { ReactNode } from 'react'
import { createLocalRepository } from '../data/repository.ts'
import type { HoursRepository } from '../data/repository.ts'
import { createMemoryStore } from '../data/storage.ts'
import type { KeyValueStore } from '../data/storage.ts'
import { activeDataset, summarize } from '../domain/ledger.ts'
import type { Summary } from '../domain/ledger.ts'
import type { AppMode, Dataset, Payment, PersistedState, Settings, Shift } from '../domain/types.ts'
import { reducer } from './reducer.ts'

export interface AppApi {
  mode: AppMode
  dataset: Dataset
  summary: Summary
  warning: string | null
  setMode: (mode: AppMode) => void
  updateSettings: (settings: Settings) => void
  saveShift: (shift: Shift) => void
  deleteShift: (id: string) => void
  savePayment: (payment: Payment) => void
  deletePayment: (id: string) => void
  importDataset: (dataset: Dataset) => void
  importShifts: (shifts: Shift[]) => void
  resetDemo: () => void
  clearReal: () => void
}

const AppContext = createContext<AppApi | null>(null)

function resolveStore(): { store: KeyValueStore; warning: string | null } {
  try {
    localStorage.setItem('__heures__', '1')
    localStorage.removeItem('__heures__')
    return { store: localStorage, warning: null }
  } catch {
    return {
      store: createMemoryStore(),
      warning: "Le navigateur bloque l'enregistrement local. Vos saisies resteront uniquement dans cet onglet.",
    }
  }
}

function createBoot(): { repo: HoursRepository; warning: string | null; initial: PersistedState } {
  const resolved = resolveStore()
  const repo = createLocalRepository(resolved.store)
  return { repo, warning: resolved.warning, initial: repo.load() }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [boot] = useState(createBoot)
  const [state, dispatch] = useReducer(reducer, boot.initial)
  const [warning, setWarning] = useState(boot.warning)

  useEffect(() => {
    try {
      boot.repo.save(state)
    } catch {
      // oxlint-disable-next-line react/set-state-in-effect -- prévient l'utilisateur si le navigateur refuse l'écriture
      setWarning("Impossible d'enregistrer sur cet appareil. Exportez une sauvegarde JSON.")
    }
  }, [boot, state])

  const api = useMemo<AppApi>(() => {
    const dataset = activeDataset(state)
    return {
      mode: state.mode,
      dataset,
      summary: summarize(dataset),
      warning,
      setMode: (mode) => dispatch({ type: 'set-mode', mode }),
      updateSettings: (settings) => dispatch({ type: 'update-settings', settings }),
      saveShift: (shift) => dispatch({ type: 'save-shift', shift }),
      deleteShift: (id) => dispatch({ type: 'delete-shift', id }),
      savePayment: (payment) => dispatch({ type: 'save-payment', payment }),
      deletePayment: (id) => dispatch({ type: 'delete-payment', id }),
      importDataset: (dataset) => dispatch({ type: 'replace-dataset', dataset }),
      importShifts: (shifts) => dispatch({ type: 'import-shifts', shifts }),
      resetDemo: () => dispatch({ type: 'reset-demo' }),
      clearReal: () => dispatch({ type: 'clear-real' }),
    }
  }, [state, warning])

  return <AppContext.Provider value={api}>{children}</AppContext.Provider>
}

export function useApp(): AppApi {
  const value = useContext(AppContext)
  if (!value) throw new Error('useApp doit être utilisé dans AppProvider.')
  return value
}
