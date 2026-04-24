import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Plus, Star } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  KUDOS_CATEGORIES,
  CATEGORY_LABEL,
  CATEGORY_EMOJI,
  formatDate,
  type Kudos,
  type KudosCategory,
} from '@/lib/kudos'

const ALL = 'all' as const

async function fetchKudos(category: KudosCategory | typeof ALL): Promise<Kudos[]> {
  const q = category === ALL ? '' : `?category=${encodeURIComponent(category)}`
  const res = await apiFetch(`/kudos${q}`)
  if (!res.ok) throw new Error('Failed to load kudos')
  return res.json()
}

export function FeedPage() {
  const [category, setCategory] = useState<KudosCategory | typeof ALL>(ALL)
  const { data, isLoading, error } = useQuery({
    queryKey: ['kudos', category],
    queryFn: () => fetchKudos(category),
  })

  return (
    <div className="p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Kudos Feed</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Celebrate wins and thank your teammates.
            </p>
          </div>
          <Button asChild>
            <Link to="/new">
              <Plus className="mr-2 h-4 w-4" /> Give Kudos
            </Link>
          </Button>
        </div>

        <div className="mb-4 flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Filter by category:</span>
          <Select value={category} onValueChange={(v) => setCategory(v as KudosCategory | typeof ALL)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All categories</SelectItem>
              {KUDOS_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {CATEGORY_EMOJI[c]} {CATEGORY_LABEL[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {(error as Error).message}
          </div>
        )}

        {isLoading && <div className="text-muted-foreground">Loading…</div>}

        {data && data.length === 0 && (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              No kudos yet. Be the first to give one!
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {data?.map((k) => (
            <Link
              key={k.id}
              to="/kudos/$id"
              params={{ id: k.id }}
              className="block transition-opacity hover:opacity-90"
            >
              <Card className={k.featured ? 'border-amber-400/60 bg-amber-50/40 dark:bg-amber-950/10' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-sm">
                      <span className="font-medium">{k.fromName}</span>
                      <span className="text-muted-foreground"> gave kudos to </span>
                      <span className="font-medium">{k.toName}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {k.featured && (
                        <Badge variant="outline" className="border-amber-400 text-amber-700 bg-amber-50">
                          <Star className="mr-1 h-3 w-3 fill-current" /> Featured
                        </Badge>
                      )}
                      <Badge variant="secondary">
                        {CATEGORY_EMOJI[k.category]} {CATEGORY_LABEL[k.category]}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{k.message}</p>
                  <p className="mt-3 text-xs text-muted-foreground">{formatDate(k.createdAt)}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
