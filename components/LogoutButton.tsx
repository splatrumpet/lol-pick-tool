// src/components/LogoutButton.tsx
'use client'

import { useState } from 'react'
import { supabase, supabaseConfigError } from '@/lib/supabaseClient'

export function LogoutButton() {
  const [loading, setLoading] = useState(false)
  const supabaseReady = !!supabase && !supabaseConfigError

  const handleLogout = async () => {
    try {
      if (!supabaseReady || !supabase) {
        alert('Supabase の設定を確認してください。')
        return
      }
      setLoading(true)
      // セッション削除
      await supabase.auth.signOut()
      // ログアウト後の画面へ遷移（ここではトップページに戻す）
      window.location.href = '/'
    } catch (e) {
      console.error(e)
      alert('ログアウトに失敗しました')
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading || !supabaseReady}
      className="px-3 py-2 rounded-md border border-zinc-600 text-sm hover:bg-zinc-800 disabled:opacity-40"
    >
      {loading ? 'ログアウト中…' : 'ログアウト'}
    </button>
  )
}
