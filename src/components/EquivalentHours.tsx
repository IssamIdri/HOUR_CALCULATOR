import { formatDuration } from '../domain/time.ts'
import { formatMoney } from '../domain/money.ts'
import { cn } from '../lib/cn.ts'

export function EquivalentHours({
  balance,
  minutes,
  hourlyRateCents,
  varied,
  tone = 'light',
  compact = false,
}: {
  balance: number
  minutes: number | null
  hourlyRateCents: number
  varied: boolean
  tone?: 'light' | 'dark'
  compact?: boolean
}) {
  const muted = tone === 'dark' ? 'text-slate-300' : 'text-slate-500'
  if (balance < 0) {
    return <p className={cn('text-sm', tone === 'dark' ? 'text-indigo-100' : 'text-indigo-800')}>Avance de {formatMoney(Math.abs(balance))}. Elle sera déduite des prochaines heures.</p>
  }
  if (balance === 0) {
    return <p className={cn('text-sm', muted)}>Heures équivalentes : 0 h.</p>
  }
  if (minutes === null) return null
  return (
    <div className={cn('text-sm', muted)}>
      <p>
        Estimation : {formatDuration(minutes)} au taux habituel de {formatMoney(hourlyRateCents)}/h.
      </p>
      {!compact && varied ? (
        <p className="mt-1">
          Ce n’est pas un décompte d’heures réellement impayées, car certains services ont un autre taux. Le solde en euros reste exact.
        </p>
      ) : null}
    </div>
  )
}
