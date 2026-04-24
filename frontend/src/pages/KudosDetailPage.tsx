import { Link, useParams } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Star } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form'
import {
  CATEGORY_LABEL,
  CATEGORY_EMOJI,
  formatDate,
  type Kudos,
  type KudosComment,
} from '@/lib/kudos'

const commentSchema = z.object({
  body: z.string().trim().min(1, 'Say something').max(500, 'Max 500 characters'),
})
type CommentFormValues = z.infer<typeof commentSchema>

async function fetchKudos(id: string): Promise<Kudos> {
  const res = await apiFetch(`/kudos/${id}`)
  if (!res.ok) throw new Error(res.status === 404 ? 'Kudos not found' : 'Failed to load')
  return res.json()
}

async function fetchComments(id: string): Promise<KudosComment[]> {
  const res = await apiFetch(`/kudos/${id}/comments`)
  if (!res.ok) throw new Error('Failed to load comments')
  return res.json()
}

async function postComment(id: string, body: string): Promise<KudosComment> {
  const res = await apiFetch(`/kudos/${id}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export function KudosDetailPage() {
  const { id } = useParams({ from: '/kudos/$id' })
  const qc = useQueryClient()

  const kudosQ = useQuery({ queryKey: ['kudos', id], queryFn: () => fetchKudos(id) })
  const commentsQ = useQuery({
    queryKey: ['comments', id],
    queryFn: () => fetchComments(id),
    enabled: kudosQ.isSuccess,
  })

  const form = useForm<CommentFormValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: { body: '' },
  })

  const add = useMutation({
    mutationFn: (values: CommentFormValues) => postComment(id, values.body),
    onSuccess: () => {
      form.reset({ body: '' })
      qc.invalidateQueries({ queryKey: ['comments', id] })
    },
  })

  if (kudosQ.isLoading) return <div className="p-8 text-muted-foreground">Loading…</div>
  if (kudosQ.error) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <p className="text-destructive">{(kudosQ.error as Error).message}</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/">Back to feed</Link>
        </Button>
      </div>
    )
  }
  const k = kudosQ.data!

  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto">
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
          <Link to="/">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to feed
          </Link>
        </Button>

        <Card className={k.featured ? 'border-amber-400/60 bg-amber-50/40 dark:bg-amber-950/10' : ''}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-4">
              <div className="text-sm">
                <span className="font-medium">{k.fromName}</span>
                <span className="text-muted-foreground"> → </span>
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
            <p className="text-base leading-relaxed whitespace-pre-wrap">{k.message}</p>
            <p className="mt-4 text-xs text-muted-foreground">
              Posted {formatDate(k.createdAt)} by {k.fromName}
            </p>
          </CardContent>
        </Card>

        <h2 className="mt-8 mb-3 text-lg font-semibold">Comments</h2>

        {commentsQ.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

        <div className="space-y-3 mb-6">
          {commentsQ.data?.length === 0 && (
            <p className="text-sm text-muted-foreground">No comments yet — be the first to chime in.</p>
          )}
          {commentsQ.data?.map((c) => (
            <Card key={c.id}>
              <CardContent className="py-4">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-sm font-medium">{c.authorName}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(c.createdAt)}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{c.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="pt-6">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((v) => add.mutate(v))}
                className="space-y-3"
              >
                <FormField
                  control={form.control}
                  name="body"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          rows={3}
                          placeholder="Add a comment…"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {add.error && (
                  <p className="text-sm text-destructive">{(add.error as Error).message}</p>
                )}
                <div className="flex justify-end">
                  <Button type="submit" disabled={add.isPending}>
                    {add.isPending ? 'Posting…' : 'Comment'}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
