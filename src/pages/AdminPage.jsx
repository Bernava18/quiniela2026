import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const PHASES = [
  { label:'Grupos', matches: Array.from({length:72}, (_,i) => {
      const g = String.fromCharCode(65 + Math.floor(i/6))
      return g + (i%6+1)
    })
  },
  { label:'R32',     matches: Array.from({length:16}, (_,i) => `M${73+i}`) },
  { label:'Octavos', matches: Array.from({length:8},  (_,i) => `M${89+i}`) },
  { label:'Cuartos', matches: Array.from({length:4},  (_,i) => `M${97+i}`) },
  { label:'Semis',   matches: ['M101','M102'] },
  { label:'3ro / Final', matches: ['M103','M104'] },
]

export default function AdminPage() {
  const [results, setResults]  = useState({})
  const [phase, setPhase]      = useState(0)
  const [saving, setSaving]    = useState(null)
  const [syncing, setSyncing]  = useState(false)
  const [msg, setMsg]          = useState('')

  useEffect(() => { loadResults() }, [])

  async function loadResults() {
    const { data } = await supabase.from('match_results').select('*')
    const map = {}
    data?.forEach(r => { map[r.match_id] = r })
    setResults(map)
  }

  async function saveResult(matchId, hs, as_, winner) {
    if (hs === '' || as_ === '') return
    setSaving(matchId)
    const { error } = await supabase.from('match_results').upsert({
      match_id: matchId,
      goals_home: parseInt(hs),
      goals_away: parseInt(as_),
      winner: winner || null,
      status: 'finished',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'match_id' })
    if (!error) {
      setMsg(`✓ ${matchId} guardado`)
      loadResults()
      // Trigger score recalculation via API
      fetch('/.netlify/functions/sync-results', { method:'POST' })
    }
    setSaving(null)
    setTimeout(() => setMsg(''), 2000)
  }

  async function triggerSync() {
    setSyncing(true)
    try {
      const res = await fetch('/.netlify/functions/sync-results')
      const data = await res.json()
      setMsg(`✓ API sincronizada: ${data.updated} partidos actualizados`)
    } catch {
      setMsg('Error al sincronizar con la API')
    }
    setSyncing(false)
    setTimeout(() => setMsg(''), 4000)
  }

  const currentPhase = PHASES[phase]

  return (
    <div style={{ maxWidth:900, margin:'0 auto', padding:'28px 16px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <h1 style={{ fontSize:24, fontWeight:700 }}>⚙️ Panel de Admin</h1>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {msg && <span style={{ fontSize:13, color:'#30d158', fontWeight:600 }}>{msg}</span>}
          <button onClick={triggerSync} disabled={syncing}
            style={{ padding:'8px 16px', background:'#30d158', color:'#fff', border:'none', borderRadius:9, fontWeight:600, cursor:'pointer', fontSize:13, opacity:syncing?.4:1 }}>
            {syncing ? '⏳ Sincronizando...' : '🔄 Sync API ahora'}
          </button>
        </div>
      </div>

      {/* Phase tabs */}
      <div style={{ display:'flex', background:'#f2f2f4', borderRadius:10, padding:3, gap:2, marginBottom:18 }}>
        {PHASES.map((p, i) => (
          <button key={i} onClick={() => setPhase(i)}
            style={{ flex:1, padding:'6px 4px', border:'none', borderRadius:8, fontWeight:600, fontSize:12, cursor:'pointer',
              background: i===phase ? '#fff' : 'none',
              color: i===phase ? '#1d1d1f' : '#6e6e73',
              boxShadow: i===phase ? '0 1px 3px rgba(0,0,0,.06)' : 'none' }}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Matches table */}
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
            {currentPhase.matches.map(mid => {
              const r = results[mid] || {}
              const [lh, setLh]   = useState(r.goals_home ?? '')
              const [la, setLa]   = useState(r.goals_away ?? '')
              const [lw, setLw]   = useState(r.winner    || '')
              const hasResult = r.goals_home != null

              return (
                <tr key={mid} style={{ borderBottom:'0.5px solid rgba(0,0,0,.05)' }}>
                  <td style={{ padding:'8px 12px', fontWeight:700, color:'#0071e3' }}>{mid}</td>
                  <td style={{ padding:'8px 12px' }}>{r.h_team || '–'}</td>
                  <td style={{ padding:'8px 12px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                      <input type="number" min={0} max={20} defaultValue={r.goals_home ?? ''}
                        id={`h-${mid}`}
                        style={{ width:38, height:32, border:'1px solid rgba(0,0,0,.14)', borderRadius:7, textAlign:'center', fontSize:14, fontWeight:700, fontFamily:'inherit' }}/>
                      <span style={{ color:'#aeaeb2', fontWeight:700 }}>–</span>
                      <input type="number" min={0} max={20} defaultValue={r.goals_away ?? ''}
                        id={`a-${mid}`}
                        style={{ width:38, height:32, border:'1px solid rgba(0,0,0,.14)', borderRadius:7, textAlign:'center', fontSize:14, fontWeight:700, fontFamily:'inherit' }}/>
                    </div>
                  </td>
                  <td style={{ padding:'8px 12px' }}>{r.a_team || '–'}</td>
                  <td style={{ padding:'8px 12px' }}>
                    {!/^[A-L][1-6]$/.test(mid) && (
                      <input defaultValue={r.winner || ''} id={`w-${mid}`}
                        placeholder="Equipo que avanza"
                        style={{ width:140, padding:'4px 8px', border:'1px solid rgba(0,0,0,.14)', borderRadius:7, fontSize:12, fontFamily:'inherit' }}/>
                    )}
                  </td>
                  <td style={{ padding:'8px 12px' }}>
                    <button
                      disabled={saving === mid}
                      onClick={() => {
                        const h = document.getElementById(`h-${mid}`)?.value
                        const a = document.getElementById(`a-${mid}`)?.value
                        const w = document.getElementById(`w-${mid}`)?.value
                        saveResult(mid, h, a, w)
                      }}
                      style={{ padding:'5px 12px', background: hasResult ? '#f2f2f4' : '#0071e3', color: hasResult ? '#1d1d1f' : '#fff', border:'none', borderRadius:7, fontWeight:600, cursor:'pointer', fontSize:12 }}>
                      {saving===mid ? '...' : hasResult ? '✓ Actualizar' : 'Guardar'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop:16, padding:'12px 16px', background:'rgba(255,159,10,.08)', borderRadius:10, fontSize:13, color:'#b06000' }}>
        💡 Los resultados se sincronizan automáticamente desde football-data.org cada 2 minutos durante el Mundial. Usa "Sync API ahora" para forzar una actualización inmediata. Puedes corregir manualmente cualquier resultado.
      </div>
    </div>
  )
}
