// src/components/PickBoard.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
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
  const [localNotes, setLocalNotes] = useState<NoteRow[]>(notes)

  // 親からの初期値と同期
  useEffect(() => {
    setLocalNotes(notes)
  }, [notes])

  // ===== Realtime購読（他ブラウザと同期） =====
  useEffect(() => {
    if (!roomId) return

    const fetchNotes = async () => {
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
        }))
      )
    }

    // 初回同期
    fetchNotes()

    const channel = supabase
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

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomId])

  // ===== ヘルパー =====
  const getStatus = (championId: string): Status => {
    return (
      localNotes.find((n) => n.champion_id === championId)?.status || 'NONE'
    )
  }

  // ロールごとにプールをまとめる
  const poolsByRole: Record<Role, PoolRow[]> = useMemo(() => {
    const res: Record<Role, PoolRow[]> = {
      TOP: [],
      JG: [],
      MID: [],
      ADC: [],
      SUP: [],
    }
    pools?.forEach((p) => {
      if (res[p.role]) res[p.role].push(p)
    })
    return res
  }, [pools])

  // ロールごとの担当メンバー（表示名用）
  const memberByRole: Record<Role, MemberRow | undefined> = useMemo(() => {
    const map: Partial<Record<Role, MemberRow>> = {}
    for (const m of members) {
      map[m.role] = m
    }
    return map as Record<Role, MemberRow | undefined>
  }, [members])

  // 確定済みノート
  const pickedList = useMemo(
    () => localNotes.filter((n) => n.status === 'PICKED'),
    [localNotes]
  )

  // ロールごとに「確定済みチャンピオン」を1体まで紐づけ
  const pickedByRole: Record<Role, PoolRow | null> = useMemo(() => {
    const result: Record<Role, PoolRow | null> = {
      TOP: null,
      JG: null,
      MID: null,
      ADC: null,
      SUP: null,
    }
    for (const n of pickedList) {
      const pool = pools.find((p) => p.champion_id === n.champion_id)
      if (pool) {
        result[pool.role] = pool
      }
    }
    return result
  }, [pickedList, pools])

  // すでに確定されているロール
  const confirmedRoles = useMemo(() => {
    const set = new Set<Role>()
    for (const n of pickedList) {
      const pool = pools.find((p) => p.champion_id === n.champion_id)
      if (pool) set.add(pool.role)
    }
    return set
  }, [pickedList, pools])

  // ===== DBへの保存処理 =====
  const saveNote = async (championId: string, status: Status) => {
    const existing = localNotes.find((n) => n.champion_id === championId)

    if (existing) {
      if (status === 'NONE') {
        await supabase
          .from('room_champion_notes')
          .delete()
          .eq('id', existing.id)

        setLocalNotes((prev) =>
          prev.filter((n) => n.champion_id !== championId)
        )
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

    const { data, error } = await supabase
      .from('room_champion_notes')
      .insert({
        room_id: roomId,
        champion_id: championId,
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
        },
      ])
    }
  }

  // ピック不可を手動でON/OFFする
  const handleToggleUnavailable = async (championId: string) => {
    const status = getStatus(championId)
    if (status === 'PICKED') return

    if (status === 'UNAVAILABLE') {
      await saveNote(championId, 'NONE')
    } else {
      await saveNote(championId, 'UNAVAILABLE')
    }
  }

  // ===== 確定／解除まわり =====
  const handleConfirmPick = async (championId: string) => {
    const pool = pools.find((p) => p.champion_id === championId)
    if (!pool) return

    const role = pool.role

    if (confirmedRoles.has(role)) {
      alert(`${role} はすでに確定済みです`)
      return
    }

    // 1体をPICKEDに
    await saveNote(championId, 'PICKED')

    // 同ロールの他の候補はUNAVAILABLEに
    pools
      .filter((p) => p.role === role && p.champion_id !== championId)
      .forEach((p) => {
        saveNote(p.champion_id, 'UNAVAILABLE')
      })
  }

  const handleCancelConfirm = async (championId: string) => {
    const pool = pools.find((p) => p.champion_id === championId)
    if (!pool) return

    const role = pool.role

    // 自分をNONEに
    await saveNote(championId, 'NONE')

    // 同ロールの候補もまとめてNONEに戻す
    pools
      .filter((p) => p.role === role)
      .forEach((p) => saveNote(p.champion_id, 'NONE'))
  }

  // 通常クリック：候補⇔未設定
  const handleClickChampion = async (championId: string) => {
    const status = getStatus(championId)
    if (status === 'PICKED') return

    if (status === 'NONE') {
      await saveNote(championId, 'PRIORITY')
    } else if (status === 'PRIORITY') {
      await saveNote(championId, 'NONE')
    }
  }

  // ステータスの優先順位（並び順用）
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

  return (
    <div className="space-y-5 text-sm text-zinc-200">
      {/* 確定済み一覧（5枠固定） */}
      <section className="border border-zinc-700 rounded-lg p-3 bg-zinc-900/80">
        <h2 className="text-xs font-semibold mb-2 text-emerald-300">
          確定済みピック
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {ROLES.map((role) => {
            const picked = pickedByRole[role]

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
                      onClick={() => handleCancelConfirm(picked.champion_id)}
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

      {/* プール一覧（5ロール横並びをキープ：小さい画面は横スクロール） */}
      <section className="border border-zinc-700 rounded-lg bg-zinc-900/80 p-3 overflow-x-auto">
        <div className="min-w-[900px] grid grid-cols-5 gap-3">
          {ROLES.map((role) => {
            const member = memberByRole[role]
            const rolePools = poolsByRole[role] || []

            const sortedRolePools = [...rolePools].sort((a, b) => {
              const sa = getStatus(a.champion_id)
              const sb = getStatus(b.champion_id)

              const ra = statusRank(sa)
              const rb = statusRank(sb)
              if (ra !== rb) return ra - rb

              // 同じステータスなら、得意度の高い順
              if (a.proficiency !== b.proficiency) {
                return b.proficiency - a.proficiency
              }

              return a.champion.name.localeCompare(b.champion.name)
            })

            return (
              <div key={role} className="flex flex-col gap-1.5">
                {/* ロール見出し + 表示名 */}
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

                {/* チャンピオングリッド */}
                <div className="grid grid-cols-2 gap-1.5">
                  {sortedRolePools.map((p) => {
                    const status = getStatus(p.champion_id)

                    return (
                      <div
                        key={p.id}
                        className="flex flex-col items-center gap-0.5 text-[9px]"
                      >
                        {/* アイコンボタン（幅細め） */}
                        <button
                          onClick={() => handleClickChampion(p.champion_id)}
                          disabled={status === 'PICKED'}
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
                          {/* 得意度の星 */}
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

                          {/* ピック不可の × マーク */}
                          {status === 'UNAVAILABLE' && (
                            <div className="absolute inset-0 flex items-center justify-center text-red-500 text-xl font-bold pointer-events-none">
                              ×
                            </div>
                          )}
                        </button>

                        {/* チャンピオン名のみ表示 */}
                        <span className="text-[8px] text-zinc-200 text-center line-clamp-2">
                          {p.champion.name}
                        </span>

                        {/* ピック不可トグル */}
                        {status !== 'PICKED' && (
                          <button
                            onClick={() =>
                              handleToggleUnavailable(p.champion_id)
                            }
                            className={
                              status === 'UNAVAILABLE'
                                ? 'text-[8px] text-red-300 hover:text-red-200'
                                : 'text-[8px] text-zinc-400 hover:text-zinc-200'
                            }
                          >
                            {status === 'UNAVAILABLE'
                              ? '不可解除'
                              : '不可'}
                          </button>
                        )}

                        {/* 確定／解除ボタン */}
                        {status !== 'PICKED' ? (
                          <button
                            onClick={() => handleConfirmPick(p.champion_id)}
                            disabled={status === 'UNAVAILABLE'}
                            className="text-[8px] text-emerald-300 hover:text-emerald-200 disabled:opacity-40"
                          >
                            確定
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              handleCancelConfirm(p.champion_id)
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
