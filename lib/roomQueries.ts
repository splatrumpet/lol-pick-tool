import { supabase } from '@/lib/supabaseClient'
import { Role } from '@/constants/roles'
import { mapNoteRows, mapPoolsForMembers, NoteDbRow, PoolWithChampionDbRow } from '@/lib/roomDataMappers'

export type MemberRow = {
  id: string
  room_id: string
  user_id: string
  display_name: string
  role: Role
}

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

export type NoteStatus = 'NONE' | 'PRIORITY' | 'PICKED' | 'UNAVAILABLE'

export type NoteRow = {
  id?: string
  room_id: string
  champion_id: string
  status: NoteStatus
  role: Role | null
}

const ROLE_ORDER: Record<Role, number> = {
  TOP: 0,
  JG: 1,
  MID: 2,
  ADC: 3,
  SUP: 4,
}

const sortMembersByRole = (rows: MemberRow[]) =>
  [...rows].sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role])

export const fetchRoomMembersAndPools = async (roomId: string) => {
  const { data: memberRows, error: memberError } = await supabase
    .from('room_members')
    .select('id, room_id, user_id, display_name, role')
    .eq('room_id', roomId)

  if (memberError) {
    return { members: [] as MemberRow[], pools: [] as PoolRow[], error: memberError }
  }

  const members = sortMembersByRole((memberRows || []) as MemberRow[])
  const userIds = members.map((m) => m.user_id)

  if (userIds.length === 0) {
    return { members, pools: [] as PoolRow[], error: null }
  }

  const { data: poolData, error: poolError } = await supabase
    .from('user_champion_pools')
    .select('id, user_id, champion_id, role, proficiency, champions(*)')
    .in('user_id', userIds)

  if (poolError) {
    return { members, pools: [] as PoolRow[], error: poolError }
  }

  return {
    members,
    pools: mapPoolsForMembers(
      (poolData || []) as unknown as PoolWithChampionDbRow[],
      members
    ) as PoolRow[],
    error: null,
  }
}

export const fetchRoomNotes = async (roomId: string) => {
  const { data, error } = await supabase
    .from('room_champion_notes')
    .select('*')
    .eq('room_id', roomId)

  if (error) {
    return { notes: [] as NoteRow[], error }
  }

  return {
    notes: mapNoteRows((data || []) as NoteDbRow<NoteStatus>[]) as NoteRow[],
    error: null,
  }
}
