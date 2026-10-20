import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { CalendarDays, Clock3, LayoutDashboard, Plus, Settings, Wallet } from 'lucide-react'
import { useApp } from '../state/AppState.tsx'
import { availableCents } from '../domain/ledger.ts'
import { cn } from '../lib/cn.ts'
import { Button } from './ui.tsx'
import { PaymentDialog } from './PaymentDialog.tsx'
import { ShiftDialog } from './ShiftDialog.tsx'

interface DialogApi {
  openShift: (options?: { id?: string; date?: string }) => void
  openPayment: (options?: { id?: string; settle?: boolean }) => void
}

const DialogContext = createContext<DialogApi | null>(null)

export function useDialogs(): DialogApi {
  const value = useContext(DialogContext)
  if (!value) throw new Error('useDialogs doit être utilisé dans la navigation.')
  return value
}

const NAV = [
  { to: '/', label: 'Tableau de bord', short: 'Accueil', icon: LayoutDashboard, end: true },
  { to: '/services', label: 'Services', short: 'Services', icon: Clock3, end: false },
  { to: '/paiements', label: 'Paiements', short: 'Paiements', icon: Wallet, end: false },
  { to: '/historique', label: 'Historique', short: 'Historique', icon: CalendarDays, end: false },
  { to: '/parametres', label: 'Paramètres', short: 'Réglages', icon: Settings, end: false },
]

export function AddShiftButton({ className }: { className?: string }) {
  const dialogs = useDialogs()
  return (
    <Button className={className} onClick={() => dialogs.openShift()}>
      <Plus size={18} />
      Ajouter un service
    </Button>
  )
}

export function Layout() {
  const { mode, dataset, warning, setMode, saveShift, savePayment } = useApp()
  const [shiftReq, setShiftReq] = useState<{ id?: string; date?: string } | null>(null)
  const [paymentReq, setPaymentReq] = useState<{ id?: string; settle?: boolean } | null>(null)
  const openShift = useCallback((options?: { id?: string; date?: string }) => setShiftReq(options ?? {}), [])
  const openPayment = useCallback((options?: { id?: string; settle?: boolean }) => setPaymentReq(options ?? {}), [])
  const closeShift = useCallback(() => setShiftReq(null), [])
  const closePayment = useCallback(() => setPaymentReq(null), [])
  const dialogs = useMemo<DialogApi>(() => ({ openShift, openPayment }), [openShift, openPayment])
  const restaurant = dataset.settings.restaurantName.trim()
  const editingShift = shiftReq?.id ? dataset.shifts.find((shift) => shift.id === shiftReq.id) : undefined
  const editingPayment = paymentReq?.id ? dataset.payments.find((payment) => payment.id === paymentReq.id) : undefined
  const showShift = Boolean(shiftReq) && (!shiftReq?.id || Boolean(editingShift))
  const showPayment = Boolean(paymentReq) && (!paymentReq?.id || Boolean(editingPayment))

  return (
    <DialogContext.Provider value={dialogs}>
      <div className="min-h-screen bg-[#f4f6f8]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-slate-200 bg-white print:hidden lg:flex">
          <div className="flex items-center gap-3 px-4 py-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-700 text-white">
              <Clock3 size={20} />
            </div>
            <div className="min-w-0">
              <p className="font-semibold leading-tight">Heures</p>
              <p className="truncate text-xs text-slate-500">{restaurant || 'Suivi restaurant'}</p>
            </div>
          </div>
          <nav className="flex flex-1 flex-col gap-1 px-3">
            {NAV.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition',
                      isActive ? 'bg-teal-50 text-teal-900' : 'text-slate-600 hover:bg-slate-50',
                    )
                  }
                >
                  <Icon size={18} />
                  {item.label}
                </NavLink>
              )
            })}
          </nav>
          <div className="px-4 py-4 text-xs text-slate-400">Données enregistrées sur cet appareil</div>
        </aside>

        <div className="lg:pl-60">
          {mode === 'demo' ? (
            <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 print:hidden">
              <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
                <p>Mode démonstration. Ces exemples sont fictifs et séparés de vos données réelles.</p>
                <button type="button" className="font-semibold underline" onClick={() => setMode('real')}>
                  Utiliser mes données
                </button>
              </div>
            </div>
          ) : null}
          {warning ? (
            <div className="border-b border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 print:hidden">{warning}</div>
          ) : null}
          <main className="pb-36 print:pb-0 lg:pb-10">
            <Outlet />
          </main>
        </div>

        <nav
          className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur print:hidden lg:hidden"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <ul className="grid grid-cols-5">
            {NAV.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      cn(
                        'flex flex-col items-center gap-1 px-1 py-2 text-[11px] font-medium',
                        isActive ? 'text-teal-800' : 'text-slate-500',
                      )
                    }
                  >
                    <Icon size={18} />
                    {item.short}
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </nav>

        <button
          type="button"
          onClick={() => openShift()}
          className="fixed right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-teal-700 text-white shadow-lg shadow-teal-900/20 print:hidden lg:hidden"
          style={{ bottom: 'calc(4.75rem + env(safe-area-inset-bottom))' }}
          aria-label="Ajouter un service"
        >
          <Plus size={24} />
        </button>

        {showShift ? (
          <ShiftDialog
            key={`${shiftReq?.id ?? 'new'}-${shiftReq?.date ?? ''}`}
            shift={editingShift}
            initialDate={shiftReq?.date}
            settings={dataset.settings}
            shifts={dataset.shifts}
            onClose={closeShift}
            onSave={(next, another) => {
              saveShift(next)
              if (!another) closeShift()
            }}
          />
        ) : null}
        {showPayment ? (
          <PaymentDialog
            key={`${paymentReq?.id ?? 'new'}-${paymentReq?.settle ? 'settle' : 'add'}`}
            payment={editingPayment}
            settle={Boolean(paymentReq?.settle)}
            available={availableCents(dataset.shifts, dataset.payments, editingPayment?.id)}
            onClose={closePayment}
            onSave={(next) => {
              savePayment(next)
              closePayment()
            }}
          />
        ) : null}
      </div>
    </DialogContext.Provider>
  )
}

