import * as THREE from 'three'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

export interface HUDData {
  speed: number
  thrust: number
  coords: { x: number; y: number; z: number }
  distance: number
  nearestBody: { name: string; distance: number }
  panelStatus: string
  flashlight: boolean
  headlights: boolean
}

export class SpaceEngine {
  private container: HTMLDivElement
  private onHUDUpdate: (data: HUDData) => void
  
  private renderer!: THREE.WebGLRenderer
  private scene!: THREE.Scene
  private camera!: THREE.PerspectiveCamera
  private clock!: THREE.Clock
  
  private ship!: THREE.Group
  private shipVelocity: THREE.Vector3
  private shipQuaternion: THREE.Quaternion
  private thrustPercent: number
  private angularVelocity: THREE.Vector3
  private brakesActive: boolean
  private brakeFactor: number
  private distanceTraveled: number
  
  private solarSystem!: THREE.Group
  private celestialBodies: Map<string, THREE.Object3D>
  private simTime: number
  private timeWarp: number
  
  private keys: Set<string>
  private isRunning: boolean
  private lastSave: number
  
  // Physics constants
  private readonly BASE_SPEED = 50.0 // km/s
  private readonly ACCEL_TIME = 30.0 // seconds
  private readonly MAX_ANGULAR_SPEED = 8 * (Math.PI / 180) // rad/s
  private readonly ANGULAR_ACCEL = 18 * (Math.PI / 180) // rad/s²
  private readonly ANGULAR_DAMPING = 0.85
  private readonly THRUST_STEP = 5
  private readonly VISUAL_SCALE = 0.00000072
  
  constructor(container: HTMLDivElement, onHUDUpdate: (data: HUDData) => void) {
    this.container = container
    this.onHUDUpdate = onHUDUpdate
    this.shipVelocity = new THREE.Vector3()
    this.shipQuaternion = new THREE.Quaternion()
    this.thrustPercent = 0
    this.angularVelocity = new THREE.Vector3()
    this.brakesActive = false
    this.brakeFactor = 0
    this.distanceTraveled = 0
    this.celestialBodies = new Map()
    this.simTime = 0
    this.timeWarp = 30000
    this.keys = new Set()
    this.isRunning = false
    this.lastSave = 0
  }

  async init() {
    // Renderer
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      preserveDrawingBuffer: true 
    })
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setClearColor(0x000510)
    this.container.appendChild(this.renderer.domElement)

    // Scene
    this.scene = new THREE.Scene()
    this.scene.fog = new THREE.FogExp2(0x000510, 0.00015)

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      60,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      10000
    )
    this.camera.position.set(0, 5, 15)

    // Clock
    this.clock = new THREE.Clock()

    // Lighting
    this.setupLighting()

    // Starfield
    this.createStarfield()

    // Solar System
    this.solarSystem = new THREE.Group()
    this.scene.add(this.solarSystem)
    await this.loadSolarSystem()

    // Ship
    this.ship = new THREE.Group()
    this.scene.add(this.ship)
    await this.loadShip()

    // Event listeners
    this.setupControls()
    window.addEventListener('resize', this.onResize)

    // Load saved state
    this.loadState()
  }

  private setupLighting() {
    const ambient = new THREE.AmbientLight(0x1a2030, 0.2)
    this.scene.add(ambient)

    const sunLight = new THREE.DirectionalLight(0xebf3ff, 3.0)
    sunLight.position.set(100, 0, 0)
    this.scene.add(sunLight)

    const sunPoint = new THREE.PointLight(0xfffaed, 3.0, 0, 0)
    sunPoint.position.set(0, 0, 0)
    this.scene.add(sunPoint)
  }

  private createStarfield() {
    const count = 15000
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)

    const colorPalette = [
      new THREE.Color(1.0, 1.0, 1.0),
      new THREE.Color(0.8, 0.9, 1.0),
      new THREE.Color(1.0, 0.9, 0.7),
      new THREE.Color(0.9, 0.7, 0.5),
      new THREE.Color(0.7, 0.5, 1.0),
    ]

    for (let i = 0; i < count; i++) {
      const r = 3000 + Math.random() * 2000
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = r * Math.cos(phi)

      const color = colorPalette[Math.floor(Math.random() * colorPalette.length)]
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const material = new THREE.PointsMaterial({
      size: 2,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
    })

    const stars = new THREE.Points(geometry, material)
    this.scene.add(stars)
  }

  private async loadSolarSystem() {
    // Load starmap data
    const response = await fetch('/starmap.csv')
    const csv = await response.text()
    const lines = csv.trim().split('\n').slice(1)

    for (const line of lines) {
      const [name, type, parent, sma, period, radius] = line.split(',')
      if (!name) continue

      const visualRadius = this.getVisualRadius(parseFloat(radius), type)
      const geometry = new THREE.SphereGeometry(visualRadius, 32, 32)
      
      let color = 0x888888
      if (type === 'Star') color = 0xffaa00
      else if (name === 'Earth') color = 0x2233ff
      else if (name === 'Mars') color = 0xff4422
      else if (name === 'Jupiter') color = 0xd4a574
      else if (name === 'Saturn') color = 0xe8d5a3
      else if (name === 'Venus') color = 0xffcc88

      const material = new THREE.MeshStandardMaterial({ 
        color,
        emissive: type === 'Star' ? color : 0x000000,
        emissiveIntensity: type === 'Star' ? 1.0 : 0.0
      })

      const mesh = new THREE.Mesh(geometry, material)
      
      if (sma && type !== 'Star') {
        const distance = parseFloat(sma) * 107.7 // 1 AU ≈ 107.7 visual units
        mesh.position.set(distance, 0, 0)
      }

      mesh.userData = { 
        name, 
        type, 
        period: parseFloat(period) || 0,
        sma: parseFloat(sma) || 0,
        radius: parseFloat(radius) || 0
      }

      this.solarSystem.add(mesh)
      this.celestialBodies.set(name, mesh)
    }
  }

  private getVisualRadius(radiusKm: number, type: string): number {
    if (type === 'Star') return 25.0
    if (radiusKm > 20000) return 9.0
    if (radiusKm > 3000) return 3.5
    if (type === 'Moon') return 1.0
    return 1.8
  }

  private async loadShip() {
    const loader = new OBJLoader()
    const components = [
      { file: 'CmdModule.obj', texture: 'panels_grey.JPG' },
      { file: 'HabWheel.obj', texture: 'AFRAM_BrushedMetal.jpg' },
      { file: 'IonDrive.obj', texture: 'MLI_new5.jpg' },
      { file: 'FuelModule.obj', texture: 'FuelTankGrid.jpg' },
      { file: 'SolarPanels_Left.obj', texture: 'SolarPanel.jpg' },
      { file: 'SolarPanels_Middle.obj', texture: 'SolarPanel.jpg' },
      { file: 'SolarPanels_Right.obj', texture: 'SolarPanel.jpg' },
      { file: 'Modules1.obj', texture: 'Hull3.jpg' },
      { file: 'Modules2.obj', texture: 'Hull3.jpg' },
      { file: 'Modules3.obj', texture: 'Hull3.jpg' },
      { file: 'Modules4.obj', texture: 'Hull.jpg' },
      { file: 'Modules5.obj', texture: 'Hull.jpg' },
      { file: 'SolarModules.obj', texture: 'SolarPanel.jpg' },
      { file: 'DishAnt.obj', texture: 'Hull.jpg' },
    ]

    const basePath = '/assets/models/Hermes/'

    for (const comp of components) {
      try {
        const obj = await loader.loadAsync(basePath + comp.file)
        
        // Apply texture if available
        const textureLoader = new THREE.TextureLoader()
        const texture = textureLoader.load(basePath + comp.texture)
        
        obj.traverse((child: THREE.Object3D) => {
          if (child instanceof THREE.Mesh) {
            child.material = new THREE.MeshStandardMaterial({ 
              map: texture,
              roughness: 0.7,
              metalness: 0.3
            })
          }
        })

        this.ship.add(obj)
      } catch (e) {
        console.warn(`Failed to load ${comp.file}:`, e)
      }
    }

    this.ship.scale.set(0.1, 0.1, 0.1)
  }

  private setupControls() {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key)
      
      // Thrust controls
      if (e.key === '+' || e.key === '=') {
        this.thrustPercent = Math.min(100, this.thrustPercent + this.THRUST_STEP)
      }
      if (e.key === '-') {
        this.thrustPercent = Math.max(0, this.thrustPercent - this.THRUST_STEP)
      }
      
      // Brake toggle
      if (e.key === 'b' || e.key === 'B') {
        this.brakesActive = !this.brakesActive
      }
    })

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key)
    })

    // Mouse controls for camera
    let isDragging = false
    let lastMouse = { x: 0, y: 0 }
    
    this.container.addEventListener('mousedown', (e) => {
      isDragging = true
      lastMouse = { x: e.clientX, y: e.clientY }
    })
    
    this.container.addEventListener('mousemove', (e) => {
      if (!isDragging) return
      const dx = e.clientX - lastMouse.x
      const dy = e.clientY - lastMouse.y
      
      this.camera.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), -dx * 0.005)
      this.camera.position.applyAxisAngle(new THREE.Vector3(1, 0, 0), -dy * 0.005)
      
      lastMouse = { x: e.clientX, y: e.clientY }
    })
    
    this.container.addEventListener('mouseup', () => {
      isDragging = false
    })
    
    this.container.addEventListener('wheel', (e) => {
      const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9
      this.camera.position.multiplyScalar(zoomFactor)
      this.camera.position.clampLength(2, 150)
    })
  }

  private onResize = () => {
    if (!this.container || !this.camera || !this.renderer) return
    
    const w = this.container.clientWidth
    const h = this.container.clientHeight
    
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
  }

  start() {
    this.isRunning = true
    this.animate()
  }

  private animate = () => {
    if (!this.isRunning) return
    
    requestAnimationFrame(this.animate)
    
    const deltaTime = Math.min(this.clock.getDelta(), 0.1)
    this.updatePhysics(deltaTime)
    this.updateOrbits(deltaTime)
    this.updateCamera()
    this.updateHUD()
    
    this.renderer.render(this.scene, this.camera)
    
    // Auto-save every 60 seconds
    if (Date.now() - this.lastSave > 60000) {
      this.saveState()
      this.lastSave = Date.now()
    }
  }

  private updatePhysics(deltaTime: number) {
    // Thrust/drag physics
    const thrustFraction = this.thrustPercent / 100
    const thrustAccel = thrustFraction * (this.BASE_SPEED / this.ACCEL_TIME)
    
    const speed = this.shipVelocity.length()
    const dragMultiplier = this.brakesActive ? 5.0 : 1.0
    const dragAccel = (this.BASE_SPEED / this.ACCEL_TIME) * Math.pow(speed / this.BASE_SPEED, 2) * dragMultiplier
    
    const netAccel = thrustAccel - dragAccel
    
    // Apply acceleration along ship's forward vector
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.shipQuaternion)
    this.shipVelocity.add(forward.multiplyScalar(netAccel * deltaTime))
    
    // Apply position update
    const displacement = this.shipVelocity.clone().multiplyScalar(deltaTime * 1000 * this.VISUAL_SCALE)
    this.ship.position.add(displacement)
    this.distanceTraveled += this.shipVelocity.length() * deltaTime
    
    // RCS Steering
    const yaw = (this.keys.has('ArrowLeft') ? 1 : 0) - (this.keys.has('ArrowRight') ? 1 : 0)
    const pitch = (this.keys.has('ArrowDown') ? 1 : 0) - (this.keys.has('ArrowUp') ? 1 : 0)
    
    if (yaw !== 0 || pitch !== 0) {
      this.angularVelocity.y += yaw * this.ANGULAR_ACCEL * deltaTime
      this.angularVelocity.x += pitch * this.ANGULAR_ACCEL * deltaTime
      
      // Clamp angular velocity
      this.angularVelocity.clampScalar(-this.MAX_ANGULAR_SPEED, this.MAX_ANGULAR_SPEED)
    } else {
      // Damping
      this.angularVelocity.multiplyScalar(this.ANGULAR_DAMPING)
    }
    
    // Apply rotation
    const yawQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.angularVelocity.y * deltaTime)
    const pitchQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), this.angularVelocity.x * deltaTime)
    
    this.shipQuaternion.multiply(yawQuat).multiply(pitchQuat)
    this.ship.quaternion.copy(this.shipQuaternion)
    
    // Brake animation
    const targetBrake = this.brakesActive ? 1.0 : 0.0
    this.brakeFactor += (targetBrake - this.brakeFactor) * 0.15
  }

  private updateOrbits(deltaTime: number) {
    this.simTime += deltaTime * this.timeWarp
    
    for (const body of this.celestialBodies.values()) {
      const data = body.userData
      if (!data.period || data.period === 0) continue
      
      const angle = (this.simTime / (data.period * 86400)) * Math.PI * 2
      const distance = data.sma * 107.7
      
      body.position.x = Math.cos(angle) * distance
      body.position.z = Math.sin(angle) * distance
    }
  }

  private updateCamera() {
    // Smooth follow
    const offset = this.camera.position.clone().sub(this.ship.position)
    const targetOffset = offset.clone().normalize().multiplyScalar(Math.min(offset.length(), 20))
    this.camera.position.copy(this.ship.position).add(targetOffset)
    this.camera.lookAt(this.ship.position)
  }

  private updateHUD() {
    // Find nearest body
    let nearestName = ''
    let nearestDist = Infinity
    
    for (const [name, body] of this.celestialBodies) {
      const dist = body.position.distanceTo(this.ship.position) / 107.7
      if (dist < nearestDist) {
        nearestDist = dist
        nearestName = name
      }
    }
    
    this.onHUDUpdate({
      speed: this.shipVelocity.length(),
      thrust: this.thrustPercent,
      coords: {
        x: Math.round(this.ship.position.x * 1000) / 1000,
        y: Math.round(this.ship.position.y * 1000) / 1000,
        z: Math.round(this.ship.position.z * 1000) / 1000,
      },
      distance: this.distanceTraveled,
      nearestBody: { name: nearestName, distance: nearestDist },
      panelStatus: this.brakesActive ? 'DEPLOYED' : 'RETRACTED',
      flashlight: false,
      headlights: false,
    })
  }

  private saveState() {
    const state = {
      distance: this.distanceTraveled,
      shipVelocity: this.shipVelocity.toArray(),
      shipPosition: this.ship.position.toArray(),
      shipQuaternion: this.shipQuaternion.toArray(),
      thrustPercent: this.thrustPercent,
      brakesActive: this.brakesActive,
      simTime: this.simTime,
      savedAt: Date.now(),
    }
    localStorage.setItem('caslino_spacesim_save', JSON.stringify(state))
  }

  private loadState() {
    const saved = localStorage.getItem('caslino_spacesim_save')
    if (!saved) return
    
    try {
      const state = JSON.parse(saved)
      if (state.shipPosition) this.ship.position.fromArray(state.shipPosition)
      if (state.shipQuaternion) this.shipQuaternion.fromArray(state.shipQuaternion)
      if (state.shipVelocity) this.shipVelocity.fromArray(state.shipVelocity)
      if (state.thrustPercent !== undefined) this.thrustPercent = state.thrustPercent
      if (state.brakesActive !== undefined) this.brakesActive = state.brakesActive
      if (state.simTime) this.simTime = state.simTime
      if (state.distance) this.distanceTraveled = state.distance
    } catch (e) {
      console.warn('Failed to load saved state:', e)
    }
  }

  destroy() {
    this.isRunning = false
    window.removeEventListener('resize', this.onResize)
    this.renderer.dispose()
    this.container.removeChild(this.renderer.domElement)
  }
}
