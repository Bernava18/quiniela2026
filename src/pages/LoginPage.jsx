import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { useEffect } from 'react'

// ── Datos del Mundial ──────────────────────────────────────────
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

// ── Login form ─────────────────────────────────────────────────
function LoginForm() {
  const { signIn } = useAuth()
  const navigate   = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [tab, setTab]           = useState('login') // login | register

  // Register state
  const [rUser, setRUser]   = useState('')
  const [rName, setRName]   = useState('')
  const [rEmail, setREmail] = useState('')
  const [rPass, setRPass]   = useState('')

  const { signUp } = useAuth()

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
    if (rPass.length < 6) { setError('Contraseña mínimo 6 caracteres'); return }
    setLoading(true); setError('')
    const { error } = await signUp(rEmail, rPass, rUser, rName)
    if (error) setError(error.message)
    else navigate('/')
    setLoading(false)
  }

  const inp = { width:'100%', padding:'11px 14px', border:'1px solid rgba(255,255,255,.12)', borderRadius:10, fontSize:14, fontFamily:'inherit', outline:'none', background:'rgba(255,255,255,.06)', color:'#fff', boxSizing:'border-box' }
  const btn = { width:'100%', padding:'12px', background:'linear-gradient(135deg,#ffd60a,#ff9f0a)', border:'none', borderRadius:10, fontSize:15, fontWeight:800, cursor:'pointer', fontFamily:'inherit', color:'#000', marginTop:4 }

  return (
    <div style={{ background:'rgba(255,255,255,.04)', backdropFilter:'blur(20px)', border:'0.5px solid rgba(255,255,255,.1)', borderRadius:20, padding:'28px 28px', width:'100%', maxWidth:380 }}>
      {/* Tabs */}
      <div style={{ display:'flex', background:'rgba(255,255,255,.06)', borderRadius:10, padding:3, marginBottom:24 }}>
        {[['login','Entrar'],['register','Registrarse']].map(([k,l]) => (
          <button key={k} onClick={() => { setTab(k); setError('') }}
            style={{ flex:1, padding:'8px', border:'none', borderRadius:8, fontFamily:'inherit', fontSize:13, fontWeight:700, cursor:'pointer',
              background: tab===k ? 'linear-gradient(135deg,#ffd60a,#ff9f0a)' : 'none',
              color: tab===k ? '#000' : '#6e6e73' }}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'login' ? (
        <form onSubmit={handleLogin} style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <input style={inp} type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required />
          <input style={inp} type="password" placeholder="Contraseña" value={password} onChange={e=>setPassword(e.target.value)} required />
          {error && <p style={{ color:'#ff453a', fontSize:12, margin:0 }}>{error}</p>}
          <button style={{...btn, opacity:loading?.6:1}} type="submit" disabled={loading}>
            {loading ? 'Entrando...' : '⚽ Entrar'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleRegister} style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <input style={inp} placeholder="Usuario (visible en la tabla)" value={rUser} onChange={e=>setRUser(e.target.value)} required />
          <input style={inp} placeholder="Nombre completo" value={rName} onChange={e=>setRName(e.target.value)} />
          <input style={inp} type="email" placeholder="Email" value={rEmail} onChange={e=>setREmail(e.target.value)} required />
          <input style={inp} type="password" placeholder="Contraseña (mín. 6)" value={rPass} onChange={e=>setRPass(e.target.value)} required />
          {error && <p style={{ color:'#ff453a', fontSize:12, margin:0 }}>{error}</p>}
          <button style={{...btn, opacity:loading?.6:1}} type="submit" disabled={loading}>
            {loading ? 'Creando cuenta...' : '🏆 Crear mi quiniela'}
          </button>
        </form>
      )}
    </div>
  )
}

// ── Main Landing ───────────────────────────────────────────────
export function LoginPage() {
  const [timeLeft, setTimeLeft] = useState(calcTimeLeft())
  const [stats, setStats]       = useState({ players:0, quinielas:0, topPlayer:'', topPts:0 })
  const [liveResults, setLiveResults] = useState([])
  const [activeGroup, setActiveGroup] = useState('A')

  useEffect(() => {
    const t = setInterval(() => setTimeLeft(calcTimeLeft()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    loadStats()
    loadResults()
  }, [])

  async function loadStats() {
    const [{ count: p }, { count: q }, { data: top }] = await Promise.all([
      supabase.from('profiles').select('*', { count:'exact', head:true }),
      supabase.from('quinielas').select('*', { count:'exact', head:true }),
      supabase.from('scores').select('total_pts,quinielas(profiles(username))').order('total_pts',{ascending:false}).limit(1),
    ])
    setStats({ players:p||0, quinielas:q||0, topPlayer:top?.[0]?.quinielas?.profiles?.username||'', topPts:top?.[0]?.total_pts||0 })
  }

  async function loadResults() {
    const { data } = await supabase.from('match_results').select('*').eq('status','finished').order('updated_at',{ascending:false}).limit(8)
    setLiveResults(data||[])
  }

  const colors = { bg:'#07080f', card:'rgba(255,255,255,.04)', border:'rgba(255,255,255,.08)', gold:'#ffd60a', accent:'#0071e3', text:'#fff', sub:'#6e6e73' }

  return (
    <div style={{ fontFamily:'-apple-system,"DM Sans",sans-serif', background:colors.bg, color:colors.text, minHeight:'100vh', overflowX:'hidden' }}>

      {/* BG decoration */}
      <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0,
        background:'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(255,214,10,.1) 0%, transparent 60%), radial-gradient(ellipse 40% 40% at 80% 80%, rgba(0,113,227,.08) 0%, transparent 50%)' }} />

      <div style={{ position:'relative', zIndex:1 }}>

        {/* ── HERO ── */}
        <div style={{ minHeight:'100vh', display:'grid', gridTemplateColumns:'1fr 1fr', gap:0, alignItems:'center' }}>

          {/* Left — info */}
          <div style={{ padding:'60px 48px 60px 60px' }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(255,214,10,.1)', border:'0.5px solid rgba(255,214,10,.3)', borderRadius:20, padding:'6px 14px', fontSize:12, fontWeight:700, color:colors.gold, marginBottom:24, letterSpacing:'.3px' }}>
              ⚽ FIFA WORLD CUP 2026
            </div>
            <h1 style={{ fontSize:'clamp(36px,5vw,64px)', fontWeight:900, lineHeight:1.05, letterSpacing:'-2px', marginBottom:16,
              background:'linear-gradient(135deg,#fff 40%,#6e6e73 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
              Quiniela<br/>Mundial 2026
            </h1>
            <p style={{ fontSize:18, color:colors.sub, lineHeight:1.7, marginBottom:32, maxWidth:440 }}>
              Pronostica los <strong style={{color:'#fff'}}>104 partidos</strong> del Mundial, compite con amigos y sigue los resultados en tiempo real. 32 selecciones, 12 grupos, una quiniela.
            </p>

            {/* Countdown */}
            {timeLeft ? (
              <div style={{ marginBottom:32 }}>
                <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:colors.sub, marginBottom:12 }}>
                  ⏳ Cierre de quinielas · 11 Jun 2026
                </div>
                <div style={{ display:'flex', gap:12 }}>
                  {[['days','Días'],['hours','Hrs'],['minutes','Min'],['seconds','Seg']].map(([k,l]) => (
                    <div key={k} style={{ background:'rgba(255,255,255,.06)', border:'0.5px solid rgba(255,255,255,.1)', borderRadius:12, padding:'14px 16px', textAlign:'center', minWidth:64 }}>
                      <div style={{ fontSize:32, fontWeight:900, fontVariantNumeric:'tabular-nums', background:`linear-gradient(135deg,${colors.gold},#ff9f0a)`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
                        {String(timeLeft[k]||0).padStart(2,'0')}
                      </div>
                      <div style={{ fontSize:10, color:colors.sub, fontWeight:600, textTransform:'uppercase', letterSpacing:'.5px', marginTop:2 }}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ background:'rgba(255,69,58,.1)', border:'0.5px solid rgba(255,69,58,.3)', borderRadius:12, padding:'12px 20px', marginBottom:32, color:'#ff453a', fontWeight:700, fontSize:14 }}>
                🔒 El Mundial ya comenzó · Quinielas cerradas
              </div>
            )}

            {/* Stats row */}
            <div style={{ display:'flex', gap:24, flexWrap:'wrap' }}>
              {[
                ['👥', stats.players, 'Participantes'],
                ['📋', stats.quinielas, 'Quinielas'],
                ['⚽', 104, 'Partidos'],
                ['🏟️', 16, 'Sedes'],
              ].map(([icon,val,label]) => (
                <div key={label}>
                  <div style={{ fontSize:22, fontWeight:800, color:colors.gold }}>{icon} {val}</div>
                  <div style={{ fontSize:11, color:colors.sub, fontWeight:500 }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Leader */}
            {stats.topPlayer && (
              <div style={{ marginTop:24, display:'inline-flex', alignItems:'center', gap:10, background:'rgba(255,214,10,.06)', border:'0.5px solid rgba(255,214,10,.2)', borderRadius:12, padding:'10px 16px' }}>
                <span style={{ fontSize:20 }}>👑</span>
                <div>
                  <div style={{ fontSize:11, color:colors.sub, fontWeight:600, textTransform:'uppercase', letterSpacing:'.4px' }}>Líder actual</div>
                  <div style={{ fontWeight:800, fontSize:15 }}>{stats.topPlayer} <span style={{ color:colors.gold }}>{stats.topPts} pts</span></div>
                </div>
              </div>
            )}
          </div>

          {/* Right — form */}
          <div style={{ padding:'60px 60px 60px 48px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
            <div style={{ width:'100%', maxWidth:380 }}>
              <div style={{ textAlign:'center', marginBottom:20 }}>
                <div style={{ fontSize:48 }}>🏆</div>
                <div style={{ fontWeight:800, fontSize:20, marginTop:6 }}>Únete a la quiniela</div>
                <div style={{ fontSize:13, color:colors.sub, marginTop:4 }}>Gratis · Sin tarjeta · Empieza en 30 segundos</div>
              </div>
              <LoginForm />
            </div>
          </div>
        </div>

        {/* ── COMO FUNCIONA ── */}
        <div style={{ padding:'60px 48px', borderTop:'0.5px solid rgba(255,255,255,.06)' }}>
          <h2 style={{ fontSize:32, fontWeight:800, textAlign:'center', letterSpacing:'-1px', marginBottom:8 }}>¿Cómo funciona?</h2>
          <p style={{ textAlign:'center', color:colors.sub, marginBottom:40, fontSize:15 }}>4 pasos para competir</p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:16, maxWidth:1000, margin:'0 auto' }}>
            {[
              ['1️⃣','Regístrate','Crea tu cuenta gratis en 30 segundos.'],
              ['2️⃣','Crea tu quiniela','Ponle nombre y llena tus 104 pronósticos.'],
              ['3️⃣','Sigue el Mundial','Resultados en vivo cada 2 minutos automáticamente.'],
              ['4️⃣','Compite','Ve en tiempo real tu posición en la tabla.'],
            ].map(([num,title,desc]) => (
              <div key={title} style={{ background:colors.card, border:`0.5px solid ${colors.border}`, borderRadius:14, padding:'22px 18px' }}>
                <div style={{ fontSize:28, marginBottom:10 }}>{num}</div>
                <div style={{ fontWeight:700, fontSize:15, marginBottom:6 }}>{title}</div>
                <div style={{ color:colors.sub, fontSize:13, lineHeight:1.6 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── SISTEMA DE PUNTOS ── */}
        <div style={{ padding:'60px 48px', background:'rgba(255,255,255,.02)', borderTop:'0.5px solid rgba(255,255,255,.06)' }}>
          <h2 style={{ fontSize:32, fontWeight:800, textAlign:'center', letterSpacing:'-1px', marginBottom:8 }}>Sistema de puntos</h2>
          <p style={{ textAlign:'center', color:colors.sub, marginBottom:40, fontSize:15 }}>Máximo <strong style={{color:colors.gold}}>606 puntos</strong> en todo el torneo</p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:14, maxWidth:1000, margin:'0 auto' }}>
            {[
              { icon:'⚽', title:'Por partido', color:'#0071e3', max:'5 pts máx', items:['Goles local exactos → 1 pt','Goles visitante exactos → 1 pt','Resultado correcto → 2 pts','🎯 Todo correcto → +1 bonus'] },
              { icon:'📊', title:'Clasificación grupo', color:'#30d158', max:'48 pts máx', items:['1 pt por posición exacta','4 posiciones × 12 grupos','Se calcula con tus picks','Comparado con resultado real'] },
              { icon:'🏆', title:'Orden final', color:colors.gold, max:'38 pts máx', items:['🥇 Campeón → 20 pts','🥈 Subcampeón → 10 pts','🥉 3er lugar → 5 pts','4to lugar → 3 pts'] },
              { icon:'🗓️', title:'Fases eliminatorias', color:'#ff9f0a', max:'160 pts máx', items:['R32 · Octavos · Cuartos','Semis · Final · 3er puesto','Mismo criterio de grupos','Condición de slot por equipo'] },
            ].map(({ icon, title, color, max, items }) => (
              <div key={title} style={{ background:colors.card, border:`0.5px solid ${color}22`, borderRadius:14, padding:'22px 18px' }}>
                <div style={{ fontSize:28, marginBottom:8 }}>{icon}</div>
                <div style={{ fontWeight:700, fontSize:15, color, marginBottom:4 }}>{title}</div>
                <div style={{ fontSize:11, fontWeight:700, color:colors.sub, marginBottom:12, textTransform:'uppercase', letterSpacing:'.4px' }}>{max}</div>
                {items.map(item => (
                  <div key={item} style={{ fontSize:12, color:'#aeaeb2', padding:'4px 0', borderBottom:`0.5px solid rgba(255,255,255,.05)`, lineHeight:1.5 }}>{item}</div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* ── GRUPOS ── */}
        <div style={{ padding:'60px 48px', borderTop:'0.5px solid rgba(255,255,255,.06)' }}>
          <h2 style={{ fontSize:32, fontWeight:800, textAlign:'center', letterSpacing:'-1px', marginBottom:8 }}>Los 48 equipos</h2>
          <p style={{ textAlign:'center', color:colors.sub, marginBottom:32, fontSize:15 }}>12 grupos · 4 equipos cada uno</p>
          {/* Group tabs */}
          <div style={{ display:'flex', flexWrap:'wrap', gap:6, justifyContent:'center', marginBottom:20 }}>
            {Object.keys(GROUPS).map(g => (
              <button key={g} onClick={() => setActiveGroup(g)}
                style={{ padding:'6px 14px', border:`0.5px solid ${activeGroup===g ? colors.gold : colors.border}`,
                  borderRadius:8, background: activeGroup===g ? 'rgba(255,214,10,.15)' : 'none',
                  color: activeGroup===g ? colors.gold : colors.sub, fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
                Gr. {g}
              </button>
            ))}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:10, maxWidth:800, margin:'0 auto' }}>
            {GROUPS[activeGroup].map((team, i) => (
              <div key={team} style={{ background:colors.card, border:`0.5px solid ${colors.border}`, borderRadius:10, padding:'12px 14px', display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontWeight:800, color:colors.sub, fontSize:12, minWidth:16 }}>{i+1}</span>
                <span style={{ fontSize:13, fontWeight:600 }}>{team}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── ULTIMOS RESULTADOS ── */}
        {liveResults.length > 0 && (
          <div style={{ padding:'40px 48px', background:'rgba(255,255,255,.02)', borderTop:'0.5px solid rgba(255,255,255,.06)' }}>
            <h2 style={{ fontSize:28, fontWeight:800, textAlign:'center', letterSpacing:'-1px', marginBottom:28 }}>
              🔴 Últimos resultados
            </h2>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:10, maxWidth:1000, margin:'0 auto' }}>
              {liveResults.map(r => (
                <div key={r.match_id} style={{ background:colors.card, border:`0.5px solid ${colors.border}`, borderRadius:10, padding:'12px 14px', textAlign:'center' }}>
                  <div style={{ fontSize:10, color:colors.sub, fontWeight:700, textTransform:'uppercase', letterSpacing:'.4px', marginBottom:6 }}>{r.match_id}</div>
                  <div style={{ fontSize:22, fontWeight:900, color:colors.gold }}>{r.goals_home} – {r.goals_away}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── FOOTER CTA ── */}
        <div style={{ padding:'60px 48px', textAlign:'center', borderTop:'0.5px solid rgba(255,255,255,.06)', background:'radial-gradient(ellipse 60% 80% at 50% 100%, rgba(255,214,10,.06) 0%, transparent 60%)' }}>
          <div style={{ fontSize:48, marginBottom:12 }}>⚽</div>
          <h2 style={{ fontSize:32, fontWeight:800, letterSpacing:'-1px', marginBottom:10 }}>¿Listo para competir?</h2>
          <p style={{ color:colors.sub, marginBottom:28, fontSize:16 }}>Regístrate gratis antes del 11 de junio · Cierra en {timeLeft ? `${timeLeft.days} días` : 'cualquier momento'}</p>
          <button onClick={() => document.querySelector('input')?.focus()}
            style={{ padding:'16px 48px', background:'linear-gradient(135deg,#ffd60a,#ff9f0a)', borderRadius:14, border:'none', color:'#000', fontSize:17, fontWeight:800, cursor:'pointer', fontFamily:'inherit', boxShadow:'0 8px 40px rgba(255,214,10,.25)' }}>
            🏆 Crear mi quiniela gratis
          </button>
        </div>

        {/* FOOTER */}
        <div style={{ padding:'16px 48px', textAlign:'center', color:'#2a2a2c', fontSize:12, borderTop:'0.5px solid rgba(255,255,255,.04)', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
          <span>🏆 Quiniela Mundial 2026</span>
          <span>Resultados via football-data.org · Powered by Supabase + Netlify</span>
        </div>

      </div>
    </div>
  )
}
