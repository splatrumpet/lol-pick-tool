// src/components/PickBoard.tsx
'use client'

import Image from 'next/image'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { ROLES, Role } from '@/constants/roles'
import { reportError } from '@/lib/appError'
import { fetchRoomMembersAndPools, fetchRoomNotes } from '@/lib/roomQueries'
import { Notice, NoticeToast } from '@/components/NoticeToast'

export type Status = 'NONE' | 'PRIORITY' | 'PICKED' | 'UNAVAILABLE'

export type PoolRow = {
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

export type NoteRow = {
  id?: string
  room_id: string
  champion_id: string
  status: Status
  role: Role | null
}

export type MemberRow = {
  id: string
  room_id: string
  user_id: string
  display_name: string
  role: Role
}

export type PickBoardProps = {
  roomId: string
  members: MemberRow[]
  pools: PoolRow[]
  notes: NoteRow[]
  preview?: boolean
}

type PoolChangePayload = {
  new: { user_id?: string | null } | null
  old: { user_id?: string | null } | null
}

const EMPTY_MEMBER_BY_ROLE: Record<Role, MemberRow | undefined> = {
  TOP: undefined,
  JG: undefined,
  MID: undefined,
  ADC: undefined,
  SUP: undefined,
}

const EMPTY_PICKED_BY_ROLE: Record<Role, string | undefined> = {
  TOP: undefined,
  JG: undefined,
  MID: undefined,
  ADC: undefined,
  SUP: undefined,
}

const EMPTY_PICKED_LIST_BY_ROLE: Record<Role, PoolRow | null> = {
  TOP: null,
  JG: null,
  MID: null,
  ADC: null,
  SUP: null,
}

const STATUS_RANK: Record<Status, number> = {
  PICKED: 0,
  PRIORITY: 1,
  NONE: 2,
  UNAVAILABLE: 3,
}

const getProficiencyStars = (p: number) => {
  if (p >= 3) return '★★★'
  if (p === 2) return '★★☆'
  if (p === 1) return '★☆☆'
  return ''
}

export const PickBoard = ({
  roomId,
  members,
  pools,
  notes,
  preview = false,
}: PickBoardProps) => {
  // ===== ノート（ピック状態） =====
  const [localNotes, setLocalNotes] = useState<NoteRow[]>(notes)

  useEffect(() => {
    setLocalNotes(notes)
  }, [notes])

  // ===== メンバー & プール（リアルタイム同期用） =====
  const [localMembers, setLocalMembers] = useState<MemberRow[]>(members)
  const [localPools, setLocalPools] = useState<PoolRow[]>(pools)
  const [notice, setNotice] = useState<Notice | null>(null)

  useEffect(() => {
    setLocalMembers(members)
  }, [members])

  useEffect(() => {
    setLocalPools(pools)
  }, [pools])

  // room_members + user_champion_pools を取り直す関数
  const fetchMembersAndPools = useCallback(async () => {
    if (!roomId || preview) return

    const { members: nextMembers, pools: nextPools, error } =
      await fetchRoomMembersAndPools(roomId)

    if (error) {
      reportError('PickBoard.fetchMembersAndPools', error)
      setNotice({ type: 'error', message: 'メンバー/プールの再取得に失敗しました。' })
      return
    }

    setLocalMembers(nextMembers as MemberRow[])
    setLocalPools(nextPools as PoolRow[])
  }, [preview, roomId])

  // ===== Realtime購読（他ブラウザと同期） =====
  useEffect(() => {
    if (!roomId || preview) return

    const memberUserIdSet = new Set(localMembers.map((m) => m.user_id))

    // ---- ノート用（ピック状態） ----
    const fetchNotes = async () => {
      const { notes: nextNotes, error } = await fetchRoomNotes(roomId)

      if (error) {
        reportError('PickBoard.fetchNotes', error)
        setNotice({ type: 'error', message: 'ピック状態の同期に失敗しました。' })
        return
      }

      setLocalNotes(nextNotes as NoteRow[])
    }

    // 初回同期
    fetchNotes()
    fetchMembersAndPools()

    const notesChannel = supabase
      .channel(`room-${roomId}-notes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_champion_notes',
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          fetchNotes()
        }
      )
      .subscribe()

    // ---- メンバー用 ----
    const membersChannel = supabase
      .channel(`room-${roomId}-members`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_members',
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          // 参加 / 退出 / ロール変更などがあったら取り直す
          fetchMembersAndPools()
        }
      )
      .subscribe()

    // ---- プール用 ----
    const poolsChannel = supabase
      .channel(`room-${roomId}-pools`)
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
          fetchMembersAndPools()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(notesChannel)
      supabase.removeChannel(membersChannel)
      supabase.removeChannel(poolsChannel)
    }
  }, [fetchMembersAndPools, localMembers, roomId, preview])

  // ===== 集計 =====

  // 各ロールで PICKED されているチャンプID
  const pickedByRole: Record<Role, string | undefined> = useMemo(() => {
    const map = { ...EMPTY_PICKED_BY_ROLE }
    for (const n of localNotes) {
      if (n.role && n.status === 'PICKED') {
        map[n.role] = n.champion_id
      }
    }
    return map
  }, [localNotes])

  // どこかのロールで PICKED されているチャンピオン集合
  const pickedChampionSet: Set<string> = useMemo(() => {
    const s = new Set<string>()
    for (const n of localNotes) {
      if (n.role && n.status === 'PICKED') {
        s.add(n.champion_id)
      }
    }
    return s
  }, [localNotes])

  // ロールごとのプール
  const poolsByRole: Record<Role, PoolRow[]> = useMemo(() => {
    const res: Record<Role, PoolRow[]> = {
      TOP: [],
      JG: [],
      MID: [],
      ADC: [],
      SUP: [],
    }
    localPools?.forEach((p) => {
      if (res[p.role]) res[p.role].push(p)
    })
    return res
  }, [localPools])

  // ロールごとの担当メンバー
  const memberByRole: Record<Role, MemberRow | undefined> = useMemo(() => {
    const map = { ...EMPTY_MEMBER_BY_ROLE }
    for (const m of localMembers) {
      map[m.role] = m
    }
    return map
  }, [localMembers])

  const noteByRoleAndChampion = useMemo(() => {
    const map = new Map<string, NoteRow>()
    for (const note of localNotes) {
      if (!note.role) continue
      map.set(`${note.role}:${note.champion_id}`, note)
    }
    return map
  }, [localNotes])

  // 「生」のステータス（DBそのまま・ロール専用）
  const getRawStatus = (role: Role, championId: string): Status => {
    const row = noteByRoleAndChampion.get(`${role}:${championId}`)
    return row ? row.status : 'NONE'
  }

  // 実際に表示に使うステータス（確定ルールを反映）
  const getStatus = (role: Role, championId: string): Status => {
    const raw = getRawStatus(role, championId)
    const pickedOfRole = pickedByRole[role]
    const pickedSomewhere = pickedChampionSet.has(championId)

    if (pickedSomewhere) {
      if (pickedOfRole === championId) {
        return 'PICKED'
      } else {
        return 'UNAVAILABLE'
      }
    }

    if (pickedOfRole && pickedOfRole !== championId) {
      return 'UNAVAILABLE'
    }

    return raw
  }

  // 確定済みピック一覧（表示用）
  // 「このロールのメンバー」と「そのロールでPICKEDされたノート」から、
  // ぴったり対応するプールを探してくる
  const pickedListByRole: Record<Role, PoolRow | null> = useMemo(() => {
    const result = { ...EMPTY_PICKED_LIST_BY_ROLE }

    for (const role of ROLES) {
      const member = memberByRole[role]
      if (!member) {
        result[role] = null
        continue
      }

      // このロールで PIKCED されているノートを探す
      const note = localNotes.find(
        (n) => n.status === 'PICKED' && n.role === role
      )
      if (!note) {
        result[role] = null
        continue
      }

      // 「このロール担当のユーザー」が持っているプールの中から、
      // 該当チャンピオンIDのものを探す
      const pool = localPools.find(
        (p) =>
          p.user_id === member.user_id &&
          p.role === role &&
          p.champion_id === note.champion_id
      )

      result[role] = pool ?? null
    }

    return result
  }, [localNotes, localPools, memberByRole])


  // ===== DB保存（ロール専用ノート） =====
  const saveNote = async (
    role: Role,
    championId: string,
    status: Status
  ) => {
    if (preview) return
    const existing = localNotes.find(
      (n) => n.champion_id === championId && n.role === role
    )

    if (existing) {
      if (status === 'NONE') {
        await supabase.from('room_champion_notes').delete().eq('id', existing.id)
        setLocalNotes((prev) => prev.filter((n) => n.id !== existing.id))
      } else {
        const { data, error } = await supabase
          .from('room_champion_notes')
          .update({ status })
          .eq('id', existing.id)
          .select()
          .single()

        if (!error && data) {
          setLocalNotes((prev) =>
            prev.map((n) =>
              n.id === existing.id
                ? { ...n, status: data.status as Status }
                : n
            )
          )
        }
      }
      return
    }

    if (status === 'NONE') return

    const { data, error } = await supabase
      .from('room_champion_notes')
      .insert({
        room_id: roomId,
        champion_id: championId,
        role,
        status,
      })
      .select()
      .single()

    if (!error && data) {
      setLocalNotes((prev) => [
        ...prev,
        {
          id: data.id,
          room_id: data.room_id,
          champion_id: data.champion_id,
          status: data.status as Status,
          role: data.role as Role,
        },
      ])
    }
  }

  // ===== 操作ハンドラ =====

  // 手動「不可」トグル（このロール専用）
  const handleToggleUnavailable = async (role: Role, championId: string) => {
    if (preview) return
    const raw = getRawStatus(role, championId)
    if (raw === 'UNAVAILABLE') {
      await saveNote(role, championId, 'NONE')
    } else {
      await saveNote(role, championId, 'UNAVAILABLE')
    }
  }

  // 確定
  const handleConfirmPick = async (role: Role, championId: string) => {
    if (preview) return
    const pickedOfRole = pickedByRole[role]
    const pickedSomewhere = pickedChampionSet.has(championId)

    if (pickedOfRole && pickedOfRole !== championId) {
      setNotice({ type: 'info', message: `${role} はすでに他のチャンピオンが確定済みです` })
      return
    }

    if (pickedSomewhere && pickedOfRole !== championId) {
      setNotice({ type: 'info', message: 'このチャンピオンは別ロールで既に確定済みです' })
      return
    }

    await saveNote(role, championId, 'PICKED')
  }

  // 確定解除
  const handleCancelConfirm = async (role: Role, championId: string) => {
    if (preview) return
    const pickedOfRole = pickedByRole[role]
    if (pickedOfRole !== championId) return
    await saveNote(role, championId, 'NONE')
  }

  // 候補⇔未設定（ロールごと）
  const handleClickChampion = async (role: Role, championId: string) => {
    if (preview) return
    const status = getStatus(role, championId)
    if (status === 'PICKED' || status === 'UNAVAILABLE') return

    const raw = getRawStatus(role, championId)
    if (raw === 'NONE') {
      await saveNote(role, championId, 'PRIORITY')
    } else if (raw === 'PRIORITY') {
      await saveNote(role, championId, 'NONE')
    }
  }

  // ===== JSX =====
  return (
    <div className="space-y-6 text-sm text-zinc-200">
      <NoticeToast notice={notice} onClose={() => setNotice(null)} />
      {/* 確定済み一覧（5枠固定） */}
      <section className="glass-panel rounded-2xl p-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] mb-3 text-emerald-200/80">
          確定済みピック
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {ROLES.map((role) => {
            const picked = pickedListByRole[role]

            return (
              <div
                key={role}
                className="flex flex-col items-center gap-1 rounded-xl px-2.5 py-2.5 min-h-[120px] border border-white/10 bg-zinc-900/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
              >
                <div className="text-[11px] text-zinc-400 mb-1">
                  {role}
                </div>

                {picked ? (
                  <>
                    {picked.champion.icon_url ? (
                      <Image
                        src={picked.champion.icon_url}
                        alt={picked.champion.name}
                        width={36}
                        height={36}
                        className="w-9 h-9 rounded object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-9 h-9 rounded bg-zinc-800 text-[9px] flex items-center justify-center text-zinc-300 px-1 text-center">
                        {picked.champion.name}
                      </div>
                    )}
                    <div className="text-[10px] text-zinc-100 text-center line-clamp-2">
                      {picked.champion.name}
                    </div>
                    <button
                      onClick={() =>
                        handleCancelConfirm(role, picked.champion_id)
                      }
                      className="mt-1 text-[10px] text-red-400 hover:text-red-300"
                    >
                      解除
                    </button>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-[11px] text-zinc-600">
                    未確定
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* プール一覧（モバイルは横スワイプ、PCは多カラム） */}
      <section className="glass-panel rounded-2xl p-4">
        <p className="mb-3 text-[11px] text-zinc-400 sm:hidden">
          左右スワイプでロールを切り替えられます。
        </p>
        <div
          className={preview
            ? 'grid grid-cols-1 gap-3 sm:grid-cols-2'
            : 'flex w-max gap-3 overflow-x-auto pb-1 snap-x snap-mandatory sm:grid sm:w-auto sm:grid-cols-2 sm:overflow-visible sm:pb-0 xl:grid-cols-5'}
        >
          {ROLES.map((role) => {
            const member = memberByRole[role]
            const rolePools = poolsByRole[role]

            const sortedRolePools = [...rolePools].sort((a, b) => {
              const sa = getStatus(role, a.champion_id)
              const sb = getStatus(role, b.champion_id)

              const ra = STATUS_RANK[sa]
              const rb = STATUS_RANK[sb]
              if (ra !== rb) return ra - rb

              if (a.proficiency !== b.proficiency) {
                return b.proficiency - a.proficiency
              }

              return a.champion.name.localeCompare(b.champion.name)
            })

            return (
              <div
                key={role}
                className="w-[80vw] max-w-[340px] shrink-0 snap-start rounded-xl border border-white/10 bg-black/20 p-2 sm:w-auto sm:max-w-none sm:shrink"
              >
                <div className="text-center">
                  <div className="text-sm font-semibold text-zinc-100">
                    {role}
                  </div>
                  {member && (
                    <div className="text-xs text-zinc-400">
                      {member.display_name}
                    </div>
                  )}
                </div>

                <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-2">
                  {sortedRolePools.map((p) => {
                    const status = getStatus(role, p.champion_id)
                    const raw = getRawStatus(role, p.champion_id)
                    const pickedSomewhere = pickedChampionSet.has(
                      p.champion_id
                    )

                    return (
                      <div
                        key={p.id}
                        className="flex flex-col items-center gap-1 text-[10px]"
                      >
                        <button
                          onClick={() =>
                            handleClickChampion(role, p.champion_id)
                          }
                          disabled={
                            status === 'PICKED' || status === 'UNAVAILABLE'
                          }
                          className={[
                            'relative flex flex-col items-center gap-1 p-1.5 rounded-md border w-full transition-all duration-200',
                            status === 'PICKED'
                              ? 'border-emerald-400/80 bg-emerald-500/10 shadow-[0_0_18px_-10px_rgba(16,185,129,0.8)]'
                              : status === 'UNAVAILABLE'
                                ? 'border-red-500/50 bg-red-500/5 opacity-40'
                                : status === 'PRIORITY'
                                  ? 'border-sky-400/60 bg-sky-500/10'
                                  : 'border-white/10 bg-zinc-900/40 hover:border-white/30 hover:bg-zinc-800/50 hover:-translate-y-0.5',
                          ].join(' ')}
                        >
                          <div className="text-[9px] text-amber-300 leading-none">
                            {getProficiencyStars(p.proficiency)}
                          </div>

                          {p.champion.icon_url ? (
                            <Image
                              src={p.champion.icon_url}
                              alt={p.champion.name}
                              width={36}
                              height={36}
                              className="h-9 w-9 rounded object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="h-9 w-9 rounded bg-zinc-800 px-1 text-center text-[8px] text-zinc-300 flex items-center justify-center">
                              {p.champion.name}
                            </div>
                          )}

                          {status === 'UNAVAILABLE' && (
                            <div className="absolute inset-0 flex items-center justify-center text-red-500 text-xl font-bold pointer-events-none">
                              ×
                            </div>
                          )}
                        </button>

                        <span className="min-h-7 text-[9px] text-zinc-200 text-center line-clamp-2">
                          {p.champion.name}
                        </span>

                        {/* 不可トグル（このロール専用） */}
                        {status !== 'PICKED' && (
                          <button
                            onClick={() =>
                              handleToggleUnavailable(role, p.champion_id)
                            }
                            className={
                              raw === 'UNAVAILABLE'
                                ? 'text-[9px] text-red-300 hover:text-red-200'
                                : 'text-[9px] text-zinc-400 hover:text-zinc-200'
                            }
                          >
                            {raw === 'UNAVAILABLE' ? '不可解除' : '不可'}
                          </button>
                        )}

                        {/* 確定／解除 */}
                        {status !== 'PICKED' ? (
                          <button
                            onClick={() =>
                              handleConfirmPick(role, p.champion_id)
                            }
                            disabled={
                              status === 'UNAVAILABLE' || pickedSomewhere
                            }
                            className="text-[9px] text-emerald-300 hover:text-emerald-200 disabled:opacity-40"
                          >
                            確定
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              handleCancelConfirm(role, p.champion_id)
                            }
                            className="text-[9px] text-red-400 hover:text-red-300"
                          >
                            解除
                          </button>
                        )}
                      </div>
                    )
                  })}

                  {rolePools.length === 0 && (
                    <div className="col-span-3 sm:col-span-2 mt-1 text-center text-[11px] text-zinc-500">
                      プール未登録
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
