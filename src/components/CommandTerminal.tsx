import { useState, useRef, useEffect } from 'react'

interface CommandTerminalProps {
  isOpen: boolean
  onExecute: (cmd: string) => string
  onClose: () => void
}

export function CommandTerminal({ isOpen, onExecute, onClose }: CommandTerminalProps) {
  const [history, setHistory] = useState<string[]>(['VOYAGER FLIGHT SYSTEM v1.0.4', 'Type "help" for available commands', '>'])
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const historyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight
    }
  }, [history])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const result = onExecute(input)
    
    if (result === '__CLEAR__') {
      setHistory(['>'])
    } else if (result === '__CLOSE__') {
      onClose()
    } else {
      setHistory(prev => [...prev, `> ${input}`, result, '>'])
    }
    
    setInput('')
  }

  if (!isOpen) return null

  return (
    <div style={styles.overlay} onClick={(e) => {
      if (e.target === e.currentTarget) onClose()
    }}>
      <div style={styles.terminal}>
        <div style={styles.header}>
          <span>COMMAND TERMINAL</span>
          <button style={styles.closeBtn} onClick={onClose}>×</button>
        </div>
        
        <div ref={historyRef} style={styles.history}>
          {history.map((line, i) => (
            <div key={i} style={line.startsWith('>') ? styles.prompt : styles.output}>
              {line}
            </div>
          ))}
        </div>
        
        <form onSubmit={handleSubmit} style={styles.inputLine}>
          <span style={styles.prompt}>{'>'}</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            style={styles.input}
            autoFocus
            spellCheck={false}
          />
        </form>
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
    background: 'rgba(0, 5, 16, 0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  terminal: {
    width: '600px',
    maxWidth: '90%',
    height: '400px',
    background: 'rgba(0, 10, 20, 0.95)',
    border: '1px solid rgba(0, 255, 200, 0.3)',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: '13px',
  },
  header: {
    padding: '8px 12px',
    borderBottom: '1px solid rgba(0, 255, 200, 0.2)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: '#00ffc8',
    fontSize: '11px',
    letterSpacing: '2px',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#00ffc8',
    fontSize: '20px',
    cursor: 'pointer',
  },
  history: {
    flex: 1,
    overflow: 'auto',
    padding: '12px',
    color: '#00ffc8',
  },
  prompt: {
    color: '#00ffc8',
    opacity: 0.8,
  },
  output: {
    color: '#fff',
    marginBottom: '4px',
  },
  inputLine: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 12px',
    borderTop: '1px solid rgba(0, 255, 200, 0.2)',
    gap: '8px',
  },
  input: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    color: '#00ffc8',
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: '13px',
    outline: 'none',
  },
}
