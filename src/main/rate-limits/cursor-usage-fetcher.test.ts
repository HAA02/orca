import { beforeEach, describe, expect, it, vi } from 'vitest'

const netFetchMock = vi.hoisted(() => vi.fn())

vi.mock('electron', () => ({
  net: { fetch: netFetchMock }
}))

import {
  fetchCursorRateLimits,
  normalizeCursorCookieInput,
  parseCursorUsageSummary
} from './cursor-usage-fetcher'

const CYCLE_END = '2026-05-02T14:11:55.000Z'
const CYCLE_END_MS = Date.parse(CYCLE_END)

function makeResponse(body: string, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => body
  } as Response
}

const PRO_SUMMARY = JSON.stringify({
  billingCycleStart: '2026-04-02T14:11:55.000Z',
  billingCycleEnd: CYCLE_END,
  membershipType: 'pro',
  isUnlimited: false,
  individualUsage: {
    plan: { enabled: true, used: 740, limit: 2000, remaining: 1260, totalPercentUsed: 37 }
  }
})

describe('fetchCursorRateLimits', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-24T12:00:00.000Z'))
    netFetchMock.mockReset()
  })

  it('returns unavailable when the cookie is empty', async () => {
    const result = await fetchCursorRateLimits('')

    expect(result.status).toBe('unavailable')
    expect(result.provider).toBe('cursor')
    expect(result.monthly).toBeNull()
    expect(result.error).toBe('Session cookie not configured')
    expect(netFetchMock).not.toHaveBeenCalled()
  })

  it('returns error when the header carries no auth cookie name', async () => {
    const result = await fetchCursorRateLimits('session=abc123; other=xyz')

    expect(result.status).toBe('error')
    expect(result.error).toMatch(/No WorkosCursorSessionToken cookie found/)
    expect(netFetchMock).not.toHaveBeenCalled()
  })

  it('wraps a bare token and sends only the auth cookie', async () => {
    netFetchMock.mockResolvedValueOnce(makeResponse(PRO_SUMMARY))

    await fetchCursorRateLimits('Fe26.2**baretoken')

    expect(netFetchMock).toHaveBeenCalledWith(
      'https://cursor.com/api/usage-summary',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Cookie: 'WorkosCursorSessionToken=Fe26.2**baretoken',
          Origin: 'https://cursor.com'
        })
      })
    )
  })

  it('drops unrelated cookies from a pasted header', async () => {
    netFetchMock.mockResolvedValueOnce(makeResponse(PRO_SUMMARY))

    await fetchCursorRateLimits('workos_id=abc; WorkosCursorSessionToken=real; other=1')

    expect(netFetchMock.mock.calls[0][1].headers.Cookie).toBe('WorkosCursorSessionToken=real')
  })

  it('maps plan usage to the monthly window', async () => {
    netFetchMock.mockResolvedValueOnce(makeResponse(PRO_SUMMARY))

    const result = await fetchCursorRateLimits('WorkosCursorSessionToken=real')

    expect(result.status).toBe('ok')
    expect(result.error).toBeNull()
    expect(result.session).toBeNull()
    expect(result.weekly).toBeNull()
    expect(result.monthly).toEqual({
      usedPercent: 37,
      windowMinutes: 43200,
      resetsAt: CYCLE_END_MS,
      resetDescription: null
    })
    expect(result.planType).toBe('pro')
  })

  it('derives the percentage from used/limit when totalPercentUsed is absent', async () => {
    netFetchMock.mockResolvedValueOnce(
      makeResponse(
        JSON.stringify({
          billingCycleEnd: CYCLE_END,
          membershipType: 'ultra',
          individualUsage: { plan: { used: 500, limit: 1000 } }
        })
      )
    )

    const result = await fetchCursorRateLimits('WorkosCursorSessionToken=real')

    expect(result.monthly?.usedPercent).toBe(50)
    expect(result.planType).toBe('ultra')
  })

  it('clamps an over-100 percentage', async () => {
    netFetchMock.mockResolvedValueOnce(
      makeResponse(
        JSON.stringify({
          billingCycleEnd: CYCLE_END,
          individualUsage: { plan: { totalPercentUsed: 140 } }
        })
      )
    )

    const result = await fetchCursorRateLimits('WorkosCursorSessionToken=real')

    expect(result.monthly?.usedPercent).toBe(100)
  })

  it('reports the plan without a usage window for unlimited plans', async () => {
    netFetchMock.mockResolvedValueOnce(
      makeResponse(
        JSON.stringify({
          billingCycleEnd: CYCLE_END,
          membershipType: 'enterprise',
          isUnlimited: true,
          individualUsage: { plan: { enabled: true } }
        })
      )
    )

    const result = await fetchCursorRateLimits('WorkosCursorSessionToken=real')

    expect(result.status).toBe('ok')
    expect(result.monthly).toBeNull()
    expect(result.planType).toBe('enterprise')
  })

  it('returns a parse error on invalid JSON', async () => {
    netFetchMock.mockResolvedValueOnce(makeResponse('<html>login</html>'))

    const result = await fetchCursorRateLimits('WorkosCursorSessionToken=real')

    expect(result.status).toBe('error')
    expect(result.error).toBe('Could not parse Cursor usage data')
  })

  it('asks for a fresh cookie on 401 and 403', async () => {
    netFetchMock
      .mockResolvedValueOnce(makeResponse('Unauthorized', 401))
      .mockResolvedValueOnce(makeResponse('Forbidden', 403))

    const first = await fetchCursorRateLimits('WorkosCursorSessionToken=real')
    const second = await fetchCursorRateLimits('WorkosCursorSessionToken=real')

    expect(first.status).toBe('error')
    expect(first.error).toMatch(/session expired/)
    expect(second.error).toMatch(/session expired/)
  })

  it('returns a fetch error on other non-ok responses', async () => {
    netFetchMock.mockResolvedValueOnce(makeResponse('Server Error', 500))

    const result = await fetchCursorRateLimits('WorkosCursorSessionToken=real')

    expect(result.status).toBe('error')
    expect(result.error).toBe('Cursor usage fetch failed (500)')
  })

  it('surfaces network failures without leaking the cookie', async () => {
    netFetchMock.mockRejectedValueOnce(new Error('network timeout'))

    const result = await fetchCursorRateLimits('WorkosCursorSessionToken=secret123')

    expect(result.status).toBe('error')
    expect(result.error).toBe('network timeout')
    expect(result.error).not.toContain('secret123')
  })
})

describe('normalizeCursorCookieInput', () => {
  it('returns empty string unchanged', () => {
    expect(normalizeCursorCookieInput('')).toBe('')
  })

  it('wraps a bare token as WorkosCursorSessionToken=<token>', () => {
    expect(normalizeCursorCookieInput('abc.def-ghi')).toBe('WorkosCursorSessionToken=abc.def-ghi')
  })

  it('leaves an existing auth cookie header unchanged', () => {
    expect(normalizeCursorCookieInput('WorkosCursorSessionToken=abc')).toBe(
      'WorkosCursorSessionToken=abc'
    )
  })

  it('leaves multi-pair cookie headers unchanged', () => {
    expect(normalizeCursorCookieInput('a=1; WorkosCursorSessionToken=b')).toBe(
      'a=1; WorkosCursorSessionToken=b'
    )
  })

  it('trims surrounding whitespace before wrapping', () => {
    expect(normalizeCursorCookieInput('  token123  ')).toBe('WorkosCursorSessionToken=token123')
  })

  it('does not wrap values that cannot be a token', () => {
    expect(normalizeCursorCookieInput('not a token!')).toBe('not a token!')
  })
})

describe('parseCursorUsageSummary', () => {
  it('returns null for non-JSON input', () => {
    expect(parseCursorUsageSummary('nope')).toBeNull()
  })

  it('tolerates a missing plan block', () => {
    const parsed = parseCursorUsageSummary(
      JSON.stringify({ billingCycleEnd: CYCLE_END, membershipType: 'pro' })
    )

    expect(parsed).toEqual({
      usedPercent: 0,
      resetsAt: CYCLE_END_MS,
      planType: 'pro',
      isUnlimited: false
    })
  })

  it('ignores a non-parseable billing cycle end', () => {
    const parsed = parseCursorUsageSummary(
      JSON.stringify({
        billingCycleEnd: 'soon',
        individualUsage: { plan: { totalPercentUsed: 5 } }
      })
    )

    expect(parsed?.resetsAt).toBeNull()
  })
})
