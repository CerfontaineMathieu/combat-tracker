"use client"

import { useEffect, useRef, useCallback } from "react"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { disposeScene, createRenderer } from "@/lib/three-utils"

interface TavernSceneProps {
  onMapClick: () => void
  isMapHovered: boolean
  onMapHover: (hovered: boolean) => void
}

export function TavernScene({ onMapClick, isMapHovered, onMapHover }: TavernSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const mapPlaneRef = useRef<THREE.Mesh | null>(null)
  const frameIdRef = useRef<number>(0)
  const raycaster = useRef(new THREE.Raycaster())
  const mouse = useRef(new THREE.Vector2())

  // Setup warm tavern lighting
  const setupLighting = useCallback((scene: THREE.Scene) => {
    // Strong ambient light so everything is visible
    const ambient = new THREE.AmbientLight(0xffffff, 0.8)
    scene.add(ambient)

    // Main warm light from above
    const mainLight = new THREE.PointLight(0xffcc88, 2, 30)
    mainLight.position.set(0, 4, 0)
    scene.add(mainLight)

    // Fill lights in corners
    const fillLight1 = new THREE.PointLight(0xffaa66, 1, 15)
    fillLight1.position.set(3, 2, 3)
    scene.add(fillLight1)

    const fillLight2 = new THREE.PointLight(0xffaa66, 1, 15)
    fillLight2.position.set(-3, 2, -3)
    scene.add(fillLight2)

    const fillLight3 = new THREE.PointLight(0xffaa66, 1, 15)
    fillLight3.position.set(3, 2, -3)
    scene.add(fillLight3)

    const fillLight4 = new THREE.PointLight(0xffaa66, 1, 15)
    fillLight4.position.set(-3, 2, 3)
    scene.add(fillLight4)
  }, [])

  // Create placeholder tavern geometry (used when no GLTF model is available)
  const createPlaceholderTavern = useCallback((scene: THREE.Scene) => {
    // Floor
    const floorGeometry = new THREE.PlaneGeometry(10, 10)
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a3728,
      roughness: 0.9,
      metalness: 0.1,
    })
    const floor = new THREE.Mesh(floorGeometry, floorMaterial)
    floor.rotation.x = -Math.PI / 2
    floor.receiveShadow = true
    scene.add(floor)

    // Walls
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x5c4033,
      roughness: 0.85,
      metalness: 0.05,
    })

    // Back wall
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(10, 4), wallMaterial)
    backWall.position.set(0, 2, -5)
    backWall.receiveShadow = true
    scene.add(backWall)

    // Left wall
    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(10, 4), wallMaterial)
    leftWall.position.set(-5, 2, 0)
    leftWall.rotation.y = Math.PI / 2
    leftWall.receiveShadow = true
    scene.add(leftWall)

    // Right wall
    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(10, 4), wallMaterial)
    rightWall.position.set(5, 2, 0)
    rightWall.rotation.y = -Math.PI / 2
    rightWall.receiveShadow = true
    scene.add(rightWall)

    // Table
    const tableMaterial = new THREE.MeshStandardMaterial({
      color: 0x654321,
      roughness: 0.7,
      metalness: 0.1,
    })

    // Table top
    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(3, 0.1, 2), tableMaterial)
    tableTop.position.set(0, 1, 0)
    tableTop.castShadow = true
    tableTop.receiveShadow = true
    scene.add(tableTop)

    // Table legs
    const legGeometry = new THREE.BoxGeometry(0.15, 1, 0.15)
    const legPositions: [number, number][] = [
      [-1.3, -0.8],
      [1.3, -0.8],
      [-1.3, 0.8],
      [1.3, 0.8],
    ]
    legPositions.forEach(([x, z]) => {
      const leg = new THREE.Mesh(legGeometry, tableMaterial)
      leg.position.set(x, 0.5, z)
      leg.castShadow = true
      scene.add(leg)
    })
  }, [])

  // Create map plane on table
  const createMapPlane = useCallback((scene: THREE.Scene, tableHeight: number, x: number = 0, z: number = 0) => {
    const textureLoader = new THREE.TextureLoader()
    const mapTexture = textureLoader.load("/map/faerun-2020-blank.png")
    mapTexture.colorSpace = THREE.SRGBColorSpace
    mapTexture.anisotropy = 16

    // Map size to fit nicely on the small table
    const geometry = new THREE.PlaneGeometry(0.8, 0.6)
    const material = new THREE.MeshStandardMaterial({
      map: mapTexture,
      roughness: 0.7,
      metalness: 0.0,
      emissive: new THREE.Color(0xffaa55),
      emissiveIntensity: 0,
    })

    const mapPlane = new THREE.Mesh(geometry, material)
    mapPlane.rotation.x = -Math.PI / 2
    mapPlane.rotation.z = Math.PI  // Rotate 180 degrees
    mapPlane.position.set(x, tableHeight + 0.02, z)
    mapPlane.name = "mapPlane"
    mapPlane.receiveShadow = true

    scene.add(mapPlane)
    mapPlaneRef.current = mapPlane
  }, [])

  // Load GLTF tavern model
  const loadTavernModel = useCallback((scene: THREE.Scene, camera: THREE.PerspectiveCamera, controls: OrbitControls) => {
    const loader = new GLTFLoader()
    loader.load(
      "/models/tavern.glb",
      (gltf) => {
        // Calculate bounding box
        const box = new THREE.Box3().setFromObject(gltf.scene)
        const size = box.getSize(new THREE.Vector3())
        const center = box.getCenter(new THREE.Vector3())

        // Scale model to fit nicely (target ~8 units for the largest dimension)
        const maxDim = Math.max(size.x, size.y, size.z)
        const targetSize = 8
        const scale = targetSize / maxDim
        gltf.scene.scale.setScalar(scale)

        // Recalculate after scaling
        box.setFromObject(gltf.scene)
        box.getCenter(center)
        box.getSize(size)

        // Center the model horizontally, place on ground
        gltf.scene.position.x = -center.x
        gltf.scene.position.z = -center.z
        gltf.scene.position.y = -box.min.y

        // Enable shadows on all meshes
        gltf.scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true
            child.receiveShadow = true
          }
        })

        scene.add(gltf.scene)

        // Add the map on the small wooden table
        const tableHeight = size.y * 0.30 // Table surface height
        const tableX = -0.18  // Shift left to center on table
        const tableZ = 1.0    // Forward position on table
        createMapPlane(scene, tableHeight, tableX, tableZ)

        // Camera position for a nice view of the table with map
        camera.position.set(2, tableHeight + 1.5, 2)
        camera.fov = 60

        // Look at the map on the table
        controls.target.set(tableX, tableHeight, tableZ)

        // Allow rotation but restrict to stay inside
        controls.minDistance = 1.5
        controls.maxDistance = 5
        controls.maxPolarAngle = Math.PI * 0.65
        controls.minPolarAngle = 0.3
        controls.enablePan = false
        controls.enableDamping = true
        controls.dampingFactor = 0.05

        camera.updateProjectionMatrix()
        controls.update()

        console.log("Tavern loaded with map on table.")
      },
      undefined,
      (error) => {
        console.warn("Tavern model not found, using placeholder geometry:", error)
        createPlaceholderTavern(scene)
        createMapPlane(scene, 1.0, 0, 0) // Default table height for placeholder
      }
    )
  }, [createPlaceholderTavern, createMapPlane])

  // Initialization
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let scene: THREE.Scene
    let camera: THREE.PerspectiveCamera
    let renderer: THREE.WebGLRenderer
    let controls: OrbitControls
    let canvas: HTMLCanvasElement
    let resizeObserver: ResizeObserver

    // Initialize after a small delay to ensure layout is ready
    const initTimeout = setTimeout(() => {
      const rect = container.getBoundingClientRect()
      const width = Math.floor(rect.width)
      const height = Math.floor(rect.height)

      if (width === 0 || height === 0) {
        console.warn("Container has no size")
        return
      }

      console.log("Initializing with size:", width, "x", height)

      // 1. Create scene
      scene = new THREE.Scene()
      scene.background = new THREE.Color(0x111111)
      sceneRef.current = scene

      // 2. Create camera
      camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100)
      camera.position.set(0, 1.5, 2)
      cameraRef.current = camera

      // 3. Create canvas and renderer
      canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height
      canvas.style.width = width + "px"
      canvas.style.height = height + "px"
      canvas.style.display = "block"
      container.appendChild(canvas)

      renderer = createRenderer(canvas)
      renderer.setSize(width, height, false) // false = don't update CSS
      rendererRef.current = renderer

      // 4. Setup OrbitControls
      controls = new OrbitControls(camera, canvas)
      controls.enableDamping = true
      controls.dampingFactor = 0.08
      controls.rotateSpeed = 0.5
      controls.maxPolarAngle = Math.PI * 0.75
      controls.minPolarAngle = 0.3
      controls.minDistance = 1
      controls.maxDistance = 8
      controls.target.set(0, 1, 0)
      controls.enablePan = false
      controlsRef.current = controls

      // 5. Setup lighting
      setupLighting(scene)

      // 6. Load GLTF model
      loadTavernModel(scene, camera, controls)

      // 7. Animation loop
      const animate = () => {
        frameIdRef.current = requestAnimationFrame(animate)
        controls.update()
        renderer.render(scene, camera)
      }
      animate()

      // 8. Handle resize
      const handleResize = () => {
        const newRect = container.getBoundingClientRect()
        const newWidth = Math.floor(newRect.width)
        const newHeight = Math.floor(newRect.height)
        if (newWidth === 0 || newHeight === 0) return

        canvas.width = newWidth
        canvas.height = newHeight
        canvas.style.width = newWidth + "px"
        canvas.style.height = newHeight + "px"

        camera.aspect = newWidth / newHeight
        camera.updateProjectionMatrix()
        renderer.setSize(newWidth, newHeight, false)
      }

      resizeObserver = new ResizeObserver(handleResize)
      resizeObserver.observe(container)
      window.addEventListener("resize", handleResize)
    }, 50) // Small delay to ensure layout is ready

    // Cleanup
    return () => {
      clearTimeout(initTimeout)
      if (resizeObserver) resizeObserver.disconnect()
      window.removeEventListener("resize", () => {})
      cancelAnimationFrame(frameIdRef.current)
      if (controls) controls.dispose()
      if (renderer) renderer.dispose()
      if (scene) disposeScene(scene)
      if (canvas && canvas.parentNode) {
        container.removeChild(canvas)
      }
    }
  }, [setupLighting, loadTavernModel])

  // Raycasting for hover detection
  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      if (!containerRef.current || !sceneRef.current || !cameraRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.current.setFromCamera(mouse.current, cameraRef.current)

      if (mapPlaneRef.current) {
        const intersects = raycaster.current.intersectObject(mapPlaneRef.current)
        onMapHover(intersects.length > 0)
      }
    },
    [onMapHover]
  )

  // Click detection
  const handleClick = useCallback(
    (event: MouseEvent) => {
      if (!containerRef.current || !sceneRef.current || !cameraRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.current.setFromCamera(mouse.current, cameraRef.current)

      if (mapPlaneRef.current) {
        const intersects = raycaster.current.intersectObject(mapPlaneRef.current)
        if (intersects.length > 0) {
          onMapClick()
        }
      }
    },
    [onMapClick]
  )

  // Setup event listeners
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener("pointermove", handlePointerMove)
    container.addEventListener("click", handleClick)

    return () => {
      container.removeEventListener("pointermove", handlePointerMove)
      container.removeEventListener("click", handleClick)
    }
  }, [handlePointerMove, handleClick])

  // Update map material based on hover state
  useEffect(() => {
    if (!mapPlaneRef.current) return
    const material = mapPlaneRef.current.material as THREE.MeshStandardMaterial

    if (isMapHovered) {
      material.emissiveIntensity = 0.3
    } else {
      material.emissiveIntensity = 0
    }
  }, [isMapHovered])

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        height: "100%",
        touchAction: "none",
        cursor: isMapHovered ? "pointer" : "grab",
        overflow: "hidden",
      }}
    />
  )
}
