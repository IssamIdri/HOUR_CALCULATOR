import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout.tsx'
import { DashboardPage } from './pages/DashboardPage.tsx'
import { HistoryPage } from './pages/HistoryPage.tsx'
import { PaymentsPage } from './pages/PaymentsPage.tsx'
import { SettingsPage } from './pages/SettingsPage.tsx'
import { ShiftsPage } from './pages/ShiftsPage.tsx'
import { StatementPage } from './pages/StatementPage.tsx'
import { AppProvider } from './state/AppState.tsx'

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<DashboardPage />} />
            <Route path="services" element={<ShiftsPage />} />
            <Route path="paiements" element={<PaymentsPage />} />
            <Route path="historique" element={<HistoryPage />} />
            <Route path="parametres" element={<SettingsPage />} />
            <Route path="releve" element={<StatementPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  )
}
