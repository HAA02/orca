import { afterEach, describe, expect, it, vi } from 'vitest'

const { openExternalMock, spawnMock } = vi.hoisted(() => ({
  openExternalMock: vi.fn(() => Promise.resolve()),
  spawnMock: vi.fn()
}))

vi.mock('electron', () => ({
  shell: { openExternal: openExternalMock }
}))

vi.mock('node:child_process', () => ({
  spawn: spawnMock
}))

vi.mock('node:fs', () => ({
  existsSync: (path: string) => String(path).endsWith('/wayland-0')
}))

import { openHttpUrlInSystemBrowser } from './system-browser-open'

const ENV_KEYS = [
  'XDG_SESSION_TYPE',
  'XDG_RUNTIME_DIR',
  'WAYLAND_DISPLAY',
  'GDK_BACKEND',
  'ELECTRON_OZONE_PLATFORM_HINT'
] as const

function createSpawnedProcess(result: 'spawn' | 'error' = 'spawn'): {
  once: ReturnType<typeof vi.fn>
  unref: ReturnType<typeof vi.fn>
} {
  const child = {
    once: vi.fn((eventName: string, callback: (error?: Error) => void) => {
      if (eventName === result) {
        queueMicrotask(() => {
          callback(result === 'error' ? new Error('xdg-open missing') : undefined)
        })
      }
      return child
    }),
    unref: vi.fn()
  }
  return child
}

function withPlatform<T>(platform: NodeJS.Platform, run: () => T): T {
  const original = process.platform
  Object.defineProperty(process, 'platform', { configurable: true, value: platform })
  try {
    return run()
  } finally {
    Object.defineProperty(process, 'platform', { configurable: true, value: original })
  }
}

describe('openHttpUrlInSystemBrowser', () => {
  const previousEnv = new Map<string, string | undefined>()

  afterEach(() => {
    for (const key of ENV_KEYS) {
      const previous = previousEnv.get(key)
      if (previous === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = previous
      }
    }
    previousEnv.clear()
    openExternalMock.mockClear()
    spawnMock.mockReset()
  })

  function setEnv(values: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>>): void {
    for (const key of ENV_KEYS) {
      if (!previousEnv.has(key)) {
        previousEnv.set(key, process.env[key])
      }
      const value = values[key]
      if (value === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    }
  }

  it('opens http links through xdg-open without the X11 launcher environment', async () => {
    setEnv({
      XDG_SESSION_TYPE: 'wayland',
      XDG_RUNTIME_DIR: '/run/user/1000',
      WAYLAND_DISPLAY: undefined,
      GDK_BACKEND: 'x11',
      ELECTRON_OZONE_PLATFORM_HINT: 'x11'
    })
    spawnMock.mockImplementation(() => createSpawnedProcess())

    await withPlatform('linux', () => openHttpUrlInSystemBrowser('http://192.168.0.72:8092/dtdweb'))

    expect(spawnMock).toHaveBeenCalledTimes(1)
    const [command, args, options] = spawnMock.mock.calls[0] as [
      string,
      string[],
      { env: NodeJS.ProcessEnv }
    ]
    expect(command).toBe('xdg-open')
    expect(args).toEqual(['http://192.168.0.72:8092/dtdweb'])
    expect(options.env.GDK_BACKEND).toBeUndefined()
    expect(options.env.ELECTRON_OZONE_PLATFORM_HINT).toBeUndefined()
    expect(options.env.WAYLAND_DISPLAY).toBe('wayland-0')
    expect(openExternalMock).not.toHaveBeenCalled()
  })

  it('keeps Electron openExternal when the session is already Wayland-native', async () => {
    setEnv({
      XDG_SESSION_TYPE: 'wayland',
      XDG_RUNTIME_DIR: '/run/user/1000',
      WAYLAND_DISPLAY: 'wayland-0',
      GDK_BACKEND: undefined,
      ELECTRON_OZONE_PLATFORM_HINT: undefined
    })

    await withPlatform('linux', () => openHttpUrlInSystemBrowser('https://example.com'))

    expect(spawnMock).not.toHaveBeenCalled()
    expect(openExternalMock).toHaveBeenCalledWith('https://example.com/')
  })

  it('falls back to Electron when xdg-open cannot start', async () => {
    setEnv({
      XDG_SESSION_TYPE: 'wayland',
      XDG_RUNTIME_DIR: '/run/user/1000',
      WAYLAND_DISPLAY: undefined,
      GDK_BACKEND: 'x11',
      ELECTRON_OZONE_PLATFORM_HINT: 'x11'
    })
    spawnMock.mockImplementation(() => createSpawnedProcess('error'))

    await withPlatform('linux', () => openHttpUrlInSystemBrowser('https://example.com/docs'))

    expect(openExternalMock).toHaveBeenCalledWith('https://example.com/docs')
  })

  it('ignores non-http URLs', async () => {
    await openHttpUrlInSystemBrowser('file:///etc/passwd')
    expect(spawnMock).not.toHaveBeenCalled()
    expect(openExternalMock).not.toHaveBeenCalled()
  })
})
