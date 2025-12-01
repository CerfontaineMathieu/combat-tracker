import { Howl } from 'howler'

// Sound definitions - easy to add more later
const soundDefinitions = {
  critFail: '/sounds/crit-fail.mp3',
  critSuccess: '/sounds/crit-success.mp3',
  // Future sounds:
  // combatStart: '/sounds/combat-start.mp3',
  // victory: '/sounds/victory.mp3',
} as const

type SoundName = keyof typeof soundDefinitions

// Lazy-load sounds on first use (client-side only)
let sounds: Record<SoundName, Howl> | null = null

function initSounds() {
  if (typeof window === 'undefined') return null
  if (sounds) return sounds

  sounds = {} as Record<SoundName, Howl>
  for (const [name, src] of Object.entries(soundDefinitions)) {
    sounds[name as SoundName] = new Howl({
      src: [src],
      preload: true,
      volume: 0.7,
    })
  }
  return sounds
}

export function playSound(name: SoundName) {
  if (typeof window === 'undefined') return
  if (localStorage.getItem('sounds-muted') === 'true') return

  const soundsObj = initSounds()
  soundsObj?.[name]?.play()
}

export function isSoundMuted(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem('sounds-muted') === 'true'
}

export function setSoundMuted(muted: boolean) {
  localStorage.setItem('sounds-muted', String(muted))
}
