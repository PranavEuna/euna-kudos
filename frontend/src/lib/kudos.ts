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
  commentCount?: number
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

export type TopRecipient = {
  userId: string
  name: string
  email: string
  count: number
}

export type CategoryCount = {
  category: KudosCategory
  count: number
}

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

// Tailwind utility classes tuned for each category — used by chips, cards, headers.
export const CATEGORY_STYLE: Record<
  KudosCategory,
  { chip: string; chipActive: string; accent: string; softBg: string }
> = {
  teamwork: {
    chip: 'border-sky-200 text-sky-700 hover:bg-sky-50 dark:border-sky-400/30 dark:text-sky-300 dark:hover:bg-sky-400/10',
    chipActive:
      'border-sky-500 bg-sky-500 text-white hover:bg-sky-600 hover:border-sky-600',
    accent: 'text-sky-600 dark:text-sky-400',
    softBg: 'bg-sky-50/70 dark:bg-sky-400/5',
  },
  impact: {
    chip: 'border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-400/30 dark:text-emerald-300 dark:hover:bg-emerald-400/10',
    chipActive:
      'border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600 hover:border-emerald-600',
    accent: 'text-emerald-600 dark:text-emerald-400',
    softBg: 'bg-emerald-50/70 dark:bg-emerald-400/5',
  },
  innovation: {
    chip: 'border-violet-200 text-violet-700 hover:bg-violet-50 dark:border-violet-400/30 dark:text-violet-300 dark:hover:bg-violet-400/10',
    chipActive:
      'border-violet-500 bg-violet-500 text-white hover:bg-violet-600 hover:border-violet-600',
    accent: 'text-violet-600 dark:text-violet-400',
    softBg: 'bg-violet-50/70 dark:bg-violet-400/5',
  },
  growth: {
    chip: 'border-lime-300 text-lime-700 hover:bg-lime-50 dark:border-lime-400/30 dark:text-lime-300 dark:hover:bg-lime-400/10',
    chipActive:
      'border-lime-500 bg-lime-500 text-white hover:bg-lime-600 hover:border-lime-600',
    accent: 'text-lime-700 dark:text-lime-300',
    softBg: 'bg-lime-50/70 dark:bg-lime-400/5',
  },
  'customer-love': {
    chip: 'border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-400/30 dark:text-amber-300 dark:hover:bg-amber-400/10',
    chipActive:
      'border-amber-500 bg-amber-500 text-white hover:bg-amber-600 hover:border-amber-600',
    accent: 'text-amber-600 dark:text-amber-400',
    softBg: 'bg-amber-50/70 dark:bg-amber-400/5',
  },
}

export function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}
