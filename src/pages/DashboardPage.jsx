import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getMyQuinielas, createQuiniela, deleteQuiniela, downloadQuinielaBackup, supabase } from '../lib/supabase'

const LOCK_DATE = new Date('2026-06-11T18:00:00Z')
const TOTAL_PICKS = 104

// Partidos por fase para el desglose
const PHASES = {
  'Grupos (A-L)':     Array.from({length:72}, (_,i) => { const g=String.fromCharCode(65+Math.floor(i/6)); return `${g}${i%6+1}` }),
  'R32':              Array.from({length:16}, (_,i) => `M${73+i}`),
  'Octavos':          Array.from({length:8},  (_,i) => `M${89+i}`),
  'Cuartos':          Array.from({length:4},  (_,i) => `M${97+i}`),
  'Semis':            ['M101','M102'],
  '3er Puesto':       ['M103'],
  'Final':            ['M104'],
}

function ProgressBar({ value, max, color='#0071e3' }) {
  const pct = max > 0 ? Math.round((value/max)*100) : 0
  return (
    <div style={{ background:'#f2f2f7', borderRadius:20, height:8, overflow:'hidden', flex:1 }}>
      <div style={{ width:`${pct}%`, height:'100%', borderRadius:20,
        background: pct===100 ? '#30d158' : pct>=50 ? color : '#ff9f0a',
        transition:'width .3s ease' }} />
    </div>
  )
}

export default function DashboardPage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [quinielas, setQuinielas]   = useState([])
  const [progress, setProgress]     = useState({}) // { quinielaId: { phase: count } }
  const [loading, setLoading]       = useState(true)
  const [creating, setCreating]     = useState(false)
  const [newName, setNewName]       = useState('')
  const [expanded, setExpanded]     = useState(null)
  const [renaming, setRenaming]     = useState(null) // quinielaId being renamed
  const [renameTxt, setRenameTxt]   = useState('')
  const [renameSaving, setRenameSaving] = useState(false)

  const isLocked  = new Date() >= LOCK_DATE
  const daysLeft  = Math.max(0, Math.floor((LOCK_DATE - new Date()) / 86400000))
  const hoursLeft = Math.max(0, Math.floor((LOCK_DATE - new Date()) / 3600000) % 24)

  useEffect(() => { load() }, [user])

  async function load() {
    setLoading(true)
    const { data } = await getMyQuinielas(user.id)
    setQuinielas(data || [])

    // Load picks progress for each quiniela
    if (data?.length > 0) {
      const qids = data.map(q => q.id)
      const { data: picks } = await supabase
        .from('picks')
        .select('quiniela_id, match_id, goals_home, goals_away')
        .in('quiniela_id', qids)

      const prog = {}
      qids.forEach(qid => {
        prog[qid] = {}
        Object.entries(PHASES).forEach(([phase, ids]) => {
          const filled = picks?.filter(p =>
            p.quiniela_id === qid &&
            ids.includes(p.match_id) &&
            p.goals_home != null
          ).length || 0
          prog[qid][phase] = { filled, total: ids.length }
        })
        prog[qid]._total = picks?.filter(p =>
          p.quiniela_id === qid && p.goals_home != null
        ).length || 0
      })
      setProgress(prog)
    }
    setLoading(false)
  }

  async function handleCreate() {
    if (!newName.trim()) return
    setCreating(true)
    const { data, error } = await createQuiniela(user.id, newName.trim())
    if (!error && data) {
      setNewName('')
      navigate(`/quiniela/${data.id}`)
    }
    setCreating(false)
  }

  async function handleDelete(id, name) {
    if (!confirm(`¿Eliminar "${name}"?`)) return
    await deleteQuiniela(id)
    load()
  }

  async function handleRename(id) {
    if (!renameTxt.trim()) return
    setRenameSaving(true)
    await supabase.from('quinielas').update({ name: renameTxt.trim() }).eq('id', id)
    setRenaming(null)
    setRenameTxt('')
    setRenameSaving(false)
    load()
  }

  const getMissingPhases = (qid) => {
    const prog = progress[qid]
    if (!prog) return []
    return Object.entries(PHASES)
      .filter(([phase]) => prog[phase] && prog[phase].filled < prog[phase].total)
      .map(([phase]) => ({ phase, filled: prog[phase].filled, total: prog[phase].total }))
  }

  return (
    <div style={{ maxWidth:720, margin:'0 auto', padding:'28px 16px' }}>

      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:24, fontWeight:800, letterSpacing:'-.5px' }}>
          👋 Hola, {profile?.username}
        </h1>

        {/* Countdown / Lock warning */}
        {!isLocked ? (
          <div style={{ marginTop:10, background: daysLeft<=2 ? 'rgba(255,69,58,.08)' : 'rgba(255,159,10,.08)',
            border:`1px solid ${daysLeft<=2 ? 'rgba(255,69,58,.25)' : 'rgba(255,159,10,.25)'}`,
            borderRadius:12, padding:'12px 16px', display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:20 }}>{daysLeft<=2 ? '🚨' : '⏳'}</span>
            <div>
              <div style={{ fontWeight:700, fontSize:14, color: daysLeft<=2 ? '#c0392b' : '#b06000' }}>
                {daysLeft<=2
                  ? `¡Quedan solo ${daysLeft}d ${hoursLeft}h para el cierre!`
                  : `Cierre de quinielas en ${daysLeft} días`}
              </div>
              <div style={{ fontSize:12, color:'#6e6e73', marginTop:2 }}>
                11 Jun 2026 · Después no podrás modificar tus picks
              </div>
            </div>
          </div>
        ) : (
          <div style={{ marginTop:10, background:'rgba(255,69,58,.08)', border:'1px solid rgba(255,69,58,.25)', borderRadius:12, padding:'12px 16px', color:'#c0392b', fontWeight:600, fontSize:14 }}>
            🔒 El Mundial comenzó — las quinielas están cerradas
          </div>
        )}
      </div>

      {/* Crear nueva quiniela */}
      {!isLocked && (
        <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,.08)', borderRadius:14, padding:'16px 18px', marginBottom:20, boxShadow:'0 1px 3px rgba(0,0,0,.06)' }}>
          <div style={{ fontWeight:700, marginBottom:10 }}>➕ Nueva quiniela</div>
          <div style={{ display:'flex', gap:8 }}>
            <input value={newName} onChange={e=>setNewName(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&handleCreate()}
              placeholder="Nombre de tu quiniela"
              style={{ flex:1, padding:'9px 12px', border:'1px solid rgba(0,0,0,.14)', borderRadius:9, fontSize:14, outline:'none', fontFamily:'inherit' }} />
            <button onClick={handleCreate} disabled={creating||!newName.trim()}
              style={{ padding:'9px 18px', background:'#0071e3', color:'#fff', border:'none', borderRadius:9, fontWeight:600, cursor:'pointer', fontSize:14, opacity:(creating||!newName.trim())?.5:1 }}>
              {creating?'...':'Crear'}
            </button>
          </div>
        </div>
      )}

      {/* Lista quinielas */}
      <div style={{ fontWeight:700, marginBottom:10, color:'#6e6e73', textTransform:'uppercase', fontSize:11, letterSpacing:'.4px' }}>
        Mis quinielas ({quinielas.length})
      </div>

      {loading ? <div style={{ color:'#aeaeb2', padding:20, textAlign:'center' }}>Cargando...</div> :
        quinielas.length === 0 ? (
          <div style={{ textAlign:'center', padding:'40px 20px', color:'#6e6e73', background:'#fff', borderRadius:14, border:'0.5px solid rgba(0,0,0,.08)' }}>
            No tienes quinielas aún. Crea una arriba.
          </div>
        ) : quinielas.map(q => {
          const prog = progress[q.id]
          const total = prog?._total || 0
          const pct = Math.round((total/TOTAL_PICKS)*100)
          const missing = getMissingPhases(q.id)
          const isComplete = total === TOTAL_PICKS
          const isExpanded = expanded === q.id

          return (
            <div key={q.id} style={{ background:'#fff', border:`1px solid ${isComplete ? 'rgba(48,209,88,.3)' : missing.length>0&&!isLocked ? 'rgba(255,159,10,.3)' : 'rgba(0,0,0,.08)'}`, borderRadius:14, marginBottom:12, boxShadow:'0 1px 4px rgba(0,0,0,.06)', overflow:'hidden' }}>

              {/* Main row */}
              <div style={{ padding:'14px 16px', display:'flex', alignItems:'center', gap:12, cursor:'pointer' }}
                onClick={() => navigate(`/quiniela/${q.id}`)}>

                {/* Status icon */}
                <div style={{ fontSize:22, flexShrink:0 }}>
                  {isComplete ? '✅' : total===0 ? '📋' : '⚠️'}
                </div>

                <div style={{ flex:1, minWidth:0 }}>
                  {renaming === q.id ? (
                    <div style={{ display:'flex', gap:6, alignItems:'center' }} onClick={e=>e.stopPropagation()}>
                      <input
                        autoFocus
                        value={renameTxt}
                        onChange={e=>setRenameTxt(e.target.value)}
                        onKeyDown={e=>{ if(e.key==='Enter') handleRename(q.id); if(e.key==='Escape') setRenaming(null) }}
                        style={{ flex:1, padding:'5px 10px', border:'1.5px solid #0071e3', borderRadius:7, fontSize:14, fontWeight:700, outline:'none', fontFamily:'inherit' }}
                      />
                      <button onClick={()=>handleRename(q.id)} disabled={renameSaving||!renameTxt.trim()}
                        style={{ padding:'5px 12px', background:'#0071e3', color:'#fff', border:'none', borderRadius:7, fontWeight:700, fontSize:12, cursor:'pointer' }}>
                        {renameSaving?'...':'✓'}
                      </button>
                      <button onClick={()=>setRenaming(null)}
                        style={{ padding:'5px 10px', background:'#f2f2f7', color:'#6e6e73', border:'none', borderRadius:7, fontWeight:600, fontSize:12, cursor:'pointer' }}>
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div style={{ fontWeight:700, fontSize:15 }}>{q.name}</div>
                  )}
                  <div style={{ fontSize:11, color:'#6e6e73', marginTop:2 }}>
                    {new Date(q.created_at).toLocaleDateString('es-MX',{day:'numeric',month:'short',year:'numeric'})}
                    {q.is_locked && <span style={{ marginLeft:8, color:'#ff9f0a' }}>🔒 Cerrada</span>}
                  </div>

                  {/* Progress bar */}
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:8 }}>
                    <ProgressBar value={total} max={TOTAL_PICKS} />
                    <span style={{ fontSize:11, fontWeight:700, color: isComplete?'#30d158':total>0?'#ff9f0a':'#aeaeb2', flexShrink:0 }}>
                      {total}/{TOTAL_PICKS} picks
                    </span>
                  </div>
                </div>

                {/* Points badge — GRAN TOTAL (grupos + clasificación + eliminatoria + final) */}
                <div style={{ flexShrink:0, textAlign:'right' }}>
                  {(() => {
                    const s = q.scores || {}
                    const grp = s.grp_pts || 0
                    const clasif = s.clasif_pts || 0
                    const elim = q.elim_pts || 0
                    const fin = q.final_pts || 0
                    const granTotal = grp + clasif + elim + fin
                    return (
                      <span style={{ background:'#ffd60a', color:'#7a5900', padding:'3px 10px', borderRadius:20, fontWeight:800, fontSize:14 }}>
                        {granTotal} pts
                      </span>
                    )
                  })()}
                </div>

                {/* Action buttons */}
                <div style={{ display:'flex', gap:6, flexShrink:0 }} onClick={e=>e.stopPropagation()}>
                  <button onClick={()=>navigate(`/fase-final/${q.id}`)}
                    title="Fase Final — equipos reales del Mundial"
                    style={{ padding:'5px 12px', border:'none', borderRadius:7, cursor:'pointer', fontSize:12, fontWeight:800, color:'#fff',
                      background:'linear-gradient(135deg,#ff8a00,#e52e71)', boxShadow:'0 2px 8px rgba(229,46,113,.35)', whiteSpace:'nowrap' }}>
                    🏆 Fase Final
                  </button>
                  <button onClick={()=>setExpanded(isExpanded?null:q.id)}
                    title="Ver progreso detallado"
                    style={{ padding:'5px 10px', border:'0.5px solid rgba(0,0,0,.12)', borderRadius:7, background:'none', cursor:'pointer', fontSize:13 }}>
                    {isExpanded?'▲':'▼'}
                  </button>
                  <button onClick={()=>window.open(`/print/${q.id}`, '_blank')}
                    title="Imprimir quiniela en PDF"
                    style={{ padding:'5px 10px', border:'0.5px solid rgba(0,0,0,.12)', borderRadius:7, background:'none', cursor:'pointer', fontSize:13 }}>
                    🖨️
                  </button>
                  {!q.is_locked && !isLocked && (
                    <button onClick={()=>{ setRenaming(q.id); setRenameTxt(q.name) }}
                      title="Renombrar quiniela"
                      style={{ padding:'5px 10px', border:'0.5px solid rgba(0,0,0,.12)', borderRadius:7, background:'none', cursor:'pointer', fontSize:13 }}>
                      ✏️
                    </button>
                  )}
                  {!q.is_locked && !isLocked && (
                    <button onClick={()=>handleDelete(q.id, q.name)}
                      title="Eliminar"
                      style={{ padding:'5px 10px', border:'0.5px solid rgba(255,69,58,.3)', borderRadius:7, background:'none', cursor:'pointer', fontSize:13, color:'#ff453a' }}>
                      🗑
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded progress detail */}
              {isExpanded && (
                <div style={{ borderTop:'0.5px solid rgba(0,0,0,.06)', padding:'14px 16px', background:'#fafafa' }}>
                  <div style={{ fontWeight:700, fontSize:12, textTransform:'uppercase', letterSpacing:'.4px', color:'#6e6e73', marginBottom:10 }}>
                    Progreso por fase
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {Object.entries(PHASES).map(([phase, ids]) => {
                      const p = prog?.[phase] || { filled:0, total:ids.length }
                      const done = p.filled === p.total
                      return (
                        <div key={phase} style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <span style={{ fontSize:14, flexShrink:0 }}>{done?'✅':'⬜'}</span>
                          <span style={{ fontSize:12, fontWeight:600, minWidth:140, color: done?'#1a7a38':'#1d1d1f' }}>{phase}</span>
                          <ProgressBar value={p.filled} max={p.total} />
                          <span style={{ fontSize:11, fontWeight:700, minWidth:50, textAlign:'right',
                            color: done?'#30d158':p.filled>0?'#ff9f0a':'#aeaeb2' }}>
                            {p.filled}/{p.total}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  {/* Warning if incomplete */}
                  {!isComplete && !isLocked && (
                    <div style={{ marginTop:12, background:'rgba(255,159,10,.08)', border:'1px solid rgba(255,159,10,.25)', borderRadius:10, padding:'10px 14px', display:'flex', alignItems:'flex-start', gap:8 }}>
                      <span style={{ fontSize:16, flexShrink:0 }}>⚠️</span>
                      <div>
                        <div style={{ fontWeight:700, fontSize:12, color:'#b06000', marginBottom:4 }}>
                          Tienes {TOTAL_PICKS - total} picks sin completar
                        </div>
                        <div style={{ fontSize:11, color:'#6e6e73', lineHeight:1.5 }}>
                          Los picks sin registrar no sumarán puntos. Completa tu quiniela antes del <strong>11 de junio</strong>.
                        </div>
                        <button onClick={()=>navigate(`/quiniela/${q.id}`)}
                          style={{ marginTop:8, padding:'5px 14px', background:'#ff9f0a', color:'#fff', border:'none', borderRadius:7, fontWeight:700, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
                          Completar ahora →
                        </button>
                      </div>
                    </div>
                  )}

                  {isComplete && (
                    <div style={{ marginTop:12, background:'rgba(48,209,88,.08)', border:'1px solid rgba(48,209,88,.25)', borderRadius:10, padding:'10px 14px', display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:16 }}>🎯</span>
                      <div style={{ fontWeight:700, fontSize:12, color:'#1a7a38' }}>
                        ¡Quiniela completa! Todos los 104 picks registrados.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })
      }
    </div>
  )
}
