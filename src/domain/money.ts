/** Montant en centimes entiers : arrondi de (minutes × taux) / 60. */
export function amountCents(workedMinutes: number, hourlyRateCents: number): number {
  if (workedMinutes <= 0 || hourlyRateCents <= 0) return 0
  return Math.round((workedMinutes * hourlyRateCents) / 60)
}

export function formatMoney(cents: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100)
}

export function centsToInput(cents: number): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100)
}

export function parseEurosToCents(input: string): number | null {
  const normalized = input
    .trim()
    .toLowerCase()
    .replace(/€|eur/g, '')
    .replace(/\s/g, '')
    .replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null
  const [euros, frac = ''] = normalized.split('.')
  const cents = Number(euros) * 100 + Number(frac.padEnd(2, '0'))
  if (!Number.isSafeInteger(cents)) return null
  return cents
}

export function csvNumber(cents: number): string {
  const sign = cents < 0 ? '-' : ''
  const absolute = Math.abs(cents)
  const euros = Math.floor(absolute / 100)
  const frac = String(absolute % 100).padStart(2, '0')
  return `${sign}${euros},${frac}`
}
