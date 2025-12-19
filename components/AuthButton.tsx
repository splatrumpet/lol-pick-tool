// src/components/AuthButton.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

type AuthUser = {
  id: string
}

export function AuthButton() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [initializing, setInitializing] = useState(true)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    // ① 初期表示時に一度だけ現在のユーザーを取得
    const init = async () => {
      const { data } = await supabase.auth.getUser()
      setUser(data.user ? { id: data.user.id } : null)
      setInitializing(false)
    }

    init()

    // ② ログイン／ログアウトの変化を購読
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      // signIn / signOut などが発生したときに毎回呼ばれる
      if (session?.user) {
        setUser({ id: session.user.id })
      } else {
        setUser(null)
      }
    })

    // アンマウント時に購読解除
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const handleLogout = async () => {
    try {
      setLoggingOut(true)
      await supabase.auth.signOut()
      // サインアウト後の画面に自動で遷移（トップへ）
      window.location.href = '/'
    } catch (e) {
      console.error(e)
      alert('ログアウトに失敗しました')
      setLoggingOut(false)
    }
  }

  const baseClass =
    'px-3 py-2 rounded-md border border-emerald-500/60 text-sm text-emerald-300 hover:bg-emerald-500/10 transition'

  // 初期読み込み中（見た目は崩さず、薄いボタンにしておく）
  if (initializing) {
    return (
      <button className={baseClass + ' opacity-60 cursor-default'} disabled>
        ...
      </button>
    )
  }

  // 未ログイン → これまで通りの「ログイン / 新規登録」
  if (!user) {
    return (
      <Link href="/login" className={baseClass}>
        ログイン / 新規登録
      </Link>
    )
  }

  // ログイン中 → 同じ見た目で「ログアウト」ボタンに
  return (
    <button
      onClick={handleLogout}
      disabled={loggingOut}
      className={baseClass}
    >
      {loggingOut ? 'ログアウト中…' : 'ログアウト'}
    </button>
  )
}
