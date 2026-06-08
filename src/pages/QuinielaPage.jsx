import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase, savePick, getQuinielaPicks, getAllResults, downloadQuinielaBackup } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const QUINIELA_HTML_URL = '/quiniela2026_fixed.html'
const LOCK_DATE = new Date('2026-06-11T18:00:00Z')

export default function QuinielaPage() {
  const { id: quinielaId } = useParams()
  const { user, profile }  = useAuth()
  const navigate           = useNavigate()
  const iframeRef          = useRef(null)

  const [quiniela, setQuiniela]     = useState(null)
  const [loading, setLoading]       = useState(true)
  const [iframeReady, setIframeReady] = useState(false)
  const [totalPts, setTotalPts]     = useState(0)
  const [filledPicks, setFilledPicks] = useState(0)

  const isLocked = new Date() >= LOCK_DATE

  useEffect(() => {
    load()
  }, [quinielaId])

  // Listen to postMessage from iframe
  useEffect(() => {
    const handler = async (e) => {
      const { type, quinielaId: qid, matchId, pick, total } = e.data || {}

      if (type === 'IFRAME_READY') {
        setIframeReady(true)
      }
      if (type === 'SAVE_PICK' && qid && matchId && pick) {
        await savePick(qid, matchId, pick)
        setFilledPicks(prev => prev + 1)
      }
      if (type === 'PTS_UPDATE') {
        setTotalPts(total || 0)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  // Send INIT to iframe once ready
  useEffect(() => {
    if (iframeReady && quiniela) {
      sendInitToIframe()
    }
  }, [iframeReady, quiniela])

  async function load() {
    setLoading(true)
    const { data: q } = await supabase
      .from('quinielas')
      .select('*, profiles(username)')
      .eq('id', quinielaId)
      .single()

    if (!q || q.user_id !== user.id) { navigate('/'); return }
    setQuiniela(q)
    setLoading(false)
  }

  async function sendInitToIframe() {
    // Load picks and results from Supabase
    const [picks, results] = await Promise.all([
      getQuinielaPicks(quinielaId),
      getAllResults(),
    ])

    const filled = Object.values(picks).filter(p => p?.h != null).length
    setFilledPicks(filled)

    iframeRef.current?.contentWindow?.postMessage({
      type: 'INIT',
      data: {
        quinielaId,
        isLocked: quiniela?.is_locked || isLocked,
        username: profile?.username,
        picks,
        results,
      }
    }, '*')
  }

  // Listen for real-time result updates and forward to iframe
  useEffect(() => {
    const channel = supabase
      .channel('results-live')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'match_results' },
        (payload) => {
          const r = payload.new
          iframeRef.current?.contentWindow?.postMessage({
            type: 'UPDATE_RESULTS',
            data: {
              [r.match_id]: { hs: r.goals_home, as: r.goals_away, win: r.winner, status: r.status }
            }
          }, '*')
        }
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', color:'#aeaeb2' }}>
      Cargando quiniela...
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 52px)' }}>
      {/* Mini header */}
      <div style={{ background:'#fff', borderBottom:'0.5px solid rgba(0,0,0,.08)', padding:'8px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <button onClick={() => navigate('/')}
            style={{ border:'none', background:'none', cursor:'pointer', color:'#6e6e73', fontSize:13, padding:0 }}>
            ← Mis Quinielas
          </button>
          <span style={{ color:'#e0e0e0' }}>|</span>
          <span style={{ fontWeight:700, fontSize:15 }}>{quiniela?.name}</span>
          <span style={{ fontSize:12, color:'#6e6e73' }}>{filledPicks} / 104 picks</span>
          {quiniela?.is_locked && <span style={{ fontSize:12, color:'#ff9f0a', fontWeight:600 }}>🔒 Cerrada</span>}
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {totalPts > 0 && (
            <span style={{ background:'#ffd60a', color:'#7a5900', padding:'3px 12px', borderRadius:20, fontWeight:800, fontSize:15 }}>
              {totalPts} pts
            </span>
          )}
          <button onClick={() => window.open(`/print/${quinielaId}`, '_blank')}
            style={{ padding:'6px 12px', border:'0.5px solid rgba(0,0,0,.12)', borderRadius:8, background:'#fff', cursor:'pointer', fontSize:13 }}>
            🖨️ Imprimir PDF
          </button>
        </div>
      </div>

      {/* Iframe — full quiniela UI */}
      {!iframeReady && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'#aeaeb2', fontSize:14 }}>
          ⚽ Cargando interfaz...
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={QUINIELA_HTML_URL}
        style={{
          flex: 1,
          border: 'none',
          width: '100%',
          display: iframeReady ? 'block' : 'none',
        }}
        title="Quiniela Mundial 2026"
      />
    </div>
  )
}
