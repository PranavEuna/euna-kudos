import { useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import {
  KUDOS_CATEGORIES,
  CATEGORY_LABEL,
  CATEGORY_EMOJI,
  type UserLite,
} from '@/lib/kudos'

const schema = z.object({
  toUserId: z.string().uuid('Pick a recipient'),
  category: z.enum(KUDOS_CATEGORIES),
  message: z.string().trim().min(1, 'Message is required').max(1000, 'Max 1000 characters'),
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
    const msg = await res.text()
    throw new Error(msg || 'Failed to create kudos')
  }
  return res.json()
}

export function NewKudosPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user } = useAuth()

  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: fetchUsers })
  const recipients = users.filter((u) => u.id !== user?.id)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { toUserId: '', category: 'teamwork', message: '' },
  })

  const create = useMutation({
    mutationFn: createKudos,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kudos'] })
      navigate({ to: '/' })
    },
  })

  return (
    <div className="p-8">
      <div className="max-w-xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Give Kudos</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((v) => create.mutate(v))}
                className="space-y-5"
              >
                <FormField
                  control={form.control}
                  name="toUserId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recipient</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
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
                              {u.name} <span className="text-muted-foreground">({u.email})</span>
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
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {KUDOS_CATEGORIES.map((c) => (
                            <SelectItem key={c} value={c}>
                              {CATEGORY_EMOJI[c]} {CATEGORY_LABEL[c]}
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
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={5}
                          placeholder="What did they do that deserves recognition?"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {create.error && (
                  <p className="text-sm text-destructive">{(create.error as Error).message}</p>
                )}

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => navigate({ to: '/' })}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={create.isPending}>
                    {create.isPending ? 'Posting…' : 'Post Kudos'}
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
