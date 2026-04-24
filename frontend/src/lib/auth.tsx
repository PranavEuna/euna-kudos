import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type User = { id: string; email: string; name: string; groups: string[]; isAdmin: boolean }
type AuthState = { user: User | null; loading: boolean; signOut: () => void }

const AuthContext = createContext<AuthState>({ user: null, loading: true, signOut: () => {} })

const DEV_KEY = 'dev_user_email'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const headers: Record<string, string> = {}

    if (import.meta.env.DEV) {
      const devEmail = localStorage.getItem(DEV_KEY)
      if (devEmail) headers['X-Dev-User-Email'] = devEmail
    }

    fetch('/api/me', { headers, credentials: 'include' })
      .then((r) => {
        if (r.ok) return r.json()
        // Clear stale dev email so the login form reappears cleanly.
        if (import.meta.env.DEV) localStorage.removeItem(DEV_KEY)
        return null
      })
      .then(setUser)
      .finally(() => setLoading(false))
  }, [])

  const signOut = () => {
    if (import.meta.env.DEV) {
      localStorage.removeItem(DEV_KEY)
      window.location.reload()
    } else {
      const team = import.meta.env.VITE_ACCESS_TEAM_DOMAIN
      window.location.href = `https://${team}/cdn-cgi/access/logout`
    }
  }

  return <AuthContext.Provider value={{ user, loading, signOut }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
