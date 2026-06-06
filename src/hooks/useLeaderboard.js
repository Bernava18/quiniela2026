import { useEffect, useState } from 'react'
import { supabase, getLeaderboard } from '../lib/supabase'

export function useLeaderboard() {
  const [rows, setRows]     = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadLeaderboard()

    // Realtime: cuando cambian los scores
    const channel = supabase
      .channel('scores-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'scores' },
        () => loadLeaderboard()  // reload on any change
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  async function loadLeaderboard() {
    const { data } = await getLeaderboard()
    setRows(data || [])
    setLoading(false)
  }

  return { rows, loading }
}
