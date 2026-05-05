'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2, LogOut, ArrowLeft, Eye, EyeOff, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import type { Account, Tenant } from '@/types'

interface AccountWithTenant extends Account {
  tenant?: { name: string; slug: string }
}

export default function DevDashboardPage() {
  const supabase = createClient()
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [selectedTenantId, setSelectedTenantId] = useState<string>('')
  const [accounts, setAccounts] = useState<Account[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null)
  const [tenantCreateOpen, setTenantCreateOpen] = useState(false)
  const [tenantEditTarget, setTenantEditTarget] = useState<Tenant | null>(null)

  // Account form state
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [accountRole, setAccountRole] = useState<'admin' | 'viewer'>('admin')

  // Tenant form state
  const [tenantSlug, setTenantSlug] = useState('')
  const [tenantName, setTenantName] = useState('')
  const [tenantDomain, setTenantDomain] = useState('')

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/dev'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'developer') { router.push('/dev'); return }

      setAuthorized(true)
      setLoading(false)
    }
    check()
  }, [supabase, router])

  const fetchTenants = useCallback(async () => {
    const res = await fetch('/api/admin/tenants', { cache: 'no-store' })
    if (!res.ok) {
      toast.error('載入 tenants 失敗')
      return
    }
    const list: Tenant[] = await res.json()
    setTenants(list)
    if (list.length > 0 && !selectedTenantId) {
      setSelectedTenantId(list[0].id)
    }
  }, [selectedTenantId])

  const fetchAccounts = useCallback(async (tenantId: string) => {
    if (!tenantId) {
      setAccounts([])
      return
    }
    const res = await fetch(`/api/admin/users?tenant_id=${tenantId}`, { cache: 'no-store' })
    if (res.ok) setAccounts(await res.json())
  }, [])

  useEffect(() => {
    if (authorized) fetchTenants()
  }, [authorized, fetchTenants])

  useEffect(() => {
    if (selectedTenantId) fetchAccounts(selectedTenantId)
  }, [selectedTenantId, fetchAccounts])

  const selectedTenant = useMemo(
    () => tenants.find((t) => t.id === selectedTenantId),
    [tenants, selectedTenantId]
  )

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      toast.error('密碼不一致', { description: '請確認兩次輸入的密碼相同' })
      return
    }
    if (!selectedTenantId) {
      toast.error('請先選擇 tenant')
      return
    }
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        password,
        display_name: displayName || username,
        role: accountRole,
        tenant_id: selectedTenantId,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast.error('建立失敗', { description: data.error })
      return
    }
    toast.success(`${accountRole === 'admin' ? 'Admin' : 'Viewer'} 帳號已建立`)
    setUsername(''); setDisplayName(''); setPassword(''); setConfirmPassword(''); setShowPassword(false)
    setCreateOpen(false)
    fetchAccounts(selectedTenantId)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    const res = await fetch('/api/admin/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId: deleteTarget.id }),
    })
    if (!res.ok) {
      const data = await res.json()
      toast.error('刪除失敗', { description: data.error })
    } else {
      toast.success('帳號已刪除')
      fetchAccounts(selectedTenantId)
    }
    setDeleteTarget(null)
  }

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/admin/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug: tenantSlug,
        name: tenantName,
        primary_domain: tenantDomain || null,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast.error('建立失敗', { description: data.error })
      return
    }
    toast.success('Tenant 已建立')
    setTenantSlug(''); setTenantName(''); setTenantDomain('')
    setTenantCreateOpen(false)
    fetchTenants()
  }

  const handleUpdateTenant = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenantEditTarget) return
    const res = await fetch('/api/admin/tenants', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: tenantEditTarget.id,
        name: tenantName,
        primary_domain: tenantDomain || null,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast.error('更新失敗', { description: data.error })
      return
    }
    toast.success('Tenant 已更新')
    setTenantEditTarget(null)
    fetchTenants()
  }

  const openTenantEdit = (t: Tenant) => {
    setTenantEditTarget(t)
    setTenantName(t.name)
    setTenantDomain(t.primary_domain ?? '')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/dev')
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-muted-foreground">驗證中...</div>
  }

  const admins = accounts.filter(a => a.role === 'admin')
  const viewers = accounts.filter(a => a.role === 'viewer')

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Developer Console</h1>
            <p className="text-sm text-muted-foreground">管理 Tenant 與其下的 Admin / Viewer 帳號</p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 h-8 text-sm font-medium hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              前往系統
            </Link>
            <Button variant="ghost" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              登出
            </Button>
          </div>
        </div>

        {/* Tenants management */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Tenants</CardTitle>
            <Button size="sm" onClick={() => setTenantCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              新增 Tenant
            </Button>
          </CardHeader>
          <CardContent>
            {tenants.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">尚未建立 Tenant</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Slug</TableHead>
                      <TableHead>名稱</TableHead>
                      <TableHead>網域</TableHead>
                      <TableHead className="w-16">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tenants.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-mono text-sm">{t.slug}</TableCell>
                        <TableCell className="font-medium">{t.name}</TableCell>
                        <TableCell className="text-muted-foreground">{t.primary_domain ?? '—'}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => openTenantEdit(t)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tenant selector for accounts view */}
        {tenants.length > 0 && (
          <div className="flex items-center gap-3">
            <Label className="text-sm">檢視 Tenant 的帳號：</Label>
            <Select value={selectedTenantId} onValueChange={(v) => setSelectedTenantId(v ?? '')}>
              <SelectTrigger className="w-64">
                <SelectValue>
                  {(value: string | null) => {
                    if (!value) return null
                    const t = tenants.find((x) => x.id === value)
                    return t ? `${t.name} (${t.slug})` : null
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {tenants.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name} ({t.slug})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Admin Accounts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">
              Admin 帳號
              {selectedTenant && <span className="ml-2 text-sm font-normal text-muted-foreground">— {selectedTenant.name}</span>}
            </CardTitle>
            <Button
              size="sm"
              onClick={() => { setAccountRole('admin'); setCreateOpen(true) }}
              disabled={!selectedTenantId}
            >
              <Plus className="mr-2 h-4 w-4" />
              建立 Admin
            </Button>
          </CardHeader>
          <CardContent>
            {admins.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">尚未建立 Admin 帳號</p>
            ) : (
              <AccountTable accounts={admins} onDelete={setDeleteTarget} />
            )}
          </CardContent>
        </Card>

        {/* Viewer Accounts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">
              Viewer 帳號
              {selectedTenant && <span className="ml-2 text-sm font-normal text-muted-foreground">— {selectedTenant.name}</span>}
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setAccountRole('viewer'); setCreateOpen(true) }}
              disabled={!selectedTenantId}
            >
              <Plus className="mr-2 h-4 w-4" />
              建立 Viewer
            </Button>
          </CardHeader>
          <CardContent>
            {viewers.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">尚未建立 Viewer 帳號</p>
            ) : (
              <AccountTable accounts={viewers} onDelete={setDeleteTarget} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Account Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              建立 {accountRole === 'admin' ? 'Admin' : 'Viewer'} 帳號
              {selectedTenant && <span className="ml-2 text-sm font-normal text-muted-foreground">— {selectedTenant.name}</span>}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateAccount} className="space-y-4">
            <div className="space-y-2">
              <Label>帳號 *</Label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="例：admin1" required />
            </div>
            <div className="space-y-2">
              <Label>暱稱</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="選填，預設同帳號" />
            </div>
            <div className="space-y-2">
              <Label>密碼 *</Label>
              <div className="relative">
                <Input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="至少 6 個字元" required minLength={6} className="pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>確認密碼 *</Label>
              <div className="relative">
                <Input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="再次輸入密碼" required minLength={6} className="pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>取消</Button>
              <Button type="submit">建立</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>確認刪除</DialogTitle>
            <DialogDescription>確定要刪除帳號 {deleteTarget?.username} 嗎？</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button variant="destructive" onClick={handleDelete}>刪除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Tenant Dialog */}
      <Dialog open={tenantCreateOpen} onOpenChange={setTenantCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>新增 Tenant</DialogTitle>
            <DialogDescription>建立新的租戶後，可在 Vercel 把網域指向此部署。</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTenant} className="space-y-4">
            <div className="space-y-2">
              <Label>Slug *</Label>
              <Input value={tenantSlug} onChange={(e) => setTenantSlug(e.target.value)} placeholder="例：tenant3 — 內部代號，不可重複" required />
            </div>
            <div className="space-y-2">
              <Label>名稱 *</Label>
              <Input value={tenantName} onChange={(e) => setTenantName(e.target.value)} placeholder="顯示用名稱" required />
            </div>
            <div className="space-y-2">
              <Label>主要網域</Label>
              <Input value={tenantDomain} onChange={(e) => setTenantDomain(e.target.value)} placeholder="例：alice-cycle.com（不含 https://）" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTenantCreateOpen(false)}>取消</Button>
              <Button type="submit">建立</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Tenant Dialog */}
      <Dialog open={!!tenantEditTarget} onOpenChange={() => setTenantEditTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>編輯 Tenant</DialogTitle>
            <DialogDescription>Slug 一旦建立不可變更。</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateTenant} className="space-y-4">
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input value={tenantEditTarget?.slug ?? ''} disabled />
            </div>
            <div className="space-y-2">
              <Label>名稱 *</Label>
              <Input value={tenantName} onChange={(e) => setTenantName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>主要網域</Label>
              <Input value={tenantDomain} onChange={(e) => setTenantDomain(e.target.value)} placeholder="例：alice-cycle.com" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTenantEditTarget(null)}>取消</Button>
              <Button type="submit">儲存</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AccountTable({ accounts, onDelete }: { accounts: AccountWithTenant[]; onDelete: (a: Account) => void }) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>帳號</TableHead>
            <TableHead>暱稱</TableHead>
            <TableHead>建立時間</TableHead>
            <TableHead className="w-16">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.map((a) => (
            <TableRow key={a.id}>
              <TableCell className="font-medium">{a.username}</TableCell>
              <TableCell>{a.display_name}</TableCell>
              <TableCell className="text-muted-foreground">{new Date(a.created_at).toLocaleDateString('zh-TW')}</TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => onDelete(a)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
