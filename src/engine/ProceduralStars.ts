import * as THREE from 'three'

export interface StarType {
  name: string
  color: THREE.Color
  sizeRange: [number, number]
  frequency: number
  coronaIntensity: number
  flareMode: number
}

export const STAR_TYPES: StarType[] = [
  { name: 'M_RedDwarf', color: new THREE.Color(1.0, 0.2, 0.02), sizeRange: [10, 25], frequency: 0.74, coronaIntensity: 0.5, flareMode: 0 },
  { name: 'K_OrangeDwarf', color: new THREE.Color(1.0, 0.45, 0.1), sizeRange: [30, 50], frequency: 0.12, coronaIntensity: 0.6, flareMode: 0 },
  { name: 'G_YellowDwarf', color: new THREE.Color(1.5, 0.62, 0.0), sizeRange: [40, 60], frequency: 0.07, coronaIntensity: 0.7, flareMode: 1 },
  { name: 'F_YellowWhite', color: new THREE.Color(1.0, 1.0, 0.9), sizeRange: [60, 90], frequency: 0.035, coronaIntensity: 0.8, flareMode: 1 },
  { name: 'A_White', color: new THREE.Color(0.9, 0.95, 1.0), sizeRange: [100, 150], frequency: 0.015, coronaIntensity: 0.9, flareMode: 1 },
  { name: 'B_BlueWhite', color: new THREE.Color(0.7, 0.8, 2.0), sizeRange: [250, 400], frequency: 0.01, coronaIntensity: 1.0, flareMode: 2 },
  { name: 'O_BlueGiant', color: new THREE.Color(0.05, 0.35, 1.0), sizeRange: [500, 1000], frequency: 0.005, coronaIntensity: 1.2, flareMode: 2 },
  { name: 'NeutronStar', color: new THREE.Color(0.3, 0.6, 1.0), sizeRange: [15, 25], frequency: 0.003, coronaIntensity: 0.3, flareMode: 2 },
  { name: 'BlackHole', color: new THREE.Color(0.0, 0.0, 0.0), sizeRange: [60, 120], frequency: 0.002, coronaIntensity: 0.0, flareMode: 0 },
]

export function hashCoords(x: number, y: number, z: number, seed: number): number {
  // 64-bit mixing hash
  let h = BigInt(seed)
  const bx = BigInt(x + 1000000)
  const by = BigInt(y + 1000000)
  const bz = BigInt(z + 1000000)
  
  h = h * 6364136223846793005n + bx
  h = (h ^ (h >> 33n)) * 0xff51afd7ed558ccdn
  h = (h ^ (h >> 33n)) * 0xc4ceb9fe1a85ec53n
  h = h ^ (h >> 33n)
  h = h * 6364136223846793005n + by
  h = (h ^ (h >> 33n)) * 0xff51afd7ed558ccdn
  h = (h ^ (h >> 33n)) * 0xc4ceb9fe1a85ec53n
  h = h ^ (h >> 33n)
  h = h * 6364136223846793005n + bz
  h = (h ^ (h >> 33n)) * 0xff51afd7ed558ccdn
  h = (h ^ (h >> 33n)) * 0xc4ceb9fe1a85ec53n
  h = h ^ (h >> 33n)
  
  return Number(h & 0x7FFFFFFFn) / 0x7FFFFFFF
}

export function getStarAtSector(x: number, y: number, z: number, universeSeed: number = 42): { type: StarType; size: number; position: THREE.Vector3 } | null {
  const existence = hashCoords(x, y, z, universeSeed)
  
  // Guaranteed star at origin
  if (x === 0 && y === 0 && z === 0) {
    const sunType = STAR_TYPES[2] // G Yellow Dwarf
    return {
      type: sunType,
      size: 40 + hashCoords(x, y, z + 1, universeSeed) * (sunType.sizeRange[1] - sunType.sizeRange[0]),
      position: new THREE.Vector3(x * 500, y * 500, z * 500),
    }
  }
  
  // Star existence probability: 0.0002
  if (existence > 0.0002) return null
  
  // Weighted random selection
  const rand = hashCoords(x, y, z + 100, universeSeed)
  let cumulative = 0
  let selectedType = STAR_TYPES[0]
  
  for (const type of STAR_TYPES) {
    cumulative += type.frequency
    if (rand <= cumulative) {
      selectedType = type
      break
    }
  }
  
  const sizeRand = hashCoords(x, y, z + 200, universeSeed)
  const size = selectedType.sizeRange[0] + sizeRand * (selectedType.sizeRange[1] - selectedType.sizeRange[0])
  
  // Position jitter within sector
  const jitterX = (hashCoords(x, y, z + 300, universeSeed) - 0.5) * 400
  const jitterY = (hashCoords(x, y, z + 400, universeSeed) - 0.5) * 400
  const jitterZ = (hashCoords(x, y, z + 500, universeSeed) - 0.5) * 400
  
  return {
    type: selectedType,
    size,
    position: new THREE.Vector3(
      x * 500 + jitterX,
      y * 500 + jitterY,
      z * 500 + jitterZ
    ),
  }
}

export function findNearestStar(position: THREE.Vector3, universeSeed: number = 42): { type: StarType; size: number; position: THREE.Vector3; distance: number } | null {
  const sectorX = Math.floor(position.x / 500)
  const sectorY = Math.floor(position.y / 500)
  const sectorZ = Math.floor(position.z / 500)
  
  let nearest: { type: StarType; size: number; position: THREE.Vector3; distance: number } | null = null
  
  // Search surrounding sectors
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dz = -1; dz <= 1; dz++) {
        const star = getStarAtSector(sectorX + dx, sectorY + dy, sectorZ + dz, universeSeed)
        if (star) {
          const dist = position.distanceTo(star.position)
          if (!nearest || dist < nearest.distance) {
            nearest = { ...star, distance: dist }
          }
        }
      }
    }
  }
  
  return nearest
}
