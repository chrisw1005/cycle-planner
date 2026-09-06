'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { PasskeyLoginButton } from '@/components/auth/passkey-login-button'
import { PasskeyRegisterPrompt } from '@/components/auth/passkey-register-prompt'
import { toast } from 'sonner'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPasskeyPrompt, setShowPasskeyPrompt] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })

    if (!res.ok) {
      const data = await res.json()
      toast.error('登入失敗', { description: data.error })
      setLoading(false)
      return
    }

    const data = await res.json()
    toast.success('登入成功')

    // Show passkey registration prompt only if user has no passkeys yet
    if (
      window.PublicKeyCredential &&
      !localStorage.getItem('passkey-prompt-dismissed') &&
      !data.has_passkeys
    ) {
      setShowPasskeyPrompt(true)
    } else {
      // Recreate TenantProvider with the new cookie; router.refresh() preserves
      // its pre-login session state and leaves tenant-scoped queries disabled.
      window.location.replace('/')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Cycle Planner</CardTitle>
          <CardDescription>登入你的帳號</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">帳號</Label>
              <Input
                id="username"
                type="text"
                placeholder="輸入帳號"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密碼</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '登入中...' : '登入'}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">或</span>
            </div>
          </div>

          <PasskeyLoginButton />

          <p className="text-center text-xs text-muted-foreground">
            帳號由管理員建立，如需帳號請聯繫管理員
          </p>
        </CardContent>
      </Card>

      {showPasskeyPrompt && (
        <PasskeyRegisterPrompt onComplete={() => {
          window.location.replace('/')
        }} />
      )}
    </div>
  )
}
