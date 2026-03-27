import { Navigate, Route, Routes } from 'react-router-dom'
import { LandingPage } from './pages/LandingPage'
import { CrmPortal } from './pages/CrmPortal'
import { AdminPortal } from './pages/AdminPortal'
import { UserPortal } from './pages/UserPortal'
import { CheckoutSuccessPage } from './pages/CheckoutSuccessPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/crm/*" element={<CrmPortal />} />
      <Route path="/admin/*" element={<AdminPortal />} />
      <Route path="/events" element={<UserPortal />} />
      <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  )
}
