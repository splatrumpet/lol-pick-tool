// src/app/rooms/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import type { User } from '@supabase/supabase-js'

type Room = {
  id: string
  name: string | null
  note: string | null
  created_at: string
}

type RoomMemberRef = {
  room_id: string
}

export default function RoomsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [roomQuery, setRoomQuery] = useState('')

  const normalizedQuery = roomQuery.trim().toLowerCase()
  const filteredRooms = normalizedQuery
    ? rooms.filter((room) => {
        const haystack = [room.name, room.note, room.id]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return haystack.includes(normalizedQuery)
      })
    : rooms

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

      const memberRoomIds = (memberRows || []).map((m) => (m as RoomMemberRef).room_id)

      let memberRooms: Room[] = []
      if (memberRoomIds.length > 0) {
        const { data } = await supabase
          .from('rooms')
          .select('*')
          .in('id', memberRoomIds)
          .order('created_at', { ascending: false })

        memberRooms =
          (data || []).map((r) => {
            const room = r as Room
            return ({
            id: room.id,
            name: room.name,
            note: room.note,
            created_at: room.created_at,
          })
          }) ?? []
      }

      const ownedMapped: Room[] =
        (ownedRooms || []).map((r) => {
          const room = r as Room
          return ({
          id: room.id,
          name: room.name,
          note: room.note,
          created_at: room.created_at,
        })
        }) ?? []

      const map = new Map<string, Room>()
      ownedMapped.forEach((r) => map.set(r.id, r))
      memberRooms.forEach((r) => map.set(r.id, r))
      setRooms(Array.from(map.values()))
      setLoading(false)
    }

    init()
  }, [])

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

      {/* ルーム一覧 */}
      <section className="space-y-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold">参加中のルーム</h2>
          <div className="flex items-center gap-2">
            <Link
              href="/rooms/new"
              className="inline-flex items-center justify-center rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-black shadow shadow-emerald-500/30 hover:bg-emerald-400 transition"
            >
              ルームを作成
            </Link>
          </div>
        </div>
        <div className="border border-zinc-800 rounded-xl bg-zinc-900/70 p-3 sm:p-4">
          <label
            className="block text-[11px] text-zinc-400 mb-2"
            htmlFor="room-search"
          >
            ルーム検索
          </label>
          <input
            id="room-search"
            type="text"
            value={roomQuery}
            onChange={(e) => setRoomQuery(e.target.value)}
            placeholder="ルーム名・メモ・IDで検索"
            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/60 focus:border-emerald-500/60"
          />
        </div>
        {rooms.length === 0 ? (
          <p className="text-xs text-zinc-500">
            まだルームがありません。「新規ルーム作成」から作成してください。
          </p>
        ) : filteredRooms.length === 0 ? (
          <p className="text-xs text-zinc-500">
            検索条件に一致するルームがありません。
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {filteredRooms.map((room) => (
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
