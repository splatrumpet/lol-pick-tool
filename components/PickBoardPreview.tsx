// src/components/PickBoardPreview.tsx
'use client'

import { PickBoard, MemberRow, NoteRow, PoolRow } from '@/components/PickBoard'

const DDRAGON_VERSION = '15.23.1'

const iconUrl = (id: string) =>
  `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img/champion/${id}.png`

const members: MemberRow[] = [
  {
    id: 'm-top',
    room_id: 'preview',
    user_id: 'u-top',
    display_name: 'Akira',
    role: 'TOP',
  },
  {
    id: 'm-jg',
    room_id: 'preview',
    user_id: 'u-jg',
    display_name: 'Hina',
    role: 'JG',
  },
  {
    id: 'm-mid',
    room_id: 'preview',
    user_id: 'u-mid',
    display_name: 'Sora',
    role: 'MID',
  },
  {
    id: 'm-adc',
    room_id: 'preview',
    user_id: 'u-adc',
    display_name: 'Rin',
    role: 'ADC',
  },
  {
    id: 'm-sup',
    room_id: 'preview',
    user_id: 'u-sup',
    display_name: 'Yui',
    role: 'SUP',
  },
]

const pools: PoolRow[] = [
  {
    id: 'p-top-1',
    champion_id: 'Aatrox',
    role: 'TOP',
    proficiency: 3,
    user_id: 'u-top',
    display_name: 'Akira',
    champion: { id: 'Aatrox', name: 'Aatrox', icon_url: iconUrl('Aatrox') },
  },
  {
    id: 'p-top-2',
    champion_id: 'Garen',
    role: 'TOP',
    proficiency: 2,
    user_id: 'u-top',
    display_name: 'Akira',
    champion: { id: 'Garen', name: 'Garen', icon_url: iconUrl('Garen') },
  },
  {
    id: 'p-top-3',
    champion_id: 'Ornn',
    role: 'TOP',
    proficiency: 2,
    user_id: 'u-top',
    display_name: 'Akira',
    champion: { id: 'Ornn', name: 'Ornn', icon_url: iconUrl('Ornn') },
  },
  {
    id: 'p-top-4',
    champion_id: 'Fiora',
    role: 'TOP',
    proficiency: 1,
    user_id: 'u-top',
    display_name: 'Akira',
    champion: { id: 'Fiora', name: 'Fiora', icon_url: iconUrl('Fiora') },
  },
  {
    id: 'p-jg-1',
    champion_id: 'LeeSin',
    role: 'JG',
    proficiency: 3,
    user_id: 'u-jg',
    display_name: 'Hina',
    champion: { id: 'LeeSin', name: 'Lee Sin', icon_url: iconUrl('LeeSin') },
  },
  {
    id: 'p-jg-2',
    champion_id: 'Viego',
    role: 'JG',
    proficiency: 2,
    user_id: 'u-jg',
    display_name: 'Hina',
    champion: { id: 'Viego', name: 'Viego', icon_url: iconUrl('Viego') },
  },
  {
    id: 'p-jg-3',
    champion_id: 'Sejuani',
    role: 'JG',
    proficiency: 2,
    user_id: 'u-jg',
    display_name: 'Hina',
    champion: { id: 'Sejuani', name: 'Sejuani', icon_url: iconUrl('Sejuani') },
  },
  {
    id: 'p-jg-4',
    champion_id: 'Elise',
    role: 'JG',
    proficiency: 1,
    user_id: 'u-jg',
    display_name: 'Hina',
    champion: { id: 'Elise', name: 'Elise', icon_url: iconUrl('Elise') },
  },
  {
    id: 'p-mid-1',
    champion_id: 'Ahri',
    role: 'MID',
    proficiency: 3,
    user_id: 'u-mid',
    display_name: 'Sora',
    champion: { id: 'Ahri', name: 'Ahri', icon_url: iconUrl('Ahri') },
  },
  {
    id: 'p-mid-2',
    champion_id: 'Orianna',
    role: 'MID',
    proficiency: 2,
    user_id: 'u-mid',
    display_name: 'Sora',
    champion: { id: 'Orianna', name: 'Orianna', icon_url: iconUrl('Orianna') },
  },
  {
    id: 'p-mid-3',
    champion_id: 'Sylas',
    role: 'MID',
    proficiency: 2,
    user_id: 'u-mid',
    display_name: 'Sora',
    champion: { id: 'Sylas', name: 'Sylas', icon_url: iconUrl('Sylas') },
  },
  {
    id: 'p-mid-4',
    champion_id: 'Akali',
    role: 'MID',
    proficiency: 1,
    user_id: 'u-mid',
    display_name: 'Sora',
    champion: { id: 'Akali', name: 'Akali', icon_url: iconUrl('Akali') },
  },
  {
    id: 'p-adc-1',
    champion_id: 'Jinx',
    role: 'ADC',
    proficiency: 3,
    user_id: 'u-adc',
    display_name: 'Rin',
    champion: { id: 'Jinx', name: 'Jinx', icon_url: iconUrl('Jinx') },
  },
  {
    id: 'p-adc-2',
    champion_id: 'Kaisa',
    role: 'ADC',
    proficiency: 2,
    user_id: 'u-adc',
    display_name: 'Rin',
    champion: { id: 'Kaisa', name: "Kai'Sa", icon_url: iconUrl('Kaisa') },
  },
  {
    id: 'p-adc-3',
    champion_id: 'Ezreal',
    role: 'ADC',
    proficiency: 2,
    user_id: 'u-adc',
    display_name: 'Rin',
    champion: { id: 'Ezreal', name: 'Ezreal', icon_url: iconUrl('Ezreal') },
  },
  {
    id: 'p-adc-4',
    champion_id: 'Ashe',
    role: 'ADC',
    proficiency: 1,
    user_id: 'u-adc',
    display_name: 'Rin',
    champion: { id: 'Ashe', name: 'Ashe', icon_url: iconUrl('Ashe') },
  },
  {
    id: 'p-sup-1',
    champion_id: 'Thresh',
    role: 'SUP',
    proficiency: 3,
    user_id: 'u-sup',
    display_name: 'Yui',
    champion: { id: 'Thresh', name: 'Thresh', icon_url: iconUrl('Thresh') },
  },
  {
    id: 'p-sup-2',
    champion_id: 'Nautilus',
    role: 'SUP',
    proficiency: 2,
    user_id: 'u-sup',
    display_name: 'Yui',
    champion: {
      id: 'Nautilus',
      name: 'Nautilus',
      icon_url: iconUrl('Nautilus'),
    },
  },
  {
    id: 'p-sup-3',
    champion_id: 'Lulu',
    role: 'SUP',
    proficiency: 2,
    user_id: 'u-sup',
    display_name: 'Yui',
    champion: { id: 'Lulu', name: 'Lulu', icon_url: iconUrl('Lulu') },
  },
  {
    id: 'p-sup-4',
    champion_id: 'Yuumi',
    role: 'SUP',
    proficiency: 1,
    user_id: 'u-sup',
    display_name: 'Yui',
    champion: { id: 'Yuumi', name: 'Yuumi', icon_url: iconUrl('Yuumi') },
  },
]

const notes: NoteRow[] = [
  {
    id: 'n-top',
    room_id: 'preview',
    champion_id: 'Aatrox',
    status: 'PICKED',
    role: 'TOP',
  },
  {
    id: 'n-mid',
    room_id: 'preview',
    champion_id: 'Ahri',
    status: 'PICKED',
    role: 'MID',
  },
  {
    id: 'n-jg',
    room_id: 'preview',
    champion_id: 'LeeSin',
    status: 'PRIORITY',
    role: 'JG',
  },
  {
    id: 'n-adc',
    room_id: 'preview',
    champion_id: 'Jinx',
    status: 'PRIORITY',
    role: 'ADC',
  },
  {
    id: 'n-sup',
    room_id: 'preview',
    champion_id: 'Yuumi',
    status: 'UNAVAILABLE',
    role: 'SUP',
  },
]

export const PickBoardPreview = () => (
  <PickBoard
    roomId="preview"
    members={members}
    pools={pools}
    notes={notes}
    preview
  />
)
