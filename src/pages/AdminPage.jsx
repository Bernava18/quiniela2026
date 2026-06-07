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

// ── Helper: carga script dinámico ────────────────────────────────
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return }
    const s = document.createElement('script')
    s.src = src; s.onload = resolve; s.onerror = reject
    document.head.appendChild(s)
  })
}

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
  const [downloading, setDownloading] = useState(false)
  const [dlProgress, setDlProgress] = useState('')
  const [allPicksData, setAllPicksData] = useState([])

  useEffect(() => { loadUsers(); loadResults() }, [])

  async function loadUsers() {
    setLoadingUsers(true)
    const { data } = await supabase
      .from('profiles')
      .select(`
        id, username, full_name, phone, has_paid, paid_at,
        quinielas (
          id, name, is_locked,
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

  // Carga picks completos de todas las quinielas para el PDF batch
  async function loadAllPicks() {
    const { data } = await supabase
      .from('profiles')
      .select(`
        id, username, full_name,
        quinielas (
          id, name, created_at, is_locked,
          picks ( match_id, goals_home, goals_away, winner, h_team, a_team )
        )
      `)
      .order('username')
    setAllPicksData(data || [])
    return data || []
  }

  async function downloadAllPDFs() {
    setDownloading(true)
    setDlProgress('Cargando datos...')
    try {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js')
      const { jsPDF } = window.jspdf

      const profilesData = await loadAllPicks()
      const withQ = profilesData.filter(p => p.quinielas?.length > 0)
      if (!withQ.length) { alert('No hay quinielas registradas.'); setDownloading(false); return }

      const GROUPS_DATA = {
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
      const ELIM_LABELS = {
        M73:'R32',M74:'R32',M75:'R32',M76:'R32',M77:'R32',M78:'R32',M79:'R32',M80:'R32',
        M81:'R32',M82:'R32',M83:'R32',M84:'R32',M85:'R32',M86:'R32',M87:'R32',M88:'R32',
        M89:'Octavos',M90:'Octavos',M91:'Octavos',M92:'Octavos',
        M93:'Octavos',M94:'Octavos',M95:'Octavos',M96:'Octavos',
        M97:'Cuartos',M98:'Cuartos',M99:'Cuartos',M100:'Cuartos',
        M101:'Semis',M102:'Semis',M103:'3er Puesto',M104:'Gran Final',
      }

      // Generar HTML completo con todas las quinielas
      const fecha = new Date().toLocaleDateString('es-ES',{day:'numeric',month:'long',year:'numeric'})
      const totalQ = withQ.reduce((s,p)=>s+p.quinielas.length,0)

      let htmlBody = `
        <div style="text-align:center;padding:60px 40px;background:linear-gradient(135deg,#0055d4,#003a9e);color:#fff;page-break-after:always">
          <div style="font-size:56px;margin-bottom:16px">🏆</div>
          <h1 style="font-size:32px;font-weight:900;margin-bottom:10px">Quiniela Mundial FIFA 2026</h1>
          <p style="font-size:15px;opacity:.8;margin-bottom:6px">Respaldo oficial de todas las quinielas</p>
          <p style="font-size:14px;font-weight:700">${withQ.length} participantes · ${totalQ} quinielas</p>
          <p style="font-size:12px;opacity:.6;margin-top:20px">Generado el ${fecha} · quiniela2026panas.netlify.app</p>
        </div>`

      for (const prof of withQ) {
        for (const q of prof.quinielas) {
          setDlProgress(`Preparando: ${prof.username} · ${q.name}`)
          const pm = {}
          q.picks?.forEach(p => { pm[p.match_id] = p })

          // Tabla de grupos
          let gruposHTML = ''
          for (const [g, teams] of Object.entries(GROUPS_DATA)) {
            const ms = [
              {id:`${g}1`,h:teams[0],a:teams[1]},{id:`${g}2`,h:teams[2],a:teams[3]},
              {id:`${g}3`,h:teams[0],a:teams[2]},{id:`${g}4`,h:teams[3],a:teams[1]},
              {id:`${g}5`,h:teams[3],a:teams[0]},{id:`${g}6`,h:teams[1],a:teams[2]},
            ]
            const rows = ms.map(m => {
              const pk = pm[m.id]
              const pick = pk?.goals_home != null
                ? `<b style="color:#0055d4;font-size:13px">${pk.goals_home}–${pk.goals_away}</b>`
                : `<span style="color:#ccc;font-style:italic">–</span>`
              return `<tr style="border-bottom:0.5px solid #f0f0f0">
                <td style="padding:3px 6px;color:#888;font-size:9px">${m.id}</td>
                <td style="padding:3px 6px;font-size:10px">${m.h}</td>
                <td style="padding:3px 6px;text-align:center">${pick}</td>
                <td style="padding:3px 6px;font-size:10px;text-align:right">${m.a}</td>
              </tr>`
            }).join('')
            gruposHTML += `
              <div style="margin-bottom:8px;break-inside:avoid">
                <div style="background:#0055d4;color:#fff;padding:4px 10px;font-weight:800;font-size:11px;border-radius:4px 4px 0 0">
                  GRUPO ${g} — ${teams.join(' · ')}
                </div>
                <table style="width:100%;border-collapse:collapse;border:1px solid #e5e5e5;border-top:none">
                  <thead><tr style="background:#f5f5f5">
                    <th style="padding:3px 6px;font-size:8px;color:#999;font-weight:700;text-align:left">ID</th>
                    <th style="padding:3px 6px;font-size:8px;color:#999;font-weight:700;text-align:left">Local</th>
                    <th style="padding:3px 6px;font-size:8px;color:#0055d4;font-weight:700;text-align:center">PICK</th>
                    <th style="padding:3px 6px;font-size:8px;color:#999;font-weight:700;text-align:right">Visitante</th>
                  </tr></thead>
                  <tbody>${rows}</tbody>
                </table>
              </div>`
          }

          // Tabla eliminatorias
          const elimIds = ['M73','M74','M75','M76','M77','M78','M79','M80','M81','M82','M83','M84','M85','M86','M87','M88','M89','M90','M91','M92','M93','M94','M95','M96','M97','M98','M99','M100','M101','M102','M103','M104']
          const elimRows = elimIds.map(mid => {
            const pk = pm[mid]
            if (!pk) return ''
            const pick = pk.goals_home != null
              ? `<b style="color:#d97706">${pk.goals_home}–${pk.goals_away}</b>` : '–'
            const win = pk.winner ? `<b style="color:#15803d">${pk.winner}</b>` : '–'
            return `<tr style="border-bottom:0.5px solid #f0f0f0">
              <td style="padding:3px 6px;color:#888;font-size:9px">${mid}</td>
              <td style="padding:3px 6px;font-size:9px;color:#666">${ELIM_LABELS[mid]||mid}</td>
              <td style="padding:3px 6px;text-align:center">${pick}</td>
              <td style="padding:3px 6px;font-size:10px">${win}</td>
            </tr>`
          }).filter(Boolean).join('')

          const picksCount = q.picks?.filter(p=>p.goals_home!=null).length || 0

          htmlBody += `
          <div style="page-break-before:always;padding:18px 20px;font-family:Arial,sans-serif">
            <div style="background:linear-gradient(135deg,#0055d4,#003a9e);color:#fff;padding:12px 18px;border-radius:10px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center">
              <div>
                <div style="font-size:18px;font-weight:900">👤 ${prof.username}${prof.full_name?' · '+prof.full_name:''}</div>
                <div style="font-size:11px;opacity:.8;margin-top:2px">📋 ${q.name} · ${picksCount}/104 picks</div>
              </div>
              <div style="text-align:right;font-size:11px;opacity:.7">${fecha}</div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px">
              ${gruposHTML}
            </div>
            <div style="border-top:2px solid #d97706;padding-top:10px">
              <div style="font-weight:800;font-size:12px;color:#d97706;margin-bottom:8px">⚡ Fase Eliminatoria</div>
              <table style="width:100%;border-collapse:collapse;border:1px solid #e5e5e5">
                <thead><tr style="background:#fffbeb">
                  <th style="padding:4px 8px;font-size:8px;color:#999;font-weight:700;text-align:left">ID</th>
                  <th style="padding:4px 8px;font-size:8px;color:#999;font-weight:700;text-align:left">Fase</th>
                  <th style="padding:4px 8px;font-size:8px;color:#d97706;font-weight:700;text-align:center">PICK</th>
                  <th style="padding:4px 8px;font-size:8px;color:#999;font-weight:700;text-align:left">Equipo avanza</th>
                </tr></thead>
                <tbody>${elimRows}</tbody>
              </table>
            </div>
            <div style="margin-top:10px;padding-top:8px;border-top:0.5px solid #e5e5e5;display:flex;justify-content:space-between;font-size:8px;color:#999">
              <span>🏆 Quiniela Mundial FIFA 2026 · ${prof.username} · ${q.name}</span>
              <span>quiniela2026panas.netlify.app</span>
            </div>
          </div>`
        }
      }

      // Abrir en ventana nueva para imprimir/guardar
      setDlProgress('Abriendo PDF...')
      const win = window.open('', '_blank')
      win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
        <title>Quinielas Mundial 2026 - ${fecha}</title>
        <style>
          *{box-sizing:border-box;margin:0;padding:0}
          body{font-family:Arial,sans-serif;font-size:11px;color:#111;background:#fff}
          @media print{
            @page{margin:.8cm;size:A4 portrait}
            body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
          }
        </style>
      </head><body>${htmlBody}</body></html>`)
      win.document.close()
      await new Promise(r => setTimeout(r, 800))
      win.print()

      setDlProgress('')
    } catch(e) {
      console.error(e)
      alert('Error: ' + e.message)
      setDlProgress('')
    }
    setDownloading(false)
  }

  async function togglePayment(userId, currentPaid) {
    setSaving(userId)
    const { error } = await supabase
      .from('profiles')
      .update({
        has_paid: !currentPaid,
        paid_at:  !currentPaid ? new Date().toISOString() : null,
        paid_by:  !currentPaid ? adminProfile.id : null,
      })
      .eq('id', userId)
    if (!error) {
      setMsg(!currentPaid ? '✓ Pago confirmado' : '✓ Pago removido')
      loadUsers()
    }
    setSaving(null)
    setTimeout(() => setMsg(''), 2000)
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
  const paidUsers    = users.filter(u => u.has_paid)
  const unpaidUsers  = users.filter(u => !u.has_paid)
  const totalPaid    = paidUsers.length * ENTRY_FEE
  const prize1st     = Math.floor(totalPaid * 0.60)
  const prize2nd     = Math.floor(totalPaid * 0.20)
  const prize3rd     = Math.floor(totalPaid * 0.10)
  const prizeOrg     = Math.floor(totalPaid * 0.10)

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
        <button style={tabStyle('pdfs')}    onClick={() => setTab('pdfs')}>📄 PDFs</button>
      </div>

      {/* ══ TAB: PAGOS ══ */}
      {tab === 'payments' && (
        <div>
          {/* Prize summary */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:10, marginBottom:20 }}>
            {[
              ['👥 Pagados',    `${paidUsers.length} / ${users.length}`, '#30d158'],
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

          {/* Users table */}
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,.08)', borderRadius:14, overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 80px 80px 100px 120px', padding:'8px 16px', background:'#f9f9fb', borderBottom:'0.5px solid rgba(0,0,0,.08)', gap:8 }}>
              {['Participante','Quinielas','Picks','Puntos','Pago ($15)'].map(h => (
                <span key={h} style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.4px', color:'#6e6e73' }}>{h}</span>
              ))}
            </div>

            {loadingUsers ? (
              <div style={{ padding:32, textAlign:'center', color:'#aeaeb2' }}>Cargando...</div>
            ) : users.map(u => {
              const totalPicks = u.quinielas?.reduce((s,q) => s + (q.picks?.filter(p=>p.goals_home!=null).length||0), 0) || 0
              const totalPicksMax = (u.quinielas?.length || 0) * 104
              const pts = u.quinielas?.reduce((s,q) => s + (q.scores?.[0]?.total_pts || 0), 0) ?? 0

              return (
                <div key={u.id} style={{ display:'grid', gridTemplateColumns:'1fr 80px 80px 100px 120px', padding:'11px 16px', borderBottom:'0.5px solid rgba(0,0,0,.04)', alignItems:'center', gap:8, background: u.has_paid ? 'rgba(48,209,88,.02)' : 'rgba(255,69,58,.02)' }}>

                  <div>
                    <div style={{ fontWeight:700, fontSize:14 }}>{u.username}</div>
                    {u.full_name && <div style={{ fontSize:11, color:'#aeaeb2' }}>{u.full_name}</div>}
                    {u.has_paid && u.paid_at && (
                      <div style={{ fontSize:10, color:'#30d158', marginTop:2 }}>
                        ✓ Pagado el {new Date(u.paid_at).toLocaleDateString('es-ES',{day:'numeric',month:'short'})}
                      </div>
                    )}
                  </div>

                  <div style={{ fontSize:13, fontWeight:600, color:'#6e6e73', textAlign:'center' }}>
                    {u.quinielas?.length || 0}
                  </div>

                  <div style={{ textAlign:'center' }}>
                    <span style={{ fontSize:12, fontWeight:700, color: totalPicks===totalPicksMax?'#30d158':totalPicks>0?'#ff9f0a':'#aeaeb2' }}>
                      {totalPicks}
                    </span>
                    <span style={{ fontSize:10, color:'#aeaeb2' }}>/{totalPicksMax}</span>
                  </div>

                  <div style={{ textAlign:'center' }}>
                    <span style={{ fontSize:14, fontWeight:800, color:'#0071e3' }}>{pts} pts</span>
                  </div>

                  <div style={{ textAlign:'center' }}>
                    <button
                      onClick={() => togglePayment(u.id, u.has_paid)}
                      disabled={saving === u.id}
                      style={{
                        padding:'6px 14px', border:'none', borderRadius:8,
                        fontWeight:700, cursor:'pointer', fontSize:12, fontFamily:'inherit',
                        background: u.has_paid ? 'rgba(48,209,88,.15)' : 'rgba(255,69,58,.1)',
                        color: u.has_paid ? '#1a7a38' : '#c0392b',
                        opacity: saving===u.id ? .5 : 1,
                      }}>
                      {saving===u.id ? '...' : u.has_paid ? '✅ Pagado' : '⬜ Sin pagar'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ marginTop:12, fontSize:12, color:'#6e6e73', textAlign:'center' }}>
            Click en el botón de pago para confirmar o revertir · Solo visible para administradores
          </div>
        </div>
      )}

      {/* ══ TAB: PDFs ══ */}
      {tab === 'pdfs' && (
        <div>
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,.08)', borderRadius:14,
            padding:'32px 24px', boxShadow:'0 1px 4px rgba(0,0,0,.06)', textAlign:'center' }}>
            <div style={{ fontSize:48, marginBottom:12 }}>📄</div>
            <h2 style={{ fontSize:20, fontWeight:800, marginBottom:8 }}>Descargar todas las quinielas</h2>
            <p style={{ fontSize:13, color:'#6e6e73', marginBottom:24, maxWidth:480, margin:'0 auto 24px' }}>
              Genera un PDF con una página por cada quiniela registrada. Ideal para el respaldo previo al inicio del Mundial.
            </p>

            {/* Stats */}
            <div style={{ display:'flex', justifyContent:'center', gap:24, marginBottom:28, flexWrap:'wrap' }}>
              {[
                ['👥', users.length, 'Participantes'],
                ['📋', users.reduce((s,u)=>s+(u.quinielas?.length||0),0), 'Quinielas'],
                ['💰', users.filter(u=>u.has_paid).length, 'Pagados'],
              ].map(([icon,val,label])=>(
                <div key={label} style={{ textAlign:'center' }}>
                  <div style={{ fontSize:24, fontWeight:900, color:'#0071e3' }}>{icon} {val}</div>
                  <div style={{ fontSize:11, color:'#6e6e73' }}>{label}</div>
                </div>
              ))}
            </div>

            {dlProgress && (
              <div style={{ background:'rgba(0,113,227,.06)', border:'1px solid rgba(0,113,227,.2)',
                borderRadius:10, padding:'12px 20px', marginBottom:20, fontSize:13,
                color:'#0071e3', fontWeight:600 }}>
                ⏳ {dlProgress}
              </div>
            )}

            <button onClick={downloadAllPDFs} disabled={downloading}
              style={{ padding:'14px 32px', background: downloading?'#6e6e73':'#0071e3',
                color:'#fff', border:'none', borderRadius:12, fontWeight:700, fontSize:15,
                cursor: downloading?'wait':'pointer', fontFamily:'inherit',
                boxShadow: downloading?'none':'0 4px 16px rgba(0,113,227,.3)',
                display:'inline-flex', alignItems:'center', gap:10 }}>
              {downloading
                ? <><span style={{ display:'inline-block', width:16, height:16,
                    border:'2px solid #fff', borderTopColor:'transparent',
                    borderRadius:'50%', animation:'spin .7s linear infinite' }}/> Generando...</>
                : '⬇️ Descargar PDF de todas las quinielas'}
            </button>

            <p style={{ fontSize:11, color:'#aeaeb2', marginTop:16 }}>
              El proceso puede tomar 1-2 minutos dependiendo del número de quinielas.
            </p>
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
