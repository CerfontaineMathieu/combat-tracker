// Equipment Slot Types
export const EQUIPMENT_SLOTS = [
  'armor',
  'shield',
  'main-hand',
  'off-hand',
  'ring-1',
  'ring-2',
  'amulet',
  'gloves',
  'boots',
] as const

export type EquipmentSlot = typeof EQUIPMENT_SLOTS[number]

// Slot display names (French)
export const SLOT_NAMES: Record<EquipmentSlot, string> = {
  'armor': 'Armure',
  'shield': 'Bouclier',
  'main-hand': 'Arme principale',
  'off-hand': 'Arme secondaire',
  'ring-1': 'Anneau 1',
  'ring-2': 'Anneau 2',
  'amulet': 'Amulette',
  'gloves': 'Gants',
  'boots': 'Bottes',
}

// Inventory Item Types
export interface EquipmentItem {
  id: string
  name: string
  equipped: boolean
  slot?: EquipmentSlot | null  // Assigned slot (null = unequipped)
  slotTypes?: EquipmentSlot[]  // Compatible slots for this item (from catalog)
  requiresAttunement?: boolean  // From Notion catalog - if true, counts toward 3-item attunement limit when equipped
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
  // For scrolls (parchemins) - linked spell information
  linkedSpell?: {
    id: number
    name: string
    level: number
  }
  // For resistance potions - selected damage type
  resistanceType?: ResistanceType
}

// D&D 5e Resistance Types (damage types) - French
export const RESISTANCE_TYPES = [
  'Acide',
  'Froid',
  'Feu',
  'Force',
  'Foudre',
  'Nécrotique',
  'Poison',
  'Psychique',
  'Radiant',
  'Tonnerre',
] as const

export type ResistanceType = typeof RESISTANCE_TYPES[number]

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
  quantity: number
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
  tempHp?: number // Temporary hit points (D&D 5e)
  ac: number
  conditions: string[]
  conditionDurations?: Record<string, number>
  exhaustionLevel: number
  buffs?: ActiveBuff[]
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
  // Saving throw proficiencies (e.g., ["FOR", "CON"])
  savingThrowProficiencies?: string[]
  // Spell slots (synced from Notion)
  spellSlots?: Record<number, number>     // Current available slots {1: 4, 2: 3, ...}
  maxSpellSlots?: Record<number, number>  // Max slots from Notion
  isWarlock?: boolean                      // Warlocks recover slots on short rest
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
  buffs?: ActiveBuff[]
}

export interface CombatParticipant {
  id: string
  name: string
  initiative: number
  currentHp: number
  maxHp: number
  tempHp?: number // Temporary hit points (D&D 5e)
  ac?: number // AC for monsters (and optionally players)
  conditions: string[]
  conditionDurations?: Record<string, number> // conditionId -> remaining turns (only during combat)
  exhaustionLevel: number
  buffs?: ActiveBuff[] // Active buffs/debuffs on this participant
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
  // Pet relationship fields
  isPet?: boolean              // true if this participant is a pet/summon/familiar
  ownerId?: string             // ID of the owner participant (player or monster)
  ownerType?: "player" | "monster"  // Type of owner (for visual styling)
  // Spell slots (players only)
  spellSlots?: Record<number, number>     // Current available slots {1: 4, 2: 3, ...}
  maxSpellSlots?: Record<number, number>  // Max slots from Notion
  isWarlock?: boolean                      // Warlocks recover slots on short rest
  // Ability scores (players only, for saving throw display)
  strength?: number | null
  dexterity?: number | null
  constitution?: number | null
  intelligence?: number | null
  wisdom?: number | null
  charisma?: number | null
}

export interface Note {
  id: string
  date: string
  time: string  // "HH:mm" format
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
  bonus_actions: Array<{ name: string; description: string }>
  reactions: Array<{ name: string; description: string }>
  legendary_actions: Array<{ name: string; description: string; cost: number }>
  traits: {
    skills: string[]
    senses: string[]
    languages: string[]
    damage_vulnerabilities: string[]
    damage_resistances: string[]
    damage_immunities: string[]
    condition_immunities: string[]
    special_abilities: Array<{ name: string; description: string }>
  }
  description: string | null
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

// ============================================
// Buff/Debuff System
// ============================================

export type BuffType = "buff" | "debuff"

// Buff definition with icon, color, and effect description
export interface Buff {
  id: string
  name: string
  effect: string // Effect description (e.g., "+1d4 aux jets d'attaque")
  type: BuffType
  icon: string // Lucide icon name
  color: string // Tailwind color name
  isCustom?: boolean // true for user-created buffs
}

// Active buff on a participant (with duration tracking)
export interface ActiveBuff {
  buffId: string
  remainingTurns: number | null // null = permanent/concentration-based
  customName?: string // For custom buffs
  customEffect?: string // For custom buffs
  customType?: BuffType // For custom buffs
}

// D&D 5e Common Buffs and Debuffs - French
export const BUFFS: Buff[] = [
  // === BUFFS (green/gold/cyan colors) ===
  {
    id: "benediction",
    name: "Bénédiction",
    effect: "+1d4 aux jets d'attaque et de sauvegarde",
    type: "buff",
    icon: "sparkles",
    color: "emerald"
  },
  {
    id: "hate",
    name: "Hâte",
    effect: "Vitesse x2, +2 CA, avantage DEX, action supplémentaire",
    type: "buff",
    icon: "zap",
    color: "gold"
  },
  {
    id: "heroisme",
    name: "Héroïsme",
    effect: "Immunité effrayé, PV temp = mod. incantation/tour",
    type: "buff",
    icon: "shield",
    color: "gold"
  },
  {
    id: "bouclier-foi",
    name: "Bouclier de la Foi",
    effect: "+2 CA",
    type: "buff",
    icon: "shield-plus",
    color: "emerald"
  },
  {
    id: "resistance",
    name: "Résistance",
    effect: "+1d4 à un jet de sauvegarde (une fois)",
    type: "buff",
    icon: "heart-pulse",
    color: "emerald"
  },
  {
    id: "aide",
    name: "Aide",
    effect: "+5 PV max pendant 8h",
    type: "buff",
    icon: "heart",
    color: "emerald"
  },
  {
    id: "armure-mage",
    name: "Armure du Mage",
    effect: "CA = 13 + mod. DEX",
    type: "buff",
    icon: "shirt",
    color: "cyan"
  },
  {
    id: "peau-ecorce",
    name: "Peau d'Écorce",
    effect: "CA minimum 16",
    type: "buff",
    icon: "tree-deciduous",
    color: "lime"
  },
  {
    id: "faveur-divine",
    name: "Faveur Divine",
    effect: "+1d4 dégâts radiants aux attaques",
    type: "buff",
    icon: "sun",
    color: "amber"
  },
  {
    id: "agrandissement",
    name: "Agrandissement",
    effect: "Taille x2, avantage FOR, +1d4 dégâts armes",
    type: "buff",
    icon: "maximize-2",
    color: "gold"
  },
  {
    id: "protection-mal",
    name: "Protection contre le Mal",
    effect: "Désavantage des aberrations/célestes/fiélons/etc.",
    type: "buff",
    icon: "shield-check",
    color: "sky"
  },
  {
    id: "vol",
    name: "Vol",
    effect: "Vitesse de vol 18m",
    type: "buff",
    icon: "wind",
    color: "sky"
  },
  {
    id: "inspiration-bardique",
    name: "Inspiration Bardique",
    effect: "+1d6/d8/d10/d12 à un jet (une fois)",
    type: "buff",
    icon: "music",
    color: "violet"
  },

  // === DEBUFFS (purple/red/rose colors) ===
  {
    id: "fleau",
    name: "Fléau",
    effect: "-1d4 aux jets d'attaque et de sauvegarde",
    type: "debuff",
    icon: "cloud",
    color: "purple"
  },
  {
    id: "lenteur",
    name: "Lenteur",
    effect: "Vitesse /2, -2 CA et DEX, pas de réaction",
    type: "debuff",
    icon: "snail",
    color: "purple"
  },
  {
    id: "malediction",
    name: "Malédiction",
    effect: "Désavantage aux jets d'attaque et sauvegardes",
    type: "debuff",
    icon: "skull",
    color: "red"
  },
  {
    id: "rapetissement",
    name: "Rapetissement",
    effect: "Taille /2, désavantage FOR, -1d4 dégâts armes",
    type: "debuff",
    icon: "minimize-2",
    color: "purple"
  },
  {
    id: "rayon-affaiblissant",
    name: "Rayon Affaiblissant",
    effect: "Dégâts /2 pour attaques basées sur FOR",
    type: "debuff",
    icon: "zap-off",
    color: "rose"
  },
  {
    id: "marque-chasseur",
    name: "Marque du Chasseur",
    effect: "+1d6 dégâts de l'attaquant contre cible",
    type: "debuff",
    icon: "crosshair",
    color: "orange"
  },
  {
    id: "lueur-feerique",
    name: "Lueur Féerique",
    effect: "Ne peut être invisible, avantage contre cible",
    type: "debuff",
    icon: "sparkle",
    color: "violet"
  },
  {
    id: "immobilisation",
    name: "Immobilisation de Personne",
    effect: "Paralysé (humanoïde uniquement)",
    type: "debuff",
    icon: "lock",
    color: "red"
  },
  {
    id: "cecite",
    name: "Cécité/Surdité",
    effect: "Aveuglé ou assourdi",
    type: "debuff",
    icon: "eye-off",
    color: "rose"
  },
  {
    id: "couronne-folie",
    name: "Couronne de Folie",
    effect: "Doit attaquer une créature au choix du lanceur",
    type: "debuff",
    icon: "crown",
    color: "purple"
  },
  {
    id: "projectile-magique",
    name: "Projectile Magique (marqué)",
    effect: "Dégâts automatiques 1d4+1 force par projectile",
    type: "debuff",
    icon: "target",
    color: "indigo"
  },
]

// Buff color classes for Tailwind (distinct colors for buffs/debuffs)
export const BUFF_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  // Buff colors (greens/golds)
  emerald: { bg: "bg-emerald-500/20", border: "border-emerald-500/50", text: "text-emerald-500" },
  gold: { bg: "bg-yellow-500/20", border: "border-yellow-500/50", text: "text-yellow-500" },
  lime: { bg: "bg-lime-500/20", border: "border-lime-500/50", text: "text-lime-500" },
  cyan: { bg: "bg-cyan-500/20", border: "border-cyan-500/50", text: "text-cyan-400" },
  sky: { bg: "bg-sky-500/20", border: "border-sky-500/50", text: "text-sky-400" },
  amber: { bg: "bg-amber-500/20", border: "border-amber-500/50", text: "text-amber-500" },
  // Debuff colors (purples/reds)
  purple: { bg: "bg-purple-500/20", border: "border-purple-500/50", text: "text-purple-500" },
  violet: { bg: "bg-violet-500/20", border: "border-violet-500/50", text: "text-violet-500" },
  rose: { bg: "bg-rose-500/20", border: "border-rose-500/50", text: "text-rose-500" },
  red: { bg: "bg-red-500/20", border: "border-red-500/50", text: "text-red-500" },
  orange: { bg: "bg-orange-500/20", border: "border-orange-500/50", text: "text-orange-500" },
  indigo: { bg: "bg-indigo-500/20", border: "border-indigo-500/50", text: "text-indigo-500" },
  gray: { bg: "bg-gray-500/20", border: "border-gray-500/50", text: "text-gray-400" },
}

// Helper to get buff by ID
export const getBuffById = (id: string): Buff | undefined => {
  return BUFFS.find(b => b.id === id)
}

// Helper to get buffs by type
export const getBuffsByType = (type: BuffType): Buff[] => {
  return BUFFS.filter(b => b.type === type)
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

/**
 * Get compatible equipment slots from a catalog item's properties.
 * The equipment_slot is set during Notion sync based on source_database and Type field.
 */
export function getSlotTypesFromCatalog(catalogItem: CatalogItem): EquipmentSlot[] {
  const slot = catalogItem.properties?.equipment_slot as string | undefined;

  if (!slot) return [];

  switch (slot) {
    case 'weapon':
      return ['main-hand', 'off-hand'];
    case 'armor':
      return ['armor'];
    case 'shield':
      return ['shield'];
    case 'ring':
      return ['ring-1', 'ring-2'];
    case 'amulet':
      return ['amulet'];
    case 'gloves':
      return ['gloves'];
    case 'boots':
      return ['boots'];
    default:
      return [];
  }
}

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

// ============================================
// Spell Catalog Types (for Notion sync)
// ============================================

export interface CatalogSpell {
  id: number;
  notion_id: string;
  name: string;
  level: number;                    // 0 = cantrip, 1-9 = spell levels
  school: string | null;            // École de magie (Évocation, Abjuration, etc.)
  classes: string[];                // ['Magicien', 'Sorcier', 'Barde']
  casting_time: string | null;      // Temps d'incantation
  range: string | null;             // Portée
  duration: string | null;          // Durée
  components: string | null;        // V, S, M
  material_details: string | null;  // Détails des composantes matérielles
  concentration: boolean;
  description: string | null;
  higher_levels: string | null;     // At higher levels
  saving_throw: string | null;      // Jet de sauvegarde (FOR, DEX, CON, INT, SAG, CHA)
  created_at: string;
  updated_at: string;
}

// For creating/updating spells (without id and timestamps)
export type CatalogSpellInput = Omit<CatalogSpell, 'id' | 'created_at' | 'updated_at'>;

export interface SpellSyncPreview {
  toAdd: CatalogSpellInput[];
  toUpdate: { existing: CatalogSpell; updated: CatalogSpellInput; changes: string[] }[];
  toDelete: CatalogSpell[];
  unchanged: number;
}

export interface SpellSyncResult {
  success: boolean;
  added: number;
  updated: number;
  deleted: number;
  errors: string[];
}

// Prepared spell on a character
export interface PreparedSpell {
  id: number;
  character_id: string;
  campaign_id: number;
  spell_id: number;
  is_always_prepared: boolean;
  spell?: CatalogSpell;             // Joined spell data
}

// ============================================
// Loot Distribution System Types
// ============================================

export type LootSessionStatus = 'draft' | 'claiming' | 'resolving' | 'completed' | 'cancelled';
export type LootItemType = 'weapon' | 'armor' | 'potion' | 'scroll' | 'wondrous' | 'currency' | 'misc';
export type LootItemRarity = 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary' | 'artifact';
export type LootItemStatus = 'unclaimed' | 'contested' | 'assigned' | 'treasury' | 'sold';
export type CurrencySplitMethod = 'equal' | 'manual';

// Loot currency (all D&D 5e currencies)
export interface LootCurrency {
  platinum: number;  // pp (pièces de platine)
  gold: number;      // po (pièces d'or)
  electrum: number;  // pe (pièces d'électrum)
  silver: number;    // pa (pièces d'argent)
  copper: number;    // pc (pièces de cuivre)
}

// Loot session (one per combat/event)
export interface LootSession {
  id: string;
  campaignId: number;
  status: LootSessionStatus;
  currency: LootCurrency;
  currencySplitMethod: CurrencySplitMethod;
  claimingDeadline?: Date;
  createdAt: Date;
  completedAt?: Date;
  items: LootItem[];
}

// Item in loot pool
export interface LootItem {
  id: string;
  sessionId: string;
  catalogNotionId?: string;      // Reference to item_catalog
  name: string;
  description?: string;
  itemType: LootItemType;
  rarity: LootItemRarity;
  quantity: number;
  isIdentified: boolean;
  estimatedValueGp?: number;
  status: LootItemStatus;
  assignedTo?: string;           // Character ID
  assignedToName?: string;       // Denormalized for display
  claims: LootClaim[];
  createdAt: Date;
  resolvedAt?: Date;
  // For scrolls (parchemins) - linked spell information
  linkedSpell?: {
    id: number;
    name: string;
    level: number;
  };
  // For resistance potions - selected damage type
  resistanceType?: ResistanceType;
}

// Player claim on an item
export interface LootClaim {
  id: string;
  itemId: string;
  characterId: string;
  characterName: string;         // Denormalized for display
  priority: 1 | 2 | 3;           // 1 = want, 2 = really want, 3 = NEED
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Final distribution per character
export interface LootDistribution {
  id: string;
  sessionId: string;
  characterId: string;
  characterName: string;
  currency: LootCurrency;
  items: Array<{
    itemId: string;
    name: string;
    quantity: number;
    rarity: LootItemRarity;
  }>;
}

// Roll-off result for contested items
export interface RollOffResult {
  itemId: string;
  itemName: string;
  rolls: Array<{
    characterId: string;
    characterName: string;
    roll: number;               // 1-20
  }>;
  winnerId: string;
  winnerName: string;
}

// ============================================
// Saving Throw Types (for group saves)
// ============================================

export const SAVING_THROW_TYPES = {
  FOR: { label: 'Force', abbr: 'FOR' },
  DEX: { label: 'Dextérité', abbr: 'DEX' },
  CON: { label: 'Constitution', abbr: 'CON' },
  INT: { label: 'Intelligence', abbr: 'INT' },
  SAG: { label: 'Sagesse', abbr: 'SAG' },
  CHA: { label: 'Charisme', abbr: 'CHA' },
} as const;

export type SavingThrowType = keyof typeof SAVING_THROW_TYPES;

// Loot item type display info (French labels)
export const LOOT_ITEM_TYPES: Record<LootItemType, { label: string; icon: string }> = {
  weapon: { label: 'Arme', icon: 'sword' },
  armor: { label: 'Armure', icon: 'shield' },
  potion: { label: 'Potion', icon: 'flask-conical' },
  scroll: { label: 'Parchemin', icon: 'scroll' },
  wondrous: { label: 'Objet merveilleux', icon: 'sparkles' },
  currency: { label: 'Monnaie', icon: 'coins' },
  misc: { label: 'Divers', icon: 'package' },
};

// Loot rarity display info (French labels + colors)
export const LOOT_RARITIES: Record<LootItemRarity, { label: string; color: string; bgColor: string; borderColor: string }> = {
  common: { label: 'Commun', color: 'text-gray-400', bgColor: 'bg-gray-500/20', borderColor: 'border-gray-500/50' },
  uncommon: { label: 'Peu commun', color: 'text-green-400', bgColor: 'bg-green-500/20', borderColor: 'border-green-500/50' },
  rare: { label: 'Rare', color: 'text-blue-400', bgColor: 'bg-blue-500/20', borderColor: 'border-blue-500/50' },
  very_rare: { label: 'Très rare', color: 'text-purple-400', bgColor: 'bg-purple-500/20', borderColor: 'border-purple-500/50' },
  legendary: { label: 'Légendaire', color: 'text-orange-400', bgColor: 'bg-orange-500/20', borderColor: 'border-orange-500/50' },
  artifact: { label: 'Artefact', color: 'text-red-400', bgColor: 'bg-red-500/20', borderColor: 'border-red-500/50' },
};

// Loot status display info (French labels + colors)
export const LOOT_STATUSES: Record<LootItemStatus, { label: string; icon: string; color: string }> = {
  unclaimed: { label: 'Non réclamé', icon: 'circle-dashed', color: 'text-gray-400' },
  contested: { label: 'Contesté', icon: 'flame', color: 'text-orange-400' },
  assigned: { label: 'Attribué', icon: 'check-circle', color: 'text-green-400' },
  treasury: { label: 'Trésor commun', icon: 'landmark', color: 'text-amber-400' },
  sold: { label: 'Vendu', icon: 'coins', color: 'text-yellow-400' },
};
