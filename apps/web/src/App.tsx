import { Navigate, Route, Routes, useLocation } from "react-router-dom"

import { ProtectedRoute } from "@/features/auth/ProtectedRoute"
import { AppLayout } from "@/layouts/AppLayout"
import { AgendaPage } from "@/pages/AgendaPage"
import { ChatPage } from "@/pages/ChatPage"
import { DashboardPage } from "@/pages/DashboardPage"
import { EvaluationsPage } from "@/pages/EvaluationsPage"
import { FriendsPage } from "@/pages/FriendsPage"
import { LoginPage } from "@/pages/LoginPage"
import { LogtimePage } from "@/pages/LogtimePage"
import { NotFoundPage } from "@/pages/NotFoundPage"
import { PrivacyPage } from "@/pages/PrivacyPage"
import { ProfilePage } from "@/pages/ProfilePage"
import { ProjectsPage } from "@/pages/ProjectsPage"
import { RegisterPage } from "@/pages/RegisterPage"
import { TermsPage } from "@/pages/TermsPage"

function RootRedirect() {
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const intra = params.get("intra")
  const reason = params.get("reason")

  const next = new URLSearchParams()
  // Preserve OAuth callback flags from GET /auth/callback → /?intra=...
  if (intra === "linked" || intra === "error") {
    next.set("intra", intra)
  }
  if (reason) {
    next.set("reason", reason)
  }

  const qs = next.toString()
  return <Navigate to={qs ? `/dashboard?${qs}` : "/dashboard"} replace />
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/:login" element={<ProfilePage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/agenda" element={<AgendaPage />} />
          <Route path="/evaluations" element={<EvaluationsPage />} />
          <Route path="/logtime" element={<LogtimePage />} />
          <Route path="/friends" element={<FriendsPage />} />
          <Route path="/conversations" element={<ChatPage />} />
          <Route path="/conversations/:conversationId" element={<ChatPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
