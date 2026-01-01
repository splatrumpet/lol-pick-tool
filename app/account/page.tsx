// src/app/account/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { LogoutButton } from '@/components/LogoutButton'

export default function AccountPage() {
  const [user, setUser] = useState<any>(null)
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      const { data } = await supabase.auth.getUser()
      const u = data.user
      setUser(u || null)

      if (u) {
        const meta = (u.user_metadata || {}) as any
        const fromMeta =
          (meta.display_name as string | undefined) ||
          (meta.full_name as string | undefined)

        const fromEmail = u.email ? u.email.split('@')[0] : ''

        setDisplayName(fromMeta || fromEmail || '')
      }

      setLoading(false)
    }

    init()
  }, [])

  const handleSave = async () => {
    if (!user) return
    const name = displayName.trim()
    if (!name) {
      alert('表示名を入力してください')
      return
    }

    setSaving(true)
    const { error } = await supabase.auth.updateUser({
      data: { display_name: name },
    })
    setSaving(false)

    if (error) {
      console.error(error)
      alert('保存に失敗しました: ' + error.message)
      return
    }

    alert('表示名を保存しました')
  }

  if (loading) {
    return (
      <div className="p-6 text-sm text-zinc-300">
        アカウント情報を読み込み中です…
      </div>
    )
  }

  if (!user) {
    return (
      <div className="p-6 md:p-10 max-w-2xl mx-auto space-y-2 text-sm text-zinc-200 fade-in">
        <p>ログインしていません。</p>
        <p className="text-xs text-zinc-400">
          ログイン後、このページで表示名を設定できます。
        </p>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto space-y-8 text-sm text-zinc-200 fade-in">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-white/10">
        <div>
          <h1 className="text-lg font-semibold">アカウント設定</h1>
          <p className="text-xs text-zinc-400">
            ここで設定した表示名が、ルームのメンバー一覧などに使われます。
          </p>
        </div>
        <LogoutButton />
      </header>

      <section className="glass-panel rounded-2xl p-5 space-y-4">
        <div className="space-y-1">
          <div className="text-[11px] text-zinc-500">メールアドレス</div>
          <div className="text-sm">{user.email}</div>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] text-zinc-500">
            表示名（ルームで表示される名前）
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full bg-zinc-950/70 border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/60"
            placeholder="サモナーネーム"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 rounded-md bg-emerald-500 text-black text-sm font-semibold hover:bg-emerald-400 disabled:opacity-40 transition shadow-[0_10px_30px_-18px_rgba(16,185,129,0.9)]"
        >
          {saving ? '保存中…' : '保存する'}
        </button>
      </section>
    </div>
  )
}
