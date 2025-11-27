"use client"

import Image from "next/image"
import { Shield, Heart, Zap, Swords, Star, BookOpen } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { DbMonster } from "@/lib/types"

interface MonsterDetailProps {
  monster: DbMonster
}

function formatMod(mod: number | null): string {
  if (mod === null) return "+0"
  return mod >= 0 ? `+${mod}` : `${mod}`
}

function AbilityScore({ label, score, mod }: { label: string; score: number | null; mod: number | null }) {
  return (
    <div className="text-center">
      <div className="text-xs text-muted-foreground uppercase">{label}</div>
      <div className="text-lg font-bold">{score ?? "-"}</div>
      <div className="text-sm text-gold">{formatMod(mod)}</div>
    </div>
  )
}

export function MonsterDetail({ monster }: MonsterDetailProps) {
  const sizeLabels: Record<string, string> = {
    TP: "Très petit",
    P: "Petit",
    M: "Moyen",
    G: "Grand",
    TG: "Très grand",
    Gig: "Gigantesque",
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-1">
        {/* Header with image - prefer ai_generated, fallback to image_url */}
        <div className="flex gap-4">
          {(monster.ai_generated || monster.image_url) && (
            <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-border shrink-0">
              <Image
                src={monster.ai_generated || monster.image_url || ""}
                alt={monster.name}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          )}
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gold">{monster.name}</h2>
            <p className="text-sm text-muted-foreground">
              {sizeLabels[monster.size || ""] || monster.size} {monster.creature_type}
            </p>
            {monster.challenge_rating_xp && (
              <Badge variant="outline" className="mt-1 border-crimson/50 text-crimson">
                {monster.challenge_rating_xp} XP
              </Badge>
            )}
          </div>
        </div>

        {/* Combat Stats */}
        <Card className="bg-secondary/30 border-border/50">
          <CardContent className="p-3">
            <div className="flex justify-around">
              <div className="text-center">
                <Shield className="w-5 h-5 mx-auto text-gold" />
                <div className="text-lg font-bold">{monster.armor_class ?? "-"}</div>
                <div className="text-xs text-muted-foreground">CA</div>
              </div>
              <div className="text-center">
                <Heart className="w-5 h-5 mx-auto text-crimson" />
                <div className="text-lg font-bold">{monster.hit_points ?? "-"}</div>
                <div className="text-xs text-muted-foreground">PV</div>
              </div>
              <div className="text-center">
                <Zap className="w-5 h-5 mx-auto text-emerald" />
                <div className="text-lg font-bold">{monster.speed ?? "-"}</div>
                <div className="text-xs text-muted-foreground">Vitesse</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ability Scores */}
        <Card className="bg-secondary/30 border-border/50">
          <CardContent className="p-3">
            <div className="grid grid-cols-6 gap-2">
              <AbilityScore label="FOR" score={monster.strength} mod={monster.strength_mod} />
              <AbilityScore label="DEX" score={monster.dexterity} mod={monster.dexterity_mod} />
              <AbilityScore label="CON" score={monster.constitution} mod={monster.constitution_mod} />
              <AbilityScore label="INT" score={monster.intelligence} mod={monster.intelligence_mod} />
              <AbilityScore label="SAG" score={monster.wisdom} mod={monster.wisdom_mod} />
              <AbilityScore label="CHA" score={monster.charisma} mod={monster.charisma_mod} />
            </div>
          </CardContent>
        </Card>

        {/* Traits */}
        {monster.traits && (
          <div className="space-y-2">
            {monster.traits.skills?.length > 0 && (
              <div className="text-sm">
                <span className="font-semibold text-gold">Compétences: </span>
                <span className="text-muted-foreground">{monster.traits.skills.join(", ")}</span>
              </div>
            )}
            {monster.traits.senses?.length > 0 && (
              <div className="text-sm">
                <span className="font-semibold text-gold">Sens: </span>
                <span className="text-muted-foreground">{monster.traits.senses.join(", ")}</span>
              </div>
            )}
            {monster.traits.languages?.length > 0 && (
              <div className="text-sm">
                <span className="font-semibold text-gold">Langues: </span>
                <span className="text-muted-foreground">{monster.traits.languages.join(", ")}</span>
              </div>
            )}
            {monster.traits.damage_resistances?.length > 0 && (
              <div className="text-sm">
                <span className="font-semibold text-emerald">Résistances: </span>
                <span className="text-muted-foreground">{monster.traits.damage_resistances.join(", ")}</span>
              </div>
            )}
            {monster.traits.damage_immunities?.length > 0 && (
              <div className="text-sm">
                <span className="font-semibold text-emerald">Immunités (dégâts): </span>
                <span className="text-muted-foreground">{monster.traits.damage_immunities.join(", ")}</span>
              </div>
            )}
            {monster.traits.condition_immunities?.length > 0 && (
              <div className="text-sm">
                <span className="font-semibold text-emerald">Immunités (états): </span>
                <span className="text-muted-foreground">{monster.traits.condition_immunities.join(", ")}</span>
              </div>
            )}
          </div>
        )}

        {/* Special Abilities */}
        {monster.traits?.special_abilities?.length > 0 && (
          <>
            <Separator />
            <div>
              <h3 className="font-semibold text-gold flex items-center gap-2 mb-2">
                <Star className="w-4 h-4" />
                Capacités spéciales
              </h3>
              <div className="space-y-2">
                {monster.traits.special_abilities.map((ability, idx) => (
                  <div key={idx} className="text-sm">
                    <span className="font-medium">{ability.name}. </span>
                    <span className="text-muted-foreground">{ability.description}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Actions */}
        {monster.actions?.length > 0 && (
          <>
            <Separator />
            <div>
              <h3 className="font-semibold text-crimson flex items-center gap-2 mb-2">
                <Swords className="w-4 h-4" />
                Actions
              </h3>
              <div className="space-y-2">
                {monster.actions.map((action, idx) => (
                  <div key={idx} className="text-sm">
                    <span className="font-medium">{action.name}. </span>
                    <span className="text-muted-foreground">{action.description}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Legendary Actions */}
        {monster.legendary_actions?.length > 0 && (
          <>
            <Separator />
            <div>
              <h3 className="font-semibold text-purple-400 flex items-center gap-2 mb-2">
                <BookOpen className="w-4 h-4" />
                Actions légendaires
              </h3>
              <div className="space-y-2">
                {monster.legendary_actions.map((action, idx) => (
                  <div key={idx} className="text-sm">
                    <span className="font-medium">{action.name}</span>
                    {action.cost > 1 && (
                      <span className="text-purple-400"> (coûte {action.cost} actions)</span>
                    )}
                    <span className="font-medium">. </span>
                    <span className="text-muted-foreground">{action.description}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </ScrollArea>
  )
}
