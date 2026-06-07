import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const PHASES = [
  { label:'Grupos',      matches: Array.from({length:72},(_,i)=>{const g=String.fromCharCode(65+Math.floor(i/6));return `${g}${i%6+1}`}) },
  { label:'R32',         matches: Array.from({length:16},(_,i)=>`M${73+i}`) },
  { label:'Octavos',     matches: Array.from({length:8}, (_,i)=>`M${89+i}`) },
  { label:'Cuartos',     matches: Array.from({length:4}, (_,i)=>`M${97+i}`) },
  { label:'Semis',       matches: ['M101','M102'] },
  { label:'3ro / Final', matches: ['M103','M104'] },
]

const ENTRY_FEE = 15

export default function AdminPage() {
  const { profile: adminProfile } = useAuth()
  const [tab, setTab]         = useState('payments') // payments | results
  const [users, setUsers]     = useState([])
  const [results, setResults] = useState({})
  const [phase, setPhase]     = useState(0)
  const [saving, setSaving]   = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [msg, setMsg]         = useState('')
  const [loadingUsers, setLoadingUsers] = useState(true)

  useEffect(() => { loadUsers(); loadResults() }, [])

  async function loadUsers() {
    setLoadingUsers(true)
    const { data } = await supabase
      .from('profiles')
      .select(`
        id, username, full_name, has_paid, paid_at,
        quinielas (
          id, name, is_locked,
          picks (match_id, goals_home),
          scores (total_pts)
        )
      `)
      .order('username')
    setUsers(data || [])
    setLoadingUsers(false)
  }

  async function loadResults() {
    const { data } = await supabase.from('match_results').select('*')
    const map = {}
    data?.forEach(r => { map[r.match_id] = r })
    setResults(map)
  }

  async function togglePayment(userId, currentPaid) {
    setSaving(userId)
    const { error } = await supabase
      .from('profiles')
      .update({
        has_paid: !currentPaid,
        paid_at:  !currentPaid ? new Date().toISOString() : null,
        paid_by:  !currentPaid ? adminProfile.id : null,
      })
      .eq('id', userId)
    if (!error) {
      setMsg(!currentPaid ? '✓ Pago confirmado' : '✓ Pago removido')
      loadUsers()
    }
    setSaving(null)
    setTimeout(() => setMsg(''), 2000)
  }

  async function saveResult(matchId, hs, as_, winner) {
    if (hs === '' || as_ === '') return
    setSaving(matchId)
    await supabase.from('match_results').upsert({
      match_id: matchId,
      goals_home: parseInt(hs),
      goals_away: parseInt(as_),
      winner: winner || null,
      status: 'finished',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'match_id' })
    setMsg(`✓ ${matchId} guardado`)
    loadResults()
    setSaving(null)
    setTimeout(() => setMsg(''), 2000)
  }

  async function triggerSync() {
    setSyncing(true)
    try {
      const res = await fetch('/.netlify/functions/sync-results')
      const data = await res.json()
      setMsg(`✓ API sincronizada: ${data.updated || 0} partidos`)
    } catch { setMsg('Error al sincronizar') }
    setSyncing(false)
    setTimeout(() => setMsg(''), 4000)
  }

  // ── PAYMENT STATS ─────────────────────────────────────────────
  const paidUsers    = users.filter(u => u.has_paid)
  const unpaidUsers  = users.filter(u => !u.has_paid)
  const totalPaid    = paidUsers.length * ENTRY_FEE
  const prize1st     = Math.floor(totalPaid * 0.60)
  const prize2nd     = Math.floor(totalPaid * 0.20)
  const prize3rd     = Math.floor(totalPaid * 0.10)
  const prizeOrg     = Math.floor(totalPaid * 0.10)

  const tabStyle = (t) => ({
    padding:'8px 20px', border:'none', borderRadius:8, fontFamily:'inherit',
    fontSize:13, fontWeight:700, cursor:'pointer',
    background: tab===t ? '#0071e3' : '#f2f2f7',
    color: tab===t ? '#fff' : '#6e6e73',
  })

  return (
    <div style={{ maxWidth:1100, margin:'0 auto', padding:'24px 16px' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:10 }}>
        <h1 style={{ fontSize:22, fontWeight:800 }}>⚙️ Panel de Admin</h1>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {msg && <span style={{ fontSize:13, color:'#30d158', fontWeight:600 }}>{msg}</span>}
          {tab==='results' && (
            <button onClick={triggerSync} disabled={syncing}
              style={{ padding:'8px 16px', background:'#30d158', color:'#fff', border:'none', borderRadius:9, fontWeight:600, cursor:'pointer', fontSize:13, opacity:syncing?.4:1 }}>
              {syncing ? '⏳ Sincronizando...' : '🔄 Sync API'}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:6, marginBottom:20 }}>
        <button style={tabStyle('payments')} onClick={() => setTab('payments')}>💰 Pagos</button>
        <button style={tabStyle('results')}  onClick={() => setTab('results')}>⚽ Resultados</button>
      </div>

      {/* ══ TAB: PAGOS ══ */}
      {tab === 'payments' && (
        <div>
          {/* Prize summary */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:10, marginBottom:20 }}>
            {[
              ['👥 Pagados',    `${paidUsers.length} / ${users.length}`, '#30d158'],
              ['💰 Recaudado',  `$${totalPaid}`,                        '#0071e3'],
              ['🥇 1er lugar',  `$${prize1st} (60%)`,                   '#ffd60a'],
              ['🥈 2do lugar',  `$${prize2nd} (20%)`,                   '#aeaeb2'],
              ['🥉 3er lugar',  `$${prize3rd} (10%)`,                   '#ff9f0a'],
              ['🏛️ Organiz.',   `$${prizeOrg} (10%)`,                   '#6e6e73'],
            ].map(([label, val, color]) => (
              <div key={label} style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,.08)', borderRadius:12, padding:'12px 14px', boxShadow:'0 1px 3px rgba(0,0,0,.04)' }}>
                <div style={{ fontSize:11, color:'#6e6e73', fontWeight:600, marginBottom:4 }}>{label}</div>
                <div style={{ fontSize:17, fontWeight:800, color }}>{val}</div>
              </div>
            ))}
          </div>

          {/* Unpaid warning */}
          {unpaidUsers.length > 0 && (
            <div style={{ background:'rgba(255,69,58,.06)', border:'1px solid rgba(255,69,58,.2)', borderRadius:10, padding:'10px 14px', marginBottom:14, fontSize:13, color:'#c0392b' }}>
              ⚠️ <strong>{unpaidUsers.length} participante{unpaidUsers.length>1?'s':''}</strong> pendiente{unpaidUsers.length>1?'s':''} de pago — no pueden ver la tabla de posiciones
            </div>
          )}

          {/* Users table */}
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,.08)', borderRadius:14, overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 80px 80px 100px 120px', padding:'8px 16px', background:'#f9f9fb', borderBottom:'0.5px solid rgba(0,0,0,.08)', gap:8 }}>
              {['Participante','Quinielas','Picks','Puntos','Pago ($15)'].map(h => (
                <span key={h} style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.4px', color:'#6e6e73' }}>{h}</span>
              ))}
            </div>

            {loadingUsers ? (
              <div style={{ padding:32, textAlign:'center', color:'#aeaeb2' }}>Cargando...</div>
            ) : users.map(u => {
              const totalPicks = u.quinielas?.reduce((s,q) => s + (q.picks?.filter(p=>p.goals_home!=null).length||0), 0) || 0
              const totalPicksMax = (u.quinielas?.length || 0) * 104
              const pts = u.quinielas?.reduce((s,q) => s + (q.scores?.[0]?.total_pts || 0), 0) ?? 0

              return (
                <div key={u.id} style={{ display:'grid', gridTemplateColumns:'1fr 80px 80px 100px 120px', padding:'11px 16px', borderBottom:'0.5px solid rgba(0,0,0,.04)', alignItems:'center', gap:8, background: u.has_paid ? 'rgba(48,209,88,.02)' : 'rgba(255,69,58,.02)' }}>

                  <div>
                    <div style={{ fontWeight:700, fontSize:14 }}>{u.username}</div>
                    {u.full_name && <div style={{ fontSize:11, color:'#aeaeb2' }}>{u.full_name}</div>}
                    {u.has_paid && u.paid_at && (
                      <div style={{ fontSize:10, color:'#30d158', marginTop:2 }}>
                        ✓ Pagado el {new Date(u.paid_at).toLocaleDateString('es-ES',{day:'numeric',month:'short'})}
                      </div>
                    )}
                  </div>

                  <div style={{ fontSize:13, fontWeight:600, color:'#6e6e73', textAlign:'center' }}>
                    {u.quinielas?.length || 0}
                  </div>

                  <div style={{ textAlign:'center' }}>
                    <span style={{ fontSize:12, fontWeight:700, color: totalPicks===totalPicksMax?'#30d158':totalPicks>0?'#ff9f0a':'#aeaeb2' }}>
                      {totalPicks}
                    </span>
                    <span style={{ fontSize:10, color:'#aeaeb2' }}>/{totalPicksMax}</span>
                  </div>

                  <div style={{ textAlign:'center' }}>
                    <span style={{ fontSize:14, fontWeight:800, color:'#0071e3' }}>{pts} pts</span>
                  </div>

                  <div style={{ textAlign:'center' }}>
                    <button
                      onClick={() => togglePayment(u.id, u.has_paid)}
                      disabled={saving === u.id}
                      style={{
                        padding:'6px 14px', border:'none', borderRadius:8,
                        fontWeight:700, cursor:'pointer', fontSize:12, fontFamily:'inherit',
                        background: u.has_paid ? 'rgba(48,209,88,.15)' : 'rgba(255,69,58,.1)',
                        color: u.has_paid ? '#1a7a38' : '#c0392b',
                        opacity: saving===u.id ? .5 : 1,
                      }}>
                      {saving===u.id ? '...' : u.has_paid ? '✅ Pagado' : '⬜ Sin pagar'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ marginTop:12, fontSize:12, color:'#6e6e73', textAlign:'center' }}>
            Click en el botón de pago para confirmar o revertir · Solo visible para administradores
          </div>
        </div>
      )}

      {/* ══ TAB: RESULTADOS ══ */}
      {tab === 'results' && (
        <div>
          {/* Phase tabs */}
          <div style={{ display:'flex', background:'#f2f2f4', borderRadius:10, padding:3, gap:2, marginBottom:16 }}>
            {PHASES.map((p, i) => (
              <button key={i} onClick={() => setPhase(i)}
                style={{ flex:1, padding:'6px 4px', border:'none', borderRadius:8, fontWeight:600, fontSize:11, cursor:'pointer',
                  background: i===phase ? '#fff' : 'none', color: i===phase ? '#1d1d1f' : '#6e6e73',
                  boxShadow: i===phase ? '0 1px 3px rgba(0,0,0,.06)' : 'none' }}>
                {p.label}
              </button>
            ))}
          </div>

          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,.08)', borderRadius:14, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,.06)' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ background:'#f2f2f4' }}>
                  {['Partido','Local','Marcador','Visitante','Avanza (elim.)',''].map(h => (
                    <th key={h} style={{ padding:'8px 12px', fontWeight:600, fontSize:11, textTransform:'uppercase', letterSpacing:'.3px', color:'#6e6e73', textAlign:'left', borderBottom:'0.5px solid rgba(0,0,0,.08)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PHASES[phase].matches.map(mid => {
                  const r = results[mid] || {}
                  const hasResult = r.goals_home != null
                  return (
                    <tr key={mid} style={{ borderBottom:'0.5px solid rgba(0,0,0,.05)' }}>
                      <td style={{ padding:'8px 12px', fontWeight:700, color:'#0071e3' }}>{mid}</td>
                      <td style={{ padding:'8px 12px', color:'#6e6e73', fontSize:12 }}>{r.h_team || '–'}</td>
                      <td style={{ padding:'8px 12px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                          <input type="number" min={0} max={20} id={`h-${mid}`}
                            defaultValue={r.goals_home ?? ''}
                            style={{ width:38, height:32, border:'1px solid rgba(0,0,0,.14)', borderRadius:7, textAlign:'center', fontSize:14, fontWeight:700, fontFamily:'inherit' }}/>
                          <span style={{ color:'#aeaeb2', fontWeight:700 }}>–</span>
                          <input type="number" min={0} max={20} id={`a-${mid}`}
                            defaultValue={r.goals_away ?? ''}
                            style={{ width:38, height:32, border:'1px solid rgba(0,0,0,.14)', borderRadius:7, textAlign:'center', fontSize:14, fontWeight:700, fontFamily:'inherit' }}/>
                        </div>
                      </td>
                      <td style={{ padding:'8px 12px', color:'#6e6e73', fontSize:12 }}>{r.a_team || '–'}</td>
                      <td style={{ padding:'8px 12px' }}>
                        {!/^[A-L][1-6]$/.test(mid) && (
                          <input defaultValue={r.winner || ''} id={`w-${mid}`}
                            placeholder="Equipo que avanza"
                            style={{ width:140, padding:'4px 8px', border:'1px solid rgba(0,0,0,.14)', borderRadius:7, fontSize:12, fontFamily:'inherit' }}/>
                        )}
                      </td>
                      <td style={{ padding:'8px 12px' }}>
                        <button disabled={saving===mid}
                          onClick={() => {
                            const h = document.getElementById(`h-${mid}`)?.value
                            const a = document.getElementById(`a-${mid}`)?.value
                            const w = document.getElementById(`w-${mid}`)?.value
                            saveResult(mid, h, a, w)
                          }}
                          style={{ padding:'5px 12px', background: hasResult?'#f2f2f4':'#0071e3', color: hasResult?'#1d1d1f':'#fff', border:'none', borderRadius:7, fontWeight:600, cursor:'pointer', fontSize:12 }}>
                          {saving===mid ? '...' : hasResult ? '✓ Actualizar' : 'Guardar'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
