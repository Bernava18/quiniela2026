import { useEffect, useState, useRef } from 'react'
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
  const [printing, setPrinting] = useState(false)
  const [printProgress, setPrintProgress] = useState('')

  useEffect(() => { loadUsers(); loadResults() }, [])

  async function loadUsers() {
    setLoadingUsers(true)
    const { data } = await supabase
      .from('profiles_with_email')
      .select(`
        id, username, full_name, phone, email, has_paid, paid_at,
        quinielas (
          id, name, seq_num, is_locked, payment_status, payment_method, payment_ref,
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

  async function togglePayment(quinielaId, currentStatus) {
    setSaving(quinielaId)
    // Cycle: unpaid → committed → paid → unpaid
    const next = currentStatus === 'unpaid' ? 'committed'
               : currentStatus === 'committed' ? 'paid' : 'unpaid'
    const { error } = await supabase
      .from('quinielas')
      .update({
        payment_status: next,
        has_paid: next === 'paid',
        paid_at: next === 'paid' ? new Date().toISOString() : null,
      })
      .eq('id', quinielaId)
    if (!error) {
      const msgs = { committed:'🤝 Comprometido', paid:'✅ Pago confirmado', unpaid:'⬜ Pago removido' }
      setMsg(msgs[next])
      loadUsers()
    }
    setSaving(null)
    setTimeout(() => setMsg(''), 2500)
  }

  async function savePaymentMethod(quinielaId, method) {
    await supabase.from('quinielas').update({ payment_method: method }).eq('id', quinielaId)
    loadUsers()
  }

  async function savePaymentRef(quinielaId, ref) {
    await supabase.from('quinielas').update({ payment_ref: ref }).eq('id', quinielaId)
    loadUsers()
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
  // Contar quinielas — pagadas + comprometidas suman al premio
  const allQuinielas       = users.flatMap(u => (u.quinielas||[]).map(q => ({ ...q, userId: u.id })))
  const paidQuinielas      = allQuinielas.filter(q => q.payment_status === 'paid')
  const committedQuinielas = allQuinielas.filter(q => q.payment_status === 'committed')
  const confirmedAndCommitted = allQuinielas.filter(q => q.payment_status === 'paid' || q.payment_status === 'committed')
  const paidUsers          = users.filter(u => u.has_paid)
  const unpaidUsers        = users.filter(u => !u.has_paid)
  const totalPaid          = confirmedAndCommitted.length * ENTRY_FEE
  const prize1st       = Math.floor(totalPaid * 0.60)
  const prize2nd       = Math.floor(totalPaid * 0.20)
  const prize3rd       = Math.floor(totalPaid * 0.10)
  const prizeOrg       = Math.floor(totalPaid * 0.10)

  // ── Imprimir todas las quinielas ──────────────────────────────
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
      if (!allQ.length) { alert('No hay quinielas.'); setPrinting(false); return }

      let pdf = null
      const fecha = new Date().toISOString().slice(0,10)

      for (let i = 0; i < allQ.length; i++) {
        const q = allQ[i]
        setPrintProgress(`Capturando ${i+1}/${allQ.length}: ${q.username} · ${q.name}`)

        // Abrir /print/:id en iframe oculto y capturar
        const captured = await captureQuinielaPrint(q.id)
        if (!captured) continue

        const { grupos, bracket } = captured

        // Página grupos — portrait
        const pW1 = 210, pH1 = Math.round((grupos.height/grupos.width)*pW1)
        if (!pdf) {
          pdf = new jsPDF({ orientation:'portrait', unit:'mm', format:[pW1,pH1] })
        } else {
          pdf.addPage([pW1,pH1],'portrait')
        }
        pdf.addImage(grupos.img,'JPEG',0,0,pW1,pH1)

        // Página bracket — landscape
        const pW2 = Math.max(297, Math.round(bracket.width/3.78))
        const pH2 = Math.round((bracket.height/bracket.width)*pW2)
        pdf.addPage([pW2,pH2], pW2>pH2?'landscape':'portrait')
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
          await new Promise(r => setTimeout(r, 2000)) // wait for React render
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
            <button onClick={printAllQuinielas} disabled={printing}
              style={{ padding:'8px 16px', background:'#6e6e73', color:'#fff', border:'none', borderRadius:9, fontWeight:600, cursor:'pointer', fontSize:13, opacity:printing?.5:1, display:'flex', alignItems:'center', gap:6 }}>
              {printing ? `⏳ ${printProgress||'Procesando...'}` : '🖨️ Imprimir todas'}
            </button>
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
              ['📋 Pagadas + Comprometidas', `${confirmedAndCommitted.length} / ${allQuinielas.length}`, '#30d158'],
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

          {/* Users table — grouped, numbered */}
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,.08)', borderRadius:14, overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>
            {/* Header */}
            <div style={{ display:'grid', gridTemplateColumns:'36px 1fr 90px 90px 44px 110px 160px 130px', padding:'8px 16px', background:'#f9f9fb', borderBottom:'0.5px solid rgba(0,0,0,.08)', gap:8 }}>
              {['#','Quiniela','Picks','Puntos','PDF','Método','Ref / Datos pago','Estado pago'].map((h,i) => (
                <span key={h} style={{ fontSize:9.5, fontWeight:700, textTransform:'uppercase', letterSpacing:'.4px', color:'#aeaeb2', textAlign: i===0?'center':'left' }}>{h}</span>
              ))}
            </div>

            {loadingUsers ? (
              <div style={{ padding:32, textAlign:'center', color:'#aeaeb2' }}>Cargando...</div>
            ) : users.map((u, ui) => (
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

                {/* Quiniela rows — sorted by name */}
                {(u.quinielas||[]).slice().sort((a,b)=>a.name.localeCompare(b.name)).map((q, qi) => {
                  const qPicks = q.picks?.filter(p=>p.goals_home!=null).length || 0
                  const qPts   = q.scores?.[0]?.total_pts || 0
                  const isLast = qi === (u.quinielas.length-1)
                  return (
                    <div key={q.id} style={{ display:'grid', gridTemplateColumns:'36px 1fr 90px 90px 44px 110px 160px 130px', padding:'9px 16px', gap:8, alignItems:'center', background: u.has_paid?'rgba(48,209,88,.02)':'#fff', borderBottom: isLast?'none':`0.5px solid rgba(0,0,0,.04)` }}>
                      <div style={{ display:'flex', justifyContent:'center' }}>
                        <div style={{ width:14, height:14, borderLeft:'1.5px solid #d1d1d6', borderBottom:'1.5px solid #d1d1d6', borderRadius:'0 0 0 5px', marginTop:-6 }}/>
                      </div>
                      {/* Name + ID */}
                      <div>
                        <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:2 }}>
                          <span style={{ fontSize:10, fontWeight:800, color:'#fff', borderRadius:5, padding:'1px 6px', letterSpacing:'.3px',
                            background: q.payment_status==='paid'?'#0071e3':q.payment_status==='committed'?'#ff9f0a':'#aeaeb2' }}>
                            Q{String(q.seq_num||0).padStart(2,'0')}
                          </span>
                          <span style={{ fontSize:12.5, fontWeight:700, color:'#1d1d1f' }}>📋 {q.name}</span>
                        </div>
                        {q.payment_status==='paid' && u.paid_at && (
                          <div style={{ fontSize:10, color:'#30d158', fontWeight:600 }}>✓ Pagado el {new Date(u.paid_at).toLocaleDateString('es-ES',{day:'numeric',month:'short'})}</div>
                        )}
                        {q.payment_status==='committed' && (
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
                      {/* Method */}
                      <div>
                        <select value={q.payment_method||''} onChange={e=>savePaymentMethod(q.id, e.target.value)}
                          style={{ fontSize:10, fontFamily:'inherit', border:'0.5px solid #d1d1d6', borderRadius:6, padding:'4px 5px', background:'#fff', cursor:'pointer', width:'100%' }}>
                          <option value="">— Método —</option>
                          <option value="zelle">🏦 Zelle</option>
                          <option value="transfer_usd">💱 Transfer $</option>
                          <option value="transfer_bs">🇻🇪 Transfer Bs</option>
                          <option value="cash_usd">💵 $ Efectivo</option>
                        </select>
                      </div>
                      {/* Ref / Payment data */}
                      <div>
                        <input
                          defaultValue={q.payment_ref||''}
                          onBlur={e=>{ if(e.target.value !== (q.payment_ref||'')) savePaymentRef(q.id, e.target.value) }}
                          placeholder="Ref., nombre, confirmación..."
                          style={{ fontSize:10, fontFamily:'inherit', border:'0.5px solid #d1d1d6', borderRadius:6, padding:'4px 7px', outline:'none', width:'100%', color:'#1d1d1f', boxSizing:'border-box',
                            background: q.payment_ref ? 'rgba(48,209,88,.06)' : '#fff' }}
                        />
                      </div>
                      {/* Payment cycle button */}
                      <div style={{ textAlign:'center' }}>
                        <button onClick={() => togglePayment(q.id, q.payment_status||'unpaid')} disabled={saving===q.id}
                          style={{ padding:'6px 12px', border:'none', borderRadius:8, fontWeight:700, cursor:'pointer', fontSize:11, fontFamily:'inherit', opacity:saving===q.id?.5:1,
                            background: q.payment_status==='paid'?'rgba(48,209,88,.15)':q.payment_status==='committed'?'rgba(255,159,10,.15)':'rgba(255,69,58,.08)',
                            color: q.payment_status==='paid'?'#1a7a38':q.payment_status==='committed'?'#b06000':'#c0392b' }}>
                          {saving===q.id?'...':q.payment_status==='paid'?'✅ Pagado':q.payment_status==='committed'?'🤝 Comprometido':'⬜ Sin pagar'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
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
