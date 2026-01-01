// src/app/rooms/[id]/page.tsx
'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { supabase, supabaseConfigError } from '@/lib/supabaseClient'
import { PickBoard } from '@/components/PickBoard'
import { ROLES, Role } from '@/constants/roles'
import { SupabaseConfigAlert } from '@/components/SupabaseConfigAlert'

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
  const supabaseReady = !!supabase && !supabaseConfigError

  // ルーム参加用フォーム
  const [joinRole, setJoinRole] = useState<Role | ''>('')
  const [joinName, setJoinName] = useState<string>('') // ← /account で設定した表示名をここに入れる

  // ルーム編集用
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')

  // ① roomId を決定（params → URL の順でトライ）
  useEffect(() => {
    const p = params as any
    const fromParams: string | undefined = p?.id ?? p?.roomId

    if (fromParams) {
      setRoomId(fromParams)
      return
    }

    if (typeof window !== 'undefined') {
      const path = window.location.pathname
      const match = path.match(/\/rooms\/([^\/?#]+)/)
      if (match && match[1]) {
        setRoomId(match[1])
        return
      }
    }

    console.error('roomId could not be resolved from params or URL', params)
    setErrorMsg('ルームIDが取得できませんでした。URLを確認してください。')
    setLoading(false)
  }, [params])

  // ===== 共通ロード関数（メンバー & プール） =====
  const fetchMembersAndPools = async (targetRoomId: string) => {
    if (!supabaseReady || !supabase) return
    const { data: memberRows, error: memberError } = await supabase
      .from('room_members')
      .select('id, room_id, user_id, display_name, role')
      .eq('room_id', targetRoomId)

    if (memberError) {
      console.error('failed to fetch members', memberError)
      setErrorMsg('メンバー情報の取得に失敗しました。')
      return
    }

    const membersData = (memberRows || []) as MemberRow[]

    const roleOrder: Record<Role, number> = {
      TOP: 0,
      JG: 1,
      MID: 2,
      ADC: 3,
      SUP: 4,
    }
    membersData.sort((a, b) => roleOrder[a.role] - roleOrder[b.role])

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

    const mappedPools: PoolRow[] = (poolData || [])
      .map((p: any) => {
        const member = membersData.find((m) => m.user_id === p.user_id)
        if (!member) return null
        if (member.role !== p.role) return null

        return {
          id: p.id,
          champion_id: p.champion_id,
          role: p.role as Role,
          proficiency: p.proficiency,
          user_id: p.user_id,
          display_name: member.display_name ?? '',
          champion: {
            id: p.champions.id,
            name: p.champions.name,
            icon_url: p.champions.icon_url,
          },
        } as PoolRow
      })
      .filter((p): p is PoolRow => p !== null)

    setPools(mappedPools)
  }

  // ===== 初期ロード（roomId が決まったあとに動く） =====
  useEffect(() => {
    if (!roomId) return

    const init = async () => {
      setLoading(true)
      setErrorMsg(null)

      try {
        if (!supabaseReady || !supabase) {
          setErrorMsg('Supabase の設定を確認してください。')
          return
        }
        const { data: userData, error: userError } =
          await supabase.auth.getUser()
        if (userError) {
          console.error('auth.getUser error', userError)
        }
        const u = userData?.user ?? null
        const uid = u?.id ?? null
        setCurrentUserId(uid)

        // ここで /account で設定した display_name を読んで joinName にセット
        if (u) {
          const meta = (u.user_metadata || {}) as any
          const fromMeta =
            (meta.display_name as string | undefined) ||
            (meta.full_name as string | undefined)
          const fromEmail = u.email ? u.email.split('@')[0] : ''
          setJoinName(fromMeta || fromEmail || '')
        }

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
          setNotes(
            (noteRows || []).map((n: any) => ({
              id: n.id,
              room_id: n.room_id,
              champion_id: n.champion_id,
              status: n.status,
              role: (n.role ?? null) as Role | null,
            }))
          )
        }
      } catch (e) {
        console.error('init room error', e)
        setErrorMsg('ルーム情報の読み込み中にエラーが発生しました。')
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [roomId, supabaseReady])

  // ===== Realtime: room_members 変化でメンバー＆プールを再取得 =====
  useEffect(() => {
    if (!roomId || !supabaseReady || !supabase) return

    const channel = supabase
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

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomId, supabaseReady])

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

  // ===== ルーム参加ハンドラ =====
  const handleJoinRoom = async () => {
    if (!roomId) return
    if (!currentUserId) {
      alert('ルームに参加するにはログインが必要です。')
      return
    }
    if (!supabaseReady || !supabase) {
      alert('Supabase の設定を確認してください。')
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

  // ===== ルーム情報の更新・削除 =====
  const handleSaveRoomInfo = async () => {
    if (!supabaseReady || !supabase) {
      alert('Supabase の設定を確認してください。')
      return
    }
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
    if (!supabaseReady || !supabase) {
      alert('Supabase の設定を確認してください。')
      return
    }
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
    if (!supabaseReady || !supabase) {
      alert('Supabase の設定を確認してください。')
      return
    }
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

  if (!supabaseReady || !supabase) {
    return (
      <div className="p-6">
        <SupabaseConfigAlert detail={supabaseConfigError?.message ?? undefined} />
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
    <div className="p-4 md:p-6 space-y-6 text-sm text-zinc-200">
      {/* ヘッダー */}
      <header className="space-y-3 border border-zinc-800 bg-zinc-900/80 rounded-xl px-4 py-3 shadow shadow-black/40">
        {/* ルーム名／説明（編集モードと表示モード） */}
        {!isEditing ? (
          <>
            <h1 className="text-xl font-semibold">{room.name}</h1>
            {room.description && (
              <p className="text-xs text-zinc-400 whitespace-pre-line">
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
                className="bg-zinc-950 border border-zinc-700 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/60"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-zinc-400">メモ</label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={2}
                className="bg-zinc-950 border border-zinc-700 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/60"
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

        {/* ボタン群（編集・リセット・削除） */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-800 mt-2">
          {/* ピック状態リセット */}
          <button
            onClick={handleResetAllNotes}
            className="px-3 py-1 rounded-md border border-zinc-600 text-xs hover:bg-zinc-800"
          >
            ピック状態を全リセット
          </button>

          {/* 編集ボタン */}
          {isOwner && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-3 py-1 rounded-md border border-emerald-500/60 text-xs text-emerald-300 hover:bg-emerald-500/10"
            >
              ルーム名・メモを編集
            </button>
          )}
          {isOwner && isEditing && (
            <>
              <button
                onClick={handleSaveRoomInfo}
                className="px-3 py-1 rounded-md bg-emerald-500 text-xs text-black hover:bg-emerald-400"
              >
                保存
              </button>
              <button
                onClick={() => {
                  setIsEditing(false)
                  setEditName(room.name ?? '')
                  setEditDescription(room.description ?? '')
                }}
                className="px-3 py-1 rounded-md border border-zinc-600 text-xs hover:bg-zinc-800"
              >
                キャンセル
              </button>
            </>
          )}

          {/* ルーム削除（オーナーのみ） */}
          {isOwner && (
            <button
              onClick={handleDeleteRoom}
              className="ml-auto px-3 py-1 rounded-md border border-red-500/70 text-xs text-red-300 hover:bg-red-500/10"
            >
              ルーム削除
            </button>
          )}
        </div>

        {/* ルーム参加フォーム（まだ未参加のときだけ） */}
        {!myMemberRow && (
          <div className="mt-3 border-t border-zinc-800 pt-3 space-y-2">
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
                      className="bg-zinc-950 border border-zinc-700 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/60"
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
