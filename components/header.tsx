"use client"

import Link from "next/link"
import { Sword, ScrollText, Settings, Skull, Crown, User, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { AmbientControls, type AmbientEffect } from "@/components/ambient-effects"

interface HeaderProps {
  mode: "mj" | "joueur"
  campaignName: string
  selectedCharacterName?: string
  onHistoryClick: () => void
  onSettingsClick: () => void
  onLogout: () => void
  hideActions?: boolean
  ambientEffect?: AmbientEffect
  onAmbientEffectChange?: (effect: AmbientEffect) => void
}

export function Header({
  mode,
  campaignName,
  selectedCharacterName,
  onHistoryClick,
  onSettingsClick,
  onLogout,
  hideActions = false,
  ambientEffect = "none",
  onAmbientEffectChange,
}: HeaderProps) {
  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40 safe-area-top">
      <div className="flex items-center justify-between px-4 py-3 gap-2">
        {/* Logo & Title */}
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/20 border border-primary/30 transition-smooth hover:bg-primary/30">
              <Sword className="w-5 h-5 text-gold" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-gold tracking-wide">Compagnon D&D</h1>
            </div>
          </Link>
          {/* Campaign name */}
          {campaignName && (
            <Badge variant="outline" className="hidden md:flex border-border text-muted-foreground">
              {campaignName}
            </Badge>
          )}
        </div>

        {/* Ambient Controls - DM only */}
        {mode === "mj" && onAmbientEffectChange && (
          <div className="hidden md:flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Ambiance:</span>
            <AmbientControls
              currentEffect={ambientEffect}
              onChangeEffect={onAmbientEffectChange}
            />
          </div>
        )}

        {/* User Info */}
        <div className="flex items-center gap-2">
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg",
            mode === "mj" ? "bg-gold/10 border border-gold/30" : "bg-secondary/50 border border-border"
          )}>
            {mode === "mj" ? (
              <>
                <Crown className="w-4 h-4 text-gold" />
                <span className="text-sm font-medium text-gold">MJ</span>
              </>
            ) : (
              <>
                <User className="w-4 h-4 text-foreground" />
                <span className="text-sm font-medium">{selectedCharacterName || "Joueur"}</span>
              </>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onLogout}
            className="h-9 w-9 hover:bg-crimson/20 hover:text-crimson transition-smooth"
            title="Changer d'utilisateur"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>

        {/* Action Buttons - Hidden on mobile when hideActions is true */}
        {!hideActions && (
          <div className="hidden md:flex items-center gap-1">
            {/* Bestiaire - MJ only */}
            {mode === "mj" && (
              <Link href="/monsters">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 hover:bg-primary/20 hover:text-crimson transition-smooth"
                  title="Bestiaire"
                >
                  <Skull className="w-5 h-5" />
                </Button>
              </Link>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onHistoryClick}
              className="h-10 w-10 hover:bg-primary/20 hover:text-gold transition-smooth"
              title="Historique du combat"
            >
              <ScrollText className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onSettingsClick}
              className="h-10 w-10 hover:bg-primary/20 hover:text-gold transition-smooth"
              title="Paramètres"
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        )}

        {/* Settings button always visible on mobile for quick access */}
        {hideActions && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onSettingsClick}
            className="h-10 w-10 hover:bg-primary/20 hover:text-gold transition-smooth md:hidden"
            title="Paramètres"
          >
            <Settings className="w-5 h-5" />
          </Button>
        )}
      </div>
    </header>
  )
}
