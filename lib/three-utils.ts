import * as THREE from "three"

/**
 * Recursively disposes of all geometries, materials, and textures in a scene
 */
export function disposeScene(scene: THREE.Scene): void {
  scene.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.geometry?.dispose()
      if (Array.isArray(object.material)) {
        object.material.forEach((m) => disposeMaterial(m))
      } else if (object.material) {
        disposeMaterial(object.material)
      }
    }
  })
}

/**
 * Disposes of a material and all its textures
 */
function disposeMaterial(material: THREE.Material): void {
  if (material instanceof THREE.MeshStandardMaterial) {
    material.map?.dispose()
    material.normalMap?.dispose()
    material.roughnessMap?.dispose()
    material.metalnessMap?.dispose()
    material.emissiveMap?.dispose()
    material.aoMap?.dispose()
    material.alphaMap?.dispose()
    material.bumpMap?.dispose()
    material.displacementMap?.dispose()
    material.envMap?.dispose()
    material.lightMap?.dispose()
  } else if (material instanceof THREE.MeshBasicMaterial) {
    material.map?.dispose()
    material.alphaMap?.dispose()
    material.aoMap?.dispose()
    material.envMap?.dispose()
    material.lightMap?.dispose()
  }
  material.dispose()
}

/**
 * Creates an optimized WebGL renderer
 */
export function createRenderer(canvas: HTMLCanvasElement): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  })
  // Use pixel ratio of 1 to avoid scaling issues
  renderer.setPixelRatio(1)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.2
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  return renderer
}
