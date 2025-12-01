// src/app/rooms/[roomId]/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { ROLES, Role } from '@/constants/roles'
import { PickBoard } from '@/components/PickBoard'

type Status = 'NONE' | 'PRIORITY' | 'PICKED' | 'UNAVAILABLE'

type PoolRow = {
  id: string
  champion_id: string
  role: Role
  proficiency: number
  user_id: string
  display_name: string
  champion: {
    id: string
    name: string
    icon_url: string | null
  }
}

type NoteRow = {
  id?: string
  room_id: string
  champion_id: string
  status: Status
}

type MemberRow = {
  id: string
  room_id: string
  user_id: string
  display_name: string
  role: Role
}

export default function RoomPage() {
  const params = useParams()
  const router = useRouter()
  const roomId = (params?.roomId as string) ?? ''

  const [user, setUser] = useState<any>(null)
  const [room, setRoom] = useState<any>(null)
  const [members, setMembers] = useState<MemberRow[]>([])
  const [pools, setPools] = useState<PoolRow[]>([])
  const [notes, setNotes] = useState<NoteRow[]>([])
  const [displayNameInput, setDisplayNameInput] = useState('')

  const [loading, setLoading] = useState(true)
  const [isEditingRoom, setIsEditingRoom] = useState(false)
  const [editRoomName, setEditRoomName] = useState('')
  const [editRoomNote, setEditRoomNote] = useState('')
  const [savingRoom, setSavingRoom] = useState(false)
  const [deletingRoom, setDeletingRoom] = useState(false)
  const [resettingNotes, setResettingNotes] = useState(false)

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

      // ルーム情報
      const { data: roomData } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single()

      if (!roomData) {
        setRoom(null)
        setLoading(false)
        return
      }

      setRoom(roomData)
      setEditRoomName(roomData.name ?? '')
      setEditRoomNote(roomData.note ?? '')

      // メンバー
      const { data: memberData } = await supabase
        .from('room_members')
        .select('*')
        .eq('room_id', roomId)

      const memberRows: MemberRow[] =
        (memberData || []).map((m: any) => ({
          id: m.id,
          room_id: m.room_id,
          user_id: m.user_id,
          display_name: m.display_name,
          role: m.role as Role,
        })) ?? []

      setMembers(memberRows)

      const memberUserIds = memberRows.map((m) => m.user_id)

      // メンバー全員分のチャンピオンプール
      if (memberUserIds.length > 0) {
        const { data: poolData } = await supabase
          .from('user_champion_pools')
          .select('id, champion_id, role, proficiency, user_id, champions(*)')
          .in('user_id', memberUserIds)

        // 🔧 修正ポイント①
        // 「このルームでその人が選んだロールと同じものだけ」採用する
        const poolsMapped: PoolRow[] =
          (poolData || []).flatMap((p: any) => {
            const member = memberRows.find((m) => m.user_id === p.user_id)
            if (!member) return []
            // ルーム上の担当ロールと違うロールのプールは、このルームでは使わない
            if (p.role !== member.role) return []
            return [
              {
                id: p.id,
                champion_id: p.champion_id,
                role: member.role, // p.role と同じだが明示
                proficiency: p.proficiency,
                user_id: p.user_id,
                display_name: member.display_name,
                champion: {
                  id: p.champions.id,
                  name: p.champions.name,
                  icon_url: p.champions.icon_url,
                },
              },
            ]
          }) ?? []

        setPools(poolsMapped)
      } else {
        setPools([])
      }

      // ピック状態（notes）
      const { data: noteData } = await supabase
        .from('room_champion_notes')
        .select('*')
        .eq('room_id', roomId)

      setNotes(
        (noteData || []).map((n: any) => ({
          id: n.id,
          room_id: n.room_id,
          champion_id: n.champion_id,
          status: n.status as Status,
        }))
      )

      setLoading(false)
    }

    if (roomId) {
      init()
    }
  }, [roomId])

  const currentMember = useMemo(
    () => members.find((m) => m.user_id === user?.id),
    [members, user]
  )

  const usedRoles = useMemo(
    () => new Set(members.map((m) => m.role)),
    [members]
  )

  const availableRoles = useMemo(
    () => ROLES.filter((r) => !usedRoles.has(r)),
    [usedRoles]
  )

  const handleJoinRoom = async (role: Role) => {
    if (!user) return
    const name = displayNameInput.trim() || user.email || 'NoName'

    const { data, error } = await supabase
      .from('room_members')
      .insert({
        room_id: roomId,
        user_id: user.id,
        display_name: name,
        role,
      })
      .select()
      .single()

    if (error) {
      alert(error.message)
      return
    }

    const newMember: MemberRow = {
      id: data.id,
      room_id: data.room_id,
      user_id: data.user_id,
      display_name: data.display_name,
      role: data.role as Role,
    }

    const newMembers = [...members, newMember]
    setMembers(newMembers)

    // 🔧 修正ポイント②
    // 参加したロールと同じロールのプールだけ取得
    const { data: poolData } = await supabase
      .from('user_champion_pools')
      .select('id, champion_id, role, proficiency, user_id, champions(*)')
      .eq('user_id', user.id)
      .eq('role', role)

    const addedPools: PoolRow[] =
      (poolData || []).map((p: any) => ({
        id: p.id,
        champion_id: p.champion_id,
        role: role,
        proficiency: p.proficiency,
        user_id: p.user_id,
        display_name: newMember.display_name,
        champion: {
          id: p.champions.id,
          name: p.champions.name,
          icon_url: p.champions.icon_url,
        },
      })) ?? []

    setPools((prev) => [...prev, ...addedPools])
  }

  const handleSaveRoom = async () => {
    if (!room) return
    setSavingRoom(true)

    const name = editRoomName.trim() || null
    const note = editRoomNote.trim() || null

    const { data, error } = await supabase
      .from('rooms')
      .update({
        name,
        note,
      })
      .eq('id', roomId)
      .select()
      .single()

    setSavingRoom(false)

    if (error) {
      alert(error.message)
      return
    }

    setRoom(data)
    setIsEditingRoom(false)
  }

  const handleDeleteRoom = async () => {
    if (!room) return
    if (!user || user.id !== room.owner_id) {
      alert('ルームの削除はオーナーのみが行えます。')
      return
    }

    const ok = window.confirm(
      'このルームを削除しますか？\nメンバーやピック状態もすべて削除されます。'
    )
    if (!ok) return

    setDeletingRoom(true)

    const { error } = await supabase
      .from('rooms')
      .delete()
      .eq('id', roomId)

    setDeletingRoom(false)

    if (error) {
      alert(error.message)
      return
    }

    router.push('/rooms')
  }

  const handleResetNotes = async () => {
    if (!room) return
    if (!user || user.id !== room.owner_id) {
      alert('リセットはルームオーナーのみが実行できます。')
      return
    }

    const ok = window.confirm(
      'このルームの全員のピック状態をリセットしますか？'
    )
    if (!ok) return

    setResettingNotes(true)

    const { error } = await supabase
      .from('room_champion_notes')
      .delete()
      .eq('room_id', roomId)

    setResettingNotes(false)

    if (error) {
      alert(error.message)
      return
    }

    setNotes([])
  }

  if (loading) {
    return <div className="py-6 text-sm text-zinc-400">読み込み中...</div>
  }

  if (!user) {
    return (
      <div className="py-6 text-sm text-zinc-300">
        ピック検討画面を使うにはログインしてください。
      </div>
    )
  }

  if (!room) {
    return (
      <div className="py-6 text-sm text-zinc-300">
        ルームが見つかりません。
      </div>
    )
  }

  return (
    <div className="py-4 space-y-4">
      {/* ルーム情報カード */}
      <section className="border border-zinc-800 rounded-xl bg-zinc-900/70 p-4 shadow-lg shadow-black/30 space-y-3">
        <header className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-1">
            {isEditingRoom ? (
              <>
                <input
                  type="text"
                  value={editRoomName}
                  onChange={(e) => setEditRoomName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500/60"
                  placeholder="ルーム名"
                />
                <textarea
                  value={editRoomNote}
                  onChange={(e) => setEditRoomNote(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-sm min-h-[60px] focus:outline-none focus:ring-1 focus:ring-emerald-500/60"
                  placeholder="BAN方針や構成のメモなど"
                />
              </>
            ) : (
              <>
                <h1 className="text-xl font-semibold">
                  {room.name ?? 'ピック検討'}
                </h1>
                {room.note && (
                  <p className="text-sm text-zinc-400 whitespace-pre-wrap">
                    {room.note}
                  </p>
                )}
              </>
            )}
          </div>

          {/* オーナー用ボタン */}
          {user?.id === room.owner_id && (
            <div className="flex flex-col items-end gap-2">
              {!isEditingRoom ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsEditingRoom(true)}
                    className="px-3 py-1 rounded bg-zinc-700 text-xs hover:bg-zinc-600"
                    disabled={deletingRoom || resettingNotes}
                  >
                    編集
                  </button>
                  <button
                    onClick={handleResetNotes}
                    className="px-3 py-1 rounded bg-zinc-700 text-xs hover:bg-zinc-600 disabled:opacity-50"
                    disabled={deletingRoom || savingRoom || resettingNotes}
                  >
                    {resettingNotes ? 'リセット中...' : 'ピックリセット'}
                  </button>
                  <button
                    onClick={handleDeleteRoom}
                    className="px-3 py-1 rounded bg-red-600 text-xs hover:bg-red-500 disabled:opacity-50"
                    disabled={deletingRoom || savingRoom || resettingNotes}
                  >
                    {deletingRoom ? '削除中...' : '削除'}
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setIsEditingRoom(false)
                      setEditRoomName(room.name ?? '')
                      setEditRoomNote(room.note ?? '')
                    }}
                    className="px-3 py-1 rounded bg-zinc-700 text-xs hover:bg-zinc-600"
                    disabled={savingRoom || deletingRoom || resettingNotes}
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleSaveRoom}
                    className="px-3 py-1 rounded bg-emerald-500 text-black text-xs hover:bg-emerald-400 disabled:opacity-50"
                    disabled={savingRoom || deletingRoom || resettingNotes}
                  >
                    {savingRoom ? '保存中...' : '保存'}
                  </button>
                </div>
              )}
            </div>
          )}
        </header>

        {/* メンバー表示 & 参加UI */}
        <section className="space-y-2 text-xs">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-zinc-400">メンバー:</span>
            {members.length === 0 && (
              <span className="text-zinc-500">
                まだ誰も参加していません
              </span>
            )}
            {members.map((m) => (
              <span
                key={m.id}
                className="px-2 py-1 rounded-full bg-zinc-950/70 border border-zinc-700 text-[11px]"
              >
                {m.display_name}{' '}
                <span className="text-zinc-400">({m.role})</span>
              </span>
            ))}
          </div>

          {!currentMember && (
            <div className="mt-2 flex flex-col gap-2 border border-zinc-800 rounded-lg p-3 bg-zinc-950/40">
              <div className="text-zinc-300 text-[11px]">
                このルームに参加してロールを選択してください。
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-zinc-400">表示名:</span>
                <input
                  type="text"
                  value={displayNameInput}
                  onChange={(e) => setDisplayNameInput(e.target.value)}
                  placeholder={user.email ?? '名前'}
                  className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/60"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-zinc-400">ロール:</span>
                {availableRoles.length === 0 && (
                  <span className="text-[11px] text-zinc-500">
                    すべてのロールが埋まっています
                  </span>
                )}
                {availableRoles.map((role) => (
                  <button
                    key={role}
                    onClick={() => handleJoinRoom(role)}
                    className="px-3 py-1 rounded-full bg-emerald-500 text-black text-[11px] hover:bg-emerald-400 transition"
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentMember && (
            <div className="text-[11px] text-emerald-400">
              あなたは {currentMember.display_name} として {currentMember.role}{' '}
              を担当しています。
            </div>
          )}
        </section>
      </section>

      {/* ピックボードカード */}
      <section className="border border-zinc-800 rounded-xl bg-zinc-900/70 p-4 shadow-lg shadow-black/30">
        <PickBoard roomId={roomId} members={members} pools={pools} notes={notes} />
      </section>
    </div>
  )
}
