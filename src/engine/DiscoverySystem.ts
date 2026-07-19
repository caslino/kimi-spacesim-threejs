import { showNotification } from '../components/Notifications'

export interface Discovery {
  name: string
  type: string
  scannedAt: number
  distance: number
}

export interface Mission {
  id: number
  title: string
  description: string
  target: string
  completed: boolean
  reward: string
}

export class DiscoverySystem {
  private discoveries: Map<string, Discovery> = new Map()
  private missions: Mission[] = []
  private missionIdCounter = 0
  
  constructor() {
    this.generateMissions()
  }
  
  private generateMissions() {
    this.missions = [
      {
        id: ++this.missionIdCounter,
        title: 'First Contact',
        description: 'Scan Earth to calibrate sensors',
        target: 'Earth',
        completed: false,
        reward: 'Sensor upgrade',
      },
      {
        id: ++this.missionIdCounter,
        title: 'Red Planet',
        description: 'Scan Mars for geological data',
        target: 'Mars',
        completed: false,
        reward: 'Navigation data',
      },
      {
        id: ++this.missionIdCounter,
        title: 'Gas Giant',
        description: 'Scan Jupiter for atmospheric readings',
        target: 'Jupiter',
        completed: false,
        reward: 'Fuel efficiency +10%',
      },
      {
        id: ++this.missionIdCounter,
        title: 'Ring World',
        description: 'Scan Saturn\'s ring system',
        target: 'Saturn',
        completed: false,
        reward: 'Shield upgrade',
      },
      {
        id: ++this.missionIdCounter,
        title: 'Solar Survey',
        description: 'Scan all major planets',
        target: 'ALL_PLANETS',
        completed: false,
        reward: 'Warp drive upgrade',
      },
    ]
  }
  
  scanBody(name: string, type: string, distance: number): boolean {
    if (this.discoveries.has(name)) {
      return false // Already scanned
    }
    
    const discovery: Discovery = {
      name,
      type,
      scannedAt: Date.now(),
      distance,
    }
    
    this.discoveries.set(name, discovery)
    showNotification(`Discovered: ${name}`, 'success')
    
    // Check missions
    this.checkMissions()
    
    return true
  }
  
  private checkMissions() {
    for (const mission of this.missions) {
      if (mission.completed) continue
      
      if (mission.target === 'ALL_PLANETS') {
        const planets = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune']
        const allScanned = planets.every(p => this.discoveries.has(p))
        if (allScanned) {
          mission.completed = true
          showNotification(`Mission Complete: ${mission.title}! Reward: ${mission.reward}`, 'success')
        }
      } else if (this.discoveries.has(mission.target)) {
        mission.completed = true
        showNotification(`Mission Complete: ${mission.title}! Reward: ${mission.reward}`, 'success')
      }
    }
  }
  
  getDiscoveries(): Discovery[] {
    return Array.from(this.discoveries.values())
  }
  
  getMissions(): Mission[] {
    return this.missions
  }
  
  getScanCount(): number {
    return this.discoveries.size
  }
  
  isScanned(name: string): boolean {
    return this.discoveries.has(name)
  }
}
