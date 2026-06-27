import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getRealAsPicks } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// Usa el bracket CORREGIDO (cruces oficiales FIFA) para mostrar la realidad.
const HTML_URL = '/quiniela2026_corrected.html'

// ════════════════════════════════════════════════════════════════
//  REAL FIFA — Quiniela de referencia (visible para todos)
//  Se "llena sola" con los resultados reales (match_results):
//   · Orden de clasificación de grupos según lo real
//   · 16avos en adelante según el cuadro real, conforme cargas resultados
//  Es de SOLO LECTURA. No crea datos en la base.
// ════════════════════════════════════════════════════════════════
export default function RealFifaPage() {
  const { profile }  = useAuth()
  const navigate     = useNavigate()
  const iframeRef    = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === 'IFRAME_READY') { setReady(true); sendInit() }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
    // eslint-disable-next-line
  }, [])

  async function sendInit() {
    const picks = await getRealAsPicks()  // resultados reales como "picks"
    iframeRef.current?.contentWindow?.postMessage({
      type: 'INIT',
      data: {
        quinielaId: 'REAL_FIFA',
        isLocked: false,
        readOnlyAll: true,        // solo lectura total
        username: 'REAL FIFA',
        picks,
        results: {},              // no comparamos contra nada: ESTO es la realidad
      }
    }, '*')
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 52px)' }}>
      <div style={{ background:'#0a2540', color:'#fff', padding:'10px 20px', display:'flex',
        alignItems:'center', gap:12, flexShrink:0 }}>
        <button onClick={() => navigate(-1)}
          style={{ border:'none', background:'rgba(255,255,255,.12)', color:'#fff', cursor:'pointer',
            fontSize:13, padding:'5px 12px', borderRadius:7 }}>← Volver</button>
        <span style={{ fontWeight:800, fontSize:16 }}>🌐 REAL FIFA</span>
        <span style={{ fontSize:12, color:'#9fc3e8' }}>
          Cuadro oficial según resultados reales — referencia · solo lectura
        </span>
        <button onClick={() => { setReady(false); if (iframeRef.current) iframeRef.current.src = HTML_URL + '?t=' + Date.now() }}
          style={{ marginLeft:'auto', border:'none', background:'#34c759', color:'#fff', cursor:'pointer',
            fontSize:13, padding:'5px 14px', borderRadius:7, fontWeight:600 }}>🔄 Actualizar</button>
      </div>

      <div style={{ background:'#eef4ff', color:'#0a4ea3', padding:'6px 20px', fontSize:12, fontWeight:600, flexShrink:0 }}>
        Esta vista se arma con los resultados reales que cargas en Admin → Resultados. Sirve para validar que el cuadro se comporta tal cual la realidad.
      </div>

      {!ready && <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'#aeaeb2' }}>⚽ Cargando cuadro real...</div>}
      <iframe ref={iframeRef} src={HTML_URL}
        style={{ flex:1, border:'none', width:'100%', display: ready ? 'block' : 'none' }}
        title="REAL FIFA — Cuadro oficial" />
    </div>
  )
}
