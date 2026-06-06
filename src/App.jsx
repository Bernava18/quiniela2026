import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage       from './pages/LoginPage'
import RegisterPage    from './pages/RegisterPage'
import DashboardPage   from './pages/DashboardPage'
import QuinielaPage    from './pages/QuinielaPage'
import LeaderboardPage from './pages/LeaderboardPage'
import AdminPage       from './pages/AdminPage'
import Layout          from './components/Layout'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading">Cargando...</div>
  return user ? children : <Navigate to="/login" replace />
}

function AdminRoute({ children }) {
  const { profile, loading } = useAuth()
  if (loading) return <div className="loading">Cargando...</div>
  return profile?.is_admin ? children : <Navigate to="/" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index              element={<DashboardPage />} />
            <Route path="quiniela/:id" element={<QuinielaPage />} />
            <Route path="tabla"       element={<LeaderboardPage />} />
            <Route path="admin"       element={<AdminRoute><AdminPage /></AdminRoute>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
