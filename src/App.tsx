import { useEffect, useRef, useState } from 'react'
import { SpaceEngine } from './engine/SpaceEngine'
import { HUD } from './components/HUD'
import { BootSequence } from './components/BootSequence'

function App() {
  const containerRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<SpaceEngine | null>(null)
  const [bootComplete, setBootComplete] = useState(false)
  const [hudData, setHudData] = useState({
    speed: 0,
    thrust: 0,
    coords: { x: 0, y: 0, z: 0 },
    distance: 0,
    nearestBody: { name: '', distance: 0 },
    panelStatus: 'RETRACTED',
    flashlight: false,
    headlights: false,
  })

  useEffect(() => {
    if (!containerRef.current || engineRef.current) return

    const engine = new SpaceEngine(containerRef.current, (data) => {
      setHudData(data)
    })
    engineRef.current = engine
    engine.init()

    return () => {
      engine.destroy()
      engineRef.current = null
    }
  }, [])

  const handleBootComplete = () => {
    setBootComplete(true)
    engineRef.current?.start()
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      
      {!bootComplete && (
        <BootSequence onComplete={handleBootComplete} />
      )}
      
      {bootComplete && (
        <HUD data={hudData} />
      )}
    </div>
  )
}

export default App
