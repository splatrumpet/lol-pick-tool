// src/app/rooms/new/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type Room = {
  id: string
  name: string | null
  note: string | null
  created_at: string
}

export default function CreateRoomPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [newRoomName, setNewRoomName] = useState('')
  const [newRoomNote, setNewRoomNote] = useState('')

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      const { data: userData } = await supabase.auth.getUser()
      setUser(userData.user ?? null)
      setLoading(false)
    }

    init()
  }, [])

  const handleCreateRoom = async () => {
    if (!user) {
      alert('ログインしてください')
      return
    }

    const name = newRoomName.trim() || '新しいルーム'
    const note = newRoomNote.trim() || null

    const { data, error } = await supabase
      .from('rooms')
      .insert({
        owner_id: user.id,
        name,
        note,
      })
      .select()

    if (error) {
      alert(error.message)
      return
    }

    const room = data?.[0] as Room | undefined
    if (!room) return

    router.push(`/rooms/${room.id}`)
  }

  if (loading) {
    return (
      <div className="py-6">
        <div className="text-sm text-zinc-400">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="py-6 space-y-6 max-w-3xl mx-auto">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-emerald-200/70">
          Create Room
        </p>
        <h1 className="text-2xl sm:text-3xl font-semibold">
          ルームを作成する
        </h1>
        <p className="text-sm text-zinc-400">
          ランクやフレックス用にルームを作成して、URLをフレンドに共有してください。
        </p>
      </header>

      <section className="border border-zinc-800 rounded-2xl bg-zinc-900/70 p-5 shadow-lg shadow-black/30 space-y-4">
        {!user ? (
          <p className="text-sm text-red-300">
            ルームを作成するにはログインしてください。
          </p>
        ) : (
          <div className="flex flex-col gap-4 text-sm">
            <div className="flex flex-col gap-1.5">
              <label className="text-zinc-400 text-[11px]">ルーム名</label>
              <input
                type="text"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="例: ランク用ドラフト"
                className="bg-zinc-950 border border-zinc-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/60 focus:border-emerald-500/60"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-zinc-400 text-[11px]">
                メモ（任意）
              </label>
              <textarea
                value={newRoomNote}
                onChange={(e) => setNewRoomNote(e.target.value)}
                placeholder="BAN方針や構成のメモなど"
                className="bg-zinc-950 border border-zinc-700 rounded-md px-3 py-2 text-sm min-h-[90px] focus:outline-none focus:ring-1 focus:ring-emerald-500/60 focus:border-emerald-500/60"
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link
                href="/rooms"
                className="text-xs text-zinc-400 hover:text-zinc-200"
              >
                ルーム一覧に戻る
              </Link>
              <button
                onClick={handleCreateRoom}
                className="px-5 py-2 rounded-md bg-emerald-500 text-black text-sm font-semibold hover:bg-emerald-400 transition shadow shadow-emerald-500/30"
              >
                作成して入室
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
