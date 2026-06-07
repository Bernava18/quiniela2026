import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const STEPS = [
  {
    id: 1,
    title: 'Regístrate en la quiniela',
    icon: '👤',
    color: '#0071e3',
    desc: 'Crea tu cuenta con el código de invitación. Necesitarás tu número de teléfono.',
    steps: [
      { text: 'Abre la app en tu navegador', detail: 'quiniela2026panas.netlify.app — en móvil el formulario está abajo de la página, desplázate hacia abajo' },
      { text: 'Click en la pestaña "Registrarse"', detail: 'Está en el formulario a la derecha (o abajo en móvil)' },
      { text: 'Ingresa el código de invitación', detail: 'El organizador te lo envió — sin él no puedes registrarte' },
      { text: 'Llena usuario, nombre, email y teléfono', detail: '📱 El teléfono es OBLIGATORIO — el organizador lo necesita para contactarte' },
      { text: 'Crea tu contraseña y confirma', detail: 'Mínimo 6 caracteres' },
      { text: 'Click en "Crear mi quiniela"', detail: 'Entrarás directo al dashboard' },
    ],
    tip: '📱 En móvil: si no ves el formulario de registro, desplázate hacia ABAJO en la página. El formulario está debajo de la información del torneo.',
    visual: {
      type: 'register',
    }
  },
  {
    id: 2,
    title: 'Crea tu quiniela',
    icon: '📋',
    color: '#30d158',
    desc: 'En el dashboard puedes crear una o más quinielas y ver tu progreso de llenado.',
    steps: [
      { text: 'En el Dashboard escribe el nombre de tu quiniela', detail: 'Ej: "Mi primera quiniela" o tu nombre' },
      { text: 'Click en "Crear"', detail: 'Serás redirigido a llenar los picks' },
      { text: 'Puedes crear varias quinielas', detail: 'Cada una es independiente y compite por separado' },
      { text: 'La barra de progreso muestra cuánto te falta', detail: 'Click en ▼ para ver el desglose por fase: Grupos, R32, Octavos, etc.' },
      { text: 'Click en 🖨️ para imprimir tu quiniela en PDF', detail: 'Puedes guardarla como respaldo en tu computadora' },
    ],
    tip: '⚠️ Tienes hasta el 11 de junio antes del primer partido para completar todos tus picks. Después se bloquean permanentemente.',
    visual: { type: 'dashboard' }
  },
  {
    id: 3,
    title: 'Llena tus picks de grupos',
    icon: '⚽',
    color: '#ff9f0a',
    desc: 'Pronostica el marcador de los 72 partidos de la fase de grupos (12 grupos × 6 partidos).',
    steps: [
      { text: 'Selecciona "Grupos" y el grupo que quieres llenar', detail: 'Grupos A hasta L — 4 equipos en cada uno' },
      { text: 'Para cada partido, escribe el marcador que predices', detail: 'Ej: México 2 – Sudáfrica 1. El pick se guarda automáticamente' },
      { text: 'La tabla de clasificación se calcula sola', detail: '✅ AUTOMÁTICO: según tus picks de partidos, el sistema calcula quién queda 1ro, 2do, 3ro y 4to en cada grupo. NO necesitas seleccionar la posición manualmente' },
      { text: 'Repite para los 12 grupos', detail: '6 partidos por grupo = 72 picks en total de grupos' },
    ],
    tip: '🎯 Puntos por partido: 1pt goles local + 1pt goles visitante + 2pts resultado correcto + 1pt bonus si todo exacto = máx 5 pts. Clasificación: 1pt por cada equipo en la posición exacta (máx 4 pts por grupo = 48 pts en total).',
    visual: { type: 'match' }
  },
  {
    id: 4,
    title: 'Llena la fase eliminatoria',
    icon: '🏆',
    color: '#bf5af2',
    desc: 'Pronostica los 32 partidos eliminatorios. Los equipos se completan automáticamente según tus picks de grupos.',
    steps: [
      { text: 'Los equipos en R32 se llenan automáticamente', detail: '✅ AUTOMÁTICO: el sistema toma los 1ros y 2dos de cada grupo según TUS picks, y los ubica en el bracket. Solo necesitas poner el marcador' },
      { text: 'Escribe el marcador de cada partido', detail: 'Selecciona la fase: R32, Octavos, Cuartos, Semis, 3er Puesto, Final' },
      { text: 'Selecciona "¿Quién avanza?" si hay empate', detail: 'En eliminatoria alguien siempre pasa — elige quién avanza por penales' },
      { text: 'El bracket avanza automáticamente', detail: '✅ AUTOMÁTICO: el ganador de cada partido aparece automáticamente en la siguiente ronda según tus picks' },
      { text: 'El orden final (1ro, 2do, 3ro, 4to) es automático', detail: '✅ AUTOMÁTICO: se detecta según el resultado de la Final y el 3er Puesto' },
    ],
    tip: '🏆 El campeón vale 20 pts, subcampeón 10 pts, 3er lugar 5 pts, 4to lugar 3 pts. Puntos por partido eliminatorio: mismo sistema que grupos (máx 5 pts c/u) = máx 160 pts en toda la fase eliminatoria.',
    visual: { type: 'bracket' }
  },
  {
    id: 5,
    title: 'Sigue la tabla en vivo',
    icon: '📊',
    color: '#ffd60a',
    desc: 'Durante el Mundial los resultados se actualizan automáticamente cada 2 minutos y tus puntos suben en tiempo real.',
    steps: [
      { text: 'Click en "Tabla" en el menú superior', detail: 'Verás el ranking completo de todos los participantes' },
      { text: 'La tabla muestra puntos desglosados por columna', detail: 'POS · ANT · GR.A hasta GR.L · CLASIF · ELIM · FINAL · TOTAL · HOY' },
      { text: 'Click en cualquier jugador para ver su quiniela completa', detail: 'En modo solo lectura — no puedes modificar la suya' },
      { text: 'Los resultados y puntos se actualizan solos', detail: 'No necesitas recargar la página — Supabase Realtime actualiza en tiempo real' },
    ],
    tip: '🔒 TRANSPARENCIA: Las quinielas de otros participantes están OCULTAS hasta el inicio del Mundial (11 Jun). Esto evita que alguien copie los picks de otro. Al inicio del torneo se envía un PDF oficial con todas las quinielas a todos los participantes como auditoría. 💰 Para ver la tabla necesitas pago confirmado ($15 USD).',
    visual: { type: 'leaderboard' }
  },
  {
    id: 6,
    title: 'Pago e inscripción',
    icon: '💰',
    color: '#ff453a',
    desc: 'La inscripción es de $15 USD por quiniela. El organizador confirma el pago manualmente.',
    steps: [
      { text: 'Contacta al organizador para realizar el pago', detail: 'Transferencia, efectivo o el método que indique el organizador' },
      { text: 'El organizador confirma tu pago en el sistema', detail: 'Una vez confirmado, se desbloquea la tabla de posiciones automáticamente' },
      { text: 'Sin pago: puedes llenar tu quiniela pero no ver la tabla', detail: 'Tienes hasta el inicio del Mundial para pagar' },
      { text: 'El premio se calcula automáticamente', detail: 'Total recaudado × porcentaje de cada lugar' },
    ],
    tip: '🏆 Distribución: 🥇 1er lugar = 60% · 🥈 2do lugar = 20% · 🥉 3er lugar = 10% · 🏛️ Organización = 10%. Si hay empate en cualquier posición, el premio de ese puesto se divide en partes iguales entre los empatados.',
    visual: { type: 'payment' }
  },
]

function MockupVisual({ visual, color }) {
  if (visual.type === 'register') return (
    <div style={{ background:'#1c1c1e', borderRadius:16, padding:18, maxWidth:300, margin:'0 auto', fontSize:12 }}>
      <div style={{ fontWeight:800, fontSize:13, color:'#ffd60a', textAlign:'center', marginBottom:14 }}>🏆 Quiniela Mundial 2026</div>
      <div style={{ display:'flex', background:'rgba(255,255,255,.06)', borderRadius:8, padding:2, marginBottom:12 }}>
        {['Entrar','Registrarse'].map((t,i) => (
          <div key={t} style={{ flex:1, padding:'6px', textAlign:'center', borderRadius:6, fontSize:11, fontWeight:700, background:i===1?'linear-gradient(135deg,#ffd60a,#ff9f0a)':'none', color:i===1?'#000':'#6e6e73' }}>{t}</div>
        ))}
      </div>
      {[['🔑 Código','PANAS2026',true],['👤 Usuario','Tu nombre',false],['📧 Email','tu@email.com',false],['📱 Teléfono','+58 412 000000',true],['🔒 Contraseña','••••••••',false]].map(([label,val,hl]) => (
        <div key={label} style={{ marginBottom:7 }}>
          <div style={{ fontSize:9, color:'#6e6e73', marginBottom:2 }}>{label} {hl&&<span style={{color:'#ff453a'}}>*</span>}</div>
          <div style={{ background:hl?'rgba(255,214,10,.12)':'rgba(255,255,255,.06)', border:`1px solid ${hl?'rgba(255,214,10,.4)':'rgba(255,255,255,.1)'}`, borderRadius:7, padding:'6px 10px', fontSize:11, fontWeight:hl?700:400, color:hl?'#ffd60a':'rgba(255,255,255,.6)', letterSpacing:hl&&label.includes('Código')?2:0 }}>{val}</div>
        </div>
      ))}
      <div style={{ background:'linear-gradient(135deg,#ffd60a,#ff9f0a)', borderRadius:8, padding:'9px', textAlign:'center', fontSize:12, fontWeight:800, color:'#000', marginTop:6 }}>🏆 Crear mi quiniela</div>
      <div style={{ fontSize:9, color:'rgba(255,69,58,.7)', textAlign:'center', marginTop:6 }}>* Campos obligatorios</div>
    </div>
  )

  if (visual.type === 'match') return (
    <div style={{ background:'#fff', borderRadius:14, overflow:'hidden', maxWidth:360, margin:'0 auto', boxShadow:'0 4px 16px rgba(0,0,0,.1)', fontSize:12 }}>
      <div style={{ background:'#0071e3', color:'#fff', padding:'8px 14px', fontWeight:800, fontSize:12 }}>⚽ Grupo A — Mis Picks</div>
      {[
        { id:'A1', h:'🇲🇽 México', a:'🇿🇦 Sudáfrica', ph:2, pa:1, saved:true },
        { id:'A2', h:'🇰🇷 Rep. Corea', a:'🇨🇿 Rep. Checa', ph:null, pa:null, saved:false },
      ].map(m => (
        <div key={m.id} style={{ display:'grid', gridTemplateColumns:'36px 1fr 72px 1fr', padding:'9px 14px', borderBottom:'0.5px solid #f2f2f7', alignItems:'center', gap:6 }}>
          <span style={{ fontSize:9, color:'#aeaeb2', fontWeight:700 }}>{m.id}</span>
          <span style={{ fontSize:11, fontWeight:700 }}>{m.h}</span>
          <div style={{ display:'flex', alignItems:'center', gap:3, justifyContent:'center' }}>
            <div style={{ width:26, height:24, border:`1.5px solid ${m.saved?'#30d158':'#e5e5ea'}`, borderRadius:6, background:m.saved?'rgba(48,209,88,.08)':'#f9f9fb', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, color:m.saved?'#1a7a38':'#aeaeb2' }}>{m.ph??'–'}</div>
            <span style={{ color:'#aeaeb2', fontSize:10 }}>–</span>
            <div style={{ width:26, height:24, border:`1.5px solid ${m.saved?'#30d158':'#e5e5ea'}`, borderRadius:6, background:m.saved?'rgba(48,209,88,.08)':'#f9f9fb', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, color:m.saved?'#1a7a38':'#aeaeb2' }}>{m.pa??'–'}</div>
          </div>
          <span style={{ fontSize:11, fontWeight:700, textAlign:'right' }}>{m.a}</span>
        </div>
      ))}
      <div style={{ background:'#f0f5ff', padding:'8px 14px', borderTop:'1px solid #e5e5ea' }}>
        <div style={{ fontSize:10, color:'#0071e3', fontWeight:700, marginBottom:4 }}>📊 Clasificación (automática)</div>
        {['🥇 Sudáfrica','🥈 México','🥉 Rep. Corea','4️⃣ Rep. Checa'].map(t => (
          <div key={t} style={{ fontSize:10, color:'#6e6e73', padding:'1px 0' }}>{t}</div>
        ))}
      </div>
    </div>
  )

  if (visual.type === 'bracket') return (
    <div style={{ background:'#fff', borderRadius:14, overflow:'hidden', maxWidth:360, margin:'0 auto', boxShadow:'0 4px 16px rgba(0,0,0,.1)', fontSize:12 }}>
      <div style={{ background:'#bf5af2', color:'#fff', padding:'8px 14px', fontWeight:800, fontSize:12 }}>🏆 R32 — Dieciseisavos</div>
      {[
        { id:'M73', h:'Rep. Checa', a:'Ecuador', ph:2, pa:0, win:'Rep. Checa', auto:true },
        { id:'M74', h:'Sudáfrica', a:'Turquía', ph:null, pa:null, win:null, auto:true },
      ].map(m => (
        <div key={m.id} style={{ padding:'9px 14px', borderBottom:'0.5px solid #f2f2f7' }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
            <span style={{ fontSize:9, color:'#aeaeb2', fontWeight:700, minWidth:30 }}>{m.id}</span>
            <span style={{ fontSize:11, fontWeight:700, flex:1 }}>{m.h}</span>
            <div style={{ display:'flex', gap:2 }}>
              <div style={{ width:24, height:22, border:`1.5px solid ${m.ph!=null?'#bf5af2':'#e5e5ea'}`, borderRadius:5, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:'#bf5af2' }}>{m.ph??'–'}</div>
              <span style={{ fontSize:9, color:'#aeaeb2', alignSelf:'center' }}>–</span>
              <div style={{ width:24, height:22, border:`1.5px solid ${m.pa!=null?'#bf5af2':'#e5e5ea'}`, borderRadius:5, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:'#bf5af2' }}>{m.pa??'–'}</div>
            </div>
            <span style={{ fontSize:11, fontWeight:700, flex:1, textAlign:'right' }}>{m.a}</span>
          </div>
          {m.win && <div style={{ fontSize:10, color:'#30d158', fontWeight:700 }}>→ Avanza: {m.win}</div>}
          {m.auto && <div style={{ fontSize:9, color:'#6e6e73', fontStyle:'italic' }}>✅ Equipos asignados automáticamente</div>}
        </div>
      ))}
    </div>
  )

  if (visual.type === 'dashboard') return (
    <div style={{ background:'#fff', borderRadius:14, overflow:'hidden', maxWidth:360, margin:'0 auto', boxShadow:'0 4px 16px rgba(0,0,0,.1)', fontSize:12 }}>
      <div style={{ padding:'12px 14px', borderBottom:'0.5px solid #f2f2f7', fontWeight:800, fontSize:13 }}>👋 Hola, Wilfredo</div>
      <div style={{ padding:'10px 14px', borderBottom:'0.5px solid #f2f2f7', background:'rgba(255,159,10,.06)', fontSize:11, color:'#b06000' }}>
        ⏳ Cierre de quinielas en 4 días
      </div>
      {[{name:'Mi Quiniela 1',prog:72,total:104},{name:'Mi Quiniela 2',prog:0,total:104}].map((q,i) => (
        <div key={i} style={{ padding:'12px 14px', borderBottom:'0.5px solid #f2f2f7' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
            <span style={{ fontSize:16 }}>{q.prog===0?'📋':q.prog===q.total?'✅':'⚠️'}</span>
            <span style={{ fontWeight:700, flex:1 }}>{q.name}</span>
            <span style={{ fontSize:10, color:'#aeaeb2' }}>{q.prog}/{q.total}</span>
            <span style={{ fontSize:13 }}>🖨️</span>
          </div>
          <div style={{ background:'#f2f2f7', borderRadius:20, height:6, overflow:'hidden' }}>
            <div style={{ width:`${(q.prog/q.total)*100}%`, height:'100%', background:q.prog===0?'#e5e5ea':'#ff9f0a', borderRadius:20 }} />
          </div>
        </div>
      ))}
    </div>
  )

  if (visual.type === 'leaderboard') return (
    <div style={{ background:'#fff', borderRadius:14, overflow:'hidden', maxWidth:360, margin:'0 auto', boxShadow:'0 4px 16px rgba(0,0,0,.1)', fontSize:12 }}>
      <div style={{ background:'linear-gradient(135deg,#ffd60a,#ff9f0a)', padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontWeight:800, fontSize:13, color:'#000' }}>💰 Premio: $270</span>
        <div style={{ display:'flex', gap:10, fontSize:11, color:'rgba(0,0,0,.7)' }}>
          <span>🥇$162</span><span>🥈$54</span><span>🥉$27</span>
        </div>
      </div>
      {[{pos:1,name:'Carlos M.',grp:42,elim:12,total:54},{pos:2,name:'Diana F.',grp:38,elim:10,total:48},{pos:3,name:'Tú',grp:35,elim:8,total:43,isMe:true}].map((r,i) => (
        <div key={i} style={{ display:'flex', alignItems:'center', padding:'9px 14px', borderBottom:'0.5px solid #f2f2f7', gap:8, background:r.isMe?'rgba(0,113,227,.04)':'#fff' }}>
          <span style={{ fontWeight:800, fontSize:15, width:22 }}>{['🥇','🥈','🥉'][i]}</span>
          <span style={{ flex:1, fontWeight:700, fontSize:12 }}>
            {r.name}
            {r.isMe && <span style={{ marginLeft:5, fontSize:9, background:'rgba(0,113,227,.12)', color:'#0071e3', padding:'1px 4px', borderRadius:4, fontWeight:700 }}>TÚ</span>}
          </span>
          <span style={{ fontSize:10, color:'#6e6e73' }}>Grp:{r.grp} El:{r.elim}</span>
          <span style={{ fontSize:16, fontWeight:800, color:'#0071e3' }}>{r.total}</span>
        </div>
      ))}
    </div>
  )

  if (visual.type === 'payment') return (
    <div style={{ background:'linear-gradient(135deg,#1c1c1e,#2c2c2e)', borderRadius:16, padding:18, maxWidth:300, margin:'0 auto' }}>
      <div style={{ textAlign:'center', marginBottom:14 }}>
        <div style={{ fontSize:36, marginBottom:6 }}>💰</div>
        <div style={{ fontSize:10, color:'rgba(255,255,255,.5)', textTransform:'uppercase', letterSpacing:'.5px' }}>Inscripción por quiniela</div>
        <div style={{ fontSize:32, fontWeight:900, color:'#ffd60a' }}>$15 USD</div>
      </div>
      {[['🥇','1er lugar','60%','Si hay empate: se divide'],['🥈','2do lugar','20%','entre los empatados'],['🥉','3er lugar','10%',''],['🏛️','Organización','10%','']].map(([medal,label,pct,note]) => (
        <div key={label} style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(255,255,255,.06)', borderRadius:8, padding:'8px 10px', marginBottom:5 }}>
          <span style={{ fontSize:16 }}>{medal}</span>
          <span style={{ flex:1, fontSize:11, color:'rgba(255,255,255,.7)' }}>{label}{note&&<span style={{fontSize:9,color:'rgba(255,214,10,.6)',display:'block'}}>{note}</span>}</span>
          <span style={{ fontSize:13, fontWeight:800, color:'#ffd60a' }}>{pct}</span>
        </div>
      ))}
    </div>
  )

  return null
}

export default function GuidePage() {
  const [activeStep, setActiveStep] = useState(0)
  const navigate = useNavigate()
  const { user } = useAuth()
  const step = STEPS[activeStep]

  return (
    <div style={{ minHeight:'100vh', background:'#f5f5f7', fontFamily:'-apple-system,"DM Sans",sans-serif' }}>
      <div style={{ background:'#fff', borderBottom:'0.5px solid rgba(0,0,0,.08)', padding:'12px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:50 }}>
        <div style={{ fontWeight:800, fontSize:15 }}>📖 Guía de uso</div>
        <button onClick={() => navigate(user ? '/' : '/login')}
          style={{ border:'none', background:'none', cursor:'pointer', color:'#0071e3', fontWeight:600, fontSize:13, fontFamily:'inherit' }}>
          {user ? '← Mis quinielas' : '← Inicio'}
        </button>
      </div>

      <div style={{ maxWidth:900, margin:'0 auto', padding:'24px 16px 60px' }}>
        <div style={{ textAlign:'center', marginBottom:24 }}>
          <h1 style={{ fontSize:24, fontWeight:900, letterSpacing:'-.5px', marginBottom:6 }}>🏆 Cómo usar la Quiniela Mundial 2026</h1>
          <p style={{ color:'#6e6e73', fontSize:13 }}>Guía completa · {STEPS.length} pasos</p>
        </div>

        <div style={{ display:'flex', gap:5, justifyContent:'center', marginBottom:20, flexWrap:'wrap' }}>
          {STEPS.map((s, i) => (
            <button key={i} onClick={() => setActiveStep(i)}
              style={{ width:34, height:34, borderRadius:'50%', border:`2px solid ${i===activeStep?s.color:i<activeStep?'#30d158':'#e5e5ea'}`,
                background: i===activeStep?s.color:i<activeStep?'#30d158':'#fff',
                color: i<=activeStep?'#fff':'#aeaeb2', fontWeight:800, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
              {i < activeStep ? '✓' : i+1}
            </button>
          ))}
        </div>

        <div style={{ background:'#fff', borderRadius:18, border:'0.5px solid rgba(0,0,0,.08)', boxShadow:'0 4px 24px rgba(0,0,0,.08)', overflow:'hidden', marginBottom:14 }}>
          <div style={{ background:`linear-gradient(135deg,${step.color},${step.color}cc)`, padding:'22px 26px', color:'#fff' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
              <span style={{ fontSize:28 }}>{step.icon}</span>
              <div>
                <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.5px', opacity:.7 }}>Paso {step.id} de {STEPS.length}</div>
                <h2 style={{ fontSize:20, fontWeight:900, letterSpacing:'-.3px' }}>{step.title}</h2>
              </div>
            </div>
            <p style={{ fontSize:13, opacity:.85, lineHeight:1.6 }}>{step.desc}</p>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))' }}>
            <div style={{ padding:'22px 26px', borderRight:'0.5px solid rgba(0,0,0,.06)' }}>
              <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.4px', color:'#6e6e73', marginBottom:14 }}>Instrucciones</div>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {step.steps.map((s, i) => (
                  <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                    <div style={{ width:22, height:22, borderRadius:'50%', background:`${step.color}15`, border:`2px solid ${step.color}40`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:10, fontWeight:800, color:step.color }}>
                      {i+1}
                    </div>
                    <div>
                      <div style={{ fontSize:12, fontWeight:700, color:'#1d1d1f', marginBottom:2 }}>{s.text}</div>
                      <div style={{ fontSize:11, color:'#6e6e73', lineHeight:1.5 }}>{s.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:16, background:`${step.color}08`, border:`1px solid ${step.color}20`, borderRadius:10, padding:'10px 12px', fontSize:11, color:'#1d1d1f', lineHeight:1.6 }}>
                {step.tip}
              </div>
            </div>

            <div style={{ padding:'22px 26px', background:'#fafafa', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <MockupVisual visual={step.visual} color={step.color} />
            </div>
          </div>
        </div>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <button onClick={() => setActiveStep(Math.max(0,activeStep-1))} disabled={activeStep===0}
            style={{ padding:'9px 18px', border:'0.5px solid rgba(0,0,0,.12)', borderRadius:10, background:'#fff', cursor:activeStep===0?'not-allowed':'pointer', fontSize:13, fontWeight:600, fontFamily:'inherit', opacity:activeStep===0?.4:1 }}>
            ← Anterior
          </button>
          <span style={{ fontSize:12, color:'#6e6e73' }}>{activeStep+1} / {STEPS.length}</span>
          {activeStep < STEPS.length-1 ? (
            <button onClick={() => setActiveStep(activeStep+1)}
              style={{ padding:'9px 18px', background:step.color, color:'#fff', border:'none', borderRadius:10, cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:'inherit' }}>
              Siguiente →
            </button>
          ) : (
            <button onClick={() => navigate(user?'/':'/login')}
              style={{ padding:'9px 18px', background:'#30d158', color:'#fff', border:'none', borderRadius:10, cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:'inherit' }}>
              ✅ ¡Listo!
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
