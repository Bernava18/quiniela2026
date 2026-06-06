import { useState } from 'react'
import { useLeaderboard } from '../hooks/useLeaderboard'
import { useAuth } from '../context/AuthContext'
import { supabase, getQuinielaPicks, getAllResults } from '../lib/supabase'

const MEDALS = ['🥇','🥈','🥉']

export default function LeaderboardPage() {
  const { rows, loading } = useLeaderboard()
  const { profile } = useAuth()
  const [viewing, setViewing]       = useState(null) // { name, quinielaName }
  const [iframeReady, setIframeReady] = useState(false)
  const iframeRef = useState(null)

  // Listen for iframe ready
  useState(() => {
    const handler = (e) => {
      if (e.data?.type === 'IFRAME_READY' && viewing) {
        loadViewerPicks()
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  })

  async function openViewer(row) {
    setViewing({
      quinielaId: row.quiniela_id,
      name: row.quinielas?.profiles?.username,
      quinielaName: row.quinielas?.name,
    })
    setIframeReady(false)
  }

  async function loadViewerPicks() {
    if (!viewing) return
    const [picks, results] = await Promise.all([
      getQuinielaPicks(viewing.quinielaId),
      getAllResults(),
    ])
    const iframe = document.getElementById('viewer-iframe')
    iframe?.contentWindow?.postMessage({
      type: 'INIT',
      data: {
        quinielaId: viewing.quinielaId,
        isLocked: true, // siempre solo lectura
        username: viewing.name,
        picks,
        results,
      }
    }, '*')
  }

  const myRows = rows.filter(r => r.quinielas?.profiles?.username === profile?.username)

  if (viewing) {
    return (
      <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 52px)' }}>
        {/* Header viewer */}
        <div style={{ background:'#fff', borderBottom:'0.5px solid rgba(0,0,0,.08)', padding:'8px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <button onClick={() => setViewing(null)}
              style={{ border:'none', background:'none', cursor:'pointer', color:'#6e6e73', fontSize:13, padding:0 }}>
              ← Tabla
            </button>
            <span style={{ color:'#e0e0e0' }}>|</span>
            <span style={{ fontWeight:700, fontSize:15 }}>{viewing.name}</span>
            <span style={{ fontSize:12, color:'#6e6e73' }}>{viewing.quinielaName}</span>
            <span style={{ fontSize:11, background:'rgba(255,159,10,.12)', color:'#b06000', padding:'2px 8px', borderRadius:6, fontWeight:600 }}>
              👁 Solo lectura
            </span>
          </div>
        </div>
        {/* Iframe en modo lectura */}
        {!iframeReady && (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'#aeaeb2' }}>
            ⚽ Cargando quiniela de {viewing.name}...
          </div>
        )}
        <iframe
          id="viewer-iframe"
          src="/quiniela2026_fixed.html"
          style={{ flex:1, border:'none', width:'100%', display: iframeReady ? 'block' : 'none' }}
          title={`Quiniela de ${viewing.name}`}
          onLoad={() => {
            setIframeReady(true)
            setTimeout(() => loadViewerPicks(), 500)
          }}
        />
      </div>
    )
  }

  return (
    <div style={{ maxWidth:900, margin:'0 auto', padding:'28px 16px' }}>
      <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:4 }}>
        <h1 style={{ fontSize:24, fontWeight:700, letterSpacing:'-.4px' }}>Tabla de Posiciones</h1>
        <span style={{ fontSize:12, color:'#ff453a', fontWeight:600 }}>● En vivo</span>
      </div>
      <p style={{ color:'#6e6e73', fontSize:13, marginBottom:20 }}>
        Click en cualquier jugador para ver su quiniela completa · {rows.length} quinielas registradas
      </p>

      {/* Mi posición */}
      {myRows.length > 0 && (
        <div style={{ background:'rgba(0,113,227,.06)', border:'1px solid rgba(0,113,227,.2)', borderRadius:12, padding:'12px 16px', marginBottom:16 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#0071e3', marginBottom:6 }}>TU POSICIÓN</div>
          {myRows.map(r => {
            const pos = rows.findIndex(x => x.quiniela_id === r.quiniela_id) + 1
            return (
              <div key={r.quiniela_id} style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontWeight:700, fontSize:16, minWidth:32 }}>#{pos}</span>
                <span style={{ flex:1, fontWeight:600 }}>{r.quinielas?.name}</span>
                <span style={{ fontSize:12, color:'#6e6e73' }}>
                  Grp:{r.grp_pts} · Cl:{r.clasif_pts} · El:{r.elim_pts} · Fin:{r.final_pts}
                </span>
                <span style={{ fontSize:18, fontWeight:800, color:'#0071e3' }}>{r.total_pts}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Tabla principal */}
      <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,.08)', borderRadius:14, boxShadow:'0 1px 3px rgba(0,0,0,.06)', marginBottom:16, overflow:'hidden' }}>
        {/* Header */}
        <div style={{ display:'grid', gridTemplateColumns:'36px 1fr 220px 60px', padding:'8px 14px', borderBottom:'0.5px solid rgba(0,0,0,.08)', gap:4, background:'#f9f9f9' }}>
          {['#','Jugador / Quiniela','Desglose','Total'].map((h,i) => (
            <span key={i} style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.4px', color:'#6e6e73', textAlign:i>=2?'right':'left' }}>{h}</span>
          ))}
        </div>

        {loading ? (
          <div style={{ padding:32, textAlign:'center', color:'#aeaeb2' }}>Cargando...</div>
        ) : rows.length === 0 ? (
          <div style={{ padding:32, textAlign:'center', color:'#aeaeb2' }}>
            Aún no hay quinielas con puntos registrados
          </div>
        ) : rows.map((r, i) => {
          const isMe = r.quinielas?.profiles?.username === profile?.username
          return (
            <div key={r.quiniela_id}
              onClick={() => openViewer(r)}
              style={{ display:'grid', gridTemplateColumns:'36px 1fr 220px 60px', padding:'11px 14px', gap:4, borderBottom:'0.5px solid rgba(0,0,0,.05)', cursor:'pointer', background: isMe ? 'rgba(0,113,227,.04)' : 'transparent', alignItems:'center', transition:'background .15s' }}
              onMouseOver={e => e.currentTarget.style.background = isMe ? 'rgba(0,113,227,.08)' : '#f9f9f9'}
              onMouseOut={e => e.currentTarget.style.background = isMe ? 'rgba(0,113,227,.04)' : 'transparent'}>

              <span style={{ fontSize:14, fontWeight:700 }}>{i<3 ? MEDALS[i] : i+1}</span>

              <div>
                <div style={{ fontWeight:600, fontSize:14, display:'flex', alignItems:'center', gap:6 }}>
                  {r.quinielas?.profiles?.username}
                  {isMe && <span style={{ fontSize:10, background:'rgba(0,113,227,.12)', color:'#0071e3', padding:'1px 6px', borderRadius:4, fontWeight:600 }}>Tú</span>}
                </div>
                <div style={{ fontSize:11, color:'#aeaeb2', marginTop:1 }}>{r.quinielas?.name}</div>
              </div>

              <div style={{ textAlign:'right', fontSize:11, color:'#6e6e73' }}>
                Grp <strong>{r.grp_pts}</strong> · Cl <strong>{r.clasif_pts}</strong> · El <strong>{r.elim_pts}</strong> · Fin <strong>{r.final_pts}</strong>
              </div>

              <span style={{ fontSize:18, fontWeight:800, color:'#0071e3', textAlign:'right' }}>{r.total_pts}</span>
            </div>
          )
        })}
      </div>

      {/* Sistema de puntos */}
      <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,.08)', borderRadius:14, padding:'16px', boxShadow:'0 1px 3px rgba(0,0,0,.04)' }}>
        <div style={{ fontWeight:700, marginBottom:12, fontSize:15 }}>Sistema de puntos</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px 24px', fontSize:13, color:'#1d1d1f' }}>
          <div>Goles local exactos → <strong>1 pt</strong></div>
          <div>Goles visitante exactos → <strong>1 pt</strong></div>
          <div>Resultado G/E/P / Quién avanza → <strong>2 pts</strong></div>
          <div>🎯 Bonus todo correcto → <strong>+1 pt</strong></div>
          <div>Posición exacta en grupo → <strong>1 pt c/u</strong></div>
          <div>🏆 Campeón / 🥈 Sub / 🥉 3ro / 4to → <strong>20/10/5/3</strong></div>
        </div>
      </div>
    </div>
  )
}
