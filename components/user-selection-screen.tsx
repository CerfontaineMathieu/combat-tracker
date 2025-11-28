"use client"

import { useState, useEffect } from "react"
import { Crown, User, Heart, Shield, Loader2, Check, Lock } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface CharacterInfo {
  id: number
  name: string
  class: string
  level: number
  current_hp: number
  max_hp: number
  ac: number
  initiative: number
  conditions: string[]
}

interface UserSelectionScreenProps {
  campaignId: number
  onSelectMJ: (password: string) => void
  onSelectPlayers: (characters: CharacterInfo[]) => void
  dmError?: string | null
  dmLoading?: boolean
}

export function UserSelectionScreen({ campaignId, onSelectMJ, onSelectPlayers, dmError, dmLoading }: UserSelectionScreenProps) {
  const [characters, setCharacters] = useState<CharacterInfo[]>([])
  const [selectedCharacters, setSelectedCharacters] = useState<CharacterInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [password, setPassword] = useState("")

  useEffect(() => {
    async function fetchCharacters() {
      try {
        setLoading(true)
        const response = await fetch(`/api/campaigns/${campaignId}/characters`)
        if (response.ok) {
          const data = await response.json()
          setCharacters(data)
        } else {
          setError("Impossible de charger les personnages")
        }
      } catch {
        setError("Erreur de connexion")
      } finally {
        setLoading(false)
      }
    }
    fetchCharacters()
  }, [campaignId])

  const getHpColor = (current: number, max: number) => {
    const ratio = current / max
    if (ratio > 0.5) return "text-emerald"
    if (ratio > 0.25) return "text-gold"
    return "text-crimson"
  }

  const toggleCharacterSelection = (character: CharacterInfo) => {
    setSelectedCharacters(prev => {
      const isSelected = prev.some(c => c.id === character.id)
      if (isSelected) {
        return prev.filter(c => c.id !== character.id)
      } else {
        return [...prev, character]
      }
    })
  }

  const handleConfirmPlayers = () => {
    if (selectedCharacters.length > 0) {
      onSelectPlayers(selectedCharacters)
    }
  }

  const handleMJClick = () => {
    setShowPasswordDialog(true)
    setPassword("")
  }

  const handlePasswordSubmit = () => {
    if (password.trim()) {
      onSelectMJ(password)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gold">D&D Combat Tracker</h1>
          <p className="text-muted-foreground">Qui êtes-vous ?</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* MJ Option */}
          <Card
            className="cursor-pointer transition-all hover:border-gold hover:bg-gold/5 group"
            onClick={handleMJClick}
          >
            <CardHeader className="text-center pb-2">
              <div className="flex justify-center mb-2">
                <div className="p-4 bg-gold/10 rounded-full group-hover:bg-gold/20 transition-colors">
                  <Crown className="w-10 h-10 text-gold" />
                </div>
              </div>
              <CardTitle className="text-xl text-gold">Maître du Jeu</CardTitle>
              <CardDescription>
                Gérez le combat, les monstres et les PNJ
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button
                className="w-full bg-gold hover:bg-gold/80 text-background"
                size="lg"
              >
                Entrer en tant que MJ
              </Button>
            </CardContent>
          </Card>

          {/* Players Option */}
          <Card className="flex flex-col">
            <CardHeader className="text-center pb-2">
              <div className="flex justify-center mb-2">
                <div className="p-4 bg-secondary/50 rounded-full">
                  <User className="w-10 h-10 text-foreground" />
                </div>
              </div>
              <CardTitle className="text-xl">Joueur(s)</CardTitle>
              <CardDescription>
                Sélectionnez un ou plusieurs personnages
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pt-0">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : error ? (
                <div className="text-center text-crimson py-4">{error}</div>
              ) : characters.length === 0 ? (
                <div className="text-center text-muted-foreground py-4">
                  <User className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Aucun personnage disponible</p>
                </div>
              ) : (
                <>
                  <ScrollArea className="h-[200px] pr-2">
                    <div className="space-y-2">
                      {characters.map((character) => {
                        const isSelected = selectedCharacters.some(c => c.id === character.id)
                        return (
                          <div
                            key={character.id}
                            onClick={() => toggleCharacterSelection(character)}
                            className={cn(
                              "p-3 rounded-lg border-2 cursor-pointer transition-all",
                              "hover:bg-secondary/50",
                              isSelected
                                ? "border-emerald bg-emerald/10"
                                : "border-border bg-secondary/30 hover:border-foreground/30"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className={cn(
                                  "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                                  isSelected
                                    ? "border-emerald bg-emerald"
                                    : "border-muted-foreground"
                                )}>
                                  {isSelected && <Check className="w-3 h-3 text-background" />}
                                </div>
                                <div>
                                  <h3 className="font-semibold">{character.name}</h3>
                                  <p className="text-xs text-muted-foreground">
                                    {character.class} Niveau {character.level}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <div className="flex items-center gap-1">
                                  <Heart className={cn("w-3 h-3", getHpColor(character.current_hp, character.max_hp))} />
                                  <span className={getHpColor(character.current_hp, character.max_hp)}>
                                    {character.current_hp}/{character.max_hp}
                                  </span>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  <Shield className="w-3 h-3 mr-1" />
                                  {character.ac}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </ScrollArea>
                  <Button
                    onClick={handleConfirmPlayers}
                    disabled={selectedCharacters.length === 0}
                    className="w-full mt-3"
                    size="lg"
                  >
                    {selectedCharacters.length === 0
                      ? "Sélectionnez au moins un personnage"
                      : selectedCharacters.length === 1
                        ? `Jouer avec ${selectedCharacters[0].name}`
                        : `Jouer avec ${selectedCharacters.length} personnages`
                    }
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-gold flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Connexion Maître du Jeu
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">
                Mot de passe
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                placeholder="Entrez le mot de passe..."
                className="bg-background"
                autoFocus
              />
            </div>
            {dmError && (
              <p className="text-sm text-crimson">{dmError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowPasswordDialog(false)}>
              Annuler
            </Button>
            <Button
              onClick={handlePasswordSubmit}
              disabled={!password.trim() || dmLoading}
              className="bg-gold hover:bg-gold/80 text-background"
            >
              {dmLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Connexion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
