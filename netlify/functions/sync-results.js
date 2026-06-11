// netlify/functions/sync-results.js
// Sync automático cada 2 minutos via Netlify Scheduled Functions
// Usa Free API Live Football Data (RapidAPI) — leagueId: 914609

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const RAPIDAPI_KEY  = process.env.RAPIDAPI_KEY
const RAPIDAPI_HOST = 'free-api-live-football-data.p.rapidapi.com'
const WC_LEAGUE_ID  = 914609

// Mapa de nombres de equipos de la API → nombres en nuestra BD
const TEAM_NAME_MAP = {
  // Grupo A
  'Mexico': 'México', 'South Korea': 'Rep. de Corea', 'South Africa': 'Sudáfrica', 'Czech Republic': 'Rep. Checa', 'Czechia': 'Rep. Checa',
  // Grupo B
  'Canada': 'Canadá', 'Switzerland': 'Suiza', 'Qatar': 'Catar', 'Bosnia and Herzegovina': 'Bosnia', 'Bosnia': 'Bosnia',
  // Grupo C
  'Brazil': 'Brasil', 'Morocco': 'Marruecos', 'Scotland': 'Escocia', 'Haiti': 'Haití',
  // Grupo D
  'USA': 'EE. UU.', 'United States': 'EE. UU.', 'Paraguay': 'Paraguay', 'Australia': 'Australia', 'Turkey': 'Turquía', 'Türkiye': 'Turquía',
  // Grupo E
  'Germany': 'Alemania', 'Ecuador': 'Ecuador', "Ivory Coast": 'Costa de Marfil', "Côte d'Ivoire": 'Costa de Marfil', 'Curaçao': 'Curazao', 'Curacao': 'Curazao',
  // Grupo F
  'Netherlands': 'Países Bajos', 'Japan': 'Japón', 'Sweden': 'Suecia', 'Tunisia': 'Túnez',
  // Grupo G
  'Belgium': 'Bélgica', 'Iran': 'RI de Irán', 'Egypt': 'Egipto', 'New Zealand': 'Nueva Zelanda',
  // Grupo H
  'Spain': 'España', 'Uruguay': 'Uruguay', 'Saudi Arabia': 'Arabia Saudí', 'Cape Verde': 'Islas de Cabo Verde',
  // Grupo I
  'France': 'Francia', 'Senegal': 'Senegal', 'Norway': 'Noruega', 'Iraq': 'Irak',
  // Grupo J
  'Argentina': 'Argentina', 'Austria': 'Austria', 'Jordan': 'Jordania', 'Algeria': 'Argelia',
  // Grupo K
  'Portugal': 'Portugal', 'Colombia': 'Colombia', 'DR Congo': 'RD Congo', 'Congo DR': 'RD Congo', 'Uzbekistan': 'Uzbekistán',
  // Grupo L
  'England': 'Inglaterra', 'Croatia': 'Croacia', 'Ghana': 'Ghana', 'Panama': 'Panamá',
  // Alias adicionales
  'Nigeria': 'Nigeria', 'Costa Rica': 'Costa Rica',
}

function normalizeName(name) {
  return TEAM_NAME_MAP[name] || name
}

// Partidos del Mundial por fase y equipos — para identificar match_id
const MATCH_LOOKUP = {
  // GRUPOS
  // Grupo A
  'México-Sudáfrica': 'A1', 'Rep. de Corea-Rep. Checa': 'A2', 'México-Rep. de Corea': 'A3',
  'Rep. Checa-Sudáfrica': 'A4', 'Rep. Checa-México': 'A5', 'Sudáfrica-Rep. de Corea': 'A6',
  // Grupo B
  'Canadá-Bosnia': 'B1', 'Catar-Suiza': 'B2', 'Canadá-Catar': 'B3',
  'Suiza-Bosnia': 'B4', 'Suiza-Canadá': 'B5', 'Bosnia-Catar': 'B6',
  // Grupo C
  'Brasil-Marruecos': 'C1', 'Haití-Escocia': 'C2', 'Brasil-Haití': 'C3',
  'Escocia-Marruecos': 'C4', 'Escocia-Brasil': 'C5', 'Marruecos-Haití': 'C6',
  // Grupo D
  'EE. UU.-Paraguay': 'D1', 'Australia-Turquía': 'D2', 'EE. UU.-Australia': 'D3',
  'Turquía-Paraguay': 'D4', 'Turquía-EE. UU.': 'D5', 'Paraguay-Australia': 'D6',
  // Grupo E
  'Alemania-Curazao': 'E1', 'Costa de Marfil-Ecuador': 'E2', 'Alemania-Costa de Marfil': 'E3',
  'Ecuador-Curazao': 'E4', 'Ecuador-Alemania': 'E5', 'Curazao-Costa de Marfil': 'E6',
  // Grupo F
  'Países Bajos-Japón': 'F1', 'Suecia-Túnez': 'F2', 'Países Bajos-Suecia': 'F3',
  'Túnez-Japón': 'F4', 'Túnez-Países Bajos': 'F5', 'Japón-Suecia': 'F6',
  // Grupo G
  'Bélgica-Egipto': 'G1', 'RI de Irán-Nueva Zelanda': 'G2', 'Bélgica-RI de Irán': 'G3',
  'Nueva Zelanda-Egipto': 'G4', 'Nueva Zelanda-Bélgica': 'G5', 'Egipto-RI de Irán': 'G6',
  // Grupo H
  'España-Islas de Cabo Verde': 'H1', 'Arabia Saudí-Uruguay': 'H2', 'España-Arabia Saudí': 'H3',
  'Uruguay-Islas de Cabo Verde': 'H4', 'Uruguay-España': 'H5', 'Islas de Cabo Verde-Arabia Saudí': 'H6',
  // Grupo I
  'Francia-Irak': 'I1', 'Senegal-Noruega': 'I2', 'Francia-Senegal': 'I3',
  'Noruega-Irak': 'I4', 'Noruega-Francia': 'I5', 'Irak-Senegal': 'I6',
  // Grupo J — nota: la quiniela tiene Argentina vs Argelia en J1
  'Argentina-Argelia': 'J1', 'Austria-Jordania': 'J2', 'Argentina-Austria': 'J3',
  'Jordania-Argelia': 'J4', 'Jordania-Argentina': 'J5', 'Argelia-Austria': 'J6',
  // Grupo K
  'Portugal-RD Congo': 'K1', 'Uzbekistán-Colombia': 'K2', 'Portugal-Uzbekistán': 'K3',
  'Colombia-RD Congo': 'K4', 'Colombia-Portugal': 'K5', 'RD Congo-Uzbekistán': 'K6',
  // Grupo L
  'Inglaterra-Ghana': 'L1', 'Panamá-Croacia': 'L2', 'Inglaterra-Panamá': 'L3',
  'Croacia-Ghana': 'L4', 'Panamá-Inglaterra': 'L5', 'Croacia-Panamá': 'L6', // wait, L4 should be...
}

// Build reverse: also add away-home for flexibility
const MATCH_LOOKUP_REV = {}
Object.entries(MATCH_LOOKUP).forEach(([key, val]) => {
  const [h, a] = key.split('-')
  MATCH_LOOKUP_REV[`${a}-${h}`] = val  // some APIs swap home/away
})

function findMatchId(homeName, awayName) {
  const h = normalizeName(homeName)
  const a = normalizeName(awayName)
  // 1. Buscar en grupos (nombres fijos)
  const groupMatch = MATCH_LOOKUP[`${h}-${a}`] || MATCH_LOOKUP_REV[`${h}-${a}`]
  if (groupMatch) return groupMatch
  // 2. Para eliminatorias devolvemos null aquí —
  //    se identifican dinámicamente en findEliminationMatchId()
  return null
}

// Para eliminatorias: busca en match_results si ya existe un partido
// con esos equipos en los match_ids M73-M104
async function findEliminationMatchId(homeName, awayName) {
  const h = normalizeName(homeName)
  const a = normalizeName(awayName)
  // Buscar en match_results existentes
  const { data } = await supabase
    .from('match_results')
    .select('match_id, h_team, a_team')
    .like('match_id', 'M%')
  if (data) {
    const found = data.find(r =>
      (r.h_team === h && r.a_team === a) ||
      (r.h_team === a && r.a_team === h)
    )
    if (found) return found.match_id
  }
  // Si no existe aún, buscar en picks para ver qué match_id tiene esos equipos
  const { data: picks } = await supabase
    .from('picks')
    .select('match_id, h_team, a_team')
    .like('match_id', 'M%')
    .or(`h_team.eq.${h},a_team.eq.${h}`)
    .limit(10)
  if (picks) {
    const found = picks.find(p =>
      (p.h_team === h && p.a_team === a) ||
      (p.h_team === a && p.a_team === h)
    )
    if (found) return found.match_id
  }
  return null
}

// Fetch partidos del Mundial de hoy y recientes
async function fetchWCMatches() {
  const today = new Date()
  const dates = []
  for (let i = -1; i <= 1; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    dates.push(d.toISOString().slice(0,10).replace(/-/g,''))
  }

  const allMatches = []
  for (const date of dates) {
    try {
      const res = await fetch(
        `https://${RAPIDAPI_HOST}/football-current-live`,
        { headers: { 'X-RapidAPI-Key': RAPIDAPI_KEY, 'X-RapidAPI-Host': RAPIDAPI_HOST } }
      )
      if (res.ok) {
        const data = await res.json()
        const wc = (data.response?.matches || []).filter(m => m.leagueId === WC_LEAGUE_ID)
        allMatches.push(...wc)
      }
    } catch(e) { console.error('Fetch error:', e.message) }
  }

  // Also fetch by date for finished matches
  for (const date of dates) {
    try {
      const res = await fetch(
        `https://${RAPIDAPI_HOST}/football-get-matches-by-date?date=${date}`,
        { headers: { 'X-RapidAPI-Key': RAPIDAPI_KEY, 'X-RapidAPI-Host': RAPIDAPI_HOST } }
      )
      if (res.ok) {
        const data = await res.json()
        const wc = (data.response?.matches || []).filter(m => m.leagueId === WC_LEAGUE_ID)
        allMatches.push(...wc)
      }
    } catch(e) { console.error('Fetch error:', e.message) }
  }

  // Deduplicate by id
  const seen = new Set()
  return allMatches.filter(m => { if (seen.has(m.id)) return false; seen.add(m.id); return true })
}

// Calcular puntos de una quiniela
const SCORING = {
  calcPts(pick, result, isGroup) {
    if (!result || result.hs == null || !pick || pick.goals_home == null) return 0

    // En eliminatorias: si los equipos no coinciden exactamente en posición, 0 pts
    // Ejemplo: pick tiene Brasil(local) vs México(visitante)
    // Si el real es Portugal(local) vs Brasil(visitante) → 0 pts aunque Brasil gane
    if (!isGroup) {
      const pickHome = (pick.h_team || '').trim()
      const pickAway = (pick.a_team || '').trim()
      const realHome = (result.h_team || '').trim()
      const realAway = (result.a_team || '').trim()
      if (pickHome !== realHome || pickAway !== realAway) return 0
    }

    const rR = result.hs > result.as ? 'H' : result.hs < result.as ? 'A' : 'D'
    const pR = pick.goals_home > pick.goals_away ? 'H' : pick.goals_home < pick.goals_away ? 'A' : 'D'
    const hOk = pick.goals_home === result.hs
    const aOk = pick.goals_away === result.as
    const resOk = isGroup ? rR === pR : pick.winner === result.winner
    const bonus = hOk && aOk && resOk
    let pts = 0
    if (hOk) pts += 1
    if (aOk) pts += 1
    if (resOk) pts += 2
    if (bonus) pts += 1
    return pts
  }
}

async function recalcAllScores(updatedMatchIds) {
  const { data: affectedPicks } = await supabase
    .from('picks').select('quiniela_id').in('match_id', updatedMatchIds)
  if (!affectedPicks?.length) return
  const quinielaIds = [...new Set(affectedPicks.map(p => p.quiniela_id))]
  for (let i = 0; i < quinielaIds.length; i += 50) {
    const batch = quinielaIds.slice(i, i + 50)
    await Promise.all(batch.map(qid => recalcQuinielaScore(qid)))
  }
}

async function recalcQuinielaScore(quinielaId) {
  const { data: picks } = await supabase.from('picks').select('*').eq('quiniela_id', quinielaId)
  const { data: results } = await supabase.from('match_results').select('*')
  if (!picks || !results) return
  const resultsMap = {}
  results.forEach(r => { resultsMap[r.match_id] = r })
  let grpPts = 0, elimPts = 0, finalPts = 0
  picks.forEach(pick => {
    const result = resultsMap[pick.match_id]
    if (!result || result.goals_home == null) return
    const isGroup = /^[A-L][1-6]$/.test(pick.match_id)
    const pts = SCORING.calcPts(pick, { hs: result.goals_home, as: result.goals_away, winner: result.winner }, isGroup)
    if (isGroup) grpPts += pts
    else elimPts += pts
  })
  const finPick = picks.find(p => p.match_id === 'M104')
  const t3Pick  = picks.find(p => p.match_id === 'M103')
  const finRes  = resultsMap['M104']
  const t3Res   = resultsMap['M103']
  let finalPtsCalc = 0
  if (finRes?.goals_home != null && finPick) {
    const champion = finRes.goals_home > finRes.goals_away ? finRes.h_team : finRes.a_team
    const runner   = champion === finRes.h_team ? finRes.a_team : finRes.h_team
    if (finPick.winner === champion) finalPtsCalc += 20
    const pickRun = finPick.winner === finPick.h_team ? finPick.a_team : finPick.h_team
    if (pickRun === runner) finalPtsCalc += 10
  }
  if (t3Res?.goals_home != null && t3Pick) {
    const third  = t3Res.goals_home > t3Res.goals_away ? t3Res.h_team : t3Res.a_team
    const fourth = third === t3Res.h_team ? t3Res.a_team : t3Res.h_team
    if (t3Pick.winner === third)  finalPtsCalc += 5
    const pickFourth = t3Pick.winner === t3Pick.h_team ? t3Pick.a_team : t3Pick.h_team
    if (pickFourth === fourth) finalPtsCalc += 3
  }
  const total = grpPts + elimPts + finalPtsCalc
  await supabase.from('scores').upsert({
    quiniela_id: quinielaId,
    grp_pts: grpPts, clasif_pts: 0, elim_pts: elimPts,
    final_pts: finalPtsCalc, total_pts: total,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'quiniela_id' })
}

exports.handler = async (event) => {
  try {
    console.log('🔄 Sync started:', new Date().toISOString())
    const matches = await fetchWCMatches()
    console.log(`📡 WC matches found: ${matches.length}`)
    const updatedIds = []

    for (const match of matches) {
      let matchId = findMatchId(match.home?.name, match.away?.name)
      if (!matchId) {
        // Intenta identificar partido eliminatorio por equipos
        matchId = await findEliminationMatchId(match.home?.name, match.away?.name)
      }
      if (!matchId) {
        console.log(`⚠️ No match_id for: ${match.home?.name} vs ${match.away?.name}`)
        continue
      }
      const finished = match.status?.finished === true
      const live     = match.status?.started === true && !finished
      if (!finished && !live) continue

      const homeScore = match.home?.score ?? null
      const awayScore = match.away?.score ?? null
      const winner = homeScore != null && awayScore != null
        ? (homeScore > awayScore ? normalizeName(match.home?.name)
          : awayScore > homeScore ? normalizeName(match.away?.name) : null)
        : null

      const { error } = await supabase.from('match_results').upsert({
        match_id: matchId,
        goals_home: homeScore,
        goals_away: awayScore,
        winner,
        h_team: normalizeName(match.home?.name),
        a_team: normalizeName(match.away?.name),
        status: finished ? 'finished' : 'live',
        api_id: match.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'match_id' })

      if (!error && finished) updatedIds.push(matchId)
      console.log(`${finished ? '✅' : '🔴'} ${matchId}: ${match.home?.name} ${homeScore}-${awayScore} ${match.away?.name}`)
    }

    if (updatedIds.length > 0) {
      console.log(`📊 Recalculating scores for: ${updatedIds.join(', ')}`)
      await recalcAllScores(updatedIds)
    }

    console.log(`✅ Sync done. Updated: ${updatedIds.length} matches`)
    return { statusCode: 200, body: JSON.stringify({ updated: updatedIds.length, matches: matches.length }) }
  } catch (err) {
    console.error('❌ Sync error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}
