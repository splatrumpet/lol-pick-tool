import { Role } from '@/constants/roles'

export type MemberForPoolMapping = {
  user_id: string
  role: Role
  display_name: string | null
}

export type PoolWithChampionDbRow = {
  id: string
  champion_id: string
  role: Role
  proficiency: number
  user_id: string
  champions: {
    id: string
    name: string
    icon_url: string | null
  } | null
}

export type MappedPoolRow = {
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

export type NoteDbRow<TStatus extends string> = {
  id: string
  room_id: string
  champion_id: string
  status: TStatus
  role: Role | null
}

export type MappedNoteRow<TStatus extends string> = {
  id: string
  room_id: string
  champion_id: string
  status: TStatus
  role: Role | null
}

export const mapPoolsForMembers = (
  poolData: PoolWithChampionDbRow[],
  membersData: MemberForPoolMapping[]
): MappedPoolRow[] => {
  const memberByUserId = new Map(membersData.map((m) => [m.user_id, m]))

  return poolData
    .map((p) => {
      const member = memberByUserId.get(p.user_id)
      if (!member || member.role !== p.role || !p.champions) return null

      return {
        id: p.id,
        champion_id: p.champion_id,
        role: p.role,
        proficiency: p.proficiency,
        user_id: p.user_id,
        display_name: member.display_name ?? '',
        champion: {
          id: p.champions.id,
          name: p.champions.name,
          icon_url: p.champions.icon_url,
        },
      }
    })
    .filter((p): p is MappedPoolRow => p !== null)
}

export const mapNoteRows = <TStatus extends string>(
  noteRows: NoteDbRow<TStatus>[]
): MappedNoteRow<TStatus>[] =>
  noteRows.map((n) => ({
    id: n.id,
    room_id: n.room_id,
    champion_id: n.champion_id,
    status: n.status,
    role: n.role ?? null,
  }))
