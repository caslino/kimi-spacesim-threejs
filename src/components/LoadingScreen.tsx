import { useEffect, useState } from 'react'

interface LoadingScreenProps {
  progress: number
  status: string
}

export function LoadingScreen({ progress, status }: LoadingScreenProps) {
  const [dots, setDots] = useState('')

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.')
    }, 500)
    return () => clearInterval(interval)
  }, [])

  return (
    <div style={styles.overlay}>
      <div style={styles.container}>
        <div style={styles.title}>VOYAGER</div>
        <div style={styles.subtitle}>FLIGHT SYSTEM</div>
        
        <div style={styles.progressBar}>
          <div style={{...styles.progressFill, width: `${progress}%`}} />
        </div>
        
        <div style={styles.status}>{status}{dots}</div>
        <div style={styles.percent}>{Math.round(progress)}%</div>
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
    background: '#000510',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  container: {
    textAlign: 'center',
  },
  title: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '48px',
    color: '#00ffc8',
    letterSpacing: '12px',
    textShadow: '0 0 20px rgba(0, 255, 200, 0.5)',
  },
  subtitle: {
    fontFamily: "'Rajdhani', sans-serif",
    fontSize: '14px',
    color: '#00ffc8',
    letterSpacing: '8px',
    marginBottom: '40px',
    opacity: 0.6,
  },
  progressBar: {
    width: '300px',
    height: '2px',
    background: 'rgba(0, 255, 200, 0.1)',
    margin: '0 auto 16px',
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    background: '#00ffc8',
    boxShadow: '0 0 10px rgba(0, 255, 200, 0.5)',
    transition: 'width 0.3s ease',
  },
  status: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: '12px',
    color: '#00ffc8',
    opacity: 0.6,
    letterSpacing: '2px',
  },
  percent: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: '11px',
    color: '#00ffc8',
    opacity: 0.4,
    marginTop: '8px',
  },
}
