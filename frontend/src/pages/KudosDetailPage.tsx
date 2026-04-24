import { Link, useParams } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ArrowLeft, MessageCircle, Send, Star } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form'
import { UserAvatar } from '@/components/UserAvatar'
import { CategoryBadge } from '@/components/CategoryChip'
import { formatAbsoluteTime, formatRelativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { CATEGORY_STYLE, type Kudos, type KudosComment } from '@/lib/kudos'

const MAX = 500
const commentSchema = z.object({
  body: z.string().trim().min(1, 'Say something').max(MAX, `Max ${MAX} characters`),
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
      qc.invalidateQueries({ queryKey: ['kudos'] })
      toast.success('Comment posted')
    },
    onError: (err: Error) => toast.error('Could not post comment', { description: err.message }),
  })

  if (kudosQ.isLoading) return <DetailSkeleton />
  if (kudosQ.error) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardContent className="py-10 text-center">
            <h1 className="text-lg font-semibold">{(kudosQ.error as Error).message}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              It may have been removed, or the link is bad.
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link to="/">Back to feed</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }
  const k = kudosQ.data!
  const style = CATEGORY_STYLE[k.category]
  const body = form.watch('body') ?? ''

  return (
    <div className="mx-auto max-w-3xl">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link to="/">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to feed
        </Link>
      </Button>

      <Card
        className={cn(
          'overflow-hidden border-border/70',
          k.featured && 'euna-featured-glow border-amber-400/50'
        )}
      >
        <div className={cn('h-1.5 w-full', style.softBg)} />
        <CardContent className="p-6 sm:p-8">
          {k.featured && (
            <div className="mb-4 inline-flex items-center gap-1 rounded-full border border-amber-400 bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-700 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-300">
              <Star className="h-3 w-3 fill-current" /> Featured by an admin
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <UserAvatar email={k.fromEmail} name={k.fromName} size="lg" />
            <div className="text-sm text-muted-foreground">from</div>
            <div className="text-base font-semibold">{k.fromName}</div>
            <div className="hidden text-muted-foreground sm:inline">→</div>
            <UserAvatar email={k.toEmail} name={k.toName} size="lg" />
            <div className="text-sm text-muted-foreground">to</div>
            <div className="text-base font-semibold">{k.toName}</div>
            <div className="ml-auto">
              <CategoryBadge category={k.category} />
            </div>
          </div>
          <p className="mt-5 whitespace-pre-wrap text-lg leading-relaxed">{k.message}</p>
          <p className="mt-4 text-xs text-muted-foreground" title={k.createdAt}>
            Posted {formatAbsoluteTime(k.createdAt)} · {formatRelativeTime(k.createdAt)}
          </p>
        </CardContent>
      </Card>

      <section className="mt-8">
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
          <MessageCircle className="h-4 w-4" /> Comments
          {commentsQ.data && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {commentsQ.data.length}
            </span>
          )}
        </h2>

        {commentsQ.isLoading && (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <Card key={i}>
                <CardContent className="flex gap-3 py-4">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="space-y-3">
          {commentsQ.data?.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No comments yet — be the first to chime in.
            </p>
          )}
          {commentsQ.data?.map((c) => (
            <Card key={c.id} className="border-border/70">
              <CardContent className="flex gap-3 py-4">
                <UserAvatar email={c.authorEmail} name={c.authorName} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                    <span className="text-sm font-medium">{c.authorName}</span>
                    <span className="text-[11px] text-muted-foreground" title={c.createdAt}>
                      {formatRelativeTime(c.createdAt)}
                    </span>
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed">{c.body}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-6">
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
                        <Textarea rows={3} placeholder="Add a comment…" {...field} />
                      </FormControl>
                      <div className="flex items-center justify-between">
                        <FormMessage />
                        <span
                          className={cn(
                            'ml-auto text-[11px] text-muted-foreground',
                            body.length > MAX - 50 && 'text-amber-600',
                            body.length > MAX && 'text-destructive'
                          )}
                        >
                          {body.length} / {MAX}
                        </span>
                      </div>
                    </FormItem>
                  )}
                />
                <div className="flex justify-end">
                  <Button type="submit" disabled={add.isPending}>
                    <Send className="mr-1.5 h-4 w-4" />
                    {add.isPending ? 'Posting…' : 'Comment'}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-3xl">
      <Skeleton className="mb-4 h-8 w-24" />
      <Card>
        <Skeleton className="h-1.5 w-full rounded-none" />
        <CardContent className="p-6 sm:p-8">
          <div className="flex gap-3">
            <Skeleton className="h-11 w-11 rounded-full" />
            <Skeleton className="h-11 w-11 rounded-full" />
          </div>
          <Skeleton className="mt-5 h-5 w-full" />
          <Skeleton className="mt-2 h-5 w-5/6" />
          <Skeleton className="mt-4 h-3 w-40" />
        </CardContent>
      </Card>
    </div>
  )
}
