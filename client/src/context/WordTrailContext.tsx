import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router-dom'

export type WordStop = {
  lemma: string
  lang: string
  label: string
  href: string
}

type TrailState = {
  trail: WordStop[]
  index: number
}

type TrailValue = TrailState & {
  canBack: boolean
  canForward: boolean
  visit: (stop: WordStop) => void
  back: () => void
  forward: () => void
  jump: (index: number) => void
}

const WordTrailContext = createContext<TrailValue | null>(null)

export function WordTrailProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [state, setState] = useState<TrailState>({ trail: [], index: -1 })
  const stateRef = useRef(state)
  stateRef.current = state
  const skipRecord = useRef(false)

  const visit = useCallback((stop: WordStop) => {
    if (skipRecord.current) {
      skipRecord.current = false
      return
    }
    setState((current) => {
      const here = current.trail[current.index]
      if (here && here.href === stop.href) return current
      const clipped = current.trail.slice(0, current.index + 1)
      const trail = [...clipped, stop].slice(-30)
      return { trail, index: trail.length - 1 }
    })
  }, [])

  const moveTo = useCallback(
    (nextIndex: number) => {
      const { trail } = stateRef.current
      const stop = trail[nextIndex]
      if (!stop) return
      skipRecord.current = true
      setState((current) => ({ ...current, index: nextIndex }))
      navigate(stop.href)
    },
    [navigate],
  )

  const back = useCallback(() => moveTo(stateRef.current.index - 1), [moveTo])
  const forward = useCallback(() => moveTo(stateRef.current.index + 1), [moveTo])
  const jump = useCallback((nextIndex: number) => moveTo(nextIndex), [moveTo])

  const value = useMemo<TrailValue>(
    () => ({
      ...state,
      canBack: state.index > 0,
      canForward: state.index >= 0 && state.index < state.trail.length - 1,
      visit,
      back,
      forward,
      jump,
    }),
    [state, visit, back, forward, jump],
  )

  return <WordTrailContext.Provider value={value}>{children}</WordTrailContext.Provider>
}

export function useWordTrail() {
  const ctx = useContext(WordTrailContext)
  if (!ctx) throw new Error('useWordTrail must be used within WordTrailProvider')
  return ctx
}
