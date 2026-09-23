# 이 세션에서 Orca 오케스트레이션 사용하기

작성: 2026-09-23 / develop / 기반: 실제 이 세션에서 PM 1 + 워커 3 오케스트레이션 실행

## 개념

사용자는 **코디네이터(PM) 역할을 하는 세션 하나**에게 프롬프트만 준다. 그 세션이 Orca CLI
(`orca orchestration …`)로 작업을 만들고, 워커 터미널을 띄우고, 결과를 수거해 요약한다.
워커는 별도 터미널 탭으로 뜬다.

- `OC | …` 탭 = PM 세션(사용자가 대화하는 곳)
- `WK-A / WK-B / SESSION-TEST …` 탭 = 워커(에이전트별 모델)

## 사전 준비(1회)

1. Orca 실행 (`orca status --json` 이 ready).
2. 오케스트레이션 스킬 설치(전 에이전트 공통):
   ```bash
   npx skills add https://github.com/stablyai/orca --skill orchestration orca-cli --global
   ```
   → `~/.agents/skills` 공유 스코프 + 에이전트 홈(`~/.cursor/skills`, `~/.claude/skills`,
   `~/.grok/skills` …)에 배포. (Linux에서 Orca 터미널 밖에서 CLI 직접 호출 시 실행 파일은
   `orca-ide`; 개발 체크아웃은 `orca-dev`. bare `orca`는 GNOME 스크린리더.)

## 사용법 — 세션에 이렇게 말하면 된다

기본 템플릿:

```text
PM으로 오케스트레이션 해줘.
- 워커: cursor(grok-4.7-high), opencode(deepseek-v4.1-flash), codex
- 작업 A: <내용>
- 작업 B: <내용>
- 작업 C(검증): A/B 결과를 독립적으로 교차검증
산출물은 워커별로 파일 분리, 커밋 금지.
```

그러면 PM 세션이 자동으로:

1. `orca orchestration task-create` 로 작업 생성
2. `orca terminal create --worktree active --command "<agent> --model <id>"` 로 워커 탭 생성
3. `orca terminal wait --for tui-idle` 로 준비 대기
4. `orca orchestration dispatch --task <id> --to <handle> --inject` 로 주입
5. `orca orchestration check --wait` 로 `worker_done`/`escalation` 수거
6. 결과를 요약 보고

## 이 세션에서 실제로 일어난 일(기준 예시)

- PM = `OC | 오르카에서 오케스트…` 탭.
- 워커 3개: WK-A(opencode `opencode-go/deepseek-v4.1-flash`), WK-B(cursor-agent
  `grok-4.7-high`), SESSION-TEST(추가 세션 테스트, cursor `grok-4.7-high`).
- 각 워커가 자신의 터미널에서 `worker_done`(taskId+dispatchId 포함) 전송 → task/dispatch 자동 완료.
- 산출물: `docs/reference/orca-orchestration-usage.md`, `orca-pm-orchestration-skill.md`,
  `orca-orchestration-verification.md`. 검증 워커가 원문 주장 중 오류 2건을 잡아냈다.

## 프롬프트 예시

- 문서화: "PM으로 워커 3개 띄워서 이 대화를 문서/스킬로 정리해줘"
- 교차검증: "작성 워커 2개 + 검증 워커 1개로, 검증은 소스를 직접 대조하게"
- 코드 작업: "워커 A 구현, B 테스트, C 리뷰 — 각자 다른 파일만"
- 모델 고정: "cursor는 grok-4.7-high, opencode는 opencode-go/deepseek-v4.1-flash, codex는 기본"

## 잘 쓰는 팁

- 산출물은 워커별로 **다른 파일**로 나눈다(같은 워크트리 공유 시 쓰기 충돌 방지).
- **검증 워커 1개**를 붙이면 사실 오류를 잡아준다(실측 2건).
- `check --wait` 타임아웃/`{count:0}`은 실패가 아니다 — 장시간 작업은 15~60분.
- "hand off / 넘겨" 류는 오케스트레이션이 아니라 **핸드오프**로 처리된다(추적 상태 없음).
- 워커는 새 탭으로 남는다. 끝난 뒤 정리를 원하면 PM에게 "워커 탭 닫아줘"라고 말한다.

## 참고

- 번들 가이드 정본: `orca-dev skills get orchestration`.
- 상세 사용 문서: `docs/reference/orca-orchestration-usage.md` (gitignore 대상).
- 검증에서 잡힌 정정: "Experimental 활성화 필수" 문구는 낡음,
  `check --wait`는 1건씩이 아니라 배열 반환.
