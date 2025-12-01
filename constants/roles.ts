// src/constants/roles.ts
export const ROLES = [
  'TOP',
  'JG',
  'MID',
  'ADC',
  'SUP',
] as const

export type Role = (typeof ROLES)[number]
