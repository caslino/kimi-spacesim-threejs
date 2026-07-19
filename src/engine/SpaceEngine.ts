import * as THREE from 'three'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { AudioEngine } from './AudioEngine'
import { createStarShaderMaterial } from '../shaders/starShader'
import { IonExhaust } from './IonExhaust'
import { getStarAtSector, findNearestStar, STAR_TYPES } from './ProceduralStars'
import { showNotification } from '../components/Notifications'

export interface HUDData {
  speed: number
  thrust: number
  coords: { x: number; y: number; z: number }
  distance: number
  nearestBody: { name: string; distance: number }
  panelStatus: string
  flashlight: boolean
  headlights: boolean
  target: string | null
  perfMode: boolean
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
  
  private audio: AudioEngine
  private commandCallback: ((cmd: string) => void) | null = null
  private terminalOpen: boolean
  private flashlightEnabled: boolean
  private headlightsEnabled: boolean
  private rcsActive: boolean
  private targetBody: string | null = null
  private targetLockTime: number = 0
  private starMaterial: THREE.ShaderMaterial | null = null
  private mobileSteering: { yaw: number; pitch: number }
  private isMobile: boolean
  private perfMode: boolean = false
  
  // Lighting system
  private ambientLight!: THREE.AmbientLight
  private sunLight!: THREE.DirectionalLight
  private sunPoint!: THREE.PointLight
  private flashlight!: THREE.SpotLight
  private deepSpaceFactor: number = 0
  
  // Visual effects
  private ionExhaust: IonExhaust | null = null
  private proceduralStars: THREE.Group | null = null
  
  // Performance
  private starfieldPoints: THREE.Points | null = null
  
  private readonly BASE_SPEED = 50.0
  private readonly ACCEL_TIME = 30.0
  private readonly MAX_ANGULAR_SPEED = 8 * (Math.PI / 180)
  private readonly ANGULAR_ACCEL = 18 * (Math.PI / 180)
  private readonly ANGULAR_DAMPING = 0.85
  private readonly THRUST_STEP = 5
  private readonly VISUAL_SCALE = 0.00000072
  private readonly SOLAR_CULL_DISTANCE = 3.0 * 107.7 // 3 AU in visual units
  
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
    this.audio = new AudioEngine()
    this.terminalOpen = false
    this.flashlightEnabled = false
    this.headlightsEnabled = false
    this.rcsActive = false
    this.targetBody = null
    this.targetLockTime = 0
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    this.mobileSteering = { yaw: 0, pitch: 0 }
    this.perfMode = localStorage.getItem('caslino_spacesim_perf') === 'low'
  }

  async init() {
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: !this.perfMode,
      preserveDrawingBuffer: true 
    })
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.perfMode ? 1 : 2))
    this.renderer.setClearColor(0x000510)
    this.container.appendChild(this.renderer.domElement)

    this.scene = new THREE.Scene()
    this.scene.fog = new THREE.FogExp2(0x000510, this.perfMode ? 0.0001 : 0.00015)

    this.camera = new THREE.PerspectiveCamera(
      60,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      10000
    )
    this.camera.position.set(0, 5, 15)

    this.clock = new THREE.Clock()

    this.setupLighting()
    this.createStarfield()

    this.solarSystem = new THREE.Group()
    this.scene.add(this.solarSystem)
    await this.loadSolarSystem()
    this.createSaturnRings()

    this.ship = new THREE.Group()
    this.scene.add(this.ship)
    await this.loadShip()

    this.ionExhaust = new IonExhaust(this.scene)
    this.setupControls()
    window.addEventListener('resize', this.onResize)

    this.loadState()
  }

  private setupLighting() {
    // Near-star lighting
    this.ambientLight = new THREE.AmbientLight(0x1a2030, 0.2)
    this.scene.add(this.ambientLight)

    this.sunLight = new THREE.DirectionalLight(0xebf3ff, 3.0)
    this.sunLight.position.set(100, 0, 0)
    this.scene.add(this.sunLight)

    this.sunPoint = new THREE.PointLight(0xfffaed, 3.0, 0, 0)
    this.sunPoint.position.set(0, 0, 0)
    this.scene.add(this.sunPoint)

    // Flashlight
    this.flashlight = new THREE.SpotLight(0xffffff, 0, 50, Math.PI / 8, 0.45, 1)
    this.flashlight.position.set(0, 0, 0)
    this.flashlight.target.position.set(0, 0, -1)
    this.camera.add(this.flashlight)
    this.camera.add(this.flashlight.target)
  }

  private createStarfield() {
    const count = this.perfMode ? 3000 : 15000
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const scales = new Float32Array(count)
    const twinkleSpeeds = new Float32Array(count)

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
      
      scales[i] = 0.5 + Math.random() * 2.0
      twinkleSpeeds[i] = 0.5 + Math.random() * 2.0
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1))
    geometry.setAttribute('aTwinkleSpeed', new THREE.BufferAttribute(twinkleSpeeds, 1))

    this.starMaterial = createStarShaderMaterial()
    this.starfieldPoints = new THREE.Points(geometry, this.starMaterial)
    this.scene.add(this.starfieldPoints)
  }

  private async loadSolarSystem() {
    const response = await fetch('/starmap.csv')
    const csv = await response.text()
    const lines = csv.trim().split('\n').slice(1)

    for (const line of lines) {
      const [name, type, parent, sma, period, radius] = line.split(',')
      if (!name) continue

      const visualRadius = this.getVisualRadius(parseFloat(radius), type)
      const geometry = new THREE.SphereGeometry(visualRadius, this.perfMode ? 16 : 32, this.perfMode ? 16 : 32)
      
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
        emissiveIntensity: type === 'Star' ? 1.0 : 0.0,
        roughness: 0.8,
        metalness: 0.2,
      })

      const mesh = new THREE.Mesh(geometry, material)
      
      if (sma && type !== 'Star') {
        const distance = parseFloat(sma) * 107.7
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
      
      // Add ring marker
      if (type !== 'Star') {
        const ringGeo = new THREE.RingGeometry(visualRadius * 1.5, visualRadius * 1.6, 32)
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0x00ffc8,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.15,
        })
        const ring = new THREE.Mesh(ringGeo, ringMat)
        ring.rotation.x = Math.PI / 2
        mesh.add(ring)
      }
    }
  }

  private createSaturnRings() {
    const saturn = this.celestialBodies.get('Saturn')
    if (!saturn) return

    const ringGeometry = new THREE.RingGeometry(4.5, 7.5, 64)
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xc4a882,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6,
    })
    const rings = new THREE.Mesh(ringGeometry, ringMaterial)
    rings.rotation.x = Math.PI / 2
    saturn.add(rings)
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
      { file: 'CmdModule.obj', texture: 'panels_grey.JPG', lights: 2 },
      { file: 'HabWheel.obj', texture: 'AFRAM_BrushedMetal.jpg', rotating: true },
      { file: 'IonDrive.obj', texture: 'MLI_new5.jpg' },
      { file: 'FuelModule.obj', texture: 'FuelTankGrid.jpg', lights: 2 },
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

        // Add headlights for components that have them
        if (comp.lights && this.headlightsEnabled) {
          for (let i = 0; i < comp.lights; i++) {
            const spot = new THREE.SpotLight(0xffffff, 0, 20, Math.PI / 6, 0.3, 1)
            spot.position.set((i - comp.lights/2) * 0.5, 0, -0.5)
            obj.add(spot)
          }
        }

        // Rotating habitat wheel
        if (comp.rotating) {
          obj.userData.rotating = true
          obj.userData.rotationSpeed = 0.31416
        }

        this.ship.add(obj)
      } catch (e) {
        console.warn(`Failed to load ${comp.file}:`, e)
      }
    }

    this.ship.scale.set(0.1, 0.1, 0.1)
  }

  private setupControls() {
    window.addEventListener('keydown', (e) => {
      if (this.terminalOpen && e.key !== 'Escape') return
      
      this.keys.add(e.key)
      
      if (e.key === 'c' || e.key === 'C') {
        this.terminalOpen = !this.terminalOpen
        if (this.commandCallback) this.commandCallback(this.terminalOpen ? '__OPEN__' : '__CLOSE__')
      }
      
      if (e.key === 'f' || e.key === 'F') {
        this.flashlightEnabled = !this.flashlightEnabled
        this.flashlight.intensity = this.flashlightEnabled ? 2.2 : 0
        showNotification(`Flashlight ${this.flashlightEnabled ? 'ON' : 'OFF'}`, 'info')
      }
      
      if (e.key === 'h' || e.key === 'H') {
        this.headlightsEnabled = !this.headlightsEnabled
        showNotification(`Headlights ${this.headlightsEnabled ? 'ON' : 'OFF'}`, 'info')
      }
      
      if (e.key === 'm' || e.key === 'M') {
        const muted = this.audio.toggleMute()
        showNotification(muted ? 'Audio MUTED' : 'Audio ON', 'info')
      }
      
      if (e.key === '+' || e.key === '=') {
        this.thrustPercent = Math.min(100, this.thrustPercent + this.THRUST_STEP)
        this.audio.setThrust(this.thrustPercent)
      }
      if (e.key === '-') {
        this.thrustPercent = Math.max(0, this.thrustPercent - this.THRUST_STEP)
        this.audio.setThrust(this.thrustPercent)
      }
      
      if (e.key === 'b' || e.key === 'B') {
        this.brakesActive = !this.brakesActive
        showNotification(`Airbrakes ${this.brakesActive ? 'DEPLOYED' : 'RETRACTED'}`, this.brakesActive ? 'warning' : 'info')
      }
      
      if (e.key === 't' || e.key === 'T') {
        this.cycleTarget()
      }
      
      if (e.key === 'r' || e.key === 'R') {
        this.camera.position.set(0, 5, 15)
        showNotification('Camera reset', 'info')
      }
      
      if (e.key === 'l' || e.key === 'L') {
        this.toggleRecording()
      }
      
      if (e.key === 'p' || e.key === 'P') {
        this.togglePerfMode()
      }
      
      if (e.key === 'Escape') {
        if (this.terminalOpen) {
          this.terminalOpen = false
          if (this.commandCallback) this.commandCallback('__CLOSE__')
        }
      }
    })

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key)
    })

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
    this.updateLighting(deltaTime)
    this.updateEffects(deltaTime)
    this.updateHUD()
    
    this.renderer.render(this.scene, this.camera)
    
    if (this.starMaterial) {
      this.starMaterial.uniforms.uTime.value = this.clock.getElapsedTime()
    }
    
    if (Date.now() - this.lastSave > 60000) {
      this.saveState()
      this.lastSave = Date.now()
    }
  }

  private updatePhysics(deltaTime: number) {
    const thrustFraction = this.thrustPercent / 100
    const thrustAccel = thrustFraction * (this.BASE_SPEED / this.ACCEL_TIME)
    
    const speed = this.shipVelocity.length()
    const dragMultiplier = this.brakesActive ? 5.0 : 1.0
    const dragAccel = (this.BASE_SPEED / this.ACCEL_TIME) * Math.pow(speed / this.BASE_SPEED, 2) * dragMultiplier
    
    const netAccel = thrustAccel - dragAccel
    
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.shipQuaternion)
    this.shipVelocity.add(forward.multiplyScalar(netAccel * deltaTime))
    
    const displacement = this.shipVelocity.clone().multiplyScalar(deltaTime * 1000 * this.VISUAL_SCALE)
    this.ship.position.add(displacement)
    this.distanceTraveled += this.shipVelocity.length() * deltaTime
    
    const yaw = this.isMobile ? this.mobileSteering.yaw : (this.keys.has('ArrowLeft') ? 1 : 0) - (this.keys.has('ArrowRight') ? 1 : 0)
    const pitch = this.isMobile ? this.mobileSteering.pitch : (this.keys.has('ArrowDown') ? 1 : 0) - (this.keys.has('ArrowUp') ? 1 : 0)
    
    if ((yaw !== 0 || pitch !== 0) && !this.rcsActive) {
      this.rcsActive = true
      this.audio.playRCSThruster()
    } else if (yaw === 0 && pitch === 0) {
      this.rcsActive = false
    }
    
    if (yaw !== 0 || pitch !== 0) {
      this.angularVelocity.y += yaw * this.ANGULAR_ACCEL * deltaTime
      this.angularVelocity.x += pitch * this.ANGULAR_ACCEL * deltaTime
      this.angularVelocity.clampScalar(-this.MAX_ANGULAR_SPEED, this.MAX_ANGULAR_SPEED)
    } else {
      this.angularVelocity.multiplyScalar(this.ANGULAR_DAMPING)
    }
    
    const yawQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.angularVelocity.y * deltaTime)
    const pitchQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), this.angularVelocity.x * deltaTime)
    
    this.shipQuaternion.multiply(yawQuat).multiply(pitchQuat)
    this.ship.quaternion.copy(this.shipQuaternion)
    
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
    const offset = this.camera.position.clone().sub(this.ship.position)
    const targetOffset = offset.clone().normalize().multiplyScalar(Math.min(offset.length(), 20))
    this.camera.position.copy(this.ship.position).add(targetOffset)
    this.camera.lookAt(this.ship.position)
  }

  private updateLighting(deltaTime: number) {
    const distFromOrigin = this.ship.position.length()
    const targetDeepSpace = distFromOrigin > this.SOLAR_CULL_DISTANCE ? 1.0 : 0.0
    this.deepSpaceFactor += (targetDeepSpace - this.deepSpaceFactor) * 0.05
    
    // Solar system culling
    this.solarSystem.visible = this.deepSpaceFactor < 0.9
    
    // Transition lighting
    const ambientColor = new THREE.Color(0x1a2030).lerp(new THREE.Color(0x3d0f6e), this.deepSpaceFactor)
    this.ambientLight.color.copy(ambientColor)
    this.ambientLight.intensity = 0.2 + this.deepSpaceFactor * 0.6
    
    // Sun light intensity fades with distance
    const sunIntensity = 3.0 * (1 - this.deepSpaceFactor)
    this.sunLight.intensity = sunIntensity
    this.sunPoint.intensity = sunIntensity
  }

  private updateEffects(deltaTime: number) {
    // Update ion exhaust
    if (this.ionExhaust) {
      this.ionExhaust.update(this.thrustPercent, deltaTime, this.clock.getElapsedTime())
      this.ionExhaust.setPosition(this.ship.position, this.shipQuaternion)
    }
    
    // Rotate habitat wheel
    this.ship.children.forEach(child => {
      if (child.userData.rotating) {
        child.rotation.x += child.userData.rotationSpeed * deltaTime
      }
    })
    
    // Update starfield position (infinite parallax)
    if (this.starfieldPoints) {
      this.starfieldPoints.position.copy(this.ship.position)
      this.starfieldPoints.rotation.y += 0.0001
    }
  }

  private updateHUD() {
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
      flashlight: this.flashlightEnabled,
      headlights: this.headlightsEnabled,
      target: this.targetBody,
      perfMode: this.perfMode,
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
      perfMode: this.perfMode,
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
      if (state.perfMode !== undefined) this.perfMode = state.perfMode
      
      // Offline progression
      if (state.savedAt) {
        const elapsed = (Date.now() - state.savedAt) / 1000
        const maxOffline = 300 // Cap at 5 minutes
        const integrationTime = Math.min(elapsed, maxOffline)
        
        if (integrationTime > 0 && this.shipVelocity.length() > 0.01) {
          // Simple Euler integration for offline time
          const steps = Math.min(integrationTime, 300)
          const dt = integrationTime / steps
          const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.shipQuaternion)
          
          for (let i = 0; i < steps; i++) {
            this.ship.position.add(forward.clone().multiplyScalar(this.shipVelocity.length() * dt * 1000 * this.VISUAL_SCALE))
            this.distanceTraveled += this.shipVelocity.length() * dt
          }
          
          showNotification(`Offline: Advanced ${integrationTime.toFixed(0)}s`, 'info')
        }
      }
    } catch (e) {
      console.warn('Failed to load saved state:', e)
    }
  }

  private toggleRecording() {
    showNotification('Recording not yet implemented', 'warning')
  }

  private togglePerfMode() {
    this.perfMode = !this.perfMode
    localStorage.setItem('caslino_spacesim_perf', this.perfMode ? 'low' : 'high')
    showNotification(`Performance mode: ${this.perfMode ? 'LOW' : 'HIGH'}`, 'info')
    
    // Update renderer settings
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.perfMode ? 1 : 2))
    
    // Update starfield
    if (this.starfieldPoints) {
      const geometry = this.starfieldPoints.geometry
      const positions = geometry.attributes.position
      const count = this.perfMode ? 3000 : 15000
      geometry.setDrawRange(0, count)
    }
  }

  setCommandCallback(callback: (cmd: string) => void) {
    this.commandCallback = callback
  }

  setMobileSteering(yaw: number, pitch: number) {
    this.mobileSteering = { yaw, pitch }
  }

  setThrustPercent(value: number) {
    this.thrustPercent = Math.max(0, Math.min(100, value))
    this.audio.setThrust(this.thrustPercent)
  }

  toggleBrakes() {
    this.brakesActive = !this.brakesActive
  }

  getAudio(): AudioEngine {
    return this.audio
  }

  setTarget(name: string | null) {
    this.targetBody = name
    this.targetLockTime = name ? Date.now() : 0
    if (name) {
      this.audio.playSonarPing()
      showNotification(`Target: ${name}`, 'success')
    }
  }

  cycleTarget() {
    const bodies = Array.from(this.celestialBodies.keys())
    if (bodies.length === 0) return
    
    const currentIndex = this.targetBody ? bodies.indexOf(this.targetBody) : -1
    const nextIndex = (currentIndex + 1) % bodies.length
    this.setTarget(bodies[nextIndex])
  }

  getTarget(): string | null {
    return this.targetBody
  }

  executeCommand(cmd: string): string {
    const parts = cmd.trim().split(/\s+/)
    const command = parts[0].toLowerCase()
    
    switch (command) {
      case 'spawn':
        if (parts[1] === 'star') {
          const typeName = parts[2]
          const starType = STAR_TYPES.find(t => t.name.toLowerCase() === typeName?.toLowerCase())
          
          if (starType) {
            // Spawn procedural star ahead of ship
            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.shipQuaternion)
            const spawnPos = this.ship.position.clone().add(forward.multiplyScalar(500))
            
            const size = starType.sizeRange[0] + Math.random() * (starType.sizeRange[1] - starType.sizeRange[0])
            const geometry = new THREE.SphereGeometry(size, 32, 32)
            const material = new THREE.MeshStandardMaterial({
              color: starType.color,
              emissive: starType.color,
              emissiveIntensity: 2.0,
            })
            const mesh = new THREE.Mesh(geometry, material)
            mesh.position.copy(spawnPos)
            mesh.userData = { name: starType.name, type: 'ProceduralStar' }
            
            this.scene.add(mesh)
            this.celestialBodies.set(starType.name, mesh)
            
            showNotification(`Spawned ${starType.name}`, 'success')
            return `Spawned ${starType.name} at ${spawnPos.x.toFixed(0)}, ${spawnPos.y.toFixed(0)}, ${spawnPos.z.toFixed(0)}`
          }
          
          return 'Usage: spawn star [type] - Available types: M_RedDwarf, K_OrangeDwarf, G_YellowDwarf, F_YellowWhite, A_White, B_BlueWhite, O_BlueGiant, NeutronStar, BlackHole'
        }
        if (parts.length === 4) {
          const x = parseFloat(parts[1])
          const y = parseFloat(parts[2])
          const z = parseFloat(parts[3])
          this.ship.position.set(x, y, z)
          showNotification(`Teleported to ${x}, ${y}, ${z}`, 'success')
          return `Teleported to ${x}, ${y}, ${z}`
        }
        return 'Usage: spawn [x] [y] [z] | spawn star [type]'
        
      case 'speed':
        if (parts[1]) {
          const speed = parseFloat(parts[1])
          this.shipVelocity.setLength(speed * this.VISUAL_SCALE)
          showNotification(`Speed: ${speed} km/s`, 'info')
          return `Speed set to ${speed} km/s`
        }
        return 'Usage: speed [km/s]'
        
      case 'warp':
        if (parts[1]) {
          this.timeWarp = parseFloat(parts[1])
          showNotification(`Time warp: ${this.timeWarp}x`, 'info')
          return `Time warp set to ${this.timeWarp}x`
        }
        return 'Usage: warp [multiplier]'
        
      case 'clear':
        return '__CLEAR__'
        
      case 'close':
        this.terminalOpen = false
        if (this.commandCallback) this.commandCallback('__CLOSE__')
        return 'Terminal closed'
        
      default:
        return `Unknown command: ${command}`
    }
  }

  isTerminalOpen(): boolean {
    return this.terminalOpen
  }

  isMobileDevice(): boolean {
    return this.isMobile
  }

  destroy() {
    this.isRunning = false
    window.removeEventListener('resize', this.onResize)
    this.audio.destroy()
    this.ionExhaust?.destroy()
    this.renderer.dispose()
    this.container.removeChild(this.renderer.domElement)
  }
}
