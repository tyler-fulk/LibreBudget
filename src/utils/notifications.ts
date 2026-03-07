let notificationTimer: ReturnType<typeof setInterval> | null = null

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function getNotificationPermission(): string {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.permission
}

export function scheduleDaily(timeStr: string, callback: () => void) {
  if (notificationTimer) clearInterval(notificationTimer)

  notificationTimer = setInterval(() => {
    const now = new Date()
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    if (currentTime === timeStr) {
      callback()
    }
  }, 60_000)
}

export function sendNotification(title: string, body: string) {
  if (Notification.permission !== 'granted') return
  new Notification(title, {
    body,
    icon: '/icons/icon.svg',
    badge: '/icons/icon.svg',
  })
}

export function stopNotifications() {
  if (notificationTimer) {
    clearInterval(notificationTimer)
    notificationTimer = null
  }
}
