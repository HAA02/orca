import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getCursorAccountStatus } from './account-status'

vi.mock('../../shared/cursor-agent-command', () => ({
  commandOnPath: (name: string) => name === 'cursor'
}))

describe('getCursorAccountStatus', () => {
  const dirs: string[] = []

  afterEach(() => {
    for (const dir of dirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('reports unsigned status when no CLI config or API key is present', () => {
    const home = mkdtempSync(join(tmpdir(), 'orca-cursor-account-'))
    dirs.push(home)
    expect(getCursorAccountStatus({ home, env: {} })).toEqual({
      signedIn: false,
      email: null,
      displayName: null,
      authSource: null,
      cursorOnPath: true,
      cursorAgentOnPath: false,
      error: null
    })
  })

  it('reads non-secret Cursor CLI auth metadata', () => {
    const home = mkdtempSync(join(tmpdir(), 'orca-cursor-account-'))
    dirs.push(home)
    mkdirSync(join(home, '.cursor'))
    writeFileSync(
      join(home, '.cursor', 'cli-config.json'),
      JSON.stringify({
        authInfo: {
          email: 'dev@example.com',
          displayName: 'Dev',
          authId: 'secret-auth-id'
        }
      })
    )
    const status = getCursorAccountStatus({ home, env: {} })
    expect(status).toEqual({
      signedIn: true,
      email: 'dev@example.com',
      displayName: 'Dev',
      authSource: 'cli-config',
      cursorOnPath: true,
      cursorAgentOnPath: false,
      error: null
    })
    expect(JSON.stringify(status)).not.toContain('secret-auth-id')
  })

  it('treats CURSOR_API_KEY as a signed-in API key source', () => {
    const home = mkdtempSync(join(tmpdir(), 'orca-cursor-account-'))
    dirs.push(home)
    expect(getCursorAccountStatus({ home, env: { CURSOR_API_KEY: 'secret-key' } }).authSource).toBe(
      'api-key'
    )
    expect(
      JSON.stringify(getCursorAccountStatus({ home, env: { CURSOR_API_KEY: 'secret-key' } }))
    ).not.toContain('secret-key')
  })
})
