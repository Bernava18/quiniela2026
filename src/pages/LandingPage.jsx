import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L']
const LOCK_DATE = new Date('2026-06-11T18:00:00Z')

export default function LandingPage() {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const [stats, setStats]     = useState({ players: 0, quinielas: 0, topPlayer: null, topPts: 0 })
  const [timeLeft, setTimeLeft] = useState({})
  const [results, setResults] = useState({})

  useEffect(() => {
    if (user) navigate('/')
  }, [user])

  useEffect(() => {
    loadStats()
    loadResults()
    const timer = setInterval(() => setTimeLeft(calcTimeLeft()), 1000)
    return () => clearInterval(timer)
  }, [])

  async function loadStats() {
    const [{ count: players }, { count: quinielas }, { data: top }] = await Promise.all([
      supabase.from('profiles').select('*', { count:'exact', head:true }),
      supabase.from('quinielas').select('*', { count:'exact', head:true }),
      supabase.from('scores').select('total_pts, quinielas(profiles(username))').order('total_pts', { ascending:false }).limit(1),
    ])
    setStats({
      players:   players || 0,
      quinielas: quinielas || 0,
      topPlayer: top?.[0]?.quinielas?.profiles?.username || null,
      topPts:    top?.[0]?.total_pts || 0,
    })
  }

  async function loadResults() {
    const { data } = await supabase.from('match_results').select('match_id, goals_home, goals_away, status')
    const map = {}
    data?.forEach(r => { map[r.match_id] = r })
    setResults(map)
  }

  function calcTimeLeft() {
    const diff = LOCK_DATE - new Date()
    if (diff <= 0) return { expired: true }
    return {
      days:    Math.floor(diff / 86400000),
      hours:   Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
    }
  }

  const finishedMatches = Object.values(results).filter(r => r.status === 'finished').length
  const liveMatches     = Object.values(results).filter(r => r.status === 'live').length

  const s = { fontFamily:'-apple-system,"DM Sans",sans-serif', background:'#0a0a0f', color:'#fff', minHeight:'100vh' }

  return (
    <div style={s}>

      {/* NAV */}
      <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:100, background:'rgba(10,10,15,.85)', backdropFilter:'blur(20px)', borderBottom:'0.5px solid rgba(255,255,255,.08)', height:56, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 24px' }}>
        <div style={{ fontWeight:800, fontSize:16, background:'linear-gradient(135deg,#ffd60a,#ff9f0a)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
          🏆 Quiniela Mundial 2026
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <Link to="/login" style={{ padding:'7px 16px', border:'0.5px solid rgba(255,255,255,.2)', borderRadius:9, color:'#fff', textDecoration:'none', fontSize:13, fontWeight:500 }}>
            Entrar
          </Link>
          <Link to="/register" style={{ padding:'7px 16px', background:'linear-gradient(135deg,#ffd60a,#ff9f0a)', border:'none', borderRadius:9, color:'#000', textDecoration:'none', fontSize:13, fontWeight:700 }}>
            Registrarse
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'80px 20px 40px', textAlign:'center', background:'radial-gradient(ellipse at 50% 0%, rgba(255,214,10,.12) 0%, transparent 60%)' }}>
        <div style={{ fontSize:72, marginBottom:16 }}>🏆</div>
        <h1 style={{ fontSize:'clamp(32px,6vw,72px)', fontWeight:900, lineHeight:1.1, letterSpacing:'-2px', marginBottom:16, background:'linear-gradient(135deg,#fff 0%,#aeaeb2 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
          Quiniela Mundial<br/>FIFA 2026
        </h1>
        <p style={{ fontSize:'clamp(16px,2vw,22px)', color:'#6e6e73', maxWidth:520, lineHeight:1.6, marginBottom:36 }}>
          Pronostica los 104 partidos del Mundial, compite con amigos y sigue los resultados en tiempo real.
        </p>

        {/* CTA buttons */}
        <div style={{ display:'flex', gap:12, flexWrap:'wrap', justifyContent:'center', marginBottom:48 }}>
          <Link to="/register" style={{ padding:'14px 32px', background:'linear-gradient(135deg,#ffd60a,#ff9f0a)', borderRadius:12, color:'#000', textDecoration:'none', fontSize:16, fontWeight:800, boxShadow:'0 8px 32px rgba(255,214,10,.3)' }}>
            ⚽ Crear mi quiniela
          </Link>
          <Link to="/login" style={{ padding:'14px 32px', background:'rgba(255,255,255,.08)', border:'0.5px solid rgba(255,255,255,.15)', borderRadius:12, color:'#fff', textDecoration:'none', fontSize:16, fontWeight:600 }}>
            Ya tengo cuenta →
          </Link>
        </div>

        {/* Countdown */}
        {!timeLeft.expired ? (
          <div style={{ background:'rgba(255,255,255,.04)', border:'0.5px solid rgba(255,255,255,.1)', borderRadius:16, padding:'20px 32px', marginBottom:40 }}>
            <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', color:'#6e6e73', marginBottom:12 }}>
              ⏳ Cierre de quinielas — 11 Jun 2026
            </div>
            <div style={{ display:'flex', gap:24, alignItems:'center' }}>
              {[['days','Días'],['hours','Horas'],['minutes','Min'],['seconds','Seg']].map(([k,l]) => (
                <div key={k} style={{ textAlign:'center' }}>
                  <div style={{ fontSize:'clamp(28px,4vw,48px)', fontWeight:900, fontVariantNumeric:'tabular-nums', background:'linear-gradient(135deg,#ffd60a,#ff9f0a)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
                    {String(timeLeft[k]||0).padStart(2,'0')}
                  </div>
                  <div style={{ fontSize:10, color:'#6e6e73', fontWeight:600, textTransform:'uppercase', letterSpacing:'.5px' }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ background:'rgba(255,69,58,.1)', border:'0.5px solid rgba(255,69,58,.3)', borderRadius:12, padding:'12px 24px', marginBottom:40, color:'#ff453a', fontWeight:600 }}>
            🔒 Las quinielas están cerradas — el Mundial ya comenzó
          </div>
        )}

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:12, maxWidth:600, width:'100%' }}>
          {[
            ['⚽', '104', 'Partidos totales'],
            ['👥', stats.players, 'Participantes'],
            ['📋', stats.quinielas, 'Quinielas creadas'],
            ['🏅', finishedMatches, 'Partidos jugados'],
          ].map(([icon, val, label]) => (
            <div key={label} style={{ background:'rgba(255,255,255,.04)', border:'0.5px solid rgba(255,255,255,.08)', borderRadius:12, padding:'16px 12px', textAlign:'center' }}>
              <div style={{ fontSize:24, marginBottom:4 }}>{icon}</div>
              <div style={{ fontSize:28, fontWeight:800, color:'#ffd60a' }}>{val}</div>
              <div style={{ fontSize:11, color:'#6e6e73', fontWeight:500 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* COMO FUNCIONA */}
      <div style={{ padding:'60px 20px', maxWidth:900, margin:'0 auto' }}>
        <h2 style={{ fontSize:'clamp(24px,4vw,40px)', fontWeight:800, textAlign:'center', marginBottom:8, letterSpacing:'-1px' }}>
          ¿Cómo funciona?
        </h2>
        <p style={{ textAlign:'center', color:'#6e6e73', marginBottom:40, fontSize:16 }}>Simple, rápido y en tiempo real</p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:16 }}>
          {[
            ['1️⃣','Regístrate','Crea tu cuenta en segundos, sin pago, sin tarjeta.'],
            ['2️⃣','Crea tu quiniela','Ponle nombre y llena tus 104 pronósticos antes del 11 Jun.'],
            ['3️⃣','Sigue el Mundial','Los resultados se actualizan solos cada 2 minutos.'],
            ['4️⃣','Compite','Ve en tiempo real cómo suben tus puntos y tu posición.'],
          ].map(([num,title,desc]) => (
            <div key={title} style={{ background:'rgba(255,255,255,.03)', border:'0.5px solid rgba(255,255,255,.08)', borderRadius:14, padding:'24px 20px' }}>
              <div style={{ fontSize:32, marginBottom:12 }}>{num}</div>
              <div style={{ fontWeight:700, fontSize:16, marginBottom:8 }}>{title}</div>
              <div style={{ color:'#6e6e73', fontSize:13, lineHeight:1.6 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* SISTEMA DE PUNTOS */}
      <div style={{ padding:'40px 20px 60px', maxWidth:900, margin:'0 auto' }}>
        <h2 style={{ fontSize:'clamp(24px,4vw,40px)', fontWeight:800, textAlign:'center', marginBottom:8, letterSpacing:'-1px' }}>
          Sistema de puntos
        </h2>
        <p style={{ textAlign:'center', color:'#6e6e73', marginBottom:40, fontSize:16 }}>Máximo 606 puntos en todo el torneo</p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:12 }}>
          {[
            { icon:'⚽', title:'Por partido', color:'#0071e3', items:['Goles local exactos → 1 pt','Goles visitante exactos → 1 pt','Resultado G/E/P correcto → 2 pts','🎯 Bonus todo correcto → +1 pt','Máximo 5 pts por partido'] },
            { icon:'📊', title:'Clasificación de grupos', color:'#30d158', items:['1 pt por posición exacta','4 posiciones por grupo','12 grupos en total','Máximo 48 pts'] },
            { icon:'🏆', title:'Orden final', color:'#ffd60a', items:['🥇 Campeón exacto → 20 pts','🥈 Subcampeón → 10 pts','🥉 3er lugar → 5 pts','4to lugar → 3 pts'] },
          ].map(({ icon, title, color, items }) => (
            <div key={title} style={{ background:'rgba(255,255,255,.03)', border:`0.5px solid ${color}33`, borderRadius:14, padding:'24px 20px' }}>
              <div style={{ fontSize:28, marginBottom:8 }}>{icon}</div>
              <div style={{ fontWeight:700, fontSize:15, marginBottom:12, color }}>{title}</div>
              {items.map(item => (
                <div key={item} style={{ fontSize:13, color:'#aeaeb2', padding:'4px 0', borderBottom:'0.5px solid rgba(255,255,255,.05)', lineHeight:1.5 }}>{item}</div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* LEADERBOARD PREVIEW */}
      {stats.topPlayer && (
        <div style={{ padding:'40px 20px', maxWidth:600, margin:'0 auto', textAlign:'center' }}>
          <h2 style={{ fontSize:28, fontWeight:800, marginBottom:24, letterSpacing:'-1px' }}>🥇 Líder actual</h2>
          <div style={{ background:'linear-gradient(135deg,rgba(255,214,10,.1),rgba(255,159,10,.05))', border:'0.5px solid rgba(255,214,10,.3)', borderRadius:16, padding:'24px', display:'inline-flex', alignItems:'center', gap:16 }}>
            <div style={{ fontSize:48 }}>👑</div>
            <div style={{ textAlign:'left' }}>
              <div style={{ fontWeight:800, fontSize:22 }}>{stats.topPlayer}</div>
              <div style={{ color:'#ffd60a', fontWeight:700, fontSize:18 }}>{stats.topPts} pts</div>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER CTA */}
      <div style={{ padding:'60px 20px', textAlign:'center', borderTop:'0.5px solid rgba(255,255,255,.06)' }}>
        <h2 style={{ fontSize:'clamp(24px,4vw,40px)', fontWeight:800, marginBottom:12, letterSpacing:'-1px' }}>
          ¿Listo para competir?
        </h2>
        <p style={{ color:'#6e6e73', marginBottom:28, fontSize:16 }}>
          Regístrate gratis y crea tu quiniela antes del 11 de junio
        </p>
        <Link to="/register" style={{ padding:'16px 40px', background:'linear-gradient(135deg,#ffd60a,#ff9f0a)', borderRadius:12, color:'#000', textDecoration:'none', fontSize:17, fontWeight:800, display:'inline-block', boxShadow:'0 8px 32px rgba(255,214,10,.25)' }}>
          ⚽ Crear mi quiniela gratis
        </Link>
      </div>

      {/* FOOTER */}
      <div style={{ padding:'20px', textAlign:'center', color:'#3a3a3c', fontSize:12, borderTop:'0.5px solid rgba(255,255,255,.04)' }}>
        Quiniela Mundial 2026 · Datos via football-data.org · Hecho con ❤️
      </div>
    </div>
  )
}
