import { useState, useEffect, useRef } from 'react'
import { useLeaderboard } from '../hooks/useLeaderboard'
import { useAuth } from '../context/AuthContext'
import { supabase, getQuinielaPicks, getAllResults, devGetGroupPicks, devGetKoTestPicks } from '../lib/supabase'

const ENTRY_FEE = 15
const LOCK_DATE = new Date('2026-06-11T18:00:00Z') // Inicio del Mundial

const MEDALS = ['🥇','🥈','🥉']
const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L']

// Fechas de cada partido de grupos (Jornada 1, 2, 3) — calendario oficial FIFA 2026
const MATCH_DATES = {
  // Sincronizado con FIXTURES de quiniela2026_fixed.html (fuente real)
  A1:'2026-06-11', A2:'2026-06-11', A3:'2026-06-18', A4:'2026-06-18', A5:'2026-06-24', A6:'2026-06-24',
  B1:'2026-06-12', B2:'2026-06-13', B3:'2026-06-18', B4:'2026-06-18', B5:'2026-06-24', B6:'2026-06-24',
  C1:'2026-06-13', C2:'2026-06-13', C3:'2026-06-19', C4:'2026-06-19', C5:'2026-06-24', C6:'2026-06-24',
  D1:'2026-06-12', D2:'2026-06-14', D3:'2026-06-19', D4:'2026-06-19', D5:'2026-06-25', D6:'2026-06-25',
  E1:'2026-06-14', E2:'2026-06-14', E3:'2026-06-20', E4:'2026-06-20', E5:'2026-06-25', E6:'2026-06-25',
  F1:'2026-06-14', F2:'2026-06-14', F3:'2026-06-20', F4:'2026-06-21', F5:'2026-06-25', F6:'2026-06-25',
  G1:'2026-06-15', G2:'2026-06-15', G3:'2026-06-21', G4:'2026-06-21', G5:'2026-06-26', G6:'2026-06-26',
  H1:'2026-06-15', H2:'2026-06-15', H3:'2026-06-21', H4:'2026-06-21', H5:'2026-06-26', H6:'2026-06-26',
  I1:'2026-06-16', I2:'2026-06-16', I3:'2026-06-22', I4:'2026-06-22', I5:'2026-06-26', I6:'2026-06-26',
  J1:'2026-06-16', J2:'2026-06-17', J3:'2026-06-22', J4:'2026-06-22', J5:'2026-06-27', J6:'2026-06-27',
  K1:'2026-06-17', K2:'2026-06-17', K3:'2026-06-23', K4:'2026-06-23', K5:'2026-06-27', K6:'2026-06-27',
  L1:'2026-06-17', L2:'2026-06-17', L3:'2026-06-23', L4:'2026-06-23', L5:'2026-06-27', L6:'2026-06-27',
  // Fase final (16avos) — fechas horario Venezuela
  M73:'2026-06-28', M74:'2026-06-29', M75:'2026-06-29', M76:'2026-06-29',
  M77:'2026-06-30', M78:'2026-06-30', M79:'2026-06-30', M80:'2026-07-01',
  M81:'2026-07-01', M82:'2026-07-01', M83:'2026-07-02', M84:'2026-07-02',
  M85:'2026-07-02', M86:'2026-07-03', M87:'2026-07-03', M88:'2026-07-03',
  // Octavos, cuartos, semis, 3er puesto, final
  M89:'2026-07-04', M90:'2026-07-04', M91:'2026-07-05', M92:'2026-07-05',
  M93:'2026-07-06', M94:'2026-07-06', M95:'2026-07-07', M96:'2026-07-07',
  M97:'2026-07-09', M98:'2026-07-10', M99:'2026-07-11', M100:'2026-07-11',
  M101:'2026-07-14', M102:'2026-07-15', M103:'2026-07-18', M104:'2026-07-19',
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
  // Fase final (16avos)
  M73:['Canadá','Sudáfrica'], M74:['Alemania','Paraguay'], M75:['Países Bajos','Marruecos'], M76:['Brasil','Japón'],
  M77:['Francia','Suecia'], M78:['Costa de Marfil','Noruega'], M79:['México','Ecuador'], M80:['Inglaterra','RD Congo'],
  M81:['EE. UU.','Bosnia'], M82:['Bélgica','Senegal'], M83:['Portugal','Croacia'], M84:['España','Austria'],
  M85:['Suiza','Argelia'], M86:['Argentina','Islas de Cabo Verde'], M87:['Colombia','Ghana'], M88:['Australia','Egipto'],
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

// Equipos de cada grupo (derivados de TEAM_NAMES)
const GROUP_TEAMS = (() => {
  const out = {}
  Object.entries(TEAM_NAMES).forEach(([mid, teams]) => {
    const g = mid[0]
    if (!out[g]) out[g] = new Set()
    teams.forEach(t => out[g].add(t))
  })
  const res = {}
  Object.entries(out).forEach(([g, set]) => { res[g] = Array.from(set) })
  return res
})()

// Ordena los equipos de un grupo según marcadores. scoreOf(mid) → {h,a} o null.
function orderGroupBy(group, scoreOf) {
  const teams = GROUP_TEAMS[group] || []
  const s = {}
  teams.forEach(t => { s[t] = { pts:0, gf:0, gc:0 } })
  for (let i = 1; i <= 6; i++) {
    const mid = `${group}${i}`
    const sc = scoreOf(mid)
    if (!sc || sc.h == null || sc.a == null) continue
    const [h, a] = TEAM_NAMES[mid] || []
    if (!h || !a || !s[h] || !s[a]) continue
    s[h].gf += sc.h; s[h].gc += sc.a
    s[a].gf += sc.a; s[a].gc += sc.h
    if (sc.h > sc.a)      s[h].pts += 3
    else if (sc.h < sc.a) s[a].pts += 3
    else { s[h].pts += 1; s[a].pts += 1 }
  }
  return teams
    .map(t => ({ team:t, pts:s[t].pts, dif:s[t].gf - s[t].gc, gf:s[t].gf }))
    .sort((x, y) => y.pts - x.pts || y.dif - x.dif || y.gf - x.gf)
    .map(r => r.team)
}

// Clasificación EN VIVO: +1 por posición exacta en grupos completos (máx 48)
function calcClasifPts(picks, results) {
  let total = 0
  GROUPS.forEach(g => {
    let allReal = true
    for (let i = 1; i <= 6; i++) { const r = results[`${g}${i}`]; if (!r || r.hs == null) { allReal = false; break } }
    if (!allReal) return
    const realOrder = orderGroupBy(g, mid => { const r = results[mid]; return r && r.hs != null ? { h:r.hs, a:r.as } : null })
    const pickOrder = orderGroupBy(g, mid => { const p = picks[mid]; return p && p.h != null ? { h:p.h, a:p.a } : null })
    for (let i = 0; i < 4; i++) {
      if (pickOrder[i] && realOrder[i] && pickOrder[i] === realOrder[i]) total += 1
    }
  })
  return total
}

export default function LeaderboardPage() {
  const { rows, loading } = useLeaderboard()
  const { profile } = useAuth()
  const [results, setResults] = useState({})
  const [allPicks, setAllPicks] = useState({})
  const [picksLoaded, setPicksLoaded] = useState(false)
  const [resultsLoaded, setResultsLoaded] = useState(false)
  const [viewing, setViewing] = useState(null)
  const [viewerView, setViewerView] = useState('original')  // 'original' | 'corregida'
  const [descargando, setDescargando] = useState(false)
  const [iframeReady, setIframeReady] = useState(false)
  const [enriched, setEnriched]   = useState([])
  const [tableSearch, setTableSearch] = useState('')
  const [hasPaid, setHasPaid]     = useState(false)
  const [prizePool, setPrizePool] = useState({ total:0, p1:0, p2:0, p3:0, committedCount:0 })
  const [realResults, setRealResults] = useState({})  // resultados de la quiniela real {mid:{h,a,w}}
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

  useEffect(() => {
    Promise.all([loadResults(), loadRealResults()]).then(() => setResultsLoaded(true))
    checkPayment()
  }, [])
  useEffect(() => {
    if (rows.length > 0) {
      setPicksLoaded(false)   // esperar a recargar antes de reconstruir la tabla
      loadAllPicks()
    } else if (rows.length === 0) {
      setPicksLoaded(true)
    }
  }, [rows])
  useEffect(() => { if (picksLoaded && resultsLoaded) buildEnriched() }, [allPicks, results, prizePool, realResults, picksLoaded, resultsLoaded])

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
  }, [viewing, viewerView])

  async function loadResults() {
    const { data } = await supabase.from('match_results').select('*')
    const map = {}
    data?.forEach(r => { map[r.match_id] = { hs: r.goals_home, as: r.goals_away, win: r.winner } })
    setResults(map)
  }

  async function loadRealResults() {
    const { data: realQ } = await supabase.from('quinielas').select('id').eq('es_real', true).maybeSingle()
    if (!realQ?.id) return
    const { data: rrows } = await supabase
      .from('picks_ko_test').select('match_id, goals_home, goals_away, winner')
      .eq('quiniela_id', realQ.id)
    const out = {}
    for (const r of (rrows || [])) out[r.match_id] = { h: r.goals_home, a: r.goals_away, w: r.winner }
    setRealResults(out)
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
    // También cargar los picks de FASE FINAL (picks_ko_test) para los partidos M73+
    let koData = []
    let kfrom = 0
    while (true) {
      const { data, error } = await supabase
        .from('picks_ko_test')
        .select('quiniela_id, match_id, goals_home, goals_away, winner')
        .in('quiniela_id', qids)
        .range(kfrom, kfrom + pageSize - 1)
      if (error || !data?.length) break
      koData = koData.concat(data)
      if (data.length < pageSize) break
      kfrom += pageSize
    }
    koData.forEach(p => {
      if (!map[p.quiniela_id]) map[p.quiniela_id] = {}
      map[p.quiniela_id][p.match_id] = { h: p.goals_home, a: p.goals_away, win: p.winner }
    })
    setAllPicks(map)
    setPicksLoaded(true)
  }

  // ── Cálculo EN VIVO de puntos de fase final (desde picks_ko_test) ──
  const R32_FF = {
    M73:['Canadá','Sudáfrica'],M74:['Alemania','Paraguay'],M75:['Países Bajos','Marruecos'],
    M76:['Brasil','Japón'],M77:['Francia','Suecia'],M78:['Costa de Marfil','Noruega'],
    M79:['México','Ecuador'],M80:['Inglaterra','RD Congo'],M81:['EE. UU.','Bosnia'],
    M82:['Bélgica','Senegal'],M83:['Portugal','Croacia'],M84:['España','Austria'],
    M85:['Suiza','Argelia'],M86:['Argentina','Islas de Cabo Verde'],M87:['Colombia','Ghana'],
    M88:['Australia','Egipto'],
  }
  const KO_FF = {
    M89:['WM74','WM77'],M90:['WM73','WM75'],M91:['WM76','WM78'],M92:['WM79','WM80'],
    M93:['WM83','WM84'],M94:['WM81','WM82'],M95:['WM86','WM88'],M96:['WM85','WM87'],
    M97:['WM89','WM90'],M98:['WM93','WM94'],M99:['WM91','WM92'],M100:['WM95','WM96'],
    M101:['WM97','WM98'],M102:['WM99','WM100'],M103:['LM101','LM102'],M104:['WM101','WM102'],
  }
  function ffTeams(mid, P) {
    if (R32_FF[mid]) return { h: R32_FF[mid][0], a: R32_FF[mid][1] }
    const sl = KO_FF[mid]; if (!sl) return { h:null, a:null }
    return { h: ffResolve(sl[0], P), a: ffResolve(sl[1], P) }
  }
  function ffResolve(slot, P) {
    const m = /^([WL])M(\d+)$/.exec(slot); if (!m) return null
    const kind = m[1], src = 'M'+m[2], pk = P[src]
    if (!pk) return null
    const w = ffWinner(src, P)
    if (w == null || w === 'Sin definir') return w === 'Sin definir' ? 'Sin definir' : null
    const t = ffTeams(src, P)
    if (kind === 'W') return w
    if (w === t.h) return t.a
    if (w === t.a) return t.h
    return null
  }
  // Ganador de un partido: usa winner guardado, o lo deduce por marcador (como el HTML)
  function ffWinner(mid, P) {
    const pk = P[mid]; if (!pk) return null
    const t = ffTeams(mid, P)
    if (pk.win && pk.win !== 'Sin definir') return pk.win
    if (pk.win === 'Sin definir') return 'Sin definir'
    if (pk.h == null || pk.a == null) return null
    if (pk.h > pk.a) return t.h
    if (pk.a > pk.h) return t.a
    return null  // empate sin winner
  }
  function ffMatchPts(mid, pick, real, pickTeams, realTeams, P) {
    if (!pick || !real || pick.h == null || pick.a == null || real.h == null || real.a == null) return 0
    let pts = 0
    const localOk = pickTeams.h && realTeams.h && pickTeams.h === realTeams.h
    const visitOk = pickTeams.a && realTeams.a && pickTeams.a === realTeams.a
    const gL = localOk && pick.h === real.h
    const gV = visitOk && pick.a === real.a
    if (gL) pts += 1
    if (gV) pts += 1
    const pickWin = ffWinner(mid, P)
    const wOk = pickWin && real.w && pickWin === real.w && pickWin !== 'Sin definir'
    if (wOk) pts += 2
    if (gL && gV && wOk) pts += 1
    return pts
  }
  function ffOrden(P) {
    const t104 = ffTeams('M104', P), t103 = ffTeams('M103', P)
    const w104 = ffWinner('M104', P), w103 = ffWinner('M103', P)
    let campeon=null, sub=null, tercero=null, cuarto=null
    if (w104 && w104 !== 'Sin definir') {
      campeon = w104
      sub = w104 === t104.h ? t104.a : (w104 === t104.a ? t104.h : null)
    }
    if (w103 && w103 !== 'Sin definir') {
      tercero = w103
      cuarto = w103 === t103.h ? t103.a : (w103 === t103.a ? t103.h : null)
    }
    return { campeon, sub, tercero, cuarto }
  }
  // Calcula elim y final EN VIVO para una quiniela (picks = allPicks[qid] con {h,a,win})
  function normalizeRealMap() {
    const realMap = {}
    for (const mid in realResults) {
      const r = realResults[mid]
      realMap[mid] = { h: r.h, a: r.a, win: r.w }
    }
    return realMap
  }
  // Nombres de equipos de un partido: 16avos de TEAM_NAMES, octavos+ de la quiniela real
  function equiposDelPartido(mid) {
    if (R32_FF[mid]) return TEAM_NAMES[mid] || [R32_FF[mid][0], R32_FF[mid][1]]
    const t = ffTeams(mid, normalizeRealMap())
    return [t.h || '¿?', t.a || '¿?']
  }
  function calcElimFinal(P) {
    const realMap = normalizeRealMap()
    // Equipos reales por posición
    const realTeams = {}
    for (let i=73;i<=104;i++) realTeams['M'+i] = ffTeams('M'+i, realMap)
    let elim = 0
    for (let i=73;i<=104;i++) {
      const mid = 'M'+i
      const real = realMap[mid]
      if (!real || real.h == null) continue
      const pick = P[mid]
      const pickTeams = ffTeams(mid, P)
      // pasar real con winner deducido
      const realW = { h: real.h, a: real.a, w: ffWinner(mid, realMap) }
      elim += ffMatchPts(mid, pick, realW, pickTeams, realTeams[mid], P)
    }
    // Orden final
    const oReal = ffOrden(realMap)
    const oQ = ffOrden(P)
    let fin = 0
    if (oQ.campeon && oReal.campeon && oQ.campeon === oReal.campeon) fin += 20
    if (oQ.sub && oReal.sub && oQ.sub === oReal.sub) fin += 10
    if (oQ.tercero && oReal.tercero && oQ.tercero === oReal.tercero) fin += 5
    if (oQ.cuarto && oReal.cuarto && oQ.cuarto === oReal.cuarto) fin += 3
    return { elim, fin }
  }

  function buildEnriched() {
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas', year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date())
    const todayMatchIds = Object.entries(MATCH_DATES).filter(([, d]) => d === todayStr).map(([mid]) => mid)
    const outcome = (h,a) => h>a ? 'H' : h<a ? 'A' : 'D'
    const calcDayPts = (picks) => {
      let total = 0
      todayMatchIds.forEach(mid => {
        const esFF = /^M\d+$/.test(mid)
        const pk = picks[mid]
        const rres = esFF ? realResults[mid] : results[mid]
        const res = esFF ? (rres ? { hs: rres.h, as: rres.a } : null) : rres
        if (!pk || pk.h == null || pk.a == null || !res || res.hs == null) return
        // Para fase final, comparar posición exacta de equipos
        let hOk, aOk
        if (esFF) {
          const pT = ffTeams(mid, picks)
          const rT = ffTeams(mid, normalizeRealMap())
          hOk = pT.h && rT.h && pT.h === rT.h && pk.h === res.hs
          aOk = pT.a && rT.a && pT.a === rT.a && pk.a === res.as
        } else {
          hOk = pk.h === res.hs
          aOk = pk.a === res.as
        }
        // Ganador: en fase final se compara el equipo que avanza (deducido si falta)
        let winOk
        if (esFF) {
          const pickWin = ffWinner(mid, picks)
          const realWin = ffWinner(mid, normalizeRealMap())
          winOk = pickWin && realWin && pickWin === realWin && pickWin !== 'Sin definir'
        } else {
          winOk = outcome(pk.h,pk.a) === outcome(res.hs,res.as)
        }
        if (hOk) total += 1
        if (aOk) total += 1
        if (winOk) total += 2
        if (hOk && aOk && winOk) total += 1
      })
      return total
    }

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
      const clasifLive = calcClasifPts(picks, results)   // clasificación EN VIVO
      const ff = calcElimFinal(picks)                     // eliminatoria + final EN VIVO
      return {
        ...r,
        groupPts,
        grpTotal,
        clasifPts: clasifLive,             // posición exacta en grupos (en vivo)
        elimPts:   ff.elim,                // R32+Oct+QF+SF+3ro+Final (EN VIVO desde picks_ko_test)
        finalPts:  ff.fin,                 // orden final 20/10/5/3 (EN VIVO)
        // TOTAL 100% en vivo
        total: grpTotal + clasifLive + ff.elim + ff.fin,
        dayPts: calcDayPts(picks),
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

    // Premio por fila: si hay empate en una posición premiada (1,2,3), se divide entre los empatados.
    // Además se descuenta lo ya entregado a cada puesto (1º=$150, 2º=$50, 3º=$25).
    const rankCounts = {}
    ranked.forEach(r => { rankCounts[r.rank] = (rankCounts[r.rank]||0) + 1 })
    const prizeByRank = { 1: prizePool.p1, 2: prizePool.p2, 3: prizePool.p3 }
    const entregadoByRank = { 1: 150, 2: 50, 3: 25 }
    const rankedWithPrize = ranked.map(r => {
      const base = prizeByRank[r.rank]
      const n = rankCounts[r.rank]
      // Premio total que le corresponde (dividido si hay empate)
      const prizeTotal = base != null ? base / n : null
      // Lo ya entregado a ese puesto, también dividido entre los empatados
      const entregado = entregadoByRank[r.rank] != null ? entregadoByRank[r.rank] / n : 0
      // Lo que falta por recibir
      const prize = prizeTotal != null ? Math.max(0, prizeTotal - entregado) : null
      return { ...r, prize, prizeTotal, entregado }
    })

    setEnriched(rankedWithPrize)
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
    setViewerView('original')
    setIframeReady(false)
  }

  async function descargarJPG() {
    setDescargando(true)
    try {
      if (!window.html2canvas) {
        await new Promise((res, rej) => {
          const s = document.createElement('script')
          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
          s.onload = res; s.onerror = rej
          document.head.appendChild(s)
        })
      }
      const iframe = document.getElementById('viewer-iframe')
      const doc = iframe?.contentDocument
      if (!doc) { alert('No se pudo acceder al cuadro.'); setDescargando(false); return }
      const el = doc.querySelector('.bracket') || doc.body
      const imgs = Array.from(doc.querySelectorAll('img'))
      await Promise.race([
        Promise.all(imgs.map(im => im.complete ? Promise.resolve() : new Promise(r => { im.onload = r; im.onerror = r }))),
        new Promise(r => setTimeout(r, 2500)),
      ])
      const canvas = await window.html2canvas(el, {
        scale: 2, useCORS: true, allowTaint: true, backgroundColor: '#ffffff', logging: false,
        width: el.scrollWidth, height: el.scrollHeight, windowWidth: el.scrollWidth,
      })
      const url = canvas.toDataURL('image/jpeg', 0.92)
      const a = document.createElement('a')
      const nombre = (viewing?.quinielaName || viewing?.name || 'quiniela').replace(/[^a-z0-9]/gi, '_')
      a.href = url
      a.download = `FaseFinal_${nombre}.jpg`
      a.click()
    } catch (e) {
      console.error(e)
      alert('Error al generar la imagen: ' + e.message)
    }
    setDescargando(false)
  }

  async function loadViewerPicks() {
    if (!viewing) return
    if (viewerView === 'corregida') {
      // NUEVA Fase Final: leer los picks directamente de picks_ko_test con
      // los campos correctos (incluido winner) para que el HTML los reciba bien.
      const { data: koRows } = await supabase
        .from('picks_ko_test')
        .select('match_id, goals_home, goals_away, winner')
        .eq('quiniela_id', viewing.quinielaId)
      const koTestPicks = {}
      for (const r of (koRows || [])) {
        koTestPicks[r.match_id] = { h: r.goals_home, a: r.goals_away, w: r.winner }
      }
      const { data: lockRows } = await supabase
        .from('match_locks').select('match_id, locked').eq('locked', true)
      const lockedMatches = (lockRows || []).map(r => r.match_id)
      // Resultados reales (de la quiniela marcada es_real) para mostrar puntos por partido
      let realResults = {}
      const { data: realQ } = await supabase.from('quinielas').select('id').eq('es_real', true).maybeSingle()
      if (realQ?.id) {
        const { data: realRows } = await supabase
          .from('picks_ko_test').select('match_id, goals_home, goals_away, winner')
          .eq('quiniela_id', realQ.id)
        for (const r of (realRows || [])) {
          realResults[r.match_id] = { h: r.goals_home, a: r.goals_away, w: r.winner }
        }
      }
      document.getElementById('viewer-iframe')?.contentWindow?.postMessage({
        type: 'INIT',
        data: { quinielaId: viewing.quinielaId, username: viewing.name, picks: koTestPicks, readOnly: true, lockedMatches, realResults }
      }, '*')
    } else {
      const [picks, res] = await Promise.all([getQuinielaPicks(viewing.quinielaId), getAllResults()])
      document.getElementById('viewer-iframe')?.contentWindow?.postMessage({
        type: 'INIT',
        data: { quinielaId: viewing.quinielaId, isLocked: true, username: viewing.name, picks, results: res }
      }, '*')
    }
  }

  function switchViewerView(v) {
    if (v === viewerView) return
    setViewerView(v)
    setIframeReady(false)
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
    const viewerSrc = viewerView === 'corregida' ? '/solo_fasefinal.html' : '/quiniela2026_fixed.html'
    return (
      <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 52px)' }}>
        <div style={{ background:'#fff', borderBottom:'0.5px solid rgba(0,0,0,.08)', padding:'8px 20px', display:'flex', alignItems:'center', gap:10, flexShrink:0, flexWrap:'wrap' }}>
          <button onClick={() => setViewing(null)} style={{ border:'none', background:'none', cursor:'pointer', color:'#6e6e73', fontSize:13 }}>← Tabla</button>
          <span style={{ color:'#e0e0e0' }}>|</span>
          <span style={{ fontWeight:700, fontSize:15 }}>{viewing.name}</span>
          <span style={{ fontSize:12, color:'#6e6e73' }}>{viewing.quinielaName}</span>
          <span style={{ fontSize:11, background:'rgba(255,159,10,.12)', color:'#b06000', padding:'2px 8px', borderRadius:6, fontWeight:600 }}>👁 Solo lectura</span>
          {/* Conmutador Original / Corregida */}
          <div style={{ display:'flex', gap:4, background:'#f2f2f7', padding:3, borderRadius:9, marginLeft:'auto' }}>
            <button onClick={() => switchViewerView('original')}
              style={{ padding:'5px 12px', border:'none', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer',
                background: viewerView==='original' ? '#0071e3' : 'transparent', color: viewerView==='original' ? '#fff' : '#6e6e73' }}>
              Original
            </button>
            <button onClick={() => switchViewerView('corregida')}
              style={{ padding:'5px 12px', border:'none', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer',
                background: viewerView==='corregida' ? '#e52e71' : 'transparent', color: viewerView==='corregida' ? '#fff' : '#6e6e73' }}>
              🏆 Fase Final
            </button>
          </div>
          {viewerView === 'corregida' && (
            <button onClick={descargarJPG} disabled={descargando}
              style={{ padding:'6px 14px', border:'none', borderRadius:8, background: descargando?'#aeaeb2':'#1a7a38', color:'#fff', cursor: descargando?'default':'pointer', fontSize:12, fontWeight:700 }}>
              {descargando ? '⏳ Generando...' : '📷 Descargar JPG'}
            </button>
          )}
        </div>
        {viewerView === 'corregida' && (
          <div style={{ background:'linear-gradient(90deg,#fff4e6,#ffe9f0)', color:'#b3402a', padding:'5px 20px', fontSize:12, fontWeight:600, flexShrink:0 }}>
            🏆 Fase Final — Equipos reales del Mundial 2026 — solo lectura
          </div>
        )}
        {!iframeReady && <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'#aeaeb2' }}>⚽ Cargando...</div>}
        <iframe id="viewer-iframe" key={viewerView} src={viewerSrc}
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
        <div style={{ background:'linear-gradient(135deg,#ffd60a,#ff9f0a)', borderRadius:14, padding:'16px 22px', marginBottom:16, boxShadow:'0 4px 16px rgba(255,214,10,.25)' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:14 }}>
            <div>
              <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.5px', color:'rgba(0,0,0,.5)' }}>💰 Premio acumulado</div>
              <div style={{ fontSize:30, fontWeight:900, color:'#000' }}>${prizePool.total} USD</div>
            </div>
            <div style={{ display:'flex', gap:18, alignItems:'center' }}>
              {[['🥇','1er lugar',prizePool.p1,'60%',150],['🥈','2do lugar',prizePool.p2,'20%',50],['🥉','3er lugar',prizePool.p3,'10%',25]].map(([medal,label,amt,pct,entregado]) => {
                const falta = Math.max(0, (amt||0) - entregado)
                return (
                  <div key={label} style={{ textAlign:'center', minWidth:70 }}>
                    <div style={{ fontSize:22 }}>{medal}</div>
                    <div style={{ fontSize:15, fontWeight:800, color:'#000' }}>${amt}</div>
                    <div style={{ fontSize:9, color:'rgba(0,0,0,.5)', fontWeight:600 }}>{pct}</div>
                    <div style={{ fontSize:10, fontWeight:700, color: falta>0?'#8a2b00':'#1a7a38', marginTop:2 }}>
                      {falta>0 ? `falta $${falta}` : '✓ pagado'}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          {/* Zona grande: entregado y faltante */}
          <div style={{ display:'flex', gap:12, marginTop:14, flexWrap:'wrap' }}>
            <div style={{ flex:1, minWidth:200, background:'rgba(255,255,255,.55)', borderRadius:10, padding:'12px 16px', textAlign:'center' }}>
              <div style={{ fontSize:12, fontWeight:800, color:'rgba(0,0,0,.6)', textTransform:'uppercase', letterSpacing:'.4px' }}>Ya entregado</div>
              <div style={{ fontSize:26, fontWeight:900, color:'#000' }}>$225</div>
              <div style={{ fontSize:11, color:'rgba(0,0,0,.55)', fontWeight:600 }}>🥇 $150 · 🥈 $50 · 🥉 $25</div>
            </div>
            <div style={{ flex:1, minWidth:200, background:'rgba(0,0,0,.08)', borderRadius:10, padding:'12px 16px', textAlign:'center' }}>
              <div style={{ fontSize:12, fontWeight:800, color:'rgba(0,0,0,.6)', textTransform:'uppercase', letterSpacing:'.4px' }}>Falta por repartir</div>
              <div style={{ fontSize:26, fontWeight:900, color:'#000' }}>${Math.max(0, (prizePool.p1 + prizePool.p2 + prizePool.p3) - 225)}</div>
              <div style={{ fontSize:11, color:'rgba(0,0,0,.55)', fontWeight:600 }}>de ${prizePool.p1 + prizePool.p2 + prizePool.p3} en premios (90% del pozo)</div>
            </div>
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
                    const esFF = /^M\d+$/.test(mid)
                    // Grupos: de results (match_results). Fase final: de realResults (quiniela real)
                    const r = esFF ? realResults[mid] : results[mid]
                    const [home, away] = esFF ? equiposDelPartido(mid) : (TEAM_NAMES[mid] || ['?','?'])
                    const played = esFF ? (r && r.h != null) : (r && r.hs != null)
                    const hs = esFF ? r?.h : r?.hs
                    const as = esFF ? r?.a : r?.as
                    const n = esFF ? parseInt(mid.slice(1)) : 0
                    const etiqueta = !esFF ? `GR.${mid[0]}`
                      : n<=88 ? '16avos' : n<=96 ? '8vos' : n<=100 ? '4tos' : n<=102 ? 'Semi' : n===103 ? '3er' : 'Final'
                    return (
                      <div key={mid} style={{ display:'flex', alignItems:'center', gap:4, fontSize:12, padding:'3px 6px', background:'#f9f9fb', borderRadius:5, lineHeight:1.4 }}>
                        <span style={{ fontSize:9, color:'#c7c7cc', fontWeight:700, minWidth:24 }}>{etiqueta}</span>
                        <span style={{ flex:1, textAlign:'right', fontWeight:600, color:'#1d1d1f', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{home}</span>
                        <span style={{ fontWeight:800, fontSize:13, color: played ? '#1d1d1f' : '#c7c7cc', minWidth:34, textAlign:'center', flexShrink:0 }}>
                          {played ? `${hs}–${as}` : '–:–'}
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


        {/* Reglamento de puntos por posición final */}
        <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,.08)', borderRadius:12, padding:'10px 16px', marginBottom:16, boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
          <div style={{ fontSize:11, fontWeight:800, color:'#6e6e73', letterSpacing:'.3px', marginBottom:8 }}>PUNTOS POR POSICIÓN FINAL</div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {[['🥇','Campeón',20],['🥈','Subcampeón',10],['🥉','3er lugar',5],['4º','4to lugar',3]].map(([m,l,p]) => (
              <div key={l} style={{ flex:'1 1 120px', minWidth:110, display:'flex', alignItems:'center', gap:8, padding:'8px 10px', background:'#f9f9fb', borderRadius:8 }}>
                <span style={{ fontSize:18 }}>{m}</span>
                <div style={{ display:'flex', flexDirection:'column', lineHeight:1.2 }}>
                  <span style={{ fontSize:12, fontWeight:600, color:'#1d1d1f' }}>{l}</span>
                  <span style={{ fontSize:13, fontWeight:800, color:'#1a7a38' }}>{p} pts</span>
                </div>
              </div>
            ))}
          </div>
        </div>

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

        {/* Mejor(es) quiniela(s) del día */}
        {(() => {
          const maxDay = Math.max(0, ...enriched.map(r => r.dayPts || 0))
          if (maxDay === 0) return null
          const best = enriched.filter(r => r.dayPts === maxDay)
          return (
            <div style={{ background:'rgba(255,214,10,.10)', border:'1px solid rgba(255,159,10,.25)', borderRadius:10, padding:'10px 16px', marginBottom:12, display:'flex', flexDirection:'column', gap:6 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#7a5900' }}>
                🔥 {best.length > 1 ? 'Mejores quinielas del día' : 'Mejor quiniela del día'} · {maxDay} pts
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                {best.map(r => (
                  <div key={r.quiniela_id} style={{ display:'flex', alignItems:'center', gap:6, background:'#fff', borderRadius:8, padding:'4px 10px', fontSize:12 }}>
                    {r.quinielas?.seq_num && (
                      <span style={{ fontSize:9, fontWeight:800, color:'#fff', borderRadius:4, padding:'1px 5px', background:'#0071e3' }}>
                        Q{String(r.quinielas.seq_num).padStart(2,'0')}
                      </span>
                    )}
                    <span style={{ fontWeight:700 }}>{r.quinielas?.name}</span>
                    <span style={{ color:'#aeaeb2', fontSize:10 }}>{r.quinielas?.profiles?.username}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

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
                  if (loading || !picksLoaded || !resultsLoaded) return <tr><td colSpan={20} style={{ padding:32, textAlign:'center', color:'#aeaeb2' }}>Cargando...</td></tr>
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
                          {r.prize != null && r.prize > 0 && (
                            <span style={{ fontSize:9, background:'rgba(48,209,88,.15)', color:'#1a7a38', padding:'1px 6px', borderRadius:4, fontWeight:700 }}
                              title={`Premio total: $${Math.round(r.prizeTotal)} · Ya entregado: $${Math.round(r.entregado)}`}>
                              🏆 Falta recibir ${Math.round(r.prize)}
                            </span>
                          )}
                          {r.prize != null && r.prize === 0 && r.prizeTotal > 0 && (
                            <span style={{ fontSize:9, background:'rgba(0,0,0,.06)', color:'#8e8e93', padding:'1px 6px', borderRadius:4, fontWeight:700 }}>
                              ✓ Premio entregado
                            </span>
                          )}
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
                            let dayTotal = 0
                            const chips = todayMatches.map(mid => {
                                  const esFF = /^M\d+$/.test(mid)
                                  const pk = picks[mid]
                                  // Grupos: resultado de results. Fase final: de realResults (quiniela real)
                                  const rres = esFF ? realResults[mid] : results[mid]
                                  const res = esFF ? (rres ? { hs: rres.h, as: rres.a } : null) : rres
                                  const has = pk && pk.h != null && pk.a != null
                                  // Equipos que ESTA quiniela predijo (16avos: fijos; octavos+: según sus picks)
                                  let home, away
                                  if (esFF) {
                                    const pt = ffTeams(mid, picks)
                                    home = pt.h || '¿?'; away = pt.a || '¿?'
                                  } else {
                                    [home, away] = TEAM_NAMES[mid] || ['?','?']
                                  }
                                  const hasResult = res && res.hs != null
                                  // Equipos reales en ese partido (según quiniela real)
                                  const realT = esFF ? ffTeams(mid, normalizeRealMap()) : null
                                  // El gol suma solo si el equipo predicho coincide en posición con el real
                                  const localCoincide = esFF ? (realT.h && home === realT.h) : true
                                  const visitCoincide = esFF ? (realT.a && away === realT.a) : true
                                  const hOk = has && hasResult && localCoincide && pk.h === res.hs
                                  const aOk = has && hasResult && visitCoincide && pk.a === res.as

                                  const outcome = (h,a) => h>a ? 'H' : h<a ? 'A' : 'D'
                                  const pickWinFF = esFF ? ffWinner(mid, picks) : null
                                  const realWinFF = esFF ? ffWinner(mid, normalizeRealMap()) : null
                                  const winnerOk = esFF
                                    ? (has && pickWinFF && realWinFF && pickWinFF === realWinFF && pickWinFF !== 'Sin definir')
                                    : (has && hasResult && outcome(pk.h,pk.a) === outcome(res.hs,res.as))
                                  const pickOutcomeLabel = esFF
                                    ? (pickWinFF && pickWinFF !== 'Sin definir' ? pickWinFF : null)
                                    : (!has ? null : outcome(pk.h,pk.a) === 'H' ? home : outcome(pk.h,pk.a) === 'A' ? away : 'Empate')

                                  let matchPts = 0
                                  if (has && hasResult) {
                                    if (hOk) matchPts += 1
                                    if (aOk) matchPts += 1
                                    if (winnerOk) matchPts += 2
                                    if (hOk && aOk && winnerOk) matchPts += 1
                                    dayTotal += matchPts
                                  }

                                  const mark = (ok) => !hasResult ? null :
                                    <span style={{ fontWeight:900, color: ok ? '#1a7a38' : '#c0392b' }}>{ok ? '✓' : '✗'}</span>

                                  // Tachar el equipo si no coincide con el real (solo fase final con resultado)
                                  const tachaLocal = esFF && hasResult && !localCoincide
                                  const tachaVisit = esFF && hasResult && !visitCoincide
                                  const stName = (tachar) => tachar
                                    ? { textDecoration:'line-through', textDecorationThickness:'1px', color:'#c0392b', opacity:.7 }
                                    : {}

                                  return (
                                    <span key={mid} style={{ fontSize:11, fontWeight:600, padding:'2px 7px', borderRadius:4,
                                      background:'#f9f9fb', color:'#1d1d1f', display:'inline-flex', alignItems:'center', gap:4 }}>
                                      <span>
                                        <span style={stName(tachaLocal)}>{home}</span> {has ? pk.h : '–'}{!has ? null : mark(hOk)}-{has ? pk.a : '–'}{!has ? null : mark(aOk)} <span style={stName(tachaVisit)}>{away}</span>
                                      </span>
                                      {hasResult && pickOutcomeLabel && <span style={{ color: (has && winnerOk) ? '#1a7a38' : '#6e6e73', fontWeight: (has && winnerOk) ? 800 : 600, fontSize:10 }}>→ {pickOutcomeLabel}</span>}
                                      {hasResult && <span style={{ fontWeight:900, color: (has && winnerOk) ? '#1a7a38' : '#c0392b' }}>{has && winnerOk ? '✓' : '✗'}</span>}
                                      {hasResult && <span style={{ color:'#0071e3', fontWeight:800, fontSize:10 }}>+{matchPts}</span>}
                                    </span>
                                  )
                            })
                            return (
                              <span style={{ display:'flex', gap:4, flexWrap:'wrap', alignItems:'center' }}>
                                {chips}
                                <span style={{ fontSize:10, fontWeight:800, color:'#1a7a38', background:'rgba(48,209,88,.15)', padding:'2px 7px', borderRadius:4 }}>
                                  Hoy: {dayTotal} pts
                                </span>
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
