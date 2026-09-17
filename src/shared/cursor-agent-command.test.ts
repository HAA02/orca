import { describe, expect, it } from 'vitest'
import {
  CURSOR_IDE_AGENT_LAUNCH,
  resolveCursorCommandOverride,
  resolveCursorExpectedProcess,
  resolveCursorModelDiscoveryArgs,
  resolveTuiExpectedProcess,
  suggestCursorIdeCliLaunch
} from './cursor-agent-command'
import { resolveAgentLaunchCommand } from './tui-agent-launch-command'

describe('cursor agent command', () => {
  it('prefers the IDE CLI when cursor is on PATH', () => {
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
      expect(resolveCursorCommandOverride(null)).toBe(CURSOR_IDE_AGENT_LAUNCH)
    } finally {
      if (previous === undefined) {
        delete process.env.VITEST
      } else {
        process.env.VITEST = previous
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
