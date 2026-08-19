// Homebrew barbarian achievement system: "Les Titres du Berserker"
//
// Each title is a daily challenge the player marks off in play. Achieving one
// applies a matching buff through the existing buff system (see ActiveBuff in
// lib/types.ts) — achievement state is just derived from whether the
// character currently carries the matching `berserker-<id>` buff, so no
// separate persistence layer is needed beyond the buffs already stored on
// the character. All titles reset on long rest.

export interface BerserkerTitle {
  id: string
  name: string
  condition: string
  boost: string
}

// Taylan — this tracker is scoped to this one character
export const BERSERKER_TITLES_CHARACTER_ID = "3c1300de-717f-805b-b373-fec31030f88a"

export const BERSERKER_TITLES: BerserkerTitle[] = [
  {
    id: "premier-sang",
    name: "Premier Sang",
    condition: "Premier kill de la journée",
    boost: "+1 aux dégâts jusqu'au prochain long repos",
  },
  {
    id: "la-tempete",
    name: "La Tempête",
    condition: "3 kills dans le même combat",
    boost: "Rage gratuite supplémentaire",
  },
  {
    id: "sans-pitie",
    name: "Sans Pitié",
    condition: "10 kills dans la même journée",
    boost: "Avantage sur tous les jets d'intimidation jusqu'au prochain long repos",
  },
  {
    id: "la-muraille",
    name: "La Muraille",
    condition: "Utiliser sa réaction pour s'interposer à 1,5m d'un allié",
    boost: "+5 PV temporaires jusqu'au prochain long repos",
  },
  {
    id: "david-vs-goliath",
    name: "David vs Goliath",
    condition: "Tuer un ennemi physiquement plus grand",
    boost: "Avantage sur les jets d'attaque contre des ennemis plus grands jusqu'au prochain long repos",
  },
  {
    id: "la-terreur",
    name: "La Terreur",
    condition: "Faire fuir des ennemis sans porter un seul coup",
    boost: "Désavantage aux jets de résistance d'intimidation ennemis jusqu'au prochain long repos",
  },
  {
    id: "intouchable",
    name: "Intouchable",
    condition: "Terminer un combat sans prendre de dégâts",
    boost: "+2 à l'initiative jusqu'au prochain long repos",
  },
  {
    id: "la-legende",
    name: "La Légende",
    condition: "Débloquer 5 succès dans la même journée",
    boost: "1 point d'inspiration gratuit",
  },
]

export function berserkerBuffId(titleId: string): string {
  return `berserker-${titleId}`
}

// All title buffs — cleared on long rest so the next day starts fresh
export const ALL_BERSERKER_BUFF_IDS = BERSERKER_TITLES.map((t) => berserkerBuffId(t.id))
