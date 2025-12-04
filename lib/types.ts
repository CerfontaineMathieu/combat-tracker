// Inventory Item Types
export interface EquipmentItem {
  id: string
  name: string
  equipped: boolean
  description?: string
  rarity?: string
  catalogNotionId?: string  // Reference to item_catalog for auto-updates
}

export interface ConsumableItem {
  id: string
  name: string
  quantity: number
  description?: string
  rarity?: string
  catalogNotionId?: string  // Reference to item_catalog for auto-updates
}

export interface CurrencyInventory {
  platinum: number  // pp (pièces de platine)
  gold: number      // po (pièces d'or)
  electrum: number  // pe (pièces d'électrum)
  silver: number    // pa (pièces d'argent)
  copper: number    // pc (pièces de cuivre)
}

export interface MiscItem {
  id: string
  name: string
  description?: string
  rarity?: string
  catalogNotionId?: string  // Reference to item_catalog for auto-updates
}

export interface CharacterInventory {
  equipment: EquipmentItem[]
  consumables: ConsumableItem[]
  currency: CurrencyInventory
  items: MiscItem[]
}

export const DEFAULT_INVENTORY: CharacterInventory = {
  equipment: [],
  consumables: [],
  currency: {
    platinum: 0,
    gold: 0,
    electrum: 0,
    silver: 0,
    copper: 0,
  },
  items: [],
}

export interface Character {
  id: string
  name: string
  class: string
  level: number
  currentHp: number
  maxHp: number
  ac: number
  conditions: string[]
  exhaustionLevel: number
  initiative: number
  inventory?: CharacterInventory
  // Connection status
  isConnected?: boolean
  // Grouping metadata for multi-character players
  playerSocketId?: string
  isFirstInGroup?: boolean
  groupSize?: number
  // Combat stats (synced from Notion)
  passivePerception?: number | null
  strength?: number | null
  dexterity?: number | null
  constitution?: number | null
  intelligence?: number | null
  wisdom?: number | null
  charisma?: number | null
}

export interface Monster {
  id: string
  name: string
  hp: number
  maxHp: number
  ac: number
  initiative: number
  notes: string
  status: "actif" | "mort"
  conditions: string[]
  exhaustionLevel: number
}

export interface CombatParticipant {
  id: string
  name: string
  initiative: number
  currentHp: number
  maxHp: number
  conditions: string[]
  conditionDurations?: Record<string, number> // conditionId -> remaining turns (only during combat)
  exhaustionLevel: number
  type: "player" | "monster"
  xp?: number // XP value for monsters (from challenge_rating_xp)
  level?: number // Level for players (used in difficulty calculation)
  // Connection status (players only)
  isConnected?: boolean
  // Death saving throws (players only)
  deathSaves?: {
    successes: number // 0-3
    failures: number  // 0-3
  }
  isStabilized?: boolean
  isDead?: boolean
}

export interface Note {
  id: string
  date: string
  title: string
  content: string
}

// Database monster type (from PostgreSQL)
export interface DbMonster {
  id: number
  name: string
  armor_class: number | null
  hit_points: number | null
  speed: string | null
  strength: number | null
  dexterity: number | null
  constitution: number | null
  intelligence: number | null
  wisdom: number | null
  charisma: number | null
  strength_mod: number | null
  dexterity_mod: number | null
  constitution_mod: number | null
  intelligence_mod: number | null
  wisdom_mod: number | null
  charisma_mod: number | null
  creature_type: string | null
  size: string | null
  challenge_rating_xp: number | null
  actions: Array<{ name: string; description: string }>
  legendary_actions: Array<{ name: string; description: string; cost: number }>
  traits: {
    skills: string[]
    senses: string[]
    languages: string[]
    damage_resistances: string[]
    damage_immunities: string[]
    condition_immunities: string[]
    special_abilities: Array<{ name: string; description: string }>
  }
  image_url: string | null
  ai_generated: string | null
  notion_id: string | null
}

// Condition definition with icon and color
export interface Condition {
  id: string
  name: string
  description: string
  icon: string // Lucide icon name
  color: string // Tailwind color name
}

// Active condition on a participant (with optional duration)
export interface ActiveCondition {
  conditionId: string
  remainingTurns: number | null // null = permanent (no duration)
}

// D&D 5e Conditions (États) - French
export const CONDITIONS: Condition[] = [
  {
    id: "a-terre",
    name: "À terre",
    description: "La seule option de mouvement d'une créature à terre est de ramper, à moins qu'elle ne se relève.",
    icon: "arrow-down",
    color: "amber"
  },
  {
    id: "agrippe",
    name: "Agrippé",
    description: "La vitesse d'une créature agrippée devient 0 et elle ne bénéficie d'aucun bonus à sa vitesse.",
    icon: "grab",
    color: "orange"
  },
  {
    id: "assourdi",
    name: "Assourdi",
    description: "Une créature assourdie n'entend plus et rate automatiquement tout jet de caractéristique relatif à l'ouïe.",
    icon: "ear-off",
    color: "slate"
  },
  {
    id: "aveugle",
    name: "Aveuglé",
    description: "Une créature aveuglée ne voit plus et rate automatiquement tout jet de caractéristique relatif à la vue.",
    icon: "eye-off",
    color: "zinc"
  },
  {
    id: "charme",
    name: "Charmé",
    description: "Une créature charmée ne peut pas attaquer celui qui l'a charmée ni le cibler avec des capacités ou effets magiques nuisibles.",
    icon: "heart",
    color: "pink"
  },
  {
    id: "effraye",
    name: "Effrayé",
    description: "Une créature effrayée a un désavantage aux jets de caractéristique et d'attaque tant que la source de sa frayeur est dans son champ de vision.",
    icon: "ghost",
    color: "purple"
  },
  {
    id: "empoisonne",
    name: "Empoisonné",
    description: "Une créature empoisonnée a un désavantage aux jets d'attaque et de caractéristique.",
    icon: "skull",
    color: "green"
  },
  {
    id: "entrave",
    name: "Entravé",
    description: "La vitesse d'une créature entravée devient 0 et elle ne bénéficie d'aucun bonus à sa vitesse.",
    icon: "link",
    color: "stone"
  },
  {
    id: "etourdi",
    name: "Étourdi",
    description: "Une créature étourdie est incapable d'agir, ne peut plus bouger et parle de manière hésitante.",
    icon: "zap",
    color: "yellow"
  },
  {
    id: "incapable",
    name: "Incapable d'agir",
    description: "Une créature incapable d'agir ne peut effectuer aucune action ni réaction.",
    icon: "ban",
    color: "red"
  },
  {
    id: "inconscient",
    name: "Inconscient",
    description: "Une créature inconsciente est incapable d'agir, ne peut plus bouger ni parler et n'est pas consciente de ce qui l'entoure.",
    icon: "moon",
    color: "indigo"
  },
  {
    id: "invisible",
    name: "Invisible",
    description: "Une créature invisible ne peut être vue sans l'aide de la magie ou d'un sens spécial.",
    icon: "eye",
    color: "cyan"
  },
  {
    id: "paralyse",
    name: "Paralysé",
    description: "Une créature paralysée est incapable d'agir et ne peut ni bouger ni parler.",
    icon: "pause",
    color: "blue"
  },
  {
    id: "petrifie",
    name: "Pétrifié",
    description: "Une créature pétrifiée est transformée, avec tous les objets non magiques qu'elle porte, en une substance inanimée solide.",
    icon: "mountain",
    color: "gray"
  },
  {
    id: "concentre",
    name: "Concentré",
    description: "La créature maintient sa concentration sur un sort ou un effet.",
    icon: "focus",
    color: "sky"
  },
]

// Exhaustion levels (Épuisement) - D&D 2024
export const EXHAUSTION_LEVELS = [
  { level: 1, effect: "-2 aux jets de d20, -1,5m de vitesse" },
  { level: 2, effect: "-4 aux jets de d20, -3m de vitesse" },
  { level: 3, effect: "-6 aux jets de d20, -4,5m de vitesse" },
  { level: 4, effect: "-8 aux jets de d20, -6m de vitesse" },
  { level: 5, effect: "-10 aux jets de d20, -7,5m de vitesse" },
  { level: 6, effect: "Mort" },
] as const

// Helper to get condition by ID
export const getConditionById = (id: string): Condition | undefined => {
  return CONDITIONS.find(c => c.id === id)
}

// Condition color classes for Tailwind
export const CONDITION_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  amber: { bg: "bg-amber-500/20", border: "border-amber-500/50", text: "text-amber-500" },
  orange: { bg: "bg-orange-500/20", border: "border-orange-500/50", text: "text-orange-500" },
  slate: { bg: "bg-slate-500/20", border: "border-slate-500/50", text: "text-slate-400" },
  zinc: { bg: "bg-zinc-500/20", border: "border-zinc-500/50", text: "text-zinc-400" },
  pink: { bg: "bg-pink-500/20", border: "border-pink-500/50", text: "text-pink-500" },
  purple: { bg: "bg-purple-500/20", border: "border-purple-500/50", text: "text-purple-500" },
  green: { bg: "bg-green-500/20", border: "border-green-500/50", text: "text-green-500" },
  stone: { bg: "bg-stone-500/20", border: "border-stone-500/50", text: "text-stone-400" },
  yellow: { bg: "bg-yellow-500/20", border: "border-yellow-500/50", text: "text-yellow-500" },
  red: { bg: "bg-red-500/20", border: "border-red-500/50", text: "text-red-500" },
  indigo: { bg: "bg-indigo-500/20", border: "border-indigo-500/50", text: "text-indigo-500" },
  cyan: { bg: "bg-cyan-500/20", border: "border-cyan-500/50", text: "text-cyan-500" },
  blue: { bg: "bg-blue-500/20", border: "border-blue-500/50", text: "text-blue-500" },
  gray: { bg: "bg-gray-500/20", border: "border-gray-500/50", text: "text-gray-400" },
  sky: { bg: "bg-sky-500/20", border: "border-sky-500/50", text: "text-sky-500" },
}

// Notion Sync types
export interface SyncPreviewData {
  success: boolean
  summary: {
    toAdd: number
    toUpdate: number
    toDelete: number
    unchanged: number
    total: number
  }
  items: import('@/lib/monster-comparison').SyncPreviewItem[]
}

export interface SyncOperations {
  add: { name: string; notionId: string }[]
  update: {
    name: string
    dbId: number
    fields: (keyof DbMonster)[]
    notionId: string
  }[]
  delete: number[]
}

export interface SyncApplyResult {
  success: boolean
  results: {
    added: number
    updated: number
    deleted: number
    errors: string[]
  }
}

// ============================================
// Item Catalog Types (for Notion sync)
// ============================================

export type ItemCategory = 'equipment' | 'consumable' | 'misc';
export type ItemSubcategory = 'weapon' | 'potion' | 'fleche' | 'parchemin' | 'plante' | 'poison' | 'objet_magique' | 'other';

export interface CatalogItem {
  id: number;
  notion_id: string;
  name: string;
  category: ItemCategory;
  subcategory: ItemSubcategory | null;
  source_database: string;
  description: string | null;
  rarity: string | null;
  properties: Record<string, unknown>;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

// For creating/updating items (without id and timestamps)
export type CatalogItemInput = Omit<CatalogItem, 'id' | 'created_at' | 'updated_at'>;

export interface ItemSyncPreview {
  toAdd: CatalogItemInput[];
  toUpdate: { existing: CatalogItem; updated: CatalogItemInput; changes: string[] }[];
  toDelete: CatalogItem[];
  unchanged: number;
}

export interface ItemSyncResult {
  success: boolean;
  added: number;
  updated: number;
  deleted: number;
  errors: string[];
}
