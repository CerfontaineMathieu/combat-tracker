"use client"

import { useEffect, useRef } from "react"
import maplibregl from "maplibre-gl"
import { PMTiles, Protocol } from "pmtiles"
import "maplibre-gl/dist/maplibre-gl.css"

export function FaerunMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const protocolRef = useRef<Protocol | null>(null)

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    // Register PMTiles protocol
    const protocol = new Protocol()
    maplibregl.addProtocol("pmtiles", protocol.tile)
    protocolRef.current = protocol

    // Add the PMTiles file to the protocol
    const pmtiles = new PMTiles("/map/faerun.pmtiles")
    protocol.add(pmtiles)

    // Map bounds to restrict panning (approximate bounds of Faerûn tiles)
    const bounds: maplibregl.LngLatBoundsLike = [
      [-180, 20],   // Southwest corner (raised bottom limit)
      [0, 85]       // Northeast corner
    ]

    // Create map with simple CRS for fantasy map
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          faerun: {
            type: "raster",
            tiles: ["pmtiles:///map/faerun.pmtiles/{z}/{x}/{y}"],
            tileSize: 256,
            maxzoom: 7,
          },
        },
        layers: [
          {
            id: "faerun-layer",
            type: "raster",
            source: "faerun",
          },
        ],
      },
      center: [-170, 75],
      zoom: 3,
      maxZoom: 7,
      minZoom: 2.5,
      maxBounds: bounds,
    })

    // Add navigation controls
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right")

    mapRef.current = map

    return () => {
      map.remove()
      maplibregl.removeProtocol("pmtiles")
      mapRef.current = null
      protocolRef.current = null
    }
  }, [])

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-full"
      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
    />
  )
}
