import { HUDData } from '../engine/SpaceEngine'

interface HUDProps {
  data: HUDData
  onToggleAudio?: () => void
  onToggleManual?: () => void
  onToggleTerminal?: () => void
}

export function HUD({ data, onToggleAudio, onToggleManual, onToggleTerminal }: HUDProps) {
  return (
    <div style={styles.container}>
      {/* Left Panel */}
      <div style={styles.leftPanel}>
        <div style={styles.shipName}>
          <div style={{ fontSize: '10px', opacity: 0.6, letterSpacing: '2px' }}>VOYAGER FLIGHT SYSTEM</div>
          <div style={{ fontSize: '14px', fontWeight: 700, fontFamily: "'Orbitron', sans-serif" }}>HERMES</div>
        </div>
        
        <div style={styles.readout}>
          <div style={styles.label}>SPEED</div>
          <div style={styles.value}>{data.speed.toFixed(1)} <span style={styles.unit}>km/s</span></div>
        </div>
        
        <div style={styles.readout}>
          <div style={styles.label}>THRUST</div>
          <div style={styles.value}>{data.thrust}%</div>
        </div>
        
        <div style={styles.readout}>
          <div style={styles.label}>COORDINATES</div>
          <div style={{ ...styles.value, fontSize: '11px', fontFamily: "'Share Tech Mono', monospace" }}>
            X: {data.coords.x.toFixed(2)}<br/>
            Y: {data.coords.y.toFixed(2)}<br/>
            Z: {data.coords.z.toFixed(2)}
          </div>
        </div>
        
        <div style={styles.readout}>
          <div style={styles.label}>DISTANCE</div>
          <div style={styles.value}>{(data.distance / 1.496e8).toFixed(4)} <span style={styles.unit}>AU</span></div>
        </div>
        
        <div style={styles.readout}>
          <div style={styles.label}>SOLAR PANELS</div>
          <div style={{ ...styles.value, color: data.panelStatus === 'DEPLOYED' ? '#ff4444' : '#44ff44' }}>
            {data.panelStatus}
          </div>
        </div>
        
        <div style={styles.readout}>
          <div style={styles.label}>TARGET</div>
          <div style={{ ...styles.value, fontSize: '11px', color: data.target ? '#ffaa00' : '#00ffc8' }}>
            {data.target || 'NONE'}<br/>
            {data.target && data.nearestBody.name === data.target ? `${data.nearestBody.distance.toFixed(2)} AU` : ''}
          </div>
        </div>
      </div>
      
      {/* Top Right Controls */}
      <div style={styles.topRight}>
        <button style={styles.iconButton} onClick={onToggleAudio} title="Toggle Audio">🔇</button>
        <button style={styles.iconButton} onClick={onToggleManual} title="Flight Manual">?</button>
        <button style={styles.iconButton} onClick={onToggleTerminal} title="Command Terminal">⚡</button>
      </div>
      
      {/* Scanner Visualization - Bottom Right */}
      <div style={styles.scanner}>
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="55" fill="none" stroke="rgba(0,255,200,0.2)" strokeWidth="1" />
          <circle cx="60" cy="60" r="35" fill="none" stroke="rgba(0,255,200,0.15)" strokeWidth="1" />
          <circle cx="60" cy="60" r="15" fill="none" stroke="rgba(0,255,200,0.1)" strokeWidth="1" />
          <line x1="60" y1="5" x2="60" y2="115" stroke="rgba(0,255,200,0.1)" strokeWidth="1" />
          <line x1="5" y1="60" x2="115" y2="60" stroke="rgba(0,255,200,0.1)" strokeWidth="1" />
          {/* Scanner sweep */}
          <line x1="60" y1="60" x2="115" y2="60" stroke="rgba(0,255,200,0.4)" strokeWidth="1" transform="rotate(45 60 60)">
            <animateTransform attributeName="transform" type="rotate" from="0 60 60" to="360 60 60" dur="4s" repeatCount="indefinite" />
          </line>
        </svg>
      </div>
      
      {/* Velocity Vector - Center */}
      <div style={styles.velocityVector}>
        <div style={{
          width: '2px',
          height: `${Math.min(60, data.speed * 2)}px`,
          background: 'linear-gradient(to top, transparent, #00ffc8)',
          transform: `rotate(${data.speed > 0 ? 0 : 180}deg)`,
          transition: 'height 0.2s',
        }} />
      </div>
      
      {/* Bottom Center Help Text */}
      <div style={styles.bottomCenter}>
        <span style={{ opacity: 0.5, fontSize: '11px' }}>
          ↑↓←→ STEER | + - THRUST | B BRAKES | DRAG ORBIT
        </span>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: 10,
  },
  leftPanel: {
    position: 'absolute',
    top: '20px',
    left: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    pointerEvents: 'auto',
  },
  shipName: {
    marginBottom: '8px',
    paddingBottom: '8px',
    borderBottom: '1px solid rgba(0, 255, 200, 0.3)',
  },
  readout: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  label: {
    fontSize: '9px',
    letterSpacing: '2px',
    opacity: 0.5,
    fontWeight: 500,
  },
  value: {
    fontSize: '16px',
    fontWeight: 600,
    fontFamily: "'Share Tech Mono', monospace",
    color: '#00ffc8',
  },
  unit: {
    fontSize: '10px',
    opacity: 0.6,
    marginLeft: '4px',
  },
  topRight: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    display: 'flex',
    gap: '8px',
    pointerEvents: 'auto',
  },
  iconButton: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    border: '1px solid rgba(0, 255, 200, 0.4)',
    background: 'rgba(0, 20, 30, 0.8)',
    color: '#00ffc8',
    cursor: 'pointer',
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanner: {
    position: 'absolute',
    bottom: '80px',
    right: '20px',
    opacity: 0.6,
  },
  velocityVector: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  bottomCenter: {
    position: 'absolute',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    textAlign: 'center',
  },
}
