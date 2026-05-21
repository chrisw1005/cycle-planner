import { NextRequest, NextResponse } from 'next/server'
import { verifyRegistrationResponse } from '@simplewebauthn/server'
import { createClient } from '@supabase/supabase-js'
import { verifySessionToken, COOKIE_NAME } from '@/lib/auth'
import { rpIdFromRequest, originsFromHost } from '@/lib/webauthn'

export async function POST(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value
  if (!token) {
    return NextResponse.json({ error: '未登入' }, { status: 401 })
  }

  const session = await verifySessionToken(token)
  if (!session) {
    return NextResponse.json({ error: '登入已過期' }, { status: 401 })
  }

  const challenge = request.cookies.get('webauthn_challenge')?.value
  if (!challenge) {
    return NextResponse.json({ error: 'Challenge 已過期，請重試' }, { status: 400 })
  }

  const body = await request.json()

  const verification = await verifyRegistrationResponse({
    response: body,
    expectedChallenge: challenge,
    expectedOrigin: originsFromHost(request),
    expectedRPID: rpIdFromRequest(request),
  })

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: '驗證失敗' }, { status: 400 })
  }

  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Store credential
  const { error } = await supabase
    .from('webauthn_credentials')
    .insert({
      id: credential.id,
      account_id: session.sub,
      public_key: Buffer.from(credential.publicKey).toString('base64'),
      counter: credential.counter,
      device_type: credentialDeviceType,
      backed_up: credentialBackedUp,
      transports: credential.transports || [],
    })

  if (error) {
    return NextResponse.json({ error: '儲存憑證失敗' }, { status: 500 })
  }

  // Clear challenge cookie
  const response = NextResponse.json({ verified: true })
  response.cookies.delete('webauthn_challenge')

  return response
}
