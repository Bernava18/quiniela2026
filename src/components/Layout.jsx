import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import PhonePrompt from './PhonePrompt'

export default function Layout() {
  const { profile, signOut, user } = useAuth()
  const navigate = useNavigate()
  const [needsPhone, setNeedsPhone] = useState(false)

  useEffect(() => {
    if (profile) {
      setNeedsPhone(!profile.phone || profile.phone.trim() === '')
    }
  }, [profile])

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const navStyle = ({ isActive }) => ({
    padding:'5px 11px', borderRadius:8, border:'none',
    fontFamily:'inherit', fontSize:13, cursor:'pointer',
    background: isActive ? '#f2f2f4' : 'none',
    color: isActive ? '#1d1d1f' : '#6e6e73',
    fontWeight: isActive ? 600 : 500,
    textDecoration:'none', display:'inline-block',
  })

  return (
    <div style={{ minHeight:'100vh', background:'#f5f5f7', fontFamily:'-apple-system,BlinkMacSystemFont,"DM Sans",sans-serif' }}>

      {/* Phone prompt for existing users */}
      {needsPhone && <PhonePrompt onComplete={() => setNeedsPhone(false)} />}

      {/* Header */}
      <header style={{ position:'sticky', top:0, zIndex:100, background:'rgba(255,255,255,.86)', backdropFilter:'saturate(180%) blur(20px)', borderBottom:'0.5px solid rgba(0,0,0,.08)', height:52, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 22px' }}>
        <div style={{ fontSize:15, fontWeight:700, letterSpacing:'-.3px' }}>
          🏆 Quiniela Mundial 2026
        </div>
        <nav style={{ display:'flex', gap:2, alignItems:'center', flexWrap:'wrap' }}>
          <NavLink to="/"      style={navStyle}>Mis Quinielas</NavLink>
          <NavLink to="/tabla" style={navStyle}>Tabla</NavLink>
          <NavLink to="/guia"  style={navStyle}>📖 Guía</NavLink>
          {profile?.is_admin && <NavLink to="/admin" style={navStyle}>Admin</NavLink>}
          <span style={{ fontSize:13, color:'#6e6e73', padding:'5px 8px' }}>{profile?.username}</span>
          <button onClick={handleSignOut}
            style={{ padding:'5px 11px', border:'none', background:'none', color:'#ff453a', cursor:'pointer', fontSize:13, fontWeight:500, fontFamily:'inherit' }}>
            Salir
          </button>
        </nav>
      </header>

      <main><Outlet /></main>
    </div>
  )
}
