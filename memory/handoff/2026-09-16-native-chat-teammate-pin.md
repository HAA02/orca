# Native Chat 팀원 멘션 + 설정 핀

작성: HAA02 / 2026-09-16 / develop  
HEAD: `39b124c75b` (기능 코드 미커밋)

## 현재 상태

Hermes/Claude Code Teams를 Orca Native Chat으로 맞추는 작업이 워킹트리에 들어가 있다. 설정이 에이전트 JSON 덮어쓰기로 풀리던 문제는 프로필 핀으로 잠갔다. **이 handoff 커밋은 `memory/`(+ AGENTS 한 줄)만** 담는다.

## 완료 (코드는 워킹트리, 커밋 해시 없음)

- `@agent/model`, `@preset`, `@mixed-team` 멘션 → `launchAgentInNewTab` + orchestration `taskCreate`/`dispatch --inject`. 리드는 일하지 않음. 동시 실행 기본 5, Cursor 실패 시 OpenCode.
- 워커 `worker_done`은 리드 Native Chat 버블(inbox pump).
- Settings: Cursor Accounts, Orchestration 팀원 프리셋.
- Cursor / OpenCode / Codex 세션 옵션 카탈로그.
- `profile-settings-pin.json` — 로드 후 오버레이, Settings 변경 시 핀 갱신.

검증 근거(부분):

- `pnpm exec vitest run --config config/vitest.config.ts src/shared/profile-settings-pin.test.ts` 통과
- 같은 config로 `src/main/persistence.test.ts --testNamePattern 'reapplies pinned profile settings'` 1 passed
- 팀원 단위 테스트 파일은 존재하나 **이 세션에서 전체 스위트 재실행은 미확인**
- Electron UI 실클릭 **미확인**

이 PC 핀(비밀 아님): `defaultTuiAgent=cursor`, Native Chat on, Agent Teams off, `disabledTuiAgents=[]`. 모델 기본값은 카탈로그에서 고른 값이며 핀에 저장됨.

## 진행중 / 미완

- 기능 파일 전부 uncommitted (아래). GitLab 첫 푸시에는 이 코드가 없음.
- 앱이 켜져 있으면 재시작해야 핀이 메모리에 반영됨.
- `cursor agent login` / OpenCode 쿠키는 운영 상태.

## 다음 작업

1. 사용자 지시 시 기능 커밋. 진입점: `src/renderer/src/lib/native-chat-teammate-dispatch.ts`, `src/shared/native-chat-teammate-mention.ts`, `src/main/profile-settings-pin-file.ts`, `src/main/persistence.ts`.
2. Native Chat에서 `@` 멘션 메뉴 → 워커 탭 → 리드 inbox. Settings → Accounts Cursor, Orchestration 프리셋.
3. 앱 재시작 후 `disabledTuiAgents`가 다시 채워지지 않는지 확인.

## 미커밋 파일(요지)

신규: teammate mention/dispatch/inbox/concurrency/launch/presets/resolve, Cursor accounts IPC/UI, OpenCode catalog, profile pin.  
수정: persistence, NativeChat composer/view, OrchestrationPane, catalogs, i18n, skill-guides/orchestration.md.
