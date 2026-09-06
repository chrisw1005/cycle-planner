import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import LoginPage from '@/app/(auth)/login/page'
import DevLoginPage from '@/app/(auth)/dev/page'
import { PasskeyLoginButton } from '@/components/auth/passkey-login-button'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

// Client-side navigation retains the root TenantProvider's unauthenticated
// state. Login must cross a document boundary after the cookie has been set.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))
vi.mock('@simplewebauthn/browser', () => ({
  startAuthentication: vi.fn(),
  startRegistration: vi.fn(),
}))
vi.mock('@/lib/supabase/client', () => ({ createClient: vi.fn() }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))

const navigate = vi.fn()
const fetchMock = vi.fn<typeof fetch>()
const account = {
  id: 'account-1', username: 'viewer', display_name: 'Viewer', role: 'viewer',
  tenant: { id: 'tenant-1', slug: 'test', name: 'Test' },
}

beforeEach(() => {
  vi.resetAllMocks()
  localStorage.clear()
  // jsdom cannot navigate documents. Observe the browser navigation boundary
  // while rendering the real login forms and Passkey registration prompt.
  const browserWindow = window
  vi.stubGlobal('window', new Proxy(browserWindow, {
    get(target, key) {
      if (key === 'location') return { replace: navigate }
      if (key === 'PublicKeyCredential') return class PublicKeyCredential {}
      return Reflect.get(target, key)
    },
  }))
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function submitPassword() {
  fireEvent.change(screen.getByLabelText('帳號'), { target: { value: 'viewer' } })
  fireEvent.change(screen.getByLabelText('密碼'), { target: { value: 'password' } })
  fireEvent.submit(screen.getByRole('button', { name: '登入' }).closest('form')!)
}

test('password login waits for authentication before loading a fresh document', async () => {
  let finishLogin!: (response: Response) => void
  fetchMock.mockReturnValueOnce(new Promise(resolve => { finishLogin = resolve }))
  render(<LoginPage />)
  submitPassword()
  expect(navigate).not.toHaveBeenCalled()

  finishLogin(Response.json({ ...account, has_passkeys: true }))
  await waitFor(() => expect(navigate).toHaveBeenCalledWith('/'))
})

test('a new device can skip Passkey setup and enter with a fresh session', async () => {
  fetchMock.mockResolvedValueOnce(Response.json({ ...account, has_passkeys: false }))
  render(<LoginPage />)
  submitPassword()
  const skip = await screen.findByRole('button', { name: '稍後再說' })
  expect(navigate).not.toHaveBeenCalled()
  fireEvent.click(skip)
  await waitFor(() => expect(navigate).toHaveBeenCalledWith('/'))
})

test('finishing first-time Passkey setup loads a fresh document', async () => {
  fetchMock
    .mockResolvedValueOnce(Response.json({ ...account, has_passkeys: false }))
    .mockResolvedValueOnce(Response.json({ challenge: 'registration-challenge' }))
    .mockResolvedValueOnce(Response.json({ verified: true }))
  render(<LoginPage />)
  submitPassword()
  fireEvent.click(await screen.findByRole('button', { name: '儲存' }))
  await waitFor(() => expect(navigate).toHaveBeenCalledWith('/'))
})

test('dismissing the setup prompt previously still loads a fresh document', async () => {
  localStorage.setItem('passkey-prompt-dismissed', 'true')
  fetchMock.mockResolvedValueOnce(Response.json({ ...account, has_passkeys: false }))
  render(<LoginPage />)
  submitPassword()
  await waitFor(() => expect(navigate).toHaveBeenCalledWith('/'))
})

test('rejected passwords do not enter the dashboard', async () => {
  fetchMock.mockResolvedValueOnce(Response.json({ error: '帳號或密碼錯誤' }, { status: 401 }))
  render(<LoginPage />)
  submitPassword()
  await waitFor(() => expect(toast.error).toHaveBeenCalled())
  expect(navigate).not.toHaveBeenCalled()
})

test('Passkey login waits for server verification before loading a fresh document', async () => {
  let finishVerification!: (response: Response) => void
  fetchMock
    .mockResolvedValueOnce(Response.json({ challenge: 'login-challenge' }))
    .mockReturnValueOnce(new Promise(resolve => { finishVerification = resolve }))
  render(<PasskeyLoginButton />)
  fireEvent.click(screen.getByRole('button', { name: '使用 Passkey 登入' }))
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
  expect(navigate).not.toHaveBeenCalled()

  finishVerification(Response.json(account))
  await waitFor(() => expect(navigate).toHaveBeenCalledWith('/'))
})

test('rejected Passkeys do not enter the dashboard', async () => {
  fetchMock
    .mockResolvedValueOnce(Response.json({ challenge: 'login-challenge' }))
    .mockResolvedValueOnce(Response.json({ error: '驗證失敗' }, { status: 401 }))
  render(<PasskeyLoginButton />)
  fireEvent.click(screen.getByRole('button', { name: '使用 Passkey 登入' }))
  await waitFor(() => expect(toast.error).toHaveBeenCalled())
  expect(navigate).not.toHaveBeenCalled()
})

test('developer login also reinitializes the root session provider', async () => {
  vi.mocked(createClient).mockReturnValue({
    auth: {
      signInWithPassword: async () => ({ data: { user: { id: 'developer-1' } }, error: null }),
    },
    from: () => ({ select: () => ({ eq: () => ({
      single: async () => ({ data: { role: 'developer' }, error: null }),
    }) }) }),
  } as unknown as ReturnType<typeof createClient>)
  render(<DevLoginPage />)
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'dev@example.com' } })
  fireEvent.change(screen.getByLabelText('密碼'), { target: { value: 'password' } })
  fireEvent.submit(screen.getByRole('button', { name: '登入' }).closest('form')!)
  await waitFor(() => expect(navigate).toHaveBeenCalledWith('/dev/dashboard'))
})
