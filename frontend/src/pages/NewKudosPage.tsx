import { Link, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ArrowLeft, Send, Sparkles } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UserAvatar } from '@/components/UserAvatar'
import { CategoryChip } from '@/components/CategoryChip'
import { cn } from '@/lib/utils'
import {
  KUDOS_CATEGORIES,
  CATEGORY_LABEL,
  CATEGORY_EMOJI,
  type KudosCategory,
  type UserLite,
} from '@/lib/kudos'

const MAX = 1000

const schema = z.object({
  toUserId: z.string().uuid('Pick a recipient'),
  category: z.enum(KUDOS_CATEGORIES),
  message: z.string().trim().min(1, 'Say something kind').max(MAX, `Max ${MAX} characters`),
})
type FormValues = z.infer<typeof schema>

async function fetchUsers(): Promise<UserLite[]> {
  const res = await apiFetch('/users')
  if (!res.ok) throw new Error('Failed to load users')
  return res.json()
}

async function createKudos(values: FormValues) {
  const res = await apiFetch('/kudos', { method: 'POST', body: JSON.stringify(values) })
  if (!res.ok) {
    const txt = await res.text()
    try {
      const obj = JSON.parse(txt)
      throw new Error(obj?.error === 'cannot give kudos to yourself' ? 'You cannot give kudos to yourself.' : obj?.message || obj?.error || 'Failed to create kudos')
    } catch (e) {
      if (e instanceof Error) throw e
      throw new Error(txt || 'Failed to create kudos')
    }
  }
  return res.json()
}

export function NewKudosPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user } = useAuth()

  const usersQ = useQuery({ queryKey: ['users'], queryFn: fetchUsers })
  const recipients = (usersQ.data ?? []).filter((u) => u.id !== user?.id)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { toUserId: '', category: 'teamwork', message: '' },
  })

  const create = useMutation({
    mutationFn: createKudos,
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['kudos'] })
      qc.invalidateQueries({ queryKey: ['category-counts'] })
      qc.invalidateQueries({ queryKey: ['top-recipients'] })
      const to = recipients.find((u) => u.id === vars.toUserId)?.name ?? 'your teammate'
      toast.success('Kudos posted!', { description: `${to} will see it on the feed.` })
      navigate({ to: '/' })
    },
    onError: (err: Error) => {
      toast.error('Could not post kudos', { description: err.message })
    },
  })

  const selectedRecipient = recipients.find((u) => u.id === form.watch('toUserId'))
  const selectedCategory = form.watch('category') as KudosCategory
  const message = form.watch('message') ?? ''

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0">
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
          <Link to="/">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to feed
          </Link>
        </Button>

        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Give kudos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((v) => create.mutate(v))}
                className="space-y-6"
              >
                <FormField
                  control={form.control}
                  name="toUserId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Who deserves it?</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Pick a teammate…" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {recipients.length === 0 && (
                            <SelectItem value="__none" disabled>
                              No other users yet — ask a teammate to sign in first.
                            </SelectItem>
                          )}
                          {recipients.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              <div className="flex items-center gap-2">
                                <UserAvatar email={u.email} name={u.name} size="sm" />
                                <div className="flex flex-col leading-tight">
                                  <span className="text-sm font-medium">{u.name}</span>
                                  <span className="text-[11px] text-muted-foreground">{u.email}</span>
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <div className="flex flex-wrap gap-2">
                        {KUDOS_CATEGORIES.map((c) => (
                          <CategoryChip
                            key={c}
                            category={c}
                            active={field.value === c}
                            onClick={() => field.onChange(c)}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={5}
                          placeholder="What did they do? Be specific — examples make it land."
                          {...field}
                        />
                      </FormControl>
                      <div className="flex items-center justify-between">
                        <FormMessage />
                        <span
                          className={cn(
                            'ml-auto text-[11px] text-muted-foreground',
                            message.length > MAX - 50 && 'text-amber-600',
                            message.length > MAX && 'text-destructive'
                          )}
                        >
                          {message.length} / {MAX}
                        </span>
                      </div>
                    </FormItem>
                  )}
                />

                <div className="flex items-center justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => navigate({ to: '/' })}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={create.isPending}>
                    <Send className="mr-1.5 h-4 w-4" />
                    {create.isPending ? 'Posting…' : 'Post kudos'}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      <aside className="lg:sticky lg:top-20 lg:self-start">
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="text-sm">Preview</CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            {!selectedRecipient ? (
              <p className="text-sm text-muted-foreground">
                Pick a teammate and write a message to see how it'll look on the feed.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <UserAvatar email={user!.email} name={user!.name} size="md" />
                  <div className="text-sm">
                    <span className="font-semibold">{user!.name}</span>
                    <span className="text-muted-foreground"> → </span>
                    <span className="font-semibold">{selectedRecipient.name}</span>
                  </div>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {message || (
                    <span className="text-muted-foreground">Your message will appear here.</span>
                  )}
                </p>
                <div className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]">
                  {CATEGORY_EMOJI[selectedCategory]} {CATEGORY_LABEL[selectedCategory]}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </aside>
    </div>
  )
}
