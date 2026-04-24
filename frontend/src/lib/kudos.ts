export const KUDOS_CATEGORIES = [
  'teamwork',
  'impact',
  'innovation',
  'growth',
  'customer-love',
] as const

export type KudosCategory = (typeof KUDOS_CATEGORIES)[number]

export type Kudos = {
  id: string
  category: KudosCategory
  message: string
  featured: boolean
  createdAt: string
  fromUserId: string
  fromName: string
  fromEmail: string
  toUserId: string
  toName: string
  toEmail: string
}

export type KudosComment = {
  id: string
  body: string
  createdAt: string
  authorId: string
  authorName: string
  authorEmail: string
}

export type UserLite = { id: string; name: string; email: string }

export const CATEGORY_LABEL: Record<KudosCategory, string> = {
  teamwork: 'Teamwork',
  impact: 'Impact',
  innovation: 'Innovation',
  growth: 'Growth',
  'customer-love': 'Customer Love',
}

export const CATEGORY_EMOJI: Record<KudosCategory, string> = {
  teamwork: '🤝',
  impact: '🎯',
  innovation: '💡',
  growth: '🌱',
  'customer-love': '💛',
}

export function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}
