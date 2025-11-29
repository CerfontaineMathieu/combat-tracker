"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { useSocketContext } from "@/lib/socket-context"
import { Header } from "@/components/header"
import { MobileNav } from "@/components/mobile-nav"

// Dynamic import to avoid SSR issues with Three.js
const GameExperience = dynamic(
  () => import("@/components/tavern/GameExperience").then((mod) => mod.GameExperience),
  {
    ssr: false,
    loading: () => (
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#1a1a2e" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
          <div className="text-amber-200/80 text-sm">Chargement de la taverne...</div>
        </div>
      </div>
    ),
  }
)

const DEFAULT_CAMPAIGN_ID = 1

export default function TavernPage() {
  const router = useRouter()
  const { leaveCampaign } = useSocketContext()
  const [mode, setMode] = useState<"mj" | "joueur" | null>(null)
  const [selectedCharacterNames, setSelectedCharacterNames] = useState("")

  useEffect(() => {
    const savedMode = localStorage.getItem("combatTrackerMode")
    if (savedMode === "mj" || savedMode === "joueur") {
      setMode(savedMode)
    } else {
      // Default to player if no mode saved
      setMode("joueur")
    }

    // Get player's selected characters for header display
    if (savedMode === "joueur") {
      const savedChars = sessionStorage.getItem("selectedCharacters")
      if (savedChars) {
        try {
          const chars = JSON.parse(savedChars)
          const names = chars.map((c: { name: string }) => c.name).join(", ")
          setSelectedCharacterNames(names)
        } catch {
          // Ignore parse errors
        }
      }
    }
  }, [])

  const handleLogout = () => {
    leaveCampaign()
    localStorage.removeItem("combatTrackerMode")
    localStorage.removeItem("combatTrackerCharacters")
    sessionStorage.removeItem("selectedCharacters")
    router.push("/")
  }

  if (!mode) {
    return (
      <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#1a1a2e" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
          <div className="text-amber-200/80 text-sm">Chargement...</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", display: "flex", flexDirection: "column", background: "#1a1a2e" }}>
      <Header
        mode={mode}
        campaignName="Taverne"
        selectedCharacterName={selectedCharacterNames}
        onSettingsClick={() => {}}
        onLogout={handleLogout}
        hideActions
      />

      <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
        <GameExperience mode={mode} campaignId={DEFAULT_CAMPAIGN_ID} />
      </div>

      <MobileNav mode={mode} currentPage="map" />
    </div>
  )
}
