/**
 * Predefined UC pack image configuration (shared with frontend).
 * Admin picks from this list via visual grid.
 */

export interface UcPackImageOption {
  key: string;
  label: string;
  description: string;
  gradient: [string, string];
  iconScale: number;
  stacks: number;
}

export const UC_PACK_IMAGES: UcPackImageOption[] = [
  { key: 'uc-1', label: 'Мини', description: '30–60 UC', gradient: ['#1a2744', '#0f1d36'], iconScale: 0.7, stacks: 1 },
  { key: 'uc-2', label: 'Малый', description: '300–600 UC', gradient: ['#1e2d4d', '#142240'], iconScale: 0.85, stacks: 2 },
  { key: 'uc-3', label: 'Средний', description: '1 000–1 800 UC', gradient: ['#22335a', '#182848'], iconScale: 1.0, stacks: 3 },
  { key: 'uc-4', label: 'Большой', description: '3 000–6 000 UC', gradient: ['#263a65', '#1c2f52'], iconScale: 1.15, stacks: 4 },
  { key: 'uc-5', label: 'Огромный', description: '8 100–12 000 UC', gradient: ['#2a4170', '#20365c'], iconScale: 1.3, stacks: 5 },
  { key: 'uc-6', label: 'Максимальный', description: '18 000+ UC', gradient: ['#2e487b', '#243d66'], iconScale: 1.5, stacks: 6 },
];

export function getUcPackImage(key: string): UcPackImageOption {
  return UC_PACK_IMAGES.find(img => img.key === key) || UC_PACK_IMAGES[0];
}
