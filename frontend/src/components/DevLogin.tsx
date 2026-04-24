import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function DevLogin() {
  const [email, setEmail] = useState('')

  const handleSubmit = (e: { preventDefault(): void }) => {
    e.preventDefault()
    if (!email.includes('@')) return
    localStorage.setItem('dev_user_email', email.toLowerCase().trim())
    window.location.reload()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-lg border bg-card p-6 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Development sign in</h1>
          <p className="text-sm text-muted-foreground">
            Local dev only. In production, Cloudflare Access handles sign-in.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoFocus
            required
            placeholder="you@euna.io"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full">Sign in</Button>
      </form>
    </div>
  )
}
