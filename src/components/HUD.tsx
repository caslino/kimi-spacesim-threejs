import { HUDData } from '../engine/SpaceEngine'

interface HUDProps {
  data: HUDData
}

export function HUD({ data }: HUDProps) {
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
          <div style={styles.label}>SCANNER</div>
          <div style={{ ...styles.value, fontSize: '11px' }}>
            {data.nearestBody.name || 'SCANNING...'}<br/>
            {data.nearestBody.distance > 0 ? `${data.nearestBody.distance.toFixed(2)} AU` : ''}
          </div>
        </div>
      </div>
      
      {/* Top Right Controls */}
      <div style={styles.topRight}>
        <button style={styles.iconButton}>🔇</button>
        <button style={styles.iconButton}>?</button>
        <button style={styles.iconButton}>⚡</button>
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
  bottomCenter: {
    position: 'absolute',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    textAlign: 'center',
  },
}
