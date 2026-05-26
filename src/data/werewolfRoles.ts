export type WerewolfRole =
  | 'werewolf'
  | 'villager'
  | 'seer'
  | 'witch'
  | 'hunter'

export type Team = 'wolf' | 'good'

export interface RoleConfig {
  role: WerewolfRole
  team: Team
  emoji: string
  color: string
}

export const ROLE_CONFIG: Record<WerewolfRole, RoleConfig> = {
  werewolf: { role: 'werewolf', team: 'wolf', emoji: '🐺', color: 'text-red-400' },
  villager: { role: 'villager', team: 'good', emoji: '👨‍🌾', color: 'text-green-400' },
  seer:     { role: 'seer',     team: 'good', emoji: '🔮', color: 'text-purple-400' },
  witch:    { role: 'witch',    team: 'good', emoji: '🧙‍♀️', color: 'text-yellow-400' },
  hunter:   { role: 'hunter',   team: 'good', emoji: '🏹', color: 'text-orange-400' },
}

export interface Preset {
  label: string
  players: number
  roles: WerewolfRole[]
}

export const PRESETS: Preset[] = [
  {
    label: '6人',
    players: 6,
    roles: ['werewolf', 'werewolf', 'seer', 'witch', 'villager', 'villager'],
  },
  {
    label: '8人',
    players: 8,
    roles: ['werewolf', 'werewolf', 'seer', 'witch', 'hunter', 'villager', 'villager', 'villager'],
  },
  {
    label: '10人',
    players: 10,
    roles: ['werewolf', 'werewolf', 'werewolf', 'seer', 'witch', 'hunter', 'villager', 'villager', 'villager', 'villager'],
  },
  {
    label: '12人',
    players: 12,
    roles: ['werewolf', 'werewolf', 'werewolf', 'seer', 'witch', 'hunter', 'villager', 'villager', 'villager', 'villager', 'villager', 'villager'],
  },
]
