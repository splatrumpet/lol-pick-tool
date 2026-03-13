import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const decodeJwtPayload = (token: string): Record<string, unknown> => {
  const parts = token.split('.')
  if (parts.length < 2) {
    throw new Error('Supabase key is not a valid JWT.')
  }

  const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
  const decoded =
    typeof atob === 'function'
      ? atob(padded)
      : Buffer.from(padded, 'base64').toString('utf-8')

  const payload = JSON.parse(decoded)
  if (!payload || typeof payload !== 'object') {
    throw new Error('Supabase key payload is invalid.')
  }
  return payload as Record<string, unknown>
}

const assertClientKeyIsAnon = (key: string) => {
  const payload = decodeJwtPayload(key)
  const role = payload.role
  if (typeof role === 'string' && role !== 'anon') {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_ANON_KEY must be an anon key, not a service role key.'
    )
  }
}

let client: SupabaseClient | null = null

const getSupabaseClient = (): SupabaseClient => {
  if (client) return client

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is required.')
  }

  if (!supabaseAnonKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required.')
  }

  assertClientKeyIsAnon(supabaseAnonKey)
  client = createClient(supabaseUrl, supabaseAnonKey)
  return client
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const active = getSupabaseClient()
    const value = active[prop as keyof SupabaseClient]
    return typeof value === 'function' ? value.bind(active) : value
  },
})
