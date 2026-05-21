import type { NextRequest } from 'next/server'

export const rpName = process.env.WEBAUTHN_RP_NAME || 'Cycle Planner'

// Local-dev fallbacks. In production the RP ID and origin are derived
// per-request from the host, because WebAuthn requires the RP ID to match
// the domain the user is actually on — a single static value can't serve
// multiple tenant domains (e.g. stby-cycleplanner.com vs cw-cycleplanner.com).
const FALLBACK_RP_ID = process.env.WEBAUTHN_RP_ID || 'localhost'
const FALLBACK_ORIGIN = process.env.WEBAUTHN_ORIGIN || 'http://localhost:3000'

function bareHost(host: string | null | undefined): string {
  if (!host) return ''
  return host.toLowerCase().split(':')[0].trim()
}

function isLocalHost(h: string): boolean {
  return h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0'
}

/**
 * RP ID for a request's host. Uses the registrable apex (strips a leading
 * www.) so a passkey registered on www works on the apex and vice-versa.
 * Falls back to the env value on localhost for dev.
 */
export function rpIdFromHost(host: string | null | undefined): string {
  const h = bareHost(host)
  if (!h || isLocalHost(h)) return FALLBACK_RP_ID
  return h.startsWith('www.') ? h.slice(4) : h
}

/**
 * Accepted origins for verification. Returns both apex and www variants for
 * the host's domain so verification succeeds regardless of which one the
 * browser reports. Falls back to the env origin on localhost.
 */
export function originsFromHost(request: NextRequest): string[] {
  const h = bareHost(request.headers.get('host'))
  if (!h || isLocalHost(h)) return [FALLBACK_ORIGIN]
  const proto = request.headers.get('x-forwarded-proto') || 'https'
  const apex = h.startsWith('www.') ? h.slice(4) : h
  return [`${proto}://${apex}`, `${proto}://www.${apex}`]
}

export function rpIdFromRequest(request: NextRequest): string {
  return rpIdFromHost(request.headers.get('host'))
}
