import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getMyQuinielas, createQuiniela, deleteQuiniela, downloadQuinielaBackup } from '../lib/supabase'

export default function DashboardPage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [quinielas, setQuinielas] = useState([])
  const [loading, setLoading]     = useState(true)
  const [creating, setCreating]   = useState(false)
  const [newName, setNewName]     = useState('')

  const LOCK_DATE = new Date('2026-06-11T18:00:00Z')
  const isLocked  = new Date() >= LOCK_DATE

  useEffect(() => { load() }, [user])

  async function load() {
    setLoading(true)
    const { data } = await getMyQuinielas(user.id)
    setQuinielas(data)
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
    if (!confirm(`¿Eliminar "${name}"? Esta acción no se puede deshacer.`)) return
    await deleteQuiniela(id)
    load()
  }

  const ptsBadge = (pts) => {
    if (!pts && pts !== 0) return null
    return <span style={{ background:'#0071e3', color:'#fff', padding:'2px 10px', borderRadius:20, fontSize:13, fontWeight:700 }}>{pts} pts</span>
  }

  return (
    <div style={{ maxWidth:700, margin:'0 auto', padding:'32px 16px' }}>
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontSize:26, fontWeight:700, letterSpacing:'-.5px' }}>
          👋 Hola, {profile?.username}
        </h1>
        <p style={{ color:'#6e6e73', marginTop:4 }}>
          {isLocked
            ? '🔒 El Mundial ha iniciado — las quinielas están cerradas'
            : `⏳ Cierre de quinielas: 11 Jun 2026 · ${Math.max(0, Math.floor((LOCK_DATE - new Date()) / 86400000))} días restantes`}
        </p>
      </div>

      {/* Crear nueva quiniela */}
      {!isLocked && (
        <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,.08)', borderRadius:14, padding:'16px 18px', marginBottom:20, boxShadow:'0 1px 3px rgba(0,0,0,.06)' }}>
          <div style={{ fontWeight:700, marginBottom:10 }}>➕ Nueva quiniela</div>
          <div style={{ display:'flex', gap:8 }}>
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder="Nombre de tu quiniela (ej: Mi primera quiniela)"
              style={{ flex:1, padding:'9px 12px', border:'1px solid rgba(0,0,0,.14)', borderRadius:9, fontSize:14, outline:'none', fontFamily:'inherit' }}
            />
            <button
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
              style={{ padding:'9px 18px', background:'#0071e3', color:'#fff', border:'none', borderRadius:9, fontWeight:600, cursor:'pointer', fontSize:14, opacity: (creating||!newName.trim()) ? .5 : 1 }}
            >
              {creating ? '...' : 'Crear'}
            </button>
          </div>
        </div>
      )}

      {/* Lista de quinielas */}
      <div style={{ fontWeight:700, marginBottom:10, color:'#6e6e73', textTransform:'uppercase', fontSize:12, letterSpacing:'.4px' }}>
        Mis quinielas ({quinielas.length})
      </div>

      {loading ? <div style={{ color:'#aeaeb2', padding:20 }}>Cargando...</div> :
        quinielas.length === 0 ? (
          <div style={{ textAlign:'center', padding:'40px 20px', color:'#6e6e73', background:'#fff', borderRadius:14, border:'0.5px solid rgba(0,0,0,.08)' }}>
            No tienes quinielas aún.<br/>Crea una arriba para empezar.
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {quinielas.map(q => (
              <div key={q.id} style={{ background:'#fff', border:`0.5px solid rgba(0,0,0,.08)`, borderRadius:12, padding:'14px 16px', display:'flex', alignItems:'center', gap:12, boxShadow:'0 1px 3px rgba(0,0,0,.04)', cursor:'pointer' }}
                onClick={() => navigate(`/quiniela/${q.id}`)}>

                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, fontSize:15 }}>{q.name}</div>
                  <div style={{ fontSize:12, color:'#6e6e73', marginTop:2 }}>
                    {new Date(q.created_at).toLocaleDateString('es-MX', { day:'numeric', month:'short', year:'numeric' })}
                    {q.is_locked && <span style={{ marginLeft:8, color:'#ff9f0a' }}>🔒 Cerrada</span>}
                  </div>
                </div>

                {q.scores ? ptsBadge(q.scores.total_pts) : <span style={{ fontSize:12, color:'#aeaeb2' }}>Sin puntos aún</span>}

                <div style={{ display:'flex', gap:6 }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => downloadQuinielaBackup(q.id, q.name)}
                    title="Descargar respaldo"
                    style={{ padding:'5px 10px', border:'0.5px solid rgba(0,0,0,.12)', borderRadius:7, background:'none', cursor:'pointer', fontSize:13 }}>
                    💾
                  </button>
                  {!q.is_locked && (
                    <button onClick={() => handleDelete(q.id, q.name)}
                      title="Eliminar"
                      style={{ padding:'5px 10px', border:'0.5px solid rgba(255,69,58,.3)', borderRadius:7, background:'none', cursor:'pointer', fontSize:13, color:'#ff453a' }}>
                      🗑
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  )
}
