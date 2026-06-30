import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

// Página INDEPENDIENTE: solo la Fase Final con equipos reales del Mundial 2026.
// Ruta sugerida: /fase-final/:id
// Carga el HTML limpio /solo_fasefinal.html y guarda los picks en picks_ko_test.

const HTML_FINAL = '/solo_fasefinal.html'

export default function FaseFinalPage() {
  const { id: quinielaId } = useParams()
  const navigate = useNavigate()
  const { user, profile } = useAuth()

  const iframeRef = useRef(null)
  const [iframeReady, setIframeReady] = useState(false)
  const [quiniela, setQuiniela] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => { if (user) load() }, [quinielaId, user])

  // Recibir mensajes del iframe
  useEffect(() => {
    const handler = async (e) => {
      const { type, quinielaId: qid, matchId, pick } = e.data || {}
      if (type === 'IFRAME_READY') setIframeReady(true)
      if (type === 'SAVE_PICK' && qid && matchId && pick) {
        const m = /^M(\d+)$/.exec(matchId)
        const n = m ? +m[1] : 0
        if (n < 73 || n > 104) return  // solo eliminatoria
        await saveKoPick(qid, matchId, pick)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  useEffect(() => {
    if (iframeReady && quiniela) sendInit()
    // eslint-disable-next-line
  }, [iframeReady, quiniela])

  async function load() {
    setLoading(true); setError(null)
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
    } catch (e) {
      setError('Error inesperado: ' + e.message)
    }
    setLoading(false)
  }

  async function getKoPicks(qid) {
    const { data, error } = await supabase
      .from('picks_ko_test')
      .select('match_id, goals_home, goals_away, winner')
      .eq('quiniela_id', qid)
    if (error) { console.error(error); return {} }
    const out = {}
    for (const r of (data || [])) {
      out[r.match_id] = { h: r.goals_home, a: r.goals_away, winner: r.winner }
    }
    return out
  }

  async function saveKoPick(qid, matchId, pick) {
    const row = {
      quiniela_id: qid,
      match_id: matchId,
      goals_home: pick.h ?? null,
      goals_away: pick.a ?? null,
      winner: pick.w ?? null,
    }
    const { error } = await supabase
      .from('picks_ko_test')
      .upsert(row, { onConflict: 'quiniela_id,match_id' })
    if (error) console.error('saveKoPick', error)
  }

  async function getLockedMatches() {
    const { data } = await supabase
      .from('match_locks')
      .select('match_id, locked')
      .eq('locked', true)
    return (data || []).map(r => r.match_id)
  }

  async function sendInit() {
    const [picks, lockedMatches] = await Promise.all([
      getKoPicks(quinielaId),
      getLockedMatches(),
    ])
    // Si es la quiniela REAL, el admin puede editar todos los partidos (sin bloqueos)
    const esReal = quiniela?.es_real === true
    iframeRef.current?.contentWindow?.postMessage({
      type: 'INIT',
      data: { quinielaId, username: profile?.username, picks, lockedMatches: esReal ? [] : lockedMatches },
    }, '*')
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#86868b' }}>Cargando…</div>
  if (error) return (
    <div style={{ padding: 40 }}>
      <p style={{ color: '#d9534f', marginBottom: 16 }}>{error}</p>
      <button onClick={() => navigate('/')}
        style={{ padding: '10px 20px', background: '#0071e3', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>
        ← Volver
      </button>
    </div>
  )

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '0.5px solid rgba(0,0,0,.08)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={() => navigate('/')}
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#6e6e73', fontSize: 13, padding: 0 }}>
            ← Mis Quinielas
          </button>
          <strong style={{ fontSize: 15 }}>{quiniela?.name}</strong>
          <span style={{ fontSize: 12, color: '#ff8a00', fontWeight: 700 }}>🏆 Fase Final</span>
        </div>
      </div>
      <iframe
        ref={iframeRef}
        src={HTML_FINAL}
        title="Fase Final"
        style={{ flex: 1, width: '100%', border: 'none' }}
      />
    </div>
  )
}
