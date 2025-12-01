// src/app/login/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type Mode = 'login' | 'signup'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (data.user) {
        router.replace('/')
      }
    }
    checkUser()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    setErrorMessage(null)

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) {
          setErrorMessage(error.message)
          setLoading(false)
          return
        }
        router.push('/')
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) {
          setErrorMessage(error.message)
          setLoading(false)
          return
        }

        if (data.user && !data.session) {
          // メール確認が必要な設定の場合
          setMessage('登録しました。メールに届く確認リンクをチェックしてください。')
        } else {
          setMessage('登録しました。マイページへ移動します。')
          router.push('/')
        }
      }
    } catch (err) {
      console.error(err)
      setErrorMessage('エラーが発生しました。時間をおいて再度お試しください。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="py-10 flex justify-center">
      <div className="w-full max-w-md border border-zinc-800 rounded-2xl bg-zinc-900/80 shadow-xl shadow-black/40 p-6 space-y-6">
        <header className="space-y-1 text-center">
          <h1 className="text-xl font-semibold">
            {mode === 'login' ? 'ログイン' : 'アカウント登録'}
          </h1>
          <p className="text-xs text-zinc-400">
            LoLピックツールを使うには、メールアドレスとパスワードで認証してください。
          </p>
        </header>

        {/* タブ切り替え */}
        <div className="flex text-xs rounded-full bg-zinc-950/80 border border-zinc-800 p-1">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 py-1.5 rounded-full transition ${mode === 'login'
                ? 'bg-emerald-500 text-black font-medium'
                : 'text-zinc-400 hover:text-zinc-200'
              }`}
          >
            ログイン
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`flex-1 py-1.5 rounded-full transition ${mode === 'signup'
                ? 'bg-emerald-500 text-black font-medium'
                : 'text-zinc-400 hover:text-zinc-200'
              }`}
          >
            新規登録
          </button>
        </div>

        {/* メッセージ */}
        {errorMessage && (
          <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/40 rounded-md px-3 py-2">
            {errorMessage}
          </div>
        )}
        {message && (
          <div className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/40 rounded-md px-3 py-2">
            {message}
          </div>
        )}

        {/* フォーム本体 */}
        <form onSubmit={handleSubmit} className="space-y-3 text-sm">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-zinc-400">メールアドレス</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-zinc-950 border border-zinc-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/60 focus:border-emerald-500/60"
              placeholder="you@example.com"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-zinc-400">パスワード</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-zinc-950 border border-zinc-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/60 focus:border-emerald-500/60"
              placeholder="8文字以上を推奨"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 px-4 py-2.5 rounded-md bg-emerald-500 text-black text-sm font-medium hover:bg-emerald-400 transition shadow shadow-emerald-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? mode === 'login'
                ? 'ログイン中...'
                : '登録中...'
              : mode === 'login'
                ? 'ログイン'
                : 'アカウント作成'}
          </button>
        </form>

        <div className="text-[11px] text-zinc-500 text-center pt-1">
          テスト用なら、適当なメール＋パスワードで登録してからログインすればOKです。
        </div>
      </div>
    </div>
  )
}
