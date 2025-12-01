// src/app/rooms/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type Room = {
  id: string
  name: string | null
  note: string | null
  created_at: string
}

export default function RoomsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)

  const [newRoomName, setNewRoomName] = useState('')
  const [newRoomNote, setNewRoomNote] = useState('')

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) {
        setUser(null)
        setLoading(false)
        return
      }
      setUser(userData.user)

      // 自分がオーナーのルーム
      const { data: ownedRooms } = await supabase
        .from('rooms')
        .select('*')
        .eq('owner_id', userData.user.id)
        .order('created_at', { ascending: false })

      // メンバーとして参加しているルーム
      const { data: memberRows } = await supabase
        .from('room_members')
        .select('room_id')
        .eq('user_id', userData.user.id)

      const memberRoomIds = (memberRows || []).map((m: any) => m.room_id)

      let memberRooms: Room[] = []
      if (memberRoomIds.length > 0) {
        const { data } = await supabase
          .from('rooms')
          .select('*')
          .in('id', memberRoomIds)
          .order('created_at', { ascending: false })

        memberRooms =
          (data || []).map((r: any) => ({
            id: r.id,
            name: r.name,
            note: r.note,
            created_at: r.created_at,
          })) ?? []
      }

      const ownedMapped: Room[] =
        (ownedRooms || []).map((r: any) => ({
          id: r.id,
          name: r.name,
          note: r.note,
          created_at: r.created_at,
        })) ?? []

      const map = new Map<string, Room>()
      ownedMapped.forEach((r) => map.set(r.id, r))
      memberRooms.forEach((r) => map.set(r.id, r))
      setRooms(Array.from(map.values()))
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
      .select() // ← 配列で返ってくる

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

  if (!user) {
    return (
      <div className="py-6">
        <p className="text-sm text-zinc-300">
          ルーム一覧を表示するにはログインしてください。
        </p>
      </div>
    )
  }

  return (
    <div className="py-4 space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">ルーム一覧</h1>
        <p className="text-xs text-zinc-400">
          ランクやフレックス用にルームを作成して、URLをフレンドに共有してください。
        </p>
      </header>

      {/* 新規ルーム作成 */}
      <section className="border border-zinc-800 rounded-xl bg-zinc-900/70 p-4 shadow-lg shadow-black/30">
        <h2 className="text-sm font-semibold mb-3">新規ルーム作成</h2>
        <div className="flex flex-col gap-3 text-sm">
          <div className="flex flex-col gap-1">
            <label className="text-zinc-400 text-[11px]">ルーム名</label>
            <input
              type="text"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="例: ランク用ドラフト"
              className="bg-zinc-950 border border-zinc-700 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/60 focus:border-emerald-500/60"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-zinc-400 text-[11px]">メモ（任意）</label>
            <textarea
              value={newRoomNote}
              onChange={(e) => setNewRoomNote(e.target.value)}
              placeholder="BAN方針や構成のメモなど"
              className="bg-zinc-950 border border-zinc-700 rounded-md px-2 py-1 text-sm min-h-[60px] focus:outline-none focus:ring-1 focus:ring-emerald-500/60 focus:border-emerald-500/60"
            />
          </div>
          <div className="flex justify-end pt-1">
            <button
              onClick={handleCreateRoom}
              className="px-4 py-1.5 rounded-md bg-emerald-500 text-black text-sm font-medium hover:bg-emerald-400 transition shadow shadow-emerald-500/30"
            >
              作成して入室
            </button>
          </div>
        </div>
      </section>

      {/* ルーム一覧 */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold">参加中のルーム</h2>
        {rooms.length === 0 ? (
          <p className="text-xs text-zinc-500">
            まだルームがありません。「新規ルーム作成」から作成してください。
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {rooms.map((room) => (
              <button
                key={room.id}
                onClick={() => router.push(`/rooms/${room.id}`)}
                className="text-left bg-zinc-900/70 hover:bg-zinc-800/80 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm transition shadow-sm hover:shadow-md hover:shadow-black/30"
              >
                <div className="flex justify-between items-center gap-2">
                  <span className="font-medium">
                    {room.name ?? '名前なしルーム'}
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    {new Date(room.created_at).toLocaleString()}
                  </span>
                </div>
                {room.note && (
                  <p className="mt-1 text-xs text-zinc-400 line-clamp-2">
                    {room.note}
                  </p>
                )}
                <p className="mt-1 text-[10px] text-zinc-600 font-mono">
                  {room.id}
                </p>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
