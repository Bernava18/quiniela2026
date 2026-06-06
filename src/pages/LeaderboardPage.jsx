import { useState } from 'react'
import { useLeaderboard } from '../hooks/useLeaderboard'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const MEDALS = ['🥇','🥈','🥉']

export default function LeaderboardPage() {
  const { rows, loading } = useLeaderboard()
  const { profile } = useAuth()
  const [selected, setSelected] = useState(null)
  const [detail, setDetail]     = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  async function loadDetail(row) {
    setSelected(row)
    setLoadingDetail(true)
    // Load picks for this quiniela
    const { data: picks } = await supabase
      .from('picks')
      .select('*')
      .eq('quiniela_id', row.quiniela_id)
    setDetail(picks || [])
    setLoadingDetail(false)
  }

  const myRows = rows.filter(r => r.quinielas?.profiles?.username === profile?.username)

  return (
    <div style={{ maxWidth:900, margin:'0 auto', padding:'28px 16px' }}>
      <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:4 }}>
        <h1 style={{ fontSize:24, fontWeight:700, letterSpacing:'-.4px' }}>Tabla de Posiciones</h1>
        <span style={{ fontSize:12, color:'#ff453a', fontWeight:600 }}>● En vivo</span>
      </div>
      <p style={{ color:'#6e6e73', fontSize:13, marginBottom:20 }}>
        Actualización automática via Supabase Realtime · {rows.length} quinielas
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
                <span style={{ fontSize:12, color:'#6e6e73' }}>Grp:{r.grp_pts} Cl:{r.clasif_pts} El:{r.elim_pts} Fin:{r.final_pts}</span>
                <span style={{ fontSize:18, fontWeight:800, color:'#0071e3' }}>{r.total_pts}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Tabla principal */}
      <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,.08)', borderRadius:14, boxShadow:'0 1px 3px rgba(0,0,0,.06)', marginBottom:16, overflow:'hidden' }}>
        {/* Header */}
        <div style={{ display:'grid', gridTemplateColumns:'36px 1fr 180px auto 52px', padding:'8px 14px', borderBottom:'0.5px solid rgba(0,0,0,.08)', gap:4 }}>
          {['#','Jugador / Quiniela','Desglose','','Total'].map((h,i) => (
            <span key={i} style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.4px', color:'#6e6e73', textAlign: i>=2?'right':'left' }}>{h}</span>
          ))}
        </div>

        {loading ? (
          <div style={{ padding:32, textAlign:'center', color:'#aeaeb2' }}>Cargando...</div>
        ) : rows.map((r, i) => {
          const isMe = r.quinielas?.profiles?.username === profile?.username
          return (
            <div key={r.quiniela_id}
              onClick={() => loadDetail(r)}
              style={{ display:'grid', gridTemplateColumns:'36px 1fr 180px auto 52px', padding:'10px 14px', gap:4, borderBottom:'0.5px solid rgba(0,0,0,.05)', cursor:'pointer', background: isMe ? 'rgba(0,113,227,.04)' : 'transparent', alignItems:'center', transition:'background .1s' }}
              onMouseOver={e => e.currentTarget.style.background = isMe ? 'rgba(0,113,227,.08)' : 'var(--surface2)'}
              onMouseOut={e => e.currentTarget.style.background = isMe ? 'rgba(0,113,227,.04)' : 'transparent'}>

              <span style={{ fontSize:13, fontWeight:700, color:'#6e6e73' }}>{i<3 ? MEDALS[i] : i+1}</span>

              <div>
                <div style={{ fontWeight:600, fontSize:14, display:'flex', alignItems:'center', gap:6 }}>
                  {r.quinielas?.profiles?.username}
                  {isMe && <span style={{ fontSize:10, background:'rgba(0,113,227,.12)', color:'#0071e3', padding:'1px 6px', borderRadius:4, fontWeight:600 }}>Tú</span>}
                </div>
                <div style={{ fontSize:11, color:'#aeaeb2' }}>{r.quinielas?.name}</div>
              </div>

              <div style={{ textAlign:'right', fontSize:11, color:'#6e6e73', lineHeight:1.6 }}>
                <span>Grp <strong>{r.grp_pts}</strong></span>{'  '}
                <span>Cl <strong>{r.clasif_pts}</strong></span>{'  '}
                <span>El <strong>{r.elim_pts}</strong></span>{'  '}
                <span>Fin <strong>{r.final_pts}</strong></span>
              </div>

              <div/>

              <span style={{ fontSize:18, fontWeight:800, color:'#0071e3', textAlign:'right' }}>{r.total_pts}</span>
            </div>
          )
        })}
      </div>

      {/* Panel de detalle */}
      {selected && (
        <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,.08)', borderRadius:14, boxShadow:'0 1px 3px rgba(0,0,0,.06)', overflow:'hidden' }}>
          <div style={{ padding:'14px 16px', borderBottom:'0.5px solid rgba(0,0,0,.08)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <span style={{ fontWeight:700, fontSize:15 }}>{selected.quinielas?.profiles?.username}</span>
              <span style={{ marginLeft:8, fontSize:12, color:'#6e6e73' }}>{selected.quinielas?.name}</span>
            </div>
            <button onClick={() => { setSelected(null); setDetail(null) }}
              style={{ border:'none', background:'none', cursor:'pointer', fontSize:18, color:'#6e6e73' }}>✕</button>
          </div>

          {/* Resumen por fase */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8, padding:16, borderBottom:'0.5px solid rgba(0,0,0,.08)' }}>
            {[
              ['Partidos grupos', selected.grp_pts,    '#0071e3'],
              ['Clasificación',   selected.clasif_pts, '#ff9f0a'],
              ['Eliminatorias',   selected.elim_pts,   '#30d158'],
              ['Orden final',     selected.final_pts,  '#ffd60a'],
              ['TOTAL',           selected.total_pts,  '#0071e3'],
            ].map(([label, val, color]) => (
              <div key={label} style={{ textAlign:'center', padding:'10px 6px', background:'#f2f2f4', borderRadius:10 }}>
                <div style={{ fontSize:10, fontWeight:600, color:'#6e6e73', textTransform:'uppercase', letterSpacing:'.3px', marginBottom:4 }}>{label}</div>
                <div style={{ fontSize:22, fontWeight:800, color }}>{val ?? 0}</div>
              </div>
            ))}
          </div>

          {/* Comparar con otros */}
          {selected.quinielas?.profiles?.username !== profile?.username && myRows.length > 0 && (
            <div style={{ padding:'10px 16px', background:'rgba(0,113,227,.04)', borderBottom:'0.5px solid rgba(0,0,0,.08)' }}>
              {myRows.map(myRow => {
                const diff = selected.total_pts - myRow.total_pts
                return (
                  <div key={myRow.quiniela_id} style={{ fontSize:13 }}>
                    Diferencia vs <strong>{myRow.quinielas?.name}</strong>:{' '}
                    <strong style={{ color: diff > 0 ? '#ff453a' : diff < 0 ? '#30d158' : '#6e6e73' }}>
                      {diff > 0 ? '+' : ''}{diff} pts
                    </strong>
                  </div>
                )
              })}
            </div>
          )}

          {/* Lista de picks */}
          {loadingDetail ? (
            <div style={{ padding:24, textAlign:'center', color:'#aeaeb2' }}>Cargando picks...</div>
          ) : detail && (
            <div style={{ padding:16 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'#6e6e73', textTransform:'uppercase', letterSpacing:'.4px', marginBottom:10 }}>
                Picks registrados ({detail.length} de 104)
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:6 }}>
                {detail.slice(0,20).map(p => (
                  <div key={p.match_id} style={{ background:'#f2f2f4', borderRadius:8, padding:'6px 10px', fontSize:12 }}>
                    <span style={{ fontWeight:700, color:'#0071e3' }}>{p.match_id}</span>{' '}
                    {p.goals_home ?? '?'} – {p.goals_away ?? '?'}
                    {p.winner && <div style={{ fontSize:10, color:'#6e6e73' }}>→ {p.winner}</div>}
                  </div>
                ))}
                {detail.length > 20 && (
                  <div style={{ background:'#f2f2f4', borderRadius:8, padding:'6px 10px', fontSize:12, color:'#6e6e73' }}>
                    +{detail.length - 20} más...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Leyenda de puntos */}
      <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,.08)', borderRadius:14, padding:'16px', marginTop:16, boxShadow:'0 1px 3px rgba(0,0,0,.04)' }}>
        <div style={{ fontWeight:700, marginBottom:12 }}>Sistema de puntos</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px 24px', fontSize:13, color:'#1d1d1f' }}>
          <div>Goles local exactos → <strong>1 pt</strong></div>
          <div>Goles visitante exactos → <strong>1 pt</strong></div>
          <div>Resultado G/E/P / Quién avanza → <strong>2 pts</strong></div>
          <div>🎯 Bonus todo correcto → <strong>+1 pt</strong></div>
          <div>Posición exacta en grupo → <strong>1 pt c/u</strong></div>
          <div>🏆 Campeón / 🥈 Sub / 🥉 3ro / 4to → <strong>20/10/5/3 pts</strong></div>
        </div>
      </div>
    </div>
  )
}
