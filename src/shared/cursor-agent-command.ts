import { getCommandTokenPathBasename, getFirstCommandToken } from './command-token-scanner'

/** Cursor IDE ships `cursor agent`. The standalone npm CLI is `cursor-agent`. */
export const CURSOR_IDE_AGENT_LAUNCH = 'cursor agent'
export const CURSOR_STANDALONE_AGENT_LAUNCH = 'cursor-agent'

/** Avoid node:path in this shared module — renderer/vite externalizes it incompletely. */
function pathDelimiter(): string {
  return process.platform === 'win32' ? ';' : ':'
}

function joinPath(dir: string, file: string): string {
  const sep = process.platform === 'win32' ? '\\' : '/'
  if (dir.endsWith('/') || dir.endsWith('\\')) {
    return `${dir}${file}`
  }
  return `${dir}${sep}${file}`
}

function pathExists(candidate: string): boolean {
  try {
    // Dynamic require keeps the renderer bundle from hard-failing on node:fs.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('node:fs') as { existsSync: (path: string) => boolean }
    return fs.existsSync(candidate)
  } catch {
    return false
  }
}

export function commandOnPath(name: string): boolean {
  const pathEnv = process.env.PATH ?? process.env.Path ?? ''
  const suffixes = process.platform === 'win32' ? ['', '.exe', '.cmd', '.bat'] : ['']
  for (const dir of pathEnv.split(pathDelimiter())) {
    if (!dir) {
      continue
    }
    if (suffixes.some((suffix) => pathExists(joinPath(dir, `${name}${suffix}`)))) {
      return true
    }
  }
  return false
}

export function resolveCursorExpectedProcess(launchCommand: string, fallback: string): string {
  const first = getCommandTokenPathBasename(getFirstCommandToken(launchCommand))
    .replace(/\.(?:exe|cmd|bat|ps1)$/i, '')
    .toLowerCase()
  return first === 'cursor' ? 'cursor' : fallback
}

export function resolveTuiExpectedProcess(
  agent: string,
  launchCommand: string,
  fallback: string
): string {
  return agent === 'cursor' ? resolveCursorExpectedProcess(launchCommand, fallback) : fallback
}

/** Skip the first-run trust menu so it cannot swallow the initial prompt. */
export function withCursorTrustFlag(command: string): string {
  return /(?:^|\s)--trust(?:\s|$)/.test(command) ? command : `${command} --trust`
}

function resolveWindowsCursorAgentLaunchCommand(): string {
  const localAppData = process.env.LOCALAPPDATA
  if (localAppData) {
    const candidate = joinPath(joinPath(localAppData, 'cursor-agent'), 'cursor-agent.cmd')
    if (pathExists(candidate)) {
      return candidate
    }
  }
  return CURSOR_STANDALONE_AGENT_LAUNCH
}

/** Default launch command when the user has not set a Cursor command override. */
export function resolveDefaultCursorLaunchCommand(): string {
  // Why: Windows `cursor.exe` is the IDE launcher and does not expose `cursor agent`.
  return process.platform === 'win32'
    ? resolveWindowsCursorAgentLaunchCommand()
    : CURSOR_IDE_AGENT_LAUNCH
}

/** Prefer the IDE CLI when `cursor` is on PATH so Orca shares the IDE's logged-in models. */
export function suggestCursorIdeCliLaunch(args: {
  existingOverride?: string | null
  cursorAgentOnPath?: boolean
  cursorOnPath: boolean
}): string | undefined {
  if (args.existingOverride?.trim()) {
    return undefined
  }
  if (process.platform === 'win32') {
    return undefined
  }
  if (args.cursorOnPath) {
    return CURSOR_IDE_AGENT_LAUNCH
  }
  return undefined
}

export function resolveCursorCommandOverride(existing?: string | null): string | undefined {
  const trimmed = existing?.trim()
  if (trimmed) {
    return trimmed
  }
  // Why: vitest hosts may have Cursor IDE on PATH; keep catalog defaults stable in unit tests.
  if (process.env.VITEST === 'true') {
    return undefined
  }
  // Why: the renderer PATH probe cannot see the same binaries as main-process
  // detection. On macOS/Linux prefer `cursor agent` so Orca shares IDE auth/models.
  return resolveDefaultCursorLaunchCommand()
}

/** IDE CLI lists with `cursor agent models`; the standalone npm CLI uses `--list-models`. */
export function resolveCursorModelDiscoveryArgs(prefixArgs: readonly string[]): string[] {
  return prefixArgs[0] === 'agent' ? ['models'] : ['--list-models']
}
