import * as THREE from 'three'

export class IonExhaust {
  private mesh: THREE.Mesh
  private light: THREE.PointLight
  private material: THREE.MeshBasicMaterial
  private geometry: THREE.ConeGeometry
  private baseScale: number = 0.5
  
  constructor(scene: THREE.Scene) {
    // Cone geometry for exhaust plume
    this.geometry = new THREE.ConeGeometry(0.3, 2, 8)
    this.geometry.rotateX(Math.PI / 2) // Point backward
    
    this.material = new THREE.MeshBasicMaterial({
      color: 0x00ffc8,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    
    this.mesh = new THREE.Mesh(this.geometry, this.material)
    this.mesh.position.set(0, 0, 1.5) // Behind ship
    
    this.light = new THREE.PointLight(0x00ffc8, 0, 5)
    this.light.position.set(0, 0, 2)
    
    scene.add(this.mesh)
    scene.add(this.light)
  }
  
  update(thrustPercent: number, deltaTime: number, time: number) {
    const thrustFraction = thrustPercent / 100
    
    if (thrustFraction > 0.01) {
      // Scale based on thrust
      const scale = this.baseScale * (0.5 + thrustFraction * 1.5)
      this.mesh.scale.set(scale, scale * (1 + thrustFraction), scale)
      
      // Flicker effect
      const flicker = 0.8 + 0.2 * Math.sin(time * 20) + 0.1 * Math.sin(time * 47)
      this.material.opacity = thrustFraction * 0.4 * flicker
      
      // Light intensity
      this.light.intensity = thrustFraction * 2 * flicker
      
      // Color shift from cyan to white at high thrust
      const r = thrustFraction * 0.5
      const g = 1.0
      const b = thrustFraction * 0.8 + 0.2
      this.material.color.setRGB(r, g, b)
      this.light.color.setRGB(r, g, b)
      
      // Pulse the length
      this.mesh.scale.z *= (1 + 0.1 * Math.sin(time * 10))
    } else {
      this.material.opacity = 0
      this.light.intensity = 0
    }
  }
  
  setPosition(position: THREE.Vector3, quaternion: THREE.Quaternion) {
    this.mesh.position.copy(position).add(new THREE.Vector3(0, 0, 1.5).applyQuaternion(quaternion))
    this.mesh.quaternion.copy(quaternion)
    this.light.position.copy(position).add(new THREE.Vector3(0, 0, 2).applyQuaternion(quaternion))
  }
  
  destroy() {
    this.geometry.dispose()
    this.material.dispose()
    this.mesh.parent?.remove(this.mesh)
    this.light.parent?.remove(this.light)
  }
}
