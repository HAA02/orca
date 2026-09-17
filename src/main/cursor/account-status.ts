import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { commandOnPath } from '../../shared/cursor-agent-command'
import type { CursorAccountStatus } from '../../shared/rate-limit-types'

function hasCursorApiKey(env: NodeJS.ProcessEnv): boolean {
  return Boolean(env.CURSOR_API_KEY?.trim() || env.CURSOR_AUTH_TOKEN?.trim())
}

function readCursorCliAuthInfo(home: string): {
  email: string | null
  displayName: string | null
  error: string | null
} {
  const path = join(home, '.cursor', 'cli-config.json')
  if (!existsSync(path)) {
    return { email: null, displayName: null, error: null }
  }
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as {
      authInfo?: { email?: unknown; displayName?: unknown }
    }
    const email =
      typeof parsed.authInfo?.email === 'string' && parsed.authInfo.email.trim()
        ? parsed.authInfo.email.trim()
        : null
    const displayName =
      typeof parsed.authInfo?.displayName === 'string' && parsed.authInfo.displayName.trim()
        ? parsed.authInfo.displayName.trim()
        : null
    return { email, displayName, error: null }
  } catch {
    return { email: null, displayName: null, error: 'Cursor CLI config is invalid' }
  }
}

export function getCursorAccountStatus(options?: {
  home?: string
  env?: NodeJS.ProcessEnv
}): CursorAccountStatus {
  const home = options?.home ?? homedir()
  const env = options?.env ?? process.env
  const auth = readCursorCliAuthInfo(home)
  const apiKey = hasCursorApiKey(env)
  const signedIn = Boolean(auth.email || auth.displayName || apiKey)
  return {
    signedIn,
    email: auth.email,
    displayName: auth.displayName,
    authSource: auth.email || auth.displayName ? 'cli-config' : apiKey ? 'api-key' : null,
    cursorOnPath: commandOnPath('cursor'),
    cursorAgentOnPath: commandOnPath('cursor-agent'),
    error: auth.error
  }
}
