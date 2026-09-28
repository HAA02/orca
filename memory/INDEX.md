# Orca 작업 지식

작성: HAA02 / 2026-09-28 / develop  
최신 handoff: [2026-09-28-desktop-pty-restore](./handoff/2026-09-28-desktop-pty-restore.md)

이 워크트리(`/run/media/iaan/1TB-WD/Github/orca`)는 GitHub `origin` (`HAA02/orca`, upstream `stablyai/orca`) 위의 `develop`이다. 사내 거울은 GitLab `ti/orca`.

## 현재 상태

바탕화면 오르카가 `node-pty` `pty.node` 부재로 창 없이 죽던 문제를 고쳤다. `orca open`/`serve`는 Electron을 띄우기 전에 아티팩트가 없으면 복구한다. 이 PC 래퍼 `~/.local/share/orca-wrappers/orca-electron-x11.sh`도 같은 스크립트를 호출한다(저장소 밖).

이전 정본의 Native Chat 혼합 벤더 팀원, Cursor Accounts, 프로필 설정 핀, opencode `opencode-go/deepseek-v4.1-flash` 고정은 `develop`에 그대로 있다.

정본 HEAD는 이 세션 커밋 이후 `develop`이다. upstream 정본은 `39b124c75b` (dashboard-popout)까지 반영된 상태였고, 그 이후 로컬 `develop`은 origin과 함께 더 진행됐다.

## 게이트 / 규칙

- 커밋은 사용자가 요청할 때만. 비밀·토큰·`auth.json` 덤프 금지.
- 이 PC 설정은 `~/.config/orca-dev/profiles/local-default/` (`orca-data.json` + `profile-settings-pin.json`). 에이전트가 `orca-data.json`을 통째로 덮어쓰지 말 것.
- Cursor Desktop은 구독/로그인 소스만. 모델 목록은 카탈로그 디스커버리 — 특정 사용자 모델 집합을 하드코딩하지 말 것.
- `cursor-agent`는 유닛테스트 기본값, 런타임은 PATH의 `cursor agent` 선호.
- GNOME `/usr/bin/orca`와 실행 파일명이 충돌하지 않게.
- TeamPM / gmem 스킬은 수동 전용. TeamPM 본문을 오르카 안에 다시 쓰지 말 것.
- 오케스트레이션 가이드 정본은 `skill-guides/orchestration.md`. `generate:bundled-skill-guides`가 `skills/orchestration/SKILL.md`를 덮어쓴다.
- pre-commit(lint-staged)이 staged 파일에 oxlint + oxfmt + react-doctor를 돌린다. 개별 파일 검증만 하지 말고 `pnpm exec oxlint` 전체를 먼저 볼 것.
- opencode를 모델 고정 대상에서 빼려면 `launchDefaultModel` opt-in만 제거하면 된다(다른 에이전트는 영향 없음).
- 바탕화면 기동 경로는 `ensure-desktop-native-runtime.mjs`를 유지한다. 건강한 실행마다 전체 Electron 네이티브 프로브를 넣지 말 것.

## 다음

1. 다음 바탕화면 실행에서 `pty.node`가 있을 때 지연 없이 창이 뜨는지 확인.
2. Orca 재시작 후 `@grok-high` / Settings 핀 유지 실측.
3. headless E2E 환경 정비 — 이 PC에서는 headful로만 E2E 가능.
4. `cursor agent login`, OpenCode 사용량 쿠키는 이 PC 로그인 상태(코드 아님).
