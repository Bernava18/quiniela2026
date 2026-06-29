import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  supabase, savePick, getQuinielaPicks, getAllResults,
  devGetGroupPicks, devGetKoTestPicks, devSaveKoTestPick, devImportR32,
} from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const QUINIELA_HTML_URL   = '/quiniela2026_fixed.html'        // bracket original (sin cambios)
const QUINIELA_HTML_FINAL = '/quiniela2026_fasefinal.html'    // FASE FINAL con equipos reales

export default function QuinielaPage() {
  const { id: quinielaId } = useParams()
  const { user, profile }  = useAuth()
  const navigate           = useNavigate()
  const iframeRef          = useRef(null)

  const [quiniela, setQuiniela]       = useState(null)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [iframeReady, setIframeReady] = useState(false)
  const [totalPts, setTotalPts]       = useState(0)
  const [filledPicks, setFilledPicks] = useState(0)

  // Esta vista muestra SIEMPRE la quiniela original (solo lectura). La fase
  // final se ve por su propio acceso, no desde aquí.
  const [view, setView]   = useState('normal')
  const [msg, setMsg]     = useState('')
  const importedRef       = useRef(false)  // evita reimportar 16avos en cada render

  useEffect(() => { if (user) load() }, [quinielaId, user])

  useEffect(() => {
    const handler = async (e) => {
      const { type, quinielaId: qid, matchId, pick, total } = e.data || {}
      if (type === 'IFRAME_READY') setIframeReady(true)

      if (type === 'SAVE_PICK' && qid && matchId && pick) {
        if (view === 'final') {
          // Fase Final: 16avos en adelante (M73-M104) van a picks_ko_test.
          const m = /^M(\d+)$/.exec(matchId)
          const isEditableKO = m && +m[1] >= 73 && +m[1] <= 104
          if (!isEditableKO) return
          await devSaveKoTestPick(qid, matchId, pick)
        }
        // En vista 'normal' (Quiniela Original) NO se guarda nada: es solo lectura.
      }
      if (type === 'PTS_UPDATE') setTotalPts(total || 0)
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [view])

  useEffect(() => {
    if (iframeReady && quiniela) sendInitToIframe()
    // eslint-disable-next-line
  }, [iframeReady, quiniela, view])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const { data: q, error: qErr } = await supabase
        .from('quinielas')
        .select('*, profiles!quinielas_user_id_fkey(username)')
        .eq('id', quinielaId)
        .single()

      if (qErr) { setError('Error cargando quiniela: ' + qErr.message); setLoading(false); return }
      if (!q) { setError('Quiniela no encontrada'); setLoading(false); return }
      if (q.user_id !== user?.id) { navigate('/'); return }
      setQuiniela(q)
    } catch(e) {
      setError('Error inesperado: ' + e.message)
    }
    setLoading(false)
  }

  async function sendInitToIframe() {
    if (view === 'final') {
      // FASE FINAL: los 16avos tienen equipos REALES fijos. Solo se cargan los
      // picks que el usuario haya guardado en picks_ko_test (marcadores de la
      // eliminatoria). realFinal=true hace que el HTML use los cruces reales.
      const koTestPicks = await devGetKoTestPicks(quinielaId)
      iframeRef.current?.contentWindow?.postMessage({
        type: 'INIT',
        data: {
          quinielaId,
          isLocked: false,
          testMode: true,     // grupos bloqueados; editable 16avos+
          realFinal: true,    // usa equipos reales en 16avos
          username: profile?.username,
          picks: koTestPicks,
          results: {},
        }
      }, '*')
    } else {
      // Quiniela Original: TODO en solo lectura (isLocked) sobre el bracket original
      const [picks, results] = await Promise.all([
        getQuinielaPicks(quinielaId),
        getAllResults(),
      ])
      const filled = Object.values(picks).filter(p => p?.h != null).length
      setFilledPicks(filled)
      iframeRef.current?.contentWindow?.postMessage({
        type: 'INIT',
        data: { quinielaId, isLocked: true, username: profile?.username, picks, results }
      }, '*')
    }
  }

  function switchView(v) {
    if (v === view) return
    setView(v)
    setIframeReady(false)
    // Recordar la vista en la URL para que se mantenga al recargar
    try {
      const url = new URL(window.location.href)
      if (v === 'final') url.searchParams.set('view', 'final')
      else url.searchParams.delete('view')
      window.history.replaceState({}, '', url)
    } catch {}
    const url = (v === 'final' ? QUINIELA_HTML_FINAL : QUINIELA_HTML_URL) + '?t=' + Date.now()
    if (iframeRef.current) iframeRef.current.src = url
  }

  useEffect(() => {
    const channel = supabase
      .channel('results-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_results' },
        (payload) => {
          const r = payload.new
          iframeRef.current?.contentWindow?.postMessage({
            type: 'UPDATE_RESULTS',
            data: { [r.match_id]: { hs: r.goals_home, as: r.goals_away, win: r.winner, status: r.status } }
          }, '*')
        }
      ).subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', color:'#aeaeb2' }}>
      Cargando quiniela...
    </div>
  )

  if (error) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'60vh', gap:16, padding:24 }}>
      <div style={{ fontSize:32 }}>⚠️</div>
      <div style={{ fontWeight:700, fontSize:16, color:'#c0392b' }}>{error}</div>
      <button onClick={load} style={{ padding:'10px 20px', background:'#0071e3', color:'#fff', border:'none', borderRadius:10, fontWeight:700, cursor:'pointer', fontSize:14 }}>
        Reintentar
      </button>
      <button onClick={() => navigate('/')} style={{ padding:'10px 20px', background:'#f2f2f7', color:'#1d1d1f', border:'none', borderRadius:10, fontWeight:600, cursor:'pointer', fontSize:14 }}>
        ← Volver
      </button>
    </div>
  )

  const faseActiva = quiniela?.fase_corregida_activa === true

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 52px)' }}>
      <div style={{ background:'#fff', borderBottom:'0.5px solid rgba(0,0,0,.08)', padding:'8px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <button onClick={() => navigate('/')} style={{ border:'none', background:'none', cursor:'pointer', color:'#6e6e73', fontSize:13, padding:0 }}>
            ← Mis Quinielas
          </button>
          <span style={{ color:'#e0e0e0' }}>|</span>
          <span style={{ fontWeight:700, fontSize:15 }}>{quiniela?.name}</span>
          {view === 'normal' && <span style={{ fontSize:12, color:'#6e6e73' }}>{filledPicks} / 104 picks</span>}
          {quiniela?.is_locked && <span style={{ fontSize:12, color:'#ff9f0a', fontWeight:600 }}>🔒 Cerrada</span>}
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {msg && <span style={{ fontSize:12, color:'#0071e3', fontWeight:600 }}>{msg}</span>}
          {view === 'normal' && totalPts > 0 && (
            <span style={{ background:'#ffd60a', color:'#7a5900', padding:'3px 12px', borderRadius:20, fontWeight:800, fontSize:15 }}>
              {totalPts} pts
            </span>
          )}
          {view === 'normal' && (
            <button onClick={() => window.open(`/print/${quinielaId}`, '_blank')}
              style={{ padding:'6px 12px', border:'0.5px solid rgba(0,0,0,.12)', borderRadius:8, background:'#fff', cursor:'pointer', fontSize:13 }}>
              🖨️ Imprimir PDF
            </button>
          )}
        </div>
      </div>

      {/* Bandas informativas */}
      {view === 'normal' && faseActiva && (
        <div style={{ background:'#eef4ff', color:'#0a4ea3', padding:'6px 20px', fontSize:12, fontWeight:600, flexShrink:0, borderBottom:'0.5px solid rgba(0,0,0,.06)' }}>
          📋 Quiniela Original — Vista de solo lectura. Tus picks originales tal como los registraste (no editable).
        </div>
      )}
      {view === 'final' && (
        <div style={{ background:'linear-gradient(90deg,#fff4e6,#ffe9f0)', color:'#b3402a', padding:'7px 20px', fontSize:12, fontWeight:700, flexShrink:0, borderBottom:'0.5px solid rgba(0,0,0,.06)' }}>
          🏆 FASE FINAL — Equipos reales del Mundial 2026. Predice los marcadores desde 16avos hasta la gran final. ¡Editable!
        </div>
      )}

      {!iframeReady && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'#aeaeb2', fontSize:14 }}>
          ⚽ Cargando interfaz...
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={QUINIELA_HTML_URL}
        style={{ flex:1, border:'none', width:'100%', display: iframeReady ? 'block' : 'none' }}
        title="Quiniela Mundial 2026"
      />
    </div>
  )
}
