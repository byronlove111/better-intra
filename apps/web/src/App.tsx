import { Navigate, Route, Routes, useLocation } from "react-router-dom"

import { ProtectedRoute } from "@/features/auth/ProtectedRoute"
import { AppLayout } from "@/layouts/AppLayout"
import { DashboardPage } from "@/pages/DashboardPage"
import { EvaluationsPage } from "@/pages/EvaluationsPage"
import { LoginPage } from "@/pages/LoginPage"
import { LogtimePage } from "@/pages/LogtimePage"
import { NotFoundPage } from "@/pages/NotFoundPage"
import { ProfilePage } from "@/pages/ProfilePage"
import { ProjectsPage } from "@/pages/ProjectsPage"
import { RegisterPage } from "@/pages/RegisterPage"

function RootRedirect() {
  const location = useLocation()
  const preview = new URLSearchParams(location.search).get("preview")
  const hasPreview = preview === "dashboard" || preview === "profile"
  const previewUrl = import.meta.env.DEV && hasPreview
    ? "?preview=dashboard"
    : ""

  return <Navigate to={`/dashboard${previewUrl}`} replace />
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
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/:login" element={<ProfilePage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/evaluations" element={<EvaluationsPage />} />
          <Route path="/logtime" element={<LogtimePage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
