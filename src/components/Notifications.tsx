import { useState, useEffect, useCallback } from 'react'

interface Notification {
  id: number
  message: string
  type: 'info' | 'warning' | 'success'
}

let notificationId = 0
const listeners: Set<(notifications: Notification[]) => void> = new Set()
let currentNotifications: Notification[] = []

export function showNotification(message: string, type: 'info' | 'warning' | 'success' = 'info') {
  const id = ++notificationId
  const notification: Notification = { id, message, type }
  currentNotifications = [...currentNotifications, notification]
  listeners.forEach(listener => listener(currentNotifications))
  
  // Auto-dismiss after 2.2 seconds
  setTimeout(() => {
    currentNotifications = currentNotifications.filter(n => n.id !== id)
    listeners.forEach(listener => listener(currentNotifications))
  }, 2200)
}

export function useNotifications(): Notification[] {
  const [notifications, setNotifications] = useState<Notification[]>(currentNotifications)
  
  useEffect(() => {
    listeners.add(setNotifications)
    return () => { listeners.delete(setNotifications) }
  }, [])
  
  return notifications
}

export function NotificationContainer() {
  const notifications = useNotifications()
  
  if (notifications.length === 0) return null
  
  return (
    <div style={styles.container}>
      {notifications.map(n => (
        <div key={n.id} style={{
          ...styles.notification,
          background: n.type === 'warning' ? 'rgba(255, 170, 0, 0.2)' : 
                     n.type === 'success' ? 'rgba(0, 255, 100, 0.2)' : 
                     'rgba(0, 255, 200, 0.15)',
          borderColor: n.type === 'warning' ? '#ffaa00' : 
                      n.type === 'success' ? '#00ff64' : 
                      '#00ffc8',
        }}>
          {n.message}
        </div>
      ))}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    bottom: '60px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    zIndex: 20,
    pointerEvents: 'none',
  },
  notification: {
    padding: '8px 16px',
    borderRadius: '4px',
    border: '1px solid',
    color: '#00ffc8',
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: '12px',
    animation: 'fadeInUp 0.3s ease-out',
    backdropFilter: 'blur(4px)',
  },
}
