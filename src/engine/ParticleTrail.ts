import * as THREE from 'three'

export class ParticleTrail {
  private geometry: THREE.BufferGeometry
  private material: THREE.PointsMaterial
  private points: THREE.Points
  private positions: Float32Array
  private opacities: Float32Array
  private maxPoints: number
  private currentIndex: number = 0
  private scene: THREE.Scene
  
  constructor(scene: THREE.Scene, maxPoints: number = 500) {
    this.scene = scene
    this.maxPoints = maxPoints
    this.positions = new Float32Array(maxPoints * 3)
    this.opacities = new Float32Array(maxPoints)
    
    this.geometry = new THREE.BufferGeometry()
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    this.geometry.setAttribute('opacity', new THREE.BufferAttribute(this.opacities, 1))
    
    this.material = new THREE.PointsMaterial({
      color: 0x00ffc8,
      size: 0.5,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    
    this.points = new THREE.Points(this.geometry, this.material)
    this.scene.add(this.points)
  }
  
  addPoint(position: THREE.Vector3, speed: number) {
    const idx = this.currentIndex * 3
    this.positions[idx] = position.x
    this.positions[idx + 1] = position.y
    this.positions[idx + 2] = position.z
    this.opacities[this.currentIndex] = Math.min(1, speed / 20)
    
    this.currentIndex = (this.currentIndex + 1) % this.maxPoints
    
    this.geometry.attributes.position.needsUpdate = true
    this.geometry.attributes.opacity.needsUpdate = true
  }
  
  update(deltaTime: number) {
    // Fade out old points
    for (let i = 0; i < this.maxPoints; i++) {
      this.opacities[i] *= (1 - deltaTime * 2)
      if (this.opacities[i] < 0.01) this.opacities[i] = 0
    }
    this.geometry.attributes.opacity.needsUpdate = true
  }
  
  destroy() {
    this.scene.remove(this.points)
    this.geometry.dispose()
    this.material.dispose()
  }
}
