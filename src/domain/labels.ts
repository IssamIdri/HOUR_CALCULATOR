import type { PaymentMethod, ShiftType } from './types.ts'

export const SHIFT_LABEL: Record<ShiftType, string> = {
  midi: 'Midi',
  soir: 'Soir',
  autre: 'Autre',
}

export const METHOD_LABEL: Record<PaymentMethod, string> = {
  virement: 'Virement',
  especes: 'Espèces',
  cheque: 'Chèque',
  autre: 'Autre',
}
