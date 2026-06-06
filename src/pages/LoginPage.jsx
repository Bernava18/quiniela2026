import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const inputStyle = {
  width:'100%', padding:'10px 12px', border:'1px solid rgba(0,0,0,.14)',
  borderRadius:10, fontSize:14, fontFamily:'inherit', outline:'none',
  background:'#f2f2f4', boxSizing:'border-box',
}
const btnStyle = {
  width:'100%', padding:'11px', background:'#0071e3', color:'#fff',
  border:'none', borderRadius:10, fontSize:14, fontWeight:600,
  cursor:'pointer', fontFamily:'inherit',
}
const cardStyle = {
  background:'#fff', borderRadius:20, border:'0.5px solid rgba(0,0,0,.08)',
  boxShadow:'0 12px 40px rgba(0,0,0,.12)', padding:'38px 34px',
  width:'100%', maxWidth:390,
}

export function LoginPage() {
  const { signIn } = useAuth()
  const navigate   = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await signIn(email, password)
    if (error) setError(error.message)
    else navigate('/')
    setLoading(false)
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f5f5f7', padding:20 }}>
      <div style={cardStyle}>
        <div style={{ textAlign:'center', marginBottom:24 }}>
          <div style={{ fontSize:46 }}>🏆</div>
          <h1 style={{ fontSize:22, fontWeight:700, marginTop:8 }}>Quiniela Mundial 2026</h1>
          <p style={{ color:'#6e6e73', fontSize:13, marginTop:4 }}>Ingresa tu cuenta</p>
        </div>
        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <input style={inputStyle} type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required />
          <input style={inputStyle} type="password" placeholder="Contraseña" value={password} onChange={e=>setPassword(e.target.value)} required />
          {error && <p style={{ color:'#ff453a', fontSize:12 }}>{error}</p>}
          <button style={{...btnStyle, opacity:loading?.6:1}} type="submit" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        <p style={{ textAlign:'center', fontSize:13, color:'#6e6e73', marginTop:16 }}>
          ¿No tienes cuenta? <Link to="/register" style={{ color:'#0071e3', fontWeight:600 }}>Regístrate</Link>
        </p>
      </div>
    </div>
  )
}

export function RegisterPage() {
  const { signUp } = useAuth()
  const navigate   = useNavigate()
  const [form, setForm]   = useState({ email:'', password:'', username:'', fullName:'' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = k => e => setForm(f => ({...f, [k]: e.target.value}))

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    setLoading(true); setError('')
    const { error } = await signUp(form.email, form.password, form.username, form.fullName)
    if (error) setError(error.message)
    else navigate('/')
    setLoading(false)
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f5f5f7', padding:20 }}>
      <div style={cardStyle}>
        <div style={{ textAlign:'center', marginBottom:24 }}>
          <div style={{ fontSize:46 }}>🏆</div>
          <h1 style={{ fontSize:22, fontWeight:700, marginTop:8 }}>Crear cuenta</h1>
          <p style={{ color:'#6e6e73', fontSize:13, marginTop:4 }}>Únete a la Quiniela Mundial 2026</p>
        </div>
        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <input style={inputStyle} placeholder="Nombre de usuario (público)" value={form.username} onChange={set('username')} required />
          <input style={inputStyle} placeholder="Nombre completo" value={form.fullName} onChange={set('fullName')} />
          <input style={inputStyle} type="email" placeholder="Email" value={form.email} onChange={set('email')} required />
          <input style={inputStyle} type="password" placeholder="Contraseña (mín. 6 caracteres)" value={form.password} onChange={set('password')} required />
          {error && <p style={{ color:'#ff453a', fontSize:12 }}>{error}</p>}
          <button style={{...btnStyle, opacity:loading?.6:1}} type="submit" disabled={loading}>
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>
        <p style={{ textAlign:'center', fontSize:13, color:'#6e6e73', marginTop:16 }}>
          ¿Ya tienes cuenta? <Link to="/login" style={{ color:'#0071e3', fontWeight:600 }}>Inicia sesión</Link>
        </p>
      </div>
    </div>
  )
}

export default LoginPage
