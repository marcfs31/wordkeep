import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Stats, WordSummary } from '@shared/types'
import { api } from '../lib/api'

type StatsContextValue = {
  stats: Stats | null
  recent: WordSummary[]
  refresh: () => void
}

const StatsContext = createContext<StatsContextValue | null>(null)

export function StatsProvider({ children }: { children: ReactNode }) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [recent, setRecent] = useState<WordSummary[]>([])

  const refresh = useCallback(() => {
    api.stats().then(setStats).catch(() => undefined)
    api.recent().then(setRecent).catch(() => undefined)
  }, [])

  useEffect(() => {
    refresh()
    const timer = window.setInterval(refresh, 15000)
    return () => window.clearInterval(timer)
  }, [refresh])

  const value = useMemo(() => ({ stats, recent, refresh }), [stats, recent, refresh])
  return <StatsContext.Provider value={value}>{children}</StatsContext.Provider>
}

export function useStats() {
  const ctx = useContext(StatsContext)
  if (!ctx) throw new Error('useStats must be used within StatsProvider')
  return ctx
}
