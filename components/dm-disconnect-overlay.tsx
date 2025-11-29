"use client"

import { useState, useEffect } from "react"
import { Crown, Loader2, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

interface DmDisconnectOverlayProps {
  disconnectTime: number
  gracePeriodSeconds?: number // Default 60 seconds
  onTimeout?: () => void
}

export function DmDisconnectOverlay({
  disconnectTime,
  gracePeriodSeconds = 60,
  onTimeout,
}: DmDisconnectOverlayProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(gracePeriodSeconds)
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - disconnectTime) / 1000)
      const remaining = Math.max(0, gracePeriodSeconds - elapsed)
      setRemainingSeconds(remaining)

      if (remaining <= 0 && !expired) {
        setExpired(true)
        onTimeout?.()
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [disconnectTime, gracePeriodSeconds, expired, onTimeout])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
      <div className="max-w-md mx-4 text-center space-y-6">
        {/* Animated icon */}
        <div className="relative mx-auto w-24 h-24">
          <div className={cn(
            "absolute inset-0 rounded-full",
            expired ? "bg-red-500/20" : "bg-amber-500/20",
            "animate-ping"
          )} />
          <div className={cn(
            "relative w-24 h-24 rounded-full flex items-center justify-center",
            expired ? "bg-red-500/30 border-2 border-red-500" : "bg-amber-500/30 border-2 border-amber-500"
          )}>
            {expired ? (
              <AlertTriangle className="w-12 h-12 text-red-500" />
            ) : (
              <Crown className="w-12 h-12 text-amber-500 animate-pulse" />
            )}
          </div>
        </div>

        {/* Status text */}
        <div className="space-y-2">
          <h2 className={cn(
            "text-2xl font-bold",
            expired ? "text-red-500" : "text-amber-500"
          )}>
            {expired ? "Session perdue" : "MJ deconnecte"}
          </h2>
          <p className="text-muted-foreground">
            {expired
              ? "Le Maitre du Jeu ne s'est pas reconnecte a temps."
              : "En attente de la reconnexion du Maitre du Jeu..."}
          </p>
        </div>

        {/* Countdown or action */}
        {!expired ? (
          <div className="space-y-4">
            {/* Countdown timer */}
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
              <span className="text-4xl font-mono font-bold text-foreground">
                {formatTime(remainingSeconds)}
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-1000 ease-linear"
                style={{ width: `${(remainingSeconds / gracePeriodSeconds) * 100}%` }}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              La session sera consideree comme perdue si le MJ ne se reconnecte pas.
            </p>
          </div>
        ) : (
          <button
            onClick={onTimeout}
            className="px-6 py-3 bg-amber-500 hover:bg-amber-500/80 text-background font-semibold rounded-lg transition-colors"
          >
            Retourner a la selection
          </button>
        )}
      </div>
    </div>
  )
}
