import { useEffect, useState, useCallback } from 'react'
import { supabase, getAllResults } from '../lib/supabase'

export function useResults() {
  const [results, setResults] = useState({})
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const data = await getAllResults()
    setResults(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()

    // Realtime: escuchar cambios en match_results
    const channel = supabase
      .channel('results-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'match_results' },
        (payload) => {
          const r = payload.new
          setResults(prev => ({
            ...prev,
            [r.match_id]: {
              hs: r.goals_home,
              as: r.goals_away,
              win: r.winner,
              status: r.status,
            }
          }))
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [load])

  return { results, loading, refresh: load }
}
