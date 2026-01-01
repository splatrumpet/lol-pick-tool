// src/lib/supabaseClient.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

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

const buildConfigError = (message: string) => {
  const error = new Error(message)
  console.error(message)
  return error
}

let supabaseConfigError: Error | null = null
let supabaseClient: SupabaseClient | null = null

try {
  if (!supabaseUrl || !supabaseAnonKey) {
    const missing: string[] = []
    if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL')
    if (!supabaseAnonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    throw buildConfigError(
      `Supabaseの環境変数が不足しています: ${missing.join(', ')}`
    )
  }

  assertClientKeyIsAnon(supabaseAnonKey)
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
} catch (error) {
  supabaseConfigError =
    error instanceof Error
      ? error
      : buildConfigError('Supabaseクライアントの初期化に失敗しました。')
}

export const supabase = supabaseClient
export { supabaseConfigError }
