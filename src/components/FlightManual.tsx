import { useState } from 'react'

interface FlightManualProps {
  isOpen: boolean
  onClose: () => void
}

export function FlightManual({ isOpen, onClose }: FlightManualProps) {
  const [activeTab, setActiveTab] = useState<'controls' | 'commands' | 'about'>('controls')

  if (!isOpen) return null

  return (
    <div style={styles.overlay} onClick={(e) => {
      if (e.target === e.currentTarget) onClose()
    }}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <span>FLIGHT MANUAL v1.0.4</span>
          <button style={styles.closeBtn} onClick={onClose}>×</button>
        </div>
        
        <div style={styles.tabs}>
          <button 
            style={{...styles.tab, ...(activeTab === 'controls' ? styles.tabActive : {})}}
            onClick={() => setActiveTab('controls')}
          >
            CONTROLS
          </button>
          <button 
            style={{...styles.tab, ...(activeTab === 'commands' ? styles.tabActive : {})}}
            onClick={() => setActiveTab('commands')}
          >
            COMMANDS
          </button>
          <button 
            style={{...styles.tab, ...(activeTab === 'about' ? styles.tabActive : {})}}
            onClick={() => setActiveTab('about')}
          >
            ABOUT
          </button>
        </div>
        
        <div style={styles.content}>
          {activeTab === 'controls' && (
            <div>
              <Section title="THRUST">
                <KeyBinding keys={['+', '-']} desc="Increase/decrease thrust" />
                <KeyBinding keys={['0']} desc="Cut engines" />
              </Section>
              <Section title="RCS STEERING">
                <KeyBinding keys={['Arrow Keys']} desc="Pitch/yaw control" />
              </Section>
              <Section title="BRAKES">
                <KeyBinding keys={['B']} desc="Toggle airbrakes" />
              </Section>
              <Section title="LIGHTING">
                <KeyBinding keys={['F']} desc="Toggle flashlight" />
                <KeyBinding keys={['H']} desc="Toggle headlights" />
              </Section>
              <Section title="CAMERA">
                <KeyBinding keys={['Mouse Drag']} desc="Orbit camera" />
                <KeyBinding keys={['Scroll']} desc="Zoom in/out" />
                <KeyBinding keys={['R']} desc="Reset camera" />
              </Section>
              <Section title="SYSTEM">
                <KeyBinding keys={['C']} desc="Open command terminal" />
                <KeyBinding keys={['M']} desc="Toggle audio" />
                <KeyBinding keys={['ESC']} desc="Close terminal/modals" />
              </Section>
            </div>
          )}
          
          {activeTab === 'commands' && (
            <div>
              <Section title="NAVIGATION">
                <Command cmd="spawn [x] [y] [z]" desc="Teleport ship to coordinates" />
                <Command cmd="speed [km/s]" desc="Set ship velocity" />
              </Section>
              <Section title="SIMULATION">
                <Command cmd="warp [multiplier]" desc="Set time warp speed" />
                <Command cmd="clear" desc="Clear terminal history" />
                <Command cmd="close" desc="Close terminal" />
              </Section>
            </div>
          )}
          
          {activeTab === 'about' && (
            <div style={{ textAlign: 'center', paddingTop: '40px' }}>
              <div style={{ fontSize: '24px', fontFamily: "'Orbitron', sans-serif", marginBottom: '16px' }}>
                VOYAGER FLIGHT SYSTEM
              </div>
              <div style={{ color: '#00ffc8', marginBottom: '24px' }}>Version 1.0.4</div>
              <div style={{ opacity: 0.6, lineHeight: '1.6' }}>
                A browser-based 3D space simulation<br />
                Built with React + Three.js<br />
                <br />
                Ship model: NASA Hermes (The Martian)<br />
                Star data: Hipparcos + Gliese catalogs<br />
                <br />
                <span style={{ color: '#00ffc8' }}>Press [F1] or [?] for this manual</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={styles.sectionTitle}>{title}</div>
      {children}
    </div>
  )
}

function KeyBinding({ keys, desc }: { keys: string[]; desc: string }) {
  return (
    <div style={styles.row}>
      <div style={styles.keys}>
        {keys.map(k => (
          <span key={k} style={styles.key}>{k}</span>
        ))}
      </div>
      <span style={styles.desc}>{desc}</span>
    </div>
  )
}

function Command({ cmd, desc }: { cmd: string; desc: string }) {
  return (
    <div style={styles.row}>
      <code style={styles.cmd}>{cmd}</code>
      <span style={styles.desc}>{desc}</span>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'rgba(0, 5, 16, 0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 60,
  },
  modal: {
    width: '600px',
    maxWidth: '90%',
    height: '500px',
    background: 'rgba(0, 10, 20, 0.95)',
    border: '1px solid rgba(0, 255, 200, 0.3)',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: "'Rajdhani', sans-serif",
    fontSize: '14px',
  },
  header: {
    padding: '12px 16px',
    borderBottom: '1px solid rgba(0, 255, 200, 0.2)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: '#00ffc8',
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '13px',
    letterSpacing: '2px',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#00ffc8',
    fontSize: '24px',
    cursor: 'pointer',
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid rgba(0, 255, 200, 0.2)',
  },
  tab: {
    flex: 1,
    padding: '10px',
    background: 'none',
    border: 'none',
    color: '#888',
    cursor: 'pointer',
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '11px',
    letterSpacing: '1px',
    transition: 'color 0.2s',
  },
  tabActive: {
    color: '#00ffc8',
    borderBottom: '2px solid #00ffc8',
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: '20px',
    color: '#fff',
  },
  sectionTitle: {
    color: '#00ffc8',
    fontSize: '11px',
    letterSpacing: '2px',
    marginBottom: '8px',
    opacity: 0.7,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '6px 0',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  keys: {
    display: 'flex',
    gap: '4px',
    minWidth: '120px',
  },
  key: {
    background: 'rgba(0, 255, 200, 0.1)',
    border: '1px solid rgba(0, 255, 200, 0.3)',
    padding: '2px 8px',
    borderRadius: '3px',
    fontSize: '11px',
    fontFamily: "'Share Tech Mono', monospace",
    color: '#00ffc8',
  },
  cmd: {
    background: 'rgba(0, 255, 200, 0.05)',
    padding: '3px 8px',
    borderRadius: '3px',
    fontSize: '12px',
    fontFamily: "'Share Tech Mono', monospace",
    color: '#00ffc8',
    minWidth: '200px',
  },
  desc: {
    opacity: 0.7,
  },
}
