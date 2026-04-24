import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EunaLogo } from '@/components/EunaLogo'

const ALLOWED_DOMAIN = 'eunasolutions.com'

export function DevLogin() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: { preventDefault(): void }) => {
    e.preventDefault()
    const normalized = email.toLowerCase().trim()
    if (!normalized.includes('@')) return
    if (!normalized.endsWith(`@${ALLOWED_DOMAIN}`)) {
      setError(`Sign-in is restricted to @${ALLOWED_DOMAIN} emails.`)
      return
    }
    localStorage.setItem('dev_user_email', normalized)
    window.location.reload()
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 euna-hero-gradient opacity-[0.18]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle_at_15%_10%,rgba(97,69,247,0.35),transparent_35%),radial-gradient(circle_at_85%_80%,rgba(231,105,13,0.25),transparent_40%)]"
      />
      <div className="relative flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-6 flex justify-center">
            <EunaLogo />
          </div>
          <form
            onSubmit={handleSubmit}
            className="space-y-5 rounded-2xl border bg-card/95 p-7 shadow-xl backdrop-blur"
          >
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
                <Sparkles className="h-3 w-3" /> Local development
              </div>
              <h1 className="text-xl font-bold tracking-tight">Welcome to Euna Kudos</h1>
              <p className="text-sm text-muted-foreground">
                In production, Cloudflare Access signs you in automatically. Locally, enter an{' '}
                <span className="font-mono">@{ALLOWED_DOMAIN}</span> email to continue.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoFocus
                required
                placeholder={`you@${ALLOWED_DOMAIN}`}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (error) setError(null)
                }}
              />
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground">
                Tip: include <span className="font-mono">admin</span> in your email to get admin powers locally.
              </p>
            </div>
            <Button type="submit" className="w-full" size="lg">
              Sign in
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
