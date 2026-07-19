import { useState, useEffect } from 'react'

interface BootSequenceProps {
  onComplete: () => void
}

export function BootSequence({ onComplete }: BootSequenceProps) {
  const [progress, setProgress] = useState(0)
  const [logs, setLogs] = useState<string[]>([])
  const [showButton, setShowButton] = useState(false)

  const bootLogs = [
    'Initializing Voyager Flight System...',
    'Loading kernel modules...',
    'Mounting virtual filesystem...',
    'Initializing WebGL renderer...',
    'Loading celestial body database...',
    'Loading Hermes vessel configuration...',
    'Compiling shader programs...',
    'Initializing orbital mechanics engine...',
    'Calibrating sensors...',
    'Establishing telemetry link...',
    'Systems nominal.',
  ]

  useEffect(() => {
    let currentLog = 0
    const interval = setInterval(() => {
      if (currentLog < bootLogs.length) {
        setLogs(prev => [...prev, bootLogs[currentLog]])
        currentLog++
        setProgress(Math.min(100, (currentLog / bootLogs.length) * 100 + Math.random() * 8))
      } else {
        setProgress(100)
        setShowButton(true)
        clearInterval(interval)
      }
    }, 300)

    return () => clearInterval(interval)
  }, [])

  return (
    <div style={styles.overlay}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={{ fontSize: '24px', fontWeight: 700, fontFamily: "'Orbitron', sans-serif" }}>
            VOYAGER FLIGHT SYSTEM
          </div>
          <div style={{ fontSize: '11px', opacity: 0.5, letterSpacing: '4px' }}>
            PROCEDURAL UNIVERSE v1.0.4
          </div>
        </div>

        <div style={styles.logContainer}>
          {logs.map((log, i) => (
            <div key={i} style={styles.logLine}>
              <span style={{ opacity: 0.4, marginRight: '8px' }}>[{String(i + 1).padStart(2, '0')}]</span>
              {log}
            </div>
          ))}
          <div style={{ ...styles.logLine, opacity: 0.4 }}>_</div>
        </div>

        <div style={styles.progressBar}>
          <div style={{ ...styles.progressFill, width: `${progress}%` }} />
        </div>

        <div style={styles.progressText}>{progress.toFixed(1)}%</div>

        {showButton && (
          <button style={styles.enterButton} onClick={onComplete}>
            ENTER FLIGHT DECK
          </button>
        )}
      </div>
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
    background: 'linear-gradient(180deg, #000510 0%, #001220 50%, #000510 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  container: {
    width: '600px',
    maxWidth: '90%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '24px',
  },
  header: {
    textAlign: 'center',
    color: '#00ffc8',
  },
  logContainer: {
    width: '100%',
    height: '200px',
    overflow: 'hidden',
    background: 'rgba(0, 10, 20, 0.8)',
    border: '1px solid rgba(0, 255, 200, 0.2)',
    padding: '16px',
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: '12px',
    lineHeight: '1.6',
    color: '#00ffc8',
  },
  logLine: {
    animation: 'fadeIn 0.2s ease-out',
  },
  progressBar: {
    width: '100%',
    height: '4px',
    background: 'rgba(0, 255, 200, 0.1)',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #00ffc8, #00a8ff)',
    transition: 'width 0.3s ease-out',
  },
  progressText: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: '12px',
    color: '#00ffc8',
    opacity: 0.6,
  },
  enterButton: {
    marginTop: '16px',
    padding: '12px 32px',
    background: 'transparent',
    border: '1px solid #00ffc8',
    color: '#00ffc8',
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '14px',
    letterSpacing: '2px',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
}
