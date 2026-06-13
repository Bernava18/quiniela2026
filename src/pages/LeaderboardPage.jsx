import { useState, useEffect, useRef } from 'react'
import { useLeaderboard } from '../hooks/useLeaderboard'
import { useAuth } from '../context/AuthContext'
import { supabase, getQuinielaPicks, getAllResults } from '../lib/supabase'

const ENTRY_FEE = 15
const LOCK_DATE = new Date('2026-06-11T18:00:00Z') // Inicio del Mundial

const MEDALS = ['🥇','🥈','🥉']
const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L']

// Fechas de cada partido de grupos (Jornada 1, 2, 3) — calendario oficial FIFA 2026
const MATCH_DATES = {
  // Jornada 1
  A1:'2026-06-11', A2:'2026-06-11', B1:'2026-06-12', D1:'2026-06-12',
  B2:'2026-06-13', C1:'2026-06-13',
  C2:'2026-06-14', D2:'2026-06-14', E1:'2026-06-14', F1:'2026-06-14',
  G1:'2026-06-15', H1:'2026-06-15',
  E2:'2026-06-16', F2:'2026-06-16', I1:'2026-06-16',
  G2:'2026-06-17', H2:'2026-06-17', I2:'2026-06-17',
  J1:'2026-06-17', K1:'2026-06-17', L1:'2026-06-18',
  J2:'2026-06-18', K2:'2026-06-18', L2:'2026-06-18',
  // Jornada 2
  A3:'2026-06-18', A4:'2026-06-18',
  B3:'2026-06-19', B4:'2026-06-19', C3:'2026-06-19', C4:'2026-06-19',
  D3:'2026-06-19', D4:'2026-06-20', E3:'2026-06-20', E4:'2026-06-20',
  F3:'2026-06-20', F4:'2026-06-21', G3:'2026-06-21', G4:'2026-06-21',
  H3:'2026-06-21', H4:'2026-06-22', I3:'2026-06-22', I4:'2026-06-22',
  J3:'2026-06-22', J4:'2026-06-23', K3:'2026-06-23', K4:'2026-06-23',
  L3:'2026-06-23', L4:'2026-06-24',
  // Jornada 3
  A5:'2026-06-24', A6:'2026-06-24',
  B5:'2026-06-24', B6:'2026-06-24', C5:'2026-06-24', C6:'2026-06-24',
  D5:'2026-06-25', D6:'2026-06-25', E5:'2026-06-25', E6:'2026-06-25',
  F5:'2026-06-25', F6:'2026-06-25', G6:'2026-06-26', G5:'2026-06-26',
  H5:'2026-06-26', H6:'2026-06-26', I5:'2026-06-26', I6:'2026-06-26',
  J5:'2026-06-27', J6:'2026-06-27', K5:'2026-06-27', K6:'2026-06-27',
  L5:'2026-06-27', L6:'2026-06-27',
}

const TEAM_NAMES = {
  A1:['México','Sudáfrica'], A2:['Rep. de Corea','Rep. Checa'], A3:['México','Rep. de Corea'],
  A4:['Rep. Checa','Sudáfrica'], A5:['Rep. Checa','México'], A6:['Sudáfrica','Rep. de Corea'],
  B1:['Canadá','Bosnia'], B2:['Catar','Suiza'], B3:['Canadá','Catar'],
  B4:['Suiza','Bosnia'], B5:['Suiza','Canadá'], B6:['Bosnia','Catar'],
  C1:['Brasil','Marruecos'], C2:['Haití','Escocia'], C3:['Brasil','Haití'],
  C4:['Escocia','Marruecos'], C5:['Escocia','Brasil'], C6:['Marruecos','Haití'],
  D1:['EE. UU.','Paraguay'], D2:['Australia','Turquía'], D3:['EE. UU.','Australia'],
  D4:['Turquía','Paraguay'], D5:['Turquía','EE. UU.'], D6:['Paraguay','Australia'],
  E1:['Alemania','Curazao'], E2:['Costa de Marfil','Ecuador'], E3:['Alemania','Costa de Marfil'],
  E4:['Ecuador','Curazao'], E5:['Ecuador','Alemania'], E6:['Curazao','Costa de Marfil'],
  F1:['Países Bajos','Japón'], F2:['Suecia','Túnez'], F3:['Países Bajos','Suecia'],
  F4:['Túnez','Japón'], F5:['Túnez','Países Bajos'], F6:['Japón','Suecia'],
  G1:['Bélgica','Egipto'], G2:['RI de Irán','Nueva Zelanda'], G3:['Bélgica','RI de Irán'],
  G4:['Nueva Zelanda','Egipto'], G5:['Nueva Zelanda','Bélgica'], G6:['Egipto','RI de Irán'],
  H1:['España','Islas de Cabo Verde'], H2:['Arabia Saudí','Uruguay'], H3:['España','Arabia Saudí'],
  H4:['Uruguay','Islas de Cabo Verde'], H5:['Uruguay','España'], H6:['Islas de Cabo Verde','Arabia Saudí'],
  I1:['Francia','Senegal'], I2:['Irak','Noruega'], I3:['Francia','Irak'],
  I4:['Noruega','Senegal'], I5:['Noruega','Francia'], I6:['Senegal','Irak'],
  J1:['Argentina','Argelia'], J2:['Austria','Jordania'], J3:['Argentina','Austria'],
  J4:['Jordania','Argelia'], J5:['Jordania','Argentina'], J6:['Argelia','Austria'],
  K1:['Portugal','RD Congo'], K2:['Uzbekistán','Colombia'], K3:['Portugal','Uzbekistán'],
  K4:['Colombia','RD Congo'], K5:['Colombia','Portugal'], K6:['RD Congo','Uzbekistán'],
  L1:['Inglaterra','Croacia'], L2:['Ghana','Panamá'], L3:['Inglaterra','Ghana'],
  L4:['Panamá','Croacia'], L5:['Panamá','Inglaterra'], L6:['Croacia','Ghana'],
}

function calcGroupPts(picks, results, group) {
  let pts = 0
  for (let i = 1; i <= 6; i++) {
    const mid = `${group}${i}`
    const pk = picks[mid], r = results[mid]
    if (!pk || pk.h == null || !r || r.hs == null) continue
    const rR = r.hs > r.as ? 'H' : r.hs < r.as ? 'A' : 'D'
    const pR = pk.h > pk.a ? 'H' : pk.h < pk.a ? 'A' : 'D'
    const hOk = pk.h === r.hs, aOk = pk.a === r.as, resOk = rR === pR
    if (hOk) pts++; if (aOk) pts++; if (resOk) pts += 2
    if (hOk && aOk && resOk) pts++
  }
  return pts
}

export default function LeaderboardPage() {
  const { rows, loading } = useLeaderboard()
  const { profile } = useAuth()
  const [results, setResults] = useState({})
  const [allPicks, setAllPicks] = useState({})
  const [viewing, setViewing] = useState(null)
  const [iframeReady, setIframeReady] = useState(false)
  const [enriched, setEnriched]   = useState([])
  const [tableSearch, setTableSearch] = useState('')
  const [hasPaid, setHasPaid]     = useState(false)
  const [prizePool, setPrizePool] = useState({ total:0, p1:0, p2:0, p3:0, committedCount:0 })
  const tableRef = useRef(null)

  async function exportPDF() {
    const el = tableRef.current
    if (!el) return
    const { default: html2canvas } = await import('html2canvas')
    const { default: jsPDF } = await import('jspdf')
    // Captura a escala alta para buena calidad
    const canvas = await html2canvas(el, {
      scale: 2, useCORS: true, backgroundColor: '#fff',
      windowWidth: el.scrollWidth, scrollX: 0, scrollY: 0,
      width: el.scrollWidth, height: el.scrollHeight,
    })
    const imgData = canvas.toDataURL('image/jpeg', 0.92)
    // Página custom del mismo tamaño que el contenido (en mm)
    const mmW = Math.round(canvas.width * 0.264583)  // px → mm a 96dpi
    const mmH = Math.round(canvas.height * 0.264583)
    const pdf = new jsPDF({
      orientation: mmW > mmH ? 'landscape' : 'portrait',
      unit: 'mm',
      format: [mmW, mmH],
    })
    pdf.addImage(imgData, 'JPEG', 0, 0, mmW, mmH)
    pdf.save(`tabla-posiciones-${new Date().toLocaleDateString('es-ES').replace(/\//g,'-')}.pdf`)
  }

  async function exportImage() {
    const el = tableRef.current
    if (!el) return
    const { default: html2canvas } = await import('html2canvas')
    const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#fff' })
    const link = document.createElement('a')
    link.download = `tabla-posiciones-${new Date().toLocaleDateString('es-ES').replace(/\//g,'-')}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  useEffect(() => { loadResults(); checkPayment() }, [])
  useEffect(() => { if (rows.length > 0) loadAllPicks() }, [rows])
  useEffect(() => { if (rows.length >= 0) buildEnriched() }, [rows, allPicks, results])

  async function checkPayment() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('profiles').select('has_paid').eq('id', user.id).single()
    setHasPaid(data?.has_paid || false)
    // Premio = quinielas pagadas + comprometidas
    const { data: allQ } = await supabase
      .from('quinielas')
      .select('id, payment_status')
    const eligibleQ = (allQ||[]).filter(q => q.payment_status === 'paid' || q.payment_status === 'committed')
    const total = eligibleQ.length * ENTRY_FEE
    const committedCount = (allQ||[]).filter(q => q.payment_status === 'committed').length
    const p1=Math.floor(total*.6), p2=Math.floor(total*.2), p3=Math.floor(total*.1)
    setPrizePool({ total, p1, p2, p3, committedCount })
  }

  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === 'IFRAME_READY' && viewing)
        setTimeout(() => loadViewerPicks(), 400)
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [viewing])

  async function loadResults() {
    const { data } = await supabase.from('match_results').select('*')
    const map = {}
    data?.forEach(r => { map[r.match_id] = { hs: r.goals_home, as: r.goals_away, win: r.winner } })
    setResults(map)
  }

  async function loadAllPicks() {
    const qids = rows.map(r => r.quiniela_id)
    // Supabase limita a 1000 filas por defecto — con 87 quinielas x 104 picks
    // superamos eso, así que paginamos
    let allData = []
    let from = 0
    const pageSize = 1000
    while (true) {
      const { data, error } = await supabase
        .from('picks')
        .select('quiniela_id, match_id, goals_home, goals_away, winner')
        .in('quiniela_id', qids)
        .range(from, from + pageSize - 1)
      if (error || !data?.length) break
      allData = allData.concat(data)
      if (data.length < pageSize) break
      from += pageSize
    }
    const map = {}
    allData.forEach(p => {
      if (!map[p.quiniela_id]) map[p.quiniela_id] = {}
      map[p.quiniela_id][p.match_id] = { h: p.goals_home, a: p.goals_away, win: p.winner }
    })
    setAllPicks(map)
  }

  function buildEnriched() {
    const built = rows
    .filter(r => !r.quinielas?.hidden_from_table)
    .map(r => {
      const picks = allPicks[r.quiniela_id] || {}
      const groupPts = {}
      let grpTotal = 0
      GROUPS.forEach(g => {
        const pts = calcGroupPts(picks, results, g)
        groupPts[g] = pts
        grpTotal += pts
      })
      return {
        ...r,
        groupPts,
        grpTotal,
        clasifPts: r.clasif_pts || 0,      // posición exacta en grupos
        elimPts:   r.elim_pts   || 0,      // R32+Oct+QF+SF+3ro+Final
        finalPts:  r.final_pts  || 0,      // orden final 20/10/5/3
        // TOTAL calculado en vivo: grupos (en tiempo real) + resto (de BD)
        total: grpTotal + (r.clasif_pts || 0) + (r.elim_pts || 0) + (r.final_pts || 0),
      }
    }).sort((a, b) => b.total - a.total)

    // Ranking "dense": empates comparten puesto, el siguiente NO salta (1,1,1,2,2,3,4...)
    let currentRank = 1
    const ranked = built.map((r, i) => {
      if (i > 0 && r.total !== built[i-1].total) {
        currentRank += 1
      }
      return { ...r, rank: currentRank, prevRank: currentRank }
    })

    setEnriched(ranked)
  }

  async function openViewer(row) {
    const worldCupStarted = new Date() >= LOCK_DATE
    const isMe = row.quinielas?.profiles?.username === profile?.username

    // Block viewing other players' quinielas before World Cup starts
    if (!worldCupStarted && !isMe) {
      alert('👁 Las quinielas de otros participantes estarán visibles una vez inicie el Mundial (11 Jun 2026). Esto garantiza que nadie pueda copiar las quinielas de otros antes del cierre.')
      return
    }
    setViewing({ quinielaId: row.quiniela_id, name: row.quinielas?.profiles?.username, quinielaName: row.quinielas?.name })
    setIframeReady(false)
  }

  async function loadViewerPicks() {
    if (!viewing) return
    const [picks, res] = await Promise.all([getQuinielaPicks(viewing.quinielaId), getAllResults()])
    document.getElementById('viewer-iframe')?.contentWindow?.postMessage({
      type: 'INIT',
      data: { quinielaId: viewing.quinielaId, isLocked: true, username: viewing.name, picks, results: res }
    }, '*')
  }

  const myRows = enriched.filter(r => r.quinielas?.profiles?.username === profile?.username)

  const th = (label, color='#fff', minW=44) => (
    <th style={{ padding:'10px 6px', fontWeight:700, color, textAlign:'center',
      minWidth:minW, fontSize:11, textTransform:'uppercase', letterSpacing:'.3px',
      whiteSpace:'nowrap', borderRight:'0.5px solid rgba(255,255,255,.1)' }}>
      {label}
    </th>
  )

  const ptCell = (pts, maxColor='#0055b3', maxBg='rgba(0,113,227,.1)') => {
    if (!pts && pts !== 0) return <td style={{ padding:'8px 4px', textAlign:'center', color:'#c7c7cc', fontSize:12 }}>–</td>
    const bg = pts >= 25 ? 'rgba(255,214,10,.15)' : pts >= 15 ? 'rgba(48,209,88,.1)' : pts > 0 ? maxBg : 'transparent'
    const col = pts >= 25 ? '#7a5900' : pts >= 15 ? '#1a7a38' : pts > 0 ? maxColor : '#c7c7cc'
    return (
      <td style={{ padding:'8px 4px', textAlign:'center' }}>
        <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center',
          minWidth:32, height:22, borderRadius:5, fontSize:12, fontWeight:700,
          background: bg, color: col, padding:'0 4px' }}>
          {pts}
        </span>
      </td>
    )
  }

  // ── VIEWER ──────────────────────────────────────────────────
  if (viewing) {
    return (
      <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 52px)' }}>
        <div style={{ background:'#fff', borderBottom:'0.5px solid rgba(0,0,0,.08)', padding:'8px 20px', display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
          <button onClick={() => setViewing(null)} style={{ border:'none', background:'none', cursor:'pointer', color:'#6e6e73', fontSize:13 }}>← Tabla</button>
          <span style={{ color:'#e0e0e0' }}>|</span>
          <span style={{ fontWeight:700, fontSize:15 }}>{viewing.name}</span>
          <span style={{ fontSize:12, color:'#6e6e73' }}>{viewing.quinielaName}</span>
          <span style={{ fontSize:11, background:'rgba(255,159,10,.12)', color:'#b06000', padding:'2px 8px', borderRadius:6, fontWeight:600 }}>👁 Solo lectura</span>
        </div>
        {!iframeReady && <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'#aeaeb2' }}>⚽ Cargando...</div>}
        <iframe id="viewer-iframe" src="/quiniela2026_fixed.html"
          style={{ flex:1, border:'none', width:'100%', display: iframeReady ? 'block' : 'none' }}
          onLoad={() => { setIframeReady(true); setTimeout(() => loadViewerPicks(), 400) }} />
      </div>
    )
  }

  // ── PAYMENT WALL ─────────────────────────────────────────────


  // ── TABLA ────────────────────────────────────────────────────
  return (
    <div style={{ padding:'20px 12px', fontFamily:'-apple-system,"DM Sans",sans-serif' }}>
      <div style={{ maxWidth:1500, margin:'0 auto' }}>

        {/* Botones exportar — siempre visibles arriba */}
        <div style={{ display:'flex', gap:8, marginBottom:12, justifyContent:'flex-end' }}>
          <button onClick={exportPDF}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', background:'#0071e3', color:'#fff', border:'none', borderRadius:10, fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit', boxShadow:'0 2px 8px rgba(0,113,227,.3)' }}>
            🖨️ Exportar PDF
          </button>
          <button onClick={exportImage}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', background:'#fff', color:'#1d1d1f', border:'1px solid rgba(0,0,0,.15)', borderRadius:10, fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit' }}>
            📷 Guardar imagen
          </button>
        </div>

        {/* Prize pool banner */}
        <div style={{ background:'linear-gradient(135deg,#ffd60a,#ff9f0a)', borderRadius:14, padding:'14px 20px', marginBottom:16, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10, boxShadow:'0 4px 16px rgba(255,214,10,.25)' }}>
          <div>
            <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.5px', color:'rgba(0,0,0,.5)' }}>💰 Premio acumulado</div>
            <div style={{ fontSize:28, fontWeight:900, color:'#000' }}>${prizePool.total} USD</div>
          </div>
          <div style={{ display:'flex', gap:20 }}>
            {[['🥇','1er lugar',prizePool.p1,'60%'],['🥈','2do lugar',prizePool.p2,'20%'],['🥉','3er lugar',prizePool.p3,'10%']].map(([medal,label,amt,pct]) => (
              <div key={label} style={{ textAlign:'center' }}>
                <div style={{ fontSize:20 }}>{medal}</div>
                <div style={{ fontSize:14, fontWeight:800, color:'#000' }}>${amt}</div>
                <div style={{ fontSize:10, color:'rgba(0,0,0,.5)', fontWeight:600 }}>{pct}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Widget: partidos de ayer y hoy */}
        {(() => {
          const vetFmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas', year:'numeric', month:'2-digit', day:'2-digit' })
          const now = new Date()
          const todayStr = vetFmt.format(now)
          const yesterdayStr = vetFmt.format(new Date(now.getTime() - 24*60*60*1000))

          const matchesFor = (dateStr) => Object.entries(MATCH_DATES)
            .filter(([, d]) => d === dateStr)
            .map(([mid]) => mid)

          const renderDay = (label, dateStr) => {
            const mids = matchesFor(dateStr)
            if (!mids.length) return null
            return (
              <div style={{ flex:'1 1 260px', minWidth:0 }}>
                <div style={{ fontSize:9, color:'#c7c7cc', fontWeight:700, textTransform:'uppercase', letterSpacing:'.5px', marginBottom:4 }}>
                  {label} · {new Date(dateStr+'T12:00:00').toLocaleDateString('es-ES',{day:'numeric',month:'short'})}
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                  {mids.map(mid => {
                    const r = results[mid]
                    const [home, away] = TEAM_NAMES[mid] || ['?','?']
                    const played = r && r.hs != null
                    return (
                      <div key={mid} style={{ display:'flex', alignItems:'center', gap:4, fontSize:12, padding:'3px 6px', background:'#f9f9fb', borderRadius:5, lineHeight:1.4 }}>
                        <span style={{ fontSize:9, color:'#c7c7cc', fontWeight:700, minWidth:24 }}>GR.{mid[0]}</span>
                        <span style={{ flex:1, textAlign:'right', fontWeight:600, color:'#1d1d1f', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{home}</span>
                        <span style={{ fontWeight:800, fontSize:13, color: played ? '#1d1d1f' : '#c7c7cc', minWidth:34, textAlign:'center', flexShrink:0 }}>
                          {played ? `${r.hs}–${r.as}` : '–:–'}
                        </span>
                        <span style={{ flex:1, fontWeight:600, color:'#1d1d1f', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{away}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          }

          const yWidget = renderDay('Ayer', yesterdayStr)
          const tWidget = renderDay('Hoy', todayStr)
          if (!yWidget && !tWidget) return null

          return (
            <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,.08)', borderRadius:12, padding:'10px 16px', marginBottom:16, boxShadow:'0 1px 4px rgba(0,0,0,.04)', display:'flex', gap:24, flexWrap:'wrap' }}>
              {yWidget}
              {tWidget}
            </div>
          )
        })()}


        {/* Header */}
        <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:4 }}>
          <h1 style={{ fontSize:22, fontWeight:800, letterSpacing:'-.4px' }}>Tabla de Posiciones</h1>
          <span style={{ fontSize:12, color:'#ff453a', fontWeight:600 }}>● En vivo</span>
        </div>
        <p style={{ color:'#6e6e73', fontSize:12, marginBottom:10 }}>
          {enriched.length} quinielas · {new Date() >= LOCK_DATE ? 'click en cualquier fila para ver la quiniela completa' : 'Las quinielas de otros serán visibles al iniciar el Mundial'}
        </p>

        {/* Transparency banner */}
        {new Date() < LOCK_DATE ? (
          <div style={{ background:'rgba(0,113,227,.06)', border:'1px solid rgba(0,113,227,.15)', borderRadius:10, padding:'10px 14px', marginBottom:14, display:'flex', alignItems:'center', gap:10, fontSize:12 }}>
            <span style={{ fontSize:18 }}>🔒</span>
            <div>
              <span style={{ fontWeight:700, color:'#0071e3' }}>Quinielas privadas hasta el 11 Jun · </span>
              <span style={{ color:'#6e6e73' }}>Al inicio del Mundial todas las quinielas serán visibles para garantizar transparencia. Un respaldo oficial será enviado por email a todos los participantes.</span>
            </div>
          </div>
        ) : (
          <div style={{ background:'rgba(48,209,88,.06)', border:'1px solid rgba(48,209,88,.2)', borderRadius:10, padding:'10px 14px', marginBottom:14, display:'flex', alignItems:'center', gap:10, fontSize:12 }}>
            <span style={{ fontSize:18 }}>✅</span>
            <div>
              <span style={{ fontWeight:700, color:'#1a7a38' }}>Quinielas públicas · </span>
              <span style={{ color:'#6e6e73' }}>Puedes ver la quiniela completa de cualquier participante. El respaldo oficial fue enviado al inicio del torneo.</span>
            </div>
          </div>
        )}

        {/* Mis quinielas — todas */}
        {myRows.length > 0 && (
          <div style={{ marginBottom:12, display:'flex', flexDirection:'column', gap:6 }}>
            {myRows.map(r => (
              <div key={r.quiniela_id} style={{ background:'rgba(0,113,227,.06)', border:'1px solid rgba(0,113,227,.2)', borderRadius:10, padding:'10px 16px', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                <span style={{ fontWeight:900, fontSize:18, color:'#0071e3', minWidth:40 }}>#{r.rank}</span>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    {r.quinielas?.seq_num && (
                      <span style={{ fontSize:9, fontWeight:800, color:'#fff', borderRadius:4, padding:'1px 5px',
                        background: r.quinielas?.payment_status==='paid'?'#0071e3':r.quinielas?.payment_status==='committed'?'#ff9f0a':'#aeaeb2' }}>
                        Q{String(r.quinielas.seq_num).padStart(2,'0')}
                      </span>
                    )}
                    <span style={{ fontWeight:700, fontSize:13 }}>{r.quinielas?.name}</span>
                    <span style={{ fontSize:9, background:'rgba(0,113,227,.12)', color:'#0071e3', padding:'1px 5px', borderRadius:4, fontWeight:700 }}>TÚ</span>
                  </div>
                </div>
                <div style={{ display:'flex', gap:12, fontSize:11, color:'#6e6e73', flexWrap:'wrap' }}>
                  <span>Grupos: <strong style={{color:'#1d1d1f'}}>{r.grpTotal}</strong></span>
                  <span>Elim: <strong style={{color:'#1d1d1f'}}>{r.elimPts}</strong></span>
                  <span>Final: <strong style={{color:'#1d1d1f'}}>{r.finalPts}</strong></span>
                </div>
                <span style={{ fontSize:20, fontWeight:900, color:'#0071e3' }}>{r.total} pts</span>
              </div>
            ))}
          </div>
        )}

        {/* Buscador */}
        <div style={{ marginBottom:10 }}>
          <input
            value={tableSearch}
            onChange={e => setTableSearch(e.target.value)}
            placeholder="🔍 Buscar por nombre o Q##..."
            style={{ width:'100%', maxWidth:320, padding:'8px 12px', border:'1px solid rgba(0,0,0,.12)', borderRadius:9, fontSize:13, fontFamily:'inherit' }}
          />
        </div>

        {/* Tabla */}
        <div ref={tableRef} style={{ background:'#fff', borderRadius:14, border:'0.5px solid rgba(0,0,0,.08)', boxShadow:'0 2px 12px rgba(0,0,0,.06)', overflow:'hidden' }}>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ background:'#0071e3' }}>
                  <th style={{ padding:'10px 8px', fontWeight:700, color:'#fff', textAlign:'center', minWidth:42, fontSize:11, textTransform:'uppercase', position:'sticky', left:0, background:'#0071e3', borderRight:'1px solid rgba(255,255,255,.2)' }}>POS</th>
                  <th style={{ padding:'10px 14px', fontWeight:700, color:'#fff', textAlign:'left', minWidth:200, fontSize:11, textTransform:'uppercase', borderRight:'1px solid rgba(255,255,255,.2)' }}>QUINIELA / JUGADOR</th>
                  {GROUPS.map(g => (
                    <th key={g} style={{ padding:'10px 5px', fontWeight:700, color:'rgba(255,255,255,.8)', textAlign:'center', minWidth:40, fontSize:11, borderRight:'0.5px solid rgba(255,255,255,.1)' }}>
                      GR.{g}
                    </th>
                  ))}
                  <th style={{ padding:'10px 6px', fontWeight:700, color:'#a8d8ff', textAlign:'center', minWidth:52, fontSize:11, borderLeft:'1px solid rgba(255,255,255,.2)', borderRight:'0.5px solid rgba(255,255,255,.1)' }}>CLASIF</th>
                  <th style={{ padding:'10px 6px', fontWeight:700, color:'#a8d8ff', textAlign:'center', minWidth:48, fontSize:11, borderRight:'0.5px solid rgba(255,255,255,.1)' }}>ELIM</th>
                  <th style={{ padding:'10px 6px', fontWeight:700, color:'#ffd60a', textAlign:'center', minWidth:52, fontSize:11, borderRight:'0.5px solid rgba(255,255,255,.1)' }}>FINAL</th>
                  <th style={{ padding:'10px 8px', fontWeight:800, color:'#ffd60a', textAlign:'center', minWidth:60, fontSize:12, borderRight:'0.5px solid rgba(255,255,255,.1)' }}>TOTAL</th>

                </tr>
                {/* Subtitle row */}
                <tr style={{ background:'#f0f5ff', borderBottom:'1px solid #e5e5ea' }}>
                  <td colSpan={2} style={{ padding:'4px 14px', fontSize:10, color:'#6e6e73', fontWeight:500 }}>
                    Máx: Grupos 360 · Clasif 48 · Elim 160 · Orden Final 38 = <strong>606 pts</strong>
                  </td>
                  {GROUPS.map(g => (
                    <td key={g} style={{ padding:'4px 4px', textAlign:'center', fontSize:10, color:'#aeaeb2' }}>30</td>
                  ))}
                  <td style={{ padding:'4px', textAlign:'center', fontSize:10, color:'#aeaeb2', borderLeft:'1px solid #e5e5ea' }}>48</td>
                  <td style={{ padding:'4px', textAlign:'center', fontSize:10, color:'#aeaeb2' }}>160</td>
                  <td style={{ padding:'4px', textAlign:'center', fontSize:10, color:'#aeaeb2' }}>38</td>
                  <td style={{ padding:'4px', textAlign:'center', fontSize:10, color:'#0071e3', fontWeight:700 }}>606</td>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const s = tableSearch.trim().toLowerCase()
                  const filtered = !s ? enriched : enriched.filter(r => {
                    const name = r.quinielas?.name?.toLowerCase() || ''
                    const username = r.quinielas?.profiles?.username?.toLowerCase() || ''
                    const seq = `q${String(r.quinielas?.seq_num||0).padStart(2,'0')}`
                    return name.includes(s) || username.includes(s) || seq.includes(s)
                  })
                  if (loading) return <tr><td colSpan={20} style={{ padding:32, textAlign:'center', color:'#aeaeb2' }}>Cargando...</td></tr>
                  if (filtered.length === 0) return <tr><td colSpan={20} style={{ padding:32, textAlign:'center', color:'#aeaeb2' }}>{enriched.length === 0 ? 'Sin datos aún' : 'Sin resultados para tu búsqueda'}</td></tr>
                  return filtered.map((r, i) => {
                  const isMe = r.quinielas?.profiles?.username === profile?.username
                  const bgRow = isMe ? 'rgba(0,113,227,.10)' : i % 2 === 0 ? '#fff' : '#fafafa'
                  return (
                    <tr key={r.quiniela_id} onClick={() => openViewer(r)}
                      style={{ background: bgRow, cursor: (new Date() >= LOCK_DATE || r.quinielas?.profiles?.username === profile?.username) ? 'pointer' : 'default', borderBottom:'0.5px solid rgba(0,0,0,.04)', borderLeft: isMe ? '3px solid #0071e3' : '3px solid transparent', transition:'background .1s' }}
                      onMouseOver={e => e.currentTarget.style.background = '#eef3ff'}
                      onMouseOut={e => e.currentTarget.style.background = bgRow}>

                      <td style={{ padding:'9px 8px', textAlign:'center', fontWeight:800, fontSize:14, position:'sticky', left:0, background: bgRow, borderRight:'0.5px solid #e5e5ea' }}>
                        {r.rank <= 3 ? MEDALS[r.rank - 1] : <span style={{ color:'#6e6e73', fontSize:12 }}>{r.rank}</span>}
                      </td>

                      <td style={{ padding:'9px 14px', borderRight:'1px solid #e5e5ea' }}>
                        <div style={{ fontWeight:700, fontSize:13, display:'flex', alignItems:'center', gap:6 }}>
                          {r.quinielas?.seq_num && (
                            <span style={{ fontSize:9, fontWeight:800, color:'#fff', borderRadius:4, padding:'1px 5px', letterSpacing:'.2px',
                              background: r.quinielas?.payment_status==='paid'?'#0071e3':r.quinielas?.payment_status==='committed'?'#ff9f0a':'#aeaeb2' }}>
                              Q{String(r.quinielas.seq_num).padStart(2,'0')}
                            </span>
                          )}
                          {r.quinielas?.name}
                          {r.quinielas?.payment_status==='committed' && (
                            <span style={{ fontSize:9, background:'rgba(255,159,10,.15)', color:'#b06000', padding:'1px 5px', borderRadius:4, fontWeight:700 }}>🤝</span>
                          )}
                          {isMe && <span style={{ fontSize:9, background:'rgba(0,113,227,.12)', color:'#0071e3', padding:'1px 5px', borderRadius:4, fontWeight:700 }}>TÚ</span>}
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:2 }}>
                          <span style={{ fontSize:10, color:'#aeaeb2' }}>{r.quinielas?.profiles?.username}</span>
                          {(() => {
                            const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas', year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date())
                            const picks = allPicks[r.quiniela_id] || {}
                            const todayMatches = Object.entries(MATCH_DATES)
                              .filter(([, d]) => d === todayStr)
                              .map(([mid]) => mid)
                            if (todayMatches.length === 0) return null
                            return (
                              <span style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                                {todayMatches.map(mid => {
                                  const pk = picks[mid]
                                  const res = results[mid]
                                  const has = pk && pk.h != null && pk.a != null
                                  const [home, away] = TEAM_NAMES[mid] || ['?','?']
                                  const hasResult = res && res.hs != null
                                  const hOk = has && hasResult && pk.h === res.hs
                                  const aOk = has && hasResult && pk.a === res.as
                                  const bothOk = hOk && aOk
                                  const anyOk = hOk || aOk
                                  const numStyle = (ok) => ({
                                    fontWeight:800,
                                    color: !has || !hasResult ? 'inherit' : ok ? '#1a7a38' : '#c0392b'
                                  })
                                  let bg, color
                                  if (!has) { bg = 'rgba(255,69,58,.1)'; color = '#c0392b' }
                                  else if (!hasResult) { bg = 'rgba(0,113,227,.08)'; color = '#0055b3' }
                                  else if (bothOk) { bg = 'rgba(48,209,88,.15)'; color = '#1a7a38' }
                                  else if (anyOk) { bg = 'rgba(255,214,10,.18)'; color = '#7a5900' }
                                  else { bg = 'rgba(255,69,58,.1)'; color = '#c0392b' }
                                  return (
                                    <span key={mid} style={{ fontSize:9, fontWeight:700, padding:'1px 5px', borderRadius:4,
                                      background: bg, color: color }}>
                                      {home} <span style={numStyle(hOk)}>{has ? pk.h : '–'}</span>-<span style={numStyle(aOk)}>{has ? pk.a : '–'}</span> {away}
                                    </span>
                                  )
                                })}
                              </span>
                            )
                          })()}
                        </div>
                      </td>

                      {/* Grupos A-L */}
                      {GROUPS.map(g => {
                        const pts = r.groupPts?.[g] ?? 0
                        const bg = pts >= 25 ? 'rgba(255,214,10,.15)' : pts >= 15 ? 'rgba(48,209,88,.1)' : pts > 0 ? 'rgba(0,113,227,.08)' : 'transparent'
                        const col = pts >= 25 ? '#7a5900' : pts >= 15 ? '#1a7a38' : pts > 0 ? '#0055b3' : '#c7c7cc'
                        return (
                          <td key={g} style={{ padding:'9px 3px', textAlign:'center', borderRight:'0.5px solid #f2f2f7' }}>
                            <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', minWidth:30, height:22, borderRadius:5, fontSize:12, fontWeight:700, background:bg, color:col, padding:'0 3px' }}>
                              {pts > 0 ? pts : '–'}
                            </span>
                          </td>
                        )
                      })}

                      {/* CLASIF */}
                      <td style={{ padding:'9px 4px', textAlign:'center', borderLeft:'1px solid #e5e5ea', borderRight:'0.5px solid #f2f2f7' }}>
                        <span style={{ fontWeight:700, fontSize:12, color: r.clasifPts > 0 ? '#0055b3' : '#c7c7cc' }}>
                          {r.clasifPts > 0 ? r.clasifPts : '–'}
                        </span>
                      </td>

                      {/* ELIM */}
                      <td style={{ padding:'9px 4px', textAlign:'center', borderRight:'0.5px solid #f2f2f7' }}>
                        <span style={{ fontWeight:700, fontSize:12, color: r.elimPts > 0 ? '#0055b3' : '#c7c7cc' }}>
                          {r.elimPts > 0 ? r.elimPts : '–'}
                        </span>
                      </td>

                      {/* FINAL */}
                      <td style={{ padding:'9px 4px', textAlign:'center', borderRight:'0.5px solid #f2f2f7' }}>
                        <span style={{ fontWeight:700, fontSize:12, color: r.finalPts > 0 ? '#7a5900' : '#c7c7cc' }}>
                          {r.finalPts > 0 ? r.finalPts : '–'}
                        </span>
                      </td>

                      {/* TOTAL */}
                      <td style={{ padding:'9px 6px', textAlign:'center', borderRight:'0.5px solid #e5e5ea' }}>
                        <span style={{ fontWeight:900, fontSize:16, color:'#0071e3' }}>{r.total}</span>
                      </td>


                    </tr>
                  )
                })
                })()}
              </tbody>
            </table>
          </div>
        </div>

        {/* Leyenda columnas */}
        <div style={{ marginTop:10, display:'flex', gap:'6px 20px', flexWrap:'wrap', fontSize:11, color:'#6e6e73' }}>
          <span><strong style={{color:'#1d1d1f'}}>GR.A–L</strong> → Puntos por partidos de cada grupo (máx 30 c/u)</span>
          <span><strong style={{color:'#0055b3'}}>CLASIF</strong> → Posición exacta en grupos (máx 48)</span>
          <span><strong style={{color:'#0055b3'}}>ELIM</strong> → R32+Octavos+Cuartos+Semis+3ro+Final (máx 160)</span>
          <span><strong style={{color:'#7a5900'}}>FINAL</strong> → Campeón/Sub/3ro/4to (máx 38)</span>
        </div>
      </div>
    </div>
  )
}
