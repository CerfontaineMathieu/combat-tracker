"use client"

import type { CombatContext } from "@/lib/ai-types"

interface AIAssistantPanelProps {
  isOpen: boolean
  onToggle: () => void
  combatContext: CombatContext
}

// Stub component - AI Assistant feature not yet implemented
export function AIAssistantPanel({ isOpen, onToggle, combatContext }: AIAssistantPanelProps) {
  // Return null when closed (floating button state)
  if (!isOpen) {
    return null
  }

  // Return empty panel when open - feature not implemented
  return (
    <div className="h-full bg-background border-l flex flex-col">
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="font-semibold">Assistant IA</h2>
        <button
          onClick={onToggle}
          className="text-muted-foreground hover:text-foreground"
        >
          &times;
        </button>
      </div>
      <div className="flex-1 p-4 flex items-center justify-center text-muted-foreground">
        <p className="text-center text-sm">
          Fonctionnalité en cours de développement
        </p>
      </div>
    </div>
  )
}
