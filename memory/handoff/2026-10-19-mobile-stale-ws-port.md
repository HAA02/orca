작성: HAA02 / 2026-10-19 / develop

# 모바일 "check Tailscale" — 저장된 WS 포트와 실제 포트 불일치

## 증상
모바일 앱이 호스트에 연결하지 못하고 `check Tailscale` 힌트를 띄움. Tailscale 터널·호스트 HTTP 응답은 정상.

## 원인
- 폰은 페어링 당시의 WS 포트(폴백으로 배정된 임의 포트)를 `ws://<ip>:<port>`로 저장한다. 폰 UI에서는 이 주소를 수정할 수 없다.
- 개발 모드 기본 포트는 6769. 6769가 점유된 실행에서는 OS가 임의 포트를 주고, 그 값이 userData의 `mobile-ws-fallback-port.json`에 기록된다.
- 이후 실행이 폴백 포트 대신 6769로 떠서 폰이 닫힌 포트를 두드렸다. `check Tailscale`은 "도달 불가"의 일반 문구라 원인을 가리지 않는다.
- 코드(`ws-transport.ts`)는 폴백 → 고정 포트 순으로 바인딩하므로, 폴백 바인딩이 시작 시점에 실패한 것으로 추정(미확인 — 로그에서 근거 못 찾음).

## 조치 / 검증
- 실행 중인 개발 인스턴스를 재시작 → 저장된 폴백 포트로 다시 바인딩됨. `ss -ltn`과 `orca-runtime.json`의 websocket endpoint 둘 다 폴백 포트로 확인.
- 코드 변경 없음.

## 다음
- 같은 증상이면: `orca-runtime.json`의 websocket endpoint와 폰에 저장된 포트를 비교 → 다르면 Orca 재시작 또는 재페어링.
- 폴백 바인딩이 시작 시 실패한 원인은 미확인(재발 시 `[ws-transport] Failed to bind port` 경고 확인).

## 함정
- `check Tailscale` 힌트는 Tailscale 엔드포인트(100.x / *.ts.net)에서의 모든 도달 실패에 붙는다. 포트·페어링 문제도 같은 문구로 보인다.
- 6769의 HTTP(Orca Web)가 열려도 모바일 WS가 같은 포트라는 보장이 없다 — 광고 포트는 `orca-runtime.json`이 정본.
