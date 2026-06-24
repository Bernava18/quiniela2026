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
      id, name, user_id, seq_num, payment_status, hidden_from_table,
      profiles ( id, username, full_name ),
      scores ( quiniela_id, grp_pts, clasif_pts, elim_pts, final_pts, total_pts, updated_at ),
      picks ( match_id, goals_home )
    `)
    .order('name')
    .limit(500)

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
      picks_count: (q.picks || []).filter(p => p.goals_home != null).length,
      quinielas: {
        id: q.id,
        name: q.name,
        seq_num: q.seq_num,
        payment_status: q.payment_status,
        hidden_from_table: q.hidden_from_table,
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

// ═══════════════════════════════════════════════════════════════
// ░░ SECCIÓN DE PRUEBA (oculta, solo admin) — NO afecta producción ░░
// ───────────────────────────────────────────────────────────────
// Lee SOLO la fase de grupos de una quiniela real (sin modificarla) y
// guarda los picks de eliminatorias de PRUEBA en 'picks_ko_test'.
// NO referencia 'picks_ko' (producción) — esa tabla aún no existe.
// ═══════════════════════════════════════════════════════════════

// Lista de quinielas para elegir cuál usar como caso de prueba (solo lectura)
export async function devListQuinielas() {
  const { data, error } = await supabase
    .from('quinielas')
    .select('id, name, user_id, profiles!quinielas_user_id_fkey(username)')
    .order('name')
    .limit(500)
  return { data: data || [], error }
}

// Lee los picks de FASE DE GRUPOS de una quiniela (solo lectura, no modifica nada).
// Devuelve solo partidos de grupo (A1..L6); ignora cualquier M73-M104.
export async function devGetGroupPicks(quinielaId) {
  const { data, error } = await supabase
    .from('picks')
    .select('match_id, goals_home, goals_away, winner, h_team, a_team')
    .eq('quiniela_id', quinielaId)
  if (error) return {}
  const picks = {}
  ;(data || []).forEach(p => {
    if (/^[A-L][1-6]$/.test(p.match_id)) {
      picks[p.match_id] = {
        h: p.goals_home, a: p.goals_away, win: p.winner,
        hTeam: p.h_team, aTeam: p.a_team, saved: true,
      }
    }
  })
  return picks
}

// Lee los picks de eliminatorias de PRUEBA (tabla aislada)
export async function devGetKoTestPicks(quinielaId) {
  const { data, error } = await supabase
    .from('picks_ko_test')
    .select('*')
    .eq('quiniela_id', quinielaId)
  if (error) return {}
  const picks = {}
  ;(data || []).forEach(p => {
    picks[p.match_id] = {
      h: p.goals_home, a: p.goals_away, win: p.winner,
      hTeam: p.h_team, aTeam: p.a_team, saved: true,
    }
  })
  return picks
}

// Guarda un pick de eliminatoria de PRUEBA en 'picks_ko_test'
export async function devSaveKoTestPick(quinielaId, matchId, data) {
  // Seguridad: solo se permiten match_id de eliminatorias (M73-M104)
  const m = /^M(\d+)$/.exec(matchId || '')
  if (!m || +m[1] < 73 || +m[1] > 104) {
    return new Error('devSaveKoTestPick: match_id fuera de rango de eliminatorias')
  }
  const { error } = await supabase.from('picks_ko_test').upsert({
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

// Borra TODOS los picks de prueba de una quiniela (botón "reiniciar prueba")
export async function devResetKoTest(quinielaId) {
  const { error } = await supabase
    .from('picks_ko_test')
    .delete()
    .eq('quiniela_id', quinielaId)
  return error
}

// Trae los 16avos (M73-M88) de la quiniela ORIGINAL (tabla 'picks') a la fase
// de prueba ('picks_ko_test'). Los enfrentamientos son idénticos, así que se
// copian tal cual. Solo lee de 'picks' (no la modifica). Idempotente.
export async function devImportR32(quinielaId) {
  const R32 = ['M73','M74','M75','M76','M77','M78','M79','M80',
               'M81','M82','M83','M84','M85','M86','M87','M88']
  // 1. Leer los 16avos originales
  const { data, error } = await supabase
    .from('picks')
    .select('match_id, goals_home, goals_away, winner, h_team, a_team')
    .eq('quiniela_id', quinielaId)
    .in('match_id', R32)
  if (error) return { error, count: 0 }
  if (!data || data.length === 0) return { error: null, count: 0 }

  // 2. Insertar/actualizar en la tabla de prueba
  const rows = data.map(p => ({
    quiniela_id: quinielaId,
    match_id: p.match_id,
    goals_home: p.goals_home,
    goals_away: p.goals_away,
    winner: p.winner,
    h_team: p.h_team,
    a_team: p.a_team,
    updated_at: new Date().toISOString(),
  }))
  const { error: upErr } = await supabase
    .from('picks_ko_test')
    .upsert(rows, { onConflict: 'quiniela_id,match_id' })
  return { error: upErr, count: rows.length }
}
