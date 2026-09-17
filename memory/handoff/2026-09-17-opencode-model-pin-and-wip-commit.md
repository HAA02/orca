# opencode 기본 모델 고정 + WIP 기능 커밋

작성: HAA02 / 2026-09-17 / develop  
정본 HEAD(커밋 후): `08e1a57b2a` (부모 `1e57b23e2e`)

## 현재 상태

2026-09-16 handoff에 "미커밋"으로 남아 있던 Native Chat 팀원 멘션 + Cursor Accounts + 프로필 설정 핀 WIP를 **커밋·푸시했다.** GitHub `origin` (`develop`)에 `08e1a57b2a`까지 올라갔다. GitLab `ti/orca` 미러도 이 세션에서 갱신한다.

같은 커밋에 **opencode의 기본 실행 모델을 `opencode-go/deepseek-v4.1-flash`로 고정**하는 변경이 포함됐다.

## opencode 모델 고정 (이번 작업의 핵심)

무엇을: opencode를 실행할 때 사용자가 모델 피커를 건드리지 않아도 `--model opencode-go/deepseek-v4.1-flash`가 붙는다.

어떻게:
- `src/shared/agent-session-option-catalog-opencode.ts` — `OPENCODE_DEFAULT_MODEL_ID` 상수, 해당 모델을 `isDefault`로, 카탈로그에 `launchDefaultModel: true` opt-in 추가.
- `src/shared/agent-session-option-catalog-types.ts` — `AgentSessionOptionCatalog.launchDefaultModel?: true` 필드.
- `src/shared/native-chat-session-option-defaults.ts` — `launchDefaultModel`인 카탈로그는 미선택 상태에서도 카탈로그 기본 모델을 launch 값으로 반환. 이 리졸버를 쓰는 모든 경로(탭바/composer/워크트리 활성화/플로팅 터미널/소스컨트롤 AI/Source Control AI/teammate)에 적용된다.
- `src/shared/commit-message-agent-spec.ts` — opencode `defaultModelId`를 deepseek v4.1 flash로, `pickDiscoveredDefaultModelId`가 family prefix보다 명시적 기본 모델을 우선.
- 검증: `tests/e2e/opencode-default-model.spec.ts` — 실제 UI에서 `+` → OpenCode 실행 후 메인 `pty:spawn` 인자를 캡처해 플래그 포함을 확인.

왜 예외인가: 회귀 #9085는 "사용자가 모델을 고르지 않았으면 에이전트 CLI 기본값을 유지한다"인데, opencode만 카탈로그 opt-in으로 명시적 예외를 뒀다. 다른 에이전트(claude/codex/…)는 그대로다.

## 검증 결과 (2026-09-17)

- `pnpm typecheck` 통과, `oxlint` 0 errors, `oxfmt` clean, `max-lines ratchet` OK.
- `src/shared` + `src/renderer` 유닛 스위트 통과(자동화 cron 로케일 1건만 실패 — 아래 gotcha).
- E2E: 신규 스펙 headful 2회 연속 통과. **headless는 이 PC에서 광범위 실패**(미변경 스펙도 실패) → 환경 문제로 판정.
- 베이스라인 대조: HEAD 클린 워크트리에서도 `src/relay` 6건 + `src/shared` 1건 실패. 제 변경 후 동일 → 회귀 0.

## 커밋

- `1e57b23e2e` feat(native-chat): 팀원 멘션·Cursor Accounts·핀 WIP 전체 + opencode 모델 고정 + e2e/유닛 테스트 + 선행 타입/린트 오류 정리.
- `08e1a57b2a` fix(native-chat): pre-commit oxfmt가 `NativeChatView.tsx`를 400줄 초과시켜 props 타입을 `native-chat-view-types.ts`로 분리.
- 커밋 시 pre-commit(lint-staged)이 oxlint + oxfmt + react-doctor를 강제한다.

## 다음

1. Orca 재시작 후 `@grok-high` / Settings 핀 유지 실측(2026-09-16 handoff에서 이월).
2. headless E2E 환경 정비(xvfb/GPU/로케일) — 안 되면 이 PC에서는 headful로만 E2E.
3. `cursor agent login`, OpenCode 사용량 쿠키는 이 PC 로그인 상태(코드 아님).
4. 팀원 프리셋/`@mixed-team` 실클릭 UX 다듬기(동시성 캡 5).
