"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useSocketContext } from "@/lib/socket-context"
import { Header } from "@/components/header"
import { MobileNav } from "@/components/mobile-nav"

// Dynamic import to avoid SSR issues with MapLibre
const FaerunMap = dynamic(
  () => import("@/components/faerun-map").then((mod) => mod.FaerunMap),
  { ssr: false }
)

const DEFAULT_CAMPAIGN_ID = 1

interface CharacterToAdd {
  odNumber: string | number
  name: string
}

export default function MapPage() {
  const router = useRouter()
  const { state: socketState, leaveCampaign } = useSocketContext()
  const [mode, setMode] = useState<"mj" | "joueur" | null>(null)
  const [charactersToAdd, setCharactersToAdd] = useState<CharacterToAdd[]>([])
  const [playerCharacterIds, setPlayerCharacterIds] = useState<(string | number)[]>([])
  const [selectedCharacterNames, setSelectedCharacterNames] = useState("")

  // Get connected players from socket context
  const connectedPlayers = socketState.connectedPlayers

  // Get mode and player's characters from storage on mount
  useEffect(() => {
    const savedMode = localStorage.getItem("combatTrackerMode")
    if (savedMode === "mj" || savedMode === "joueur") {
      setMode(savedMode)
    } else {
      // Default to player if no mode saved
      setMode("joueur")
    }

    // Get player's selected characters to center map on their position
    if (savedMode === "joueur") {
      const savedChars = sessionStorage.getItem("selectedCharacters")
      if (savedChars) {
        try {
          const chars = JSON.parse(savedChars)
          // Extract character odNumbers
          const ids = chars.map((c: { odNumber: string | number }) => c.odNumber)
          setPlayerCharacterIds(ids)
          // Get character names for header
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

  // Add player to map (DM only)
  const addPlayerToMap = (player: typeof connectedPlayers[0]) => {
    if (mode !== "mj") return

    const newChars = player.characters.map(char => ({
      odNumber: char.odNumber,
      name: char.name,
    }))

    setCharactersToAdd(prev => [...prev, ...newChars])
  }

  if (!mode) {
    return (
      <div className="fixed inset-0 w-screen h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Chargement...</div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 w-screen h-screen flex flex-col">
      <Header
        mode={mode}
        campaignName="Carte de Faerûn"
        selectedCharacterName={selectedCharacterNames}
        onSettingsClick={() => {}}
        onLogout={handleLogout}
        hideActions
      />

      {/* DM Controls Bar */}
      {mode === "mj" && (
        <div className="border-b border-border bg-card/80 backdrop-blur-sm px-4 py-2 flex items-center gap-4 flex-wrap">
          {/* Connected players */}
          {connectedPlayers.length > 0 ? (
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Joueurs:</span>
              <div className="flex gap-1 flex-wrap">
                {connectedPlayers.map(player => (
                  <Button
                    key={player.socketId}
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => addPlayerToMap(player)}
                    title="Ajouter sur la carte"
                  >
                    {player.characters.map(c => c.name).join(", ")}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="w-4 h-4" />
              <span className="text-sm">Aucun joueur connecté</span>
            </div>
          )}

          <Badge variant="outline" className="border-emerald/50 text-emerald text-xs ml-auto">
            Glissez les marqueurs pour déplacer
          </Badge>
        </div>
      )}

      {/* Map */}
      <div className="flex-1 relative pb-16 md:pb-0">
        <FaerunMap
          mode={mode}
          campaignId={DEFAULT_CAMPAIGN_ID}
          charactersToAdd={charactersToAdd}
          centerOnCharacters={playerCharacterIds}
        />
      </div>

      {/* Mobile Navigation */}
      <MobileNav mode={mode} currentPage="map" />
    </div>
  )
}
