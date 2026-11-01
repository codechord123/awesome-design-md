# 큐레이션 설계 (2026-11-01)

Henry: "큐레이션은 버전을 여러 개 네가 만들어 줘. 목록에 없는 것까지, '도쿄 여행 처음' 같은 컨셉으로. 기존 여행 책자의 방식, 디지털에서 공유되는 방식들 서칭해서 — 자료 조사가 중요." 형태는 **하루 코스 모음과 여행 통째 일정 둘 다**, 컨셉은 여덟 개.

## 1. 다른 곳은 어떻게 하나 (조사)

| 어디 | 방식 | 가져올 것 |
|---|---|---|
| 론리플래닛 Pocket·City 가이드 | 동네(neighbourhood)별로 "top experiences"를 모으고, 짧은 여행용 "Three Perfect Days"·"Perfect Day" 일정을 따로 둔다. Experience 시리즈는 동네마다 직접 일정을 짜는 도구를 준다. ([Pocket Hong Kong](https://www.bokus.com/bok/9781837586578/lonely-planet-pocket-hong-kong), [Pocket London](https://www.harryhartog.com.au/products/lonely-planet-pocket-london-lonely-planet-9781838691899), [London 가이드](https://shop.lonelyplanet.com/products/london-ebook)) | **동네가 기본 단위**, 그 위에 "완벽한 하루" 일정 |
| 무작정 따라하기 도쿄(길벗) | 두 권: 테마북(가 볼 곳)과 가이드북(일정별·테마별·목적별 코스, 따라가기만 하면 되게). 테마북에서 고른 곳을 가이드북 지도에서 찾는다. 23구 지역별 코스와 근교 코스가 장마다. ([교보 eBook](https://ebook-product.kyobobook.co.kr/dig/epd/ebook/E000007158557), [방콕판 보도자료](https://gfile.gilbut.co.kr/gilbut/bookdata/BN004401/report/무작정따라하기방콕(2025-26개정판)_보도자료.pdf)) | **장소(테마)와 코스(따라가기)를 나누고 지도로 잇기** |
| 트리플 | 갈 곳만 고르면 동선·일정을 자동으로, AI 일정 추천, 동행 초대, 일정 전체·하루를 이미지로 저장. ([앱스토어](https://apps.apple.com/kr/app/트리플-최저가-예약부터-여행계획까지/id1225499481)) | **담으면 동선 자동**, 이미지로 공유 |
| Wanderlog | 링크로 동행 초대(편집/보기 권한), 여행을 가이드로 공개, 남의 가이드에서 내 여행으로 담기, 무료 + Pro(오프라인·동선 최적화·구글 지도로 내보내기). ([앱스토어](https://apps.apple.com/no/app/id1476732439), [소개](https://blogs.persana.ai/what-is-wanderlog-company-overview-details)) | **코스에서 "내 여행에 담기"**, 무료+유료 경계 |
| 구글 지도 목록 | 목록을 공개하면 다른 사람이 팔로우하고, 만든 사람이 고치면 팔로워에게도 바뀐다. 도시를 찾으면 현지인·출판사(론리플래닛 등) 목록이 보인다는 보도도. ([VentureBeat](https://venturebeat.com/business/google-maps-now-lets-you-create-share-and-follow-lists-of-places), [InsideHook](https://www.insidehook.com/travel/shared-google-maps-traveler-currency), [PhoneArena](https://www.phonearena.com/news/google-maps-rolling-out-new-updates-to-make-travelers-life-easier_id156737)) | **따라가는 코스는 고치면 따라 바뀐다**(전시·계절 갱신) |
| GO TOKYO(도쿄도·TCVB) | 공식 관광 사이트. 도쿄도·TCVB가 낸 2026 접근성 관광 안내는 23구·다마의 코스 35개를 경로·이동 시간과 함께 싣는다. ([도쿄도](https://www.english.metro.tokyo.lg.jp/w/029-101-004128), [2026 PDF](https://www.sangyo-rodo1.metro.tokyo.lg.jp/tourism/accessible/en/pdf/2026_tbf_en.pdf)) | **사실의 1차 출처**, 이동 시간까지 적는 코스 |
| 요즘 흐름 | 여행을 콘텐츠로 기록·공유, 한두 도시에 집중, 크리에이터 동행 상품. 2025 키워드가 '핫플·야경 포토존'에서 '로컬·산책·숨은 자연'으로 옮겨 갔다는 기사도(해석이라 참고만). ([고도몰 블로그](https://www.godo.co.kr/main/blog/25/%EC%97%AC%ED%96%89-%EB%B9%84%EC%A6%88%EB%8B%88%EC%8A%A4%EA%B0%80-%EC%8B%9C%EC%9E%A5%EC%97%90%EC%84%9C-%EC%84%B1%EC%9E%A5%ED%95%98%EB%8A%94-%EB%B0%A9%EB%B2%95-%EB%A7%88%EC%BC%80%ED%8C%85-%EC%82%AC%EB%A1%80-%EB%B6%84%EC%84%9D-%EC%97%AC%ED%96%89-%EB%A7%88%EC%BC%80%ED%8C%85-%ED%8A%B8%EB%A0%8C%EB%93%9C-4654), [다음](https://v.daum.net/v/b8yFGId8yD)) | 걷는 코스·동네 산책을 앞세우기 |

출처 대부분이 서점·앱스토어 소개문이라 실제 지면 구성과 다를 수 있다.

## 2. 우리 콘텐츠 구조

세 겹. 아래가 위를 만든다.

1. **장소 카드** — 이름(한·일), 동네, 컨셉 태그, 왜 가는지 한두 문장, 영업시간·휴무·요금·예약(출처와 확인 날짜), 좋은 시각(노을·아침), 찍을 자리, 구글 place ID(무기한 보관 가능, 좌표·사진은 앱이 30일 안에서 받는다).
2. **하루 코스** — 컨셉 하나 + 동네 한두 개, 5~7곳 순서, 시작 시각, 걷기·전철 횟수, 한 줄 요약과 "왜 이 순서", 비 오는 날 바꿀 곳, 기간 한정(전시 날짜·단풍)이 걸린 곳은 날짜를 적어 그 기간에만 보이게. 혼자 써도 된다(무작정 따라하기의 "따라가기", 론리플래닛의 "Perfect Day").
3. **여행 통째** — 컨셉별 3박4일·4박5일. 하루 코스를 묶고, 숙소 동네에 맞춰 날 순서를 자동으로 바꾼다(가장 먼 곳부터 숙소 쪽으로 — Henry 코스 규칙).

앱에선: 코스·여행에서 **"내 여행에 담기"**(Wanderlog), 담으면 그날 동선·시각·경고를 앱이 계산(트리플), 코스는 **따라가기**라 계절·전시가 바뀌면 같이 바뀐다(구글 지도 목록), 하루 코스를 **이미지·링크로 공유**.

## 3. 컨셉(여덟)과 순서

도쿄 처음 · 건축·디자인 · 미술관·전시 · 노포 미식 · 서점·레코드·카페 · 쇼핑·패션 · 아이와 함께 · 밤 도쿄·야경.

**먼저 "도쿄 처음" 하나를 끝까지**(장소 카드 → 하루 코스 → 3박4일·4박5일) 만들어 Henry가 형식을 확인한 뒤 나머지 일곱으로 넓힌다. 웹앱의 Henry 코스 장소는 샘플이라 그대로 쓰지 않고, 쓰더라도 공식 출처로 다시 확인한다. 남이 큐레이션한 목록(인스타 계정·남의 구글 목록)은 상업 배포라 쓰지 않는다.

## 4. 사실 규칙(웹앱과 같다)

- 영업시간·요금·전시 기간·설계자는 **공식 사이트 우선**, 없으면 관광청(GO TOKYO·JNTO)·구청, 그다음 신뢰할 매체. 기억으로 숫자를 쓰지 않는다.
- 좌표는 저장하지 않는다(구글 30일 규칙). place ID만 두고 앱이 받는다.
- 일정은 앱의 `schedule()`로 돌려 경고 0을 맞춘다(웹앱 시뮬레이터와 같은 방식).
