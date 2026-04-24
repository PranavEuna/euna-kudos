export async function apiFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json')
  if (import.meta.env.DEV) {
    const devEmail = localStorage.getItem('dev_user_email')
    if (devEmail) headers.set('X-Dev-User-Email', devEmail)
  }
  return fetch(`/api${path}`, { ...init, headers, credentials: 'include' })
}
