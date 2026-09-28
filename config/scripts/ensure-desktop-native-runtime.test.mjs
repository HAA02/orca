import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  findMissingDesktopNativeArtifact,
  launchesDesktopApp
} from './ensure-desktop-native-runtime.mjs'

describe('ensure-desktop-native-runtime', () => {
  it('treats only desktop launch commands as needing a native-module check', () => {
    expect(launchesDesktopApp(['open'])).toBe(true)
    expect(launchesDesktopApp(['serve', '--port', '3000'])).toBe(true)
    expect(launchesDesktopApp(['--json', 'open'])).toBe(true)
    expect(launchesDesktopApp(['status'])).toBe(false)
    expect(launchesDesktopApp(['help', 'open'])).toBe(false)
  })

  it('reports a missing Linux pty.node and ignores a present one', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'orca-desktop-native-'))
    try {
      const releaseDir = path.join(root, 'node_modules', 'node-pty', 'build', 'Release')
      mkdirSync(releaseDir, { recursive: true })
      expect(findMissingDesktopNativeArtifact(root, 'linux')).toMatch(/pty\.node$/)
      writeFileSync(path.join(releaseDir, 'pty.node'), '')
      expect(findMissingDesktopNativeArtifact(root, 'linux')).toBeNull()
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('does nothing when node-pty is not installed', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'orca-desktop-native-'))
    try {
      expect(findMissingDesktopNativeArtifact(root, 'linux')).toBeNull()
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})
