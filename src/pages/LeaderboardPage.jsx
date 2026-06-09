import { useState, useEffect, useRef } from 'react'
import { useLeaderboard } from '../hooks/useLeaderboard'
import { useAuth } from '../context/AuthContext'
import { supabase, getQuinielaPicks, getAllResults } from '../lib/supabase'

const ENTRY_FEE = 15
const LOCK_DATE = new Date('2026-06-11T18:00:00Z') // Inicio del Mundial

const MEDALS = ['🥇','🥈','🥉']
const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L']

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
  const [hasPaid, setHasPaid]     = useState(false)
  const [prizePool, setPrizePool] = useState({ total:0, p1:0, p2:0, p3:0, committedCount:0 })
  const tableRef = useRef(null)

  async function exportPDF() {
    const el = tableRef.current
    if (!el) return
    const { default: html2canvas } = await import('html2canvas')
    const { default: jsPDF } = await import('jspdf')
    const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#fff' })
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const pageW = pdf.internal.pageSize.getWidth()
    const pageH = pdf.internal.pageSize.getHeight()
    const ratio = canvas.width / canvas.height
    const imgH = pageW / ratio
    let y = 0
    while (y < imgH) {
      if (y > 0) pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, -y, pageW, imgH)
      y += pageH
    }
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
    const { data } = await supabase.from('picks').select('*').in('quiniela_id', qids)
    const map = {}
    data?.forEach(p => {
      if (!map[p.quiniela_id]) map[p.quiniela_id] = {}
      map[p.quiniela_id][p.match_id] = { h: p.goals_home, a: p.goals_away, win: p.winner }
    })
    setAllPicks(map)
  }

  function buildEnriched() {
    const built = rows.map(r => {
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
        total:     r.total_pts  || 0,
      }
    }).sort((a, b) => b.total - a.total)
    .map((r, i) => ({ ...r, rank: i + 1, prevRank: i + 1 }))
    setEnriched(built)
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
  if (!hasPaid) {
    return (
      <div style={{ maxWidth:600, margin:'60px auto', padding:'0 16px', textAlign:'center', fontFamily:'-apple-system,"DM Sans",sans-serif' }}>
        <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,.08)', borderRadius:20, padding:'48px 36px', boxShadow:'0 4px 24px rgba(0,0,0,.08)' }}>
          <div style={{ fontSize:56, marginBottom:16 }}>🔒</div>
          <h2 style={{ fontSize:24, fontWeight:800, marginBottom:8, letterSpacing:'-.4px' }}>Tabla bloqueada</h2>
          <p style={{ color:'#6e6e73', fontSize:15, lineHeight:1.6, marginBottom:24 }}>
            Para ver la tabla de posiciones y competir por los premios, necesitas completar tu pago de inscripción.
          </p>
          <div style={{ background:'linear-gradient(135deg,#ffd60a22,#ff9f0a11)', border:'1px solid rgba(255,214,10,.3)', borderRadius:14, padding:'20px', marginBottom:24 }}>
            <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.5px', color:'#b06000', marginBottom:12 }}>Premio acumulado</div>
            <div style={{ fontSize:36, fontWeight:900, color:'#7a5900', marginBottom:4 }}>${prizePool.total}</div>
            <div style={{ display:'flex', justifyContent:'center', gap:16, fontSize:13, color:'#b06000' }}>
              <span>🥇 ${prizePool.p1}</span>
              <span>🥈 ${prizePool.p2}</span>
              <span>🥉 ${prizePool.p3}</span>
            </div>
          </div>
          <div style={{ background:'#f9f9fb', border:'0.5px solid rgba(0,0,0,.08)', borderRadius:12, padding:'16px', marginBottom:24, textAlign:'left' }}>
            <div style={{ fontWeight:700, marginBottom:8, fontSize:14 }}>📋 Cómo pagar:</div>
            <div style={{ fontSize:13, color:'#6e6e73', lineHeight:1.7 }}>
              1. Contacta al organizador de la quiniela<br/>
              2. Realiza el pago de <strong>$15 USD</strong><br/>
              3. El organizador confirmará tu pago<br/>
              4. La tabla se desbloqueará automáticamente
            </div>
          </div>
          <p style={{ fontSize:12, color:'#aeaeb2' }}>
            Puedes seguir editando tu quiniela mientras tanto.
          </p>
        </div>
      </div>
    )
  }

  // ── TABLA ────────────────────────────────────────────────────
  return (
    <div style={{ padding:'20px 12px', fontFamily:'-apple-system,"DM Sans",sans-serif' }}>
      <div style={{ maxWidth:1500, margin:'0 auto' }}>

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

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4, flexWrap:'wrap', gap:8 }}>
          <div style={{ display:'flex', alignItems:'baseline', gap:12 }}>
            <h1 style={{ fontSize:22, fontWeight:800, letterSpacing:'-.4px' }}>Tabla de Posiciones</h1>
            <span style={{ fontSize:12, color:'#ff453a', fontWeight:600 }}>● En vivo</span>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={exportPDF}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', background:'#0071e3', color:'#fff', border:'none', borderRadius:8, fontWeight:700, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
              🖨️ PDF
            </button>
            <button onClick={exportImage}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', background:'#fff', color:'#1d1d1f', border:'0.5px solid rgba(0,0,0,.15)', borderRadius:8, fontWeight:700, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
              📷 Imagen
            </button>
          </div>
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
                {loading ? (
                  <tr><td colSpan={20} style={{ padding:32, textAlign:'center', color:'#aeaeb2' }}>Cargando...</td></tr>
                ) : enriched.length === 0 ? (
                  <tr><td colSpan={20} style={{ padding:32, textAlign:'center', color:'#aeaeb2' }}>Sin datos aún</td></tr>
                ) : enriched.map((r, i) => {
                  const isMe = r.quinielas?.profiles?.username === profile?.username
                  const bgRow = isMe ? 'rgba(0,113,227,.04)' : i % 2 === 0 ? '#fff' : '#fafafa'
                  return (
                    <tr key={r.quiniela_id} onClick={() => openViewer(r)}
                      style={{ background: bgRow, cursor: (new Date() >= LOCK_DATE || r.quinielas?.profiles?.username === profile?.username) ? 'pointer' : 'default', borderBottom:'0.5px solid rgba(0,0,0,.04)', transition:'background .1s' }}
                      onMouseOver={e => e.currentTarget.style.background = '#eef3ff'}
                      onMouseOut={e => e.currentTarget.style.background = bgRow}>

                      <td style={{ padding:'9px 8px', textAlign:'center', fontWeight:800, fontSize:14, position:'sticky', left:0, background: bgRow, borderRight:'0.5px solid #e5e5ea' }}>
                        {i < 3 ? MEDALS[i] : <span style={{ color:'#6e6e73', fontSize:12 }}>{r.rank}</span>}
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
                        <div style={{ fontSize:10, color:'#aeaeb2', marginTop:1 }}>{r.quinielas?.profiles?.username}</div>
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
                })}
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
