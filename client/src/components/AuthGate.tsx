import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { api } from '../lib/api'

export function AuthGate({ children }: { children: ReactNode }) {
  const [locked, setLocked] = useState(false)
  const [signedIn, setSignedIn] = useState(true)
  const [key, setKey] = useState('')
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    api
      .session()
      .then((session) => {
        setLocked(session.locked)
        setSignedIn(session.signedIn)
      })
      .catch(() => undefined)
      .finally(() => setReady(true))

    function onAuth() {
      setLocked(true)
      setSignedIn(false)
    }
    window.addEventListener('wordkeep:auth', onAuth)
    return () => window.removeEventListener('wordkeep:auth', onAuth)
  }, [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    try {
      await api.login(key)
      setSignedIn(true)
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in')
    }
  }

  if (!ready) return <p className="p-8 text-muted">Loading…</p>
  if (locked && !signedIn) {
    return (
      <div className="mx-auto flex min-h-svh max-w-md flex-col justify-center px-4">
        <p className="text-xs uppercase tracking-[0.18em] text-gold">Private lexicon</p>
        <h1 className="lemma mt-2 text-4xl">Wordkeep</h1>
        <form onSubmit={(event) => void submit(event)} className="mt-8 space-y-3">
          <label className="block text-sm">
            Access key
            <input
              type="password"
              value={key}
              onChange={(event) => setKey(event.target.value)}
              className="mt-1 w-full rounded-xl border border-rule bg-paper px-3 py-2"
              autoFocus
            />
          </label>
          {error && <p className="text-sm text-accent">{error}</p>}
          <button type="submit" className="rounded-full bg-ink px-4 py-2 text-sm text-paper">
            Open
          </button>
        </form>
      </div>
    )
  }
  return children
}
