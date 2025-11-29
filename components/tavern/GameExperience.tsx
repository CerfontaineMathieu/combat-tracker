"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { gsap } from "gsap"
import { TavernScene } from "./TavernScene"
import { FaerunMap } from "@/components/faerun-map"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

interface GameExperienceProps {
  mode: "mj" | "joueur"
  campaignId: number
}

type ViewState = "tavern" | "transitioning-to-map" | "map" | "transitioning-to-tavern"

export function GameExperience({ mode, campaignId }: GameExperienceProps) {
  const [viewState, setViewState] = useState<ViewState>("tavern")
  const [isMapHovered, setIsMapHovered] = useState(false)
  const [showMap, setShowMap] = useState(false)

  const tavernContainerRef = useRef<HTMLDivElement>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)

  // Preload map component when entering tavern
  useEffect(() => {
    // Delay map preload slightly to prioritize tavern rendering
    const timer = setTimeout(() => {
      setShowMap(true)
    }, 1000)
    return () => clearTimeout(timer)
  }, [])

  const transitionToMap = useCallback(() => {
    if (viewState !== "tavern") return
    setViewState("transitioning-to-map")

    const tl = gsap.timeline({
      onComplete: () => setViewState("map"),
    })

    // Fade out tavern with zoom effect
    tl.to(tavernContainerRef.current, {
      opacity: 0,
      scale: 1.15,
      duration: 0.8,
      ease: "power2.inOut",
    })
    // Fade in map with overlap
    tl.to(
      mapContainerRef.current,
      {
        opacity: 1,
        duration: 0.6,
        ease: "power2.out",
      },
      "-=0.4"
    )
  }, [viewState])

  const transitionToTavern = useCallback(() => {
    if (viewState !== "map") return
    setViewState("transitioning-to-tavern")

    const tl = gsap.timeline({
      onComplete: () => setViewState("tavern"),
    })

    // Fade out map
    tl.to(mapContainerRef.current, {
      opacity: 0,
      duration: 0.5,
      ease: "power2.inOut",
    })
    // Reset tavern scale and fade in
    tl.set(tavernContainerRef.current, { scale: 0.9 })
    tl.to(
      tavernContainerRef.current,
      {
        opacity: 1,
        scale: 1,
        duration: 0.7,
        ease: "power2.out",
      },
      "-=0.2"
    )
  }, [viewState])

  const isTavernVisible = viewState === "tavern" || viewState === "transitioning-to-map"
  const isMapVisible = viewState === "map" || viewState === "transitioning-to-tavern"

  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden", background: "#1a1a2e" }}>
      {/* Tavern Scene */}
      <div
        ref={tavernContainerRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: isTavernVisible ? 1 : 0,
          pointerEvents: viewState === "tavern" ? "auto" : "none",
        }}
      >
        <TavernScene
          onMapClick={transitionToMap}
          isMapHovered={isMapHovered}
          onMapHover={setIsMapHovered}
        />

        {/* Hover hint */}
        {isMapHovered && viewState === "tavern" && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 px-4 py-2 bg-card/90 backdrop-blur-sm rounded-lg border border-amber-600/40 text-amber-200 text-sm shadow-lg animate-in fade-in duration-200">
            Cliquez pour voir la carte
          </div>
        )}

        {/* Scene info */}
        <div className="absolute top-4 left-4 px-3 py-1.5 bg-card/80 backdrop-blur-sm rounded-lg border border-border/50 text-muted-foreground text-xs">
          Utilisez la souris pour regarder autour
        </div>
      </div>

      {/* Map View */}
      <div
        ref={mapContainerRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: isMapVisible ? 1 : 0,
          pointerEvents: viewState === "map" ? "auto" : "none",
        }}
      >
        {showMap && (
          <>
            <FaerunMap mode={mode} campaignId={campaignId} />

            {/* Return to tavern button */}
            <div className="absolute top-4 left-4 z-10">
              <Button
                variant="outline"
                size="sm"
                onClick={transitionToTavern}
                className="bg-card/90 backdrop-blur-sm border-amber-600/40 hover:border-amber-500 hover:bg-card text-amber-200 hover:text-amber-100 shadow-lg"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour à la taverne
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Loading overlay during transitions */}
      {(viewState === "transitioning-to-map" || viewState === "transitioning-to-tavern") && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
        </div>
      )}
    </div>
  )
}

export default GameExperience
