"use client"

import { Users, Swords, Skull, BookOpen } from "lucide-react"
import { cn } from "@/lib/utils"

export type MobileTab = "players" | "combat" | "bestiary"

interface MobileNavProps {
  activeTab: MobileTab
  onTabChange: (tab: MobileTab) => void
  onNotesClick: () => void
  mode: "mj" | "joueur"
}

export function MobileNav({ activeTab, onTabChange, onNotesClick, mode }: MobileNavProps) {
  const allTabs = [
    { id: "players" as const, label: "Groupe", icon: Users },
    { id: "combat" as const, label: "Combat", icon: Swords },
    { id: "bestiary" as const, label: "Bestiaire", icon: Skull },
  ]

  // Filter out bestiary tab for players
  const tabs = mode === "mj" ? allTabs : allTabs.filter(tab => tab.id !== "bestiary")

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border safe-area-bottom md:hidden"
      role="tablist"
      aria-label="Navigation principale"
    >
      <div className="flex items-center justify-around h-16 px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`${tab.id}-panel`}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex flex-col items-center justify-center w-16 h-12 rounded-lg transition-smooth touch-target",
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

        {/* Quick Action Button */}
        <button
          onClick={onNotesClick}
          className="flex flex-col items-center justify-center w-12 h-12 rounded-lg text-muted-foreground hover:text-gold active:scale-95 transition-smooth touch-target"
          aria-label="Notes"
        >
          <BookOpen className="w-5 h-5" />
        </button>
      </div>
    </nav>
  )
}
