# Decisions

## 2026-09-16 — 혼합 벤더는 Claude Teams가 아니라 Native Chat 멘션

무엇을: Cursor/OpenCode/Codex를 한 리드 세션에서 팀원으로 띄운다.  
왜: Claude `--teammate-mode`는 Claude 전용이고, Hermes 봇 UI를 Orca에 복제하지 않기로 했다. Orca ADE 셸만 쓰고 Cursor Desktop은 로그인 소스다.  
누가/언제: HAA02 / 2026-09-16.

구현 방향: `@` 멘션 → 새 탭 에이전트 런치 + orchestration task inject. 동시성 캡 5. Cursor 실패 시 OpenCode.

## 2026-09-16 — 프로필 설정 핀

무엇을: 핀 키(`defaultTuiAgent`, Native Chat, Agent Teams, `disabledTuiAgents`, 세션 옵션, teammate 설정)를 `orca-data.json` 옆에 sidecar로 둔다.  
왜: 로드 머지/마이그레이션/에이전트 덤프가 사용자 값을 되감는다. 로드 후 핀을 적용하면 덤프가 남아도 다음 기동에 복구된다.  
누가/언제: HAA02 / 2026-09-16.

## 2026-09-16 — 사내 거울은 ti/orca, origin은 GitHub 유지

무엇을: GitHub `origin`/`upstream`은 그대로 두고 GitLab `ti/orca`를 별도 remote로 둔다.  
왜: 업스트림 PR 경로는 GitHub, 작업 지식 공유는 사내 GitLab. 신규 프로젝트는 `ti` 그룹만.  
누가/언제: HAA02 / 2026-09-16.
