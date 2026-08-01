// Collectible cosmetics. Earned only, never bought: keeping money entirely out of
// this avoids every loot-box regulatory question and keeps the collection feeling
// like an achievement rather than a shop.

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
export type Slot = 'head' | 'face' | 'held' | 'feet' | 'back' | 'aura';

export type Item = {
  key: string;
  name: string;
  slot: Slot;
  rarity: Rarity;
  emoji: string;
};

export const RARITY_ORDER: Rarity[] = ['common', 'rare', 'epic', 'legendary'];

export const RARITY_META: Record<Rarity, { label: string; color: string; glow: string; weight: number }> = {
  common: { label: 'Common', color: '#8A98A6', glow: '#C7D0D8', weight: 60 },
  rare: { label: 'Rare', color: '#4D7CFF', glow: '#A9C1FF', weight: 25 },
  epic: { label: 'Epic', color: '#9B6DFF', glow: '#D3BEFF', weight: 12 },
  legendary: { label: 'Legendary', color: '#FF9F1C', glow: '#FFD98A', weight: 3 },
};

export const SLOT_META: Record<Slot, { label: string; emoji: string }> = {
  head: { label: 'Head', emoji: '🎩' },
  face: { label: 'Face', emoji: '🕶️' },
  held: { label: 'Held', emoji: '✋' },
  feet: { label: 'Feet', emoji: '👟' },
  back: { label: 'Back', emoji: '🎒' },
  aura: { label: 'Aura', emoji: '✨' },
};

export const ITEMS: Item[] = [
  // head
  { key: 'headband', name: 'Sweatband', slot: 'head', rarity: 'common', emoji: '🎽' },
  { key: 'cap', name: 'Backwards Cap', slot: 'head', rarity: 'common', emoji: '🧢' },
  { key: 'beanie', name: 'Winter Beanie', slot: 'head', rarity: 'rare', emoji: '🧶' },
  { key: 'viking', name: 'Viking Helmet', slot: 'head', rarity: 'epic', emoji: '⚔️' },
  { key: 'crown', name: 'Golden Crown', slot: 'head', rarity: 'legendary', emoji: '👑' },

  // face
  { key: 'shades', name: 'Cool Shades', slot: 'face', rarity: 'common', emoji: '🕶️' },
  { key: 'specs', name: 'Round Specs', slot: 'face', rarity: 'common', emoji: '👓' },
  { key: 'eyepatch', name: 'Eyepatch', slot: 'face', rarity: 'rare', emoji: '🏴‍☠️' },
  { key: 'monocle', name: 'Monocle', slot: 'face', rarity: 'epic', emoji: '🧐' },

  // held
  { key: 'bottle', name: 'Water Bottle', slot: 'held', rarity: 'common', emoji: '🍶' },
  { key: 'dumbbell', name: 'Dumbbell', slot: 'held', rarity: 'common', emoji: '🏋️' },
  { key: 'banana', name: 'Emergency Banana', slot: 'held', rarity: 'rare', emoji: '🍌' },
  { key: 'kettlebell', name: 'Kettlebell', slot: 'held', rarity: 'rare', emoji: '🔔' },
  { key: 'trophy', name: 'Tiny Trophy', slot: 'held', rarity: 'epic', emoji: '🏆' },

  // feet
  { key: 'sneakers', name: 'Sneakers', slot: 'feet', rarity: 'common', emoji: '👟' },
  { key: 'boots', name: 'Work Boots', slot: 'feet', rarity: 'rare', emoji: '🥾' },
  { key: 'cleats', name: 'Track Spikes', slot: 'feet', rarity: 'rare', emoji: '🏃' },
  { key: 'goldkicks', name: 'Golden Kicks', slot: 'feet', rarity: 'legendary', emoji: '✨' },

  // back
  { key: 'cape', name: 'Hero Cape', slot: 'back', rarity: 'rare', emoji: '🦸' },
  { key: 'wings', name: 'Angel Wings', slot: 'back', rarity: 'epic', emoji: '🪽' },
  { key: 'jetpack', name: 'Jetpack', slot: 'back', rarity: 'legendary', emoji: '🚀' },

  // aura
  { key: 'sparkle', name: 'Sparkle Aura', slot: 'aura', rarity: 'rare', emoji: '✨' },
  { key: 'flames', name: 'On Fire', slot: 'aura', rarity: 'epic', emoji: '🔥' },
  { key: 'lightning', name: 'Storm Aura', slot: 'aura', rarity: 'legendary', emoji: '⚡' },
];

export const ITEM_BY_KEY: Record<string, Item> = Object.fromEntries(ITEMS.map((i) => [i.key, i]));

export const ITEM_KEYS = ITEMS.map((i) => i.key);

export function itemsBySlot(slot: Slot): Item[] {
  return ITEMS.filter((i) => i.slot === slot);
}

// Roll a box. Weighted by rarity, but only from items the person does NOT own,
// so a box never hands back a duplicate. If a rolled rarity is exhausted we walk
// outward to the nearest rarity that still has something new.
export function rollItem(owned: string[], rng: () => number = Math.random): Item | null {
  const ownedSet = new Set(owned);
  const available = ITEMS.filter((i) => !ownedSet.has(i.key));
  if (available.length === 0) return null;

  const rarities = RARITY_ORDER.filter((r) => available.some((i) => i.rarity === r));
  const totalWeight = rarities.reduce((sum, r) => sum + RARITY_META[r].weight, 0);

  let roll = rng() * totalWeight;
  let chosen: Rarity = rarities[0];
  for (const r of rarities) {
    roll -= RARITY_META[r].weight;
    if (roll <= 0) {
      chosen = r;
      break;
    }
  }

  const pool = available.filter((i) => i.rarity === chosen);
  return pool[Math.floor(rng() * pool.length)] ?? available[0];
}
