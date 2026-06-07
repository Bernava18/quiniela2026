import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase, getQuinielaPicks } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// ── Fixture ──────────────────────────────────────────────────────
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

function calcStandings(g, picks) {
  const teams = GROUPS[g]
  const matches = GROUP_MATCHES[g]
  const s = {}
  teams.forEach(t => { s[t] = { pts:0, gf:0, ga:0, gd:0, pj:0 } })
  matches.forEach(m => {
    const pk = picks[m.id]
    if (pk?.h == null) return
    const h = pk.h, a = pk.a
    s[m.h].pj++; s[m.a].pj++
    s[m.h].gf+=h; s[m.h].ga+=a; s[m.h].gd+=h-a
    s[m.a].gf+=a; s[m.a].ga+=h; s[m.a].gd+=a-h
    if (h>a) s[m.h].pts+=3
    else if (h<a) s[m.a].pts+=3
    else { s[m.h].pts+=1; s[m.a].pts+=1 }
  })
  return teams.map(t=>({team:t,...s[t]}))
    .sort((a,b)=>b.pts-a.pts||b.gd-a.gd||b.gf-a.gf)
}

const R32_STATIC = {
  M73:{h:'2º Gr.A',a:'2º Gr.B'}, M74:{h:'Alemania(1E)',a:'3º BCEF'},
  M75:{h:'P.Bajos(1F)',a:'2º Gr.C'}, M76:{h:'Brasil(1C)',a:'2º Gr.F'},
  M77:{h:'Francia(1I)',a:'3º GHIJ'}, M78:{h:'2º Gr.E',a:'2º Gr.I'},
  M79:{h:'México(1A)',a:'3º ABCD'}, M80:{h:'Inglaterra(1L)',a:'3º IJKL'},
  M81:{h:'EE.UU.(1D)',a:'3º ABCD'}, M82:{h:'Bélgica(1G)',a:'3º EFGH'},
  M83:{h:'2º Gr.K',a:'2º Gr.L'}, M84:{h:'España(1H)',a:'2º Gr.J'},
  M85:{h:'Canadá(1B)',a:'3º ABCD'}, M86:{h:'Argentina(1J)',a:'2º Gr.H'},
  M87:{h:'Portugal(1K)',a:'3º IJKL'}, M88:{h:'2º Gr.D',a:'2º Gr.G'},
}

const C = {
  blue:'#0055d4', blueDk:'#003a9e', blueLt:'#dbeafe',
  orange:'#d97706', orangeLt:'#fef3c7',
  green:'#15803d', greenLt:'#dcfce7',
  gray:'#6b7280', grayLt:'#f9fafb', border:'#e5e7eb',
  dark:'#111827', mid:'#374151',
}

const thS = { padding:'2px 5px', fontSize:7.5, fontWeight:700, textTransform:'uppercase',
  letterSpacing:'.3px', color:'#9ca3af', textAlign:'center', borderBottom:`0.5px solid ${C.border}` }
const tdS = { padding:'3px 6px', fontSize:10 }

// ── GroupCard ─────────────────────────────────────────────────────
function GroupCard({ g, matches, picks }) {
  const standings = calcStandings(g, picks)
  const cnt = matches.filter(m=>picks[m.id]?.h!=null).length
  const posClr = [C.blue,C.orange,C.green,'#9333ea']
  const medals = ['🥇','🥈','🥉','4']

  return (
    <div style={{ border:`1px solid ${C.border}`, borderRadius:9, overflow:'hidden',
      background:'#fff', breakInside:'avoid' }}>
      {/* Header */}
      <div style={{ background:`linear-gradient(135deg,${C.blue},${C.blueDk})`, color:'#fff',
        padding:'5px 9px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontWeight:900, fontSize:12, letterSpacing:'.4px' }}>GRUPO {g}</span>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ fontSize:7.5, opacity:.7 }}>{GROUPS[g].map(t=>t.split(' ')[0]).join(' · ')}</span>
          <span style={{ fontSize:8, fontWeight:700, background:'rgba(255,255,255,.2)',
            borderRadius:4, padding:'1px 5px' }}>{cnt}/6</span>
        </div>
      </div>
      {/* Standings */}
      <div style={{ background:C.blueLt, borderBottom:`1px solid ${C.border}` }}>
        <div style={{ padding:'2px 8px 1px', fontSize:6.5, fontWeight:800, textTransform:'uppercase',
          letterSpacing:'.4px', color:C.blue }}>Clasificación proyectada</div>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr>
              {['#','Equipo','PJ','PTS','GF','GA','DG'].map(h=>(
                <th key={h} style={{ ...thS, padding:'1px 4px', fontSize:7 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {standings.map((s,i)=>(
              <tr key={s.team} style={{ borderTop:`0.5px solid ${C.border}88`,
                background:i===0?'rgba(0,85,212,.07)':i===1?'rgba(0,85,212,.03)':'transparent' }}>
                <td style={{ ...thS, padding:'2px 4px', color:posClr[i], fontSize:9 }}>{medals[i]}</td>
                <td style={{ padding:'2px 5px', fontSize:8.5, fontWeight:i<2?700:500, color:C.dark,
                  maxWidth:85, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.team}</td>
                <td style={{ ...thS, padding:'2px 3px', fontSize:8.5, color:C.gray }}>{s.pj}</td>
                <td style={{ ...thS, padding:'2px 3px', fontSize:9, fontWeight:800,
                  color:i<2?C.blue:C.gray }}>{s.pts}</td>
                <td style={{ ...thS, padding:'2px 3px', fontSize:8.5, color:C.gray }}>{s.gf}</td>
                <td style={{ ...thS, padding:'2px 3px', fontSize:8.5, color:C.gray }}>{s.ga}</td>
                <td style={{ ...thS, padding:'2px 3px', fontSize:8.5, fontWeight:s.gd!==0?700:400,
                  color:s.gd>0?C.green:s.gd<0?'#dc2626':C.gray }}>{s.gd>0?'+':''}{s.gd}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Matches */}
      <table style={{ width:'100%', borderCollapse:'collapse' }}>
        <thead>
          <tr style={{ background:C.grayLt }}>
            <th style={{ ...thS, textAlign:'left', paddingLeft:7 }}>ID</th>
            <th style={{ ...thS, textAlign:'left' }}>Local</th>
            <th style={{ ...thS, color:C.blue }}>PICK</th>
            <th style={{ ...thS, textAlign:'right', paddingRight:7 }}>Visitante</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((m,i)=>{
            const pk=picks[m.id]; const hp=pk?.h!=null
            return (
              <tr key={m.id} style={{ background:i%2===0?'#fff':'#fafafa',
                borderTop:`0.5px solid ${C.border}` }}>
                <td style={{ ...tdS, color:C.gray, fontWeight:700, fontSize:8.5, width:24 }}>{m.id}</td>
                <td style={{ ...tdS, fontSize:9.5, fontWeight:600, maxWidth:85 }}>
                  <span style={{ display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.h}</span>
                </td>
                <td style={{ ...tdS, textAlign:'center' }}>
                  {hp
                    ? <span style={{ fontWeight:900, fontSize:11.5, color:C.blue }}>
                        {pk.h}<span style={{ color:C.gray, margin:'0 2px' }}>–</span>{pk.a}
                      </span>
                    : <span style={{ color:'#d1d5db', fontSize:7.5, fontStyle:'italic' }}>–</span>}
                </td>
                <td style={{ ...tdS, fontSize:9.5, fontWeight:600, textAlign:'right', maxWidth:85 }}>
                  <span style={{ display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', textAlign:'right' }}>{m.a}</span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Bracket: tarjeta de partido ──────────────────────────────────
function BMatch({ mid, picks }) {
  const pk = picks[mid] || {}
  const hp = pk.h != null
  const st = R32_STATIC[mid] || {}
  const h = pk.hTeam || st.h || null
  const a = pk.aTeam || st.a || null
  const hWin = pk.win && pk.win === h
  const aWin = pk.win && pk.win === a

  return (
    <div style={{ border:`1.5px solid ${hp?C.blue:C.border}`, borderRadius:6,
      overflow:'hidden', background:'#fff', width:'100%',
      boxShadow:hp?`0 0 0 2px ${C.blue}22`:'none' }}>
      {/* ID bar */}
      <div style={{ background:hp?C.blue:C.grayLt, color:hp?'#fff':C.gray,
        padding:'2px 6px', display:'flex', justifyContent:'space-between',
        fontSize:7.5, fontWeight:700, lineHeight:1.4 }}>
        <span>{mid}</span>
        {hp && <span style={{ fontWeight:900 }}>{pk.h}–{pk.a}</span>}
      </div>
      {/* Home */}
      <div style={{ display:'flex', alignItems:'center', gap:3, padding:'3px 6px',
        minHeight:22, background:hWin?C.greenLt:'#fff' }}>
        <span style={{ flex:1, fontSize:8.5, fontWeight:hWin?700:500,
          color:hWin?C.green:h?C.dark:C.gray,
          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {h || <em style={{ fontStyle:'italic', color:C.gray, fontSize:7.5 }}>TBD</em>}
        </span>
        {h && pk.h!=null &&
          <span style={{ fontSize:9, fontWeight:800, color:C.blue, background:C.blueLt,
            borderRadius:3, padding:'0 4px', minWidth:14, textAlign:'center' }}>{pk.h}</span>}
        {hWin && <span style={{ fontSize:7, color:C.green }}>▶</span>}
      </div>
      {/* Away */}
      <div style={{ display:'flex', alignItems:'center', gap:3, padding:'3px 6px',
        minHeight:22, borderTop:`0.5px solid ${C.border}`, background:aWin?C.greenLt:'#fff' }}>
        <span style={{ flex:1, fontSize:8.5, fontWeight:aWin?700:500,
          color:aWin?C.green:a?C.dark:C.gray,
          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {a || <em style={{ fontStyle:'italic', color:C.gray, fontSize:7.5 }}>TBD</em>}
        </span>
        {a && pk.a!=null &&
          <span style={{ fontSize:9, fontWeight:800, color:C.blue, background:C.blueLt,
            borderRadius:3, padding:'0 4px', minWidth:14, textAlign:'center' }}>{pk.a}</span>}
        {aWin && <span style={{ fontSize:7, color:C.green }}>▶</span>}
      </div>
    </div>
  )
}

// ── Bracket: columna ─────────────────────────────────────────────
// Renderiza matches distribuidos verticalmente dentro de altura fija
function BCol({ title, mids, picks, h: colH }) {
  const n = mids.length
  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1 }}>
      {/* Título */}
      <div style={{ textAlign:'center', fontSize:7.5, fontWeight:800, textTransform:'uppercase',
        letterSpacing:'.7px', color:'#fff', background:`linear-gradient(135deg,${C.blue},${C.blueDk})`,
        padding:'4px 2px', marginBottom:0, borderRadius:'5px 5px 0 0' }}>{title}</div>
      {/* Matches distribuidos uniformemente */}
      <div style={{ flex:1, display:'flex', flexDirection:'column',
        justifyContent:'space-around', padding:'6px 4px', gap:0,
        background:C.grayLt, border:`1px solid ${C.border}`, borderTop:'none',
        borderRadius:'0 0 5px 5px', height: colH }}>
        {mids.map(mid => (
          <div key={mid} style={{ padding:'3px 0' }}>
            <BMatch mid={mid} picks={picks} />
          </div>
        ))}
      </div>
    </div>
  )
}

// Conector SVG entre columnas
function BConn({ count }) {
  // count = número de matches de la columna izquierda
  const h = 72 // altura por match aproximada
  const totalH = count * h + (count-1)*6
  return (
    <div style={{ width:16, flexShrink:0, alignSelf:'stretch',
      display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:1, height:'60%', background:`${C.border}` }} />
    </div>
  )
}

// ── Centro del bracket ───────────────────────────────────────────
function BCenter({ picks }) {
  const fin = picks['M104'] || {}
  const t3  = picks['M103'] || {}

  const champ   = fin.win || null
  const runner  = champ ? (champ===fin.hTeam?fin.aTeam:fin.hTeam) : null
  const thirdW  = t3.win || null
  const thirdL  = thirdW ? (thirdW===t3.hTeam?t3.aTeam:t3.hTeam) : null

  const podium = [
    { e:'🏆', l:'Campeón',    pts:20, v: champ  || fin.hTeam  || '–' },
    { e:'🥈', l:'Subcampeón', pts:10, v: runner || fin.aTeam  || '–' },
    { e:'🥉', l:'3er lugar',  pts:5,  v: thirdW || t3.hTeam   || '–' },
    { e:'4️⃣', l:'4to lugar',  pts:3,  v: thirdL || t3.aTeam   || '–' },
  ]

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center',
      justifyContent:'center', gap:8, width:170, flexShrink:0, padding:'0 8px' }}>

      {/* Gran Final */}
      <div style={{ width:'100%' }}>
        <div style={{ background:`linear-gradient(135deg,${C.blue},${C.blueDk})`, color:'#fff',
          fontSize:8, fontWeight:900, textAlign:'center', padding:'5px 4px',
          borderRadius:'7px 7px 0 0', letterSpacing:'.3px' }}>🏆 GRAN FINAL · 19 JUL</div>
        <BMatch mid="M104" picks={picks} />
      </div>

      <div style={{ width:'65%', height:1, background:C.border }} />

      {/* 3er Puesto */}
      <div style={{ width:'100%' }}>
        <div style={{ fontSize:8, fontWeight:800, color:C.orange, textAlign:'center',
          padding:'3px 0', textTransform:'uppercase', letterSpacing:'.3px' }}>
          🥉 3er Puesto · 18 Jul
        </div>
        <BMatch mid="M103" picks={picks} />
      </div>

      <div style={{ width:'65%', height:1, background:C.border }} />

      {/* Orden final */}
      <div style={{ border:`1.5px solid ${C.blue}44`, borderRadius:8,
        overflow:'hidden', width:'100%' }}>
        <div style={{ background:`linear-gradient(135deg,${C.blue},${C.blueDk})`,
          color:'#fff', fontSize:8, fontWeight:700, padding:'4px 8px',
          textTransform:'uppercase', letterSpacing:'.4px' }}>🏅 Orden Final</div>
        {podium.map(r=>(
          <div key={r.l} style={{ display:'flex', alignItems:'center', gap:4,
            padding:'3px 7px', borderTop:`0.5px solid ${C.border}`,
            background:r.e==='🏆'?'rgba(0,85,212,.04)':'#fff' }}>
            <span style={{ fontSize:9 }}>{r.e}</span>
            <span style={{ flex:1, fontSize:8, color:C.mid, fontWeight:600 }}>{r.l}</span>
            <span style={{ fontSize:8, fontWeight:800, color:C.blue,
              background:C.blueLt, borderRadius:3, padding:'0 4px' }}>{r.pts}p</span>
            <span style={{ fontSize:8, fontWeight:700, color:C.dark,
              maxWidth:60, overflow:'hidden', textOverflow:'ellipsis',
              whiteSpace:'nowrap', textAlign:'right' }}>{r.v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── BRACKET COMPLETO como tabla HTML pura para garantizar render ──
// Usamos <table> porque flex con minWidth no siempre respeta el ancho en print
function FullBracket({ picks }) {
  const COL_W = 145 // px por columna
  const CONN_W = 16

  const colsL = [
    { title:'R32',     mids:['M73','M74','M75','M76','M77','M78','M79','M80'] },
    { title:'Octavos', mids:['M89','M90','M91','M92'] },
    { title:'Cuartos', mids:['M97','M98'] },
    { title:'Semis',   mids:['M101'] },
  ]
  const colsR = [
    { title:'Semis',   mids:['M102'] },
    { title:'Cuartos', mids:['M99','M100'] },
    { title:'Octavos', mids:['M93','M94','M95','M96'] },
    { title:'R32',     mids:['M81','M82','M83','M84','M85','M86','M87','M88'] },
  ]

  return (
    <table style={{ width:'100%', borderCollapse:'collapse', tableLayout:'fixed' }}>
      <colgroup>
        {colsL.map((_,i) => <col key={'l'+i} style={{ width:COL_W }} />)}
        <col style={{ width:CONN_W }} />
        {/* Centro */}
        <col style={{ width:180 }} />
        <col style={{ width:CONN_W }} />
        {colsR.map((_,i) => <col key={'r'+i} style={{ width:COL_W }} />)}
      </colgroup>
      <tbody>
        <tr style={{ verticalAlign:'top' }}>
          {/* Columnas izquierda */}
          {colsL.map((col,i) => (
            <td key={'l'+i} style={{ padding:'0 2px', verticalAlign:'stretch' }}>
              <ColContent title={col.title} mids={col.mids} picks={picks} />
            </td>
          ))}
          {/* Conector */}
          <td style={{ width:CONN_W }} />
          {/* Centro */}
          <td style={{ padding:'0 4px', verticalAlign:'middle' }}>
            <BCenter picks={picks} />
          </td>
          {/* Conector */}
          <td style={{ width:CONN_W }} />
          {/* Columnas derecha */}
          {colsR.map((col,i) => (
            <td key={'r'+i} style={{ padding:'0 2px', verticalAlign:'stretch' }}>
              <ColContent title={col.title} mids={col.mids} picks={picks} />
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  )
}

function ColContent({ title, mids, picks }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      {/* Título col */}
      <div style={{ textAlign:'center', fontSize:7.5, fontWeight:800, textTransform:'uppercase',
        letterSpacing:'.7px', color:'#fff',
        background:`linear-gradient(135deg,${C.blue},${C.blueDk})`,
        padding:'4px 2px', borderRadius:'5px 5px 0 0' }}>{title}</div>
      {/* Matches distribuidos */}
      <div style={{ flex:1, display:'flex', flexDirection:'column',
        justifyContent:'space-around', padding:'5px 2px',
        background:C.grayLt, border:`1px solid ${C.border}`,
        borderTop:'none', borderRadius:'0 0 5px 5px', gap:4 }}>
        {mids.map(mid => (
          <BMatch key={mid} mid={mid} picks={picks} />
        ))}
      </div>
    </div>
  )
}

// ── Footer ───────────────────────────────────────────────────────
function Footer({ profile, quiniela }) {
  return (
    <div style={{ marginTop:10, paddingTop:7, borderTop:`0.5px solid ${C.border}`,
      display:'flex', justifyContent:'space-between', color:C.gray, fontSize:8 }}>
      <span>🏆 Quiniela Mundial FIFA 2026 · {profile?.username} · {quiniela?.name}</span>
      <span>quiniela2026panas.netlify.app · {new Date().toLocaleDateString('es-ES',{day:'numeric',month:'long',year:'numeric'})}</span>
    </div>
  )
}

// ── Página principal ─────────────────────────────────────────────
export default function PrintPage() {
  const { id: quinielaId } = useParams()
  const navigate = useNavigate()
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
  }

  // Nombre del archivo PDF
  useEffect(() => {
    if (quiniela?.name) {
      document.title = `Quiniela Mundial 2026 - ${quiniela.name}`
    }
  }, [quiniela])

  const filledCount = Object.values(picks).filter(p=>p?.h!=null).length

  if (loading) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center',
      justifyContent:'center', height:'100vh',
      fontFamily:'"Helvetica Neue",Arial,sans-serif', color:C.gray, gap:12 }}>
      <div style={{ fontSize:32 }}>🏆</div>
      <div style={{ fontWeight:700, fontSize:14 }}>Preparando quiniela...</div>
    </div>
  )

  const dateStr = new Date().toLocaleDateString('es-ES',{day:'numeric',month:'long',year:'numeric'})

  return (
    <div style={{ fontFamily:'"Helvetica Neue",Arial,sans-serif',
      fontSize:11, color:C.dark, background:'#fff' }}>

      <style>{`
        @media print {
          .no-print { display:none !important; }
          body { margin:0; -webkit-print-color-adjust:exact; print-color-adjust:exact; background:#fff; }
          .bracket-page { page-break-before: always; }
        }
        @page { margin:1cm; size:A4 portrait; }
        @page .landscape-page { size:A4 landscape; margin:.8cm; }
      `}</style>

      {/* Botones */}
      <div className="no-print" style={{ position:'fixed', bottom:20, right:20, zIndex:100,
        display:'flex', flexDirection:'column', gap:8, alignItems:'flex-end' }}>
        <div style={{ fontSize:11, color:C.gray, background:'#fff', border:`1px solid ${C.border}`,
          borderRadius:8, padding:'8px 12px', lineHeight:1.5, maxWidth:270 }}>
          💡 Al guardar PDF selecciona <strong>"Más configuraciones"</strong> y activa
          <strong> "Gráficos de fondo"</strong>.
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={()=>navigate(-1)} style={{ padding:'10px 16px', background:C.grayLt,
            color:C.dark, border:'none', borderRadius:10, fontWeight:600, fontSize:13,
            cursor:'pointer' }}>← Volver</button>
          <button onClick={()=>window.print()} style={{ padding:'10px 22px', background:C.blue,
            color:'#fff', border:'none', borderRadius:10, fontWeight:700, fontSize:13,
            cursor:'pointer', boxShadow:`0 4px 14px ${C.blue}44` }}>
            🖨️ Guardar PDF
          </button>
        </div>
      </div>

      {/* ══ PÁGINA 1: GRUPOS ══════════════════════════════════════ */}
      <div style={{ padding:'20px 22px 16px', maxWidth:1400, margin:'0 auto' }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
          marginBottom:14, paddingBottom:10, borderBottom:`2.5px solid ${C.blue}` }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:40, height:40, borderRadius:10, flexShrink:0,
              background:`linear-gradient(135deg,${C.blue},${C.blueDk})`,
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>🏆</div>
            <div>
              <div style={{ fontSize:17, fontWeight:900, color:C.dark }}>Quiniela Mundial FIFA 2026</div>
              <div style={{ fontSize:10.5, color:C.gray, marginTop:1 }}>
                {profile?.username}{profile?.full_name?` · ${profile.full_name}`:''} · <em>{quiniela?.name}</em>
              </div>
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:10, fontWeight:800, color:C.blue, background:C.blueLt,
              borderRadius:6, padding:'4px 12px', textTransform:'uppercase',
              letterSpacing:'.5px', display:'inline-block' }}>Fase de Grupos</div>
            <div style={{ fontSize:8.5, color:C.gray, marginTop:4 }}>
              {filledCount}/104 picks · {dateStr}
            </div>
          </div>
        </div>

        {/* 12 grupos 3×4 */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
          {Object.entries(GROUP_MATCHES).map(([g,ms]) => (
            <GroupCard key={g} g={g} matches={ms} picks={picks} />
          ))}
        </div>

        <Footer profile={profile} quiniela={quiniela} />
      </div>

      {/* ══ PÁGINA 2: LLAVE ═══════════════════════════════════════ */}
      <div className="bracket-page" style={{ padding:'16px 14px 14px' }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
          marginBottom:10, paddingBottom:8, borderBottom:`2.5px solid ${C.orange}` }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:20 }}>⚡</span>
            <div>
              <div style={{ fontSize:15, fontWeight:900, color:C.dark }}>Fase Eliminatoria — Llave Completa</div>
              <div style={{ fontSize:10, color:C.gray }}>
                {profile?.username}{profile?.full_name?` · ${profile.full_name}`:''} · {quiniela?.name}
              </div>
            </div>
          </div>
          {/* Leyenda fases */}
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', justifyContent:'flex-end' }}>
            {[['R32','28Jun–3Jul'],['Octavos','4–7Jul'],['Cuartos','9–11Jul'],
              ['Semis','14–15Jul'],['Final','19Jul']].map(([ph,d])=>(
              <div key={ph} style={{ display:'flex', alignItems:'center', gap:3, fontSize:9 }}>
                <div style={{ width:7, height:7, borderRadius:2, background:C.blue }} />
                <strong style={{ color:C.dark }}>{ph}</strong>
                <span style={{ color:C.gray }}>{d}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bracket completo como tabla */}
        <FullBracket picks={picks} />

        <Footer profile={profile} quiniela={quiniela} />
      </div>

    </div>
  )
}
