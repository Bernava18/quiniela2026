import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase, getQuinielaPicks } from '../lib/supabase'

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
    {id:`${g}1`,h:teams[0],a:teams[1]},
    {id:`${g}2`,h:teams[2],a:teams[3]},
    {id:`${g}3`,h:teams[0],a:teams[2]},
    {id:`${g}4`,h:teams[3],a:teams[1]},
    {id:`${g}5`,h:teams[3],a:teams[0]},
    {id:`${g}6`,h:teams[1],a:teams[2]},
  ]
})

function calcStandings(g, picks) {
  const teams = GROUPS[g]
  const s = {}
  teams.forEach(t => { s[t]={pts:0,gf:0,ga:0,gd:0,pj:0} })
  GROUP_MATCHES[g].forEach(m => {
    const pk = picks[m.id]
    if (pk?.h==null) return
    const h=pk.h,a=pk.a
    s[m.h].pj++; s[m.a].pj++
    s[m.h].gf+=h; s[m.h].ga+=a; s[m.h].gd+=h-a
    s[m.a].gf+=a; s[m.a].ga+=h; s[m.a].gd+=a-h
    if(h>a) s[m.h].pts+=3
    else if(h<a) s[m.a].pts+=3
    else { s[m.h].pts+=1; s[m.a].pts+=1 }
  })
  return teams.map(t=>({team:t,...s[t]}))
    .sort((a,b)=>b.pts-a.pts||b.gd-a.gd||b.gf-a.gf)
}

// R32 slot labels
const R32_STATIC = {
  M73:{h:'2ºA',a:'2ºB'}, M74:{h:'Alemania(1E)',a:'3ºBCEF'},
  M75:{h:'P.Bajos(1F)',a:'2ºC'}, M76:{h:'Brasil(1C)',a:'2ºF'},
  M77:{h:'Francia(1I)',a:'3ºGHIJ'}, M78:{h:'2ºE',a:'2ºI'},
  M79:{h:'México(1A)',a:'3ºABCD'}, M80:{h:'Inglaterra(1L)',a:'3ºIJKL'},
  M81:{h:'EE.UU.(1D)',a:'3ºABCD'}, M82:{h:'Bélgica(1G)',a:'3ºEFGH'},
  M83:{h:'2ºK',a:'2ºL'}, M84:{h:'España(1H)',a:'2ºJ'},
  M85:{h:'Canadá(1B)',a:'3ºABCD'}, M86:{h:'Argentina(1J)',a:'2ºH'},
  M87:{h:'Portugal(1K)',a:'3ºIJKL'}, M88:{h:'2ºD',a:'2ºG'},
}

// ── Colores ──────────────────────────────────────────────────────
const BL='#0055d4', BD='#003a9e', BLT='#dbeafe'
const OR='#d97706', GR='#15803d', GLT='#dcfce7'
const GY='#6b7280', GB='#f9fafb', BO='#e5e7eb', DK='#111827'

// ── Carga librerías PDF dinámicamente ────────────────────────────
function loadScript(src) {
  return new Promise((resolve,reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return }
    const s = document.createElement('script')
    s.src=src; s.onload=resolve; s.onerror=reject
    document.head.appendChild(s)
  })
}

// ── GroupCard ─────────────────────────────────────────────────────
function GroupCard({ g, matches, picks }) {
  const standings = calcStandings(g, picks)
  const cnt = matches.filter(m=>picks[m.id]?.h!=null).length
  const PC = [BL,OR,GR,'#9333ea']
  const ME = ['🥇','🥈','🥉','4']
  return (
    <div data-group={g} style={{ border:`1px solid ${BO}`, borderRadius:8, overflow:'hidden', background:'#fff', breakInside:'avoid', pageBreakInside:'avoid' }}>
      <div style={{ background:`linear-gradient(135deg,${BL},${BD})`, color:'#fff', padding:'5px 9px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontWeight:900, fontSize:12 }}>GRUPO {g}</span>
        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
          <span style={{ fontSize:7, opacity:.7 }}>{GROUPS[g].map(t=>t.split(' ')[0]).join(' · ')}</span>
          <span style={{ fontSize:8, fontWeight:700, background:'rgba(255,255,255,.2)', borderRadius:3, padding:'1px 5px' }}>{cnt}/6</span>
        </div>
      </div>
      {/* Standings */}
      <div style={{ background:BLT, borderBottom:`1px solid ${BO}` }}>
        <div style={{ padding:'2px 7px 1px', fontSize:6.5, fontWeight:800, textTransform:'uppercase', letterSpacing:'.4px', color:BL }}>Clasificación proyectada</div>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead><tr>
            {['#','Equipo','PJ','PTS','GF','GA','DG'].map(h=>(
              <th key={h} style={{ padding:'1px 4px', fontSize:7, fontWeight:700, textTransform:'uppercase', color:'#9ca3af', textAlign:'center', borderBottom:`0.5px solid ${BO}` }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {standings.map((s,i)=>(
              <tr key={s.team} style={{ borderTop:`0.5px solid ${BO}88`, background:i===0?'rgba(0,85,212,.07)':i===1?'rgba(0,85,212,.03)':'transparent' }}>
                <td style={{ padding:'2px 4px', fontSize:9, fontWeight:700, color:PC[i], textAlign:'center' }}>{ME[i]}</td>
                <td style={{ padding:'2px 5px', fontSize:8.5, fontWeight:i<2?700:500, color:DK, maxWidth:80, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.team}</td>
                <td style={{ padding:'2px 3px', fontSize:8.5, color:GY, textAlign:'center' }}>{s.pj}</td>
                <td style={{ padding:'2px 3px', fontSize:9, fontWeight:800, color:i<2?BL:GY, textAlign:'center' }}>{s.pts}</td>
                <td style={{ padding:'2px 3px', fontSize:8.5, color:GY, textAlign:'center' }}>{s.gf}</td>
                <td style={{ padding:'2px 3px', fontSize:8.5, color:GY, textAlign:'center' }}>{s.ga}</td>
                <td style={{ padding:'2px 3px', fontSize:8.5, textAlign:'center', fontWeight:s.gd!==0?700:400, color:s.gd>0?GR:s.gd<0?'#dc2626':GY }}>{s.gd>0?'+':''}{s.gd}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Matches */}
      <table style={{ width:'100%', borderCollapse:'collapse' }}>
        <thead><tr style={{ background:GB }}>
          <th style={{ padding:'3px 5px', fontSize:7.5, fontWeight:700, textTransform:'uppercase', color:'#9ca3af', textAlign:'left', borderBottom:`0.5px solid ${BO}`, width:24 }}>ID</th>
          <th style={{ padding:'3px 5px', fontSize:7.5, fontWeight:700, textTransform:'uppercase', color:'#9ca3af', textAlign:'left', borderBottom:`0.5px solid ${BO}` }}>Local</th>
          <th style={{ padding:'3px 5px', fontSize:7.5, fontWeight:700, textTransform:'uppercase', color:BL, textAlign:'center', borderBottom:`0.5px solid ${BO}`, width:55 }}>PICK</th>
          <th style={{ padding:'3px 5px', fontSize:7.5, fontWeight:700, textTransform:'uppercase', color:'#9ca3af', textAlign:'right', borderBottom:`0.5px solid ${BO}` }}>Visitante</th>
        </tr></thead>
        <tbody>
          {matches.map((m,i)=>{
            const pk=picks[m.id]; const hp=pk?.h!=null
            return (
              <tr key={m.id} style={{ background:i%2===0?'#fff':'#fafafa', borderTop:`0.5px solid ${BO}` }}>
                <td style={{ padding:'3px 5px', fontSize:8.5, color:GY, fontWeight:700 }}>{m.id}</td>
                <td style={{ padding:'3px 5px', fontSize:9.5, fontWeight:600, maxWidth:85 }}>
                  <span style={{ display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.h}</span>
                </td>
                <td style={{ padding:'3px 5px', textAlign:'center' }}>
                  {hp ? <span style={{ fontWeight:900, fontSize:11.5, color:BL }}>{pk.h}<span style={{ color:GY, margin:'0 2px' }}>–</span>{pk.a}</span>
                      : <span style={{ color:'#d1d5db', fontSize:7.5, fontStyle:'italic' }}>–</span>}
                </td>
                <td style={{ padding:'3px 5px', fontSize:9.5, fontWeight:600, textAlign:'right', maxWidth:85 }}>
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

// ── Bracket match card ────────────────────────────────────────────
function BMatch({ mid, picks }) {
  const pk = picks[mid] || {}
  const hp = pk.h != null
  const st = R32_STATIC[mid] || {}
  const h = pk.hTeam || st.h || null
  const a = pk.aTeam || st.a || null
  const hW = pk.win && pk.win===h
  const aW = pk.win && pk.win===a
  const row = (team, score, win, isAway) => (
    <div style={{ display:'flex', alignItems:'center', gap:3, padding:'3px 6px', minHeight:22,
      background:win?GLT:'#fff', borderTop:isAway?`0.5px solid ${BO}`:'none' }}>
      <span style={{ flex:1, fontSize:8.5, fontWeight:win?700:500, color:win?GR:team?DK:GY,
        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
        {team || <em style={{ fontStyle:'italic', color:GY, fontSize:7.5 }}>TBD</em>}
      </span>
      {team && score!=null && <span style={{ fontSize:9, fontWeight:800, color:BL, background:BLT, borderRadius:3, padding:'0 4px', minWidth:14, textAlign:'center' }}>{score}</span>}
      {win && <span style={{ fontSize:7, color:GR }}>▶</span>}
    </div>
  )
  return (
    <div data-match={mid} style={{ border:`1.5px solid ${hp?BL:BO}`, borderRadius:5, overflow:'hidden', background:'#fff', width:'100%', boxShadow:hp?`0 0 0 2px ${BL}22`:'none' }}>
      <div style={{ background:hp?BL:GB, color:hp?'#fff':GY, padding:'2px 6px', display:'flex', justifyContent:'space-between', fontSize:7.5, fontWeight:700 }}>
        <span>{mid}</span>{hp && <span style={{ fontWeight:900 }}>{pk.h}–{pk.a}</span>}
      </div>
      {row(h, pk.h, hW, false)}
      {row(a, pk.a, aW, true)}
    </div>
  )
}

function BCol({ title, mids, picks }) {
  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>
      <div style={{ textAlign:'center', fontSize:7.5, fontWeight:800, textTransform:'uppercase', letterSpacing:'.6px', color:'#fff',
        background:`linear-gradient(135deg,${BL},${BD})`, padding:'4px 2px', borderRadius:'5px 5px 0 0' }}>{title}</div>
      <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'space-around', padding:'5px 3px', gap:4,
        background:GB, border:`1px solid ${BO}`, borderTop:'none', borderRadius:'0 0 5px 5px' }}>
        {mids.map(mid=><BMatch key={mid} mid={mid} picks={picks}/>)}
      </div>
    </div>
  )
}

function BCenter({ picks }) {
  const fin=picks['M104']||{}, t3=picks['M103']||{}
  const champ=fin.win||null
  const runner=champ?(champ===fin.hTeam?fin.aTeam:fin.hTeam):null
  const thirdW=t3.win||null
  const thirdL=thirdW?(thirdW===t3.hTeam?t3.aTeam:t3.hTeam):null
  const pod=[
    {e:'🏆',l:'Campeón',  pts:20,v:champ ||fin.hTeam||'–'},
    {e:'🥈',l:'Sub',      pts:10,v:runner||fin.aTeam||'–'},
    {e:'🥉',l:'3er lugar',pts:5, v:thirdW||t3.hTeam ||'–'},
    {e:'4️⃣',l:'4to lugar',pts:3, v:thirdL||t3.aTeam ||'–'},
  ]
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8, width:165, flexShrink:0, padding:'0 6px' }}>
      <div style={{ width:'100%' }}>
        <div style={{ background:`linear-gradient(135deg,${BL},${BD})`, color:'#fff', fontSize:8, fontWeight:900, textAlign:'center', padding:'5px 4px', borderRadius:'6px 6px 0 0' }}>🏆 GRAN FINAL · 19 JUL</div>
        <BMatch mid="M104" picks={picks}/>
      </div>
      <div style={{ width:'60%', height:1, background:BO }}/>
      <div style={{ width:'100%' }}>
        <div style={{ fontSize:8, fontWeight:800, color:OR, textAlign:'center', padding:'2px 0 3px', textTransform:'uppercase' }}>🥉 3er Puesto · 18 Jul</div>
        <BMatch mid="M103" picks={picks}/>
      </div>
      <div style={{ width:'60%', height:1, background:BO }}/>
      <div style={{ border:`1.5px solid ${BL}44`, borderRadius:7, overflow:'hidden', width:'100%' }}>
        <div style={{ background:`linear-gradient(135deg,${BL},${BD})`, color:'#fff', fontSize:8, fontWeight:700, padding:'4px 8px', textTransform:'uppercase' }}>🏅 Orden Final</div>
        {pod.map(r=>(
          <div key={r.l} style={{ display:'flex', alignItems:'center', gap:4, padding:'3px 7px', borderTop:`0.5px solid ${BO}` }}>
            <span style={{ fontSize:9 }}>{r.e}</span>
            <span style={{ flex:1, fontSize:8, fontWeight:600, color:'#374151' }}>{r.l}</span>
            <span style={{ fontSize:8, fontWeight:800, color:BL, background:BLT, borderRadius:3, padding:'0 4px' }}>{r.pts}p</span>
            <span style={{ fontSize:8, fontWeight:700, color:DK, maxWidth:55, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', textAlign:'right' }}>{r.v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Footer({ profile, quiniela }) {
  return (
    <div style={{ marginTop:10, paddingTop:7, borderTop:`0.5px solid ${BO}`, display:'flex', justifyContent:'space-between', color:GY, fontSize:8 }}>
      <span>🏆 Quiniela Mundial FIFA 2026 · {profile?.username} · {quiniela?.name}</span>
      <span>quiniela2026panas.netlify.app · {new Date().toLocaleDateString('es-ES',{day:'numeric',month:'long',year:'numeric'})}</span>
    </div>
  )
}

// ── PDF generation ────────────────────────────────────────────────
async function generatePDF(grupRef, brackRef, quinielaName) {
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js')
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js')
  const { jsPDF } = window.jspdf
  const opts = { scale:2, useCORS:true, backgroundColor:'#ffffff', logging:false }

  // Page 1: Groups — portrait
  const c1 = await window.html2canvas(grupRef, opts)
  const i1 = c1.toDataURL('image/jpeg',0.95)
  const pW1=210, pH1=Math.round((c1.height/c1.width)*pW1)
  const pdf = new jsPDF({ orientation:'portrait', unit:'mm', format:[pW1,pH1] })
  pdf.addImage(i1,'JPEG',0,0,pW1,pH1)

  // Page 2: Bracket — landscape, full width
  const c2 = await window.html2canvas(brackRef, { ...opts, scale:1.5, windowWidth: brackRef.scrollWidth+40 })
  const i2 = c2.toDataURL('image/jpeg',0.92)
  const pW2=Math.max(297,Math.round(c2.width/3.78)), pH2=Math.round((c2.height/c2.width)*pW2)
  pdf.addPage([pW2,pH2], pW2>pH2?'landscape':'portrait')
  pdf.addImage(i2,'JPEG',0,0,pW2,pH2)

  pdf.save(`Quiniela Mundial 2026 - ${quinielaName||'quiniela'}.pdf`)
}

// ── Main page ─────────────────────────────────────────────────────
export default function PrintPage() {
  const { id: quinielaId } = useParams()
  const navigate = useNavigate()
  const [quiniela, setQuiniela] = useState(null)
  const [picks, setPicks]       = useState({})
  const [profile, setProfile]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [generating, setGenerating] = useState(false)
  const grupRef  = useRef(null)
  const brackRef = useRef(null)

  useEffect(() => { load() }, [quinielaId])

  async function load() {
    const [{ data: q }, savedPicks] = await Promise.all([
      supabase.from('quinielas').select('*, profiles!quinielas_user_id_fkey(username, full_name)').eq('id', quinielaId).single(),
      getQuinielaPicks(quinielaId),
    ])
    setQuiniela(q)
    setProfile(q?.profiles)
    setPicks(savedPicks)
    setLoading(false)
  }

  async function handlePDF() {
    if (!grupRef.current || !brackRef.current) return
    setGenerating(true)
    try { await generatePDF(grupRef.current, brackRef.current, quiniela?.name) }
    catch(e) { console.error(e); alert('Error generando PDF: '+e.message) }
    setGenerating(false)
  }

  const filledCount = Object.values(picks).filter(p=>p?.h!=null).length
  const dateStr = new Date().toLocaleDateString('es-ES',{day:'numeric',month:'long',year:'numeric'})

  if (loading) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', fontFamily:'"Helvetica Neue",Arial,sans-serif', color:GY, gap:12 }}>
      <div style={{ fontSize:32 }}>🏆</div>
      <div style={{ fontWeight:700, fontSize:14 }}>Preparando quiniela...</div>
    </div>
  )

  return (
    <div style={{ fontFamily:'"Helvetica Neue",Arial,sans-serif', fontSize:11, color:DK, background:'#f0f2f5', minHeight:'100vh' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media print { .no-print { display:none !important; } body { background:#fff; } }
      `}</style>

      {/* Controls */}
      <div className="no-print" style={{ position:'fixed', bottom:20, right:20, zIndex:100, display:'flex', flexDirection:'column', gap:8, alignItems:'flex-end' }}>
        <div style={{ fontSize:11, color:GY, background:'#fff', border:`1px solid ${BO}`, borderRadius:8, padding:'8px 12px', lineHeight:1.5, maxWidth:260 }}>
          💡 El PDF captura exactamente lo que ves — grupos en hoja 1, llave en hoja 2.
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={()=>navigate(-1)} style={{ padding:'10px 16px', background:GB, color:DK, border:'none', borderRadius:10, fontWeight:600, fontSize:13, cursor:'pointer' }}>← Volver</button>
          <button onClick={handlePDF} disabled={generating} style={{ padding:'10px 22px', background:generating?GY:BL, color:'#fff', border:'none', borderRadius:10, fontWeight:700, fontSize:13, cursor:generating?'wait':'pointer', boxShadow:generating?'none':`0 4px 14px ${BL}44`, display:'flex', alignItems:'center', gap:8 }}>
            {generating
              ? <><span style={{ display:'inline-block', width:14, height:14, border:'2px solid #fff', borderTopColor:'transparent', borderRadius:'50%', animation:'spin .7s linear infinite' }}/> Generando...</>
              : '⬇️ Descargar PDF'}
          </button>
        </div>
      </div>

      <div style={{ padding:'24px', display:'flex', flexDirection:'column', gap:24 }}>

        {/* ── HOJA 1: GRUPOS ── */}
        <div ref={grupRef} style={{ background:'#fff', borderRadius:12, padding:'18px 20px', boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>
          {/* Header */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, paddingBottom:10, borderBottom:`2.5px solid ${BL}` }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:38, height:38, borderRadius:9, flexShrink:0, background:`linear-gradient(135deg,${BL},${BD})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>🏆</div>
              <div>
                <div style={{ fontSize:16, fontWeight:900, color:DK }}>Quiniela Mundial FIFA 2026</div>
                <div style={{ fontSize:10.5, color:GY, marginTop:1 }}>
                  {profile?.username}{profile?.full_name?` · ${profile.full_name}`:''} · <em>{quiniela?.name}</em>
                </div>
              </div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:10, fontWeight:800, color:BL, background:BLT, borderRadius:6, padding:'4px 12px', textTransform:'uppercase', letterSpacing:'.5px', display:'inline-block' }}>Fase de Grupos</div>
              <div style={{ fontSize:8.5, color:GY, marginTop:4 }}>{filledCount}/104 picks · {dateStr}</div>
            </div>
          </div>
          {/* 12 grupos 3×4 */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:11 }}>
            {Object.entries(GROUP_MATCHES).map(([g,ms])=>(
              <GroupCard key={g} g={g} matches={ms} picks={picks}/>
            ))}
          </div>
          <Footer profile={profile} quiniela={quiniela}/>
        </div>

        {/* ── HOJA 2: BRACKET ── */}
        <div ref={brackRef} style={{ background:'#fff', borderRadius:12, padding:'18px 20px', boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>
          {/* Header */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10, paddingBottom:8, borderBottom:`2.5px solid ${OR}` }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:18 }}>⚡</span>
              <div>
                <div style={{ fontSize:14, fontWeight:900, color:DK }}>Fase Eliminatoria — Llave Completa</div>
                <div style={{ fontSize:10, color:GY }}>{profile?.username} · {quiniela?.name}</div>
              </div>
            </div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', justifyContent:'flex-end' }}>
              {[['R32','28Jun–3Jul'],['Octavos','4–7Jul'],['Cuartos','9–11Jul'],['Semis','14–15Jul'],['Final','19Jul']].map(([ph,d])=>(
                <div key={ph} style={{ display:'flex', alignItems:'center', gap:3, fontSize:9 }}>
                  <div style={{ width:7, height:7, borderRadius:2, background:BL }}/>
                  <strong style={{ color:DK }}>{ph}</strong>
                  <span style={{ color:GY }}>{d}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bracket */}
          <div style={{ display:'flex', alignItems:'stretch', gap:0 }}>
            <BCol title="R32"     mids={['M73','M74','M75','M76','M77','M78','M79','M80']} picks={picks}/>
            <div style={{ width:12, flexShrink:0 }}/>
            <BCol title="Octavos" mids={['M89','M90','M91','M92']} picks={picks}/>
            <div style={{ width:12, flexShrink:0 }}/>
            <BCol title="Cuartos" mids={['M97','M98']} picks={picks}/>
            <div style={{ width:12, flexShrink:0 }}/>
            <BCol title="Semis"   mids={['M101']} picks={picks}/>
            <div style={{ width:12, flexShrink:0 }}/>
            <BCenter picks={picks}/>
            <div style={{ width:12, flexShrink:0 }}/>
            <BCol title="Semis"   mids={['M102']} picks={picks}/>
            <div style={{ width:12, flexShrink:0 }}/>
            <BCol title="Cuartos" mids={['M99','M100']} picks={picks}/>
            <div style={{ width:12, flexShrink:0 }}/>
            <BCol title="Octavos" mids={['M93','M94','M95','M96']} picks={picks}/>
            <div style={{ width:12, flexShrink:0 }}/>
            <BCol title="R32"     mids={['M81','M82','M83','M84','M85','M86','M87','M88']} picks={picks}/>
          </div>
          <Footer profile={profile} quiniela={quiniela}/>
        </div>

      </div>
    </div>
  )
}
