"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { Sword, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

// Dynamic import to avoid SSR issues with MapLibre
const FaerunMap = dynamic(
  () => import("@/components/faerun-map").then((mod) => mod.FaerunMap),
  { ssr: false }
)

export default function MapPage() {
  return (
    <div className="fixed inset-0 w-screen h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40 shrink-0">
        <div className="flex items-center justify-between px-4 py-3 gap-2">
          {/* Back button & Logo */}
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 hover:bg-primary/20 hover:text-gold transition-smooth"
                title="Retour"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <Link href="/" className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/20 border border-primary/30 transition-smooth hover:bg-primary/30">
                <Sword className="w-5 h-5 text-gold" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-gold tracking-wide">Carte de Faerûn</h1>
              </div>
            </Link>
          </div>
        </div>
      </header>

      {/* Map */}
      <div className="flex-1 relative">
        <FaerunMap />
      </div>
    </div>
  )
}
