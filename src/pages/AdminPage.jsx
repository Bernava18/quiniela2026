import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// Equipos fijos de fase de grupos (conocidos desde el sorteo)
const GROUP_FIXTURE = {
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
  const navigate = useNavigate()
  const [tab, setTab]           = useState('payments')
  const [users, setUsers]       = useState([])
  const [results, setResults]   = useState({})
  const [phase, setPhase]       = useState(0)
  const [saving, setSaving]     = useState(null)
  const [syncing, setSyncing]   = useState(false)
  const [msg, setMsg]           = useState('')
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [printing, setPrinting] = useState(false)
  const [printProgress, setPrintProgress] = useState('')

  // Editor de picks (corrección manual por quiniela bloqueada)
  const [pickQuery, setPickQuery] = useState('')
  const [pickQuiniela, setPickQuiniela] = useState(null)
  const [pickValues, setPickValues] = useState({})
  const [editedMatches, setEditedMatches] = useState({})
  const [paymentSearch, setPaymentSearch] = useState('')
  const [groupBy, setGroupBy] = useState('')
  const [groupBy2, setGroupBy2] = useState('')
  const [savingPicks, setSavingPicks] = useState(false)
  const adminTableRef = useRef(null)
  // Mapa plano de quinielas por id para updates instantáneos sin recargar
  const [quinielasMap, setQuinielasMap] = useState({})

  function patchQ(id, patch) {
    setQuinielasMap(prev => ({ ...prev, [id]: { ...(prev[id] || {}), ...patch } }))
  }

  function getQ(q) {
    const ov = quinielasMap[q.id]
    return ov ? { ...q, ...ov } : q
  }

  function renderQRow(u, q, isLast, showUsername) {
    const gq     = getQ(q)
    const qPicks = q.picks?.filter(p=>p.goals_home!=null).length || 0
    const qPts   = q.scores?.[0]?.total_pts || 0
    return (
      <div key={q.id} style={{ display:'grid', gridTemplateColumns:'36px 1fr 90px 90px 44px 110px 170px 140px 44px', padding:'9px 16px', gap:8, alignItems:'center', background:'#fff', borderBottom: isLast?'none':`0.5px solid rgba(0,0,0,.04)` }}>

        {/* Indent */}
        <div style={{ display:'flex', justifyContent:'center' }}>
          <div style={{ width:14, height:14, borderLeft:'1.5px solid #d1d1d6', borderBottom:'1.5px solid #d1d1d6', borderRadius:'0 0 0 5px', marginTop:-6 }}/>
        </div>

        {/* Name + ID */}
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:2, flexWrap:'wrap' }}>
            <span style={{ fontSize:10, fontWeight:800, color:'#fff', borderRadius:5, padding:'1px 6px', letterSpacing:'.3px',
              background: gq.payment_status==='paid'?'#0071e3':gq.payment_status==='committed'?'#ff9f0a':'#aeaeb2' }}>
              Q{String(q.seq_num||0).padStart(2,'0')}
            </span>
            <span style={{ fontSize:12.5, fontWeight:700, color:'#1d1d1f' }}>📋 {q.name}</span>
            {showUsername && <span style={{ fontSize:10, color:'#aeaeb2' }}>· {u.username}</span>}
          </div>
          {gq.payment_status==='paid' && u.paid_at && (
            <div style={{ fontSize:10, color:'#30d158', fontWeight:600 }}>✓ Pagado el {new Date(u.paid_at).toLocaleDateString('es-ES',{day:'numeric',month:'short'})}</div>
          )}
          {gq.payment_status==='committed' && (
            <div style={{ fontSize:10, color:'#ff9f0a', fontWeight:600 }}>🤝 Pago comprometido</div>
          )}
        </div>

        {/* Picks */}
        <div style={{ textAlign:'center' }}>
          <span style={{ fontSize:12, fontWeight:700, color:qPicks===104?'#30d158':qPicks>0?'#ff9f0a':'#aeaeb2' }}>{qPicks}</span>
          <span style={{ fontSize:10, color:'#aeaeb2' }}>/104</span>
        </div>

        {/* Points */}
        <div style={{ textAlign:'center' }}>
          <span style={{ fontSize:13, fontWeight:800, color:'#0071e3' }}>{qPts} pts</span>
        </div>

        {/* Print */}
        <div style={{ textAlign:'center' }}>
          <button onClick={() => window.open(`/print/${q.id}`, '_blank')} title="Imprimir"
            style={{ padding:'6px 10px', border:'0.5px solid rgba(0,0,0,.12)', borderRadius:8, background:'#fff', cursor:'pointer', fontSize:13 }}>
            🖨️
          </button>
        </div>

        {/* Método — guarda sin recargar */}
        <div>
          <select
            value={gq.payment_method || ''}
            onChange={e => changePaymentMethod(q.id, e.target.value)}
            style={{ fontSize:10, fontFamily:'inherit', border:'0.5px solid #d1d1d6', borderRadius:6, padding:'4px 5px', background:'#fff', cursor:'pointer', width:'100%' }}>
            <option value="">— Método —</option>
            <option value="zelle">🏦 Zelle</option>
            <option value="transfer_usd">💱 Transfer $</option>
            <option value="transfer_bs">🇻🇪 Transfer Bs</option>
            <option value="cash_usd">💵 $ Efectivo</option>
          </select>
        </div>

        {/* Ref — guarda al salir del campo, sin recargar */}
        <div>
          <input
            key={q.id + '_ref_' + (gq.payment_ref||'').length}
            defaultValue={gq.payment_ref || ''}
            onBlur={e => {
              const val = e.target.value.trim()
              if (val !== (q.payment_ref || '').trim()) {
                changePaymentRef(q.id, val)
              }
            }}
            placeholder="Ref., nombre, confirmación..."
            style={{ fontSize:10, fontFamily:'inherit', border:'0.5px solid #d1d1d6', borderRadius:6, padding:'4px 7px', outline:'none', width:'100%', color:'#1d1d1f', boxSizing:'border-box',
              background: gq.payment_ref ? 'rgba(48,209,88,.06)' : '#fff' }}
          />
        </div>

        {/* Estado pago — no-controlado con key para re-montar cuando cambia */}
        <div>
          <select
            key={q.id + '_st_' + (gq.payment_status || 'unpaid')}
            defaultValue={gq.payment_status || 'unpaid'}
            onChange={e => changePaymentStatus(q.id, e.target.value)}
            style={{ fontSize:11, fontFamily:'inherit', fontWeight:700, border:'1px solid rgba(0,0,0,.1)', borderRadius:8, padding:'6px 8px', cursor:'pointer', width:'100%',
              background: gq.payment_status==='paid'?'rgba(48,209,88,.15)':gq.payment_status==='committed'?'rgba(255,159,10,.15)':'rgba(255,69,58,.08)',
              color: gq.payment_status==='paid'?'#1a7a38':gq.payment_status==='committed'?'#b06000':'#c0392b' }}>
            <option value="unpaid">⬜ Sin pagar</option>
            <option value="committed">🤝 Comprometido</option>
            <option value="paid">✅ Pagado</option>
          </select>
        </div>

        {/* Ocultar de tabla */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center' }}>
          <input
            type="checkbox"
            title={gq.hidden_from_table ? 'Oculta de la tabla' : 'Visible en la tabla'}
            checked={!!gq.hidden_from_table}
            onChange={e => changeHidden(q.id, e.target.checked)}
            style={{ width:16, height:16, cursor:'pointer', accentColor:'#ff3b30' }}
          />
        </div>

      </div>
    )
  }

  useEffect(() => { loadUsers(); loadResults() }, [])

  async function loadUsers() {
    setLoadingUsers(true)
    const { data } = await supabase
      .from('profiles_with_email')
      .select(`
        id, username, full_name, phone, email, has_paid, paid_at,
        quinielas (
          id, name, seq_num, is_locked, payment_status, payment_method, payment_ref, hidden_from_table,
          picks (match_id, goals_home, goals_away),
          scores (total_pts)
        )
      `)
      .order('username')
    const qmap = {}
    ;(data || []).forEach(u => (u.quinielas||[]).forEach(q => { qmap[q.id] = q }))
    setQuinielasMap(qmap)
    setUsers(data || [])
    setLoadingUsers(false)
  }

  async function selectPickQuiniela(q) {
    const { data, error } = await supabase.from('picks').select('match_id, goals_home, goals_away, winner, h_team, a_team').eq('quiniela_id', q.id)
    if (error) { setMsg('Error cargando picks: ' + error.message); return }
    const vals = {}
    ;(data || []).forEach(p => { vals[p.match_id] = { h: p.goals_home, a: p.goals_away, win: p.winner, hTeam: p.h_team, aTeam: p.a_team } })
    setPickQuiniela(q)
    setPickValues(vals)
    setEditedMatches({})
  }

  function updatePickValue(matchId, field, value) {
    setPickValues(prev => ({
      ...prev,
      [matchId]: { ...(prev[matchId] || {}), [field]: value === '' ? null : (field === 'win' ? value : parseInt(value)) }
    }))
    setEditedMatches(prev => ({ ...prev, [matchId]: true }))
  }

  async function savePickEdits() {
    if (!pickQuiniela) return
    const matchIds = Object.keys(editedMatches)
    if (matchIds.length === 0) { setMsg('No hay cambios para guardar'); setTimeout(() => setMsg(''), 2000); return }
    setSavingPicks(true)
    const rows = matchIds.map(match_id => {
      const v = pickValues[match_id] || {}
      const fixture = GROUP_FIXTURE[match_id]
      return {
        quiniela_id: pickQuiniela.id,
        match_id,
        goals_home: v.h ?? null,
        goals_away: v.a ?? null,
        winner: v.win ?? null,
        h_team: v.hTeam ?? fixture?.[0] ?? null,
        a_team: v.aTeam ?? fixture?.[1] ?? null,
        updated_at: new Date().toISOString(),
      }
    })
    const { error } = await supabase.from('picks').upsert(rows, { onConflict: 'quiniela_id,match_id' })
    if (error) {
      setMsg('❌ Error: ' + error.message)
    } else {
      setMsg('✓ Picks guardados (tabla de posiciones sin cambios)')
      setEditedMatches({})
    }
    setTimeout(() => setMsg(''), 4000)
    setSavingPicks(false)
  }

  async function loadResults() {
    const { data } = await supabase.from('match_results').select('*')
    const map = {}
    data?.forEach(r => { map[r.match_id] = r })
    setResults(map)
  }

  async function changePaymentStatus(quinielaId, newStatus) {
    patchQ(quinielaId, { payment_status: newStatus })
    console.log('changePaymentStatus', quinielaId, newStatus)
    const { data, error } = await supabase
      .from('quinielas')
      .update({ payment_status: newStatus })
      .eq('id', quinielaId)
      .select()
    console.log('result:', { data, error })
    if (error) {
      console.error('Supabase error:', error)
      setMsg('❌ Error: ' + error.message)
      patchQ(quinielaId, { payment_status: null })
      setTimeout(() => setMsg(''), 4000)
    } else {
      const msgs = { committed:'🤝 Comprometido', paid:'✅ Pago confirmado', unpaid:'⬜ Pago removido' }
      setMsg(msgs[newStatus])
      setTimeout(() => setMsg(''), 2500)
    }
  }

  async function changePaymentMethod(quinielaId, method) {
    patchQ(quinielaId, { payment_method: method })
    await supabase.from('quinielas').update({ payment_method: method }).eq('id', quinielaId)
  }

  async function changePaymentRef(quinielaId, ref) {
    patchQ(quinielaId, { payment_ref: ref })
    await supabase.from('quinielas').update({ payment_ref: ref }).eq('id', quinielaId)
  }

  async function changeHidden(quinielaId, hidden) {
    patchQ(quinielaId, { hidden_from_table: hidden })
    await supabase.from('quinielas').update({ hidden_from_table: hidden }).eq('id', quinielaId)
    setMsg(hidden ? '🙈 Oculta de la tabla' : '👁️ Visible en la tabla')
    setTimeout(() => setMsg(''), 2500)
  }

  async function saveResult(matchId, hs, as_, winner) {
    if (hs === '' || as_ === '') return
    setSaving(matchId)

    const isGroup = /^[A-L][1-6]$/.test(matchId)
    // Para eliminatorias necesitamos h_team/a_team — los tomamos de un pick existente con ese match_id
    let hTeam = null, aTeam = null
    if (!isGroup) {
      const { data: anyPick } = await supabase
        .from('picks').select('h_team, a_team')
        .eq('match_id', matchId).not('h_team', 'is', null).limit(1).maybeSingle()
      hTeam = anyPick?.h_team || null
      aTeam = anyPick?.a_team || null
    }

    await supabase.from('match_results').upsert({
      match_id: matchId,
      goals_home: parseInt(hs),
      goals_away: parseInt(as_),
      winner: winner || null,
      h_team: hTeam,
      a_team: aTeam,
      status: 'finished',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'match_id' })

    setMsg(`⏳ Recalculando todas las quinielas...`)
    await recalcAllQuinielas()

    setMsg(`✓ ${matchId} guardado y tabla actualizada`)
    loadResults()
    setSaving(null)
    setTimeout(() => setMsg(''), 3000)
  }

  // Recalcula scores de TODAS las quinielas en base a match_results actual
  async function recalcAllQuinielas() {
    const { data: results } = await supabase.from('match_results').select('*')
    const resultsMap = {}
    results?.forEach(r => { resultsMap[r.match_id] = r })

    const { data: allQ } = await supabase.from('quinielas').select('id')
    if (!allQ) return

    for (const q of allQ) {
      const { data: picks } = await supabase.from('picks').select('*').eq('quiniela_id', q.id)
      if (!picks) continue

      let grpPts = 0, elimPts = 0, finalPtsCalc = 0

      picks.forEach(pick => {
        const result = resultsMap[pick.match_id]
        if (!result || result.goals_home == null || pick.goals_home == null) return
        const isGrp = /^[A-L][1-6]$/.test(pick.match_id)

        if (!isGrp) {
          // Eliminatorias: equipos deben coincidir exactamente en posición
          const pH = (pick.h_team||'').trim(), pA = (pick.a_team||'').trim()
          const rH = (result.h_team||'').trim(), rA = (result.a_team||'').trim()
          if (!rH || !rA || pH !== rH || pA !== rA) return
        }

        const rR = result.goals_home > result.goals_away ? 'H' : result.goals_home < result.goals_away ? 'A' : 'D'
        const pR = pick.goals_home > pick.goals_away ? 'H' : pick.goals_home < pick.goals_away ? 'A' : 'D'
        const hOk = pick.goals_home === result.goals_home
        const aOk = pick.goals_away === result.goals_away
        const resOk = isGrp ? rR === pR : pick.winner === result.winner
        const bonus = hOk && aOk && resOk
        let pts = 0
        if (hOk) pts += 1
        if (aOk) pts += 1
        if (resOk) pts += 2
        if (bonus) pts += 1

        if (isGrp) grpPts += pts
        else if (pick.match_id !== 'M103' && pick.match_id !== 'M104') elimPts += pts
        else elimPts += pts
      })

      // Orden final (M103/M104)
      const finPick = picks.find(p => p.match_id === 'M104')
      const t3Pick  = picks.find(p => p.match_id === 'M103')
      const finRes  = resultsMap['M104']
      const t3Res   = resultsMap['M103']
      if (finRes?.goals_home != null && finPick?.winner) {
        const champion = finRes.goals_home > finRes.goals_away ? finRes.h_team : finRes.a_team
        const runner   = champion === finRes.h_team ? finRes.a_team : finRes.h_team
        if (finPick.winner === champion) finalPtsCalc += 20
        const pickRun = finPick.winner === finPick.h_team ? finPick.a_team : finPick.h_team
        if (pickRun === runner) finalPtsCalc += 10
      }
      if (t3Res?.goals_home != null && t3Pick?.winner) {
        const third  = t3Res.goals_home > t3Res.goals_away ? t3Res.h_team : t3Res.a_team
        const fourth = third === t3Res.h_team ? t3Res.a_team : t3Res.h_team
        if (t3Pick.winner === third)  finalPtsCalc += 5
        const pickFourth = t3Pick.winner === t3Pick.h_team ? t3Pick.a_team : t3Pick.h_team
        if (pickFourth === fourth) finalPtsCalc += 3
      }

      const total = grpPts + elimPts + finalPtsCalc
      await supabase.from('scores').upsert({
        quiniela_id: q.id,
        grp_pts: grpPts, clasif_pts: 0, elim_pts: elimPts,
        final_pts: finalPtsCalc, total_pts: total,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'quiniela_id' })
    }
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

  // ── PAYMENT STATS — usa overrides para que los contadores se actualicen en vivo
  const allQuinielas          = users.flatMap(u => (u.quinielas||[]).map(q => ({ ...q, ...(quinielasMap[q.id]||{}), userId: u.id, username: u.username })))

  // ── PICKS INCOMPLETOS: partidos de grupo con goals_home o goals_away en null
  const incompleteQuinielas = allQuinielas.map(q => {
    const picks = q.picks || []
    const missing = Object.keys(GROUP_FIXTURE).filter(mid => {
      const p = picks.find(pp => pp.match_id === mid)
      if (!p) return true
      return p.goals_home == null || p.goals_away == null
    })
    return { ...q, missing }
  }).filter(q => q.missing.length > 0)
    .sort((a, b) => (a.seq_num||0) - (b.seq_num||0))

  const confirmedAndCommitted = allQuinielas.filter(q => q.payment_status === 'paid' || q.payment_status === 'committed')
  const unpaidUsers           = users.filter(u => !u.has_paid)
  const totalPaid             = confirmedAndCommitted.length * ENTRY_FEE
  const prize1st  = Math.floor(totalPaid * 0.60)
  const prize2nd  = Math.floor(totalPaid * 0.20)
  const prize3rd  = Math.floor(totalPaid * 0.10)
  const prizeOrg  = Math.floor(totalPaid * 0.10)

  async function exportPaymentsCSV() {
    const headers = ['#','Quiniela','Usuario','Email','Teléfono','Picks','Puntos','Monto','Método','Ref/Datos pago','Estado','Tabla']
    const statusLabel = { paid:'Pagado', committed:'Comprometido', unpaid:'Sin pagar', '':'Sin pagar', null:'Sin pagar', undefined:'Sin pagar' }
    let i = 0
    const rows = users.flatMap(u => (u.quinielas||[]).map(q => {
      const ov = quinielasMap[q.id] || {}
      const merged = { ...q, ...ov }
      i++
      const filled = (merged.picks || []).filter(p => p.goals_home != null).length
      return [
        i,
        merged.name || '',
        u.username || '',
        u.email || '',
        u.phone || '',
        `${filled}/104`,
        merged.scores?.[0]?.total_pts || 0,
        ENTRY_FEE,
        merged.payment_method || '',
        merged.payment_ref || '',
        statusLabel[merged.payment_status] ?? merged.payment_status ?? 'Sin pagar',
        merged.hidden_from_table ? 'Oculta' : 'Visible',
      ]
    }))

    const esc = (v) => {
      const s = String(v ?? '')
      return /[",\n;]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s
    }
    const csv = [headers, ...rows].map(r => r.map(esc).join(';')).join('\r\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pagos_quiniela_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function exportAdminPDF() {
    const el = adminTableRef.current
    if (!el) return
    setPrinting(true)
    setPrintProgress('Generando PDF...')
    try {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js')
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js')
      const { jsPDF } = window.jspdf
      const canvas = await window.html2canvas(el, {
        scale: 1.5, useCORS: true, backgroundColor: '#fff',
        windowWidth: el.scrollWidth, scrollX: 0, scrollY: 0,
        width: el.scrollWidth, height: el.scrollHeight,
      })
      const imgData = canvas.toDataURL('image/jpeg', 0.92)
      const mmW = Math.round(canvas.width * 0.264583)
      const mmH = Math.round(canvas.height * 0.264583)
      const pdf = new jsPDF({
        orientation: mmW > mmH ? 'landscape' : 'portrait',
        unit: 'mm',
        format: [mmW, mmH],
      })
      pdf.addImage(imgData, 'JPEG', 0, 0, mmW, mmH)
      const fecha = new Date().toLocaleDateString('es-ES').replace(/\//g, '-')
      pdf.save(`admin-pagos-${fecha}.pdf`)
    } catch(e) {
      alert('Error generando PDF: ' + e.message)
    }
    setPrinting(false)
    setPrintProgress('')
  }

  // ── Imprimir todas ──────────────────────────────────────────
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) { resolve(); return }
      const s = document.createElement('script')
      s.src = src; s.onload = resolve; s.onerror = reject
      document.head.appendChild(s)
    })
  }

  async function printAllQuinielas() {
    setPrinting(true)
    setPrintProgress('Cargando librerías...')
    try {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js')
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js')
      const { jsPDF } = window.jspdf

      const allQ = users.flatMap(u => (u.quinielas||[]).map(q => ({ ...q, username: u.username, userEmail: u.email })))
        .sort((a,b) => (a.seq_num||0) - (b.seq_num||0))
      if (!allQ.length) { alert('No hay quinielas.'); setPrinting(false); return }

      let pdf = null
      const fecha = new Date().toISOString().slice(0,10)

      for (let i = 0; i < allQ.length; i++) {
        const q = allQ[i]
        const label = `Q${String(q.seq_num||0).padStart(2,'0')} · ${q.name} · ${q.username}`
        setPrintProgress(`Capturando ${i+1}/${allQ.length}: ${label}`)
        const captured = await captureQuinielaPrint(q.id)
        if (!captured) continue
        const { grupos, bracket } = captured
        const pW1 = 210, pH1 = Math.round((grupos.height/grupos.width)*pW1)
        if (!pdf) {
          pdf = new jsPDF({ orientation:'portrait', unit:'mm', format:[pW1,pH1] })
        } else {
          pdf.addPage([pW1,pH1],'portrait')
        }
        // Marcador (bookmark) en el panel de navegación del PDF para ubicar la quiniela
        pdf.outline.add(null, label, { pageNumber: pdf.internal.getNumberOfPages() })
        // Texto invisible para que el buscador (Ctrl+F) encuentre el nombre/Qxx
        pdf.setTextColor(255,255,255)
        pdf.setFontSize(8)
        pdf.text(label, 2, 4)
        pdf.addImage(grupos.img,'JPEG',0,0,pW1,pH1)
        const pW2 = Math.max(297, Math.round(bracket.width/3.78))
        const pH2 = Math.round((bracket.height/bracket.width)*pW2)
        pdf.addPage([pW2,pH2], pW2>pH2?'landscape':'portrait')
        pdf.setTextColor(255,255,255)
        pdf.setFontSize(8)
        pdf.text(label, 2, 4)
        pdf.addImage(bracket.img,'JPEG',0,0,pW2,pH2)
      }

      if (pdf) {
        setPrintProgress('Guardando PDF...')
        pdf.save(`Quinielas_Mundial_2026_TODAS_${fecha}.pdf`)
      }
      setPrintProgress('')
      setMsg(`✓ PDF generado con ${allQ.length} quinielas`)
    } catch(e) {
      console.error(e)
      alert('Error: ' + e.message)
      setPrintProgress('')
    }
    setPrinting(false)
    setTimeout(() => setMsg(''), 5000)
  }

  async function captureQuinielaPrint(quinielaId) {
    return new Promise((resolve) => {
      const iframe = document.createElement('iframe')
      iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:1200px;height:4000px;border:none;opacity:0;pointer-events:none;z-index:-1'
      document.body.appendChild(iframe)
      const timeout = setTimeout(() => { document.body.removeChild(iframe); resolve(null) }, 20000)
      iframe.onload = async () => {
        try {
          await new Promise(r => setTimeout(r, 2000))
          const iDoc = iframe.contentDocument
          if (!iDoc) { clearTimeout(timeout); document.body.removeChild(iframe); resolve(null); return }
          const sections = iDoc.querySelectorAll('[data-section]')
          const grupEl  = sections[0] || iDoc.body
          const brackEl = sections[1] || iDoc.body
          const opts = { scale:1.8, useCORS:true, backgroundColor:'#ffffff', logging:false, allowTaint:true }
          const c1 = await window.html2canvas(grupEl,  { ...opts, windowWidth:1200 })
          const c2 = await window.html2canvas(brackEl, { ...opts, windowWidth: brackEl.scrollWidth+40 })
          clearTimeout(timeout)
          document.body.removeChild(iframe)
          resolve({
            grupos:  { img:c1.toDataURL('image/jpeg',0.92), width:c1.width, height:c1.height },
            bracket: { img:c2.toDataURL('image/jpeg',0.92), width:c2.width, height:c2.height },
          })
        } catch(e) { clearTimeout(timeout); document.body.removeChild(iframe); resolve(null) }
      }
      iframe.src = `/print/${quinielaId}`
    })
  }

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
          {tab==='payments' && (
            <>
              <button onClick={exportPaymentsCSV}
                style={{ padding:'8px 16px', background:'#1a7a38', color:'#fff', border:'none', borderRadius:9, fontWeight:600, cursor:'pointer', fontSize:13, display:'flex', alignItems:'center', gap:6 }}>
                📊 Exportar CSV
              </button>
              <button onClick={exportAdminPDF} disabled={printing}
                style={{ padding:'8px 16px', background:'#0071e3', color:'#fff', border:'none', borderRadius:9, fontWeight:600, cursor:'pointer', fontSize:13, opacity:printing?.5:1, display:'flex', alignItems:'center', gap:6 }}>
                {printing ? `⏳ ${printProgress||'Procesando...'}` : '📄 PDF tabla pagos'}
              </button>
              <button onClick={printAllQuinielas} disabled={printing}
                style={{ padding:'8px 16px', background:'#6e6e73', color:'#fff', border:'none', borderRadius:9, fontWeight:600, cursor:'pointer', fontSize:13, opacity:printing?.5:1, display:'flex', alignItems:'center', gap:6 }}>
                {printing ? `⏳ ${printProgress||'Procesando...'}` : '🖨️ Imprimir todas'}
              </button>
            </>
          )}
          {tab==='results' && (
            <button onClick={triggerSync} disabled={syncing}
              style={{ padding:'8px 16px', background:'#30d158', color:'#fff', border:'none', borderRadius:9, fontWeight:600, cursor:'pointer', fontSize:13, opacity:syncing?.4:1 }}>
              {syncing ? '⏳ Sincronizando...' : '🔄 Sync API'}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:6, marginBottom:20, alignItems:'center' }}>
        <button style={tabStyle('payments')} onClick={() => setTab('payments')}>💰 Pagos</button>
        <button style={tabStyle('results')}  onClick={() => setTab('results')}>⚽ Resultados</button>
        <button style={tabStyle('picks')}    onClick={() => setTab('picks')}>📝 Picks</button>
        {/* Separador + acceso a la sección de PRUEBA (oculta, solo admin) */}
        <span style={{ width:1, height:24, background:'#e0e0e0', margin:'0 4px' }} />
        <button
          onClick={() => navigate('/dev-ko')}
          title="Sección de prueba del bracket corregido (no afecta producción)"
          style={{
            padding:'8px 20px', border:'1px dashed #ff9f0a', borderRadius:8, fontFamily:'inherit',
            fontSize:13, fontWeight:700, cursor:'pointer', background:'#fff8ec', color:'#b3700a',
            display:'flex', alignItems:'center', gap:6,
          }}>
          🧪 Bracket (prueba)
        </button>
      </div>

      {/* ══ TAB: PAGOS ══ */}
      {tab === 'payments' && (
        <div ref={adminTableRef}>
          {/* Prize summary */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:10, marginBottom:20 }}>
            {[
              ['✅ Pagadas',       `${allQuinielas.filter(q=>q.payment_status==='paid').length} quinielas`,       '#30d158'],
              ['🤝 Comprometidas', `${allQuinielas.filter(q=>q.payment_status==='committed').length} quinielas`,  '#ff9f0a'],
              ['💵 Recaudado real',`$${allQuinielas.filter(q=>q.payment_status==='paid').length * ENTRY_FEE}`,    '#0071e3'],
              ['🏆 Base del premio',`$${totalPaid}`,                                                              '#0071e3'],
              ['🥇 1er lugar',    `$${prize1st} (60%)`,                                                          '#ffd60a'],
              ['🥈 2do lugar',    `$${prize2nd} (20%)`,                                                          '#aeaeb2'],
              ['🥉 3er lugar',    `$${prize3rd} (10%)`,                                                          '#ff9f0a'],
              ['🏛️ Organiz.',     `$${prizeOrg} (10%)`,                                                          '#6e6e73'],
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
          <div style={{ marginBottom:12, display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
            <input
              value={paymentSearch}
              onChange={e => setPaymentSearch(e.target.value)}
              placeholder="🔍 Buscar por nombre de quiniela, jugador o Q##..."
              style={{ width:'100%', maxWidth:360, padding:'8px 12px', border:'1px solid rgba(0,0,0,.12)', borderRadius:9, fontSize:13, fontFamily:'inherit' }}
            />
            <select
              value={groupBy}
              onChange={e => { setGroupBy(e.target.value); if (!e.target.value) setGroupBy2('') }}
              style={{ padding:'8px 12px', border:'1px solid rgba(0,0,0,.12)', borderRadius:9, fontSize:13, fontFamily:'inherit', background:'#fff', cursor:'pointer' }}>
              <option value="">Sin agrupar</option>
              <option value="payment_status">Agrupar por: Estado de pago</option>
              <option value="payment_method">Agrupar por: Método de pago</option>
            </select>
            {groupBy && (
              <select
                value={groupBy2}
                onChange={e => setGroupBy2(e.target.value)}
                style={{ padding:'8px 12px', border:'1px solid rgba(0,0,0,.12)', borderRadius:9, fontSize:13, fontFamily:'inherit', background:'#fff', cursor:'pointer' }}>
                <option value="">Sin subagrupar</option>
                {groupBy !== 'payment_status' && <option value="payment_status">Luego por: Estado de pago</option>}
                {groupBy !== 'payment_method' && <option value="payment_method">Luego por: Método de pago</option>}
              </select>
            )}
          </div>

          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,.08)', borderRadius:14, overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>
            {/* Header */}
            <div style={{ display:'grid', gridTemplateColumns:'36px 1fr 90px 90px 44px 110px 170px 140px 44px', padding:'8px 16px', background:'#f9f9fb', borderBottom:'0.5px solid rgba(0,0,0,.08)', gap:8 }}>
              {['#','Quiniela','Picks','Puntos','PDF','Método','Ref / Datos pago','Estado pago','Tabla'].map((h,i) => (
                <span key={h} style={{ fontSize:9.5, fontWeight:700, textTransform:'uppercase', letterSpacing:'.4px', color:'#aeaeb2', textAlign: i===0?'center':'left' }}>{h}</span>
              ))}
            </div>

            {loadingUsers ? (
              <div style={{ padding:32, textAlign:'center', color:'#aeaeb2' }}>Cargando...</div>
            ) : (() => {
              const s = paymentSearch.trim().toLowerCase()
              const filteredUsers = !s ? users : users
                .map(u => {
                  const userMatches = u.username?.toLowerCase().includes(s) || u.full_name?.toLowerCase().includes(s)
                  const qs = (u.quinielas||[]).filter(q => {
                    const seq = `q${String(q.seq_num||0).padStart(2,'0')}`
                    return userMatches || q.name?.toLowerCase().includes(s) || seq.includes(s) || `${q.seq_num}`.includes(s)
                  })
                  return { ...u, quinielas: qs }
                })
                .filter(u => u.quinielas?.length > 0)

              if (filteredUsers.length === 0) {
                return <div style={{ padding:32, textAlign:'center', color:'#aeaeb2' }}>Sin resultados para "{paymentSearch}"</div>
              }

              // ── Vista agrupada por Estado de pago o Método de pago ──
              if (groupBy) {
                const labels = {
                  payment_status: { paid:'✅ Pagado', committed:'🤝 Comprometido', unpaid:'⬜ Sin pagar' },
                  payment_method: { zelle:'🏦 Zelle', transfer_usd:'💱 Transfer $', transfer_bs:'🇻🇪 Transfer Bs', cash_usd:'💵 $ Efectivo', '':'— Sin método —' },
                }
                const groups = {}
                filteredUsers.forEach(u => {
                  ;(u.quinielas||[]).forEach(q => {
                    const gq = getQ(q)
                    let key = gq[groupBy]
                    if (groupBy === 'payment_status') key = key || 'unpaid'
                    else key = key || ''
                    if (!groups[key]) groups[key] = []
                    groups[key].push({ u, q })
                  })
                })
                const order = groupBy === 'payment_status'
                  ? ['paid','committed','unpaid']
                  : ['zelle','transfer_usd','transfer_bs','cash_usd','']
                const order2 = groupBy2 === 'payment_status'
                  ? ['paid','committed','unpaid']
                  : ['zelle','transfer_usd','transfer_bs','cash_usd','']
                const getKey = (gq, field) => {
                  let k = gq[field]
                  return field === 'payment_status' ? (k || 'unpaid') : (k || '')
                }
                return order.filter(k => groups[k]?.length).map(key => {
                  const items = groups[key]
                  if (!groupBy2) {
                    return (
                      <div key={key}>
                        <div style={{ padding:'8px 16px', background:'#eef2f7', fontWeight:800, fontSize:12, color:'#3a3a3c', borderBottom:'0.5px solid rgba(0,0,0,.06)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                          <span>{labels[groupBy][key] ?? key} · {items.length} quiniela{items.length!==1?'s':''}</span>
                          <span style={{ color:'#0071e3', fontWeight:800 }}>${items.length * ENTRY_FEE}</span>
                        </div>
                        {items.slice().sort((a,b)=>a.q.name.localeCompare(b.q.name))
                          .map(({u,q}, i) => renderQRow(u, q, i === items.length-1, true))}
                      </div>
                    )
                  }
                  // Subagrupación
                  const subgroups = {}
                  items.forEach(({u,q}) => {
                    const gq = getQ(q)
                    const k2 = getKey(gq, groupBy2)
                    if (!subgroups[k2]) subgroups[k2] = []
                    subgroups[k2].push({ u, q })
                  })
                  return (
                    <div key={key}>
                      <div style={{ padding:'8px 16px', background:'#eef2f7', fontWeight:800, fontSize:12, color:'#3a3a3c', borderBottom:'0.5px solid rgba(0,0,0,.06)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <span>{labels[groupBy][key] ?? key} · {items.length} quiniela{items.length!==1?'s':''}</span>
                        <span style={{ color:'#0071e3', fontWeight:800 }}>${items.length * ENTRY_FEE}</span>
                      </div>
                      {order2.filter(k2 => subgroups[k2]?.length).map(k2 => {
                        const subItems = subgroups[k2]
                        return (
                          <div key={key+'_'+k2}>
                            <div style={{ padding:'6px 16px 6px 32px', background:'#f5f7fa', fontWeight:700, fontSize:11, color:'#6e6e73', borderBottom:'0.5px solid rgba(0,0,0,.04)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                              <span>↳ {labels[groupBy2][k2] ?? k2} · {subItems.length} quiniela{subItems.length!==1?'s':''}</span>
                              <span style={{ color:'#0071e3', fontWeight:800 }}>${subItems.length * ENTRY_FEE}</span>
                            </div>
                            {subItems.slice().sort((a,b)=>a.q.name.localeCompare(b.q.name))
                              .map(({u,q}, i) => renderQRow(u, q, i === subItems.length-1, true))}
                          </div>
                        )
                      })}
                    </div>
                  )
                })
              }

              // ── Vista normal agrupada por usuario ──
              return filteredUsers.map((u, ui) => (
              <div key={u.id} style={{ borderBottom:'1.5px solid rgba(0,0,0,.06)' }}>
                {/* User header */}
                <div style={{ display:'grid', gridTemplateColumns:'36px 1fr', padding:'9px 16px', gap:8, alignItems:'center', background:'#f5f5f7', borderBottom:'0.5px solid rgba(0,0,0,.05)' }}>
                  <div style={{ width:26, height:26, background:'#0071e3', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:'#fff', margin:'0 auto' }}>
                    {ui+1}
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                    <span style={{ fontWeight:800, fontSize:13.5 }}>{u.username}</span>
                    {u.full_name && u.full_name !== u.username && <span style={{ fontSize:11, color:'#3a3a3c' }}>{u.full_name}</span>}
                    {u.email && (
                      <a href={`mailto:${u.email}`} style={{ fontSize:11, color:'#0071e3', textDecoration:'none', display:'flex', alignItems:'center', gap:3 }}>✉️ {u.email}</a>
                    )}
                    {u.phone && (
                      <a href={`tel:${u.phone}`} style={{ fontSize:11, color:'#6e6e73', textDecoration:'none', display:'flex', alignItems:'center', gap:3 }}>📱 {u.phone}</a>
                    )}
                    {!u.quinielas?.length && <span style={{ fontSize:10, color:'#c7c7cc', fontStyle:'italic' }}>sin quinielas</span>}
                  </div>
                </div>

                {/* Quiniela rows */}
                {(u.quinielas||[]).slice().sort((a,b)=>a.name.localeCompare(b.name)).map((q, qi) =>
                  renderQRow(u, q, qi === (u.quinielas.length-1), false)
                )}
              </div>
            ))
            })()}
          </div>

          <div style={{ marginTop:12, fontSize:12, color:'#6e6e73', textAlign:'center' }}>
            Los cambios se guardan automáticamente · Solo visible para administradores
          </div>
        </div>
      )}

      {/* ══ TAB: RESULTADOS ══ */}
      {tab === 'results' && (
        <div>
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
                  const fixture = GROUP_FIXTURE[mid]
                  const hName = r.h_team || fixture?.[0] || '–'
                  const aName = r.a_team || fixture?.[1] || '–'
                  return (
                    <tr key={mid} style={{ borderBottom:'0.5px solid rgba(0,0,0,.05)' }}>
                      <td style={{ padding:'8px 12px', fontWeight:700, color:'#0071e3' }}>{mid}</td>
                      <td style={{ padding:'8px 12px', color:'#1d1d1f', fontSize:12, fontWeight:600 }}>{hName}</td>
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
                      <td style={{ padding:'8px 12px', color:'#1d1d1f', fontSize:12, fontWeight:600 }}>{aName}</td>
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
      {/* ══ TAB: PICKS (corrección manual) ══ */}
      {tab === 'picks' && (
        <div>
          <div style={{ marginBottom:12, fontSize:12, color:'#6e6e73' }}>
            Corrige picks individuales de una quiniela ya bloqueada (ej: usuarios que dejaron "0" por defecto sin querer). Esto solo guarda el pick en la base de datos — NO recalcula puntajes ni afecta la tabla de posiciones. Para que el cambio se refleje en la tabla, usa "Resultados → Actualizar" o el botón de recalcular cuando estés listo.
          </div>

          {incompleteQuinielas.length > 0 && (
            <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,.08)', borderRadius:10, overflow:'hidden', marginBottom:16, maxHeight:260, overflowY:'auto' }}>
              <div style={{ padding:'8px 12px', background:'#fff8e6', fontWeight:700, fontSize:12, color:'#7a5900', borderBottom:'0.5px solid rgba(0,0,0,.06)' }}>
                ⚠️ {incompleteQuinielas.length} quiniela(s) con picks de grupos incompletos
              </div>
              {incompleteQuinielas.map(q => (
                <div key={q.id} onClick={() => { setPickQuery(''); selectPickQuiniela(q) }}
                  style={{ padding:'8px 12px', cursor:'pointer', borderBottom:'0.5px solid rgba(0,0,0,.05)', fontSize:12 }}
                  onMouseOver={e => e.currentTarget.style.background='#f2f2f4'}
                  onMouseOut={e => e.currentTarget.style.background='transparent'}>
                  <strong>Q{String(q.seq_num).padStart(2,'0')}</strong> {q.name} <span style={{ color:'#aeaeb2' }}>· {q.username}</span>
                  <div style={{ marginTop:2, color:'#c0392b' }}>
                    {q.missing.join(', ')}
                  </div>
                </div>
              ))}
            </div>
          )}

          <input
            value={pickQuery}
            onChange={e => setPickQuery(e.target.value)}
            placeholder="Buscar quiniela por nombre, jugador o Q##..."
            style={{ width:'100%', maxWidth:400, padding:'8px 12px', border:'1px solid rgba(0,0,0,.14)', borderRadius:9, fontSize:13, fontFamily:'inherit', marginBottom:12 }}
          />

          {pickQuery && !pickQuiniela && (
            <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,.08)', borderRadius:10, overflow:'hidden', maxHeight:240, overflowY:'auto', marginBottom:16 }}>
              {users.flatMap(u => (u.quinielas||[]).map(q => ({ ...q, username: u.username })))
                .filter(q => {
                  const s = pickQuery.toLowerCase()
                  return q.name?.toLowerCase().includes(s) || q.username?.toLowerCase().includes(s) || `q${q.seq_num}`.includes(s)
                })
                .slice(0, 20)
                .map(q => (
                  <div key={q.id} onClick={() => selectPickQuiniela(q)}
                    style={{ padding:'8px 12px', cursor:'pointer', borderBottom:'0.5px solid rgba(0,0,0,.05)', fontSize:13 }}
                    onMouseOver={e => e.currentTarget.style.background='#f2f2f4'}
                    onMouseOut={e => e.currentTarget.style.background='transparent'}>
                    <strong>Q{String(q.seq_num).padStart(2,'0')}</strong> {q.name} <span style={{ color:'#aeaeb2', fontSize:11 }}>· {q.username}</span>
                  </div>
                ))}
            </div>
          )}

          {pickQuiniela && (
            <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,.08)', borderRadius:14, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,.06)' }}>
              <div style={{ padding:'10px 14px', background:'#f2f2f4', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <strong style={{ fontSize:13 }}>Q{String(pickQuiniela.seq_num).padStart(2,'0')} · {pickQuiniela.name}</strong>
                <button onClick={() => { setPickQuiniela(null); setPickValues({}); setPickQuery(''); setEditedMatches({}) }}
                  style={{ padding:'4px 10px', background:'#f2f2f4', border:'1px solid rgba(0,0,0,.1)', borderRadius:7, fontSize:12, cursor:'pointer' }}>
                  ✕ Cerrar
                </button>
              </div>

              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                <thead>
                  <tr style={{ background:'#f2f2f4' }}>
                    {['Partido','Local','Pick','Visitante'].map(h => (
                      <th key={h} style={{ padding:'6px 12px', fontWeight:600, fontSize:11, textTransform:'uppercase', letterSpacing:'.3px', color:'#6e6e73', textAlign:'left', borderBottom:'0.5px solid rgba(0,0,0,.08)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(GROUP_FIXTURE || {}).length > 0 ? Object.keys(GROUP_FIXTURE).map(mid => {
                    const fixture = GROUP_FIXTURE[mid]
                    const v = pickValues[mid] || {}
                    return (
                      <tr key={mid} style={{ borderBottom:'0.5px solid rgba(0,0,0,.05)' }}>
                        <td style={{ padding:'6px 12px', fontWeight:700, color:'#0071e3' }}>{mid}</td>
                        <td style={{ padding:'6px 12px', fontSize:12 }}>{fixture?.[0] || '–'}</td>
                        <td style={{ padding:'6px 12px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                            <input type="number" min={0} max={20}
                              value={v.h ?? ''}
                              onChange={e => updatePickValue(mid, 'h', e.target.value)}
                              style={{ width:38, height:30, border:'1px solid rgba(0,0,0,.14)', borderRadius:7, textAlign:'center', fontSize:13, fontWeight:700, fontFamily:'inherit' }}/>
                            <span style={{ color:'#aeaeb2', fontWeight:700 }}>–</span>
                            <input type="number" min={0} max={20}
                              value={v.a ?? ''}
                              onChange={e => updatePickValue(mid, 'a', e.target.value)}
                              style={{ width:38, height:30, border:'1px solid rgba(0,0,0,.14)', borderRadius:7, textAlign:'center', fontSize:13, fontWeight:700, fontFamily:'inherit' }}/>
                          </div>
                        </td>
                        <td style={{ padding:'6px 12px', fontSize:12 }}>{fixture?.[1] || '–'}</td>
                      </tr>
                    )
                  }) : (
                    <tr><td colSpan={4} style={{ padding:16, textAlign:'center', color:'#aeaeb2' }}>No hay catálogo de partidos disponible</td></tr>
                  )}
                </tbody>
              </table>

              <div style={{ padding:12, display:'flex', justifyContent:'flex-end' }}>
                <button onClick={savePickEdits} disabled={savingPicks}
                  style={{ padding:'8px 16px', background:'#0071e3', color:'#fff', border:'none', borderRadius:9, fontWeight:600, cursor:'pointer', fontSize:13, opacity:savingPicks?.5:1 }}>
                  {savingPicks ? '⏳ Guardando...' : '💾 Guardar pick (sin recalcular)'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}



    </div>
  )
}
