import { Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft, ShieldCheck, Star } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { UserAvatar } from '@/components/UserAvatar'
import { CategoryBadge } from '@/components/CategoryChip'
import { formatRelativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Kudos } from '@/lib/kudos'

async function fetchAllKudos(): Promise<Kudos[]> {
  const res = await apiFetch('/kudos')
  if (!res.ok) throw new Error('Failed to load kudos')
  return res.json()
}

async function toggleFeature({ id, featured }: { id: string; featured: boolean }): Promise<Kudos> {
  const res = await apiFetch(`/kudos/${id}/feature`, {
    method: 'PATCH',
    body: JSON.stringify({ featured }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export function AdminPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const isAdmin = user?.isAdmin === true

  const { data, isLoading } = useQuery({
    queryKey: ['kudos', 'admin'],
    queryFn: fetchAllKudos,
    enabled: isAdmin,
  })

  const toggle = useMutation({
    mutationFn: toggleFeature,
    // Optimistic update — flip the flag instantly, roll back on error.
    onMutate: async ({ id, featured }) => {
      await qc.cancelQueries({ queryKey: ['kudos', 'admin'] })
      const previous = qc.getQueryData<Kudos[]>(['kudos', 'admin'])
      qc.setQueryData<Kudos[]>(['kudos', 'admin'], (old) =>
        old?.map((k) => (k.id === id ? { ...k, featured } : k))
      )
      return { previous }
    },
    onError: (err: Error, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(['kudos', 'admin'], ctx.previous)
      toast.error('Could not update', { description: err.message })
    },
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['kudos'] })
      toast.success(updated.featured ? 'Featured on the feed' : 'Removed from featured')
    },
  })

  if (!user) return null
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-lg">
        <Card className="border-dashed">
          <CardContent className="grid gap-3 py-14 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-muted">
              <ShieldCheck className="h-6 w-6 text-muted-foreground" />
            </div>
            <h1 className="text-lg font-semibold">Admins only</h1>
            <p className="text-sm text-muted-foreground">
              This page is restricted to the <code className="rounded bg-muted px-1 font-mono text-xs">app-admins</code> group.
              In local dev, sign in with an email containing <code className="rounded bg-muted px-1 font-mono text-xs">admin</code> to explore it.
            </p>
            <Button asChild variant="outline" className="mx-auto mt-2">
              <Link to="/">
                <ArrowLeft className="mr-1 h-4 w-4" /> Back to feed
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const featuredCount = data?.filter((k) => k.featured).length ?? 0

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <ShieldCheck className="h-6 w-6 text-primary" /> Moderate kudos
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Toggle the star to feature notable kudos at the top of the feed.
          </p>
        </div>
        <div className="flex items-center gap-4 rounded-lg border bg-muted/30 px-4 py-2 text-sm">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Total</div>
            <div className="font-semibold">{data?.length ?? '—'}</div>
          </div>
          <div className="h-6 w-px bg-border" />
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Featured</div>
            <div className="font-semibold text-amber-600 dark:text-amber-400">{featuredCount}</div>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Card key={i}>
              <CardContent className="flex gap-3 py-4">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-40" />
                  <Skeleton className="h-4 w-full" />
                </div>
                <Skeleton className="h-9 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {data?.map((k) => (
          <Card key={k.id} className={cn(k.featured && 'border-amber-400/50 bg-amber-50/40 dark:bg-amber-400/5')}>
            <CardContent className="flex flex-wrap items-start gap-4 py-4">
              <UserAvatar email={k.fromEmail} name={k.fromName} size="md" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-1.5 text-sm">
                  <span className="font-semibold">{k.fromName}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-semibold">{k.toName}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-[11px] text-muted-foreground">
                    {formatRelativeTime(k.createdAt)}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{k.message}</p>
                <div className="mt-2">
                  <CategoryBadge category={k.category} />
                </div>
              </div>
              <Button
                variant={k.featured ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggle.mutate({ id: k.id, featured: !k.featured })}
                className={cn(
                  k.featured && 'bg-amber-500 hover:bg-amber-600 border-amber-500 text-white'
                )}
              >
                <Star className={cn('mr-1 h-4 w-4', k.featured && 'fill-current')} />
                {k.featured ? 'Featured' : 'Feature'}
              </Button>
            </CardContent>
          </Card>
        ))}
        {data && data.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No kudos yet — nothing to moderate.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
