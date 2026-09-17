import { net } from 'electron'
import type { ProviderRateLimits, RateLimitWindow } from '../../shared/rate-limit-types'

const CURSOR_ORIGIN = 'https://cursor.com'
const CURSOR_USAGE_SUMMARY_URL = 'https://cursor.com/api/usage-summary'
const API_TIMEOUT_MS = 15_000
// Why: Cursor bills on a monthly cycle, so plan usage maps to the 30-day window.
const MONTHLY_WINDOW_MINUTES = 43200

const AUTH_COOKIE_NAME = 'WorkosCursorSessionToken'

// Why: users may paste just the token value instead of the full cookie header.
// Auto-wrapping avoids a silent failure where the header looks non-empty but
// carries no recognized auth name.
export function normalizeCursorCookieInput(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) {
    return trimmed
  }
  if (trimmed.includes(';') || new RegExp(`^${AUTH_COOKIE_NAME}=`, 'i').test(trimmed)) {
    return trimmed
  }
  // Only wrap values that cannot be a malformed header; anything else fails
  // predictably instead of being sent as a bogus auth name.
  if (/^[A-Za-z0-9._~+/=*-]+$/.test(trimmed)) {
    return `${AUTH_COOKIE_NAME}=${trimmed}`
  }
  return trimmed
}

function filterAuthCookie(raw: string): string {
  return raw
    .split(';')
    .map((pair) => pair.trim())
    .filter((pair) => {
      const eq = pair.indexOf('=')
      if (eq < 0) {
        return false
      }
      return pair.slice(0, eq).trim().toLowerCase() === AUTH_COOKIE_NAME.toLowerCase()
    })
    .join('; ')
}

type CursorUsageSummary = {
  billingCycleEnd?: unknown
  membershipType?: unknown
  isUnlimited?: unknown
  individualUsage?: {
    plan?: {
      limit?: unknown
      used?: unknown
      totalPercentUsed?: unknown
    } | null
  } | null
}

export type ParsedCursorUsage = {
  usedPercent: number
  resetsAt: number | null
  planType: string | null
  isUnlimited: boolean
}

function toFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/**
 * Resolves plan usage from the dashboard summary.
 *
 * Why: Cursor reports usage either as a percentage or as raw amounts depending
 * on the plan, so prefer `totalPercentUsed` and derive it from used/limit only
 * when the percentage is absent.
 */
export function parseCursorUsageSummary(text: string): ParsedCursorUsage | null {
  let parsed: CursorUsageSummary
  try {
    parsed = JSON.parse(text) as CursorUsageSummary
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object') {
    return null
  }

  const plan = parsed.individualUsage?.plan ?? null
  const percent = toFiniteNumber(plan?.totalPercentUsed)
  const used = toFiniteNumber(plan?.used)
  const limit = toFiniteNumber(plan?.limit)
  const derivedPercent = used !== null && limit !== null && limit > 0 ? (used / limit) * 100 : null
  const usedPercent = percent ?? derivedPercent

  const billingCycleEndMs =
    typeof parsed.billingCycleEnd === 'string' ? Date.parse(parsed.billingCycleEnd) : Number.NaN
  const membershipType =
    typeof parsed.membershipType === 'string' && parsed.membershipType.trim()
      ? parsed.membershipType.trim()
      : null

  return {
    usedPercent: usedPercent ?? 0,
    resetsAt: Number.isFinite(billingCycleEndMs) ? billingCycleEndMs : null,
    planType: membershipType,
    isUnlimited: parsed.isUnlimited === true
  }
}

function makeWindow(parsed: ParsedCursorUsage): RateLimitWindow {
  return {
    usedPercent: Math.max(0, Math.min(100, Math.round(parsed.usedPercent))),
    windowMinutes: MONTHLY_WINDOW_MINUTES,
    resetsAt: parsed.resetsAt,
    resetDescription: null
  }
}

function errorResult(message: string, status: ProviderRateLimits['status']): ProviderRateLimits {
  return {
    provider: 'cursor',
    session: null,
    weekly: null,
    monthly: null,
    updatedAt: Date.now(),
    error: message,
    status
  }
}

export async function fetchCursorRateLimits(cookie: string): Promise<ProviderRateLimits> {
  const normalizedCookie = normalizeCursorCookieInput(cookie)
  if (!normalizedCookie) {
    return errorResult('Session cookie not configured', 'unavailable')
  }

  // Filter to the auth cookie only — unrelated site cookies must not be sent.
  const cookieHeader = filterAuthCookie(normalizedCookie)
  if (!cookieHeader) {
    return errorResult(
      'No WorkosCursorSessionToken cookie found — paste the full Cookie header from cursor.com DevTools',
      'error'
    )
  }

  try {
    const res = await net.fetch(CURSOR_USAGE_SUMMARY_URL, {
      method: 'GET',
      headers: {
        Cookie: cookieHeader,
        Accept: 'application/json, text/plain;q=0.9, */*;q=0.8',
        Origin: CURSOR_ORIGIN,
        Referer: `${CURSOR_ORIGIN}/dashboard`
      },
      signal: AbortSignal.timeout(API_TIMEOUT_MS)
    })

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        return errorResult('Cursor session expired — refresh the cookie in settings', 'error')
      }
      return errorResult(`Cursor usage fetch failed (${res.status})`, 'error')
    }

    const parsed = parseCursorUsageSummary(await res.text())
    if (!parsed) {
      return errorResult('Could not parse Cursor usage data', 'error')
    }

    // Why: unlimited plans report no limit to consume, so surfacing a 0% bar
    // would be misleading; keep the plan label and report no usage window.
    if (parsed.isUnlimited) {
      return {
        provider: 'cursor',
        session: null,
        weekly: null,
        monthly: null,
        planType: parsed.planType,
        updatedAt: Date.now(),
        error: null,
        status: 'ok'
      }
    }

    return {
      provider: 'cursor',
      session: null,
      weekly: null,
      monthly: makeWindow(parsed),
      planType: parsed.planType,
      updatedAt: Date.now(),
      error: null,
      status: 'ok'
    }
  } catch (err) {
    return errorResult(err instanceof Error ? err.message : 'Unknown error', 'error')
  }
}
