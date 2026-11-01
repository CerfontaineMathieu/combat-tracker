"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import type { CatalogItem } from "@/lib/types"

interface ItemCatalogDetailsProps {
  /** Catalog reference stored on the inventory item, if it came from the catalog */
  catalogNotionId?: string
  /** Description saved on the inventory item itself (used first, catalog as fallback) */
  description?: string
  /** Called once fresh catalog data has loaded (e.g. to update a rarity badge) */
  onCatalogLoaded?: (item: CatalogItem) => void
}

type Stat = { label: string; value: string }

function formatModifier(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`
}

/** Turn synced Notion properties into readable French stat lines. */
function buildStats(props: Record<string, unknown>): Stat[] {
  const stats: Stat[] = []
  const str = (k: string) => (typeof props[k] === "string" && props[k] ? (props[k] as string) : undefined)
  const num = (k: string) => (typeof props[k] === "number" ? (props[k] as number) : undefined)

  const baseType = str("base_type")
  if (baseType) stats.push({ label: "Type", value: baseType })

  // Weapons
  const dice = str("damage_dice")
  if (dice) {
    const type = str("damage_type")
    stats.push({ label: "Dégâts", value: type ? `${dice} ${type.toLowerCase()}` : dice })
  }
  const weaponProps = str("weapon_properties")
  if (weaponProps) stats.push({ label: "Propriétés", value: weaponProps })

  // Armor
  const ac = num("armor_ac")
  if (ac !== undefined) {
    stats.push({ label: "CA", value: props.armor_dex_bonus ? `${ac} + mod. Dex` : `${ac}` })
  }
  const strMin = num("strength_min")
  if (strMin) stats.push({ label: "Force min.", value: `${strMin}` })
  if (props.stealth_disadvantage) stats.push({ label: "Discrétion", value: "Désavantage" })

  // Magic bonus (weapons: attack & damage, armor: AC)
  const mod = num("Modificateur")
  if (mod) {
    const isArmor = props.equipment_slot === "armor" || props.equipment_slot === "shield"
    stats.push({
      label: "Bonus magique",
      value: isArmor ? `${formatModifier(mod)} à la CA` : `${formatModifier(mod)} au toucher et aux dégâts`,
    })
  }

  if (props.Harmonisation === true || props.Harmonisation === "Oui") {
    stats.push({ label: "Harmonisation", value: "Requise" })
  }

  return stats
}

export function ItemCatalogDetails({ catalogNotionId, description, onCatalogLoaded }: ItemCatalogDetailsProps) {
  const [catalogItem, setCatalogItem] = useState<CatalogItem | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setCatalogItem(null)
    if (!catalogNotionId) return

    let cancelled = false
    setLoading(true)
    fetch(`/api/items/catalog/${encodeURIComponent(catalogNotionId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.success && data.item) {
          setCatalogItem(data.item)
          onCatalogLoaded?.(data.item)
        }
      })
      .catch((error) => console.error("Error fetching catalog item:", error))
      .finally(() => !cancelled && setLoading(false))

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogNotionId])

  const props = catalogItem?.properties || {}
  const stats = buildStats(props)
  const text = description || catalogItem?.description || undefined
  const effect = typeof props.Effet === "string" && props.Effet !== text ? props.Effet : undefined

  if (loading && !text) {
    return (
      <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        Chargement des détails...
      </div>
    )
  }

  if (!text && !effect && stats.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic text-center py-2">
        Aucun détail disponible pour cet objet.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {stats.length > 0 && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 p-3 rounded-lg bg-secondary/20 border border-border/50 text-sm">
          {stats.map((s) => (
            <div key={s.label} className="contents">
              <dt className="text-muted-foreground">{s.label}</dt>
              <dd className="font-medium">{s.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {text && (
        <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
          <p className="text-sm whitespace-pre-wrap">{text}</p>
        </div>
      )}
      {effect && (
        <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
          <p className="text-xs font-medium text-muted-foreground mb-1">Effet</p>
          <p className="text-sm whitespace-pre-wrap">{effect}</p>
        </div>
      )}
    </div>
  )
}
