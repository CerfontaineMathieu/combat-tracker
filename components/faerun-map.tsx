"use client"

import { useEffect, useRef, useCallback } from "react"
import maplibregl from "maplibre-gl"
import { PMTiles, Protocol } from "pmtiles"
import { useSocketContext, type PlayerPositionData } from "@/lib/socket-context"
import "maplibre-gl/dist/maplibre-gl.css"

interface CharacterToAdd {
  odNumber: string | number
  name: string
}

interface FaerunMapProps {
  mode: "mj" | "joueur"
  campaignId: number
  charactersToAdd?: CharacterToAdd[]
  centerOnCharacters?: (string | number)[]
}

export function FaerunMap({ mode, campaignId, charactersToAdd, centerOnCharacters }: FaerunMapProps) {
  const { state: socketState, emitPlayerPositions, requestPlayerPositions } = useSocketContext()
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const protocolRef = useRef<Protocol | null>(null)
  const markersRef = useRef<Map<string | number, maplibregl.Marker>>(new Map())
  const playerPositionsRef = useRef<PlayerPositionData[]>([])
  const hasCenteredRef = useRef(false)

  // Reset centering flag when component mounts (allows re-centering when navigating back to map)
  useEffect(() => {
    hasCenteredRef.current = false
  }, [])

  // Create or update a marker for a player
  const updateMarker = useCallback((position: PlayerPositionData) => {
    if (!mapRef.current) return

    const markerId = position.odNumber
    let marker = markersRef.current.get(markerId)

    if (!marker) {
      // Create marker element with inline styles (Tailwind classes don't work with innerHTML)
      const el = document.createElement("div")
      el.className = "player-marker"
      el.innerHTML = `
        <div style="width: 32px; height: 32px; border-radius: 50%; background: #d4a574; border: 2px solid #1a1a2e; box-shadow: 0 4px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; color: #1a1a2e; cursor: pointer; transition: transform 0.2s;">
          ${position.name.charAt(0).toUpperCase()}
        </div>
        <div style="position: absolute; bottom: -20px; left: 50%; transform: translateX(-50%); white-space: nowrap; font-size: 11px; font-weight: 500; color: white; background: rgba(0,0,0,0.75); padding: 2px 6px; border-radius: 4px;">
          ${position.name}
        </div>
      `
      el.style.cssText = "position: relative; display: flex; flex-direction: column; align-items: center;"

      marker = new maplibregl.Marker({
        element: el,
        draggable: mode === "mj",
        anchor: "center",
      })
        .setLngLat([position.lng, position.lat])
        .addTo(mapRef.current)

      // Add drag end handler for DM
      if (mode === "mj") {
        marker.on("dragend", () => {
          const lngLat = marker!.getLngLat()
          // Update position in ref
          const posIndex = playerPositionsRef.current.findIndex(p => p.odNumber === markerId)
          if (posIndex >= 0) {
            playerPositionsRef.current[posIndex] = {
              ...playerPositionsRef.current[posIndex],
              lng: lngLat.lng,
              lat: lngLat.lat,
            }
          }
          // Emit updated positions
          emitPlayerPositions(playerPositionsRef.current)
        })
      }

      markersRef.current.set(markerId, marker)
    } else {
      // Update existing marker position
      marker.setLngLat([position.lng, position.lat])
    }
  }, [mode, emitPlayerPositions])

  // Remove a marker
  const removeMarker = useCallback((odNumber: string | number) => {
    const marker = markersRef.current.get(odNumber)
    if (marker) {
      marker.remove()
      markersRef.current.delete(odNumber)
    }
  }, [])

  // Update all markers from positions data
  const updateAllMarkers = useCallback((positions: PlayerPositionData[]) => {
    playerPositionsRef.current = positions

    // Create/update markers for all positions
    const currentIds = new Set(positions.map(p => p.odNumber))

    // Remove markers that are no longer in positions
    markersRef.current.forEach((_, id) => {
      if (!currentIds.has(id)) {
        removeMarker(id)
      }
    })

    // Update/create markers
    positions.forEach(updateMarker)
  }, [updateMarker, removeMarker])

  // Initialize map
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

    // Request current positions when joining
    requestPlayerPositions()

    return () => {
      // Cleanup markers
      markersRef.current.forEach(marker => marker.remove())
      markersRef.current.clear()

      // Cleanup map
      map.remove()
      maplibregl.removeProtocol("pmtiles")
      mapRef.current = null
      protocolRef.current = null
    }
  }, [requestPlayerPositions])

  // Sync player positions from socket context to markers
  useEffect(() => {
    if (!mapRef.current) return
    updateAllMarkers(socketState.playerPositions)
  }, [socketState.playerPositions, updateAllMarkers])

  // Center map on player's character (only once when positions first load)
  useEffect(() => {
    if (!mapRef.current) return
    if (hasCenteredRef.current) return
    if (!centerOnCharacters || centerOnCharacters.length === 0) return
    if (socketState.playerPositions.length === 0) return

    // Find the first matching character position
    const playerPosition = socketState.playerPositions.find(pos =>
      centerOnCharacters.some(id => String(id) === String(pos.odNumber))
    )

    if (playerPosition) {
      mapRef.current.flyTo({
        center: [playerPosition.lng, playerPosition.lat],
        zoom: 5,
        duration: 1000,
      })
      hasCenteredRef.current = true
    }
  }, [socketState.playerPositions, centerOnCharacters])

  // DM responds to position requests (handled via socket context's socket directly)
  useEffect(() => {
    const socket = socketState.socket
    if (!socket || mode !== "mj") return

    const handlePositionRequest = () => {
      if (playerPositionsRef.current.length > 0) {
        emitPlayerPositions(playerPositionsRef.current)
      }
    }

    socket.on("request-player-positions", handlePositionRequest)

    return () => {
      socket.off("request-player-positions", handlePositionRequest)
    }
  }, [socketState.socket, mode, emitPlayerPositions])

  // Handle adding new characters to the map
  useEffect(() => {
    if (!charactersToAdd || charactersToAdd.length === 0 || mode !== "mj") return

    const mapCenter = mapRef.current?.getCenter()

    // Add new characters at map center
    const newPositions: PlayerPositionData[] = charactersToAdd
      .filter(char => !markersRef.current.has(char.odNumber)) // Only add if not already on map
      .map((char, index) => ({
        odNumber: char.odNumber,
        name: char.name,
        lng: (mapCenter?.lng ?? -90) + (index * 2), // Offset each character slightly
        lat: mapCenter?.lat ?? 50,
      }))

    if (newPositions.length > 0) {
      // Merge with existing positions
      const allPositions = [...playerPositionsRef.current, ...newPositions]
      playerPositionsRef.current = allPositions
      emitPlayerPositions(allPositions)
    }
  }, [charactersToAdd, mode, emitPlayerPositions])

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-full"
      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
    />
  )
}
