# 바탕화면 오르카가 pty.node 없이 죽던 문제

작성: HAA02 / 2026-09-28 / develop

## 증상

바탕화면 `Orca.desktop` (`Exec=/home/iaan/.local/bin/orca open`)을 눌러도 창이 안 떴다. Electron은 떠 있었지만 10×10 InputOnly 창만 있고 렌더러가 없었다. stderr는 `/dev/null`이라 대화상자도 보이지 않았다.

## 원인

`node-pty`의 Linux `build/Release/pty.node`가 비어 있었다 (`prebuilds/linux-x64`는 패키지에 없음). 메인 프로세스가 로드 중 `Failed to load native module: pty.node`로 죽었다. `pnpm dev`/`pnpm start`는 `ensure:electron-runtime`을 먼저 타지만, 바탕화면 경로(`orca-dev open` → `ORCA_OPEN_COMMAND` 래퍼)는 그 검사를 건너뛰었다.

`pty.node`를 `pnpm run ensure:electron-runtime`으로 다시 만든 뒤 `orca open`으로 창이 떴다 (`Orca: orca`, `desktopWindowStatus: available`).

## 재발 방지

`config/scripts/ensure-desktop-native-runtime.mjs`가 `pty.node`(macOS는 `spawn-helper` 포함)가 없을 때만 Electron용 네이티브 모듈을 복구한다. 매 실행마다 전체 검사(실측 약 11초)는 하지 않는다.

- `orca-dev open|serve`가 CLI보다 먼저 이 스크립트를 실행한다. 복구 실패 시 CLI를 띄우지 않는다.
- 이 PC 래퍼 `~/.local/share/orca-wrappers/orca-electron-x11.sh`도 exec 전에 같은 스크립트를 호출한다. 래퍼는 저장소 밖이다.
- 복구가 필요하면 `notify-send`로 알리고, 실패하면 Electron을 시작하지 않는다.

검증: `vitest` `ensure-desktop-native-runtime.test.mjs` + `orca-dev-bin.test.mjs` 6 passed. 모듈이 있는 상태에서 가드 스크립트 exit 0.
