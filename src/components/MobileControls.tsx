import { useEffect, useRef } from 'react'

interface MobileControlsProps {
  onThrustChange: (value: number) => void
  onSteering: (yaw: number, pitch: number) => void
  onBrakeToggle: () => void
}

export function MobileControls({ onThrustChange, onSteering, onBrakeToggle }: MobileControlsProps) {
  const touchRef = useRef<{ id: number; startX: number; startY: number } | null>(null)
  const thrustRef = useRef<HTMLDivElement>(null)

  const handleSteeringStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    touchRef.current = { id: touch.identifier, startX: touch.clientX, startY: touch.clientY }
  }

  const handleSteeringMove = (e: React.TouchEvent) => {
    if (!touchRef.current) return
    const touch = Array.from(e.touches).find(t => t.identifier === touchRef.current!.id)
    if (!touch) return

    const dx = touch.clientX - touchRef.current.startX
    const dy = touch.clientY - touchRef.current.startY
    
    const yaw = Math.max(-1, Math.min(1, dx / 50))
    const pitch = Math.max(-1, Math.min(1, dy / 50))
    
    onSteering(yaw, -pitch)
  }

  const handleSteeringEnd = () => {
    touchRef.current = null
    onSteering(0, 0)
  }

  const handleThrust = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    if (!thrustRef.current) return
    
    const rect = thrustRef.current.getBoundingClientRect()
    const y = touch.clientY - rect.top
    const pct = Math.max(0, Math.min(100, 100 - (y / rect.height) * 100))
    onThrustChange(pct)
  }

  const handleThrustEnd = () => {
    onThrustChange(0)
  }

  return (
    <div style={styles.container}>
      {/* Steering Pad - Left */}
      <div
        style={styles.steeringPad}
        onTouchStart={handleSteeringStart}
        onTouchMove={handleSteeringMove}
        onTouchEnd={handleSteeringEnd}
      >
        <div style={styles.padLabel}>STEER</div>
      </div>

      {/* Thrust Slider - Right */}
      <div
        ref={thrustRef}
        style={styles.thrustSlider}
        onTouchStart={handleThrust}
        onTouchMove={handleThrust}
        onTouchEnd={handleThrustEnd}
      >
        <div style={styles.thrustLabel}>THRUST</div>
      </div>

      {/* Brake Button */}
      <button
        style={styles.brakeBtn}
        onTouchStart={onBrakeToggle}
      >
        BRAKE
      </button>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: 20,
  },
  steeringPad: {
    position: 'absolute',
    bottom: '40px',
    left: '40px',
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    border: '2px solid rgba(0, 255, 200, 0.3)',
    background: 'rgba(0, 255, 200, 0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'auto',
    touchAction: 'none',
  },
  padLabel: {
    color: 'rgba(0, 255, 200, 0.5)',
    fontSize: '10px',
    fontFamily: "'Orbitron', sans-serif",
    letterSpacing: '2px',
  },
  thrustSlider: {
    position: 'absolute',
    bottom: '40px',
    right: '40px',
    width: '60px',
    height: '200px',
    border: '2px solid rgba(0, 255, 200, 0.3)',
    background: 'rgba(0, 255, 200, 0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'auto',
    touchAction: 'none',
  },
  thrustLabel: {
    color: 'rgba(0, 255, 200, 0.5)',
    fontSize: '10px',
    fontFamily: "'Orbitron', sans-serif",
    letterSpacing: '2px',
    writingMode: 'vertical-rl',
  },
  brakeBtn: {
    position: 'absolute',
    bottom: '40px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '100px',
    height: '50px',
    border: '2px solid rgba(255, 50, 50, 0.5)',
    background: 'rgba(255, 50, 50, 0.1)',
    color: 'rgba(255, 50, 50, 0.8)',
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '12px',
    letterSpacing: '2px',
    pointerEvents: 'auto',
  },
}
