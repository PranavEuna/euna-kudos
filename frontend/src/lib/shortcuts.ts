import { useEffect } from 'react'

type Handler = (e: KeyboardEvent) => void
type Binding = { key: string; handler: Handler; description?: string }

function isEditable(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el) return false
  const tag = el.tagName
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    el.isContentEditable === true
  )
}

export function useKeyboardShortcuts(bindings: Binding[]) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (isEditable(e.target)) return
      const match = bindings.find((b) => b.key.toLowerCase() === e.key.toLowerCase())
      if (match) {
        e.preventDefault()
        match.handler(e)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [bindings])
}
