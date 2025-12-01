// src/components/PickBoard.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { ROLES, Role } from '@/constants/roles'
import { RoleColumn } from './RoleColumn'
import { ChampionIcon } from './ChampionIcon'

type Status = 'NONE' | 'PRIORITY' | 'PICKED' | 'UNAVAILABLE'

interface PoolRow {
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

interface NoteRow {
  id?: string
  room_id: string
  champion_id: string
  status: Status
}

interface MemberRow {
  id: string
  room_id: string
  user_id: string
  display_name: string
  role: Role
}

interface PickBoardProps {
  roomId: string
  members: MemberRow[]
  pools?: PoolRow[]
  notes?: NoteRow[]
}

// 並び順（上に来るほど数字が小さい）
const STATUS_ORDER: Record<Status, number> = {
  PICKED: 0,
  PRIORITY: 1,
  NONE: 2,
  UNAVAILABLE: 3,
}

// ロールごとの「確定前の状態」を覚えておくための型
type RolePrevStates = Partial<Record<Role, Record<string, Status>>>

export function PickBoard({
  roomId,
  members,
  pools = [],
  notes = [],
}: PickBoardProps) {
  const [localNotes, setLocalNotes] = useState<NoteRow[]>(notes ?? [])
  const [rolePrevStates, setRolePrevStates] = useState<RolePrevStates>({})

  // RoomPage 側でリセットされたときなどに props.notes を反映
  useEffect(() => {
    setLocalNotes(notes ?? [])
    setRolePrevStates({})
  }, [notes])

  const noteMap = useMemo(() => {
    const map = new Map<string, Status>()
      ; (localNotes ?? []).forEach((n) => map.set(n.champion_id, n.status))
    return map
  }, [localNotes])

  const safePools = Array.isArray(pools) ? pools : []

  // role -> member
  const memberByRole = useMemo(() => {
    const map = new Map<Role, MemberRow>()
    members.forEach((m) => map.set(m.role, m))
    return map
  }, [members])

  // ロールごとにチャンピオンをまとめる（状態 → 得意度順）
  const poolsByRole = useMemo(() => {
    const res: Record<Role, PoolRow[]> = {
      TOP: [],
      JG: [],
      MID: [],
      ADC: [],
      SUP: [],
    }

    safePools.forEach((p) => {
      if (res[p.role]) {
        res[p.role].push(p)
      }
    })

      ; (Object.keys(res) as Role[]).forEach((role) => {
        res[role].sort((a, b) => {
          const sa = noteMap.get(a.champion_id) ?? 'NONE'
          const sb = noteMap.get(b.champion_id) ?? 'NONE'
          const orderDiff = STATUS_ORDER[sa] - STATUS_ORDER[sb]
          if (orderDiff !== 0) return orderDiff
          return b.proficiency - a.proficiency
        })
      })

    return res
  }, [safePools, noteMap])

  const upsertAllNotes = async (nextNotes: NoteRow[]) => {
    const payload = nextNotes.map((n) => ({
      room_id: roomId,
      champion_id: n.champion_id,
      status: n.status,
    }))
    await supabase
      .from('room_champion_notes')
      .upsert(payload, { onConflict: 'room_id,champion_id' })
  }

  // アイコン本体クリック：未設定 ⇄ ピック候補 のみ
  const handleToggleStatus = async (championId: string) => {
    const current = noteMap.get(championId) ?? 'NONE'
    if (current === 'PICKED' || current === 'UNAVAILABLE') {
      return
    }

    const next: Status = current === 'PRIORITY' ? 'NONE' : 'PRIORITY'
    let nextNotes: NoteRow[] = []

    setLocalNotes((prev) => {
      const map = new Map<string, NoteRow>()
      prev.forEach((n) => map.set(n.champion_id, n))

      const existing = map.get(championId)
      if (existing) {
        existing.status = next
      } else {
        map.set(championId, {
          room_id: roomId,
          champion_id: championId,
          status: next,
        })
      }

      nextNotes = Array.from(map.values())
      return nextNotes
    })

    await upsertAllNotes(nextNotes)
  }

  // 「不可」ボタン：未設定/候補 ⇄ 不可 （確定中は触らない）
  const handleToggleUnavailable = async (championId: string) => {
    const current = noteMap.get(championId) ?? 'NONE'
    if (current === 'PICKED') return

    const next: Status =
      current === 'UNAVAILABLE' ? 'NONE' : 'UNAVAILABLE'

    let nextNotes: NoteRow[] = []

    setLocalNotes((prev) => {
      const map = new Map<string, NoteRow>()
      prev.forEach((n) => map.set(n.champion_id, n))

      const existing = map.get(championId)
      if (existing) {
        existing.status = next
      } else {
        map.set(championId, {
          room_id: roomId,
          champion_id: championId,
          status: next,
        })
      }

      nextNotes = Array.from(map.values())
      return nextNotes
    })

    await upsertAllNotes(nextNotes)
  }

  // 「確定」ボタン：1ロール1体 + 確定時に同ロール他は不可に
  // 解除時は「確定前の状態」をできるだけ復元
  const handleTogglePicked = async (championId: string) => {
    const current = noteMap.get(championId) ?? 'NONE'

    const targetPool = safePools.find(
      (p) => p.champion_id === championId
    )
    if (!targetPool) return

    const role = targetPool.role
    const roleChampionIds = safePools
      .filter((p) => p.role === role)
      .map((p) => p.champion_id)

    let nextNotes: NoteRow[] = []

    setLocalNotes((prev) => {
      const map = new Map<string, NoteRow>()
      prev.forEach((n) => map.set(n.champion_id, n))

      if (current === 'PICKED') {
        // ★ 確定解除：できるだけ「確定前の状態」に戻す
        const prevByRole = rolePrevStates[role]

        if (prevByRole) {
          roleChampionIds.forEach((id) => {
            const prevStatus = prevByRole[id] ?? 'NONE'
            const existing = map.get(id)
            if (existing) {
              existing.status = prevStatus
            } else {
              map.set(id, {
                room_id: roomId,
                champion_id: id,
                status: prevStatus,
              })
            }
          })

          setRolePrevStates((prevStates) => {
            const copy = { ...prevStates }
            delete copy[role]
            return copy
          })
        } else {
          // スナップショットがない場合は、そのロールのチャンプを全部 NONE に
          roleChampionIds.forEach((id) => {
            const existing = map.get(id)
            if (existing) {
              existing.status = 'NONE'
            } else {
              map.set(id, {
                room_id: roomId,
                champion_id: id,
                status: 'NONE',
              })
            }
          })
        }
      } else {
        // ★ 確定する前に、そのロールの状態をスナップショットに保存
        const snapshot: Record<string, Status> = {}
        roleChampionIds.forEach((id) => {
          const s = noteMap.get(id) ?? 'NONE'
          snapshot[id] = s
        })
        setRolePrevStates((prevStates) => ({
          ...prevStates,
          [role]: snapshot,
        }))

        // このロールの他チャンプは全部 UNAVAILABLE、自分だけ PICKED
        roleChampionIds.forEach((id) => {
          const existing = map.get(id)
          if (id === championId) {
            if (existing) {
              existing.status = 'PICKED'
            } else {
              map.set(id, {
                room_id: roomId,
                champion_id: id,
                status: 'PICKED',
              })
            }
          } else {
            if (existing) {
              existing.status = 'UNAVAILABLE'
            } else {
              map.set(id, {
                room_id: roomId,
                champion_id: id,
                status: 'UNAVAILABLE',
              })
            }
          }
        })
      }

      nextNotes = Array.from(map.values())
      return nextNotes
    })

    await upsertAllNotes(nextNotes)
  }

  return (
    <div className="space-y-4">
      {/* レジェンド */}
      <div className="text-xs text-zinc-400 flex flex-wrap gap-4">
        <span>
          <span className="inline-block w-3 h-3 border border-transparent bg-zinc-700 mr-1" />
          未設定
        </span>
        <span>
          <span className="inline-block w-3 h-3 border-2 border-emerald-400 bg-zinc-700 mr-1" />
          ピック候補
        </span>
        <span>
          <span className="inline-block w-3 h-3 border-2 border-sky-400 bg-zinc-700 mr-1" />
          ピック済み
        </span>
        <span>
          <span className="inline-block w-3 h-3 border border-zinc-500 bg-zinc-700 opacity-40 mr-1" />
          ピック不可
        </span>
      </div>

      {/* 確定ピックまとめ */}
      <div className="border border-zinc-800 rounded-lg p-3 space-y-2 bg-zinc-950/60">
        <div className="text-xs font-semibold text-zinc-300">
          確定ピック（PICKED）
        </div>
        <div className="flex gap-4 overflow-x-auto">
          {ROLES.map((role) => {
            const picked = (poolsByRole[role] || []).filter(
              (p) => noteMap.get(p.champion_id) === 'PICKED'
            )
            const first = picked[0]

            return (
              <div key={role} className="min-w-[110px] flex flex-col items-center">
                <div className="text-[10px] text-zinc-400 mb-1">{role}</div>
                {first ? (
                  <div className="flex flex-col items-center gap-1">
                    <ChampionIcon
                      champion={first.champion}
                      status="PICKED"
                      onClick={() => handleTogglePicked(first.champion_id)}
                    />
                    <div className="text-[10px] text-zinc-300 text-center">
                      {first.display_name}
                    </div>
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded bg-zinc-900 border border-dashed border-zinc-700 flex items-center justify-center text-[9px] text-zinc-500">
                    未選択
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* 5ロール横並び */}
      <div className="flex gap-4 overflow-x-auto">
        {ROLES.map((role) => (
          <RoleColumn
            key={role}
            role={role}
            member={memberByRole.get(role)}
            champions={poolsByRole[role]}
            noteMap={noteMap}
            onToggleStatus={handleToggleStatus}
            onToggleUnavailable={handleToggleUnavailable}
            onTogglePicked={handleTogglePicked}
          />
        ))}
      </div>
    </div>
  )
}
