import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Star } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  CATEGORY_LABEL,
  CATEGORY_EMOJI,
  formatDate,
  type Kudos,
} from '@/lib/kudos'

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

  const { data, isLoading } = useQuery({
    queryKey: ['kudos', 'admin'],
    queryFn: fetchAllKudos,
    enabled: user?.isAdmin === true,
  })

  const toggle = useMutation({
    mutationFn: toggleFeature,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kudos'] })
    },
  })

  if (!user) return null
  if (!user.isAdmin) {
    return (
      <div className="p-8 max-w-xl mx-auto">
        <Card>
          <CardContent className="py-10 text-center">
            <h1 className="text-lg font-semibold mb-1">Admins only</h1>
            <p className="text-sm text-muted-foreground">
              This page is restricted to the <code className="font-mono">app-admins</code> group.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">Admin — Moderate Kudos</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Toggle the star on notable kudos to feature them at the top of the feed.
        </p>

        {isLoading && <div className="text-muted-foreground">Loading…</div>}

        <div className="space-y-3">
          {data?.map((k) => (
            <Card key={k.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm mb-1">
                      <span className="font-medium">{k.fromName}</span>
                      <span className="text-muted-foreground"> → </span>
                      <span className="font-medium">{k.toName}</span>
                      <Badge variant="secondary" className="ml-2">
                        {CATEGORY_EMOJI[k.category]} {CATEGORY_LABEL[k.category]}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{k.message}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatDate(k.createdAt)}</p>
                  </div>
                  <Button
                    variant={k.featured ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggle.mutate({ id: k.id, featured: !k.featured })}
                    disabled={toggle.isPending}
                  >
                    <Star className={`mr-1 h-4 w-4 ${k.featured ? 'fill-current' : ''}`} />
                    {k.featured ? 'Featured' : 'Feature'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
