import { describe, expect, it } from 'vitest'
import {
  CURSOR_IDE_AGENT_LAUNCH,
  CURSOR_STANDALONE_AGENT_LAUNCH,
  resolveCursorCommandOverride,
  resolveCursorExpectedProcess,
  resolveCursorModelDiscoveryArgs,
  resolveDefaultCursorLaunchCommand,
  resolveTuiExpectedProcess,
  suggestCursorIdeCliLaunch
} from './cursor-agent-command'
import { resolveAgentLaunchCommand } from './tui-agent-launch-command'

describe('cursor agent command', () => {
  it('prefers the IDE CLI when cursor is on PATH on macOS/Linux', () => {
    const previousPlatform = Object.getOwnPropertyDescriptor(process, 'platform')
    Object.defineProperty(process, 'platform', { value: 'darwin' })
    try {
      expect(
        suggestCursorIdeCliLaunch({
          cursorAgentOnPath: false,
          cursorOnPath: true
        })
      ).toBe(CURSOR_IDE_AGENT_LAUNCH)
      expect(
        suggestCursorIdeCliLaunch({
          cursorAgentOnPath: true,
          cursorOnPath: true
        })
      ).toBe(CURSOR_IDE_AGENT_LAUNCH)
      expect(
        suggestCursorIdeCliLaunch({
          existingOverride: 'npx cursor-agent',
          cursorAgentOnPath: false,
          cursorOnPath: true
        })
      ).toBeUndefined()
      expect(
        suggestCursorIdeCliLaunch({
          cursorAgentOnPath: true,
          cursorOnPath: false
        })
      ).toBeUndefined()
    } finally {
      if (previousPlatform) {
        Object.defineProperty(process, 'platform', previousPlatform)
      }
    }
  })

  it('waits on the IDE process name when launching cursor agent', () => {
    expect(resolveCursorExpectedProcess('cursor agent --yolo', 'cursor-agent')).toBe('cursor')
    expect(resolveCursorExpectedProcess('cursor-agent --yolo', 'cursor-agent')).toBe('cursor-agent')
    expect(resolveTuiExpectedProcess('claude', 'cursor agent', 'claude')).toBe('claude')
  })

  it('keeps the catalog cursor-agent default under vitest', () => {
    const resolved = resolveAgentLaunchCommand({
      agent: 'cursor',
      cmdOverrides: {},
      platform: 'linux',
      shell: 'posix'
    })
    expect(resolved).toMatchObject({ ok: true, command: 'cursor-agent --trust' })
  })

  it('launches the cursor agent CLI outside unit tests', () => {
    const previous = process.env.VITEST
    delete process.env.VITEST
    try {
      expect(resolveCursorCommandOverride(null)).toBe(resolveDefaultCursorLaunchCommand())
    } finally {
      if (previous === undefined) {
        delete process.env.VITEST
      } else {
        process.env.VITEST = previous
      }
    }
  })

  it('defaults to cursor-agent on Windows even when the IDE cursor binary is on PATH', () => {
    const previousPlatform = Object.getOwnPropertyDescriptor(process, 'platform')
    const previousLocalAppData = process.env.LOCALAPPDATA
    delete process.env.LOCALAPPDATA
    Object.defineProperty(process, 'platform', { value: 'win32' })
    try {
      expect(resolveDefaultCursorLaunchCommand()).toBe(CURSOR_STANDALONE_AGENT_LAUNCH)
      expect(
        suggestCursorIdeCliLaunch({
          cursorAgentOnPath: true,
          cursorOnPath: true
        })
      ).toBeUndefined()
    } finally {
      if (previousPlatform) {
        Object.defineProperty(process, 'platform', previousPlatform)
      }
      if (previousLocalAppData === undefined) {
        delete process.env.LOCALAPPDATA
      } else {
        process.env.LOCALAPPDATA = previousLocalAppData
      }
    }
  })

  it('honors an explicit cursor agent override', () => {
    const resolved = resolveAgentLaunchCommand({
      agent: 'cursor',
      cmdOverrides: { cursor: CURSOR_IDE_AGENT_LAUNCH },
      platform: 'linux',
      shell: 'posix'
    })
    expect(resolved).toMatchObject({ ok: true, command: `${CURSOR_IDE_AGENT_LAUNCH} --trust` })
  })

  it('does not duplicate an existing --trust flag', () => {
    const resolved = resolveAgentLaunchCommand({
      agent: 'cursor',
      cmdOverrides: { cursor: 'cursor agent --trust --yolo' },
      platform: 'linux',
      shell: 'posix'
    })
    expect(resolved).toMatchObject({ ok: true, command: 'cursor agent --trust --yolo' })
  })

  it('lists models with the IDE subcommand when launching cursor agent', () => {
    expect(resolveCursorModelDiscoveryArgs(['agent'])).toEqual(['models'])
    expect(resolveCursorModelDiscoveryArgs([])).toEqual(['--list-models'])
  })
})
