"use client"

import { Users, Swords, Settings2, Database, BookOpen } from "lucide-react"
import { cn } from "@/lib/utils"

export type MobileTab = "players" | "combat" | "setup" | "bestiary" | "spellbook"

interface MobileNavProps {
  activeTab?: MobileTab
  onTabChange?: (tab: MobileTab) => void
  mode: "mj" | "joueur"
  combatActive?: boolean
}

export function MobileNav({ activeTab, onTabChange, mode, combatActive = false }: MobileNavProps) {
  // DM tabs depend on combat state
  const dmTabs = combatActive
    ? [
        { id: "combat" as const, label: "Combat", icon: Swords },
        { id: "bestiary" as const, label: "Monstres", icon: Database },
        { id: "players" as const, label: "Groupe", icon: Users },
      ]
    : [
        { id: "setup" as const, label: "Préparer", icon: Settings2 },
        { id: "bestiary" as const, label: "Monstres", icon: Database },
        { id: "players" as const, label: "Groupe", icon: Users },
      ]

  const playerTabs = [
    { id: "players" as const, label: "Perso", icon: Users },
    { id: "spellbook" as const, label: "Sorts", icon: BookOpen },
    { id: "combat" as const, label: "Combat", icon: Swords },
  ]

  const tabs = mode === "mj" ? dmTabs : playerTabs

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border safe-area-bottom md:hidden"
      role="tablist"
      aria-label="Navigation principale"
    >
      <div className="flex items-center justify-around h-16 px-4" style={{ paddingLeft: 'max(1rem, env(safe-area-inset-left))', paddingRight: 'max(1rem, env(safe-area-inset-right))' }}>
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`${tab.id}-panel`}
              onClick={() => onTabChange?.(tab.id)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 min-w-0 h-12 rounded-lg transition-smooth touch-target",
                isActive
                  ? "text-gold bg-gold/10"
                  : "text-muted-foreground hover:text-foreground active:scale-95"
              )}
            >
              <Icon className={cn("w-5 h-5 mb-0.5", isActive && "animate-scale-in")} />
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
