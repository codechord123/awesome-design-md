# Tokyo Lines (앱)

상업용 판. 웹앱(`../tokyo-trip`, Henry 개인 여행)에서 갈라져 나왔다. Flutter로 iOS·안드로이드·웹을 한 코드로.

- `lib/core/` — 화면과 떨어진 핵심: 여행 모델(`models.dart`: 장소·하루 노선·여행·버전), 이동 추정과 시간표·경고(`schedule.dart`), 시각·해 지는 시각(`time.dart`).
- `test/schedule_test.dart` — 규칙 시험 + **웹앱과 같은 시간표**(웹앱의 `schedule()`로 뽑은 `test/fixtures/web_schedule.json`과 시각·경고까지 맞춘다).
- 정한 것(2026-11-01 Henry): 큐레이션 도쿄 일정 여러 버전 + 사람들이 자기 여행을 짜는 앱, Flutter, 처음엔 기기에만 저장하고 구글 요청은 서버 경유(키 숨김·기기별 하루 한도), 큐레이션은 공식 출처로 새로 조사.

```
flutter test
flutter run -d chrome
```
