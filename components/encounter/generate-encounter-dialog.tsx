"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Swords, RefreshCw, Trash2, Loader2, AlertTriangle, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import type { DbMonster } from "@/lib/types"
import {
  calculateDifficulty,
  getTargetXpForTier,
  DIFFICULTY_LABELS,
  DIFFICULTY_COLORS,
  type GenerationDifficultyTier,
} from "@/lib/xp-difficulty"
import {
  COMPOSITION_CONFIG,
  filterBestiaryByCreatureType,
  filterBestiaryByHabitat,
  generateEncounter,
  regenerateRow,
  type EncounterComposition,
  type GeneratedEncounterRow,
} from "@/lib/encounter-generator"

interface GenerateEncounterDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (rows: GeneratedEncounterRow[]) => void
}

const TIERS: { value: GenerationDifficultyTier }[] = [
  { value: 'low' },
  { value: 'moderate' },
  { value: 'high' },
  { value: 'deadly' },
]

const COMPOSITIONS: EncounterComposition[] = ['solo', 'duo', 'group', 'mob']

export function GenerateEncounterDialog({ isOpen, onClose, onConfirm }: GenerateEncounterDialogProps) {
  const [step, setStep] = useState<'params' | 'preview'>('params')

  const [partySize, setPartySize] = useState(4)
  const [partyLevel, setPartyLevel] = useState(1)
  const [tier, setTier] = useState<GenerationDifficultyTier>('moderate')
  const [composition, setComposition] = useState<EncounterComposition>('group')
  const [monsterCount, setMonsterCount] = useState(COMPOSITION_CONFIG.group.defaultCount)
  const [creatureTypeFilter, setCreatureTypeFilter] = useState('all')
  const [habitatFilter, setHabitatFilter] = useState('all')

  const [bestiary, setBestiary] = useState<DbMonster[]>([])
  const [bestiaryLoading, setBestiaryLoading] = useState(true)
  const [habitatOptions, setHabitatOptions] = useState<string[]>([])

  const creatureTypes = useMemo(
    () => [...new Set(bestiary.map(m => m.creature_type).filter((t): t is string => !!t))].sort(),
    [bestiary]
  )
  const [paramsError, setParamsError] = useState<string | null>(null)

  const [players, setPlayers] = useState<{ level: number }[]>([])
  const [candidates, setCandidates] = useState<DbMonster[]>([])
  const [rows, setRows] = useState<GeneratedEncounterRow[]>([])
  const [targetXp, setTargetXp] = useState(0)
  const [isBestEffort, setIsBestEffort] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    async function fetchBestiary() {
      try {
        setBestiaryLoading(true)
        const response = await fetch("/api/monsters")
        if (!response.ok) throw new Error("Failed to fetch monsters")
        const data = await response.json()
        if (!cancelled) setBestiary(data)
      } catch {
        if (!cancelled) setParamsError("Impossible de charger le bestiaire.")
      } finally {
        if (!cancelled) setBestiaryLoading(false)
      }
    }
    async function fetchHabitatOptions() {
      try {
        const response = await fetch("/api/monsters/habitats")
        if (!response.ok) throw new Error("Failed to fetch habitats")
        const data = await response.json()
        if (!cancelled) setHabitatOptions(data)
      } catch {
        // Non-critical: habitat filter simply stays empty (only "Tous les habitats")
      }
    }
    fetchBestiary()
    fetchHabitatOptions()
    return () => { cancelled = true }
  }, [isOpen])

  const handleCompositionChange = (value: EncounterComposition) => {
    setComposition(value)
    setMonsterCount(COMPOSITION_CONFIG[value].defaultCount)
  }

  const handleGenerate = () => {
    const partyPlayers = Array.from({ length: partySize }, () => ({ level: partyLevel }))
    const byType = filterBestiaryByCreatureType(bestiary, creatureTypeFilter === 'all' ? '' : creatureTypeFilter)
    const filtered = filterBestiaryByHabitat(byType, habitatFilter === 'all' ? '' : habitatFilter)
    if (filtered.length === 0) {
      setParamsError("Aucun monstre ne correspond à ces filtres de type/habitat.")
      return
    }
    setParamsError(null)
    const target = getTargetXpForTier(tier, partyPlayers)
    const result = generateEncounter({ targetXp: target, monsterCount, candidates: filtered })
    setPlayers(partyPlayers)
    setCandidates(filtered)
    setRows(result.rows)
    setTargetXp(result.targetXp)
    setIsBestEffort(result.isBestEffort)
    setStep('preview')
  }

  const handleRerollRow = (id: string) => {
    setRows(prev => prev.map(row => row.id === id ? regenerateRow(row, candidates) : row))
  }

  const handleRemoveRow = (id: string) => {
    setRows(prev => prev.filter(row => row.id !== id))
  }

  const handleConfirm = () => {
    onConfirm(rows)
    handleClose()
  }

  const handleClose = () => {
    setStep('params')
    setRows([])
    setParamsError(null)
    onClose()
  }

  const totalXp = rows.reduce((sum, row) => sum + (row.monster.challenge_rating_xp || 0), 0)
  const achievedTier = rows.length > 0 ? calculateDifficulty(totalXp, players) : null
  const anyOffTolerance = isBestEffort || rows.some(row => !row.withinTolerance)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Swords className="h-5 w-5" />
            Générer une rencontre
          </DialogTitle>
          <DialogDescription>
            Composez une rencontre équilibrée à partir du bestiaire, selon le budget XP (DMG 2024).
          </DialogDescription>
        </DialogHeader>

        {step === 'params' && (
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="party-size">Nombre de joueurs</Label>
                <Input
                  id="party-size"
                  type="number"
                  min={1}
                  max={10}
                  value={partySize}
                  onChange={(e) => setPartySize(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="party-level">Niveau moyen</Label>
                <Input
                  id="party-level"
                  type="number"
                  min={1}
                  max={20}
                  value={partyLevel}
                  onChange={(e) => setPartyLevel(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Difficulté</Label>
              <RadioGroup
                value={tier}
                onValueChange={(value) => setTier(value as GenerationDifficultyTier)}
                className="grid grid-cols-2 gap-2"
              >
                {TIERS.map((t) => (
                  <div key={t.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={t.value} id={`tier-${t.value}`} />
                    <Label htmlFor={`tier-${t.value}`} className="cursor-pointer">
                      {DIFFICULTY_LABELS[t.value]}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Composition</Label>
              <RadioGroup
                value={composition}
                onValueChange={(value) => handleCompositionChange(value as EncounterComposition)}
                className="space-y-2"
              >
                {COMPOSITIONS.map((c) => (
                  <div key={c} className="flex items-center space-x-2">
                    <RadioGroupItem value={c} id={`comp-${c}`} />
                    <Label htmlFor={`comp-${c}`} className="flex flex-col cursor-pointer">
                      <span className="font-medium">{COMPOSITION_CONFIG[c].label}</span>
                      <span className="text-xs text-muted-foreground">{COMPOSITION_CONFIG[c].description}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {COMPOSITION_CONFIG[composition].minCount !== COMPOSITION_CONFIG[composition].maxCount && (
              <div className="space-y-2">
                <Label htmlFor="monster-count">Nombre de monstres</Label>
                <Input
                  id="monster-count"
                  type="number"
                  min={COMPOSITION_CONFIG[composition].minCount}
                  max={COMPOSITION_CONFIG[composition].maxCount}
                  value={monsterCount}
                  onChange={(e) => {
                    const { minCount, maxCount } = COMPOSITION_CONFIG[composition]
                    setMonsterCount(Math.max(minCount, Math.min(maxCount, parseInt(e.target.value) || minCount)))
                  }}
                  className="w-24"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="creature-type">Type de créature</Label>
              <Select value={creatureTypeFilter} onValueChange={setCreatureTypeFilter}>
                <SelectTrigger id="creature-type" className="w-full">
                  <SelectValue placeholder="Type de créature" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  {creatureTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="habitat">Habitat</Label>
              <Select value={habitatFilter} onValueChange={setHabitatFilter}>
                <SelectTrigger id="habitat" className="w-full">
                  <SelectValue placeholder="Habitat" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les habitats</SelectItem>
                  {habitatOptions.map((habitat) => (
                    <SelectItem key={habitat} value={habitat}>{habitat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {paramsError && (
              <p className="text-sm text-destructive flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                {paramsError}
              </p>
            )}
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between rounded-md border p-3">
              <div className="text-sm">
                <div className="text-muted-foreground">Budget cible : {targetXp} XP</div>
                <div className="font-medium">Total actuel : {totalXp} XP</div>
              </div>
              {achievedTier && (
                <Badge variant="outline" className={cn("text-xs", DIFFICULTY_COLORS[achievedTier])}>
                  {DIFFICULTY_LABELS[achievedTier]}
                </Badge>
              )}
            </div>

            {(anyOffTolerance || achievedTier !== tier) && (
              <p className="text-sm text-amber-500 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Meilleur effort : le bestiaire ne contient pas de monstre proche du budget pour certains emplacements.
              </p>
            )}

            <ScrollArea className="h-72 rounded-md border">
              <div className="divide-y">
                {rows.length === 0 && (
                  <p className="p-4 text-sm text-muted-foreground">Aucun monstre dans cette rencontre.</p>
                )}
                {rows.map((row) => (
                  <div key={row.id} className="flex items-center justify-between gap-2 p-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{row.monster.name}</div>
                      <div className="text-xs text-muted-foreground">
                        PV {row.monster.hit_points ?? '?'} · CA {row.monster.armor_class ?? '?'} · {row.monster.challenge_rating_xp ?? 0} XP
                        {!row.withinTolerance && <span className="text-amber-500"> (approx.)</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => handleRerollRow(row.id)} title="Relancer">
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleRemoveRow(row.id)} title="Retirer">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === 'params' ? (
            <>
              <Button variant="outline" onClick={handleClose}>Annuler</Button>
              <Button onClick={handleGenerate} disabled={bestiaryLoading}>
                {bestiaryLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Chargement...
                  </>
                ) : (
                  <>
                    <Swords className="h-4 w-4 mr-2" />
                    Générer
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep('params')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
              <Button onClick={handleConfirm} disabled={rows.length === 0}>
                Ajouter au combat
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
