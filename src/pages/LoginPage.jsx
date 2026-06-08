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

function AuthForm() {
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab]         = useState('login')
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [rCode, setRCode]     = useState('')
  const [rUser, setRUser]     = useState('')
  const [rName, setRName]     = useState('')
  const [rEmail, setREmail]   = useState('')
  const [rPass, setRPass]     = useState('')
  const [rPass2, setRPass2]   = useState('')
  const [rPhone, setRPhone]   = useState('')
  const [fEmail, setFEmail]   = useState('')

  const inp = { width:'100%', padding:'11px 14px', border:'1px solid rgba(255,255,255,.12)', borderRadius:10, fontSize:14, fontFamily:'inherit', outline:'none', background:'rgba(255,255,255,.07)', color:'#fff', boxSizing:'border-box' }
  const btn = { width:'100%', padding:'12px', background:'linear-gradient(135deg,#ffd60a,#ff9f0a)', border:'none', borderRadius:10, fontSize:15, fontWeight:800, cursor:'pointer', fontFamily:'inherit', color:'#000', marginTop:4 }
  const link = { background:'none', border:'none', color:'rgba(255,255,255,.5)', fontSize:12, cursor:'pointer', fontFamily:'inherit', textDecoration:'underline', padding:0 }

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
    if (!rPhone.trim())    { setError('El número de teléfono es obligatorio'); return }
    setLoading(true)
    const { data: cfg } = await supabase.from('config').select('value').eq('key','invite_code').single()
    if (rCode.trim().toUpperCase() !== (cfg?.value||'').toUpperCase()) {
      setError('Código de invitación incorrecto'); setLoading(false); return
    }
    const { data, error } = await signUp(rEmail, rPass, rUser, rName)
    if (error) { setError(error.message); setLoading(false); return }
    // Save phone
    if (data?.user?.id) {
      await supabase.from('profiles').update({ phone: rPhone }).eq('id', data.user.id)
    }
    navigate('/')
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
      {tab !== 'forgot' && (
        <div style={{ display:'flex', background:'rgba(255,255,255,.06)', borderRadius:10, padding:3, marginBottom:22 }}>
          {[['login','Entrar'],['register','Registrarse']].map(([k,l]) => (
            <button key={k} onClick={() => { setTab(k); setError(''); setSuccess('') }}
              style={{ flex:1, padding:'8px', border:'none', borderRadius:8, fontFamily:'inherit', fontSize:13, fontWeight:700, cursor:'pointer', background: tab===k ? 'linear-gradient(135deg,#ffd60a,#ff9f0a)' : 'none', color: tab===k ? '#000' : '#6e6e73' }}>
              {l}
            </button>
          ))}
        </div>
      )}

      {tab === 'login' && (
        <form onSubmit={handleLogin} style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <input style={inp} type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required />
          <input style={inp} type="password" placeholder="Contraseña" value={password} onChange={e=>setPassword(e.target.value)} required />
          {error && <p style={{ color:'#ff6b6b', fontSize:12, margin:0 }}>{error}</p>}
          <button style={{...btn, opacity:loading?.6:1}} type="submit" disabled={loading}>
            {loading ? 'Entrando...' : '⚽ Entrar'}
          </button>
          <div style={{ textAlign:'center', marginTop:4 }}>
            <button type="button" style={link} onClick={() => { setTab('forgot'); setError(''); setSuccess('') }}>
              ¿Olvidaste tu contraseña?
            </button>
          </div>
        </form>
      )}

      {tab === 'register' && (
        <form onSubmit={handleRegister} style={{ display:'flex', flexDirection:'column', gap:9 }}>
          <div style={{ background:'rgba(255,214,10,.08)', border:'1px solid rgba(255,214,10,.25)', borderRadius:10, padding:'10px 12px' }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#ffd60a', marginBottom:6, textTransform:'uppercase', letterSpacing:'.3px' }}>🔑 Código de invitación</div>
            <input style={{ ...inp, background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,214,10,.3)', textTransform:'uppercase', letterSpacing:'2px', fontWeight:700, fontSize:16, textAlign:'center' }}
              placeholder="XXXXXXXX" value={rCode} onChange={e=>setRCode(e.target.value.toUpperCase())} required />
            <div style={{ fontSize:10, color:'rgba(255,255,255,.35)', marginTop:5 }}>Solicita el código al organizador</div>
          </div>
          <input style={inp} placeholder="Usuario público (visible en la tabla)" value={rUser} onChange={e=>setRUser(e.target.value)} required />
          <input style={inp} placeholder="Nombre completo (opcional)" value={rName} onChange={e=>setRName(e.target.value)} />
          <input style={inp} type="email" placeholder="Email" value={rEmail} onChange={e=>setREmail(e.target.value)} required />
          <div style={{ position:'relative' }}>
            <input style={{...inp, paddingLeft:50}} type="tel" placeholder="Ej: +58 412 1234567"
              value={rPhone} onChange={e=>setRPhone(e.target.value)} required />
            <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', fontSize:16 }}>📱</span>
          </div>
          <div style={{ fontSize:10, color:'rgba(255,255,255,.35)', marginTop:-4 }}>
            * Teléfono obligatorio para contacto del organizador
          </div>
          <input style={inp} type="password" placeholder="Contraseña (mín. 6 caracteres)" value={rPass} onChange={e=>setRPass(e.target.value)} required />
          <input style={inp} type="password" placeholder="Repetir contraseña" value={rPass2} onChange={e=>setRPass2(e.target.value)} required />
          {error && <p style={{ color:'#ff6b6b', fontSize:12, margin:0 }}>{error}</p>}
          <button style={{...btn, opacity:loading?.6:1}} type="submit" disabled={loading}>
            {loading ? 'Creando cuenta...' : '🏆 Crear mi quiniela'}
          </button>
        </form>
      )}

      {tab === 'forgot' && (
        <div>
          <div style={{ textAlign:'center', marginBottom:18 }}>
            <div style={{ fontSize:32, marginBottom:8 }}>🔐</div>
            <div style={{ fontWeight:800, fontSize:17 }}>Recuperar contraseña</div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,.4)', marginTop:4 }}>Te enviaremos un link a tu email</div>
          </div>
          {success ? (
            <div style={{ background:'rgba(48,209,88,.1)', border:'1px solid rgba(48,209,88,.3)', borderRadius:10, padding:'14px', textAlign:'center', fontSize:13, color:'#30d158', lineHeight:1.6 }}>{success}</div>
          ) : (
            <form onSubmit={handleForgot} style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <input style={inp} type="email" placeholder="Tu email registrado" value={fEmail} onChange={e=>setFEmail(e.target.value)} required />
              {error && <p style={{ color:'#ff6b6b', fontSize:12, margin:0 }}>{error}</p>}
              <button style={{...btn, opacity:loading?.6:1}} type="submit" disabled={loading}>
                {loading ? 'Enviando...' : '📧 Enviar link de recuperación'}
              </button>
            </form>
          )}
          <div style={{ textAlign:'center', marginTop:14 }}>
            <button type="button" style={link} onClick={() => { setTab('login'); setError(''); setSuccess('') }}>← Volver al login</button>
          </div>
        </div>
      )}
    </div>
  )
}

export function LoginPage() {
  const [timeLeft, setTimeLeft]   = useState(calcTimeLeft())
  const [stats, setStats]         = useState({ players:0, quinielas:0, topPlayer:'', topPts:0 })
  const [liveResults, setLiveResults] = useState([])
  const [top10, setTop10] = useState([])
  const [activeGroup, setActiveGroup] = useState('A')

  useEffect(() => {
    const t = setInterval(() => setTimeLeft(calcTimeLeft()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    loadStats(); loadResults()
    // Realtime top10
    const ch = supabase.channel('scores-landing')
      .on('postgres_changes', { event:'*', schema:'public', table:'scores' }, () => loadStats())
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  async function loadStats() {
    const [{ count: p }, { count: q }, { data: top }] = await Promise.all([
      supabase.from('profiles').select('*', { count:'exact', head:true }),
      supabase.from('quinielas').select('*', { count:'exact', head:true }),
      supabase.from('scores').select('total_pts,quinielas(name,profiles!quinielas_user_id_fkey(username))').order('total_pts',{ascending:false}).limit(10),
    ])
    setStats({ players:p||0, quinielas:q||0, topPlayer:top?.[0]?.quinielas?.profiles?.username||'', topPts:top?.[0]?.total_pts||0 })
    setTop10(top||[])
  }

  async function loadResults() {
    const { data } = await supabase.from('match_results').select('*').eq('status','finished').order('updated_at',{ascending:false}).limit(8)
    setLiveResults(data||[])
  }

  const C = { bg:'#07080f', card:'rgba(255,255,255,.04)', border:'rgba(255,255,255,.08)', gold:'#ffd60a', text:'#fff', sub:'#6e6e73' }

  return (
    <div style={{ fontFamily:'-apple-system,"DM Sans",sans-serif', background:C.bg, color:C.text, minHeight:'100vh', overflowX:'hidden' }}>
      <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, background:'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(255,214,10,.1) 0%, transparent 60%), radial-gradient(ellipse 40% 40% at 80% 80%, rgba(0,113,227,.08) 0%, transparent 50%)' }} />
      <div style={{ position:'relative', zIndex:1 }}>

        {/* HERO */}
        <div style={{ minHeight:'100vh', display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))', alignItems:'center' }}>
          <div style={{ padding:'clamp(32px,5vw,60px) clamp(20px,5vw,60px)' }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(255,214,10,.1)', border:'0.5px solid rgba(255,214,10,.3)', borderRadius:20, padding:'6px 14px', fontSize:12, fontWeight:700, color:C.gold, marginBottom:24 }}>
              ⚽ FIFA WORLD CUP 2026
            </div>
            <h1 style={{ fontSize:'clamp(32px,5vw,64px)', fontWeight:900, lineHeight:1.05, letterSpacing:'-2px', marginBottom:16, background:'linear-gradient(135deg,#fff 40%,#6e6e73 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
              Quiniela<br/>Mundial 2026
            </h1>
            <p style={{ fontSize:17, color:C.sub, lineHeight:1.7, marginBottom:28, maxWidth:440 }}>
              Pronostica los <strong style={{color:'#fff'}}>104 partidos</strong> del Mundial, compite con amigos y sigue los resultados en tiempo real.
            </p>

            {timeLeft ? (
              <div style={{ marginBottom:28 }}>
                <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:C.sub, marginBottom:12 }}>⏳ Cierre · 11 Jun 2026</div>
                <div style={{ display:'flex', gap:10 }}>
                  {[['days','Días'],['hours','Hrs'],['minutes','Min'],['seconds','Seg']].map(([k,l]) => (
                    <div key={k} style={{ background:'rgba(255,255,255,.06)', border:'0.5px solid rgba(255,255,255,.1)', borderRadius:12, padding:'12px 14px', textAlign:'center', minWidth:58 }}>
                      <div style={{ fontSize:28, fontWeight:900, fontVariantNumeric:'tabular-nums', background:`linear-gradient(135deg,${C.gold},#ff9f0a)`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
                        {String(timeLeft[k]||0).padStart(2,'0')}
                      </div>
                      <div style={{ fontSize:10, color:C.sub, fontWeight:600, textTransform:'uppercase', letterSpacing:'.5px', marginTop:2 }}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ background:'rgba(255,69,58,.1)', border:'0.5px solid rgba(255,69,58,.3)', borderRadius:12, padding:'12px 20px', marginBottom:28, color:'#ff453a', fontWeight:700, fontSize:14 }}>🔒 El Mundial ya comenzó · Quinielas cerradas</div>
            )}

            <div style={{ display:'flex', gap:20, flexWrap:'wrap', marginBottom:20 }}>
              {[['👥',stats.players,'Participantes'],['📋',stats.quinielas,'Quinielas'],['⚽',104,'Partidos'],['🏟️',16,'Sedes']].map(([icon,val,label]) => (
                <div key={label}>
                  <div style={{ fontSize:20, fontWeight:800, color:C.gold }}>{icon} {val}</div>
                  <div style={{ fontSize:11, color:C.sub, fontWeight:500 }}>{label}</div>
                </div>
              ))}
            </div>

            {stats.topPlayer && (
              <div style={{ display:'inline-flex', alignItems:'center', gap:10, background:'rgba(255,214,10,.06)', border:'0.5px solid rgba(255,214,10,.2)', borderRadius:12, padding:'10px 16px', marginBottom:16 }}>
                <span style={{ fontSize:20 }}>👑</span>
                <div>
                  <div style={{ fontSize:11, color:C.sub, fontWeight:600, textTransform:'uppercase', letterSpacing:'.4px' }}>Líder actual</div>
                  <div style={{ fontWeight:800, fontSize:15 }}>{stats.topPlayer} <span style={{ color:C.gold }}>{stats.topPts} pts</span></div>
                </div>
              </div>
            )}

            <div style={{ background:'rgba(255,214,10,.08)', border:'0.5px solid rgba(255,214,10,.25)', borderRadius:12, padding:'14px 16px' }}>
              <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.5px', color:C.gold, marginBottom:10 }}>💰 Inscripción y premios</div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
                <div>
                  <div style={{ fontSize:22, fontWeight:900, color:'#fff' }}>$15 USD</div>
                  <div style={{ fontSize:11, color:C.sub }}>por quiniela</div>
                </div>
                <div style={{ display:'flex', gap:14 }}>
                  {[['🥇','1er','60%'],['🥈','2do','20%'],['🥉','3er','10%']].map(([m,p,pct])=>(
                    <div key={p} style={{ textAlign:'center' }}>
                      <div style={{ fontSize:18 }}>{m}</div>
                      <div style={{ fontSize:13, fontWeight:800, color:'#fff' }}>{pct}</div>
                      <div style={{ fontSize:10, color:C.sub }}>{p} lugar</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ fontSize:11, color:C.sub, marginTop:8 }}>Si hay empate en un puesto, el premio se divide entre los empatados · Pago manual al organizador</div>
            </div>
          </div>

          <div style={{ padding:'clamp(24px,5vw,60px) clamp(20px,5vw,60px)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
            <div style={{ width:'100%', maxWidth:380 }}>
              <div style={{ textAlign:'center', marginBottom:20 }}>
                <div style={{ fontSize:46 }}>🏆</div>
                <div style={{ fontWeight:800, fontSize:20, marginTop:6 }}>Únete a la quiniela</div>
                <div style={{ fontSize:12, color:C.sub, marginTop:4 }}>Gratis · Necesitas código de invitación</div>
              </div>
              <AuthForm />
              <div style={{ textAlign:'center', marginTop:12 }}>
                <a href="/guia" style={{ fontSize:12, color:'rgba(255,255,255,.4)', textDecoration:'none' }}>📖 Ver guía de uso →</a>
              </div>
            </div>
          </div>
        </div>

        {/* COMO FUNCIONA */}
        <div style={{ padding:'clamp(32px,6vw,60px) clamp(16px,4vw,48px)', borderTop:'0.5px solid rgba(255,255,255,.06)' }}>
          <h2 style={{ fontSize:28, fontWeight:800, textAlign:'center', letterSpacing:'-1px', marginBottom:8 }}>¿Cómo funciona?</h2>
          <p style={{ textAlign:'center', color:C.sub, marginBottom:32, fontSize:14 }}>4 pasos simples</p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:12, maxWidth:1000, margin:'0 auto' }}>
            {[
              ['1️⃣','Pide el código','Solicita el código de invitación al organizador.'],
              ['2️⃣','Regístrate','Crea tu cuenta con el código. Necesitas tu número de teléfono.'],
              ['3️⃣','Llena tu quiniela','104 pronósticos: grupos, eliminatorias y final.'],
              ['4️⃣','Compite','Sigue la tabla en tiempo real durante el Mundial.'],
            ].map(([n,t,d]) => (
              <div key={t} style={{ background:C.card, border:`0.5px solid ${C.border}`, borderRadius:14, padding:'20px 16px' }}>
                <div style={{ fontSize:26, marginBottom:8 }}>{n}</div>
                <div style={{ fontWeight:700, fontSize:14, marginBottom:5 }}>{t}</div>
                <div style={{ color:C.sub, fontSize:12, lineHeight:1.6 }}>{d}</div>
              </div>
            ))}
          </div>
        </div>

        {/* PUNTOS */}
        <div style={{ padding:'clamp(32px,6vw,60px) clamp(16px,4vw,48px)', background:'rgba(255,255,255,.02)', borderTop:'0.5px solid rgba(255,255,255,.06)' }}>
          <h2 style={{ fontSize:28, fontWeight:800, textAlign:'center', letterSpacing:'-1px', marginBottom:8 }}>Sistema de puntos</h2>
          <p style={{ textAlign:'center', color:C.sub, marginBottom:32, fontSize:14 }}>Máximo <strong style={{color:C.gold}}>606 puntos</strong></p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:12, maxWidth:1000, margin:'0 auto' }}>
            {[
              { icon:'⚽', title:'Por partido', color:'#0071e3', max:'5 pts máx', items:['Goles local exactos → 1 pt','Goles visitante exactos → 1 pt','Resultado correcto → 2 pts','🎯 Todo correcto → +1 bonus'] },
              { icon:'📊', title:'Clasificación grupo', color:'#30d158', max:'48 pts máx', items:['1 pt por posición exacta','4 posiciones × 12 grupos','Se calcula automático','según tus picks de partidos'] },
              { icon:'🏟️', title:'Eliminatorias', color:'#ff9f0a', max:'160 pts máx', items:['R32 · Octavos · Cuartos','Semis · 3er lugar · Final','5 pts máx por partido','El bracket se llena automático'] },
              { icon:'🏆', title:'Orden final', color:C.gold, max:'38 pts máx', items:['🥇 Campeón → 20 pts','🥈 Subcampeón → 10 pts','🥉 3er lugar → 5 pts','4to lugar → 3 pts'] },
            ].map(({ icon, title, color, max, items }) => (
              <div key={title} style={{ background:C.card, border:`0.5px solid ${color}22`, borderRadius:14, padding:'20px 16px' }}>
                <div style={{ fontSize:26, marginBottom:6 }}>{icon}</div>
                <div style={{ fontWeight:700, fontSize:14, color, marginBottom:3 }}>{title}</div>
                <div style={{ fontSize:10, fontWeight:700, color:C.sub, marginBottom:10, textTransform:'uppercase', letterSpacing:'.4px' }}>{max}</div>
                {items.map(item => (
                  <div key={item} style={{ fontSize:11, color:'#aeaeb2', padding:'3px 0', borderBottom:`0.5px solid rgba(255,255,255,.05)`, lineHeight:1.5 }}>{item}</div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* GRUPOS */}
        <div style={{ padding:'clamp(32px,6vw,60px) clamp(16px,4vw,48px)', borderTop:'0.5px solid rgba(255,255,255,.06)' }}>
          <h2 style={{ fontSize:28, fontWeight:800, textAlign:'center', letterSpacing:'-1px', marginBottom:8 }}>Los 48 equipos</h2>
          <p style={{ textAlign:'center', color:C.sub, marginBottom:24, fontSize:14 }}>12 grupos · 4 equipos cada uno</p>
          <div style={{ display:'flex', flexWrap:'wrap', gap:5, justifyContent:'center', marginBottom:16 }}>
            {Object.keys(GROUPS).map(g => (
              <button key={g} onClick={() => setActiveGroup(g)}
                style={{ padding:'5px 12px', border:`0.5px solid ${activeGroup===g ? C.gold : C.border}`, borderRadius:8, background: activeGroup===g ? 'rgba(255,214,10,.15)' : 'none', color: activeGroup===g ? C.gold : C.sub, fontWeight:700, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
                Gr. {g}
              </button>
            ))}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:7, maxWidth:800, margin:'0 auto' }}>
            {GROUPS[activeGroup].map((team, i) => (
              <div key={team} style={{ background:C.card, border:`0.5px solid ${C.border}`, borderRadius:10, padding:'10px 12px', display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontWeight:800, color:C.sub, fontSize:11, minWidth:14 }}>{i+1}</span>
                <span style={{ fontSize:12, fontWeight:600 }}>{team}</span>
              </div>
            ))}
          </div>
        </div>

        {liveResults.length > 0 && (
          <div style={{ padding:'clamp(24px,4vw,40px) clamp(16px,4vw,48px)', background:'rgba(255,255,255,.02)', borderTop:'0.5px solid rgba(255,255,255,.06)' }}>
            <h2 style={{ fontSize:24, fontWeight:800, textAlign:'center', letterSpacing:'-1px', marginBottom:20 }}>🔴 Últimos resultados</h2>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:8, maxWidth:1000, margin:'0 auto' }}>
              {liveResults.map(r => (
                <div key={r.match_id} style={{ background:C.card, border:`0.5px solid ${C.border}`, borderRadius:10, padding:'10px 12px', textAlign:'center' }}>
                  <div style={{ fontSize:10, color:C.sub, fontWeight:700, textTransform:'uppercase', letterSpacing:'.4px', marginBottom:5 }}>{r.match_id}</div>
                  <div style={{ fontSize:20, fontWeight:900, color:C.gold }}>{r.goals_home} – {r.goals_away}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TRANSPARENCIA — destacada */}
        <div style={{ padding:'clamp(28px,5vw,52px) clamp(16px,4vw,48px)', borderTop:'0.5px solid rgba(255,255,255,.06)', background:'linear-gradient(180deg,rgba(0,113,227,.06) 0%,transparent 100%)' }}>
          {/* Badge + título */}
          <div style={{ textAlign:'center', marginBottom:28 }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(0,113,227,.15)', border:'1px solid rgba(0,113,227,.35)', borderRadius:20, padding:'6px 16px', fontSize:12, fontWeight:800, color:'#4da3ff', letterSpacing:'.5px', textTransform:'uppercase', marginBottom:14 }}>
              🔍 Transparencia Total
            </div>
            <h2 style={{ fontSize:'clamp(22px,3vw,32px)', fontWeight:900, letterSpacing:'-1px', marginBottom:8, color:'#fff' }}>
              La quiniela más justa
            </h2>
            <p style={{ color:C.sub, fontSize:14, maxWidth:480, margin:'0 auto' }}>
              Reglas claras, sin trampa posible — así funciona desde el inicio hasta el final
            </p>
          </div>
          {/* Cards horizontales */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:12, maxWidth:960, margin:'0 auto' }}>
            {[
              { icon:'🔒', title:'Picks privados hasta el 11 Jun', desc:'Nadie ve la quiniela de otro antes del Mundial. Sin copias posibles.', color:'#0071e3', bg:'rgba(0,113,227,.12)' },
              { icon:'👁', title:'Públicas al iniciar', desc:'Al arrancar el torneo todas las quinielas son visibles para todos.', color:'#30d158', bg:'rgba(48,209,88,.1)' },
              { icon:'📧', title:'PDF oficial a todos', desc:'Antes del primer partido se envía respaldo con TODOS los picks por email.', color:'#ff9f0a', bg:'rgba(255,159,10,.1)' },
              { icon:'⚡', title:'Resultados automáticos', desc:'Sync cada 2 min desde fuentes oficiales. Sin entrada manual posible.', color:'#bf5af2', bg:'rgba(191,90,242,.1)' },
            ].map(({ icon, title, desc, color, bg }) => (
              <div key={title} style={{ background:bg, border:`1px solid ${color}30`, borderRadius:14, padding:'18px 16px', display:'flex', gap:12, alignItems:'flex-start' }}>
                <div style={{ fontSize:26, flexShrink:0 }}>{icon}</div>
                <div>
                  <div style={{ fontWeight:700, fontSize:13, color, marginBottom:5 }}>{title}</div>
                  <div style={{ fontSize:11.5, color:C.sub, lineHeight:1.65 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* TOP 10 EN VIVO */}
        {top10.length > 0 && (
          <div style={{ padding:'clamp(28px,5vw,52px) clamp(16px,4vw,48px)', borderTop:'0.5px solid rgba(255,255,255,.06)' }}>
            <div style={{ maxWidth:700, margin:'0 auto' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:8 }}>
                <div>
                  <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'rgba(255,214,10,.1)', border:'0.5px solid rgba(255,214,10,.25)', borderRadius:20, padding:'4px 12px', fontSize:11, fontWeight:800, color:C.gold, letterSpacing:'.4px', marginBottom:8 }}>
                    ⚡ En vivo
                  </div>
                  <h2 style={{ fontSize:'clamp(20px,3vw,28px)', fontWeight:900, letterSpacing:'-1px', color:'#fff' }}>
                    Top 10 — Tabla de Posiciones
                  </h2>
                </div>
              </div>
              <div style={{ background:C.card, border:`0.5px solid ${C.border}`, borderRadius:14, overflow:'hidden' }}>
                {/* Header */}
                <div style={{ display:'grid', gridTemplateColumns:'40px 1fr 80px', padding:'8px 16px', background:'rgba(255,255,255,.04)', borderBottom:`0.5px solid ${C.border}` }}>
                  {['POS','Quiniela / Jugador','Puntos'].map((h,i) => (
                    <span key={h} style={{ fontSize:9.5, fontWeight:700, textTransform:'uppercase', letterSpacing:'.4px', color:'#6e6e73', textAlign:i===2?'right':'left' }}>{h}</span>
                  ))}
                </div>
                {top10.map((r, i) => {
                  const medals = ['🥇','🥈','🥉']
                  return (
                    <div key={i} style={{ display:'grid', gridTemplateColumns:'40px 1fr 80px', padding:'10px 16px', borderBottom: i < top10.length-1 ? `0.5px solid ${C.border}` : 'none', alignItems:'center', background: i===0?'rgba(255,214,10,.04)':i<3?'rgba(255,255,255,.02)':'transparent' }}>
                      <div style={{ fontSize:i<3?18:13, fontWeight:700, color: i<3?C.gold:'#6e6e73' }}>
                        {i < 3 ? medals[i] : i+1}
                      </div>
                      <div>
                        <div style={{ fontWeight:700, fontSize:13, color:'#fff' }}>{r.quinielas?.name || '–'}</div>
                        <div style={{ fontSize:10.5, color:'#6e6e73', marginTop:1 }}>{r.quinielas?.profiles?.username || '–'}</div>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <span style={{ fontWeight:900, fontSize:15, color: i===0?C.gold:i<3?'#fff':'#6e6e73' }}>
                          {r.total_pts}
                        </span>
                        <span style={{ fontSize:10, color:'#6e6e73', marginLeft:2 }}>pts</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        <div style={{ padding:'clamp(32px,5vw,60px) clamp(16px,4vw,48px)', textAlign:'center', borderTop:'0.5px solid rgba(255,255,255,.06)' }}>
          <a href="/guia" style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(255,255,255,.06)', border:'0.5px solid rgba(255,255,255,.15)', borderRadius:12, padding:'12px 24px', color:'#fff', textDecoration:'none', fontSize:14, fontWeight:600 }}>
            📖 Ver guía completa de uso →
          </a>
        </div>

        <div style={{ padding:'14px clamp(16px,4vw,48px)', textAlign:'center', color:'#2a2a2c', fontSize:11, borderTop:'0.5px solid rgba(255,255,255,.04)', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:6 }}>
          <span>🏆 Quiniela Mundial 2026</span>
          <span>Resultados via football-data.org · Powered by Supabase + Netlify</span>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
