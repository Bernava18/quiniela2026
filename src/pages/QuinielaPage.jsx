import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase, savePick, getQuinielaPicks, downloadQuinielaBackup } from '../lib/supabase'
import { useResults } from '../hooks/useResults'
import { useAuth } from '../context/AuthContext'

// ─── Scoring engine (same logic as HTML) ────────────────────
function calcPts(pick, match, results) {
  const r = results[match.id]
  if (!r || r.hs == null || !pick || pick.h == null) return null
  const isGroup = /^[A-L][1-6]$/.test(match.id)
  if (isGroup) {
    const rR = r.hs > r.as ? 'H' : r.hs < r.as ? 'A' : 'D'
    const pR = pick.h > pick.a ? 'H' : pick.h < pick.a ? 'A' : 'D'
    const hOk = pick.h === r.hs, aOk = pick.a === r.as, resOk = rR === pR
    let pts = 0
    if (hOk) pts += 1; if (aOk) pts += 1; if (resOk) pts += 2
    if (hOk && aOk && resOk) pts += 1
    return pts
  } else {
    const hOk = pick.h === r.hs, aOk = pick.a === r.as
    const winOk = pick.win && r.win && pick.win === r.win
    let pts = 0
    if (hOk) pts += 1; if (aOk) pts += 1; if (winOk) pts += 2
    if (hOk && aOk && winOk) pts += 1
    return pts
  }
}

export default function QuinielaPage() {
  const { id: quinielaId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { results, loading: resultsLoading } = useResults()

  const [quiniela, setQuiniela] = useState(null)
  const [picks, setPicks]       = useState({})
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState({})
  const [totalPts, setTotalPts] = useState(0)
  const saveTimers = useRef({})

  useEffect(() => { load() }, [quinielaId])

  useEffect(() => {
    // Recalculate total points when results update
    let total = 0
    // Simple group pts sum
    Object.keys(picks).forEach(mid => {
      const pk = picks[mid]
      const pts = calcPts(pk, { id: mid }, results)
      if (pts != null) total += pts
    })
    setTotalPts(total)
  }, [picks, results])

  async function load() {
    setLoading(true)
    const { data: q } = await supabase.from('quinielas').select('*, profiles(username)').eq('id', quinielaId).single()
    if (!q || (q.user_id !== user.id && !q)) { navigate('/'); return }
    setQuiniela(q)
    const savedPicks = await getQuinielaPicks(quinielaId)
    setPicks(savedPicks)
    setLoading(false)
  }

  const setPick = useCallback((matchId, field, val) => {
    if (quiniela?.is_locked) return
    setPicks(prev => {
      const updated = {
        ...prev,
        [matchId]: { ...(prev[matchId]||{}), [field]: field==='h'||field==='a' ? (val===''?null:+val) : val }
      }
      // Auto-save after 1s
      clearTimeout(saveTimers.current[matchId])
      saveTimers.current[matchId] = setTimeout(async () => {
        setSaving(s => ({...s, [matchId]: true}))
        await savePick(quinielaId, matchId, updated[matchId])
        setSaving(s => ({...s, [matchId]: false}))
      }, 1000)
      return updated
    })
  }, [quinielaId, quiniela?.is_locked])

  if (loading || resultsLoading) {
    return <div style={{ textAlign:'center', padding:60, color:'#aeaeb2' }}>Cargando quiniela...</div>
  }

  const isLocked = quiniela?.is_locked
  const filledPicks = Object.keys(picks).filter(k => picks[k]?.h != null).length

  return (
    <div style={{ maxWidth:980, margin:'0 auto', padding:'24px 16px 80px' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:10 }}>
        <div>
          <button onClick={() => navigate('/')} style={{ border:'none', background:'none', cursor:'pointer', color:'#6e6e73', fontSize:13, padding:0, marginBottom:4 }}>← Mis Quinielas</button>
          <h1 style={{ fontSize:22, fontWeight:700 }}>{quiniela?.name}</h1>
          <p style={{ fontSize:13, color:'#6e6e73' }}>
            {filledPicks} de 104 partidos · {isLocked ? '🔒 Cerrada' : '✏️ Editable'}
          </p>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {totalPts > 0 && (
            <span style={{ background:'#ffd60a', color:'#7a5900', padding:'4px 14px', borderRadius:20, fontWeight:800, fontSize:16 }}>
              {totalPts} pts
            </span>
          )}
          <button onClick={() => downloadQuinielaBackup(quinielaId, quiniela?.name)}
            style={{ padding:'8px 14px', border:'0.5px solid rgba(0,0,0,.12)', borderRadius:9, background:'#fff', cursor:'pointer', fontSize:13, fontWeight:500 }}>
            💾 Respaldo
          </button>
        </div>
      </div>

      {isLocked && (
        <div style={{ background:'rgba(255,159,10,.1)', border:'1px solid rgba(255,159,10,.3)', borderRadius:10, padding:'10px 16px', marginBottom:16, fontSize:13, color:'#b06000' }}>
          🔒 Esta quiniela está cerrada. Puedes ver tus picks y puntos pero no modificarlos.
        </div>
      )}

      {/* The actual quiniela UI is embedded from the HTML file's logic */}
      {/* In production this would be the full groups + bracket interface */}
      {/* For now showing a placeholder that explains where the full UI goes */}
      <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,.08)', borderRadius:14, padding:24, textAlign:'center', color:'#6e6e73' }}>
        <div style={{ fontSize:32, marginBottom:12 }}>⚽</div>
        <p style={{ fontSize:15, fontWeight:600, color:'#1d1d1f', marginBottom:8 }}>
          Interfaz de picks integrada aquí
        </p>
        <p style={{ fontSize:13 }}>
          La vista completa de grupos A–L y la fase eliminatoria del archivo <code>quiniela2026.html</code> se integra aquí como componentes React, conectados a Supabase mediante las funciones <code>savePick()</code> y <code>getQuinielaPicks()</code> ya implementadas.
        </p>
        <p style={{ fontSize:12, marginTop:12, color:'#aeaeb2' }}>
          Picks guardados en BD: {filledPicks} · Puntos actuales: {totalPts}
        </p>
      </div>
    </div>
  )
}
