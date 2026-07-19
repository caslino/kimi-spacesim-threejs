import * as THREE from 'three'

export class AsteroidField {
  private asteroids: THREE.Mesh[] = []
  private group: THREE.Group
  private scene: THREE.Scene
  private readonly COUNT = 200
  private readonly RADIUS = 200
  
  constructor(scene: THREE.Scene, centerPosition: THREE.Vector3) {
    this.scene = scene
    this.group = new THREE.Group()
    this.group.position.copy(centerPosition)
    
    // Create varied asteroid shapes
    const geometries = [
      new THREE.DodecahedronGeometry(0.5, 0),
      new THREE.IcosahedronGeometry(0.7, 0),
      new THREE.OctahedronGeometry(0.4, 0),
      new THREE.TetrahedronGeometry(0.6, 0),
    ]
    
    const material = new THREE.MeshStandardMaterial({
      color: 0x555555,
      roughness: 0.9,
      metalness: 0.1,
    })
    
    for (let i = 0; i < this.COUNT; i++) {
      const geometry = geometries[Math.floor(Math.random() * geometries.length)]
      const mesh = new THREE.Mesh(geometry, material)
      
      // Random position in spherical shell
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = 20 + Math.random() * this.RADIUS
      
      mesh.position.set(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      )
      
      // Random rotation
      mesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      )
      
      // Random scale variation
      const scale = 0.3 + Math.random() * 2.0
      mesh.scale.set(scale, scale, scale)
      
      // Store rotation speed for animation
      mesh.userData.rotationSpeed = {
        x: (Math.random() - 0.5) * 0.02,
        y: (Math.random() - 0.5) * 0.02,
        z: (Math.random() - 0.5) * 0.02,
      }
      
      this.group.add(mesh)
      this.asteroids.push(mesh)
    }
    
    scene.add(this.group)
  }
  
  update(deltaTime: number) {
    // Rotate asteroids slowly
    for (const asteroid of this.asteroids) {
      asteroid.rotation.x += asteroid.userData.rotationSpeed.x * deltaTime
      asteroid.rotation.y += asteroid.userData.rotationSpeed.y * deltaTime
      asteroid.rotation.z += asteroid.userData.rotationSpeed.z * deltaTime
    }
  }
  
  setPosition(position: THREE.Vector3) {
    this.group.position.copy(position)
  }
  
  destroy() {
    this.scene.remove(this.group)
    for (const asteroid of this.asteroids) {
      asteroid.geometry.dispose()
    }
  }
}
