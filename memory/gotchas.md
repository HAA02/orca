# Gotchas

## 에이전트가 orca-data.json을 덤프하면 사용자 설정이 풀린다

이 워크트리에서 Python으로 `orca-data.json`을 다시 쓰면 `disabledTuiAgents` 같은 값이 덮인다. 백업에는 전부 사용 가능(`[]`)이었는데 에이전트 덤프가 Claude/Grok/Pi/Hermes를 꺼 버렸다.

대응: 같은 프로필 디렉터리의 `profile-settings-pin.json`이 로드 후 오버레이한다. 에이전트는 이 파일을 추측으로 다시 쓰지 말 것. Settings UI가 핀을 갱신한다.

## skill-guides가 SKILL.md 정본이다

`skills/orchestration/SKILL.md`를 직접 고치면 `generate:bundled-skill-guides`가 `skill-guides/orchestration.md`로 덮어쓴다. 오케스트레이션 문장은 skill-guides만 고친다.

## GNOME orca와 바이너리명

Linux에서 `/usr/bin/orca`는 스크린리더다. 이 앱 런처/심링크가 그 이름을 가로채지 않게 한다.

## cursor-agent vs cursor agent

유닛테스트 기본 커맨드는 `cursor-agent`. 실제 기동은 PATH의 `cursor agent`를 선호한다. 구독 모델 목록을 소스에 고정하지 말고 카탈로그 디스커버리를 쓴다.

## 이 PC의 headless Electron E2E는 광범위하게 실패한다

`LANG=ko_KR.UTF-8`이라 UI가 한국어로 떠서 영어 placeholder 단언이 깨지고, hidden window 상태에서 일부 스펙이 120s 타임아웃/요소 unstable로 죽는다. 미변경 스펙(`tests/e2e/tabs.spec.ts` 5/8, terminal-tab-switch 2건)도 동일. **headful(`ORCA_E2E_FORCE_HEADFUL=1`)로는 통과.** E2E 판정 전에 클린 HEAD 워크트리에서 베이스라인을 먼저 재현할 것.

## 외장 드라이브에서는 skill-bundle-manifest 검사가 실패한다

`/run/media/...` 파일시스템이 exec 비트를 강제해 `skills/*/SKILL.md`가 전부 실행 가능으로 보인다. `generate-skill-bundle-manifest.mjs`가 "Executable file is not allowed in a shipped skill"로 exit 1. `core.fileMode=false`라 git에는 안 잡히고, 저장소 문제가 아니라 파일시스템 문제다.

## oxfmt가 max-lines를 넘길 수 있다

pre-commit(lint-staged)은 oxlint → oxfmt 순서라, oxfmt가 긴 파일을 재포맷해 카운트 줄 수를 늘려 max-lines를 초과시킬 수 있다. 예: `NativeChatView.tsx`가 403 / 400이 됨. 커밋 후 `pnpm exec oxlint` 전체를 다시 돌려 확인할 것.
