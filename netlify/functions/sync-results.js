// netlify/functions/sync-results.js
// Se ejecuta cada 2 minutos via Netlify Scheduled Functions
// Consulta football-data.org y actualiza Supabase + recalcula puntos

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY  // service_role key (solo en servidor)
)

// Mapa de IDs de football-data.org a nuestros match_ids
// Estos IDs los obtienes consultando la API una vez antes del torneo
const API_MATCH_MAP = {
  // Grupos — se completan con los IDs reales de la API antes del mundial
  // Ejemplo: 12345: 'A1', 12346: 'A2', ...
  // Eliminatorias igual
}

// Mapa inverso: match_id → api_id (para buscar resultados)
const MATCH_API_MAP = Object.fromEntries(
  Object.entries(API_MATCH_MAP).map(([k,v]) => [v, parseInt(k)])
)

const SCORING = {
  calcPts(pick, result, isGroup) {
    if (!result || result.hs == null || !pick || pick.goals_home == null) return 0
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

// Obtener resultados de football-data.org
async function fetchLiveResults() {
  const res = await fetch(
    'https://api.football-data.org/v4/competitions/WC/matches?season=2026',
    { headers: { 'X-Auth-Token': process.env.FOOTBALL_API_KEY } }
  )
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  const data = await res.json()
  return data.matches || []
}

// Recalcular puntos de TODAS las quinielas (optimizado por batch)
async function recalcAllScores(updatedMatchIds) {
  // Solo recalcular quinielas que tienen picks en los partidos actualizados
  const { data: affectedPicks } = await supabase
    .from('picks')
    .select('quiniela_id')
    .in('match_id', updatedMatchIds)

  if (!affectedPicks?.length) return

  const quinielaIds = [...new Set(affectedPicks.map(p => p.quiniela_id))]

  // Procesar en batches de 50 para no sobrecargar
  for (let i = 0; i < quinielaIds.length; i += 50) {
    const batch = quinielaIds.slice(i, i + 50)
    await Promise.all(batch.map(qid => recalcQuinielaScore(qid)))
  }
}

async function recalcQuinielaScore(quinielaId) {
  // Obtener picks de esta quiniela
  const { data: picks } = await supabase
    .from('picks')
    .select('*')
    .eq('quiniela_id', quinielaId)

  // Obtener todos los resultados reales
  const { data: results } = await supabase
    .from('match_results')
    .select('*')

  if (!picks || !results) return

  const resultsMap = {}
  results.forEach(r => { resultsMap[r.match_id] = r })

  let grpPts = 0, clasifPts = 0, elimPts = 0, finalPts = 0

  picks.forEach(pick => {
    const result = resultsMap[pick.match_id]
    if (!result || result.goals_home == null) return
    const isGroup = /^[A-L][1-6]$/.test(pick.match_id)
    const pts = SCORING.calcPts(pick, { hs: result.goals_home, as: result.goals_away, winner: result.winner }, isGroup)
    if (isGroup) grpPts += pts
    else if (pick.match_id !== 'M103' && pick.match_id !== 'M104') elimPts += pts
    else elimPts += pts
  })

  // Final order pts
  const finPick = picks.find(p => p.match_id === 'M104')
  const t3Pick  = picks.find(p => p.match_id === 'M103')
  const finRes  = resultsMap['M104']
  const t3Res   = resultsMap['M103']

  if (finRes?.goals_home != null && finPick) {
    const champion = finRes.goals_home > finRes.goals_away ? finRes.h_team : finRes.a_team
    const runner   = champion === finRes.h_team ? finRes.a_team : finRes.h_team
    const pickChamp = finPick.winner
    const pickRun   = pickChamp === finPick.h_team ? finPick.a_team : finPick.h_team
    if (pickChamp === champion) finalPts += 20
    if (pickRun   === runner)   finalPts += 10
  }
  if (t3Res?.goals_home != null && t3Pick) {
    const third  = t3Res.goals_home > t3Res.goals_away ? t3Res.h_team : t3Res.a_team
    const fourth = third === t3Res.h_team ? t3Res.a_team : t3Res.h_team
    const pickThird  = t3Pick.winner
    const pickFourth = pickThird === t3Pick.h_team ? t3Pick.a_team : t3Pick.h_team
    if (pickThird  === third)  finalPts += 5
    if (pickFourth === fourth) finalPts += 3
  }

  const total = grpPts + clasifPts + elimPts + finalPts

  await supabase.from('scores').upsert({
    quiniela_id: quinielaId,
    grp_pts: grpPts,
    clasif_pts: clasifPts,
    elim_pts: elimPts,
    final_pts: finalPts,
    total_pts: total,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'quiniela_id' })
}

// Handler principal
exports.handler = async (event) => {
  try {
    console.log('🔄 Sync results started:', new Date().toISOString())

    // 1. Obtener resultados de la API
    const matches = await fetchLiveResults()
    const updatedIds = []

    // 2. Actualizar match_results en Supabase
    for (const match of matches) {
      const matchId = API_MATCH_MAP[match.id]
      if (!matchId) continue

      const status = match.status === 'FINISHED' ? 'finished'
        : match.status === 'IN_PLAY' ? 'live' : 'pending'

      if (status === 'pending') continue

      const { error } = await supabase.from('match_results').upsert({
        match_id: matchId,
        goals_home: match.score?.fullTime?.home ?? null,
        goals_away: match.score?.fullTime?.away ?? null,
        winner: match.score?.winner === 'HOME_TEAM' ? match.homeTeam?.name
              : match.score?.winner === 'AWAY_TEAM' ? match.awayTeam?.name : null,
        status,
        api_id: match.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'match_id' })

      if (!error && status === 'finished') updatedIds.push(matchId)
    }

    // 3. Recalcular puntos de quinielas afectadas
    if (updatedIds.length > 0) {
      console.log(`📊 Recalculating scores for matches: ${updatedIds.join(', ')}`)
      await recalcAllScores(updatedIds)
    }

    console.log(`✅ Sync done. Updated: ${updatedIds.length} matches`)
    return { statusCode: 200, body: JSON.stringify({ updated: updatedIds.length }) }

  } catch (err) {
    console.error('❌ Sync error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}
