import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import PhonePrompt from './PhonePrompt'

export default function Layout() {
  const { profile, signOut, user } = useAuth()
  const navigate = useNavigate()
  const [needsPhone, setNeedsPhone] = useState(false)
  const [showPwdModal, setShowPwdModal] = useState(false)
  const [pwd, setPwd] = useState('')
  const [pwd2, setPwd2] = useState('')
  const [pwdMsg, setPwdMsg] = useState('')
  const [pwdLoading, setPwdLoading] = useState(false)

  useEffect(() => {
    if (profile) {
      setNeedsPhone(!profile.phone || profile.phone.trim() === '')
    }
  }, [profile])

  async function handleChangePwd() {
    if (pwd.length < 6) { setPwdMsg('Mínimo 6 caracteres'); return }
    if (pwd !== pwd2)   { setPwdMsg('Las contraseñas no coinciden'); return }
    setPwdLoading(true)
    const { error } = await supabase.auth.updateUser({ password: pwd })
    if (error) { setPwdMsg('Error: ' + error.message) }
    else {
      setPwdMsg('✅ Contraseña actualizada')
      setTimeout(() => { setShowPwdModal(false); setPwd(''); setPwd2(''); setPwdMsg('') }, 1500)
    }
    setPwdLoading(false)
  }

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

      {/* Change Password Modal */}
      {showPwdModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div style={{ background:'#fff', borderRadius:16, padding:'28px 24px', width:'100%', maxWidth:360, boxShadow:'0 20px 60px rgba(0,0,0,.3)' }}>
            <div style={{ fontSize:18, fontWeight:800, marginBottom:6 }}>🔑 Cambiar contraseña</div>
            <div style={{ fontSize:12, color:'#6e6e73', marginBottom:20 }}>Escribe tu nueva contraseña</div>
            <input
              type="password" placeholder="Nueva contraseña" value={pwd}
              onChange={e=>{ setPwd(e.target.value); setPwdMsg('') }}
              style={{ width:'100%', padding:'10px 12px', border:'1px solid #d1d1d6', borderRadius:9, fontSize:14, fontFamily:'inherit', outline:'none', marginBottom:10 }}
            />
            <input
              type="password" placeholder="Confirmar contraseña" value={pwd2}
              onChange={e=>{ setPwd2(e.target.value); setPwdMsg('') }}
              style={{ width:'100%', padding:'10px 12px', border:'1px solid #d1d1d6', borderRadius:9, fontSize:14, fontFamily:'inherit', outline:'none', marginBottom:14 }}
            />
            {pwdMsg && (
              <div style={{ fontSize:12, color: pwdMsg.startsWith('✅')?'#30d158':'#ff453a', marginBottom:12, fontWeight:600 }}>{pwdMsg}</div>
            )}
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={()=>{ setShowPwdModal(false); setPwd(''); setPwd2(''); setPwdMsg('') }}
                style={{ flex:1, padding:'10px', border:'1px solid #d1d1d6', borderRadius:9, background:'#f5f5f7', fontFamily:'inherit', fontSize:13, fontWeight:600, cursor:'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleChangePwd} disabled={pwdLoading||!pwd||!pwd2}
                style={{ flex:1, padding:'10px', border:'none', borderRadius:9, background:'#0071e3', color:'#fff', fontFamily:'inherit', fontSize:13, fontWeight:700, cursor:'pointer', opacity:pwdLoading||!pwd||!pwd2?.5:1 }}>
                {pwdLoading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

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
          <button onClick={()=>setShowPwdModal(true)}
            style={{ padding:'5px 11px', border:'0.5px solid rgba(0,0,0,.12)', borderRadius:8, background:'none', color:'#6e6e73', cursor:'pointer', fontSize:13, fontWeight:500, fontFamily:'inherit' }}>
            🔑
          </button>
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
