import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const STEPS = [
  {
    id: 1,
    title: 'Regístrate en la quiniela',
    icon: '👤',
    color: '#0071e3',
    desc: 'Crea tu cuenta con el código de invitación que te dio el organizador.',
    steps: [
      { text: 'Abre la app en tu navegador', detail: 'quiniela2026panas.netlify.app' },
      { text: 'Click en la pestaña "Registrarse"', detail: 'Está en el formulario de la derecha (o abajo en móvil)' },
      { text: 'Ingresa el código de invitación', detail: 'El organizador te lo envió — sin él no puedes registrarte' },
      { text: 'Llena tu usuario, email y contraseña', detail: 'El usuario es tu nombre público en la tabla de posiciones' },
      { text: 'Click en "Crear mi quiniela"', detail: 'Entrarás directo al dashboard' },
    ],
    tip: '💡 En móvil: el formulario de registro está abajo de la página de inicio. Desplázate hacia abajo.',
    visual: {
      type: 'mockup',
      content: [
        { type:'header', text:'🏆 Quiniela Mundial 2026' },
        { type:'tabs', tabs:['Entrar','Registrarse'], active:1 },
        { type:'field', label:'🔑 Código de invitación', value:'PANAS2026', highlight:true },
        { type:'field', label:'Usuario público', value:'Tu nombre' },
        { type:'field', label:'Email', value:'tu@email.com' },
        { type:'field', label:'Contraseña', value:'••••••••' },
        { type:'button', text:'🏆 Crear mi quiniela', primary:true },
      ]
    }
  },
  {
    id: 2,
    title: 'Crea tu quiniela',
    icon: '📋',
    color: '#30d158',
    desc: 'En el dashboard puedes crear una o más quinielas y llenarlas antes del 11 de junio.',
    steps: [
      { text: 'En el Dashboard, escribe el nombre de tu quiniela', detail: 'Ej: "Mi primera quiniela" o tu nombre' },
      { text: 'Click en "Crear"', detail: 'Serás redirigido a llenar los picks' },
      { text: 'Puedes crear varias quinielas', detail: 'Cada una es independiente y compite por separado' },
      { text: 'La barra de progreso muestra cuánto te falta', detail: 'Click en ▼ para ver el desglose por fase' },
    ],
    tip: '⚠️ Tienes hasta el 11 de junio antes del primer partido para completar tus picks. Después se bloquean.',
    visual: {
      type: 'dashboard',
      items: [
        { name:'Mi Quiniela 1', progress:45, total:104, pts:0 },
        { name:'Mi Quiniela 2', progress:0,  total:104, pts:0 },
      ]
    }
  },
  {
    id: 3,
    title: 'Llena tus picks de grupos',
    icon: '⚽',
    color: '#ff9f0a',
    desc: 'Pronostica el marcador de los 72 partidos de la fase de grupos (12 grupos × 6 partidos).',
    steps: [
      { text: 'Selecciona la fase "Grupos" y el grupo que quieres llenar', detail: 'Grupos A hasta L — 4 equipos en cada uno' },
      { text: 'Para cada partido, escribe el marcador que predices', detail: 'Ej: México 2 – Sudáfrica 1' },
      { text: 'El pick se guarda automáticamente al escribir', detail: 'Verás un ✓ verde cuando esté guardado' },
      { text: 'Ordena los equipos en la tabla de clasificación', detail: 'Arrastra o selecciona qué posición crees que termina cada equipo' },
      { text: 'Repite para los 12 grupos', detail: '6 partidos por grupo = 72 picks en total' },
    ],
    tip: '🎯 Puntos: 1pt goles local + 1pt goles visitante + 2pts resultado + 1pt bonus si todo es correcto = máx 5 pts por partido.',
    visual: {
      type: 'match',
      matches: [
        { id:'A1', h:'🇲🇽 México', a:'🇿🇦 Sudáfrica', ph:2, pa:1, saved:true },
        { id:'A2', h:'🇰🇷 Rep. Corea', a:'🇨🇿 Rep. Checa', ph:null, pa:null, saved:false },
        { id:'A3', h:'🇲🇽 México', a:'🇰🇷 Rep. Corea', ph:null, pa:null, saved:false },
      ]
    }
  },
  {
    id: 4,
    title: 'Llena la fase eliminatoria',
    icon: '🏆',
    color: '#bf5af2',
    desc: 'Pronostica los 32 partidos de eliminatoria: R32, Octavos, Cuartos, Semis, 3er lugar y Final.',
    steps: [
      { text: 'Selecciona la fase: R32, Octavos, Cuartos, etc.', detail: 'Las fases aparecen en la barra de pestañas arriba' },
      { text: 'Escribe el marcador de cada partido', detail: 'Los equipos se completan automáticamente según avanza el torneo' },
      { text: 'Selecciona "¿Quién avanza?" si hay empate', detail: 'En eliminatoria alguien siempre avanza — elige el equipo ganador' },
      { text: 'Llena hasta la Gran Final', detail: 'El orden final (campeón, sub, 3ro, 4to) da puntos extra: 20/10/5/3 pts' },
    ],
    tip: '🏆 El campeón vale 20 puntos — ¡es el pick más importante de toda la quiniela!',
    visual: {
      type: 'bracket',
      matches: [
        { id:'M73', h:'Rep. Checa', a:'Ecuador', ph:2, pa:0, win:'Rep. Checa' },
        { id:'M74', h:'Sudáfrica', a:'Turquía', ph:null, pa:null, win:null },
      ]
    }
  },
  {
    id: 5,
    title: 'Sigue la tabla en vivo',
    icon: '📊',
    color: '#ffd60a',
    desc: 'Durante el Mundial los resultados se actualizan automáticamente y tus puntos suben en tiempo real.',
    steps: [
      { text: 'Click en "Tabla" en el menú superior', detail: 'Verás el ranking de todos los participantes' },
      { text: 'La tabla muestra tus puntos por grupo y fase', detail: 'GR.A · GR.B · ... · GR.L · CLASIF · ELIM · FINAL · TOTAL' },
      { text: 'Click en cualquier jugador para ver su quiniela', detail: 'En modo solo lectura — no puedes modificar la suya' },
      { text: 'Los resultados se actualizan solos cada 2 minutos', detail: 'No necesitas recargar la página' },
    ],
    tip: '💰 Para ver la tabla necesitas haber pagado la inscripción ($15). El organizador confirma el pago.',
    visual: {
      type: 'leaderboard',
      rows: [
        { pos:1, name:'Carlos M.', total:54, grp:42, elim:12 },
        { pos:2, name:'Diana F.', total:48, grp:38, elim:10 },
        { pos:3, name:'Tú', total:43, grp:35, elim:8, isMe:true },
      ]
    }
  },
  {
    id: 6,
    title: 'Pago e inscripción',
    icon: '💰',
    color: '#ff453a',
    desc: 'El pago es de $15 USD por quiniela. El organizador lo confirma manualmente.',
    steps: [
      { text: 'Contacta al organizador para realizar el pago', detail: 'Transferencia, efectivo o el método que indique' },
      { text: 'El organizador confirma tu pago en el sistema', detail: 'Recibirás acceso a la tabla de posiciones automáticamente' },
      { text: 'Sin pago: puedes llenar tu quiniela pero no ver la tabla', detail: 'Tienes hasta el inicio del Mundial para pagar' },
      { text: 'Con pago confirmado: acceso completo', detail: 'Ves la tabla, los picks de otros y el premio acumulado' },
    ],
    tip: '🏆 Premio: 60% al 1er lugar · 20% al 2do · 10% al 3ro. Si hay empate el premio se divide.',
    visual: {
      type: 'payment',
      fee: 15,
      prizes: [
        { medal:'🥇', label:'1er lugar', pct:'60%' },
        { medal:'🥈', label:'2do lugar', pct:'20%' },
        { medal:'🥉', label:'3er lugar', pct:'10%' },
        { medal:'🏛️', label:'Organización', pct:'10%' },
      ]
    }
  },
]

// ── VISUAL MOCKUP COMPONENTS ──────────────────────────────────
function MockupVisual({ visual, color }) {
  if (visual.type === 'mockup') {
    return (
      <div style={{ background:'#1c1c1e', borderRadius:16, padding:20, maxWidth:320, margin:'0 auto' }}>
        {visual.content.map((el, i) => {
          if (el.type === 'header') return (
            <div key={i} style={{ fontWeight:800, fontSize:14, color:'#ffd60a', marginBottom:16, textAlign:'center' }}>{el.text}</div>
          )
          if (el.type === 'tabs') return (
            <div key={i} style={{ display:'flex', background:'rgba(255,255,255,.06)', borderRadius:8, padding:2, marginBottom:14 }}>
              {el.tabs.map((t,j) => (
                <div key={j} style={{ flex:1, padding:'6px', textAlign:'center', borderRadius:6, fontSize:12, fontWeight:700,
                  background: j===el.active ? 'linear-gradient(135deg,#ffd60a,#ff9f0a)' : 'none',
                  color: j===el.active ? '#000' : '#6e6e73' }}>{t}</div>
              ))}
            </div>
          )
          if (el.type === 'field') return (
            <div key={i} style={{ marginBottom:8 }}>
              <div style={{ fontSize:10, color:'#6e6e73', marginBottom:3 }}>{el.label}</div>
              <div style={{ background: el.highlight ? 'rgba(255,214,10,.12)' : 'rgba(255,255,255,.06)',
                border: `1px solid ${el.highlight ? 'rgba(255,214,10,.4)' : 'rgba(255,255,255,.1)'}`,
                borderRadius:8, padding:'8px 12px', fontSize:13, fontWeight: el.highlight ? 800 : 400,
                color: el.highlight ? '#ffd60a' : '#fff', letterSpacing: el.highlight ? 2 : 0 }}>
                {el.value}
              </div>
            </div>
          )
          if (el.type === 'button') return (
            <div key={i} style={{ background: el.primary ? 'linear-gradient(135deg,#ffd60a,#ff9f0a)' : 'rgba(255,255,255,.1)',
              borderRadius:10, padding:'11px', textAlign:'center', fontSize:14, fontWeight:800,
              color: el.primary ? '#000' : '#fff', marginTop:8 }}>{el.text}</div>
          )
          return null
        })}
      </div>
    )
  }

  if (visual.type === 'match') return (
    <div style={{ background:'#fff', borderRadius:16, overflow:'hidden', maxWidth:380, margin:'0 auto', boxShadow:'0 4px 16px rgba(0,0,0,.1)' }}>
      <div style={{ background:'#0071e3', color:'#fff', padding:'8px 16px', fontWeight:800, fontSize:13 }}>⚽ Grupo A — Mis Picks</div>
      {visual.matches.map(m => (
        <div key={m.id} style={{ display:'grid', gridTemplateColumns:'40px 1fr 80px 1fr', padding:'10px 16px', borderBottom:'0.5px solid #f2f2f7', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:10, color:'#aeaeb2', fontWeight:700 }}>{m.id}</span>
          <span style={{ fontSize:12, fontWeight:700 }}>{m.h}</span>
          <div style={{ display:'flex', alignItems:'center', gap:4, justifyContent:'center' }}>
            <div style={{ width:28, height:26, border:`1.5px solid ${m.saved?'#30d158':'#e5e5ea'}`, borderRadius:6, background:m.saved?'rgba(48,209,88,.08)':'#f9f9fb', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, color:m.saved?'#1a7a38':'#aeaeb2' }}>
              {m.ph ?? '–'}
            </div>
            <span style={{ color:'#aeaeb2', fontSize:11 }}>–</span>
            <div style={{ width:28, height:26, border:`1.5px solid ${m.saved?'#30d158':'#e5e5ea'}`, borderRadius:6, background:m.saved?'rgba(48,209,88,.08)':'#f9f9fb', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, color:m.saved?'#1a7a38':'#aeaeb2' }}>
              {m.pa ?? '–'}
            </div>
          </div>
          <span style={{ fontSize:12, fontWeight:700, textAlign:'right' }}>{m.a}</span>
        </div>
      ))}
    </div>
  )

  if (visual.type === 'leaderboard') return (
    <div style={{ background:'#fff', borderRadius:16, overflow:'hidden', maxWidth:380, margin:'0 auto', boxShadow:'0 4px 16px rgba(0,0,0,.1)' }}>
      <div style={{ background:'#0071e3', color:'#fff', padding:'8px 16px', fontWeight:800, fontSize:13 }}>📊 Tabla de Posiciones</div>
      {visual.rows.map((r,i) => (
        <div key={i} style={{ display:'flex', alignItems:'center', padding:'10px 16px', borderBottom:'0.5px solid #f2f2f7', gap:10, background:r.isMe?'rgba(0,113,227,.04)':'#fff' }}>
          <span style={{ fontWeight:800, fontSize:16, width:24 }}>{['🥇','🥈','🥉'][i]}</span>
          <span style={{ flex:1, fontWeight:700, fontSize:13 }}>
            {r.name}
            {r.isMe && <span style={{ marginLeft:6, fontSize:9, background:'rgba(0,113,227,.12)', color:'#0071e3', padding:'1px 5px', borderRadius:4, fontWeight:700 }}>TÚ</span>}
          </span>
          <span style={{ fontSize:11, color:'#6e6e73' }}>Grp:{r.grp} El:{r.elim}</span>
          <span style={{ fontSize:17, fontWeight:800, color:'#0071e3' }}>{r.total}</span>
        </div>
      ))}
    </div>
  )

  if (visual.type === 'payment') return (
    <div style={{ background:'linear-gradient(135deg,#1c1c1e,#2c2c2e)', borderRadius:16, padding:20, maxWidth:320, margin:'0 auto' }}>
      <div style={{ textAlign:'center', marginBottom:16 }}>
        <div style={{ fontSize:40, marginBottom:8 }}>💰</div>
        <div style={{ fontSize:11, color:'rgba(255,255,255,.5)', textTransform:'uppercase', letterSpacing:'.5px' }}>Inscripción</div>
        <div style={{ fontSize:36, fontWeight:900, color:'#ffd60a' }}>${visual.fee} USD</div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {visual.prizes.map(p => (
          <div key={p.label} style={{ display:'flex', alignItems:'center', gap:10, background:'rgba(255,255,255,.06)', borderRadius:8, padding:'8px 12px' }}>
            <span style={{ fontSize:18 }}>{p.medal}</span>
            <span style={{ flex:1, fontSize:12, color:'rgba(255,255,255,.7)' }}>{p.label}</span>
            <span style={{ fontSize:14, fontWeight:800, color:'#ffd60a' }}>{p.pct}</span>
          </div>
        ))}
      </div>
    </div>
  )

  if (visual.type === 'dashboard') return (
    <div style={{ background:'#fff', borderRadius:16, overflow:'hidden', maxWidth:380, margin:'0 auto', boxShadow:'0 4px 16px rgba(0,0,0,.1)' }}>
      <div style={{ padding:'12px 16px', borderBottom:'0.5px solid #f2f2f7' }}>
        <div style={{ fontSize:12, color:'#6e6e73', marginBottom:8, textTransform:'uppercase', fontWeight:700, letterSpacing:'.4px' }}>Mis quinielas</div>
        {visual.items.map((q,i) => (
          <div key={i} style={{ padding:'10px 0', borderBottom:i<visual.items.length-1?'0.5px solid #f9f9fb':'none' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
              <span style={{ fontSize:16 }}>{q.progress===0?'📋':q.progress===q.total?'✅':'⚠️'}</span>
              <span style={{ fontWeight:700, fontSize:13, flex:1 }}>{q.name}</span>
              <span style={{ fontSize:11, color:'#aeaeb2' }}>{q.progress}/{q.total}</span>
            </div>
            <div style={{ background:'#f2f2f7', borderRadius:20, height:6, overflow:'hidden' }}>
              <div style={{ width:`${(q.progress/q.total)*100}%`, height:'100%', background:q.progress===q.total?'#30d158':'#ff9f0a', borderRadius:20 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  return null
}

// ── MAIN GUIDE PAGE ───────────────────────────────────────────
export default function GuidePage() {
  const [activeStep, setActiveStep] = useState(0)
  const navigate = useNavigate()
  const { user } = useAuth()
  const step = STEPS[activeStep]

  return (
    <div style={{ minHeight:'100vh', background:'#f5f5f7', fontFamily:'-apple-system,"DM Sans",sans-serif' }}>

      {/* Header */}
      <div style={{ background:'#fff', borderBottom:'0.5px solid rgba(0,0,0,.08)', padding:'12px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:50 }}>
        <div style={{ fontWeight:800, fontSize:15 }}>📖 Guía de uso</div>
        <button onClick={() => navigate(user ? '/' : '/login')}
          style={{ border:'none', background:'none', cursor:'pointer', color:'#0071e3', fontWeight:600, fontSize:13, fontFamily:'inherit' }}>
          {user ? '← Volver a mis quinielas' : '← Volver al inicio'}
        </button>
      </div>

      <div style={{ maxWidth:900, margin:'0 auto', padding:'24px 16px 60px' }}>

        {/* Title */}
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <h1 style={{ fontSize:26, fontWeight:900, letterSpacing:'-.5px', marginBottom:6 }}>
            🏆 Cómo usar la Quiniela Mundial 2026
          </h1>
          <p style={{ color:'#6e6e73', fontSize:14 }}>Guía paso a paso · {STEPS.length} pasos</p>
        </div>

        {/* Step indicators */}
        <div style={{ display:'flex', gap:6, justifyContent:'center', marginBottom:24, flexWrap:'wrap' }}>
          {STEPS.map((s, i) => (
            <button key={i} onClick={() => setActiveStep(i)}
              style={{ width:36, height:36, borderRadius:'50%', border:`2px solid ${i===activeStep ? s.color : i<activeStep ? '#30d158' : '#e5e5ea'}`,
                background: i===activeStep ? s.color : i<activeStep ? '#30d158' : '#fff',
                color: i<=activeStep ? '#fff' : '#aeaeb2', fontWeight:800, fontSize:13,
                cursor:'pointer', transition:'all .2s', fontFamily:'inherit' }}>
              {i < activeStep ? '✓' : i+1}
            </button>
          ))}
        </div>

        {/* Main step card */}
        <div style={{ background:'#fff', borderRadius:20, border:'0.5px solid rgba(0,0,0,.08)', boxShadow:'0 4px 24px rgba(0,0,0,.08)', overflow:'hidden', marginBottom:16 }}>

          {/* Step header */}
          <div style={{ background:`linear-gradient(135deg,${step.color},${step.color}dd)`, padding:'24px 28px', color:'#fff' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:8 }}>
              <span style={{ fontSize:32 }}>{step.icon}</span>
              <div>
                <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.5px', opacity:.7 }}>
                  Paso {step.id} de {STEPS.length}
                </div>
                <h2 style={{ fontSize:22, fontWeight:900, letterSpacing:'-.3px' }}>{step.title}</h2>
              </div>
            </div>
            <p style={{ fontSize:14, opacity:.85, lineHeight:1.6 }}>{step.desc}</p>
          </div>

          {/* Content */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:0 }}>

            {/* Steps list */}
            <div style={{ padding:'24px 28px', borderRight:'0.5px solid rgba(0,0,0,.06)' }}>
              <div style={{ fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'.4px', color:'#6e6e73', marginBottom:16 }}>Instrucciones</div>
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {step.steps.map((s, i) => (
                  <div key={i} style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                    <div style={{ width:24, height:24, borderRadius:'50%', background:`${step.color}15`, border:`2px solid ${step.color}40`,
                      display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:11, fontWeight:800, color:step.color }}>
                      {i+1}
                    </div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color:'#1d1d1f', marginBottom:2 }}>{s.text}</div>
                      <div style={{ fontSize:11, color:'#6e6e73', lineHeight:1.5 }}>{s.detail}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tip */}
              <div style={{ marginTop:20, background:`${step.color}08`, border:`1px solid ${step.color}20`, borderRadius:10, padding:'12px 14px', fontSize:12, color:'#1d1d1f', lineHeight:1.6 }}>
                {step.tip}
              </div>
            </div>

            {/* Visual */}
            <div style={{ padding:'24px 28px', background:'#fafafa', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <MockupVisual visual={step.visual} color={step.color} />
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <button onClick={() => setActiveStep(Math.max(0, activeStep-1))}
            disabled={activeStep===0}
            style={{ padding:'10px 20px', border:'0.5px solid rgba(0,0,0,.12)', borderRadius:10, background:'#fff', cursor:activeStep===0?'not-allowed':'pointer', fontSize:13, fontWeight:600, fontFamily:'inherit', opacity:activeStep===0?.4:1 }}>
            ← Anterior
          </button>

          <span style={{ fontSize:12, color:'#6e6e73' }}>
            {activeStep+1} / {STEPS.length}
          </span>

          {activeStep < STEPS.length-1 ? (
            <button onClick={() => setActiveStep(activeStep+1)}
              style={{ padding:'10px 20px', background:step.color, color:'#fff', border:'none', borderRadius:10, cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:'inherit' }}>
              Siguiente →
            </button>
          ) : (
            <button onClick={() => navigate(user ? '/' : '/login')}
              style={{ padding:'10px 20px', background:'#30d158', color:'#fff', border:'none', borderRadius:10, cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:'inherit' }}>
              ✅ ¡Listo para participar!
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
