import { Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

interface LinkedSpellLabelProps {
  spell?: { name: string; level: number }
  className?: string
}

/** Shows which spell a scroll (parchemin) contains. Renders nothing for other items. */
export function LinkedSpellLabel({ spell, className }: LinkedSpellLabelProps) {
  if (!spell) return null
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs text-purple-400", className)}>
      <Sparkles className="w-3 h-3 shrink-0" />
      <span className="truncate">
        {spell.level === 0 ? "Tour de magie" : `Niv. ${spell.level}`} : {spell.name}
      </span>
    </span>
  )
}
