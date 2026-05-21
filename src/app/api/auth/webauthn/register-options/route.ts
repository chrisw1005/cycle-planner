import { NextRequest, NextResponse } from 'next/server'
import { generateRegistrationOptions, type AuthenticatorTransportFuture } from '@simplewebauthn/server'
import { createClient } from '@supabase/supabase-js'
import { verifySessionToken, COOKIE_NAME } from '@/lib/auth'
import { rpName, rpIdFromRequest } from '@/lib/webauthn'

export async function POST(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value
  if (!token) {
    return NextResponse.json({ error: '未登入' }, { status: 401 })
  }

  const session = await verifySessionToken(token)
  if (!session) {
    return NextResponse.json({ error: '登入已過期' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Get existing credentials for this user
  const { data: existingCreds } = await supabase
    .from('webauthn_credentials')
    .select('id, transports')
    .eq('account_id', session.sub)

  const options = await generateRegistrationOptions({
    rpName,
    rpID: rpIdFromRequest(request),
    userName: session.username,
    userDisplayName: session.display_name,
    userID: new TextEncoder().encode(session.sub),
    attestationType: 'none',
    excludeCredentials: existingCreds?.map(c => ({
      id: c.id,
      transports: (c.transports || []) as AuthenticatorTransportFuture[],
    })) || [],
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
  })

  // Store challenge in cookie (short-lived, 5 minutes)
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
