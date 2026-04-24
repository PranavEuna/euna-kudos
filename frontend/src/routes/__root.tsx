import { createRootRoute, Outlet, Link } from '@tanstack/react-router'
import { AuthProvider, useAuth } from '@/lib/auth'
import { DevLogin } from '@/components/DevLogin'
import { Button } from '@/components/ui/button'

export const Route = createRootRoute({
  component: () => (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  ),
})

const navClass = 'text-sm text-muted-foreground hover:text-foreground transition-colors'
const activeClass = 'text-sm font-medium text-foreground'

function Shell() {
  const { user, loading, signOut } = useAuth()

  if (loading) return <div className="p-8 text-muted-foreground">Loading…</div>

  if (!user && import.meta.env.DEV) return <DevLogin />

  if (!user) return <div className="p-8">Not authenticated. Reloading…</div>

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <nav className="flex items-center gap-6">
          <span className="text-sm font-semibold">💛 Euna Kudos</span>
          <Link
            to="/"
            activeOptions={{ exact: true }}
            activeProps={{ className: activeClass }}
            inactiveProps={{ className: navClass }}
          >
            Feed
          </Link>
          <Link
            to="/new"
            activeProps={{ className: activeClass }}
            inactiveProps={{ className: navClass }}
          >
            Give Kudos
          </Link>
          {user.isAdmin && (
            <Link
              to="/admin"
              activeProps={{ className: activeClass }}
              inactiveProps={{ className: navClass }}
            >
              Admin
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{user.email}</span>
          <Button variant="ghost" size="sm" onClick={signOut}>Sign out</Button>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
