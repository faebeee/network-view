/** Base path of the backend API. Vite proxies it to the NestJS server in development. */
export const API_BASE = '/api'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string | string[] }
    if (Array.isArray(body.message)) return body.message.join(', ')
    if (body.message) return body.message
  } catch {
    // Not JSON; fall through.
  }
  return `${response.status} ${response.statusText}`
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  })
  if (!response.ok) throw new ApiError(response.status, await readError(response))
  return (await response.json()) as T
}

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`
}
