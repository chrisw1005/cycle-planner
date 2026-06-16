'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    // If the page is already controlled by an older worker, a controllerchange
    // means a new worker took over (via skipWaiting + clients.claim). Reload once
    // so this already-open tab runs the freshly deployed assets instead of the
    // stale ones the old worker was still serving. The flag guards against loops,
    // and the hadController check avoids reloading on the very first install.
    const hadController = Boolean(navigator.serviceWorker.controller)
    let reloaded = false
    const onControllerChange = () => {
      if (reloaded || !hadController) return
      reloaded = true
      window.location.reload()
    }
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        // Proactively check for a new sw.js so long-lived tabs pick up a deploy
        // without needing a manual hard refresh.
        registration.update().catch(() => {})
      })
      .catch(() => {
        // SW registration can fail silently (e.g. unsupported / dev).
      })

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
    }
  }, [])

  return null
}
