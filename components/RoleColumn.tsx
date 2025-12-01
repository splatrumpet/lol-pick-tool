// src/components/RoleColumn.tsx
import { ChampionIcon } from './ChampionIcon'
import type { Role } from '@/constants/roles'

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

interface MemberRow {
  id: string
  room_id: string
  user_id: string
  display_name: string
  role: Role
}

interface RoleColumnProps {
  role: Role
  member?: MemberRow
  champions: PoolRow[]
  noteMap: Map<string, Status>
  onToggleStatus: (championId: string) => void
  onToggleUnavailable: (championId: string) => void
  onTogglePicked: (championId: string) => void
}

export function RoleColumn({
  role,
  member,
  champions,
  noteMap,
  onToggleStatus,
  onToggleUnavailable,
  onTogglePicked,
}: RoleColumnProps) {
  return (
    <div className="min-w-[120px]">
      <h2 className="text-center text-xs font-semibold text-zinc-200">
        {role}
      </h2>
      {member ? (
        <div className="text-[10px] text-zinc-400 text-center mb-2">
          {member.display_name}
        </div>
      ) : (
        <div className="text-[10px] text-zinc-500 text-center mb-2">
          (未参加)
        </div>
      )}
      <div className="flex flex-col gap-2">
        {champions.map((p) => {
          const status = noteMap.get(p.champion_id) ?? 'NONE'
          const isPicked = status === 'PICKED'
          const isUnavailable = status === 'UNAVAILABLE'

          return (
            <div
              key={p.champion_id + p.user_id}
              className="flex flex-col items-center gap-1"
            >
              <ChampionIcon
                champion={p.champion}
                status={status}
                onClick={() => onToggleStatus(p.champion_id)}
              />
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => onToggleUnavailable(p.champion_id)}
                  className={`px-2 py-0.5 rounded-full text-[10px] border ${isUnavailable
                      ? 'bg-zinc-700 border-zinc-400 text-zinc-200'
                      : 'bg-zinc-800 border-zinc-600 text-zinc-300 hover:bg-zinc-700'
                    }`}
                >
                  不可
                </button>
                <button
                  type="button"
                  onClick={() => onTogglePicked(p.champion_id)}
                  className={`px-2 py-0.5 rounded-full text-[10px] border ${isPicked
                      ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                      : 'bg-zinc-800 border-zinc-600 text-zinc-300 hover:bg-zinc-700'
                    }`}
                >
                  {isPicked ? '確定解除' : '確定'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
