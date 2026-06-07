import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function PhonePrompt({ onComplete }) {
  const { user, profile } = useAuth()
  const [phone, setPhone]     = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSave(e) {
    e.preventDefault()
    if (!phone.trim()) { setError('El teléfono es obligatorio'); return }
    setLoading(true)
    const { error } = await supabase
      .from('profiles')
      .update({ phone: phone.trim() })
      .eq('id', user.id)
    if (error) setError(error.message)
    else onComplete()
    setLoading(false)
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', backdropFilter:'blur(8px)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:'#fff', borderRadius:20, padding:'36px 32px', maxWidth:420, width:'100%', boxShadow:'0 24px 80px rgba(0,0,0,.25)', textAlign:'center' }}>
        <div style={{ fontSize:52, marginBottom:12 }}>📱</div>
        <h2 style={{ fontSize:22, fontWeight:800, marginBottom:8, letterSpacing:'-.4px' }}>
          ¡Un dato más!
        </h2>
        <p style={{ color:'#6e6e73', fontSize:14, lineHeight:1.6, marginBottom:24 }}>
          Necesitamos tu número de teléfono para que el organizador pueda contactarte sobre pagos y novedades de la quiniela.
        </p>
        <form onSubmit={handleSave} style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ position:'relative' }}>
            <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', fontSize:18 }}>📱</span>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="Ej: +58 412 123 4567"
              required
              autoFocus
              style={{ width:'100%', padding:'12px 14px 12px 46px', border:'1.5px solid #e5e5ea', borderRadius:12, fontSize:15, fontFamily:'inherit', outline:'none', boxSizing:'border-box' }}
              onFocus={e => e.target.style.borderColor='#0071e3'}
              onBlur={e => e.target.style.borderColor='#e5e5ea'}
            />
          </div>
          {error && <p style={{ color:'#ff453a', fontSize:12, margin:0 }}>{error}</p>}
          <button type="submit" disabled={loading || !phone.trim()}
            style={{ padding:'12px', background:'linear-gradient(135deg,#0071e3,#005bb5)', color:'#fff', border:'none', borderRadius:12, fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:'inherit', opacity:loading||!phone.trim()?.6:1 }}>
            {loading ? 'Guardando...' : '✅ Guardar y continuar'}
          </button>
        </form>
        <p style={{ fontSize:11, color:'#aeaeb2', marginTop:14 }}>
          Tu teléfono solo es visible para el organizador de la quiniela.
        </p>
      </div>
    </div>
  )
}
