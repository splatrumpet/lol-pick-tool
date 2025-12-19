// src/components/LogoutButton.tsx
'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export function LogoutButton() {
  const [loading, setLoading] = useState(false)

  const handleLogout = async () => {
    try {
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
      disabled={loading}
      className="px-3 py-2 rounded-md border border-zinc-600 text-sm hover:bg-zinc-800 disabled:opacity-40"
    >
      {loading ? 'ログアウト中…' : 'ログアウト'}
    </button>
  )
}
