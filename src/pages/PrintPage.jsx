import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase, getQuinielaPicks } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// ── Datos del fixture ────────────────────────────────────────────
const GROUPS = {
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

const GROUP_MATCHES = {}
Object.entries(GROUPS).forEach(([g, teams]) => {
  GROUP_MATCHES[g] = [
    {id:`${g}1`, h:teams[0], a:teams[1]},
    {id:`${g}2`, h:teams[2], a:teams[3]},
    {id:`${g}3`, h:teams[0], a:teams[2]},
    {id:`${g}4`, h:teams[3], a:teams[1]},
    {id:`${g}5`, h:teams[3], a:teams[0]},
    {id:`${g}6`, h:teams[1], a:teams[2]},
  ]
})

// Equipos fijos R32 (fallback cuando hTeam/aTeam no está guardado)
const R32_STATIC = {
  M73:{h:"2º Gr.A",a:"2º Gr.B"}, M74:{h:"Alemania(1E)",a:"3º BCEF"},
  M75:{h:"P.Bajos(1F)",a:"2º Gr.C"}, M76:{h:"Brasil(1C)",a:"2º Gr.F"},
  M77:{h:"Francia(1I)",a:"3º GHIJ"}, M78:{h:"2º Gr.E",a:"2º Gr.I"},
  M79:{h:"México(1A)",a:"3º ABCD"}, M80:{h:"Inglaterra(1L)",a:"3º IJKL"},
  M81:{h:"EE.UU.(1D)",a:"3º ABCD"}, M82:{h:"Bélgica(1G)",a:"3º EFGH"},
  M83:{h:"2º Gr.K",a:"2º Gr.L"}, M84:{h:"España(1H)",a:"2º Gr.J"},
  M85:{h:"Canadá(1B)",a:"3º ABCD"}, M86:{h:"Argentina(1J)",a:"2º Gr.H"},
  M87:{h:"Portugal(1K)",a:"3º IJKL"}, M88:{h:"2º Gr.D",a:"2º Gr.G"},
}

// Bracket estructura completa
const BRACKET_STRUCTURE = {
  // R32 izquierda (top→bottom)
  L: {
    r32:  ['M73','M74','M75','M76','M77','M78','M79','M80'],
    r16:  ['M89','M90','M91','M92'],
    qf:   ['M97','M98'],
    sf:   ['M101'],
  },
  // R32 derecha (top→bottom)
  R: {
    r32:  ['M81','M82','M83','M84','M85','M86','M87','M88'],
    r16:  ['M93','M94','M95','M96'],
    qf:   ['M99','M100'],
    sf:   ['M102'],
  },
  center: { final: 'M104', third: 'M103' },
}

// Labels de fase
const PHASE_LABELS = { r32:'R32', r16:'Octavos', qf:'Cuartos', sf:'Semis', final:'Final', third:'3er Puesto' }

// ── Colores ──────────────────────────────────────────────────────
const C = {
  blue:    '#0055d4',
  blueLt:  '#e8f0fe',
  orange:  '#e07b00',
  orangeLt:'#fff3e0',
  green:   '#1e7e34',
  greenLt: '#e8f5e9',
  gray:    '#6b7280',
  grayLt:  '#f3f4f6',
  border:  '#d1d5db',
  white:   '#ffffff',
  dark:    '#111827',
  mid:     '#374151',
}

// ── Componentes ──────────────────────────────────────────────────

function ScoreBadge({ score, color = C.blue }) {
  if (score == null) return <span style={{ color: C.gray, fontSize: 9, fontStyle: 'italic' }}>–</span>
  return (
    <span style={{
      fontWeight: 800, fontSize: 13, color,
      background: color + '18',
      padding: '1px 7px', borderRadius: 5,
      fontVariantNumeric: 'tabular-nums',
      letterSpacing: '-0.5px',
    }}>{score}</span>
  )
}

function GroupsSection({ picks }) {
  const groupEntries = Object.entries(GROUP_MATCHES)
  // 3 grupos por columna, 4 columnas → 12 grupos en 2 páginas de 2 filas × 3 cols
  // Renderizamos en bloques de 6 (una página A4 portrait)
  const page1 = groupEntries.slice(0, 6)
  const page2 = groupEntries.slice(6, 12)

  return (
    <>
      <GroupPage groups={page1} picks={picks} pageNum={1} />
      <div className="page-break" />
      <GroupPage groups={page2} picks={picks} pageNum={2} />
    </>
  )
}

function GroupPage({ groups, picks, pageNum }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, padding: '0 0 8px' }}>
      {groups.map(([g, matches]) => (
        <div key={g} style={{ breakInside: 'avoid' }}>
          {/* Encabezado grupo */}
          <div style={{
            background: `linear-gradient(135deg, ${C.blue}, #003a9e)`,
            color: '#fff', padding: '7px 10px',
            borderRadius: '8px 8px 0 0',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontWeight: 900, fontSize: 13, letterSpacing: '.5px' }}>GRUPO {g}</span>
            <span style={{ fontSize: 9, opacity: .75, fontWeight: 600 }}>
              {matches.filter(m => picks[m.id]?.h != null).length}/6
            </span>
          </div>
          {/* Equipos */}
          <div style={{
            background: C.blueLt, padding: '4px 10px 5px',
            borderLeft: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}`,
          }}>
            {GROUPS[g].map((t, i) => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '1px 0' }}>
                <span style={{
                  width: 14, height: 14, borderRadius: 3, background: [C.blue, C.orange, C.green, '#9333ea'][i],
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 7, fontWeight: 800, flexShrink: 0,
                }}>{i + 1}</span>
                <span style={{ fontSize: 9, fontWeight: 600, color: C.mid }}>{t}</span>
              </div>
            ))}
          </div>
          {/* Partidos */}
          <table style={{ width: '100%', borderCollapse: 'collapse', border: `1px solid ${C.border}`, borderTop: 'none' }}>
            <thead>
              <tr style={{ background: C.grayLt }}>
                <th style={thS}>ID</th>
                <th style={{ ...thS, textAlign: 'left' }}>Local</th>
                <th style={{ ...thS, color: C.blue }}>Pick</th>
                <th style={{ ...thS, textAlign: 'right' }}>Visitante</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((m, i) => {
                const pk = picks[m.id]
                const hasPick = pk?.h != null
                return (
                  <tr key={m.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa', borderTop: `0.5px solid ${C.border}` }}>
                    <td style={{ ...tdS, color: C.gray, fontWeight: 700, width: 28 }}>{m.id}</td>
                    <td style={{ ...tdS, fontWeight: 600, maxWidth: 70 }}>
                      <span style={{ fontSize: 10, whiteSpace: 'nowrap', overflow: 'hidden', display: 'block', textOverflow: 'ellipsis' }}>{m.h}</span>
                    </td>
                    <td style={{ ...tdS, textAlign: 'center' }}>
                      {hasPick
                        ? <span style={{ fontWeight: 900, fontSize: 12, color: C.blue }}>
                            {pk.h}<span style={{ color: C.gray, margin: '0 2px' }}>–</span>{pk.a}
                          </span>
                        : <span style={{ color: '#c7c7cc', fontSize: 8, fontStyle: 'italic' }}>sin pick</span>
                      }
                    </td>
                    <td style={{ ...tdS, fontWeight: 600, textAlign: 'right', maxWidth: 70 }}>
                      <span style={{ fontSize: 10, whiteSpace: 'nowrap', overflow: 'hidden', display: 'block', textOverflow: 'ellipsis', textAlign: 'right' }}>{m.a}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}

// ── Bracket visual ───────────────────────────────────────────────

function BracketMatch({ matchId, picks, compact = false }) {
  const pk = picks[matchId] || {}
  const hasPick = pk.h != null
  const hasWin = !!pk.win

  // Usar hTeam/aTeam guardado; si no, fallback al fixture estático R32
  const staticTeams = R32_STATIC[matchId] || {}
  const h = pk.hTeam || staticTeams.h || null
  const a = pk.aTeam || staticTeams.a || null

  return (
    <div style={{
      border: `1.5px solid ${hasPick ? C.blue : C.border}`,
      borderRadius: 7, overflow: 'hidden', background: '#fff',
      boxShadow: hasPick ? `0 0 0 2px ${C.blue}22` : 'none',
      minWidth: compact ? 110 : 130,
      fontSize: 9,
    }}>
      {/* Match ID header */}
      <div style={{
        background: hasPick ? C.blue : C.grayLt,
        color: hasPick ? '#fff' : C.gray,
        padding: '2px 6px', fontSize: 8, fontWeight: 700,
        display: 'flex', justifyContent: 'space-between',
      }}>
        <span>{matchId}</span>
        {hasPick && (
          <span style={{ fontWeight: 900, letterSpacing: '-0.5px' }}>
            {pk.h}–{pk.a}
          </span>
        )}
      </div>
      {/* Team rows */}
      {[{ team: h, score: pk.h, isHome: true }, { team: a, score: pk.a, isHome: false }].map(({ team, score, isHome }) => (
        <div key={isHome ? 'h' : 'a'} style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '4px 6px',
          borderTop: isHome ? 'none' : `0.5px solid ${C.border}`,
          background: pk.win === team && team ? C.greenLt : '#fff',
          minHeight: 24,
        }}>
          <span style={{
            flex: 1, fontSize: 9, fontWeight: pk.win === team && team ? 700 : 500,
            color: pk.win === team && team ? C.green : team ? C.dark : C.gray,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {team || <em style={{ color: C.gray, fontStyle: 'italic', fontSize: 8 }}>TBD</em>}
          </span>
          {team && score != null && (
            <span style={{
              fontSize: 10, fontWeight: 800, color: C.blue,
              background: C.blueLt, borderRadius: 3, padding: '0 4px', minWidth: 16, textAlign: 'center',
            }}>{score}</span>
          )}
          {pk.win === team && team && (
            <span style={{ fontSize: 7, color: C.green }}>✓</span>
          )}
        </div>
      ))}
    </div>
  )
}

function BracketColumn({ title, matchIds, picks, compact }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: compact ? 120 : 145 }}>
      <div style={{
        fontSize: 8, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.8px',
        color: C.blue, padding: '0 0 6px', textAlign: 'center', whiteSpace: 'nowrap',
      }}>{title}</div>
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 6,
        justifyContent: 'space-around', flex: 1, width: '100%', alignItems: 'center',
      }}>
        {matchIds.map(mid => (
          <BracketMatch key={mid} matchId={mid} picks={picks} compact={compact} />
        ))}
      </div>
    </div>
  )
}

// Conector visual entre columnas
function Connector() {
  return (
    <div style={{
      width: 16, alignSelf: 'stretch',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <div style={{ width: 1, height: '60%', background: `${C.border}`, borderRadius: 1 }} />
    </div>
  )
}

function BracketSection({ picks }) {
  const S = BRACKET_STRUCTURE
  return (
    <div style={{ overflowX: 'auto', overflowY: 'visible' }}>
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 0, minWidth: 1100 }}>

        {/* ── LADO IZQUIERDO ── */}
        <BracketColumn title="R32" matchIds={S.L.r32} picks={picks} />
        <Connector />
        <BracketColumn title="Octavos" matchIds={S.L.r16} picks={picks} />
        <Connector />
        <BracketColumn title="Cuartos" matchIds={S.L.qf} picks={picks} />
        <Connector />
        <BracketColumn title="Semis" matchIds={S.L.sf} picks={picks} />
        <Connector />

        {/* ── CENTRO ── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, minWidth: 145, padding: '0 4px' }}>
          {/* Final */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: 8, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.8px',
              color: '#fff', background: `linear-gradient(135deg, ${C.blue}, #003a9e)`,
              padding: '3px 10px', borderRadius: '6px 6px 0 0', marginBottom: 0,
            }}>🏆 Gran Final · 19 Jul</div>
            <BracketMatch matchId="M104" picks={picks} />
          </div>

          {/* Separador */}
          <div style={{ width: '60%', height: 1, background: C.border }} />

          {/* 3er puesto */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: 8, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.8px',
              color: C.orange, padding: '3px 0 4px',
            }}>🥉 3er Puesto · 18 Jul</div>
            <BracketMatch matchId="M103" picks={picks} />
          </div>

          {/* Orden final picks */}
          <OrdinalPicks picks={picks} />
        </div>

        {/* ── LADO DERECHO ── */}
        <Connector />
        <BracketColumn title="Semis" matchIds={S.R.sf} picks={picks} />
        <Connector />
        <BracketColumn title="Cuartos" matchIds={S.R.qf} picks={picks} />
        <Connector />
        <BracketColumn title="Octavos" matchIds={S.R.r16} picks={picks} />
        <Connector />
        <BracketColumn title="R32" matchIds={S.R.r32} picks={picks} />
      </div>
    </div>
  )
}

function OrdinalPicks({ picks }) {
  // Intentar extraer campeón/sub/3ro/4to de los picks de Final y 3er puesto
  const fin = picks['M104'] || {}
  const t3  = picks['M103'] || {}

  const rows = [
    { emoji: '🏆', label: 'Campeón',    pts: 20, val: fin.win || fin.hTeam || '–' },
    { emoji: '🥈', label: 'Subcampeón', pts: 10, val: fin.aTeam || '–' },
    { emoji: '🥉', label: '3er lugar',  pts: 5,  val: t3.win || t3.hTeam || '–' },
    { emoji: '4️⃣', label: '4to lugar',  pts: 3,  val: t3.aTeam || '–' },
  ]

  return (
    <div style={{
      border: `1.5px solid ${C.blue}44`, borderRadius: 8, overflow: 'hidden',
      background: '#fff', width: '100%',
    }}>
      <div style={{
        background: `linear-gradient(135deg, ${C.blue}, #003a9e)`,
        color: '#fff', fontSize: 8, fontWeight: 700, padding: '4px 8px',
        textTransform: 'uppercase', letterSpacing: '.5px',
      }}>🏅 Orden Final</div>
      {rows.map(r => (
        <div key={r.label} style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '3px 7px', borderTop: `0.5px solid ${C.border}`,
        }}>
          <span style={{ fontSize: 9 }}>{r.emoji}</span>
          <span style={{ flex: 1, fontSize: 8, color: C.mid, fontWeight: 600 }}>{r.label}</span>
          <span style={{ fontSize: 8, fontWeight: 800, color: C.blue,
            background: C.blueLt, borderRadius: 3, padding: '0 4px' }}>{r.pts}p</span>
          <span style={{ fontSize: 8, fontWeight: 700, color: C.dark, maxWidth: 70,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.val}</span>
        </div>
      ))}
    </div>
  )
}

// ── Estilos utilitarios ──────────────────────────────────────────
const thS = {
  padding: '4px 6px', fontSize: 8, fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '.3px', color: '#9ca3af',
  textAlign: 'center', borderBottom: `0.5px solid #e5e7eb`,
}
const tdS = { padding: '4px 6px', fontSize: 10 }

// ── Page Header reusable ─────────────────────────────────────────
function PageHeader({ quiniela, profile, filledCount, section, sectionColor }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      marginBottom: 12, paddingBottom: 10,
      borderBottom: `2px solid ${sectionColor}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: `linear-gradient(135deg, ${C.blue}, #003a9e)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, flexShrink: 0,
        }}>🏆</div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 900, color: C.dark, letterSpacing: '-0.5px' }}>
            Mundial FIFA 2026
          </div>
          <div style={{ fontSize: 11, color: C.gray, fontWeight: 600, marginTop: 1 }}>
            {profile?.username}{profile?.full_name ? ` · ${profile.full_name}` : ''} · {quiniela?.name}
          </div>
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{
          fontSize: 11, fontWeight: 800, color: sectionColor,
          background: sectionColor + '18', borderRadius: 6, padding: '3px 10px',
          textTransform: 'uppercase', letterSpacing: '.5px',
        }}>{section}</div>
        <div style={{ fontSize: 9, color: C.gray, marginTop: 4 }}>
          {filledCount}/104 picks · {new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
      </div>
    </div>
  )
}

// ── Página principal ─────────────────────────────────────────────
export default function PrintPage() {
  const { id: quinielaId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [quiniela, setQuiniela] = useState(null)
  const [picks, setPicks]       = useState({})
  const [profile, setProfile]   = useState(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => { load() }, [quinielaId])

  async function load() {
    const [{ data: q }, savedPicks] = await Promise.all([
      supabase.from('quinielas').select('*, profiles(username, full_name)').eq('id', quinielaId).single(),
      getQuinielaPicks(quinielaId),
    ])
    setQuiniela(q)
    setProfile(q?.profiles)
    setPicks(savedPicks)
    setLoading(false)
    setTimeout(() => window.print(), 900)
  }

  const filledCount = Object.values(picks).filter(p => p?.h != null).length

  if (loading) return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100vh',
      fontFamily: '"SF Pro Display", "Helvetica Neue", Arial, sans-serif', color: C.gray, gap: 12,
    }}>
      <div style={{ fontSize: 32 }}>🏆</div>
      <div style={{ fontWeight: 700, fontSize: 14 }}>Preparando impresión...</div>
    </div>
  )

  return (
    <div style={{
      fontFamily: '"SF Pro Display", "Helvetica Neue", Arial, sans-serif',
      fontSize: 11, color: C.dark, background: '#fff',
    }}>

      {/* ── Controles (ocultos al imprimir) ── */}
      <div className="no-print" style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 100,
        display: 'flex', gap: 10, flexDirection: 'column', alignItems: 'flex-end',
      }}>
        <div style={{ fontSize: 11, color: C.gray, textAlign: 'right', maxWidth: 240,
          background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8,
          padding: '8px 12px', lineHeight: 1.5,
        }}>
          💡 <strong>Tip:</strong> Al imprimir, selecciona <em>"Sin márgenes"</em> y activa <em>"Gráficos de fondo"</em>.
          La llave se imprimirá en <strong>horizontal</strong>.
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => navigate(-1)} style={{
            padding: '10px 16px', background: C.grayLt, color: C.dark,
            border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 13,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>← Volver</button>
          <button onClick={() => window.print()} style={{
            padding: '10px 22px', background: C.blue, color: '#fff',
            border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13,
            cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: `0 4px 16px ${C.blue}44`,
          }}>🖨️ Imprimir / Guardar PDF</button>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .page-break { page-break-before: always; }
          .bracket-page { page-break-before: always; }
        }
        /* Páginas de grupos: portrait A4 */
        @page :not(.landscape) {
          margin: 1.2cm;
          size: A4 portrait;
        }
        /* Página de bracket: landscape A4 */
        @page .landscape {
          margin: 1cm;
          size: A4 landscape;
        }
        @page {
          margin: 1.2cm;
          size: A4 portrait;
        }
      `}</style>

      {/* ══ PÁGINAS DE GRUPOS (portrait) ══ */}
      {/* Página 1: Grupos A–F */}
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 20px 16px' }}>
        <PageHeader quiniela={quiniela} profile={profile} filledCount={filledCount}
          section="Fase de Grupos · A–F" sectionColor={C.blue} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {Object.entries(GROUP_MATCHES).slice(0, 6).map(([g, matches]) => (
            <GroupCard key={g} g={g} matches={matches} picks={picks} />
          ))}
        </div>
        <PageFooter profile={profile} quiniela={quiniela} />
      </div>

      {/* Página 2: Grupos G–L */}
      <div className="page-break" style={{ maxWidth: 860, margin: '0 auto', padding: '24px 20px 16px' }}>
        <PageHeader quiniela={quiniela} profile={profile} filledCount={filledCount}
          section="Fase de Grupos · G–L" sectionColor={C.blue} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {Object.entries(GROUP_MATCHES).slice(6, 12).map(([g, matches]) => (
            <GroupCard key={g} g={g} matches={matches} picks={picks} />
          ))}
        </div>
        <PageFooter profile={profile} quiniela={quiniela} />
      </div>

      {/* ══ PÁGINA DE BRACKET (landscape) ══ */}
      <div className="bracket-page" style={{ padding: '16px 18px' }}>

        {/* Header compacto */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 10, paddingBottom: 8,
          borderBottom: `2px solid ${C.orange}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>🏆</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 900, color: C.dark }}>Fase Eliminatoria — Mundial FIFA 2026</div>
              <div style={{ fontSize: 10, color: C.gray }}>
                {profile?.username}{profile?.full_name ? ` · ${profile.full_name}` : ''} · {quiniela?.name}
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontSize: 10, fontWeight: 800, color: C.orange,
              background: C.orangeLt, borderRadius: 6, padding: '3px 10px',
              textTransform: 'uppercase', letterSpacing: '.5px', display: 'inline-block',
            }}>Llave Completa</div>
            <div style={{ fontSize: 9, color: C.gray, marginTop: 3 }}>
              {filledCount}/104 picks · {new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          </div>
        </div>

        {/* Leyenda de fases */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
          {[
            ['R32', '28 Jun – 3 Jul', C.blue],
            ['Octavos', '4 – 7 Jul', C.blue],
            ['Cuartos', '9 – 11 Jul', C.blue],
            ['Semis', '14 – 15 Jul', C.orange],
            ['Final', '19 Jul', '#9333ea'],
          ].map(([phase, dates, color]) => (
            <div key={phase} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
              <span style={{ fontSize: 9, fontWeight: 700, color: C.dark }}>{phase}</span>
              <span style={{ fontSize: 8, color: C.gray }}>{dates}</span>
            </div>
          ))}
        </div>

        {/* Bracket */}
        <BracketSection picks={picks} />

        <PageFooter profile={profile} quiniela={quiniela} />
      </div>
    </div>
  )
}

// ── Subcomponentes ───────────────────────────────────────────────

function GroupCard({ g, matches, picks }) {
  const picksCount = matches.filter(m => picks[m.id]?.h != null).length
  return (
    <div style={{ breakInside: 'avoid' }}>
      <div style={{
        background: `linear-gradient(135deg, ${C.blue}, #003a9e)`,
        color: '#fff', padding: '6px 10px',
        borderRadius: '8px 8px 0 0',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontWeight: 900, fontSize: 12, letterSpacing: '.5px' }}>GRUPO {g}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {GROUPS[g].map((t, i) => (
            <span key={t} style={{
              fontSize: 7, fontWeight: 600, opacity: .8,
              borderLeft: i > 0 ? '0.5px solid rgba(255,255,255,.3)' : 'none',
              paddingLeft: i > 0 ? 4 : 0,
            }}>{t.split(' ')[0]}</span>
          ))}
          <span style={{ fontSize: 9, opacity: .7, fontWeight: 600, marginLeft: 4 }}>{picksCount}/6</span>
        </div>
      </div>
      {/* Teams strip */}
      <div style={{
        background: C.blueLt, padding: '3px 8px',
        borderLeft: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}`,
        display: 'flex', gap: 6,
      }}>
        {GROUPS[g].map((t, i) => (
          <span key={t} style={{ fontSize: 8, color: C.mid, display: 'flex', alignItems: 'center', gap: 2 }}>
            <span style={{
              width: 11, height: 11, borderRadius: 2,
              background: [C.blue, C.orange, C.green, '#9333ea'][i],
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 6, fontWeight: 800,
            }}>{i + 1}</span>
            {t}
          </span>
        ))}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', border: `1px solid ${C.border}`, borderTop: 'none' }}>
        <thead>
          <tr style={{ background: C.grayLt }}>
            <th style={thS}>ID</th>
            <th style={{ ...thS, textAlign: 'left', paddingLeft: 8 }}>Local</th>
            <th style={{ ...thS, color: C.blue }}>Pick</th>
            <th style={{ ...thS, textAlign: 'right', paddingRight: 8 }}>Visitante</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((m, i) => {
            const pk = picks[m.id]
            const hasPick = pk?.h != null
            return (
              <tr key={m.id} style={{
                background: i % 2 === 0 ? '#fff' : '#fafafa',
                borderTop: `0.5px solid ${C.border}`,
              }}>
                <td style={{ ...tdS, color: C.gray, fontWeight: 700, width: 26, fontSize: 9 }}>{m.id}</td>
                <td style={{ ...tdS, fontWeight: 600, maxWidth: 80, fontSize: 10 }}>
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', display: 'block', textOverflow: 'ellipsis' }}>{m.h}</span>
                </td>
                <td style={{ ...tdS, textAlign: 'center' }}>
                  {hasPick
                    ? <span style={{ fontWeight: 900, fontSize: 12, color: C.blue }}>
                        {pk.h}<span style={{ color: C.gray, margin: '0 1px' }}>–</span>{pk.a}
                      </span>
                    : <span style={{ color: '#d1d5db', fontSize: 8, fontStyle: 'italic' }}>–</span>
                  }
                </td>
                <td style={{ ...tdS, fontWeight: 600, textAlign: 'right', maxWidth: 80, fontSize: 10 }}>
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', display: 'block', textOverflow: 'ellipsis', textAlign: 'right' }}>{m.a}</span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function PageFooter({ profile, quiniela }) {
  return (
    <div style={{
      marginTop: 14, paddingTop: 8,
      borderTop: `0.5px solid ${C.border}`,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    }}>
      <span style={{ fontSize: 8, color: C.gray }}>
        🏆 Quiniela Mundial FIFA 2026 · {profile?.username} · {quiniela?.name}
      </span>
      <span style={{ fontSize: 8, color: C.gray }}>
        quiniela2026panas.netlify.app · {new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
      </span>
    </div>
  )
}
