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

// Calcula tabla de posición de un grupo desde los picks
function calcStandings(groupLetter, picks) {
  const teams = GROUPS[groupLetter]
  const matches = GROUP_MATCHES[groupLetter]
  const stats = {}
  teams.forEach(t => { stats[t] = { pts:0, gf:0, ga:0, gd:0, pj:0 } })
  matches.forEach(m => {
    const pk = picks[m.id]
    if (pk?.h == null) return
    const h = pk.h, a = pk.a
    stats[m.h].pj++; stats[m.a].pj++
    stats[m.h].gf += h; stats[m.h].ga += a; stats[m.h].gd += h-a
    stats[m.a].gf += a; stats[m.a].ga += h; stats[m.a].gd += a-h
    if (h > a)      { stats[m.h].pts += 3 }
    else if (h < a) { stats[m.a].pts += 3 }
    else            { stats[m.h].pts += 1; stats[m.a].pts += 1 }
  })
  return teams
    .map(t => ({ team: t, ...stats[t] }))
    .sort((a,b) => b.pts-a.pts || b.gd-a.gd || b.gf-a.gf)
}

// R32 fallback seedings
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

// Bracket completo
const BRACKET_L = {
  r32: ['M73','M74','M75','M76','M77','M78','M79','M80'],
  r16: ['M89','M90','M91','M92'],
  qf:  ['M97','M98'],
  sf:  ['M101'],
}
const BRACKET_R = {
  r32: ['M81','M82','M83','M84','M85','M86','M87','M88'],
  r16: ['M93','M94','M95','M96'],
  qf:  ['M99','M100'],
  sf:  ['M102'],
}

// ── Colores ──────────────────────────────────────────────────────
const C = {
  blue:'#0055d4', blueDk:'#003a9e', blueLt:'#e8f0fe',
  orange:'#e07b00', orangeLt:'#fff3e0',
  green:'#1a7a38', greenLt:'#e8f5e9',
  gray:'#6b7280', grayLt:'#f3f4f6', border:'#d1d5db',
  dark:'#111827', mid:'#374151', white:'#fff',
}

// ── Estilos base ─────────────────────────────────────────────────
const thS = { padding:'3px 6px', fontSize:8, fontWeight:700, textTransform:'uppercase',
  letterSpacing:'.3px', color:'#9ca3af', textAlign:'center', borderBottom:`0.5px solid #e5e7eb` }
const tdS = { padding:'4px 6px', fontSize:10 }

// ── GroupCard con tabla de posiciones + partidos ─────────────────
function GroupCard({ g, matches, picks }) {
  const standings = calcStandings(g, picks)
  const picksCount = matches.filter(m => picks[m.id]?.h != null).length
  const posColors = [C.blue, C.orange, C.green, '#9333ea']
  const medals = ['🥇','🥈','🥉','4']

  return (
    <div style={{ breakInside:'avoid', border:`1px solid ${C.border}`, borderRadius:10, overflow:'hidden', background:'#fff' }}>

      {/* Header */}
      <div style={{ background:`linear-gradient(135deg,${C.blue},${C.blueDk})`, color:'#fff',
        padding:'6px 10px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontWeight:900, fontSize:13, letterSpacing:'.5px' }}>GRUPO {g}</span>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:8, opacity:.75 }}>
            {GROUPS[g].map(t => t.split(' ')[0]).join(' · ')}
          </span>
          <span style={{ fontSize:9, fontWeight:700, background:'rgba(255,255,255,.2)',
            borderRadius:4, padding:'1px 6px' }}>{picksCount}/6</span>
        </div>
      </div>

      {/* Tabla de posiciones */}
      <div style={{ background:C.blueLt, borderBottom:`1px solid ${C.border}` }}>
        <div style={{ padding:'3px 8px 2px', fontSize:7, fontWeight:800, textTransform:'uppercase',
          letterSpacing:'.5px', color:C.blue, opacity:.8 }}>Clasificación proyectada</div>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ borderBottom:`0.5px solid ${C.border}` }}>
              {['#','Equipo','PJ','PTS','GF','GA','DG'].map(h => (
                <th key={h} style={{ ...thS, padding:'2px 5px', color:C.blue, fontSize:7 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {standings.map((s, i) => (
              <tr key={s.team} style={{ borderTop:`0.5px solid ${C.border}88`,
                background: i === 0 ? 'rgba(0,85,212,.07)' : i === 1 ? 'rgba(0,85,212,.03)' : 'transparent' }}>
                <td style={{ ...thS, padding:'3px 5px', color:posColors[i], fontSize:10 }}>{medals[i]}</td>
                <td style={{ padding:'3px 6px', fontSize:9, fontWeight: i<2?700:500, color:C.dark,
                  maxWidth:90, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.team}</td>
                <td style={{ ...thS, padding:'3px 4px', fontSize:9, color:C.gray }}>{s.pj}</td>
                <td style={{ ...thS, padding:'3px 4px', fontSize:10, fontWeight:800,
                  color: i<2?C.blue:C.gray }}>{s.pts}</td>
                <td style={{ ...thS, padding:'3px 4px', fontSize:9, color:C.gray }}>{s.gf}</td>
                <td style={{ ...thS, padding:'3px 4px', fontSize:9, color:C.gray }}>{s.ga}</td>
                <td style={{ ...thS, padding:'3px 4px', fontSize:9,
                  color: s.gd>0?C.green:s.gd<0?'#dc2626':C.gray,
                  fontWeight: s.gd!==0?700:400 }}>{s.gd>0?'+':''}{s.gd}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Partidos */}
      <table style={{ width:'100%', borderCollapse:'collapse' }}>
        <thead>
          <tr style={{ background:C.grayLt }}>
            <th style={{ ...thS, textAlign:'left', paddingLeft:8 }}>ID</th>
            <th style={{ ...thS, textAlign:'left' }}>Local</th>
            <th style={{ ...thS, color:C.blue }}>PICK</th>
            <th style={{ ...thS, textAlign:'right', paddingRight:8 }}>Visitante</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((m, i) => {
            const pk = picks[m.id]
            const hasPick = pk?.h != null
            return (
              <tr key={m.id} style={{ background:i%2===0?'#fff':'#fafafa',
                borderTop:`0.5px solid ${C.border}` }}>
                <td style={{ ...tdS, color:C.gray, fontWeight:700, fontSize:9, width:26 }}>{m.id}</td>
                <td style={{ ...tdS, fontSize:10, fontWeight:600, maxWidth:90 }}>
                  <span style={{ display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.h}</span>
                </td>
                <td style={{ ...tdS, textAlign:'center' }}>
                  {hasPick
                    ? <span style={{ fontWeight:900, fontSize:12, color:C.blue }}>
                        {pk.h}<span style={{ color:C.gray, margin:'0 2px' }}>–</span>{pk.a}
                      </span>
                    : <span style={{ color:'#d1d5db', fontSize:8, fontStyle:'italic' }}>–</span>}
                </td>
                <td style={{ ...tdS, fontSize:10, fontWeight:600, textAlign:'right', maxWidth:90 }}>
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
function BracketMatch({ matchId, picks, isCenter=false }) {
  const pk = picks[matchId] || {}
  const hasPick = pk.h != null
  const st = R32_STATIC[matchId] || {}
  const h = pk.hTeam || st.h || null
  const a = pk.aTeam || st.a || null

  const teamRow = (team, score, isWinner) => (
    <div style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 7px',
      minHeight:26, borderTop: isWinner===false ? `0.5px solid ${C.border}` : 'none',
      background: isWinner && team ? C.greenLt : '#fff' }}>
      <span style={{ flex:1, fontSize:9, fontWeight: isWinner&&team?700:500,
        color: isWinner&&team?C.green : team?C.dark:C.gray,
        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
        {team || <em style={{ fontStyle:'italic', color:C.gray, fontSize:8 }}>TBD</em>}
      </span>
      {team && score != null &&
        <span style={{ fontSize:10, fontWeight:800, color:C.blue,
          background:C.blueLt, borderRadius:3, padding:'0 5px', minWidth:16, textAlign:'center' }}>
          {score}
        </span>}
      {isWinner && team && <span style={{ fontSize:7, color:C.green }}>▶</span>}
    </div>
  )

  return (
    <div style={{ border:`1.5px solid ${hasPick?C.blue:C.border}`,
      borderRadius:7, overflow:'hidden', background:'#fff', width:'100%',
      boxShadow: hasPick ? `0 0 0 2px ${C.blue}22` : 'none' }}>
      {/* ID bar */}
      <div style={{ background:hasPick?C.blue:C.grayLt,
        color:hasPick?'#fff':C.gray, padding:'2px 7px',
        display:'flex', justifyContent:'space-between', fontSize:8, fontWeight:700 }}>
        <span>{matchId}</span>
        {hasPick && <span style={{ fontWeight:900 }}>{pk.h}–{pk.a}</span>}
      </div>
      {teamRow(h, pk.h, pk.win && pk.win===h)}
      {teamRow(a, pk.a, pk.win && pk.win===a)}
    </div>
  )
}

// ── Columna del bracket ──────────────────────────────────────────
function BracketCol({ title, matchIds, picks, colWidth=140 }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', width:colWidth, flexShrink:0 }}>
      <div style={{ textAlign:'center', fontSize:8, fontWeight:800, textTransform:'uppercase',
        letterSpacing:'.7px', color:C.blue, paddingBottom:6, borderBottom:`2px solid ${C.blue}33`,
        marginBottom:6, whiteSpace:'nowrap' }}>{title}</div>
      <div style={{ display:'flex', flexDirection:'column', flex:1,
        justifyContent:'space-around', gap:5 }}>
        {matchIds.map(mid => <BracketMatch key={mid} matchId={mid} picks={picks} />)}
      </div>
    </div>
  )
}

// Conector visual
function Conn() {
  return (
    <div style={{ width:14, flexShrink:0, display:'flex', alignItems:'center',
      justifyContent:'center', alignSelf:'stretch' }}>
      <div style={{ width:1, height:'55%', background:C.border }} />
    </div>
  )
}

// ── Centro del bracket: Final + 3ro + Orden final ────────────────
function BracketCenter({ picks }) {
  const fin = picks['M104'] || {}
  const t3  = picks['M103'] || {}

  const podiumRows = [
    { emoji:'🏆', label:'Campeón',    pts:20, val: fin.win || fin.hTeam || '–' },
    { emoji:'🥈', label:'Subcampeón', pts:10, val: !fin.win ? (fin.aTeam||'–') : (fin.win===fin.hTeam?fin.aTeam:fin.hTeam)||'–' },
    { emoji:'🥉', label:'3er lugar',  pts:5,  val: t3.win || t3.hTeam || '–' },
    { emoji:'4️⃣', label:'4to lugar',  pts:3,  val: !t3.win ? (t3.aTeam||'–') : (t3.win===t3.hTeam?t3.aTeam:t3.hTeam)||'–' },
  ]

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center',
      justifyContent:'center', gap:10, width:160, flexShrink:0, padding:'0 6px' }}>

      {/* Final */}
      <div style={{ width:'100%' }}>
        <div style={{ background:`linear-gradient(135deg,${C.blue},${C.blueDk})`,
          color:'#fff', fontSize:8, fontWeight:800, textAlign:'center',
          padding:'4px 6px', borderRadius:'6px 6px 0 0', letterSpacing:'.4px' }}>
          🏆 GRAN FINAL · 19 JUL
        </div>
        <BracketMatch matchId="M104" picks={picks} isCenter />
      </div>

      <div style={{ width:'70%', height:1, background:C.border }} />

      {/* 3er puesto */}
      <div style={{ width:'100%' }}>
        <div style={{ fontSize:8, fontWeight:800, color:C.orange, textAlign:'center',
          padding:'3px 0 4px', textTransform:'uppercase', letterSpacing:'.4px' }}>
          🥉 3er Puesto · 18 Jul
        </div>
        <BracketMatch matchId="M103" picks={picks} isCenter />
      </div>

      <div style={{ width:'70%', height:1, background:C.border }} />

      {/* Orden final */}
      <div style={{ border:`1.5px solid ${C.blue}44`, borderRadius:8,
        overflow:'hidden', background:'#fff', width:'100%' }}>
        <div style={{ background:`linear-gradient(135deg,${C.blue},${C.blueDk})`,
          color:'#fff', fontSize:8, fontWeight:700, padding:'4px 8px',
          textTransform:'uppercase', letterSpacing:'.5px' }}>🏅 Orden Final</div>
        {podiumRows.map(r => (
          <div key={r.label} style={{ display:'flex', alignItems:'center', gap:4,
            padding:'3px 7px', borderTop:`0.5px solid ${C.border}` }}>
            <span style={{ fontSize:9 }}>{r.emoji}</span>
            <span style={{ flex:1, fontSize:8, color:C.mid, fontWeight:600 }}>{r.label}</span>
            <span style={{ fontSize:8, fontWeight:800, color:C.blue,
              background:C.blueLt, borderRadius:3, padding:'0 4px' }}>{r.pts}p</span>
            <span style={{ fontSize:8, fontWeight:700, color:C.dark,
              maxWidth:65, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.val}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Footer ───────────────────────────────────────────────────────
function Footer({ profile, quiniela }) {
  return (
    <div style={{ marginTop:12, paddingTop:8, borderTop:`0.5px solid ${C.border}`,
      display:'flex', justifyContent:'space-between', color:C.gray, fontSize:8 }}>
      <span>🏆 Quiniela Mundial FIFA 2026 · {profile?.username} · {quiniela?.name}</span>
      <span>quiniela2026panas.netlify.app · {new Date().toLocaleDateString('es-ES',{day:'numeric',month:'long',year:'numeric'})}</span>
    </div>
  )
}

// ── Página principal ─────────────────────────────────────────────
export default function PrintPage() {
  const { id: quinielaId } = useParams()
  const { user } = useAuth()
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
    setTimeout(() => window.print(), 900)
  }

  const filledCount = Object.values(picks).filter(p => p?.h != null).length

  if (loading) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center',
      justifyContent:'center', height:'100vh', fontFamily:'system-ui, sans-serif',
      color:C.gray, gap:12 }}>
      <div style={{ fontSize:32 }}>🏆</div>
      <div style={{ fontWeight:700, fontSize:14 }}>Preparando quiniela...</div>
    </div>
  )

  const dateStr = new Date().toLocaleDateString('es-ES',{day:'numeric',month:'long',year:'numeric'})

  return (
    <div style={{ fontFamily:'"Helvetica Neue", Arial, sans-serif',
      fontSize:11, color:C.dark, background:'#f0f2f5', minHeight:'100vh' }}>

      <style>{`
        @media print {
          .no-print { display:none !important; }
          body { margin:0; -webkit-print-color-adjust:exact; print-color-adjust:exact; background:#fff; }
          .print-section { page-break-after: always; }
          @page { margin: 1cm; size: auto; }
        }
      `}</style>

      {/* ── Botones ── */}
      <div className="no-print" style={{ position:'fixed', bottom:24, right:24, zIndex:100,
        display:'flex', flexDirection:'column', gap:10, alignItems:'flex-end' }}>
        <div style={{ fontSize:11, color:C.gray, background:'#fff', border:`1px solid ${C.border}`,
          borderRadius:8, padding:'8px 12px', lineHeight:1.5, maxWidth:260 }}>
          💡 Al guardar PDF activa <strong>"Gráficos de fondo"</strong> para que se vean los colores.
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => navigate(-1)} style={{ padding:'10px 16px', background:C.grayLt,
            color:C.dark, border:'none', borderRadius:10, fontWeight:600, fontSize:13,
            cursor:'pointer', fontFamily:'inherit' }}>← Volver</button>
          <button onClick={() => window.print()} style={{ padding:'10px 22px', background:C.blue,
            color:'#fff', border:'none', borderRadius:10, fontWeight:700, fontSize:13,
            cursor:'pointer', fontFamily:'inherit', boxShadow:`0 4px 16px ${C.blue}44` }}>
            🖨️ Guardar PDF
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          SECCIÓN 1: FASE DE GRUPOS
      ══════════════════════════════════════════════════════════ */}
      <div className="print-section" style={{ background:'#fff', padding:'24px 24px 20px',
        maxWidth:1400, margin:'0 auto' }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
          marginBottom:16, paddingBottom:12, borderBottom:`2px solid ${C.blue}` }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:42, height:42, borderRadius:10,
              background:`linear-gradient(135deg,${C.blue},${C.blueDk})`,
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>🏆</div>
            <div>
              <div style={{ fontSize:18, fontWeight:900, color:C.dark, letterSpacing:'-.5px' }}>
                Quiniela Mundial FIFA 2026
              </div>
              <div style={{ fontSize:11, color:C.gray, marginTop:2 }}>
                {profile?.username}{profile?.full_name?` · ${profile.full_name}`:''} · <em>{quiniela?.name}</em>
              </div>
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:11, fontWeight:800, color:C.blue,
              background:C.blueLt, borderRadius:6, padding:'4px 12px',
              textTransform:'uppercase', letterSpacing:'.5px', display:'inline-block' }}>
              Fase de Grupos
            </div>
            <div style={{ fontSize:9, color:C.gray, marginTop:4 }}>
              {filledCount}/104 picks · {dateStr}
            </div>
          </div>
        </div>

        {/* Grupos A–L en 3 columnas × 4 filas */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
          {Object.entries(GROUP_MATCHES).map(([g, matches]) => (
            <GroupCard key={g} g={g} matches={matches} picks={picks} />
          ))}
        </div>

        <Footer profile={profile} quiniela={quiniela} />
      </div>

      {/* ══════════════════════════════════════════════════════════
          SECCIÓN 2: LLAVE ELIMINATORIA
      ══════════════════════════════════════════════════════════ */}
      <div style={{ background:'#fff', padding:'24px 20px 20px', maxWidth:'100%', margin:'0 auto', overflowX:'auto' }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
          marginBottom:12, paddingBottom:10, borderBottom:`2px solid ${C.orange}` }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:22 }}>⚡</span>
            <div>
              <div style={{ fontSize:16, fontWeight:900, color:C.dark }}>Fase Eliminatoria</div>
              <div style={{ fontSize:10, color:C.gray }}>
                {profile?.username}{profile?.full_name?` · ${profile.full_name}`:''} · {quiniela?.name}
              </div>
            </div>
          </div>
          <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
            {[['R32','28 Jun–3 Jul'],['Octavos','4–7 Jul'],['Cuartos','9–11 Jul'],
              ['Semis','14–15 Jul'],['Final','19 Jul']].map(([ph,dates]) => (
              <div key={ph} style={{ fontSize:9, color:C.gray, display:'flex', alignItems:'center', gap:3 }}>
                <div style={{ width:7, height:7, borderRadius:2, background:C.blue }} />
                <strong style={{ color:C.dark }}>{ph}</strong> {dates}
              </div>
            ))}
          </div>
        </div>

        {/* Bracket completo — una sola fila sin scroll */}
        <div style={{ display:'flex', alignItems:'stretch', gap:0, minWidth:1200 }}>

          {/* Lado izquierdo */}
          <BracketCol title="R32" matchIds={BRACKET_L.r32} picks={picks} colWidth={138} />
          <Conn />
          <BracketCol title="Octavos" matchIds={BRACKET_L.r16} picks={picks} colWidth={138} />
          <Conn />
          <BracketCol title="Cuartos" matchIds={BRACKET_L.qf} picks={picks} colWidth={138} />
          <Conn />
          <BracketCol title="Semis" matchIds={BRACKET_L.sf} picks={picks} colWidth={138} />
          <Conn />

          {/* Centro */}
          <BracketCenter picks={picks} />

          {/* Lado derecho */}
          <Conn />
          <BracketCol title="Semis" matchIds={BRACKET_R.sf} picks={picks} colWidth={138} />
          <Conn />
          <BracketCol title="Cuartos" matchIds={BRACKET_R.qf} picks={picks} colWidth={138} />
          <Conn />
          <BracketCol title="Octavos" matchIds={BRACKET_R.r16} picks={picks} colWidth={138} />
          <Conn />
          <BracketCol title="R32" matchIds={BRACKET_R.r32} picks={picks} colWidth={138} />
        </div>

        <Footer profile={profile} quiniela={quiniela} />
      </div>

    </div>
  )
}
