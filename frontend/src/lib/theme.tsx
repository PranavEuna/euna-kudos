import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type Theme = 'light' | 'dark' | 'system'
type ResolvedTheme = 'light' | 'dark'

type ThemeState = {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (t: Theme) => void
  toggle: () => void
}

const STORAGE_KEY = 'euna-theme'
const ThemeContext = createContext<ThemeState | null>(null)

function readSystem(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function apply(resolved: ResolvedTheme) {
  const root = document.documentElement
  root.classList.toggle('dark', resolved === 'dark')
  root.style.colorScheme = resolved
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'system'
    return (localStorage.getItem(STORAGE_KEY) as Theme) || 'system'
  })
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    theme === 'system' ? readSystem() : theme
  )

  useEffect(() => {
    const resolved: ResolvedTheme = theme === 'system' ? readSystem() : theme
    setResolvedTheme(resolved)
    apply(resolved)
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      const r: ResolvedTheme = mq.matches ? 'dark' : 'light'
      setResolvedTheme(r)
      apply(r)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [theme])

  const setTheme = (t: Theme) => setThemeState(t)
  const toggle = () => setThemeState(resolvedTheme === 'dark' ? 'light' : 'dark')

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeState {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    // Safe fallback so components rendered outside the provider (e.g. tooltips) don't crash.
    return {
      theme: 'light',
      resolvedTheme: 'light',
      setTheme: () => {},
      toggle: () => {},
    }
  }
  return ctx
}
