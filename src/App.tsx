import { useEffect, useRef, useState } from 'react'
import { SpaceEngine } from './engine/SpaceEngine'
import { HUD } from './components/HUD'
import { BootSequence } from './components/BootSequence'
import { CommandTerminal } from './components/CommandTerminal'
import { FlightManual } from './components/FlightManual'
import { MobileControls } from './components/MobileControls'
import { LoadingScreen } from './components/LoadingScreen'

function App() {
  const containerRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<SpaceEngine | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadProgress, setLoadProgress] = useState(0)
  const [loadStatus, setLoadStatus] = useState('INITIALIZING')
  const [bootComplete, setBootComplete] = useState(false)
  const [terminalOpen, setTerminalOpen] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const [showMobile, setShowMobile] = useState(false)
  const [hudData, setHudData] = useState({
    speed: 0,
    thrust: 0,
    coords: { x: 0, y: 0, z: 0 },
    distance: 0,
    nearestBody: { name: '', distance: 0 },
    panelStatus: 'RETRACTED',
    flashlight: false,
    headlights: false,
    target: null as string | null,
  })

  useEffect(() => {
    if (!containerRef.current || engineRef.current) return

    const engine = new SpaceEngine(containerRef.current, (data) => {
      setHudData(data)
    })
    engineRef.current = engine
    setShowMobile(engine.isMobileDevice())
    
    engine.setCommandCallback((cmd) => {
      if (cmd === '__OPEN__') setTerminalOpen(true)
      if (cmd === '__CLOSE__') setTerminalOpen(false)
    })
    
    // Simulate loading progress
    const steps = [
      { progress: 10, status: 'LOADING ASSETS' },
      { progress: 30, status: 'BUILDING STARFIELD' },
      { progress: 50, status: 'GENERATING SOLAR SYSTEM' },
      { progress: 70, status: 'LOADING SHIP MODEL' },
      { progress: 90, status: 'INITIALIZING AUDIO' },
      { progress: 100, status: 'READY' },
    ]
    
    let stepIndex = 0
    const progressInterval = setInterval(() => {
      if (stepIndex < steps.length) {
        setLoadProgress(steps[stepIndex].progress)
        setLoadStatus(steps[stepIndex].status)
        stepIndex++
      } else {
        clearInterval(progressInterval)
      }
    }, 400)
    
    engine.init().then(() => {
      setLoading(false)
    })

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === '?' || e.key === 'F1') && !terminalOpen) {
        e.preventDefault()
        setManualOpen(prev => !prev)
      }
      if (e.key === 'Escape') {
        setManualOpen(false)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      clearInterval(progressInterval)
      window.removeEventListener('keydown', handleKeyDown)
      engine.destroy()
      engineRef.current = null
    }
  }, [])

  const handleBootComplete = () => {
    setBootComplete(true)
    engineRef.current?.start()
  }

  const handleCommand = (cmd: string): string => {
    if (!engineRef.current) return 'Engine not initialized'
    return engineRef.current.executeCommand(cmd)
  }

  const handleThrustChange = (value: number) => {
    if (!engineRef.current) return
    engineRef.current.setThrustPercent(value)
  }

  const handleSteering = (yaw: number, pitch: number) => {
    if (!engineRef.current) return
    engineRef.current.setMobileSteering(yaw, pitch)
  }

  const handleBrakeToggle = () => {
    if (!engineRef.current) return
    engineRef.current.toggleBrakes()
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      
      {loading && (
        <LoadingScreen progress={loadProgress} status={loadStatus} />
      )}
      
      {!loading && !bootComplete && (
        <BootSequence onComplete={handleBootComplete} />
      )}
      
      {bootComplete && (
        <>
          <HUD 
            data={hudData} 
            onToggleAudio={() => engineRef.current?.getAudio().toggleMute()}
            onToggleManual={() => setManualOpen(prev => !prev)}
            onToggleTerminal={() => setTerminalOpen(prev => !prev)}
          />
          <CommandTerminal
            isOpen={terminalOpen}
            onExecute={handleCommand}
            onClose={() => setTerminalOpen(false)}
          />
          <FlightManual isOpen={manualOpen} onClose={() => setManualOpen(false)} />
          {showMobile && (
            <MobileControls
              onThrustChange={handleThrustChange}
              onSteering={handleSteering}
              onBrakeToggle={handleBrakeToggle}
            />
          )}
        </>
      )}
    </div>
  )
}

export default App
