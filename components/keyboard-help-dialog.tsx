'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@/components/ui/command'
import { SHORTCUTS, CATEGORY_LABELS } from '@/lib/keyboard/shortcuts'
import type { ShortcutCategory, ShortcutDefinition } from '@/lib/keyboard/types'
import { Keyboard } from 'lucide-react'
import { useMemo } from 'react'

interface KeyboardHelpDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'mj' | 'joueur'
  combatActive: boolean
}

function formatKey(keys: string): string {
  return keys
    .split('+')
    .map((k) => {
      if (k === 'alt') return '⌥'
      if (k === 'ctrl') return '⌃'
      if (k === 'shift') return '⇧'
      if (k === 'space') return '␣'
      return k.toUpperCase()
    })
    .join(' ')
}

export function KeyboardHelpDialog({
  open,
  onOpenChange,
  mode,
  combatActive,
}: KeyboardHelpDialogProps) {

  // Filter shortcuts based on current context
  const availableShortcuts = useMemo(() => {
    return SHORTCUTS.filter((s) => {
      if (s.dmOnly && mode !== 'mj') return false
      if (s.playerOnly && mode !== 'joueur') return false
      return true
    })
  }, [mode])

  // Group shortcuts by category
  const groupedShortcuts = useMemo(() => {
    return availableShortcuts.reduce(
      (acc, s) => {
        if (!acc[s.category]) acc[s.category] = []
        acc[s.category].push(s)
        return acc
      },
      {} as Record<ShortcutCategory, ShortcutDefinition[]>
    )
  }, [availableShortcuts])

  // Category order
  const categoryOrder: ShortcutCategory[] = [
    'combat',
    'hp',
    'dialogs',
    'navigation',
    'player',
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            Raccourcis Clavier
          </DialogTitle>
        </DialogHeader>
        <Command className="border rounded-lg">
          <CommandInput placeholder="Rechercher un raccourci..." />
          <CommandList className="max-h-[50vh]">
            <CommandEmpty>Aucun raccourci trouvé.</CommandEmpty>
            {categoryOrder.map((category) => {
              const items = groupedShortcuts[category]
              if (!items || items.length === 0) return null

              return (
                <CommandGroup key={category} heading={CATEGORY_LABELS[category]}>
                  {items.map((shortcut) => {
                    // Check if shortcut is currently active
                    const isActive =
                      (!shortcut.requiresCombat || combatActive) &&
                      (!shortcut.requiresNoCombat || !combatActive)

                    return (
                      <CommandItem
                        key={shortcut.id}
                        className="flex justify-between"
                        disabled={!isActive}
                      >
                        <span
                          className={!isActive ? 'text-muted-foreground' : ''}
                        >
                          {shortcut.description}
                        </span>
                        <CommandShortcut className="bg-muted px-2 py-0.5 rounded text-xs font-mono">
                          {formatKey(shortcut.keys)}
                        </CommandShortcut>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              )
            })}
          </CommandList>
        </Command>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Les raccourcis grisés ne sont pas disponibles dans le contexte actuel
        </p>
      </DialogContent>
    </Dialog>
  )
}
