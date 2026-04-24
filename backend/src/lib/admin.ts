import type { Context } from 'hono'

export const ADMIN_GROUP = 'app-admins'

export function isAdmin(c: Context): boolean {
  const user = c.get('user')
  return Array.isArray(user?.groups) && user.groups.includes(ADMIN_GROUP)
}
