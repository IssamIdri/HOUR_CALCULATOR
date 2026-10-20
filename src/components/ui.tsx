import { useEffect, useId } from 'react'
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { X } from 'lucide-react'
import { cn } from '../lib/cn.ts'
import type { PaymentMethod, ShiftType } from '../domain/types.ts'
import { METHOD_LABEL, SHIFT_LABEL } from '../domain/labels.ts'

const BUTTON_STYLES = {
  primary: 'bg-teal-700 text-white hover:bg-teal-800',
  secondary: 'bg-white text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50',
  danger: 'bg-rose-600 text-white hover:bg-rose-700',
  ghost: 'text-slate-600 hover:bg-slate-100',
} as const

export function Button({
  variant = 'primary',
  className,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof BUTTON_STYLES }) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:cursor-not-allowed disabled:opacity-50',
        BUTTON_STYLES[variant],
        className,
      )}
      {...props}
    />
  )
}

export function TextField({
  id,
  label,
  hint,
  error,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; hint?: string; error?: string }) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      <input
        id={id}
        className={cn(
          'w-full rounded-2xl border bg-white px-3 py-2.5 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-700/10',
          error ? 'border-rose-400' : 'border-slate-200',
          className,
        )}
        {...props}
      />
      {error ? <span className="mt-1 block text-sm text-rose-600">{error}</span> : null}
      {hint && !error ? <span className="mt-1 block text-sm text-slate-500">{hint}</span> : null}
    </label>
  )
}

export function TextArea({
  id,
  label,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { id: string; label: string }) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      <textarea
        id={id}
        className={cn(
          'min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-700/10',
          className,
        )}
        {...props}
      />
    </label>
  )
}

export function SelectField({
  id,
  label,
  children,
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { id: string; label: string; children: ReactNode }) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      <select
        id={id}
        className={cn(
          'w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-base text-slate-900 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-700/10',
          className,
        )}
        {...props}
      >
        {children}
      </select>
    </label>
  )
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  columns = 'grid-cols-3',
}: {
  label: string
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (value: T) => void
  columns?: string
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium text-slate-700">{label}</legend>
      <div className={cn('grid gap-1 rounded-2xl bg-slate-100 p-1', columns)}>
        {options.map((option) => {
          const selected = option.value === value
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={cn(
                'rounded-xl px-2 py-2 text-sm font-medium transition',
                selected ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800',
              )}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

export function Modal({
  title,
  description,
  onClose,
  children,
  dismissible = true,
}: {
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
  dismissible?: boolean
}) {
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    if (!dismissible) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [dismissible, onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Fermer"
        className="absolute inset-0 bg-slate-900/40"
        onClick={dismissible ? onClose : undefined}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-lg sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-4 px-5 pt-5">
          <div>
            <h2 id={titleId} className="text-lg font-semibold tracking-tight text-slate-900">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="mt-1 text-sm text-slate-500">
                {description}
              </p>
            ) : null}
          </div>
          {dismissible ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
              aria-label="Fermer"
            >
              <X size={18} />
            </button>
          ) : null}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  danger = false,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4">
      <button type="button" aria-label="Annuler" className="absolute inset-0 bg-slate-900/50" onClick={onCancel} />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-3xl"
      >
        <h2 id={titleId} className="text-lg font-semibold text-slate-900">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{message}</p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onCancel}>
            Annuler
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

const SHIFT_STYLES: Record<ShiftType, string> = {
  midi: 'bg-amber-50 text-amber-800',
  soir: 'bg-indigo-50 text-indigo-800',
  autre: 'bg-slate-100 text-slate-700',
}

export function ShiftBadge({ type }: { type: ShiftType }) {
  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold', SHIFT_STYLES[type])}>
      {SHIFT_LABEL[type]}
    </span>
  )
}

export function MethodBadge({ method }: { method: PaymentMethod }) {
  return (
    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
      {METHOD_LABEL[method]}
    </span>
  )
}

export function Page({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-8">{children}</div>
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? <p className="text-sm text-slate-500">{eyebrow}</p> : null}
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">{description}</p> : null}
      </div>
      {action ? <div className="hidden sm:block">{action}</div> : null}
    </div>
  )
}
