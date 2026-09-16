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
