export type ShiftType = 'midi' | 'soir' | 'autre'
export type PaymentMethod = 'virement' | 'especes' | 'cheque' | 'autre'
export type AppMode = 'real' | 'demo'
export type WeekStartsOn = 0 | 1

export interface Shift {
  id: string
  date: string
  type: ShiftType
  start: string
  end: string
  breakMinutes: number
  hourlyRateCents: number
  notes: string
  createdAt: string
  updatedAt: string
}

export interface Payment {
  id: string
  date: string
  amountCents: number
  method: PaymentMethod
  period: string
  notes: string
  createdAt: string
  updatedAt: string
}

export interface Settings {
  hourlyRateCents: number
  currency: 'EUR'
  restaurantName: string
  defaultBreakMinutes: number
  midiStart: string
  midiEnd: string
  soirStart: string
  soirEnd: string
  weekStartsOn: WeekStartsOn
}

export interface Dataset {
  settings: Settings
  shifts: Shift[]
  payments: Payment[]
}

export interface PersistedState {
  version: 1
  mode: AppMode
  real: Dataset
  demo: Dataset
}

export interface BackupFile {
  version: 1
  kind: 'restaurant-heures-backup'
  exportedAt: string
  dataset: Dataset
}
