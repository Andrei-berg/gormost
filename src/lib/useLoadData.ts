'use client'
import { useState, useEffect, useCallback } from 'react'

export interface LoadDataState {
  /** true only during the very first load — show a skeleton */
  loading: boolean
  /** message of the last failed load; null after a successful one */
  error: string | null
  /** re-runs the load function with error handling — use instead of calling loadData directly */
  reload: () => Promise<void>
}

/**
 * Wraps a page's loadData() with unified loading/error handling.
 * A failed fetch is distinguishable from "no data": the page keeps its
 * previous data and shows an error banner with a retry button.
 */
export function useLoadData(loadFn: () => Promise<void>): LoadDataState {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      await loadFn()
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [loadFn])

  useEffect(() => { reload() }, [reload])

  return { loading, error, reload }
}
