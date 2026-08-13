import { Navigate, Route, Routes, useLocation } from "react-router-dom"

import { ProtectedRoute } from "@/features/auth/ProtectedRoute"
import { AppLayout } from "@/layouts/AppLayout"
import { DashboardPage } from "@/pages/DashboardPage"
import { LoginPage } from "@/pages/LoginPage"
import { NotFoundPage } from "@/pages/NotFoundPage"
import { RegisterPage } from "@/pages/RegisterPage"

function RootRedirect() {
  const location = useLocation()

  return <Navigate to={`/dashboard${location.search}`} replace />
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
