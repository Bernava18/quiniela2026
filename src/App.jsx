import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LoginPage }   from './pages/LoginPage'
import RegisterPage    from './pages/RegisterPage'
import DashboardPage   from './pages/DashboardPage'
import QuinielaPage    from './pages/QuinielaPage'
import LeaderboardPage from './pages/LeaderboardPage'
import AdminPage       from './pages/AdminPage'
import PrintPage       from './pages/PrintPage'
import GuidePage       from './pages/GuidePage'
import DevKnockoutPage from './pages/DevKnockoutPage'
import RealFifaPage    from './pages/RealFifaPage'
import FaseFinalPage   from './pages/FaseFinalPage'
import Layout          from './components/Layout'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',color:'#aeaeb2'}}>Cargando...</div>
  return user ? children : <Navigate to="/login" replace />
}

function AdminRoute({ children }) {
  const { profile, loading } = useAuth()
  if (loading) return null
  return profile?.is_admin ? children : <Navigate to="/" replace />
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return !user ? children : <Navigate to="/" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route path="/guia"     element={<GuidePage />} />
          <Route path="/print/:id" element={<PrivateRoute><PrintPage /></PrivateRoute>} />
          <Route path="/fase-final/:id" element={<PrivateRoute><FaseFinalPage /></PrivateRoute>} />

          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index                element={<DashboardPage />} />
            <Route path="quiniela/:id"  element={<QuinielaPage />} />
            <Route path="tabla"         element={<LeaderboardPage />} />
            <Route path="real-fifa"     element={<RealFifaPage />} />
            <Route path="admin"         element={<AdminRoute><AdminPage /></AdminRoute>} />
            {/* Ruta OCULTA de pruebas — no enlazada en ningún menú, solo admin.
                Se accede escribiendo la URL directamente: /dev-ko */}
            <Route path="dev-ko"        element={<AdminRoute><DevKnockoutPage /></AdminRoute>} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
