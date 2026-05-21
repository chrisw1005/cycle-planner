import { NextRequest, NextResponse } from 'next/server'
import { generateAuthenticationOptions, type AuthenticatorTransportFuture } from '@simplewebauthn/server'
import { createClient } from '@supabase/supabase-js'
import { rpIdFromRequest } from '@/lib/webauthn'
import { resolveTenantByHost } from '@/lib/tenant'

export async function POST(request: NextRequest) {
  const { username } = await request.json().catch(() => ({ username: undefined }))

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const rpID = rpIdFromRequest(request)
  let allowCredentials: { id: string; transports?: AuthenticatorTransportFuture[] }[] = []

  if (username) {
    // Scope the lookup to the host's tenant — usernames are unique per tenant,
    // so a bare username match could resolve the wrong account.
    const tenant = await resolveTenantByHost(request.headers.get('host'))
    const { data: account } = tenant
      ? await supabase
          .from('accounts')
          .select('id')
          .eq('tenant_id', tenant.id)
          .eq('username', username.toLowerCase().trim())
          .maybeSingle()
      : { data: null }

    if (account) {
      const { data: creds } = await supabase
        .from('webauthn_credentials')
        .select('id, transports')
        .eq('account_id', account.id)

      allowCredentials = creds?.map(c => ({
        id: c.id,
        transports: (c.transports || []) as AuthenticatorTransportFuture[],
      })) || []
    }
  }

  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: 'preferred',
    allowCredentials,
  })

  // Store challenge in cookie
  const response = NextResponse.json(options)
  response.cookies.set('webauthn_challenge', options.challenge, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 300,
  })

  return response
}
