import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  MessageCircle,
  Plus,
  Sparkles,
  Star,
  Trophy,
  ArrowRight,
} from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { UserAvatar } from '@/components/UserAvatar'
import { CategoryChip, CategoryBadge } from '@/components/CategoryChip'
import { formatRelativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  KUDOS_CATEGORIES,
  CATEGORY_STYLE,
  type CategoryCount,
  type Kudos,
  type KudosCategory,
  type TopRecipient,
} from '@/lib/kudos'

const ALL = 'all' as const
type Filter = KudosCategory | typeof ALL

async function fetchKudos(category: Filter): Promise<Kudos[]> {
  const q = category === ALL ? '' : `?category=${encodeURIComponent(category)}`
  const res = await apiFetch(`/kudos${q}`)
  if (!res.ok) throw new Error('Failed to load kudos')
  return res.json()
}

async function fetchCategoryCounts(): Promise<CategoryCount[]> {
  const res = await apiFetch('/stats/category-counts')
  if (!res.ok) throw new Error('Failed to load category counts')
  return res.json()
}

async function fetchTopRecipients(): Promise<TopRecipient[]> {
  const res = await apiFetch('/stats/top-recipients')
  if (!res.ok) throw new Error('Failed to load top recipients')
  return res.json()
}

export function FeedPage() {
  const [category, setCategory] = useState<Filter>(ALL)

  const kudosQ = useQuery({ queryKey: ['kudos', category], queryFn: () => fetchKudos(category) })
  const countsQ = useQuery({ queryKey: ['category-counts'], queryFn: fetchCategoryCounts })
  const topQ = useQuery({ queryKey: ['top-recipients'], queryFn: fetchTopRecipients })

  const countByCategory: Partial<Record<KudosCategory, number>> = {}
  countsQ.data?.forEach((c) => (countByCategory[c.category] = c.count))
  const totalCount = (countsQ.data ?? []).reduce((a, b) => a + b.count, 0)

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0">
        <Hero totalCount={totalCount} />

        <div className="mb-5 mt-6 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setCategory(ALL)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              category === ALL
                ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90'
                : 'border-border text-muted-foreground hover:bg-muted'
            )}
          >
            <Sparkles className="h-3 w-3" />
            All
            {totalCount > 0 && (
              <span
                className={cn(
                  'ml-1 rounded-full px-1.5 text-[10px] font-semibold',
                  category === ALL ? 'bg-white/20 text-white' : 'bg-black/5 dark:bg-white/10'
                )}
              >
                {totalCount}
              </span>
            )}
          </button>
          {KUDOS_CATEGORIES.map((c) => (
            <CategoryChip
              key={c}
              category={c}
              active={category === c}
              count={countByCategory[c]}
              onClick={() => setCategory(c)}
            />
          ))}
        </div>

        {kudosQ.isLoading && <FeedSkeleton />}

        {kudosQ.error && (
          <Card>
            <CardContent className="py-6 text-sm text-destructive">
              {(kudosQ.error as Error).message}
            </CardContent>
          </Card>
        )}

        {kudosQ.data && kudosQ.data.length === 0 && <EmptyState filtered={category !== ALL} />}

        <div className="space-y-4">
          {kudosQ.data?.map((k) => <KudosCard key={k.id} kudos={k} />)}
        </div>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <TopRecipientsCard loading={topQ.isLoading} data={topQ.data} />
        <QuickTipsCard />
      </aside>
    </div>
  )
}

function Hero({ totalCount }: { totalCount: number }) {
  return (
    <div className="relative overflow-hidden rounded-2xl euna-hero-gradient text-white shadow-md">
      <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_20%_20%,white_0%,transparent_35%),radial-gradient(circle_at_80%_60%,white_0%,transparent_40%)]" />
      <div className="relative flex flex-col gap-4 p-6 sm:flex-row sm:items-end sm:justify-between sm:p-8">
        <div>
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-medium uppercase tracking-wider backdrop-blur">
            <Sparkles className="h-3 w-3" /> Euna Kudos
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Celebrate the people who make Euna, Euna.
          </h1>
          <p className="mt-2 max-w-xl text-sm text-white/80 sm:text-base">
            {totalCount > 0
              ? `${totalCount} ${totalCount === 1 ? 'kudos' : 'kudos'} posted so far. Keep the wins coming.`
              : 'Be the first to thank a teammate — it takes 30 seconds.'}
          </p>
        </div>
        <Button
          asChild
          size="lg"
          className="self-start bg-white text-[color:var(--euna-indigo)] hover:bg-white/90 sm:self-auto"
        >
          <Link to="/new">
            <Plus className="mr-1.5 h-4 w-4" /> Give kudos
          </Link>
        </Button>
      </div>
    </div>
  )
}

function KudosCard({ kudos }: { kudos: Kudos }) {
  const style = CATEGORY_STYLE[kudos.category]
  return (
    <Link to="/kudos/$id" params={{ id: kudos.id }} className="block">
      <Card
        className={cn(
          'card-hover overflow-hidden border-border/70',
          kudos.featured && 'euna-featured-glow border-amber-400/50'
        )}
      >
        <div className={cn('h-1 w-full', style.softBg)} />
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <UserAvatar email={kudos.fromEmail} name={kudos.fromName} size="md" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
                <span className="font-semibold">{kudos.fromName}</span>
                <span className="text-muted-foreground">gave kudos to</span>
                <span className="font-semibold">{kudos.toName}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground" title={kudos.createdAt}>
                  {formatRelativeTime(kudos.createdAt)}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed">
                {kudos.message}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <CategoryBadge category={kudos.category} />
                {kudos.featured && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-400 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-300">
                    <Star className="h-3 w-3 fill-current" /> Featured
                  </span>
                )}
                {typeof kudos.commentCount === 'number' && kudos.commentCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <MessageCircle className="h-3 w-3" />
                    {kudos.commentCount} {kudos.commentCount === 1 ? 'comment' : 'comments'}
                  </span>
                )}
              </div>
            </div>
            <UserAvatar
              email={kudos.toEmail}
              name={kudos.toName}
              size="md"
              className="hidden sm:inline-flex"
            />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <p className="text-base font-semibold">
            {filtered ? 'No kudos in this category yet' : 'No kudos yet'}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered
              ? 'Try a different category, or be the first to post one here.'
              : 'Be the first to recognize a teammate — it takes 30 seconds.'}
          </p>
        </div>
        <Button asChild className="mt-2">
          <Link to="/new">
            <Plus className="mr-1.5 h-4 w-4" /> Give the first kudos
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

function FeedSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1, 2].map((i) => (
        <Card key={i} className="overflow-hidden border-border/70">
          <Skeleton className="h-1 w-full rounded-none" />
          <CardContent className="flex gap-4 p-5">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <div className="flex gap-2 pt-1">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function TopRecipientsCard({
  loading,
  data,
}: {
  loading: boolean
  data?: TopRecipient[]
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-[color:var(--euna-orange)]" />
          <h2 className="text-sm font-semibold">Most recognized</h2>
        </div>
        {loading && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        )}
        {!loading && (!data || data.length === 0) && (
          <p className="text-xs text-muted-foreground">
            No kudos yet. Give the first one and someone will land here.
          </p>
        )}
        {!loading && data && data.length > 0 && (
          <ul className="space-y-3">
            {data.map((r, i) => (
              <li key={r.userId} className="flex items-center gap-3">
                <span className="w-4 text-center text-xs font-semibold text-muted-foreground">
                  {i + 1}
                </span>
                <UserAvatar email={r.email} name={r.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{r.name}</div>
                  <div className="truncate text-[11px] text-muted-foreground">{r.email}</div>
                </div>
                <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                  {r.count}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function QuickTipsCard() {
  return (
    <Card className="border-dashed bg-muted/30">
      <CardContent className="p-5 text-xs text-muted-foreground">
        <div className="mb-2 flex items-center gap-1.5 text-foreground">
          <Sparkles className="h-3.5 w-3.5" />
          <span className="text-sm font-semibold">Tips</span>
        </div>
        <ul className="space-y-1.5">
          <li className="flex gap-2">
            <ArrowRight className="mt-0.5 h-3 w-3 shrink-0" />
            Be specific — mention the thing they did.
          </li>
          <li className="flex gap-2">
            <ArrowRight className="mt-0.5 h-3 w-3 shrink-0" />
            Shouting out takes 30 seconds, press <kbd className="ml-0.5 rounded border bg-background px-1 font-mono text-[10px]">n</kbd>.
          </li>
          <li className="flex gap-2">
            <ArrowRight className="mt-0.5 h-3 w-3 shrink-0" />
            Admins can feature the best ones from <kbd className="rounded border bg-background px-1 font-mono text-[10px]">/admin</kbd>.
          </li>
        </ul>
      </CardContent>
    </Card>
  )
}
