# Windows Build

Use this guide to build the Orca desktop app and installer on a Windows host.
Orca packages Windows as a first-class target (NSIS installer), so the source
builds as-is given the toolchain below. The build cannot be cross-compiled from
Linux or macOS — see [Cross-build is not supported](#cross-build-is-not-supported).

## Prerequisites

| Requirement | Version / detail | Why |
| --- | --- | --- |
| Node.js | **24.x** | `package.json` `engines.node` |
| pnpm | **10.24.0** | `packageManager` field — run `corepack enable` |
| Python 3 | on `PATH` | node-gyp rebuild of native modules |
| Visual Studio **2022** Build Tools | "Desktop development with C++" workload | node-gyp toolchain |
| .NET Framework 4.x | ships with Windows — no install | `csc.exe` for the CLI launcher |
| Git | any recent version | `prepare` (husky) runs on install |

Do not use the Visual Studio 2026 / `windows-latest` (Windows 2025) image. Its
node-gyp cannot detect VS 18, which breaks the native dependency install. CI
pins the Windows release job to `windows-2022` for exactly this reason
(`.github/workflows/release-cut.yml`).

No .NET SDK is required: `config/scripts/build-windows-cli-launcher.mjs` uses the
in-box framework compiler at
`%WINDIR%\Microsoft.NET\Framework64\v4.0.30319\csc.exe`.

## Build

From a clean checkout:

```powershell
corepack enable
pnpm install          # postinstall runs config/scripts/rebuild-native-deps.mjs
pnpm build:win
```

For day-to-day development use `pnpm dev` instead of a full package build.

## What `pnpm build:win` does

```
pnpm build:win
├─ pnpm run build:desktop          # typecheck + build:relay + build:cli + build:electron-vite + build:web
├─ pnpm run ensure:electron-runtime # stage the Electron runtime for the current platform
└─ electron-builder --config config/electron-builder.config.cjs --win
   └─ beforeBuild: config/scripts/electron-builder-native-rebuild.cjs
      ├─ config/scripts/build-windows-cli-launcher.mjs   # compiles orca.exe (win32 only)
      └─ config/scripts/rebuild-native-deps.mjs --platform=win32 --arch=<arch> --force
```

`pnpm build:win` intentionally does not call `pnpm build:native`; the
electron-builder `beforeBuild` hook performs both the CLI launcher compile and
the native rebuild.

Native modules rebuilt for Electron: `node-pty` and, on Windows only,
`windows-native-registry`. `cpu-features` is in `ignoreModules` on every
platform, so `ssh2` always uses its pure-JS fallback. After the rebuild,
`rebuild-native-deps.mjs` restores the ConPTY runtime files
(`conpty.dll`, `OpenConsole.exe`) next to `conpty.node`, because `@electron/rebuild`
bypasses node-pty's own postinstall step that normally copies them.

## Output

`electron-builder` produces an unsigned NSIS installer:

```
dist/orca-windows-setup.exe
```

The Windows target is NSIS by default — `config/electron-builder.config.cjs`
declares a `win` block and an `nsis` block but no explicit `win.target`, so no
`portable`, `msi`, or `squirrel` artifacts are emitted. Add an explicit target
list if those are needed.

## Signing

Local builds are **unsigned**. Electron-builder does not sign Windows artifacts
(`forceCodeSigning` is enabled for macOS releases only). Authenticode signing is
performed after packaging by SignPath, and only inside the release workflow
(`.github/workflows/release-cut.yml`). Unsigned local installers trigger a
Windows SmartScreen warning.

## Cross-build is not supported

Building a Windows package on Linux or macOS is refused on purpose.
`config/scripts/build-native-for-platform.mjs` only compiles the Windows CLI
launcher when `process.platform === 'win32'`, and
`config/scripts/build-windows-cli-launcher.mjs` throws off-Windows:

> Windows CLI launcher compilation requires a Windows host; refusing to package
> without it.

The guard exists because electron-builder treats a skipped native build as
success and would otherwise package an `.exe` whose declared `bin/orca.exe` is
missing. Build Windows artifacts on a Windows host (or the `windows-2022` CI
runner).

## Troubleshooting

- **`EPERM ... unlink ... conpty.node` during `pnpm install`** — a running
  Orca/Electron/dev process holds the native `.node` file. Close it and re-run.
  Postinstall exits `0` with guidance for this specific lock unless
  `ORCA_STRICT_NATIVE_REBUILD=1` is set.
- **`buildcheck.gypi not found`** — only concerns `cpu-features`, which
  `rebuild-native-deps.mjs` keeps in `ignoreModules` (it ships no
  `buildcheck.gypi`); `ssh2` falls back to its pure-JS path.
- **Long paths / deep `node_modules`** — enable Win32 long paths or keep the
  checkout shallow if path-length errors appear.
- **Line endings** — `.gitattributes` forces `eol=lf` only for build scripts and
  bundled skill markdown. `resources/win32/bin/orca.cmd` is not pinned; a normal
  `core.autocrlf=true` checkout is recommended.
- **Antivirus / Defender** — can slow the native rebuild and the
  `electron-builder` packing step considerably.

## Source of truth

| Concern | File |
| --- | --- |
| Windows packaging config | `config/electron-builder.config.cjs` |
| Pre-package native rebuild hook | `config/scripts/electron-builder-native-rebuild.cjs` |
| CLI launcher compile | `config/scripts/build-windows-cli-launcher.mjs` |
| Native module rebuild | `config/scripts/rebuild-native-deps.mjs` |
| Release workflow (SignPath, `windows-2022`) | `.github/workflows/release-cut.yml` |
| Required release assets | `config/scripts/verify-release-required-assets.mjs` |

For platform-dependent source conventions (keyboard shortcuts, path handling,
SSH/WSL), see the "Cross-Platform Support" section in [`../../AGENTS.md`](../../AGENTS.md).
