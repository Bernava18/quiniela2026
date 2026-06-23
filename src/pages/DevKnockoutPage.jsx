import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  supabase,
  devListQuinielas,
  devGetGroupPicks,
  devGetKoTestPicks,
  devSaveKoTestPick,
  devResetKoTest,
} from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// El MISMO HTML corregido que usa producción, pero aquí en modo PRUEBA.
// Colócalo en /public con este nombre (o reusa quiniela2026_fixed.html si ya
// lo reemplazaste por la versión corregida).
const QUINIELA_HTML_URL = '/quiniela2026_corrected.html'

// ════════════════════════════════════════════════════════════════
//  SECCIÓN DE PRUEBA (oculta, solo admin)
//  · Toma una quiniela real → LEE solo su fase de grupos (no la modifica)
//  · Los picks de eliminatorias se guardan en 'picks_ko_test' (aislada)
//  · NO toca 'picks', 'scores', ni el leaderboard
// ════════════════════════════════════════════════════════════════
export default function DevKnockoutPage() {
  const { user, profile } = useAuth()
  const navigate          = useNavigate()
  const iframeRef         = useRef(null)

  const [quinielas, setQuinielas]     = useState([])
  const [selectedId, setSelectedId]   = useState('')
  const [selectedQ, setSelectedQ]     = useState(null)
  const [iframeReady, setIframeReady] = useState(false)
  const [loading, setLoading]         = useState(false)
  const [msg, setMsg]                 = useState('')
  const [savedCount, setSavedCount]   = useState(0)

  // Cargar lista de quinielas para elegir caso de prueba
  useEffect(() => {
    devListQuinielas().then(({ data }) => setQuinielas(data))
  }, [])

  // Recibir mensajes del iframe
  useEffect(() => {
    const handler = async (e) => {
      const { type, quinielaId: qid, matchId, pick } = e.data || {}
      if (type === 'IFRAME_READY') setIframeReady(true)

      if (type === 'SAVE_PICK' && qid && matchId && pick) {
        // AISLAMIENTO: solo guardamos ELIMINATORIAS (M73-M104) en picks_ko_test.
        // Los picks de grupos (A1..L6) se IGNORAN: son solo lectura, no se tocan.
        const m = /^M(\d+)$/.exec(matchId)
        const isKO = m && +m[1] >= 73 && +m[1] <= 104
        if (!isKO) return
        const err = await devSaveKoTestPick(qid, matchId, pick)
        if (err) { setMsg('❌ Error guardando: ' + (err.message || err)) }
        else { setSavedCount(c => c + 1); setMsg('✓ Pick de prueba guardado: ' + matchId) }
        setTimeout(() => setMsg(''), 2500)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  // Cuando el iframe está listo y hay quiniela elegida → inyectar datos
  useEffect(() => {
    if (iframeReady && selectedQ) sendInitToIframe()
    // eslint-disable-next-line
  }, [iframeReady, selectedQ])

  async function selectQuiniela(id) {
    if (!id) { setSelectedId(''); setSelectedQ(null); return }
    setLoading(true)
    setSelectedId(id)
    const q = quinielas.find(x => x.id === id) || null
    setSelectedQ(q)
    setLoading(false)
  }

  async function sendInitToIframe() {
    // LEE grupos de la quiniela real (solo lectura) + picks de prueba ya guardados
    const [groupPicks, koTestPicks] = await Promise.all([
      devGetGroupPicks(selectedId),
      devGetKoTestPicks(selectedId),
    ])
    // Combinamos: grupos (de la quiniela real) + eliminatorias (de prueba)
    const picks = { ...groupPicks, ...koTestPicks }

    // En PRUEBA no usamos resultados reales del bracket (aún no hay).
    // El bracket se arma a partir de los picks de grupos del usuario.
    iframeRef.current?.contentWindow?.postMessage({
      type: 'INIT',
      data: {
        quinielaId: selectedId,
        isLocked: false,           // en prueba siempre editable
        testMode: true,            // bloquea edición de GRUPOS (solo lectura), KO editable
        username: (selectedQ?.profiles?.username || 'PRUEBA'),
        picks,
        results: {},               // sin resultados reales en modo prueba
      }
    }, '*')
  }

  async function resetTest() {
    if (!selectedId) return
    if (!confirm('¿Borrar TODOS los picks de prueba de esta quiniela? (no afecta la quiniela real)')) return
    await devResetKoTest(selectedId)
    setSavedCount(0)
    setMsg('🗑️ Picks de prueba reiniciados')
    // recargar el iframe para reflejar el reinicio
    setIframeReady(false)
    if (iframeRef.current) iframeRef.current.src = QUINIELA_HTML_URL + '?t=' + Date.now()
    setTimeout(() => setMsg(''), 2500)
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 52px)' }}>
      {/* Banner de advertencia: estás en modo prueba */}
      <div style={{ background:'#1a1a2e', color:'#ffd60a', padding:'8px 20px', fontSize:13,
        fontWeight:700, display:'flex', alignItems:'center', gap:10, flexShrink:0,
        borderBottom:'2px solid #ffd60a' }}>
        🧪 MODO PRUEBA (oculto · solo admin) — La fase nueva se guarda en
        <code style={{ background:'rgba(255,255,255,.1)', padding:'1px 6px', borderRadius:4 }}>picks_ko_test</code>.
        La quiniela real NO se modifica.
      </div>

      {/* Barra de control */}
      <div style={{ background:'#fff', borderBottom:'0.5px solid rgba(0,0,0,.08)', padding:'10px 20px',
        display:'flex', alignItems:'center', gap:14, flexShrink:0, flexWrap:'wrap' }}>
        <button onClick={() => navigate('/admin')}
          style={{ border:'none', background:'none', cursor:'pointer', color:'#6e6e73', fontSize:13, padding:0 }}>
          ← Volver a Admin
        </button>
        <span style={{ color:'#e0e0e0' }}>|</span>

        <label style={{ fontSize:13, fontWeight:600, color:'#1d1d1f' }}>Quiniela de prueba:</label>
        <select value={selectedId} onChange={e => selectQuiniela(e.target.value)}
          style={{ padding:'7px 10px', borderRadius:8, border:'0.5px solid rgba(0,0,0,.15)',
            fontSize:13, minWidth:240, background:'#fff', cursor:'pointer' }}>
          <option value="">— Elegir una quiniela —</option>
          {quinielas.map(q => (
            <option key={q.id} value={q.id}>
              {q.name} {q.profiles?.username ? `· ${q.profiles.username}` : ''}
            </option>
          ))}
        </select>

        {selectedId && (
          <>
            <span style={{ fontSize:12, color:'#6e6e73' }}>
              {savedCount > 0 ? `${savedCount} picks de prueba guardados` : 'sin picks de prueba aún'}
            </span>
            <button onClick={resetTest}
              style={{ padding:'6px 12px', border:'0.5px solid rgba(255,69,58,.3)', borderRadius:8,
                background:'#fff', color:'#ff453a', cursor:'pointer', fontSize:13 }}>
              🗑️ Reiniciar prueba
            </button>
          </>
        )}

        {msg && <span style={{ fontSize:13, color:'#0071e3', fontWeight:600, marginLeft:'auto' }}>{msg}</span>}
      </div>

      {/* Área del bracket */}
      {!selectedId && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%',
          color:'#aeaeb2', fontSize:14, flexDirection:'column', gap:8 }}>
          <div style={{ fontSize:32 }}>🧪</div>
          <div>Elige una quiniela arriba para probar la fase de eliminatorias corregida.</div>
          <div style={{ fontSize:12, color:'#c7c7cc' }}>
            Se leerán sus picks de grupos (sin modificarlos) y podrás hacer picks de eliminatorias de prueba.
          </div>
        </div>
      )}

      {selectedId && !iframeReady && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'#aeaeb2', fontSize:14 }}>
          ⚽ Cargando interfaz de prueba...
        </div>
      )}

      {selectedId && (
        <iframe
          ref={iframeRef}
          src={QUINIELA_HTML_URL}
          style={{ flex:1, border:'none', width:'100%', display: iframeReady ? 'block' : 'none' }}
          title="Prueba — Bracket corregido Mundial 2026"
        />
      )}
    </div>
  )
}
