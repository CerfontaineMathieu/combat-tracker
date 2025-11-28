"use client"

import dynamic from "next/dynamic"

// Dynamic import to avoid SSR issues with MapLibre
const FaerunMap = dynamic(
  () => import("@/components/faerun-map").then((mod) => mod.FaerunMap),
  { ssr: false }
)

export default function MapPage() {
  return (
    <div className="fixed inset-0 w-screen h-screen">
      <FaerunMap />
    </div>
  )
}
