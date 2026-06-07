import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase, getQuinielaPicks } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

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

const GROUP_MATCHES = {}
Object.entries(GROUPS).forEach(([g, teams]) => {
  GROUP_MATCHES[g] = [
    {id:`${g}1`, h:teams[0], a:teams[1]},
    {id:`${g}2`, h:teams[2], a:teams[3]},
    {id:`${g}3`, h:teams[0], a:teams[2]},
    {id:`${g}4`, h:teams[3], a:teams[1]},
    {id:`${g}5`, h:teams[3], a:teams[0]},
    {id:`${g}6`, h:teams[1], a:teams[2]},
  ]
})

const ELIM_PHASES = [
  { label:'R32 — Dieciseisavos de Final', ids: Array.from({length:16},(_,i)=>`M${73+i}`) },
  { label:'Octavos de Final',             ids: Array.from({length:8}, (_,i)=>`M${89+i}`) },
  { label:'Cuartos de Final',             ids: Array.from({length:4}, (_,i)=>`M${97+i}`) },
  { label:'Semifinales',                  ids: ['M101','M102'] },
  { label:'3er Puesto',                   ids: ['M103'] },
  { label:'Gran Final 🏆',               ids: ['M104'] },
]

export default function PrintPage() {
  const { id: quinielaId } = useParams()
  const { user } = useAuth()
  const navigate  = useNavigate()
  const [quiniela, setQuiniela] = useState(null)
  const [picks, setPicks]       = useState({})
  const [profile, setProfile]   = useState(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => { load() }, [quinielaId])

  async function load() {
    const [{ data: q }, savedPicks] = await Promise.all([
      supabase.from('quinielas').select('*, profiles(username, full_name)').eq('id', quinielaId).single(),
      getQuinielaPicks(quinielaId),
    ])
    setQuiniela(q)
    setProfile(q?.profiles)
    setPicks(savedPicks)
    setLoading(false)
    // Auto print after load
    setTimeout(() => window.print(), 800)
  }

  const filledCount = Object.values(picks).filter(p => p?.h != null).length

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontFamily:'Arial,sans-serif', color:'#6e6e73' }}>
      Preparando impresión...
    </div>
  )

  return (
    <div style={{ fontFamily:'Arial,sans-serif', fontSize:11, color:'#1d1d1f', background:'#fff', maxWidth:900, margin:'0 auto', padding:'20px' }}>

      {/* Print button - hidden when printing */}
      <div className="no-print" style={{ position:'fixed', bottom:20, right:20, zIndex:100, display:'flex', gap:8 }}>
        <button onClick={() => window.print()}
          style={{ padding:'10px 20px', background:'#0071e3', color:'#fff', border:'none', borderRadius:10, fontWeight:700, fontSize:14, cursor:'pointer', fontFamily:'inherit', boxShadow:'0 4px 16px rgba(0,113,227,.3)' }}>
          🖨️ Imprimir / Guardar PDF
        </button>
        <button onClick={() => navigate(-1)}
          style={{ padding:'10px 16px', background:'#f2f2f7', color:'#1d1d1f', border:'none', borderRadius:10, fontWeight:600, fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>
          ← Volver
        </button>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
          .page-break { page-break-before: always; }
        }
        @page { margin: 1.5cm; size: A4; }
      `}</style>

      {/* HEADER */}
      <div style={{ background:'linear-gradient(135deg,#0071e3,#005bb5)', color:'#fff', padding:'20px 24px', borderRadius:12, marginBottom:20, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div style={{ fontSize:22, fontWeight:900, marginBottom:4 }}>🏆 Quiniela Mundial FIFA 2026</div>
          <div style={{ fontSize:13, opacity:.8 }}>📋 {quiniela?.name}</div>
          <div style={{ fontSize:12, opacity:.65, marginTop:3 }}>
            👤 {profile?.username}{profile?.full_name ? ` — ${profile.full_name}` : ''}
          </div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:28, fontWeight:900 }}>{filledCount}</div>
          <div style={{ fontSize:11, opacity:.7 }}>picks de 104</div>
          <div style={{ fontSize:10, opacity:.55, marginTop:4 }}>
            {new Date().toLocaleDateString('es-ES',{day:'numeric',month:'long',year:'numeric'})}
          </div>
        </div>
      </div>

      {/* GRUPOS */}
      {Object.entries(GROUP_MATCHES).map(([g, matches], gi) => (
        <div key={g} style={{ marginBottom:14, breakInside:'avoid' }}>
          <div style={{ background:'#0071e3', color:'#fff', padding:'6px 12px', fontWeight:800, fontSize:12, textTransform:'uppercase', letterSpacing:'.5px', borderRadius:'6px 6px 0 0', display:'flex', justifyContent:'space-between' }}>
            <span>Grupo {g} — {GROUPS[g].join(' · ')}</span>
            <span style={{ opacity:.7, fontSize:10 }}>
              {matches.filter(m => picks[m.id]?.h != null).length}/6 picks
            </span>
          </div>
          <table style={{ width:'100%', borderCollapse:'collapse', border:'1px solid #e5e5ea', borderTop:'none' }}>
            <thead>
              <tr style={{ background:'#f9f9fb' }}>
                <th style={{ padding:'5px 8px', textAlign:'left', fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'.3px', color:'#aeaeb2', width:36 }}>ID</th>
                <th style={{ padding:'5px 8px', textAlign:'left', fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'.3px', color:'#aeaeb2' }}>Local</th>
                <th style={{ padding:'5px 8px', textAlign:'center', fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'.3px', color:'#0071e3', width:70 }}>Pronóstico</th>
                <th style={{ padding:'5px 8px', textAlign:'right', fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'.3px', color:'#aeaeb2' }}>Visitante</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((m, i) => {
                const pk = picks[m.id]
                const hasPick = pk?.h != null
                return (
                  <tr key={m.id} style={{ borderTop:'0.5px solid #f2f2f7', background: i%2===0?'#fff':'#fafafa' }}>
                    <td style={{ padding:'5px 8px', color:'#aeaeb2', fontSize:10, fontWeight:600 }}>{m.id}</td>
                    <td style={{ padding:'5px 8px', fontWeight:600, fontSize:12 }}>{m.h}</td>
                    <td style={{ padding:'5px 8px', textAlign:'center' }}>
                      {hasPick
                        ? <span style={{ fontWeight:900, fontSize:14, color:'#0071e3', background:'rgba(0,113,227,.08)', padding:'2px 10px', borderRadius:6 }}>{pk.h} – {pk.a}</span>
                        : <span style={{ color:'#c7c7cc', fontSize:10, fontStyle:'italic' }}>Sin pick</span>}
                    </td>
                    <td style={{ padding:'5px 8px', fontWeight:600, fontSize:12, textAlign:'right' }}>{m.a}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ))}

      {/* ELIMINATORIAS */}
      <div className="page-break">
        {ELIM_PHASES.map(({ label, ids }) => (
          <div key={label} style={{ marginBottom:14, breakInside:'avoid' }}>
            <div style={{ background:'#ff9f0a', color:'#fff', padding:'6px 12px', fontWeight:800, fontSize:12, borderRadius:'6px 6px 0 0', display:'flex', justifyContent:'space-between' }}>
              <span>{label}</span>
              <span style={{ opacity:.8, fontSize:10 }}>
                {ids.filter(id => picks[id]?.h != null).length}/{ids.length} picks
              </span>
            </div>
            <table style={{ width:'100%', borderCollapse:'collapse', border:'1px solid #e5e5ea', borderTop:'none' }}>
              <thead>
                <tr style={{ background:'#fffbeb' }}>
                  <th style={{ padding:'5px 8px', textAlign:'left', fontSize:9, fontWeight:700, textTransform:'uppercase', color:'#aeaeb2', width:42 }}>ID</th>
                  <th style={{ padding:'5px 8px', textAlign:'center', fontSize:9, fontWeight:700, textTransform:'uppercase', color:'#ff9f0a', width:80 }}>Pronóstico</th>
                  <th style={{ padding:'5px 8px', textAlign:'left', fontSize:9, fontWeight:700, textTransform:'uppercase', color:'#aeaeb2' }}>Equipo que avanza</th>
                </tr>
              </thead>
              <tbody>
                {ids.map((mid, i) => {
                  const pk = picks[mid]
                  const hasPick = pk?.h != null
                  return (
                    <tr key={mid} style={{ borderTop:'0.5px solid #f2f2f7', background: i%2===0?'#fff':'#fafafa' }}>
                      <td style={{ padding:'5px 8px', color:'#aeaeb2', fontSize:10, fontWeight:600 }}>{mid}</td>
                      <td style={{ padding:'5px 8px', textAlign:'center' }}>
                        {hasPick
                          ? <span style={{ fontWeight:900, fontSize:13, color:'#ff9f0a', background:'rgba(255,159,10,.1)', padding:'2px 10px', borderRadius:6 }}>{pk.h} – {pk.a}</span>
                          : <span style={{ color:'#c7c7cc', fontSize:10, fontStyle:'italic' }}>Sin pick</span>}
                      </td>
                      <td style={{ padding:'5px 8px', fontWeight:700, fontSize:12, color:'#30d158' }}>
                        {pk?.win || <span style={{ color:'#c7c7cc', fontStyle:'italic', fontWeight:400, fontSize:10 }}>Sin selección</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* FOOTER */}
      <div style={{ textAlign:'center', padding:'16px', borderTop:'1px solid #e5e5ea', marginTop:16, color:'#aeaeb2', fontSize:10 }}>
        🏆 Quiniela Mundial FIFA 2026 · {profile?.username} · {quiniela?.name}<br/>
        Generado el {new Date().toLocaleDateString('es-ES',{day:'numeric',month:'long',year:'numeric'})} · quiniela2026panas.netlify.app
      </div>
    </div>
  )
}
