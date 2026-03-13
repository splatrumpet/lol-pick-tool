// src/app/rooms/[id]/page.tsx
'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import {
  mapNoteRows,
  mapPoolsForMembers,
  NoteDbRow,
  PoolWithChampionDbRow,
} from '@/lib/roomDataMappers'
import { PickBoard } from '@/components/PickBoard'
import { ROLES, Role } from '@/constants/roles'

type PoolChangePayload = {
  new: { user_id?: string | null } | null
  old: { user_id?: string | null } | null
}

const ROLE_ORDER: Record<Role, number> = {
  TOP: 0,
  JG: 1,
  MID: 2,
  ADC: 3,
  SUP: 4,
}

const resolveRoomId = (params: ReturnType<typeof useParams>): string | null => {
  const p = params as { id?: string; roomId?: string } | null
  const fromParams: string | undefined = p?.id ?? p?.roomId
  if (fromParams) return fromParams

  if (typeof window === 'undefined') return null
  const match = window.location.pathname.match(/\/rooms\/([^\/?#]+)/)
  return match?.[1] ?? null
}

const sortMembersByRole = (rows: MemberRow[]) =>
  [...rows].sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role])

const getJoinNameFromUser = (user: {
  user_metadata?: Record<string, unknown>
  email?: string | null
} | null) => {
  if (!user) return ''
  const meta = user.user_metadata || {}
  const fromMeta =
    (meta.display_name as string | undefined) ||
    (meta.full_name as string | undefined)
  const fromEmail = user.email ? user.email.split('@')[0] : ''
  return fromMeta || fromEmail || ''
}

type RoomRow = {
  id: string
  name: string
  description: string | null
  owner_id: string
  created_at: string
}

type MemberRow = {
  id: string
  room_id: string
  user_id: string
  display_name: string
  role: Role
}

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
  status: 'NONE' | 'PRIORITY' | 'PICKED' | 'UNAVAILABLE'
  role: Role | null
}

export default function RoomPage() {
  const params = useParams()
  const [roomId, setRoomId] = useState<string | null>(null)

  const [room, setRoom] = useState<RoomRow | null>(null)
  const [members, setMembers] = useState<MemberRow[]>([])
  const [pools, setPools] = useState<PoolRow[]>([])
  const [notes, setNotes] = useState<NoteRow[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // ルーム参加用フォーム
  const [joinRole, setJoinRole] = useState<Role | ''>('')
  const [joinName, setJoinName] = useState<string>('') // ← /account で設定した表示名をここに入れる

  // ルーム編集用
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')

  // ① roomId を決定（params → URL の順でトライ）
  useEffect(() => {
    const resolved = resolveRoomId(params)
    if (resolved) {
      setRoomId(resolved)
      return
    }

    console.error('roomId could not be resolved from params or URL', params)
    setErrorMsg('ルームIDが取得できませんでした。URLを確認してください。')
    setLoading(false)
  }, [params])

  // ===== 共通ロード関数（メンバー & プール） =====
  const fetchMembersAndPools = async (targetRoomId: string) => {
    const { data: memberRows, error: memberError } = await supabase
      .from('room_members')
      .select('id, room_id, user_id, display_name, role')
      .eq('room_id', targetRoomId)

    if (memberError) {
      console.error('failed to fetch members', memberError)
      setErrorMsg('メンバー情報の取得に失敗しました。')
      return
    }

    const membersData = sortMembersByRole(
      (memberRows || []) as MemberRow[]
    )
    setMembers(membersData)

    const userIds = membersData.map((m) => m.user_id)
    if (userIds.length === 0) {
      setPools([])
      return
    }

    const { data: poolData, error: poolError } = await supabase
      .from('user_champion_pools')
      .select('id, user_id, champion_id, role, proficiency, champions(*)')
      .in('user_id', userIds)

    if (poolError) {
      console.error('failed to fetch pools', poolError)
      setErrorMsg('チャンピオンプールの取得に失敗しました。')
      return
    }

    setPools(
      mapPoolsForMembers(
        (poolData || []) as unknown as PoolWithChampionDbRow[],
        membersData
      )
    )
  }

  // ===== 初期ロード（roomId が決まったあとに動く） =====
  useEffect(() => {
    if (!roomId) return

    const init = async () => {
      setLoading(true)
      setErrorMsg(null)

      try {
        const { data: userData, error: userError } =
          await supabase.auth.getUser()
        if (userError) {
          console.error('auth.getUser error', userError)
        }
        const user = userData?.user ?? null
        setCurrentUserId(user?.id ?? null)

        // ここで /account で設定した display_name を読んで joinName にセット
        setJoinName(getJoinNameFromUser(user))

        // ルーム情報
        const { data: roomData, error: roomError } = await supabase
          .from('rooms')
          .select('*')
          .eq('id', roomId)
          .single()

        if (roomError) {
          console.error('failed to fetch room', roomError)
          setErrorMsg('ルーム情報の取得に失敗しました。')
        } else if (roomData) {
          const r = roomData as RoomRow
          setRoom(r)
          setEditName(r.name ?? '')
          setEditDescription(r.description ?? '')
        }

        // メンバー & プール
        await fetchMembersAndPools(roomId)

        // ノート
        const { data: noteRows, error: noteError } = await supabase
          .from('room_champion_notes')
          .select('*')
          .eq('room_id', roomId)

        if (noteError) {
          console.error('failed to fetch notes', noteError)
          setErrorMsg('ピック情報の取得に失敗しました。')
        } else {
          setNotes(mapNoteRows((noteRows || []) as NoteDbRow<NoteRow['status']>[]))
        }
      } catch (e) {
        console.error('init room error', e)
        setErrorMsg('ルーム情報の読み込み中にエラーが発生しました。')
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [roomId])

  // ===== Realtime: room_members 変化でメンバー＆プールを再取得 =====
  useEffect(() => {
    if (!roomId) return

    const memberUserIdSet = new Set(members.map((m) => m.user_id))

    const membersChannel = supabase
      .channel(`room-${roomId}-members-header`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_members',
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          fetchMembersAndPools(roomId)
        }
      )
      .subscribe()

    const poolsChannel = supabase
      .channel(`room-${roomId}-pools-header`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_champion_pools',
        },
        (payload) => {
          const p = payload as unknown as PoolChangePayload
          const changedUserId = p.new?.user_id ?? p.old?.user_id
          if (!changedUserId) return
          if (!memberUserIdSet.has(changedUserId)) return
          fetchMembersAndPools(roomId)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(membersChannel)
      supabase.removeChannel(poolsChannel)
    }
  }, [members, roomId])

  // ===== 自分のメンバー情報・空きロール =====
  const myMemberRow = useMemo(
    () => members.find((m) => m.user_id === currentUserId),
    [members, currentUserId]
  )

  const availableRoles = useMemo(
    () =>
      ROLES.filter((r) => !members.some((m) => m.role === r)),
    [members]
  )

  const changeableRoles = useMemo(() => {
    const taken = new Set(members.map((m) => m.role))
    return ROLES.filter((r) => !taken.has(r) || myMemberRow?.role === r)
  }, [members, myMemberRow])

  const [changeRole, setChangeRole] = useState<Role | ''>('')

  useEffect(() => {
    if (myMemberRow) {
      setChangeRole(myMemberRow.role)
    } else {
      setChangeRole('')
    }
  }, [myMemberRow])

  // ===== ルーム参加ハンドラ =====
  const handleJoinRoom = async () => {
    if (!roomId) return
    if (!currentUserId) {
      alert('ルームに参加するにはログインが必要です。')
      return
    }
    if (!joinRole) {
      alert('ロールを選択してください。')
      return
    }

    if (myMemberRow) {
      alert('このルームにはすでに参加しています。')
      return
    }

    if (members.some((m) => m.role === joinRole)) {
      alert('そのロールはすでに他のメンバーが担当しています。')
      return
    }

    const displayName = joinName.trim() || 'NoName'

    const { error } = await supabase.from('room_members').insert({
      room_id: roomId,
      user_id: currentUserId,
      display_name: displayName,
      role: joinRole,
    })

    if (error) {
      console.error('failed to join room', error)
      alert('ルーム参加に失敗しました: ' + error.message)
      return
    }

    await fetchMembersAndPools(roomId)
  }

  const handleChangeMyRole = async () => {
    if (!roomId || !myMemberRow || !changeRole) return

    if (changeRole === myMemberRow.role) {
      alert('すでにそのロールを担当しています。')
      return
    }

    if (
      members.some(
        (m) => m.role === changeRole && m.id !== myMemberRow.id
      )
    ) {
      alert('そのロールはすでに他のメンバーが担当しています。')
      return
    }

    const { error } = await supabase
      .from('room_members')
      .update({ role: changeRole })
      .eq('id', myMemberRow.id)

    if (error) {
      console.error('failed to change role', error)
      alert('ロール変更に失敗しました: ' + error.message)
      return
    }

    await fetchMembersAndPools(roomId)
  }

  const handleRemoveMember = async (target: MemberRow) => {
    if (!roomId) return

    const ok = window.confirm(
      `${target.display_name} のロールを外しますか？`
    )
    if (!ok) return

    const { error } = await supabase
      .from('room_members')
      .delete()
      .eq('id', target.id)

    if (error) {
      console.error('failed to remove member', error)
      alert('ロールを外せませんでした: ' + error.message)
      return
    }

    await fetchMembersAndPools(roomId)
  }

  // ===== ルーム情報の更新・削除 =====
  const handleSaveRoomInfo = async () => {
    if (!roomId || !room) return

    const name = editName.trim()
    if (!name) {
      alert('ルーム名を入力してください。')
      return
    }

    const { data, error } = await supabase
      .from('rooms')
      .update({
        name,
        description: editDescription.trim() || null,
      })
      .eq('id', roomId)
      .select('*')
      .single()

    if (error) {
      console.error('failed to update room', error)
      alert('ルーム情報の更新に失敗しました: ' + error.message)
      return
    }

    setRoom(data as RoomRow)
    setIsEditing(false)
  }

  const handleDeleteRoom = async () => {
    if (!roomId || !room) return

    const ok = window.confirm(
      'このルームを削除しますか？（ピック情報も含めて元に戻せません）'
    )
    if (!ok) return

    const { error } = await supabase.from('rooms').delete().eq('id', roomId)

    if (error) {
      console.error('failed to delete room', error)
      alert('ルーム削除に失敗しました: ' + error.message)
      return
    }

    window.location.href = '/'
  }

  // ===== ピック状態全リセット =====
  const handleResetAllNotes = async () => {
    if (!roomId) return

    const ok = window.confirm('全員のピック状態をリセットしますか？')
    if (!ok) return

    const { error } = await supabase
      .from('room_champion_notes')
      .delete()
      .eq('room_id', roomId)

    if (error) {
      console.error('failed to reset notes', error)
      alert('リセットに失敗しました: ' + error.message)
      return
    }

    setNotes([])
  }

  // ===== 描画 =====

  if (!roomId && loading && !errorMsg) {
    return (
      <div className="p-6 text-sm text-zinc-300">
        ルームIDを解析しています…
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-6 text-sm text-zinc-300">
        ルーム情報を読み込み中です…
      </div>
    )
  }

  if (errorMsg) {
    return (
      <div className="p-6 space-y-3 text-sm">
        <div className="text-red-400">{errorMsg}</div>
        <div className="text-xs text-zinc-400">
          debug: roomId = {String(roomId)}, members = {members.length}, pools = {pools.length}, notes = {notes.length}
        </div>
      </div>
    )
  }

  if (!room || !roomId) {
    return (
      <div className="p-6 text-sm text-red-400">
        ルームが見つかりませんでした。
      </div>
    )
  }

  const isOwner = currentUserId && room.owner_id === currentUserId

  return (
    <div className="p-4 md:p-8 space-y-8 text-sm text-zinc-200 max-w-6xl mx-auto fade-in">
      {/* ヘッダー */}
      <header className="space-y-4 rounded-2xl px-5 py-4 glass-panel">
        {/* ルーム名／説明（編集モードと表示モード） */}
        {!isEditing ? (
          <>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              {room.name}
            </h1>
            {room.description && (
              <p className="text-sm text-zinc-300 whitespace-pre-line">
                {room.description}
              </p>
            )}
          </>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-zinc-400">ルーム名</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="bg-zinc-950/70 border border-white/10 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/60"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-zinc-400">メモ</label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={2}
                className="bg-zinc-950/70 border border-white/10 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/60"
              />
            </div>
          </div>
        )}

        {/* メンバー表示 */}
        <div className="space-y-1">
          <div className="text-xs text-zinc-300">
            メンバー:{' '}
            {members.length === 0
              ? '未参加'
              : members
                .map((m) => `${m.display_name} (${m.role})`)
                .join(' / ')}
          </div>

          {myMemberRow && (
            <div className="text-[11px] text-emerald-300">
              あなたは {myMemberRow.display_name} として {myMemberRow.role} を担当しています。
            </div>
          )}
        </div>

        {myMemberRow && (
          <div className="mt-2 border border-white/10 rounded-lg p-3 space-y-2 bg-white/5">
            <div className="text-[11px] text-zinc-200 font-semibold">
              自分のロールを変更・解除
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-zinc-400">ロール</label>
                <select
                  value={changeRole}
                  onChange={(e) => setChangeRole(e.target.value as Role)}
                  className="bg-zinc-950/70 border border-white/10 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/60"
                >
                  {changeableRoles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleChangeMyRole}
                  disabled={!changeRole}
                  className="px-3 py-2 rounded-md bg-emerald-500 text-black text-xs font-semibold hover:bg-emerald-400 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ロールを変更
                </button>
                <button
                  onClick={() => handleRemoveMember(myMemberRow)}
                  className="px-3 py-2 rounded-md border border-red-500/70 text-xs text-red-300 hover:bg-red-500/10 transition"
                >
                  ロールを外す
                </button>
              </div>
            </div>
          </div>
        )}

        {isOwner && members.length > 0 && (
          <div className="mt-2 border border-amber-500/30 rounded-lg p-3 space-y-2 bg-amber-500/5">
            <div className="text-[11px] text-amber-200 font-semibold">
              オーナー用メンバー管理
            </div>
            <div className="space-y-1">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-2 text-xs border border-white/10 rounded-md px-2 py-1 bg-black/20"
                >
                  <div className="flex-1">
                    <span className="font-semibold">{m.display_name}</span>{' '}
                    <span className="text-zinc-400">({m.role})</span>
                  </div>
                  {m.user_id === currentUserId ? (
                    <span className="text-[10px] text-emerald-300">あなた</span>
                  ) : (
                    <button
                      onClick={() => handleRemoveMember(m)}
                      className="px-2 py-1 rounded-md border border-red-500/70 text-[11px] text-red-300 hover:bg-red-500/10 transition"
                    >
                      ロールを外す
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ボタン群（編集・リセット・削除） */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10 mt-2">
          {/* ピック状態リセット */}
          <button
            onClick={handleResetAllNotes}
            className="px-3 py-1 rounded-md border border-white/10 text-xs hover:bg-white/5 transition"
          >
            ピック状態を全リセット
          </button>

          {/* 編集ボタン */}
          {isOwner && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-3 py-1 rounded-md border border-emerald-400/60 text-xs text-emerald-200 hover:bg-emerald-500/10 transition"
            >
              ルーム名・メモを編集
            </button>
          )}
          {isOwner && isEditing && (
            <>
              <button
                onClick={handleSaveRoomInfo}
                className="px-3 py-1 rounded-md bg-emerald-500 text-xs text-black hover:bg-emerald-400 transition"
              >
                保存
              </button>
              <button
                onClick={() => {
                  setIsEditing(false)
                  setEditName(room.name ?? '')
                  setEditDescription(room.description ?? '')
                }}
                className="px-3 py-1 rounded-md border border-white/10 text-xs hover:bg-white/5 transition"
              >
                キャンセル
              </button>
            </>
          )}

          {/* ルーム削除（オーナーのみ） */}
          {isOwner && (
            <button
              onClick={handleDeleteRoom}
              className="ml-auto px-3 py-1 rounded-md border border-red-500/70 text-xs text-red-300 hover:bg-red-500/10 transition"
            >
              ルーム削除
            </button>
          )}
        </div>

        {/* ルーム参加フォーム（まだ未参加のときだけ） */}
        {!myMemberRow && (
          <div className="mt-3 border-t border-white/10 pt-3 space-y-2">
            {!currentUserId ? (
              <p className="text-xs text-red-300">
                ルームに参加するにはログインしてください。
              </p>
            ) : (
              <>
                <p className="text-xs text-zinc-300">
                  ロールを選んで、このルームに参加します。
                </p>
                <p className="text-[11px] text-zinc-400">
                  表示名:{' '}
                  <span className="font-mono text-zinc-100">
                    {joinName || '未設定'}
                  </span>{' '}
                  （/account ページで変更できます）
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-zinc-400">ロール</label>
                    <select
                      value={joinRole}
                      onChange={(e) => setJoinRole(e.target.value as Role)}
                    className="bg-zinc-950/70 border border-white/10 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/60"
                  >
                      <option value="">選択してください</option>
                      {availableRoles.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={handleJoinRoom}
                    disabled={
                      !joinRole ||
                      !currentUserId ||
                      availableRoles.length === 0
                    }
                    className="px-4 py-2 rounded-md bg-emerald-500 text-black text-sm font-semibold hover:bg-emerald-400 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    このルームに参加
                  </button>
                </div>

                {availableRoles.length === 0 && (
                  <p className="text-[11px] text-zinc-500">
                    空いているロールがありません。
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </header>

      {/* ピックボード */}
      <PickBoard
        roomId={roomId as string}
        members={members}
        pools={pools}
        notes={notes}
      />
    </div>
  )
}
