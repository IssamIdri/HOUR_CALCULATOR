import { isTime } from './time.ts'
import type { Settings } from './types.ts'

export function defaultSettings(): Settings {
  return {
    hourlyRateCents: 1200,
    currency: 'EUR',
    restaurantName: '',
    defaultBreakMinutes: 0,
    midiStart: '12:00',
    midiEnd: '15:00',
    soirStart: '19:00',
    soirEnd: '23:30',
    weekStartsOn: 1,
  }
}

export function emptyDataset(settings: Settings = defaultSettings()) {
  return { settings, shifts: [], payments: [] }
}

export function validateSettings(input: Settings): { ok: true; settings: Settings } | { ok: false; error: string } {
  if (!Number.isInteger(input.hourlyRateCents) || input.hourlyRateCents <= 0 || input.hourlyRateCents > 50_000) {
    return { ok: false, error: 'Indiquez un taux horaire valide, par exemple 12,50.' }
  }
  if (!Number.isInteger(input.defaultBreakMinutes) || input.defaultBreakMinutes < 0 || input.defaultBreakMinutes > 720) {
    return { ok: false, error: 'La pause par défaut doit être comprise entre 0 et 720 minutes.' }
  }
  if (!isTime(input.midiStart) || !isTime(input.midiEnd) || input.midiStart === input.midiEnd) {
    return { ok: false, error: 'Les horaires habituels du midi sont invalides.' }
  }
  if (!isTime(input.soirStart) || !isTime(input.soirEnd) || input.soirStart === input.soirEnd) {
    return { ok: false, error: 'Les horaires habituels du soir sont invalides.' }
  }
  if (input.weekStartsOn !== 0 && input.weekStartsOn !== 1) {
    return { ok: false, error: 'Le premier jour de la semaine doit être lundi ou dimanche.' }
  }
  return {
    ok: true,
    settings: {
      ...input,
      currency: 'EUR',
      restaurantName: input.restaurantName.trim().slice(0, 80),
    },
  }
}
