import { useState } from 'react'
import {
  createRootRoute,
  Outlet,
  Link,
  useNavigate,
  useRouterState,
} from '@tanstack/react-router'
import { Menu, Moon, Sun, Plus, LogOut, ShieldCheck, Home } from 'lucide-react'
import { AuthProvider, useAuth } from '@/lib/auth'
import { useTheme } from '@/lib/theme'
import { useKeyboardShortcuts } from '@/lib/shortcuts'
import { cn } from '@/lib/utils'
import { DevLogin } from '@/components/DevLogin'
import { EunaLogo } from '@/components/EunaLogo'
import { UserAvatar } from '@/components/UserAvatar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'

export const Route = createRootRoute({
  component: () => (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  ),
})

type NavItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }>; exact?: boolean; adminOnly?: boolean }

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Feed', icon: Home, exact: true },
  { to: '/new', label: 'Give Kudos', icon: Plus },
  { to: '/admin', label: 'Admin', icon: ShieldCheck, adminOnly: true },
]

function Shell() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
    )
  }

  if (!user && import.meta.env.DEV) return <DevLogin />
  if (!user) return <div className="grid min-h-screen place-items-center p-8 text-muted-foreground">Not authenticated. Reloading…</div>

  return <AppShell />
}

function AppShell() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [signOutOpen, setSignOutOpen] = useState(false)
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  useKeyboardShortcuts([
    { key: 'g', handler: () => navigate({ to: '/' }) },
    { key: 'n', handler: () => navigate({ to: '/new' }) },
  ])

  const items = NAV_ITEMS.filter((i) => !i.adminOnly || user?.isAdmin)

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname.startsWith(to)

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <Link to="/" className="shrink-0">
            <EunaLogo />
          </Link>

          <nav className="ml-6 hidden items-center gap-1 md:flex">
            {items.map(({ to, label, icon: Icon, exact }) => {
              const active = isActive(to, exact)
              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              )
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <div className="hidden md:flex items-center gap-2 pl-2">
              <UserAvatar email={user!.email} name={user!.name} size="sm" />
              <div className="hidden leading-tight lg:block">
                <div className="text-sm font-medium">{user!.name}</div>
                <div className="text-[11px] text-muted-foreground">{user!.email}</div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => setSignOutOpen(true)}
              >
                <LogOut className="h-4 w-4" />
                <span className="sr-only">Sign out</span>
              </Button>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>

      <footer className="mt-16 border-t bg-muted/20">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:px-6">
          <div className="flex items-center gap-2">
            <EunaLogo showWordmark={false} />
            <span>Euna Kudos — built for the Euna Solutions team.</span>
          </div>
          <div className="flex items-center gap-3">
            <kbd className="rounded border bg-background px-1.5 py-0.5 font-mono text-[10px]">g</kbd>
            <span>feed</span>
            <kbd className="rounded border bg-background px-1.5 py-0.5 font-mono text-[10px]">n</kbd>
            <span>new kudos</span>
          </div>
        </div>
      </footer>

      {/* Mobile menu */}
      <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <EunaLogo />
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2 flex items-center gap-3 rounded-md border bg-muted/30 p-3">
            <UserAvatar email={user!.email} name={user!.name} size="md" />
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{user!.name}</div>
              <div className="truncate text-xs text-muted-foreground">{user!.email}</div>
            </div>
            {user!.isAdmin && (
              <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                Admin
              </span>
            )}
          </div>
          <nav className="flex flex-col gap-1">
            {items.map(({ to, label, icon: Icon, exact }) => {
              const active = isActive(to, exact)
              return (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              )
            })}
          </nav>
          <DialogFooter className="mt-2 !justify-start">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setMenuOpen(false)
                setSignOutOpen(true)
              }}
            >
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sign-out confirm */}
      <Dialog open={signOutOpen} onOpenChange={setSignOutOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Sign out?</DialogTitle>
            <DialogDescription>
              You'll be returned to the sign-in screen.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSignOutOpen(false)}>Cancel</Button>
            <Button onClick={signOut}>Sign out</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ThemeToggle() {
  const { resolvedTheme, toggle } = useTheme()
  const isDark = resolvedTheme === 'dark'
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  )
}
