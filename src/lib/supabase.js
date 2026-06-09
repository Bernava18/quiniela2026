import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)

// ═══════════════════════════════════════════════════════════════
// PICKS
// ═══════════════════════════════════════════════════════════════
export async function savePick(quinielaId, matchId, data) {
  const { error } = await supabase.from('picks').upsert({
    quiniela_id: quinielaId,
    match_id: matchId,
    goals_home: data.h ?? null,
    goals_away: data.a ?? null,
    winner: data.win ?? null,
    h_team: data.hTeam ?? null,
    a_team: data.aTeam ?? null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'quiniela_id,match_id' })
  return error
}

export async function getQuinielaPicks(quinielaId) {
  const { data, error } = await supabase
    .from('picks')
    .select('*')
    .eq('quiniela_id', quinielaId)
  if (error) return {}
  // Convert to STATE.picks format
  const picks = {}
  data.forEach(p => {
    picks[p.match_id] = {
      h: p.goals_home,
      a: p.goals_away,
      win: p.winner,
      hTeam: p.h_team,
      aTeam: p.a_team,
      saved: true,
    }
  })
  return picks
}

// ═══════════════════════════════════════════════════════════════
// QUINIELAS
// ═══════════════════════════════════════════════════════════════
export async function getMyQuinielas(userId) {
  const { data, error } = await supabase
    .from('quinielas')
    .select('*, scores(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return { data: data || [], error }
}

export async function createQuiniela(userId, name) {
  const { data, error } = await supabase
    .from('quinielas')
    .insert({ user_id: userId, name })
    .select()
    .single()
  return { data, error }
}

export async function deleteQuiniela(quinielaId) {
  const { error } = await supabase
    .from('quinielas')
    .delete()
    .eq('id', quinielaId)
  return error
}

// ═══════════════════════════════════════════════════════════════
// RESULTADOS REALES
// ═══════════════════════════════════════════════════════════════
export async function getAllResults() {
  const { data, error } = await supabase
    .from('match_results')
    .select('*')
  if (error) return {}
  const results = {}
  data.forEach(r => {
    results[r.match_id] = {
      hs: r.goals_home,
      as: r.goals_away,
      win: r.winner,
      status: r.status,
    }
  })
  return results
}

// ═══════════════════════════════════════════════════════════════
// TABLA DE POSICIONES
// ═══════════════════════════════════════════════════════════════
export async function getLeaderboard() {
  // Query desde quinielas para incluir todas, aunque no tengan score aún
  const { data, error } = await supabase
    .from('quinielas')
    .select(`
      id, name, user_id,
      profiles ( id, username, full_name ),
      scores ( quiniela_id, grp_pts, clasif_pts, elim_pts, final_pts, total_pts, updated_at )
    `)
    .order('name')
    .limit(200)

  if (!data) return { data: [], error }

  // Transformar al formato que espera LeaderboardPage (igual que scores con quinielas embebidas)
  const transformed = data.map(q => {
    const s = q.scores?.[0] || { grp_pts:0, clasif_pts:0, elim_pts:0, final_pts:0, total_pts:0 }
    return {
      quiniela_id: q.id,
      grp_pts: s.grp_pts || 0,
      clasif_pts: s.clasif_pts || 0,
      elim_pts: s.elim_pts || 0,
      final_pts: s.final_pts || 0,
      total_pts: s.total_pts || 0,
      updated_at: s.updated_at,
      quinielas: {
        id: q.id,
        name: q.name,
        seq_num: q.seq_num,
        payment_status: q.payment_status,
        user_id: q.user_id,
        profiles: q.profiles
      }
    }
  }).sort((a, b) => b.total_pts - a.total_pts)

  return { data: transformed, error }
}

// ═══════════════════════════════════════════════════════════════
// LOCK: cierre automático de quinielas
// ═══════════════════════════════════════════════════════════════
export async function checkAndLockQuinielas() {
  const { data: config } = await supabase
    .from('config')
    .select('value')
    .eq('key', 'lock_date')
    .single()

  if (!config) return
  const lockDate = new Date(config.value)
  if (new Date() < lockDate) return

  // Lock all unlocked quinielas
  await supabase
    .from('quinielas')
    .update({ is_locked: true, locked_at: new Date().toISOString() })
    .eq('is_locked', false)
}

// ═══════════════════════════════════════════════════════════════
// BACKUP: descargar quiniela como JSON
// ═══════════════════════════════════════════════════════════════
export async function downloadQuinielaBackup(quinielaId, quinielaName) {
  const { data: picks } = await supabase
    .from('picks')
    .select('*')
    .eq('quiniela_id', quinielaId)

  const { data: results } = await supabase
    .from('match_results')
    .select('*')

  const backup = {
    quiniela_id: quinielaId,
    name: quinielaName,
    exported_at: new Date().toISOString(),
    picks: picks || [],
    results_snapshot: results || [],
  }

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `quiniela_${quinielaName.replace(/\s+/g, '_')}_${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
}
