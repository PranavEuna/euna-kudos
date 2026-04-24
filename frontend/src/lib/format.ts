export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  const now = Date.now()
  const diffMs = now - then
  const diffSec = Math.round(diffMs / 1000)
  const diffMin = Math.round(diffSec / 60)
  const diffHr = Math.round(diffMin / 60)
  const diffDay = Math.round(diffHr / 24)

  if (diffSec < 10) return 'just now'
  if (diffSec < 60) return `${diffSec}s ago`
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: diffDay > 365 ? 'numeric' : undefined,
  })
}

export function formatAbsoluteTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function getInitials(name: string | null | undefined, email?: string): string {
  const src = (name && name.trim()) || email?.split('@')[0] || '?'
  const parts = src.split(/[\s._-]+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// Stable 0-360 hue derived from email so avatars always look the same per user.
export function avatarHue(email: string): number {
  let h = 0
  for (let i = 0; i < email.length; i++) {
    h = (h * 31 + email.charCodeAt(i)) >>> 0
  }
  return h % 360
}

export function avatarGradient(email: string): string {
  const hue = avatarHue(email)
  const hue2 = (hue + 35) % 360
  return `linear-gradient(135deg, oklch(0.62 0.22 ${hue}), oklch(0.52 0.22 ${hue2}))`
}
