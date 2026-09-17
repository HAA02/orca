# Orca 작업 지식

작성: HAA02 / 2026-09-17 / develop  
최신 handoff: [2026-09-17-opencode-model-pin-and-wip-commit](./handoff/2026-09-17-opencode-model-pin-and-wip-commit.md)

이 워크트리(`/run/media/iaan/1TB-WD/Github/orca`)는 GitHub `origin` (`HAA02/orca`, upstream `stablyai/orca`) 위의 `develop`이다. 사내 거울은 GitLab `ti/orca`.

## 현재 상태

Native Chat 혼합 벤더 팀원(`@멘션`) + Cursor Accounts + 프로필 설정 핀 WIP가 **커밋됨**(`1e57b23e2e`, `08e1a57b2a`) — 더 이상 미커밋이 아니다. 같은 커밋에 **opencode 기본 실행 모델을 `opencode-go/deepseek-v4.1-flash`로 고정**(카탈로그 `launchDefaultModel` opt-in)이 포함됐다. GitHub `origin/develop` 푸시 완료, GitLab `ti/orca`는 2026-09-17 세션에서 갱신.

정본 HEAD: `08e1a57b2a`. upstream 정본은 `39b124c75b` (dashboard-popout)까지 반영됨.

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

## 다음

1. Orca 재시작 후 `@grok-high` / Settings 핀 유지 실측.
2. headless E2E 환경 정비 — 이 PC에서는 headful로만 E2E 가능.
3. `cursor agent login`, OpenCode 사용량 쿠키는 이 PC 로그인 상태(코드 아님).

