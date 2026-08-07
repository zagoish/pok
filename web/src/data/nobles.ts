import type { BonusInventory, Noble } from '../domain/model'

function defineNoble(
  id: string,
  name: string,
  imageKey: string,
  requirement: BonusInventory,
): Noble {
  return { id, name, imageKey, points: 3, requirement }
}

export const NOBLES: Noble[] = [
  defineNoble('noble-001', 'Professor Oak', 'trainer-001', { fire: 0, water: 3, grass: 0, electric: 3, psychic: 3 }),
  defineNoble('noble-002', 'Misty', 'trainer-002', { fire: 3, water: 3, grass: 3, electric: 0, psychic: 0 }),
  defineNoble('noble-003', 'Brock', 'trainer-003', { fire: 3, water: 0, grass: 0, electric: 3, psychic: 3 }),
  defineNoble('noble-004', 'Erika', 'trainer-004', { fire: 4, water: 0, grass: 4, electric: 0, psychic: 0 }),
  defineNoble('noble-005', 'Sabrina', 'trainer-005', { fire: 0, water: 4, grass: 4, electric: 0, psychic: 0 }),
  defineNoble('noble-006', 'Blaine', 'trainer-006', { fire: 4, water: 0, grass: 0, electric: 0, psychic: 4 }),
  defineNoble('noble-007', 'Giovanni', 'trainer-007', { fire: 0, water: 0, grass: 0, electric: 4, psychic: 4 }),
  defineNoble('noble-008', 'Lorelei', 'trainer-008', { fire: 0, water: 3, grass: 3, electric: 3, psychic: 0 }),
  defineNoble('noble-009', 'Bruno', 'trainer-009', { fire: 3, water: 0, grass: 3, electric: 0, psychic: 3 }),
  defineNoble('noble-010', 'Agatha', 'trainer-010', { fire: 0, water: 4, grass: 0, electric: 4, psychic: 0 }),
]
