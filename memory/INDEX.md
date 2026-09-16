# Orca 작업 지식

작성: HAA02 / 2026-09-16 / develop  
최신 handoff: [2026-09-16-native-chat-teammate-pin](./handoff/2026-09-16-native-chat-teammate-pin.md)

이 워크트리(`/run/media/iaan/1TB-WD/Github/orca`)는 GitHub `origin` (`HAA02/orca`, upstream `stablyai/orca`) 위의 `develop`이다. 사내 거울은 GitLab `ti/orca`(최초 푸시는 이 세션).

## 현재 상태

Native Chat 혼합 벤더 팀원(`@멘션`) + Cursor Accounts + 프로필 설정 핀이 **워킹트리에 구현됨. 기능 코드는 미커밋.** 검증은 핀 관련 vitest 일부만 통과. Electron UI 실클릭은 미확인.

정본 HEAD: `39b124c75b` (upstream dashboard-popout). 그 위에 로컬 변경만 있음.

## 게이트 / 규칙

- 커밋은 사용자가 요청할 때만. 비밀·토큰·`auth.json` 덤프 금지.
- 이 PC 설정은 `~/.config/orca-dev/profiles/local-default/` (`orca-data.json` + `profile-settings-pin.json`). 에이전트가 `orca-data.json`을 통째로 덮어쓰지 말 것.
- Cursor Desktop은 구독/로그인 소스만. 모델 목록은 카탈로그 디스커버리 — 특정 사용자 모델 집합을 하드코딩하지 말 것.
- `cursor-agent`는 유닛테스트 기본값, 런타임은 PATH의 `cursor agent` 선호.
- GNOME `/usr/bin/orca`와 실행 파일명이 충돌하지 않게.
- TeamPM / gmem 스킬은 수동 전용. TeamPM 본문을 오르카 안에 다시 쓰지 말 것.
- 오케스트레이션 가이드 정본은 `skill-guides/orchestration.md`. `generate:bundled-skill-guides`가 `skills/orchestration/SKILL.md`를 덮어쓴다.

## 다음

1. 기능 코드 커밋(사용자 지시 시) — 미커밋 목록은 handoff.
2. Orca 재시작 후 `@grok-high` / Settings 핀 유지 실측.
3. `cursor agent login`, OpenCode 사용량 쿠키는 이 PC 로그인 상태(코드 아님).
