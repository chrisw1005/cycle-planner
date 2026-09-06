'use client'

import { useState } from 'react'
import { startAuthentication } from '@simplewebauthn/browser'
import { Button } from '@/components/ui/button'
import { Fingerprint } from 'lucide-react'
import { toast } from 'sonner'

export function PasskeyLoginButton() {
  const [loading, setLoading] = useState(false)

  const handlePasskeyLogin = async () => {
    setLoading(true)
    try {
      // Get authentication options
      const optionsRes = await fetch('/api/auth/webauthn/login-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (!optionsRes.ok) {
        throw new Error('無法取得驗證選項')
      }

      const options = await optionsRes.json()

      // Start authentication (triggers Face ID / Touch ID)
      const authResponse = await startAuthentication({ optionsJSON: options })

      // Verify with server
      const verifyRes = await fetch('/api/auth/webauthn/login-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authResponse),
      })

      if (!verifyRes.ok) {
        const data = await verifyRes.json()
        throw new Error(data.error || '驗證失敗')
      }

      toast.success('登入成功')
      // Reload the root providers after the server has set the session cookie.
      window.location.replace('/')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Passkey 登入失敗'
      if (!message.includes('cancelled') && !message.includes('abort')) {
        toast.error('Passkey 登入失敗', { description: message })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={handlePasskeyLogin}
      disabled={loading}
    >
      <Fingerprint className="mr-2 h-4 w-4" />
      {loading ? '驗證中...' : '使用 Passkey 登入'}
    </Button>
  )
}
