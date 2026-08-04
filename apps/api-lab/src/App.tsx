import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth";
import { SocketProvider } from "./lib/ws";
import { AppShell } from "./components/AppShell";
import { Spinner } from "./components/ui";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ProfilePage } from "./pages/ProfilePage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { AgendaPage } from "./pages/AgendaPage";
import { FriendsPage } from "./pages/FriendsPage";
import { ChatPage } from "./pages/ChatPage";
import { EvaluationsPage, LogtimePage, NotificationsPage } from "./pages/MorePages";

function ProtectedLayout() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <SocketProvider enabled={Boolean(user.is_intra_linked)}>
      <AppShell />
    </SocketProvider>
  );
}

function LoginRoute() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (user) return <Navigate to="/" replace />;
  return <LoginPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginRoute />} />
        <Route element={<ProtectedLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="profile/:login" element={<ProfilePage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="agenda" element={<AgendaPage />} />
          <Route path="evaluations" element={<EvaluationsPage />} />
          <Route path="logtime" element={<LogtimePage />} />
          <Route path="friends" element={<FriendsPage />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
