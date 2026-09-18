import { describe, expect, it } from 'vitest'
import { quoteLaunchCliArg, quoteStartupArg } from './tui-agent-startup-shell'

describe('quoteLaunchCliArg', () => {
  it('leaves ordinary POSIX flags and model ids unquoted', () => {
    expect(quoteLaunchCliArg('--model', 'posix')).toBe('--model')
    expect(quoteLaunchCliArg('--yolo', 'posix')).toBe('--yolo')
    expect(quoteLaunchCliArg('cursor-grok-4.6-high', 'posix')).toBe('cursor-grok-4.6-high')
  })

  it('still quotes POSIX values the shell would expand', () => {
    expect(quoteLaunchCliArg('path with spaces', 'posix')).toBe("'path with spaces'")
    expect(quoteLaunchCliArg("team's-model", 'posix')).toBe("'team'\\''s-model'")
  })

  it('keeps prompt quoting strict so flag-shaped prompts stay values', () => {
    expect(quoteStartupArg('--version', 'posix')).toBe("'--version'")
  })
})
