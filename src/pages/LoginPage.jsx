import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const GROUPS = {
  A:['México','Sudáfrica','Rep. de Corea','Rep. Checa'],
  B:['Canadá','Bosnia','Catar','Suiza'],
  C:['Brasil','Marruecos','Haití','Escocia'],
  D:['EE. UU.','Paraguay','Australia','Turquía'],
  E:['Alemania','Curazao','Costa de Marfil','Ecuador'],
  F:['Países Bajos','Japón','Suecia','Túnez'],
  G:['Bélgica','Egipto','RI de Irán','Nueva Zelanda'],
  H:['España','Islas de Cabo Verde','Arabia Saudí','Uruguay'],
  I:['Francia','Senegal','Irak','Noruega'],
  J:['Argentina','Argelia','Austria','Jordania'],
  K:['Portugal','RD Congo','Uzbekistán','Colombia'],
  L:['Inglaterra','Croacia','Ghana','Panamá'],
}
const LOCK_DATE = new Date('2026-06-11T18:00:00Z')

function calcTimeLeft() {
  const diff = LOCK_DATE - new Date()
  if (diff <= 0) return null
  return {
    days:    Math.floor(diff / 86400000),
    hours:   Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  }
}

// ── AUTH FORM ──────────────────────────────────────────────────
function AuthForm() {
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab]         = useState('login')  // login | register | forgot
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  // Login
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')

  // Register
  const [rCode, setRCode]   = useState('')
  const [rUser, setRUser]   = useState('')
  const [rName, setRName]   = useState('')
  const [rEmail, setREmail] = useState('')
  const [rPass, setRPass]   = useState('')
  const [rPass2, setRPass2] = useState('')

  // Forgot
  const [fEmail, setFEmail] = useState('')

  const inp = {
    width:'100%', padding:'11px 14px',
    border:'1px solid rgba(255,255,255,.12)', borderRadius:10,
    fontSize:14, fontFamily:'inherit', outline:'none',
    background:'rgba(255,255,255,.07)', color:'#fff',
    boxSizing:'border-box',
  }
  const btn = {
    width:'100%', padding:'12px',
    background:'linear-gradient(135deg,#ffd60a,#ff9f0a)',
    border:'none', borderRadius:10, fontSize:15, fontWeight:800,
    cursor:'pointer', fontFamily:'inherit', color:'#000', marginTop:4,
  }
  const link = {
    background:'none', border:'none', color:'rgba(255,255,255,.5)',
    fontSize:12, cursor:'pointer', fontFamily:'inherit',
    textDecoration:'underline', padding:0,
  }

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await signIn(email, password)
    if (error) setError('Email o contraseña incorrectos')
    else navigate('/')
    setLoading(false)
  }

  async function handleRegister(e) {
    e.preventDefault()
    setError('')
    if (rPass !== rPass2) { setError('Las contraseñas no coinciden'); return }
    if (rPass.length < 6)  { setError('Contraseña mínimo 6 caracteres'); return }
    if (!rCode.trim())     { setError('Ingresa el código de invitación'); return }

    setLoading(true)
    // Verify invite code against Supabase config
    const { data: cfg } = await supabase
      .from('config').select('value').eq('key','invite_code').single()
    const validCode = cfg?.value || ''

    if (rCode.trim().toUpperCase() !== validCode.toUpperCase()) {
      setError('Código de invitación incorrecto')
      setLoading(false)
      return
    }

    const { error } = await signUp(rEmail, rPass, rUser, rName)
    if (error) setError(error.message)
    else navigate('/')
    setLoading(false)
  }

  async function handleForgot(e) {
    e.preventDefault()
    setLoading(true); setError(''); setSuccess('')
    const { error } = await supabase.auth.resetPasswordForEmail(fEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) setError(error.message)
    else setSuccess('✅ Te enviamos un email con el link para restablecer tu contraseña.')
    setLoading(false)
  }

  return (
    <div style={{ background:'rgba(255,255,255,.05)', backdropFilter:'blur(20px)', border:'0.5px solid rgba(255,255,255,.1)', borderRadius:20, padding:'26px', width:'100%', maxWidth:380 }}>

      {/* Tabs */}
      {tab !== 'forgot' && (
        <div style={{ display:'flex', background:'rgba(255,255,255,.06)', borderRadius:10, padding:3, marginBottom:22 }}>
          {[['login','Entrar'],['register','Registrarse']].map(([k,l]) => (
            <button key={k} onClick={() => { setTab(k); setError(''); setSuccess('') }}
              style={{ flex:1, padding:'8px', border:'none', borderRadius:8, fontFamily:'inherit',
                fontSize:13, fontWeight:700, cursor:'pointer',
                background: tab===k ? 'linear-gradient(135deg,#ffd60a,#ff9f0a)' : 'none',
                color: tab===k ? '#000' : '#6e6e73' }}>
              {l}
            </button>
          ))}
        </div>
      )}

      {/* ── LOGIN ── */}
      {tab === 'login' && (
        <form onSubmit={handleLogin} style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <input style={inp} type="email" placeholder="Email" value={email}
            onChange={e=>setEmail(e.target.value)} required />
          <input style={inp} type="password" placeholder="Contraseña" value={password}
            onChange={e=>setPassword(e.target.value)} required />
          {error && <p style={{ color:'#ff6b6b', fontSize:12, margin:0 }}>{error}</p>}
          <button style={{...btn, opacity:loading?.6:1}} type="submit" disabled={loading}>
            {loading ? 'Entrando...' : '⚽ Entrar'}
          </button>
          <div style={{ textAlign:'center', marginTop:4 }}>
            <button type="button" style={link}
              onClick={() => { setTab('forgot'); setError(''); setSuccess('') }}>
              ¿Olvidaste tu contraseña?
            </button>
          </div>
        </form>
      )}

      {/* ── REGISTER ── */}
      {tab === 'register' && (
        <form onSubmit={handleRegister} style={{ display:'flex', flexDirection:'column', gap:9 }}>
          {/* Invite code — prominente */}
          <div style={{ background:'rgba(255,214,10,.08)', border:'1px solid rgba(255,214,10,.25)', borderRadius:10, padding:'10px 12px' }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#ffd60a', marginBottom:6, textTransform:'uppercase', letterSpacing:'.3px' }}>
              🔑 Código de invitación
            </div>
            <input style={{ ...inp, background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,214,10,.3)',
              textTransform:'uppercase', letterSpacing:'2px', fontWeight:700, fontSize:16, textAlign:'center' }}
              placeholder="XXXXXXXX" value={rCode}
              onChange={e=>setRCode(e.target.value.toUpperCase())} required />
            <div style={{ fontSize:10, color:'rgba(255,255,255,.35)', marginTop:5 }}>
              Solicita el código al organizador de la quiniela
            </div>
          </div>
          <input style={inp} placeholder="Usuario público (visible en la tabla)" value={rUser}
            onChange={e=>setRUser(e.target.value)} required />
          <input style={inp} placeholder="Nombre completo (opcional)" value={rName}
            onChange={e=>setRName(e.target.value)} />
          <input style={inp} type="email" placeholder="Email" value={rEmail}
            onChange={e=>setREmail(e.target.value)} required />
          <input style={inp} type="password" placeholder="Contraseña (mín. 6 caracteres)" value={rPass}
            onChange={e=>setRPass(e.target.value)} required />
          <input style={inp} type="password" placeholder="Repetir contraseña" value={rPass2}
            onChange={e=>setRPass2(e.target.value)} required />
          {error && <p style={{ color:'#ff6b6b', fontSize:12, margin:0 }}>{error}</p>}
          <button style={{...btn, opacity:loading?.6:1}} type="submit" disabled={loading}>
            {loading ? 'Creando cuenta...' : '🏆 Crear mi quiniela'}
          </button>
        </form>
      )}

      {/* ── FORGOT PASSWORD ── */}
      {tab === 'forgot' && (
        <div>
          <div style={{ textAlign:'center', marginBottom:18 }}>
            <div style={{ fontSize:32, marginBottom:8 }}>🔐</div>
            <div style={{ fontWeight:800, fontSize:17 }}>Recuperar contraseña</div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,.4)', marginTop:4 }}>
              Te enviaremos un link a tu email
            </div>
          </div>
          {success ? (
            <div style={{ background:'rgba(48,209,88,.1)', border:'1px solid rgba(48,209,88,.3)', borderRadius:10, padding:'14px', textAlign:'center', fontSize:13, color:'#30d158', lineHeight:1.6 }}>
              {success}
            </div>
          ) : (
            <form onSubmit={handleForgot} style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <input style={inp} type="email" placeholder="Tu email registrado" value={fEmail}
                onChange={e=>setFEmail(e.target.value)} required />
              {error && <p style={{ color:'#ff6b6b', fontSize:12, margin:0 }}>{error}</p>}
              <button style={{...btn, opacity:loading?.6:1}} type="submit" disabled={loading}>
                {loading ? 'Enviando...' : '📧 Enviar link de recuperación'}
              </button>
            </form>
          )}
          <div style={{ textAlign:'center', marginTop:14 }}>
            <button type="button" style={link}
              onClick={() => { setTab('login'); setError(''); setSuccess('') }}>
              ← Volver al login
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── MAIN LANDING ───────────────────────────────────────────────
export function LoginPage() {
  const [timeLeft, setTimeLeft]   = useState(calcTimeLeft())
  const [stats, setStats]         = useState({ players:0, quinielas:0, topPlayer:'', topPts:0 })
  const [liveResults, setLiveResults] = useState([])
  const [activeGroup, setActiveGroup] = useState('A')

  useEffect(() => {
    const t = setInterval(() => setTimeLeft(calcTimeLeft()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => { loadStats(); loadResults() }, [])

  async function loadStats() {
    const [{ count: p }, { count: q }, { data: top }] = await Promise.all([
      supabase.from('profiles').select('*', { count:'exact', head:true }),
      supabase.from('quinielas').select('*', { count:'exact', head:true }),
      supabase.from('scores').select('total_pts,quinielas(profiles(username))').order('total_pts',{ascending:false}).limit(1),
    ])
    setStats({ players:p||0, quinielas:q||0,
      topPlayer:top?.[0]?.quinielas?.profiles?.username||'',
      topPts:top?.[0]?.total_pts||0 })
  }

  async function loadResults() {
    const { data } = await supabase.from('match_results').select('*')
      .eq('status','finished').order('updated_at',{ascending:false}).limit(8)
    setLiveResults(data||[])
  }

  const C = { bg:'#07080f', card:'rgba(255,255,255,.04)', border:'rgba(255,255,255,.08)', gold:'#ffd60a', text:'#fff', sub:'#6e6e73' }

  return (
    <div style={{ fontFamily:'-apple-system,"DM Sans",sans-serif', background:C.bg, color:C.text, minHeight:'100vh', overflowX:'hidden' }}>
      <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0,
        background:'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(255,214,10,.1) 0%, transparent 60%), radial-gradient(ellipse 40% 40% at 80% 80%, rgba(0,113,227,.08) 0%, transparent 50%)' }} />

      <div style={{ position:'relative', zIndex:1 }}>
        {/* HERO */}
        <div style={{ minHeight:'100vh', display:'grid', gridTemplateColumns:'1fr 1fr', gap:0, alignItems:'center' }}>
          {/* Left */}
          <div style={{ padding:'60px 48px 60px 60px' }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(255,214,10,.1)', border:'0.5px solid rgba(255,214,10,.3)', borderRadius:20, padding:'6px 14px', fontSize:12, fontWeight:700, color:C.gold, marginBottom:24 }}>
              ⚽ FIFA WORLD CUP 2026
            </div>
            <h1 style={{ fontSize:'clamp(36px,5vw,64px)', fontWeight:900, lineHeight:1.05, letterSpacing:'-2px', marginBottom:16,
              background:'linear-gradient(135deg,#fff 40%,#6e6e73 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
              Quiniela<br/>Mundial 2026
            </h1>
            <p style={{ fontSize:17, color:C.sub, lineHeight:1.7, marginBottom:32, maxWidth:440 }}>
              Pronostica los <strong style={{color:'#fff'}}>104 partidos</strong> del Mundial, compite con amigos y sigue los resultados en tiempo real.
            </p>

            {/* Countdown */}
            {timeLeft ? (
              <div style={{ marginBottom:32 }}>
                <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:C.sub, marginBottom:12 }}>
                  ⏳ Cierre de quinielas · 11 Jun 2026
                </div>
                <div style={{ display:'flex', gap:10 }}>
                  {[['days','Días'],['hours','Hrs'],['minutes','Min'],['seconds','Seg']].map(([k,l]) => (
                    <div key={k} style={{ background:'rgba(255,255,255,.06)', border:'0.5px solid rgba(255,255,255,.1)', borderRadius:12, padding:'12px 16px', textAlign:'center', minWidth:62 }}>
                      <div style={{ fontSize:30, fontWeight:900, fontVariantNumeric:'tabular-nums',
                        background:`linear-gradient(135deg,${C.gold},#ff9f0a)`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
                        {String(timeLeft[k]||0).padStart(2,'0')}
                      </div>
                      <div style={{ fontSize:10, color:C.sub, fontWeight:600, textTransform:'uppercase', letterSpacing:'.5px', marginTop:2 }}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ background:'rgba(255,69,58,.1)', border:'0.5px solid rgba(255,69,58,.3)', borderRadius:12, padding:'12px 20px', marginBottom:32, color:'#ff453a', fontWeight:700, fontSize:14 }}>
                🔒 El Mundial ya comenzó · Quinielas cerradas
              </div>
            )}

            {/* Stats */}
            <div style={{ display:'flex', gap:24, flexWrap:'wrap', marginBottom:20 }}>
              {[['👥',stats.players,'Participantes'],['📋',stats.quinielas,'Quinielas'],['⚽',104,'Partidos'],['🏟️',16,'Sedes']].map(([icon,val,label]) => (
                <div key={label}>
                  <div style={{ fontSize:20, fontWeight:800, color:C.gold }}>{icon} {val}</div>
                  <div style={{ fontSize:11, color:C.sub, fontWeight:500 }}>{label}</div>
                </div>
              ))}
            </div>

            {stats.topPlayer && (
              <div style={{ display:'inline-flex', alignItems:'center', gap:10, background:'rgba(255,214,10,.06)', border:'0.5px solid rgba(255,214,10,.2)', borderRadius:12, padding:'10px 16px' }}>
                <span style={{ fontSize:20 }}>👑</span>
                <div>
                  <div style={{ fontSize:11, color:C.sub, fontWeight:600, textTransform:'uppercase', letterSpacing:'.4px' }}>Líder actual</div>
                  <div style={{ fontWeight:800, fontSize:15 }}>{stats.topPlayer} <span style={{ color:C.gold }}>{stats.topPts} pts</span></div>
                </div>
              </div>
            )}
          </div>

          {/* Right — form */}
          <div style={{ padding:'60px 60px 60px 48px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
            <div style={{ width:'100%', maxWidth:380 }}>
              <div style={{ textAlign:'center', marginBottom:20 }}>
                <div style={{ fontSize:46 }}>🏆</div>
                <div style={{ fontWeight:800, fontSize:20, marginTop:6 }}>Únete a la quiniela</div>
                <div style={{ fontSize:12, color:C.sub, marginTop:4 }}>Gratis · Necesitas código de invitación</div>
              </div>
              <AuthForm />
            </div>
          </div>
        </div>

        {/* COMO FUNCIONA */}
        <div style={{ padding:'60px 48px', borderTop:'0.5px solid rgba(255,255,255,.06)' }}>
          <h2 style={{ fontSize:30, fontWeight:800, textAlign:'center', letterSpacing:'-1px', marginBottom:8 }}>¿Cómo funciona?</h2>
          <p style={{ textAlign:'center', color:C.sub, marginBottom:36, fontSize:15 }}>4 pasos simples</p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:14, maxWidth:1000, margin:'0 auto' }}>
            {[
              ['1️⃣','Pide el código','Solicita el código de invitación al organizador.'],
              ['2️⃣','Regístrate','Crea tu cuenta con el código en 30 segundos.'],
              ['3️⃣','Llena tu quiniela','104 partidos: grupos, eliminatorias y final.'],
              ['4️⃣','Compite','Sigue la tabla en tiempo real durante el Mundial.'],
            ].map(([n,t,d]) => (
              <div key={t} style={{ background:C.card, border:`0.5px solid ${C.border}`, borderRadius:14, padding:'22px 18px' }}>
                <div style={{ fontSize:28, marginBottom:10 }}>{n}</div>
                <div style={{ fontWeight:700, fontSize:15, marginBottom:6 }}>{t}</div>
                <div style={{ color:C.sub, fontSize:13, lineHeight:1.6 }}>{d}</div>
              </div>
            ))}
          </div>
        </div>

        {/* PUNTOS */}
        <div style={{ padding:'60px 48px', background:'rgba(255,255,255,.02)', borderTop:'0.5px solid rgba(255,255,255,.06)' }}>
          <h2 style={{ fontSize:30, fontWeight:800, textAlign:'center', letterSpacing:'-1px', marginBottom:8 }}>Sistema de puntos</h2>
          <p style={{ textAlign:'center', color:C.sub, marginBottom:36, fontSize:15 }}>Máximo <strong style={{color:C.gold}}>606 puntos</strong></p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:12, maxWidth:1000, margin:'0 auto' }}>
            {[
              { icon:'⚽', title:'Por partido', color:'#0071e3', max:'5 pts máx', items:['Goles local exactos → 1 pt','Goles visitante exactos → 1 pt','Resultado correcto → 2 pts','🎯 Todo correcto → +1 bonus'] },
              { icon:'📊', title:'Clasificación grupo', color:'#30d158', max:'48 pts máx', items:['1 pt por posición exacta','4 posiciones × 12 grupos'] },
              { icon:'🏟️', title:'Eliminatorias', color:'#ff9f0a', max:'160 pts máx', items:['R32 · Octavos · Cuartos','Semis · 3er lugar · Final','5 pts máx por partido'] },
              { icon:'🏆', title:'Orden final', color:C.gold, max:'38 pts máx', items:['🥇 Campeón → 20 pts','🥈 Subcampeón → 10 pts','🥉 3er lugar → 5 pts','4to lugar → 3 pts'] },
            ].map(({ icon, title, color, max, items }) => (
              <div key={title} style={{ background:C.card, border:`0.5px solid ${color}22`, borderRadius:14, padding:'22px 18px' }}>
                <div style={{ fontSize:28, marginBottom:8 }}>{icon}</div>
                <div style={{ fontWeight:700, fontSize:15, color, marginBottom:4 }}>{title}</div>
                <div style={{ fontSize:11, fontWeight:700, color:C.sub, marginBottom:12, textTransform:'uppercase', letterSpacing:'.4px' }}>{max}</div>
                {items.map(item => (
                  <div key={item} style={{ fontSize:12, color:'#aeaeb2', padding:'4px 0', borderBottom:`0.5px solid rgba(255,255,255,.05)`, lineHeight:1.5 }}>{item}</div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* GRUPOS */}
        <div style={{ padding:'60px 48px', borderTop:'0.5px solid rgba(255,255,255,.06)' }}>
          <h2 style={{ fontSize:30, fontWeight:800, textAlign:'center', letterSpacing:'-1px', marginBottom:8 }}>Los 48 equipos</h2>
          <p style={{ textAlign:'center', color:C.sub, marginBottom:28, fontSize:15 }}>12 grupos · 4 equipos cada uno</p>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6, justifyContent:'center', marginBottom:18 }}>
            {Object.keys(GROUPS).map(g => (
              <button key={g} onClick={() => setActiveGroup(g)}
                style={{ padding:'6px 14px', border:`0.5px solid ${activeGroup===g ? C.gold : C.border}`,
                  borderRadius:8, background: activeGroup===g ? 'rgba(255,214,10,.15)' : 'none',
                  color: activeGroup===g ? C.gold : C.sub, fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
                Gr. {g}
              </button>
            ))}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:8, maxWidth:800, margin:'0 auto' }}>
            {GROUPS[activeGroup].map((team, i) => (
              <div key={team} style={{ background:C.card, border:`0.5px solid ${C.border}`, borderRadius:10, padding:'12px 14px', display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontWeight:800, color:C.sub, fontSize:12, minWidth:16 }}>{i+1}</span>
                <span style={{ fontSize:13, fontWeight:600 }}>{team}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RESULTADOS EN VIVO */}
        {liveResults.length > 0 && (
          <div style={{ padding:'40px 48px', background:'rgba(255,255,255,.02)', borderTop:'0.5px solid rgba(255,255,255,.06)' }}>
            <h2 style={{ fontSize:26, fontWeight:800, textAlign:'center', letterSpacing:'-1px', marginBottom:24 }}>🔴 Últimos resultados</h2>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:10, maxWidth:1000, margin:'0 auto' }}>
              {liveResults.map(r => (
                <div key={r.match_id} style={{ background:C.card, border:`0.5px solid ${C.border}`, borderRadius:10, padding:'12px 14px', textAlign:'center' }}>
                  <div style={{ fontSize:10, color:C.sub, fontWeight:700, textTransform:'uppercase', letterSpacing:'.4px', marginBottom:6 }}>{r.match_id}</div>
                  <div style={{ fontSize:22, fontWeight:900, color:C.gold }}>{r.goals_home} – {r.goals_away}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FOOTER */}
        <div style={{ padding:'16px 48px', textAlign:'center', color:'#2a2a2c', fontSize:12, borderTop:'0.5px solid rgba(255,255,255,.04)', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
          <span>🏆 Quiniela Mundial 2026</span>
          <span>Resultados via football-data.org · Powered by Supabase + Netlify</span>
        </div>
      </div>
    </div>
  )
}
