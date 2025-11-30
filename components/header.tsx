"use client"

import { useState } from "react"
import Link from "next/link"
import { Sword, Settings, Skull, Crown, User, LogOut, Map, Sparkles, Menu, QrCode, Volume2, VolumeX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { AmbientControls, CriticalButtons, type AmbientEffect } from "@/components/ambient-effects"
import { isSoundMuted, setSoundMuted } from "@/lib/sounds"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { QrCodeDialog } from "@/components/qr-code-dialog"

interface HeaderProps {
  mode: "mj" | "joueur"
  campaignName: string
  selectedCharacterName?: string
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
  onSettingsClick,
  onLogout,
  hideActions = false,
  ambientEffect = "none",
  onAmbientEffectChange,
}: HeaderProps) {
  const [showQrDialog, setShowQrDialog] = useState(false)
  const [soundMuted, setSoundMutedState] = useState(() => {
    if (typeof window !== "undefined") {
      return isSoundMuted()
    }
    return false
  })

  const toggleSoundMute = () => {
    const newValue = !soundMuted
    setSoundMutedState(newValue)
    setSoundMuted(newValue)
  }

  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40 safe-area-top">
      {/* Main Header Row */}
      <div className="flex items-center justify-between px-3 py-2 gap-2 lg:px-4 lg:py-3">
        {/* Logo & Title */}
        <div className="flex items-center gap-2 shrink-0 lg:gap-3">
          <Link href="/" className="flex items-center gap-2 lg:gap-3">
            <div className="flex items-center justify-center w-9 h-9 lg:w-10 lg:h-10 rounded-lg bg-primary/20 border border-primary/30 transition-smooth hover:bg-primary/30">
              <Sword className="w-4 h-4 lg:w-5 lg:h-5 text-gold" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg lg:text-xl font-bold text-gold tracking-wide">Compagnon D&D</h1>
            </div>
          </Link>
          {/* Campaign name - visible on larger screens */}
          {campaignName && (
            <Badge variant="outline" className="hidden lg:flex border-border text-muted-foreground text-xs">
              {campaignName}
            </Badge>
          )}
        </div>


        {/* Right Section - User Info + Actions */}
        <div className="flex items-center gap-1 lg:gap-2">
          {/* Ambient Controls Popover - DM only */}
          {mode === "mj" && onAmbientEffectChange && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 hover:bg-primary/20 hover:text-gold transition-smooth"
                  title="Effets d'ambiance"
                >
                  <Sparkles className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto p-3 bg-card border-border"
                align="end"
                sideOffset={8}
              >
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-2">
                    <span className="text-xs text-muted-foreground font-medium">Ambiance</span>
                    <AmbientControls
                      currentEffect={ambientEffect}
                      onChangeEffect={onAmbientEffectChange}
                      compact
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-xs text-muted-foreground font-medium">Critique</span>
                    <div className="flex items-center gap-2">
                      <CriticalButtons onTriggerEffect={onAmbientEffectChange} />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleSoundMute}
                        className="h-8 w-8"
                        title={soundMuted ? "Activer les sons" : "Couper les sons"}
                      >
                        {soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* QR Code Button - DM only */}
          {mode === "mj" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowQrDialog(true)}
              className="h-9 w-9 hover:bg-primary/20 hover:text-gold transition-smooth"
              title="Code QR de connexion"
            >
              <QrCode className="w-4 h-4" />
            </Button>
          )}

          {/* Sound Mute Button - Player only (DM has it in ambient popover) */}
          {mode === "joueur" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSoundMute}
              className="h-9 w-9 hover:bg-primary/20 transition-smooth"
              title={soundMuted ? "Activer les sons" : "Couper les sons"}
            >
              {soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>
          )}

          {/* User Info Badge */}
          <div className={cn(
            "flex items-center gap-1.5 px-2 py-1 lg:px-3 lg:py-1.5 rounded-lg",
            mode === "mj" ? "bg-gold/10 border border-gold/30" : "bg-secondary/50 border border-border"
          )}>
            {mode === "mj" ? (
              <>
                <Crown className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-gold" />
                <span className="text-xs lg:text-sm font-medium text-gold">MJ</span>
              </>
            ) : (
              <>
                <User className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-foreground" />
                <span className="text-xs lg:text-sm font-medium truncate max-w-[80px] sm:max-w-none">
                  {selectedCharacterName || "Joueur"}
                </span>
              </>
            )}
          </div>

          {/* Action Buttons */}
          {!hideActions && (
            <>
              {/* Desktop Action Buttons */}
              <div className="hidden md:flex items-center gap-1">
                {/* Bestiaire - MJ only */}
                {mode === "mj" && (
                  <Link href="/monsters">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 lg:h-10 lg:w-10 hover:bg-primary/20 hover:text-crimson transition-smooth"
                      title="Bestiaire"
                    >
                      <Skull className="w-4 h-4 lg:w-5 lg:h-5" />
                    </Button>
                  </Link>
                )}
                {/* Carte de Faerûn */}
                <Link href="/map">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 lg:h-10 lg:w-10 hover:bg-primary/20 hover:text-emerald transition-smooth"
                    title="Carte de Faerûn"
                  >
                    <Map className="w-4 h-4 lg:w-5 lg:h-5" />
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onSettingsClick}
                  className="h-9 w-9 lg:h-10 lg:w-10 hover:bg-primary/20 hover:text-gold transition-smooth"
                  title="Paramètres"
                >
                  <Settings className="w-4 h-4 lg:w-5 lg:h-5" />
                </Button>
              </div>

              {/* Mobile Menu Popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 md:hidden hover:bg-primary/20 transition-smooth"
                    title="Menu"
                  >
                    <Menu className="w-4 h-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-2 bg-card border-border"
                  align="end"
                  sideOffset={8}
                >
                  <div className="flex flex-col gap-1">
                    {mode === "mj" && (
                      <>
                        <Link href="/monsters" className="w-full">
                          <Button
                            variant="ghost"
                            className="w-full justify-start gap-2 h-9 hover:bg-primary/20 hover:text-crimson"
                          >
                            <Skull className="w-4 h-4" />
                            <span className="text-sm">Bestiaire</span>
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          onClick={() => setShowQrDialog(true)}
                          className="w-full justify-start gap-2 h-9 hover:bg-primary/20 hover:text-gold"
                        >
                          <QrCode className="w-4 h-4" />
                          <span className="text-sm">Code QR</span>
                        </Button>
                      </>
                    )}
                    <Link href="/map" className="w-full">
                      <Button
                        variant="ghost"
                        className="w-full justify-start gap-2 h-9 hover:bg-primary/20 hover:text-emerald"
                      >
                        <Map className="w-4 h-4" />
                        <span className="text-sm">Carte</span>
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      onClick={onSettingsClick}
                      className="w-full justify-start gap-2 h-9 hover:bg-primary/20 hover:text-gold"
                    >
                      <Settings className="w-4 h-4" />
                      <span className="text-sm">Paramètres</span>
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </>
          )}

          {/* Logout Button */}
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
      </div>

      {/* QR Code Dialog */}
      <QrCodeDialog open={showQrDialog} onOpenChange={setShowQrDialog} />
    </header>
  )
}
