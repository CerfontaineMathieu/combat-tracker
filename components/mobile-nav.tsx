"use client"

import Link from "next/link"
import { Users, Swords, Map, Settings2, Database } from "lucide-react"
import { cn } from "@/lib/utils"

export type MobileTab = "players" | "combat" | "setup" | "bestiary"

interface MobileNavProps {
  activeTab?: MobileTab
  onTabChange?: (tab: MobileTab) => void
  mode: "mj" | "joueur"
  currentPage?: "home" | "map"
  combatActive?: boolean
}

export function MobileNav({ activeTab, onTabChange, mode, currentPage = "home", combatActive = false }: MobileNavProps) {
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
          const isActive = currentPage === "home" && activeTab === tab.id

          // On map page, tabs link back to home
          if (currentPage === "map") {
            return (
              <Link
                key={tab.id}
                href="/"
                className={cn(
                  "flex flex-col items-center justify-center flex-1 min-w-0 h-12 rounded-lg transition-smooth touch-target",
                  "text-muted-foreground hover:text-foreground active:scale-95"
                )}
              >
                <Icon className="w-5 h-5 mb-0.5" />
                <span className="text-xs font-medium">{tab.label}</span>
              </Link>
            )
          }

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

        {/* Map link - for all users */}
        <Link
          href="/map"
          className={cn(
            "flex flex-col items-center justify-center flex-1 min-w-0 h-12 rounded-lg transition-smooth touch-target",
            currentPage === "map"
              ? "text-gold bg-gold/10"
              : "text-muted-foreground hover:text-emerald active:scale-95"
          )}
          aria-label="Carte"
        >
          <Map className={cn("w-5 h-5 mb-0.5", currentPage === "map" && "animate-scale-in")} />
          <span className="text-xs font-medium">Carte</span>
        </Link>
      </div>
    </nav>
  )
}
