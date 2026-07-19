import * as THREE from 'three'

export class WarpEffect {
  private scene: THREE.Scene
  private lines: THREE.LineSegments | null = null
  private isActive: boolean = false
  private intensity: number = 0
  
  constructor(scene: THREE.Scene) {
    this.scene = scene
  }
  
  activate(speed: number) {
    if (this.isActive) return
    this.isActive = true
    this.intensity = Math.min(1, speed / 30)
    
    // Create streak lines
    const geometry = new THREE.BufferGeometry()
    const count = 200
    const positions = new Float32Array(count * 2 * 3)
    
    for (let i = 0; i < count; i++) {
      const idx = i * 6
      // Start point (random sphere)
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = 10 + Math.random() * 50
      
      positions[idx] = r * Math.sin(phi) * Math.cos(theta)
      positions[idx + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[idx + 2] = r * Math.cos(phi)
      
      // End point (extended in Z direction for forward motion)
      positions[idx + 3] = positions[idx] * 3
      positions[idx + 4] = positions[idx + 1] * 3
      positions[idx + 5] = positions[idx + 2] * 3 - 100
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    
    const material = new THREE.LineBasicMaterial({
      color: 0x00ffc8,
      transparent: true,
      opacity: this.intensity * 0.5,
      blending: THREE.AdditiveBlending,
    })
    
    this.lines = new THREE.LineSegments(geometry, material)
    this.scene.add(this.lines)
  }
  
  deactivate() {
    if (!this.isActive) return
    this.isActive = false
    
    if (this.lines) {
      this.scene.remove(this.lines)
      this.lines.geometry.dispose()
      ;(this.lines.material as THREE.Material).dispose()
      this.lines = null
    }
  }
  
  update(deltaTime: number, shipPosition: THREE.Vector3, shipQuaternion: THREE.Quaternion) {
    if (!this.isActive || !this.lines) return
    
    // Fade out
    this.intensity *= (1 - deltaTime * 2)
    if (this.intensity < 0.01) {
      this.deactivate()
      return
    }
    
    ;(this.lines.material as THREE.LineBasicMaterial).opacity = this.intensity * 0.5
    
    // Move lines with ship
    this.lines.position.copy(shipPosition)
    this.lines.quaternion.copy(shipQuaternion)
  }
  
  destroy() {
    this.deactivate()
  }
}
