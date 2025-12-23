import type { ShortcutCategory, ShortcutDefinition } from './types'

export const SHORTCUTS: ShortcutDefinition[] = [
  // Combat Flow (DM only)
  {
    id: 'start-combat',
    keys: 'alt+s',
    description: 'Commencer le combat',
    category: 'combat',
    dmOnly: true,
    requiresNoCombat: true
  },
  {
    id: 'next-turn',
    keys: 'space',
    description: 'Tour suivant',
    category: 'combat',
    dmOnly: true,
    requiresCombat: true
  },
  {
    id: 'stop-combat',
    keys: 'alt+x',
    description: 'Arrêter le combat',
    category: 'combat',
    dmOnly: true,
    requiresCombat: true
  },
  {
    id: 'randomize-initiatives',
    keys: 'alt+r',
    description: 'Lancer les initiatives',
    category: 'combat',
    dmOnly: true,
    requiresNoCombat: true
  },

  // HP Management (DM only, during combat)
  {
    id: 'damage-1',
    keys: '1',
    description: '-1 PV au participant actuel',
    category: 'hp',
    dmOnly: true,
    requiresCombat: true
  },
  {
    id: 'damage-3',
    keys: '3',
    description: '-3 PV au participant actuel',
    category: 'hp',
    dmOnly: true,
    requiresCombat: true
  },
  {
    id: 'damage-5',
    keys: '5',
    description: '-5 PV au participant actuel',
    category: 'hp',
    dmOnly: true,
    requiresCombat: true
  },
  {
    id: 'damage-10',
    keys: '0',
    description: '-10 PV au participant actuel',
    category: 'hp',
    dmOnly: true,
    requiresCombat: true
  },
  {
    id: 'heal-1',
    keys: 'alt+1',
    description: '+1 PV au participant actuel',
    category: 'hp',
    dmOnly: true,
    requiresCombat: true
  },
  {
    id: 'heal-3',
    keys: 'alt+3',
    description: '+3 PV au participant actuel',
    category: 'hp',
    dmOnly: true,
    requiresCombat: true
  },
  {
    id: 'heal-5',
    keys: 'alt+5',
    description: '+5 PV au participant actuel',
    category: 'hp',
    dmOnly: true,
    requiresCombat: true
  },
  {
    id: 'heal-10',
    keys: 'alt+0',
    description: '+10 PV au participant actuel',
    category: 'hp',
    dmOnly: true,
    requiresCombat: true
  },
  {
    id: 'open-hp-dialog',
    keys: 'h',
    description: 'Ouvrir le dialogue PV',
    category: 'hp',
    dmOnly: true,
    requiresCombat: true
  },

  // Dialogs
  {
    id: 'open-conditions',
    keys: 'c',
    description: 'Gérer les conditions',
    category: 'dialogs',
    dmOnly: true,
    requiresCombat: true
  },
  {
    id: 'open-buffs',
    keys: 'b',
    description: 'Gérer les buffs',
    category: 'dialogs',
    dmOnly: true,
    requiresCombat: true
  },
  {
    id: 'open-settings',
    keys: 'alt+,',
    description: 'Ouvrir les paramètres',
    category: 'dialogs',
    dmOnly: true
  },
  {
    id: 'open-notes',
    keys: 'alt+n',
    description: 'Ouvrir les notes',
    category: 'dialogs',
    dmOnly: true
  },
  {
    id: 'open-help',
    keys: 'shift+/',
    description: 'Afficher les raccourcis',
    category: 'dialogs'
  },

  // Navigation
  {
    id: 'nav-combat',
    keys: 'alt+1',
    description: 'Combat / Préparation',
    category: 'navigation'
  },
  {
    id: 'nav-bestiary',
    keys: 'alt+2',
    description: 'Bestiaire',
    category: 'navigation',
    dmOnly: true
  },
  {
    id: 'nav-players',
    keys: 'alt+3',
    description: 'Groupe',
    category: 'navigation'
  },
  {
    id: 'nav-loot',
    keys: 'alt+4',
    description: 'Butin',
    category: 'navigation'
  },

  // Player Mode
  {
    id: 'open-inventory',
    keys: 'i',
    description: "Ouvrir l'inventaire",
    category: 'player',
    playerOnly: true
  },
  {
    id: 'open-spellbook',
    keys: 's',
    description: 'Ouvrir le grimoire',
    category: 'player',
    playerOnly: true
  },
  {
    id: 'end-player-turn',
    keys: 'space',
    description: 'Terminer son tour',
    category: 'player',
    playerOnly: true,
    requiresCombat: true
  },
]

export const CATEGORY_LABELS: Record<ShortcutCategory, string> = {
  combat: 'Combat',
  hp: 'Points de Vie',
  dialogs: 'Dialogues',
  navigation: 'Navigation',
  player: 'Joueur',
}
