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

## 2026-09-28 — 바탕화면 기동은 pty.node가 있을 때만 Electron을 연다

무엇을: `orca open`/`serve` 앞에서 `ensure-desktop-native-runtime.mjs`가 `build/Release/pty.node` 부재만 보고, 없을 때만 `ensure-native-runtime --runtime=electron`을 실행한다.  
왜: 빠진 바이너리로 Electron을 띄우면 창이 생기기 전에 죽는다. 매 클릭마다 전체 프로브를 돌리면 건강한 기동이 약 11초 느려진다.  
누가/언제: HAA02 / 2026-09-28.

## 2026-09-17 — opencode 기본 실행 모델은 deepseek v4.1 flash

무엇을: 카탈로그 `launchDefaultModel` opt-in으로 opencode만 사용자 미선택 상태에서도 `--model opencode-go/deepseek-v4.1-flash`를 붙인다. 커밋메시지 AI 기본값과 디스커버리 우선순위도 같은 모델.  
왜: opencode를 오르카에서 띄울 때마다 모델을 수동 선택하지 않게. #9085(미선택 시 CLI 기본값 유지)는 나머지 에이전트에 그대로 두고 opencode만 명시적 예외.  
누가/언제: HAA02 / 2026-09-17.
