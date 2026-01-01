// src/components/PickBoard.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase, supabaseConfigError } from '@/lib/supabaseClient'
import { ROLES, Role } from '@/constants/roles'

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
  role: Role | null
}

type MemberRow = {
  id: string
  room_id: string
  user_id: string
  display_name: string
  role: Role
}

type Props = {
  roomId: string
  members: MemberRow[]
  pools: PoolRow[]
  notes: NoteRow[]
}

const getProficiencyStars = (p: number) => {
  if (p >= 3) return '★★★'
  if (p === 2) return '★★☆'
  if (p === 1) return '★☆☆'
  return ''
}

export const PickBoard = ({ roomId, members, pools, notes }: Props) => {
  // ===== ノート（ピック状態） =====
  const [localNotes, setLocalNotes] = useState<NoteRow[]>(notes)
  const supabaseReady = !!supabase && !supabaseConfigError

  useEffect(() => {
    setLocalNotes(notes)
  }, [notes])

  // ===== メンバー & プール（リアルタイム同期用） =====
  const [localMembers, setLocalMembers] = useState<MemberRow[]>(members)
  const [localPools, setLocalPools] = useState<PoolRow[]>(pools)

  useEffect(() => {
    setLocalMembers(members)
  }, [members])

  useEffect(() => {
    setLocalPools(pools)
  }, [pools])

  // room_members + user_champion_pools を取り直す関数
  const fetchMembersAndPools = async () => {
    if (!roomId || !supabaseReady || !supabase) return

    // メンバー一覧
    const { data: memberRows, error: memberError } = await supabase
      .from('room_members')
      .select('id, room_id, user_id, display_name, role')
      .eq('room_id', roomId)
      .order('role', { ascending: true })

    if (memberError) {
      console.error('failed to fetch members', memberError)
      return
    }

    const membersData = (memberRows || []) as MemberRow[]
    setLocalMembers(membersData)

    const userIds = membersData.map((m) => m.user_id)
    if (userIds.length === 0) {
      setLocalPools([])
      return
    }

    // そのメンバーのチャンピオンプール
    const { data: poolData, error: poolError } = await supabase
      .from('user_champion_pools')
      .select('id, user_id, champion_id, role, proficiency, champions(*)')
      .in('user_id', userIds)

    if (poolError) {
      console.error('failed to fetch pools', poolError)
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

    setLocalPools(mappedPools)
  }

  // ===== Realtime購読（他ブラウザと同期） =====
  useEffect(() => {
    if (!roomId || !supabaseReady || !supabase) return

    // ---- ノート用（ピック状態） ----
    const fetchNotes = async () => {
      if (!supabaseReady || !supabase) return
      const { data, error } = await supabase
        .from('room_champion_notes')
        .select('*')
        .eq('room_id', roomId)

      if (error) {
        console.error('failed to fetch notes', error)
        return
      }

      setLocalNotes(
        (data || []).map((n: any) => ({
          id: n.id,
          room_id: n.room_id,
          champion_id: n.champion_id,
          status: n.status as Status,
          role: (n.role ?? null) as Role | null,
        }))
      )
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

    return () => {
      supabase.removeChannel(notesChannel)
      supabase.removeChannel(membersChannel)
    }
  }, [roomId, supabaseReady])

  // ===== 集計 =====

  // 各ロールで PICKED されているチャンプID
  const pickedByRole: Record<Role, string | undefined> = useMemo(() => {
    const map: Partial<Record<Role, string>> = {}
    for (const n of localNotes) {
      if (n.role && n.status === 'PICKED') {
        map[n.role] = n.champion_id
      }
    }
    return map as Record<Role, string | undefined>
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
    const map: Partial<Record<Role, MemberRow>> = {}
    for (const m of localMembers) {
      map[m.role] = m
    }
    return map as Record<Role, MemberRow | undefined>
  }, [localMembers])

  // 「生」のステータス（DBそのまま・ロール専用）
  const getRawStatus = (role: Role, championId: string): Status => {
    const row = localNotes.find(
      (n) => n.role === role && n.champion_id === championId
    )
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
    const result: Record<Role, PoolRow | null> = {
      TOP: null,
      JG: null,
      MID: null,
      ADC: null,
      SUP: null,
    }

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
    const existing = localNotes.find(
      (n) => n.champion_id === championId && n.role === role
    )
    if (!supabaseReady || !supabase) {
      alert('Supabase の設定を確認してください。')
      return
    }

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
    const raw = getRawStatus(role, championId)
    if (raw === 'UNAVAILABLE') {
      await saveNote(role, championId, 'NONE')
    } else {
      await saveNote(role, championId, 'UNAVAILABLE')
    }
  }

  // 確定
  const handleConfirmPick = async (role: Role, championId: string) => {
    const pickedOfRole = pickedByRole[role]
    const pickedSomewhere = pickedChampionSet.has(championId)

    if (pickedOfRole && pickedOfRole !== championId) {
      alert(`${role} はすでに他のチャンピオンが確定済みです`)
      return
    }

    if (pickedSomewhere && pickedOfRole !== championId) {
      alert('このチャンピオンは別ロールで既に確定済みです')
      return
    }

    await saveNote(role, championId, 'PICKED')
  }

  // 確定解除
  const handleCancelConfirm = async (role: Role, championId: string) => {
    const pickedOfRole = pickedByRole[role]
    if (pickedOfRole !== championId) return
    await saveNote(role, championId, 'NONE')
  }

  // 候補⇔未設定（ロールごと）
  const handleClickChampion = async (role: Role, championId: string) => {
    const status = getStatus(role, championId)
    if (status === 'PICKED' || status === 'UNAVAILABLE') return

    const raw = getRawStatus(role, championId)
    if (raw === 'NONE') {
      await saveNote(role, championId, 'PRIORITY')
    } else if (raw === 'PRIORITY') {
      await saveNote(role, championId, 'NONE')
    }
  }

  const statusRank = (s: Status) => {
    switch (s) {
      case 'PICKED':
        return 0
      case 'PRIORITY':
        return 1
      case 'NONE':
        return 2
      case 'UNAVAILABLE':
        return 3
      default:
        return 9
    }
  }

  // ===== JSX =====
  return (
    <div className="space-y-5 text-sm text-zinc-200">
      {/* 確定済み一覧（5枠固定） */}
      <section className="border border-zinc-700 rounded-lg p-3 bg-zinc-900/80">
        <h2 className="text-xs font-semibold mb-2 text-emerald-300">
          確定済みピック
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {ROLES.map((role) => {
            const picked = pickedListByRole[role]

            return (
              <div
                key={role}
                className="flex flex-col items-center gap-1 bg-zinc-900 border border-zinc-700 rounded-md px-2 py-2 min-h-[110px]"
              >
                <div className="text-[11px] text-zinc-400 mb-1">
                  {role}
                </div>

                {picked ? (
                  <>
                    {picked.champion.icon_url ? (
                      <img
                        src={picked.champion.icon_url}
                        alt={picked.champion.name}
                        className="w-9 h-9 rounded object-cover"
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

      {/* プール一覧（5ロール横並び） */}
      <section className="border border-zinc-700 rounded-lg bg-zinc-900/80 p-3 overflow-x-auto">
        <div className="min-w-[900px] grid grid-cols-5 gap-3">
          {ROLES.map((role) => {
            const member = memberByRole[role]
            const rolePools = poolsByRole[role] || []

            const sortedRolePools = [...rolePools].sort((a, b) => {
              const sa = getStatus(role, a.champion_id)
              const sb = getStatus(role, b.champion_id)

              const ra = statusRank(sa)
              const rb = statusRank(sb)
              if (ra !== rb) return ra - rb

              if (a.proficiency !== b.proficiency) {
                return b.proficiency - a.proficiency
              }

              return a.champion.name.localeCompare(b.champion.name)
            })

            return (
              <div key={role} className="flex flex-col gap-1.5">
                <div className="text-center">
                  <div className="text-xs font-semibold text-zinc-100">
                    {role}
                  </div>
                  {member && (
                    <div className="text-[10px] text-zinc-400">
                      {member.display_name}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  {sortedRolePools.map((p) => {
                    const status = getStatus(role, p.champion_id)
                    const raw = getRawStatus(role, p.champion_id)
                    const pickedSomewhere = pickedChampionSet.has(
                      p.champion_id
                    )

                    return (
                      <div
                        key={p.id}
                        className="flex flex-col items-center gap-0.5 text-[9px]"
                      >
                        <button
                          onClick={() =>
                            handleClickChampion(role, p.champion_id)
                          }
                          disabled={
                            status === 'PICKED' || status === 'UNAVAILABLE'
                          }
                          className={[
                            'relative flex flex-col items-center gap-0.5 p-1 rounded-md border w-full transition',
                            status === 'PICKED'
                              ? 'border-emerald-400 bg-emerald-500/10 shadow shadow-emerald-500/30'
                              : status === 'UNAVAILABLE'
                                ? 'border-red-500/50 bg-red-500/5 opacity-40'
                                : status === 'PRIORITY'
                                  ? 'border-blue-400 bg-blue-500/10'
                                  : 'border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/40',
                          ].join(' ')}
                        >
                          <div className="text-[8px] text-amber-300 leading-none">
                            {getProficiencyStars(p.proficiency)}
                          </div>

                          {p.champion.icon_url ? (
                            <img
                              src={p.champion.icon_url}
                              alt={p.champion.name}
                              className="w-8 h-8 rounded object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded bg-zinc-800 text-[8px] flex items-center justify-center text-zinc-300 px-1 text-center">
                              {p.champion.name}
                            </div>
                          )}

                          {status === 'UNAVAILABLE' && (
                            <div className="absolute inset-0 flex items-center justify-center text-red-500 text-xl font-bold pointer-events-none">
                              ×
                            </div>
                          )}
                        </button>

                        <span className="text-[8px] text-zinc-200 text-center line-clamp-2">
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
                                ? 'text-[8px] text-red-300 hover:text-red-200'
                                : 'text-[8px] text-zinc-400 hover:text-zinc-200'
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
                            className="text-[8px] text-emerald-300 hover:text-emerald-200 disabled:opacity-40"
                          >
                            確定
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              handleCancelConfirm(role, p.champion_id)
                            }
                            className="text-[8px] text-red-400 hover:text-red-300"
                          >
                            解除
                          </button>
                        )}
                      </div>
                    )
                  })}

                  {rolePools.length === 0 && (
                    <div className="col-span-2 text-[10px] text-zinc-500 text-center mt-1">
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
