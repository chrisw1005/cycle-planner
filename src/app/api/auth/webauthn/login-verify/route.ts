import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthenticationResponse } from '@simplewebauthn/server'
import { createClient } from '@supabase/supabase-js'
import { createSessionToken, COOKIE_NAME } from '@/lib/auth'
import { rpID, origin } from '@/lib/webauthn'
import { resolveTenantByHost, getTenantById } from '@/lib/tenant'

export async function POST(request: NextRequest) {
  const challenge = request.cookies.get('webauthn_challenge')?.value
  if (!challenge) {
    return NextResponse.json({ error: 'Challenge 已過期，請重試' }, { status: 400 })
  }

  const body = await request.json()

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Look up the credential
  const { data: credential } = await supabase
    .from('webauthn_credentials')
    .select('*, account:accounts(*)')
    .eq('id', body.id)
    .single()

  if (!credential) {
    return NextResponse.json({ error: '找不到憑證' }, { status: 400 })
  }

  let verification
  try {
    verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: credential.id,
        publicKey: Buffer.from(credential.public_key, 'base64'),
        counter: credential.counter,
        transports: credential.transports || [],
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '驗證過程發生錯誤'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  if (!verification.verified) {
    return NextResponse.json({ error: '驗證失敗' }, { status: 400 })
  }

  // Update counter
  await supabase
    .from('webauthn_credentials')
    .update({ counter: verification.authenticationInfo.newCounter })
    .eq('id', credential.id)

  const account = credential.account

  // Tenant guard: a passkey can only sign you in on the host that maps to its
  // account's tenant. Otherwise a stolen passkey could be used cross-tenant.
  const hostTenant = await resolveTenantByHost(request.headers.get('host'))
  if (!hostTenant || hostTenant.id !== account.tenant_id) {
    return NextResponse.json({ error: '此網域與帳號 tenant 不符' }, { status: 403 })
  }

  const tenant = await getTenantById(account.tenant_id)
  if (!tenant) {
    return NextResponse.json({ error: 'Tenant 已不存在' }, { status: 500 })
  }

  // Create JWT session (same as password login)
  const token = await createSessionToken({
    sub: account.id,
    username: account.username,
    display_name: account.display_name,
    role: account.role,
    tenant_id: tenant.id,
    tenant_slug: tenant.slug,
  })

  const response = NextResponse.json({
    id: account.id,
    username: account.username,
    display_name: account.display_name,
    role: account.role,
    tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name },
  })

  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  })

  // Clear challenge cookie
  response.cookies.delete('webauthn_challenge')

  return response
}
