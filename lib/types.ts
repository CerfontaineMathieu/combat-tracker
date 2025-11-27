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
}

export interface DiceRoll {
  id: string
  dice: string
  result: number
  timestamp: string
  isCritical?: boolean
  isFumble?: boolean
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

// Exhaustion levels (Épuisement) - D&D 5e
export const EXHAUSTION_LEVELS = [
  { level: 1, effect: "Désavantage aux jets de caractéristique" },
  { level: 2, effect: "Vitesse réduite de moitié" },
  { level: 3, effect: "Désavantage aux jets d'attaque et de sauvegarde" },
  { level: 4, effect: "Maximum de points de vie réduit de moitié" },
  { level: 5, effect: "Vitesse réduite à 0" },
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
