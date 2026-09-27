/* 늦가을 도쿄 — 여행 데이터. classic.html(이전 화면)과 index.html(Tokyo Lines)이 같이 쓴다.
   tools/make-csv.mjs 도 이 파일을 읽는다. 사실(영업시간·요금·설계자)은 출처를 확인한 것만 적는다. */
/* DATA:START — tools/make-csv.mjs 가 이 블록을 읽어 data/places.csv 를 만듭니다 */
// 숙소: SPABLIC INN かぷせる旅籠赤坂 (캡슐호텔). 주소·좌표·규정은 2026-09-24 검색으로 확인.
const HOTEL = {lat:35.676047, lng:139.736752, n:"SPABLIC INN 아카사카", ja:"かぷせる旅籠赤坂 SPABLIC INN",
  addr:"東京都港区赤坂3-10-4 赤坂月世界ビル 3F", q:"かぷせる旅籠赤坂 SPABLIC INN", stn:"赤坂見附",
  checkin:"15:00", checkout:"11:00",
  src:"https://www.hotels.com/ho2980682240/spablic-inn-tokyo-japan/", srcn:"Hotels.com"};

const DAYS = [
  { key:"wed", wd:"수", dt:"11.18", short:"도착만", date:"2026-11-18", title:"도착", summary:"20시 나리타 착륙, 숙소 도착은 22시 반 전후. 첫날은 비워둡니다.", walk:"이동은 공항에서 숙소까지만",
    stops:[
      {t:"20:00", n:"나리타 공항 도착", kc:"move", k:"이동", note:"인천 18:00 출발편. 입국 심사와 수하물을 지나 21시쯤 나옵니다."},
      {t:"22:30", n:"숙소 체크인 · SPABLIC INN", kc:"hotel", k:"숙소", hotel:true, note:"스카이라이너로 게이세이우에노까지 41분, 우에노에서 긴자선을 타면 赤坂見附(아카사카미쓰케)까지 갈아타지 않습니다. 역에서 숙소까지 1분. 기다리는 시간까지 넣은 추정입니다. 내일 9시 리쿠기엔부터 시작하니 오늘은 바로 쉬세요."}
    ]},

  { key:"thu", wd:"목", dt:"11.19", short:"리쿠기엔·우에노·스카이트리", date:"2026-11-19", title:"리쿠기엔에서 스카이트리 노을까지", summary:"아침엔 한산한 리쿠기엔, 낮엔 우에노와 호쿠사이, 해 질 녘엔 스카이트리, 저녁은 아사쿠사 에도 요리, 밤엔 숙소 옆 LP바.", walk:"북쪽에서 동쪽으로, 밤엔 긴자선 한 번에 숙소로",
    stops:[
      {t:"9:00", n:"리쿠기엔", ja:"六義園", kc:"leaf", k:"정원, 단풍", ok:"현장 발권", fee:300,
       shot:"연못 둘레 소나무와 돌다리, 단풍. 오전 순광에 물이 잔잔할 때 반영이 좋아요.",
       leg:{line:"남북선", from:"永田町(赤坂見附와 연결)", to:"駒込", note:"환승 없이 16분", v:true},
       rain:"비가 오면 정원은 짧게 돌고, 추천 탭의 에도도쿄박물관(호쿠사이 옆)을 오후에 넣거나 도쿄국립박물관을 넉넉히 보세요.",
       note:"에도 시대 다이묘 정원. 9시에 열어요. 평일 아침이라 가장 한산한 시간입니다. 단풍철엔 駒込역에서 2분인 染井門이 열려서 정문(7분)보다 가까워요. 야간 라이트업은 이번 일정 뒤에 시작합니다.",
       id:"ChIJYUQ-972NGGAR5W_2E0N3SHY", q:"六義園", lat:35.73246, lng:139.748314},
      {t:"10:30", n:"도쿄국립박물관", ja:"東京国立博物館", kc:"art", k:"박물관", closed:"월 휴관", dig:"@hi_dongwon", 
       arch:{by:"渡辺仁", year:1937, note:"제관양식 본관"},
       shot:"정문에서 본관을 정면 대칭으로. 본관 가운데 대계단도 유명한 장면이에요. 같은 부지 안 법륭사보물관(다니구치 요시오)은 연못에 비친 수평 입면을 노리세요.",
       leg:{line:"JR 야마노테선", from:"駒込", to:"上野", note:"10분 안팎", v:true},
       note:"대덕사 개창 700년 특별전(10/14–12/6)과 히로시게전(9/29–12/20)이 함께 열립니다.",
       ask:"특별전 예약제 여부 확인", needId:"tnm", doneLabel:"확인 완료", fee:2300, feeNote:"대덕사전 당일권(예매 2,100엔)",
       q:"東京国立博物館", id:"ChIJEX3XFIOOGGAR3XdJvRjWLyM", lat:35.7188351, lng:139.7765215},
      {t:"12:35", n:"국립서양미술관", ja:"国立西洋美術館", kc:"art", k:"건축", closed:"월 휴관", opt:true, fee:0, feeNote:"밖에서만 보기",
       arch:{by:"ル・コルビュジエ", note:"세계유산"},
       shot:"필로티 아래 그늘과 앞마당 로댕 조각을 함께. 바로 맞은편이 제자 마에카와 구니오의 도쿄문화회관이라 스승과 제자 건물을 한 장씩.",
       note:"르코르뷔지에가 설계한 세계유산 건물. 점심 가는 길에 밖에서 10분만 봅니다.",
       q:"国立西洋美術館", id:"ChIJf8xB-pyOGGARizzhlNTcI7s", lat:35.7153869, lng:139.7758138},
      {t:"12:50", n:"ROUTE BOOKS", kc:"book", k:"북카페, 점심",
       note:"히가시우에노. 카페 안에 서가가 있는 구조. 오늘 점심 자리예요.",
       q:"ROUTE BOOKS", id:"ChIJw1ucnpmOGGAR9Rs5XdSMYL0", lat:35.7139296, lng:139.7807258},
      {t:"14:15", n:"스미다 호쿠사이 미술관", ja:"すみだ北斎美術館", kc:"art", k:"미술관", closed:"월 휴관", ok:"현장 발권",
       arch:{by:"妹島和世", year:2016},
       shot:"알루미늄 패널 외관이 하늘색을 비춰요. 건물을 가르는 틈(슬릿) 사이로 반대편 동네가 보이는 구도가 이 건물의 포인트.",
       leg:{line:"오에도선", from:"上野御徒町", to:"両国", note:"환승 없이 6분 안팎", v:true},
       fee:1500, feeNote:"개관 10주년 특별전",
       note:"개관 10주년 특별전 '베스트 오브 스미다 호쿠사이 미술관'(9/15–11/23)이 열리는 중이라 대표작을 한 번에 봅니다. 15:30에는 나와야 스카이트리 노을에 맞춰요. 스카이트리까지는 스미다 순환버스(100엔)나 택시가 편해요. 바로 옆이 2026년 3월에 다시 연 에도도쿄박물관(추천 탭).",
       q:"すみだ北斎美術館", id:"ChIJgRjTtzOJGGARqoKBtB8BAno", lat:35.6963313, lng:139.800414},
      {t:"15:50", n:"도쿄 스카이트리", ja:"東京スカイツリー", kc:"view", k:"전망대, 노을", need:"날짜 지정권", needId:"skytree", fee:2600, feeNote:"평일 2,200~2,600엔, 날마다 다름",
       shot:"타워 위에선 창에 렌즈를 붙여 반사를 막으세요. 필름으로 타워 자체를 찍고 싶으면 추천 탭의 짓켄바시(역스카이트리)를 보세요.",
       rain:"흐리거나 비가 오면 노을과 먼 경치가 안 보여요. 입장권을 바꿀 수 있는지 먼저 보고, 안 되면 야경 위주로 즐기세요.",
       note:"11월 19일 도쿄 일몰은 16:32쯤. 16시 전에 올라가 있으면 해 지는 것부터 야경까지 한 번에 봅니다. 노을 시간대는 인기라 입장 시각을 16:00 전으로 예약하세요.",
       q:"東京スカイツリー", id:"ChIJ35ov0dCOGGARKvdDH7NPHX0", lat:35.7100627, lng:139.8107004},
      {t:"17:50", n:"고마카타 도제우", ja:"駒形どぜう 本店", kc:"food", k:"식당, 저녁", ask:"휴무일 확인", needId:"dozeu", close:"20:30",
       leg:{line:"아사쿠사선", from:"押上", to:"浅草", note:"3분 안팎", v:true},
       note:"1801년에 문을 연 미꾸라지 요리집. 다다미 방에서 얕은 냄비에 끓여 먹는 에도 서민 음식이에요. 11:00~20:30(주문 20:00까지). 쉬는 날이 달마다 달라서 11월 휴무일을 공식 사이트에서 확인하세요.",
       id:"ChIJY57SxceOGGAR5p8zPgOh_p4", q:"駒形どぜう 本店", lat:35.7068, lng:139.7955},
      {t:"19:45", n:"bar all", ja:"バー オール", kc:"bar", k:"LP바", close:"04:00",
       leg:{line:"긴자선", from:"浅草", to:"赤坂見附", note:"갈아타지 않고 25분 안팎", v:true},
       note:"숙소에서 걸어서 2분 거리(赤坂3-20-9, 2층). 레코드 3,000장 넘게, 1975년 스피커와 진공관 앰프로 60~80년대 록·AOR을 틀어요. 19시~새벽 4시, 일·공휴일 휴무. 막차 걱정 없이 걸어서 들어가는 밤.",
       id:"ChIJi837i32NGGARiZDgbx5GX4k", q:"bar all 赤坂", lat:35.6755, lng:139.7372}
    ]},

  { key:"fri", wd:"금", dt:"11.20", short:"츠키지·진보초·니혼바시", date:"2026-11-20", title:"츠키지에서 진보초, 니혼바시로", summary:"츠키지 시장 아침, 근대미술관, 카레 점심, 헌책방 거리, 아티존(금요일 20시까지), 가부토초 스시와 탁주, 밤엔 숙소 옆 LP바. 도쿄 동쪽 도심 안에서만 움직여요.", walk:"동쪽 도심 안에서만, 밤엔 긴자선 한 번에 숙소로",
    stops:[
      {t:"7:30", n:"츠키지 장외시장", ja:"築地場外市場", kc:"market", k:"시장", cash:true,
       shot:"이른 아침 좁은 골목과 간판, 가게 사람들. 가게 앞 촬영은 한마디 묻고(도움 탭 한마디).",
       note:"9시 넘으면 몸싸움. 일요일·공휴일엔 대부분 닫아요.",
       q:"築地場外市場", id:"ChIJW2cLzSGLGGARXAKXv6EkbqI", lat:35.6647703, lng:139.7702515},
      {t:"8:00", n:"우니토라 나카도리점", ja:"うに虎 中通り店", kc:"food", k:"식당, 아침",
       note:"7시부터. 시장 한복판이라 따로 움직일 필요 없음.",
       q:"うに虎 中通り店", id:"ChIJ7QgKJ9-LGGAR-CG9wwEzMG0", lat:35.6655762, lng:139.7704993},
      {t:"10:15", n:"도쿄국립근대미술관", ja:"東京国立近代美術館", kc:"art", k:"미술관", closed:"월 휴관", ok:"창구 당일권", close:"20:00",
       arch:{by:"谷口吉郎", year:1969},
       shot:"굵은 기둥이 받치는 필로티와 물결치는 보. 해자(기타노마루) 쪽에서 건물 전체를.",
       leg:{line:"지하철", from:"築地", to:"竹橋", note:"16분 안팎, 환승 1번", v:true},
       note:"다케히사 유메지전(10/23–1/11). 화가이자 시인, 디자이너였던 유메지의 대표작 〈구로후네야〉가 약 40년 만에 나옵니다.",
       q:"東京国立近代美術館", id:"ChIJL0kSfg2MGGARKv5KX53ZZ2Y", lat:35.6905432, lng:139.7546932},
      {t:"12:00", n:"구풍 카레 본디", ja:"欧風カレー ボンディ 神保町本店", kc:"food", k:"식당, 점심",
       note:"진보초 카레의 대표. 간다 고서센터 빌딩 2층, 평일 11:00~22:00, 연중무휴. 점심때 줄이 서니 12시 전에 도착하면 좋아요.",
       id:"ChIJBefQ4hOMGGARIkZIs01cRlQ", q:"欧風カレー ボンディ 神保町本店", lat:35.6957, lng:139.7582},
      {t:"13:45", n:"난요도 서점", ja:"南洋堂書店", kc:"book", k:"서점", closed:"목·일 휴무",
       note:"건축 전문 헌책방. 실내 촬영 금지.",
       q:"南洋堂書店", id:"ChIJC6eoXhCMGGARF9F1jKsKGEQ", lat:35.6952013, lng:139.7610973},
      {t:"14:30", n:"진보초 북센터", ja:"神保町ブックセンター", kc:"book", k:"북카페", close:"19:00",
       note:"이와나미쇼텐 건물. 산 책 펼쳐보며 커피 한 잔 쉬어 가는 자리.",
       q:"神保町ブックセンター", id:"ChIJebJT_ROMGGARV_jAAmMVIFY", lat:35.6957485, lng:139.7575553},
      {t:"15:45", n:"아티존 미술관", ja:"アーティゾン美術館", kc:"art", k:"미술관", closed:"월 휴관", need:"일시 지정 예약", needId:"artizon", close:"20:00", fee:1200, feeNote:"웹 예약(창구 1,500엔)",
       leg:{line:"지하철", from:"神保町", to:"京橋", note:"16분 안팎, 환승 1번", v:true},
       note:"교바시. 유럽에 간 일본 서양화가들, 후지이 히카루와 소장품의 협업 등 전시 세 개가 동시에 열립니다(10/24–1/31). 금요일은 20:00까지라 여유 있게 보고, 17:10쯤 나와 기쿠스시까지 걸어가면 됩니다.",
       q:"アーティゾン美術館", id:"ChIJOzAxseKLGGARWxBlxNWWRPs", lat:35.6787634, lng:139.7718919},
      {t:"17:30", n:"기쿠스시", ja:"菊寿司", kc:"food", k:"식당, 저녁", need:"예약", needId:"kiku",
       note:"니혼바시 가부토초에서 60년 넘게 이어온 에도마에 스시(日本橋兜町17-1). 저녁 17:00~22:00, 토·일·공휴일 휴무라 이번엔 이날뿐.",
       q:"Kiku Sushi 日本橋", id:"ChIJRX-nulmJGGAR9ynATgff8U0", lat:35.6790868, lng:139.7764141},
      {t:"18:50", n:"KITOKI · 평화 도부로쿠 양조소", ja:"KITOKI 平和どぶろく兜町醸造所", kc:"photo", k:"건축, 한 잔", opt:true, close:"22:30", dig:"@daytripkorea", 
       arch:{by:"ADX", year:2022, note:"일본 첫 목조 하이브리드 빌딩"},
       shot:"10층 건물을 콘크리트 큰 틀 안에 나무로 채운 외관. 해가 진 뒤라 1층 불빛이 나무 사이로 새어 나올 때, 길 건너에서 세로로 한 장.",
       note:"기쿠스시와 같은 가부토초라 걸어서 몇 분. 1층 양조소에서 도부로쿠(탁주) 한 잔. 평일 13:00~22:30. Bar Luther까지 긴자선 한 번이에요.",
       id:"ChIJ-RK6_KaJGGARuNdhFvBlreU", q:"KITOKI 兜町", lat:35.6809, lng:139.7781},
      {t:"20:30", n:"Bar Luther 赤坂", ja:"バー ルーサー 赤坂", kc:"bar", k:"LP바", ask:"영업시간 확인",
       leg:{line:"긴자선", from:"日本橋", to:"赤坂見附", note:"갈아타지 않음", v:true},
       note:"숙소 옆 블록 지하(赤坂3-20-2). 70~80년대 소울·블랙 컨템퍼러리·AOR을 아날로그로 트는 바. 일요일 휴무. 영업시간이 출처마다 달라서(19:00~03:30 / 18:00~22:00) 전화(03-6277-8016)로 확인하세요. 금요일의 끝을 숙소 앞에서.",
       id:"ChIJQ5KlJ3-MGGARs2j2y4U0Mn4", q:"Bar Luther Akasaka", lat:35.6754, lng:139.7369}
    ],
    // 서점은 하루 두 곳까지(Henry 요청, 2026-09-27). 뺀 곳은 spare에 두고 후보함(cands)에 띄운다
    spare:[
      {t:"13:00", n:"책거리 CHEKCCORI", ja:"チェッコリ", kc:"book", k:"서점", closed:"월·화·일 휴무",
       note:"한국책 전문 서점. 수~토만 엽니다.",
       q:"CHEKCCORI 神保町", id:"ChIJdwtTFhGMGGARWzRaGOwBo6s", lat:35.6957744, lng:139.7589697}
    ],
    cands:["CHEKCCORI 神保町"]},

  { key:"sat", wd:"토", dt:"11.21", short:"나카메구로·롯폰기·시부야", date:"2026-11-21", title:"나카메구로에서 롯폰기, 아오야마, 시부야로", summary:"나카메구로 로스터리 아침에서 롯폰기, 아오야마 은행나무길, 시부야 서점들을 지나 밤엔 시부야 LP바. 남서쪽으로 한 방향이고 가장 긴 하루예요.", walk:"도보 약 11km",
    stops:[
      {t:"7:30", n:"스타벅스 리저브 로스터리 도쿄", ja:"スターバックス リザーブ ロースタリー 東京", kc:"food", k:"카페, 아침", dig:"@daytripkorea", 
       leg:{line:"지하철", from:"赤坂見附", to:"中目黒", note:"19분 안팎, 환승 있음", v:true},
       arch:{by:"隈研吾(외관)", year:2019},
       shot:"4층까지 뚫린 천장에 17m 구리 캐스크와 벚꽃 모양 종이접기 천장. 1층 바 앞에서 위로 올려 찍고, 밖에선 메구로강 다리 위에서 삼나무 판자 외관을 정면으로. 아침 역광이 부드러워요.",
       note:"2019년에 연 세계 다섯 번째 로스터리. 7:00~22:00. 토요일은 번호표(Airウェイト)가 필요할 만큼 붐벼서 문 여는 7시에 맞춰 가요. 1층 베이커리 프린치에서 아침을 먹습니다.",
       id:"ChIJq_fYt4iLGGARrOojmQ4IMyE", q:"スターバックス リザーブ ロースタリー 東京", lat:35.6495, lng:139.6941},
      {t:"10:00", n:"국립신미술관", ja:"国立新美術館", kc:"art", k:"미술관", closed:"화 휴관", ok:"당일권", dig:"@hi_dongwon", 
       arch:{by:"黒川紀章", year:2007},
       shot:"물결치는 유리 커튼월과 아트리움의 거대한 역원뿔 두 개. 관내 공용 공간은 개인 촬영 가능(전시실은 전시마다 다름). 창가 빛이 바닥에 떨어지는 오전이 좋아요.",
       leg:{line:"히비야선", from:"中目黒", to:"六本木", note:"8분, 갈아타지 않음", v:true},
       note:"소장품 없이 기획전만 여는 곳이라 무엇이 걸렸는지 미리 확인하세요.",
       id:"ChIJP-vO9nuLGGARGJ2q8uryJUA", q:"国立新美術館", lat:35.6652, lng:139.7264},
      {t:"12:30", n:"네즈미술관과 네즈카페", ja:"根津美術館", kc:"art", k:"미술관", closed:"월 휴관", need:"일시 지정 예약", needId:"nezu", fee:1500, feeNote:"웹 예약, 정원 포함", dig:"@daytripkorea", 
       arch:{by:"隈研吾", year:2009},
       shot:"입구에서 본관까지 대나무 벽 사이 진입로가 대표 장면. 사람이 없을 때 소실점으로. 정원 쪽에서 얇은 큰 지붕을. 정원 안 NEZUCAFÉ는 사방이 유리라 숲이 액자처럼 들어와요(10:00~16:30, 음료 L.O. 16:00).",
       leg:{line:"치요다선", from:"노기자카역", to:"오모테산도역", v:true},
       note:"칠기 전시(10/24–11/23). 쿠마 겐고 건물에 일본 정원, 11월 하순이면 단풍 절정. 정원을 먼저 돌고 카페는 나중에.",
       q:"根津美術館", id:"ChIJxU48-2OLGGARHMtB5RAhytA", lat:35.6622568, lng:139.7170937},
      {t:"14:00", n:"진구가이엔 은행나무길", ja:"神宮外苑いちょう並木", kc:"leaf", k:"사진 스팟, 단풍", outside:true,
       shot:"아오야마도리 쪽 입구에서 길 끝 회화관까지 원근감으로. 차도 가운데는 위험하니 보도에서. 노란 잎은 역광일 때 빛나요.",
       rain:"비가 오면 길 끝에서 사진만 찍고, 네즈 카페에서 더 머물거나 선택 일정인 와타리움을 넉넉히 보세요.",
       note:"아오야마도리에서 이어지는 300m 은행나무 터널. 절정은 11월 하순~12월 상순이라 21일은 노랗게 물드는 중일 거예요. 토요일이라 붐비니 길 가운데보다 양 끝에서 찍으세요. 은행나무 축제가 이맘때 열리는 해가 많습니다(올해 날짜는 공식 사이트 확인).",
       id:"ChIJ_XxY_JqMGGARACDk4sraoN8", q:"神宮外苑いちょう並木", lat:35.6745, lng:139.718},
      {t:"14:50", n:"와타리움 미술관", ja:"ワタリウム美術館", kc:"art", k:"미술관", closed:"월 휴관", ok:"현장 발권", opt:true,
       arch:{by:"マリオ・ボッタ"},
       shot:"좁은 삼각형 땅에 선 줄무늬 외관. 길 건너편에서 모서리를 정면으로.",
       note:"마리오 보타 설계. 1층 아트북숍 on Sundays가 사실상 본 무대. 은행나무길에서 걸어서 갈 수 있는 거리예요.",
       q:"ワタリウム美術館", id:"ChIJXf9Z6JiMGGARRZ0zg4fFgLU", lat:35.6707251, lng:139.7133581},
      {t:"16:00", n:"블루보틀 시부야 카페", ja:"ブルーボトルコーヒー 渋谷カフェ", kc:"food", k:"카페", dig:"구글 지도",
       note:"기타야 공원 안 2층 매장. 8:00~20:00. 오모테산도에서 시부야로 내려가는 길에 쉬어 가요.",
       id:"ChIJiXocb7WNGGAReVVBhRwWLoQ", q:"ブルーボトルコーヒー 渋谷カフェ", lat:35.6624, lng:139.7019},
      {t:"17:10", n:"SO BOOKS", kc:"book", k:"사진집 헌책방", closed:"일·월 휴무", close:"19:00", dig:"구글 지도", 
       note:"사진집·아트·건축 책 전문 헌책방. 13:00~19:00. 代々木八幡역 2분, 하츠다이 가는 길에 있어요. 19시에 닫아요. 필름으로 찍는 사람에게 이번 여행 서점 중 가장 맞는 곳.",
       id:"ChIJpY50jUvzGGARgLvxxk1KE6E", q:"SO BOOKS 代々木八幡", lat:35.669, lng:139.686},
      {t:"18:15", n:"Bookshelf Fuzkue", ja:"本の読める店 fuzkue 初台", kc:"book", k:"북카페, 저녁 겸", close:"23:00",
       note:"하츠다이. 조용히 앉아 읽는 곳이라 오늘의 휴식 시간이기도 합니다.",
       q:"Bookshelf Fuzkue", id:"ChIJVVVWOTLzGGARtVH01Eyw00c", lat:35.6802894, lng:139.6869601},
      {t:"21:00", n:"THE MUSIC BAR CAVE SHIBUYA", kc:"bar", k:"LP바", closed:"월·일 휴무", close:"03:00",
       note:"지하 LP바. 8시 넘으면 자리가 찹니다. 돌아올 땐 긴자선 渋谷 → 赤坂見附 한 번이라 숙소까지 갈아타지 않아요. 막차는 준비 > 숙소·교통의 막차 안내를 보세요.",
       q:"THE MUSIC BAR CAVE SHIBUYA", id:"ChIJSZ7DkMGNGGARDBKSX-n_p_E", lat:35.6608436, lng:139.7029841}
    ],
    spare:[
      {t:"15:50", n:"Utrecht", ja:"ユトレヒト", kc:"book", k:"서점", closed:"월 휴무",
       note:"아트북과 진. 잡화점 2층, 간판이 없어요.",
       q:"Utrecht 神宮前", id:"ChIJCwoF2qaMGGARedkSzbpnnws", lat:35.6642639, lng:139.7059777},
      {t:"17:00", n:"SPBS 본점", ja:"SHIBUYA PUBLISHING & BOOKSELLERS", kc:"book", k:"서점",
       note:"출판사가 직접 운영하는 서점.",
       q:"SHIBUYA PUBLISHING & BOOKSELLERS", id:"ChIJ2xOID62MGGARLWvFZNk7PiA", lat:35.6642569, lng:139.6933161}
    ],
    cands:["Utrecht 神宮前","SHIBUYA PUBLISHING & BOOKSELLERS"]},

  { key:"sun", wd:"일", dt:"11.22", short:"도쿄역·긴자·출국", date:"2026-11-22", title:"도쿄역에서 긴자로, 출국하는 날", summary:"황궁 분수공원에서 커피, 도쿄역과 국제포럼을 지나 1936년 찻집에서 아침. 서점 둘, 갤러리 하나, 긴자 양식 점심. 18시 나리타 비행기라 13시 반 전에 긴자를 떠납니다.", walk:"아침에 지하철 한 번, 나머지는 걸어서",
    stops:[
      {t:"8:40", n:"스타벅스 황궁외원 와다쿠라 분수공원점", ja:"スターバックス コーヒー 皇居外苑 和田倉噴水公園店", kc:"food", k:"카페, 아침 커피", stay:30, dig:"@daytripkorea", 
       leg:{line:"마루노우치선", from:"赤坂見附", to:"東京", note:"갈아타지 않음", v:true},
       shot:"분수공원과 황궁 해자 옆 통유리 매장. 아침 빛이 낮게 드는 시간이라 창가 자리와 분수를 같이 넣어 보세요.",
       note:"7:00~21:00. 체크아웃하고 짐을 숙소에 맡긴 뒤 8시쯤 나오세요. 도쿄역 마루노우치 역사를 지나 국제포럼, 긴자까지 걸어 내려갑니다.",
       id:"ChIJZ9pLxYyLGGARTAgqtMbtRnU", q:"スターバックス 皇居外苑 和田倉噴水公園店", lat:35.684, lng:139.7625},
      {t:"9:40", n:"긴자 트리콜로르 본점", ja:"銀座トリコロール 本店", kc:"food", k:"찻집, 아침", stay:40, dig:"@daytripkorea", 
       shot:"1936년에 연 찻집의 클래식한 실내. 창가 자리에서 커피 잔과 함께.",
       note:"긴자 5초메, 1936년 개업. 8:00~19:00(영업시간은 공식 인스타 @tricolore_koushiki에서 다시 확인). 츠타야(GINZA SIX)까지 걸어서 몇 분.",
       id:"ChIJC2oNCO-LGGARxV0IFmgNzJU", q:"銀座トリコロール 本店", lat:35.6703, lng:139.7668},
      {t:"10:30", n:"긴자 츠타야 서점", ja:"銀座 蔦屋書店", kc:"book", k:"서점",
       note:"GINZA SIX 6층, 10:30에 엽니다. 아트와 사진집 서가가 압권이고, 짐 부칠 책은 여기서 마지막으로.",
       q:"銀座 蔦屋書店", id:"ChIJH6YwSOaLGGAR_LGfsNivcXE", lat:35.6694161, lng:139.7642674},
      {t:"11:30", n:"시세이도 파라 긴자 본점", ja:"資生堂パーラー 銀座本店レストラン", kc:"food", k:"식당, 점심", ask:"예약 권장", needId:"parlour",
       note:"긴자의 오래된 양식당. 11:30에 열고 월요일 휴무. 시세이도 갤러리와 같은 건물이라 점심 뒤 바로 내려가면 됩니다.",
       id:"ChIJoVC4i-iLGGAR9mJULMWzaxM", q:"資生堂パーラー 銀座本店レストラン", lat:35.668557, lng:139.7618936},
      {t:"12:30", n:"시세이도 갤러리", ja:"資生堂ギャラリー", kc:"art", k:"갤러리", ok:"무료", fee:0, stay:30,
       note:"같은 건물 지하. 일요일은 11:00~18:00. 30분이면 됩니다.",
       q:"資生堂ギャラリー", id:"ChIJBwTDyeiLGGARuY5n3x3bdCk", lat:35.668557, lng:139.7618936},
      {t:"13:00", n:"모리오카 서점", ja:"森岡書店 銀座店", kc:"book", k:"서점", closed:"월 휴무", stay:15,
       note:"책 한 권만 파는 5평 서점이라 10~20분이면 충분해요. 13시에 열고, 13:25쯤 긴자를 떠납니다.",
       q:"森岡書店 銀座", id:"ChIJqTpnNOCLGGARzXnKjoTqPyE", lat:35.6720587, lng:139.7718447}
    ]}
];

// 지나가며 찍는 건축. 시간 칸 없이 가까운 일정(near = 그 장소의 q) 카드에 붙는다. 2026-09-25 확인.
// 좌표는 주소 기준 대략값이다. 지도·길찾기 버튼은 이름(q)으로 검색한다.
const SIGHTS = [
  {n:"표경관", ja:"表慶館", day:"thu", near:"東京国立博物館", by:"片山東熊", year:1909, dig:"@daytripkorea", 
   why:"일본 첫 본격 미술관으로 지은 메이지 양관(중요문화재). 가운데와 양옆의 돔, 외벽 위쪽의 악기·제도 도구 부조. 안은 행사 때만 열려서 밖에서 봐요.",
   id:"ChIJEX3XFIOOGGAR3XdJvRjWLyM", q:"東京国立博物館 表慶館", lat:35.718, lng:139.7755, src:"https://tatefro.com/entry-51.html", srcn:"たてものフロンティア"},
  {n:"도쿄문화회관", ja:"東京文化会館", day:"thu", near:"国立西洋美術館", by:"前川國男", year:1961,
   why:"코르뷔지에의 제자 마에카와 구니오의 모더니즘 대표작. 스승의 서양미술관과 마주 보고 있어요. 2026-09-27 구글 지도에 '임시 휴업'으로 나와요. 밖에서 보는 곳이지만 가기 전에 확인하세요.",
   id:"ChIJRRISsp2OGGARTNMhXv2t-BQ", q:"東京文化会館", lat:35.7129, lng:139.7751, src:"https://artplaza.geidai.ac.jp/sights/11992/", srcn:"藝大アートプラザ"},
  {n:"법륭사보물관", ja:"法隆寺宝物館", day:"thu", near:"東京国立博物館", by:"谷口吉生",
   why:"도쿄국립박물관 부지 안. 얕은 연못 너머 유리와 금속의 수평 입면이 조용하게 비쳐요.",
   id:"ChIJEX3XFIOOGGAR3XdJvRjWLyM", q:"法隆寺宝物館", dig:"@daytripkorea", lat:35.7192, lng:139.7744, src:"https://archi-graphy.com/%E6%B3%95%E9%9A%86%E5%AF%BA%E5%AE%9D%E7%89%A9%E9%A4%A8/", srcn:"ARCHI-GRAPHY"},
  {n:"프라다 아오야마", ja:"プラダ 青山店", day:"sat", near:"根津美術館", by:"Herzog & de Meuron", year:2003,
   why:"마름모 격자에 볼록한 유리를 끼운 건물. 네즈미술관 앞 미유키도리에 있어요.",
   id:"ChIJEQPUS2CLGGARGabj2jNw_po", q:"プラダ 青山店", lat:35.6627, lng:139.7148, src:"https://architecturephoto.net/syasin/005/h005.htm", srcn:"architecturephoto"},
  {n:"디올 오모테산도", ja:"ディオール表参道", day:"sat", near:"ワタリウム美術館", by:"SANAA(妹島和世+西沢立衛)",
   why:"유리 안쪽에 아크릴 막을 겹쳐 흰 드레이프처럼 보이는 외관. 와타리움에서 오모테산도 길을 따라 걸으면 있어요.",
   id:"ChIJzVqR6ICNGGARu5koCQyRlpg", q:"ディオール表参道", lat:35.6668, lng:139.7085, src:"https://www.tozai-as.or.jp/mytech/04/04_sejima01.html", srcn:"東西アスファルト"},
  {n:"TOD'S 오모테산도", ja:"TOD'S表参道ビル", day:"sat", near:"ワタリウム美術館", by:"伊東豊雄", year:2004,
   why:"느티나무 가로수를 닮은 나뭇가지 모양 콘크리트 외관. 디올과 같은 길이라 한 번에.",
   id:"ChIJVQdDcACNGGARQj67PArgpOU", q:"TOD'S表参道ビル", lat:35.6679, lng:139.7093, src:"https://www.tozai-as.or.jp/mytech/06/06_ito04.html", srcn:"東西アスファルト"},
  {n:"메종 에르메스", ja:"銀座メゾンエルメス", day:"sun", near:"資生堂ギャラリー", by:"Renzo Piano", year:2001,
   why:"45cm 유리블록 1만 5천 개로 감싼 건물. 낮엔 반투명한 벽, 흐린 날엔 더 부드럽게 찍혀요.",
   id:"ChIJf6h47uWLGGARqjrFBsa_t90", q:"銀座メゾンエルメス", lat:35.6717, lng:139.7632, src:"https://jbpress.ismedia.jp/articles/-/86591?page=2", srcn:"JBpress"},
  {n:"미키모토 긴자 2", ja:"MIKIMOTO Ginza 2", day:"sun", near:"森岡書店 銀座", by:"伊東豊雄", year:2005,
   why:"치즈 구멍 같은 불규칙한 창이 여러 층에 걸쳐 뚫린 분홍빛 외관. 모리오카 서점 가는 길 마로니에도리에.",
   id:"ChIJmRERReSLGGARlDLwpcnBctI", q:"MIKIMOTO Ginza 2", lat:35.6739, lng:139.7678, src:"https://www.asahi-mullion.com/column/article/tatemono/3407", srcn:"朝日マリオン"},
  {n:"도쿄역 마루노우치 역사", ja:"東京駅丸の内駅舎", day:"sun", near:"スターバックス 皇居外苑 和田倉噴水公園店", by:"辰野金吾", year:1914, dig:"@daytripkorea", 
   why:"붉은 벽돌 역사. 공습으로 잃은 남북 돔을 2012년에 처음 모습으로 되살렸어요. 와다쿠라에서 역 앞 광장까지 걸어서 몇 분, 광장 가운데서 좌우 대칭으로.",
   id:"ChIJE9qjZ0-LGGARQiAs8hULJsg", q:"東京駅丸の内駅舎", lat:35.6812, lng:139.7661, src:"https://www.kajima.co.jp/tech/tokyo_station/index-j.html", srcn:"鹿島"},
  {n:"도쿄국제포럼 유리동", ja:"東京国際フォーラム ガラス棟", day:"sun", near:"銀座トリコロール 本店", by:"Rafael Viñoly", year:1996, dig:"@daytripkorea", 
   why:"유리 3,600장으로 감싼 배 밑바닥 같은 건물, 높이 약 60m 아트리움. 안은 자유롭게 볼 수 있어요. 도쿄역에서 트리콜로르 가는 길.",
   id:"ChIJ4f1ovPqLGGARPSbtLQBqysQ", q:"東京国際フォーラム", lat:35.6766, lng:139.764, src:"https://takearch1894.com/tokyo-international-forum/", srcn:"TAKE ARCH"}
];

// 일정 밖 추천. 2026년 9월 22일 검색으로 확인한 것만 넣는다. 출처 없는 항목은 넣지 말 것.
const RECS = [
  {n:"에도도쿄박물관", ja:"江戸東京博物館", kc:"art", k:"박물관", area:"료고쿠", when:"thu",
   why:"4년 동안 닫혀 있다가 2026년 3월 31일 다시 열었습니다. 에도 거리 재현이 넓어졌고 니혼바시 다리를 실물 크기로 들여놨어요. 스마트폰 다국어 안내가 13개 언어를 지원합니다.",
   tip:"목요일 호쿠사이 미술관 바로 옆입니다. 둘 다 보기엔 오후가 빠듯해서, 넣는다면 호쿠사이 대신 들르세요.",
   id:"ChIJOWXu4TSJGGAR07vEEi8fZAw", q:"江戸東京博物館", src:"https://www.english.metro.tokyo.lg.jp/w/116-101-007403", srcn:"도쿄도 공식", lat:35.6966, lng:139.7957, slot:{day:"thu", t:"14:15"}},

  {n:"아사쿠사 문화관광센터 전망대", ja:"浅草文化観光センター", kc:"view", k:"전망대, 무료", area:"아사쿠사", when:"thu",
   why:"쿠마 겐고가 설계한 건물이고, 꼭대기 전망대가 무료입니다. 센소지와 스카이트리를 한 프레임에 넣을 수 있어요.",
   tip:"목요일 저녁 먹는 아사쿠사에 있어요. 무료라 저녁 뒤 야경 보고 바로 가도 됩니다. 네즈미술관도 쿠마 겐고라 같이 보면 재미있어요.",
   id:"ChIJr2cNBsGOGGARSX3xfkspQHc", q:"浅草文化観光センター", src:"https://kr.hotels.com/go/japan/most-instagrammable-places-tokyo", srcn:"Go Guides", lat:35.7108, lng:139.7966, slot:{day:"thu", t:"19:00"}},

  {n:"도쿄도 사진미술관", ja:"東京都写真美術館", kc:"art", k:"미술관", area:"에비스", when:"sat",
   why:"일본 최초의 사진 전문 미술관입니다. 소장품이 3만 5천 점, 전시실 세 개에서 해마다 스무 번 넘는 전시가 열려요.",
   tip:"에비스역에서 몇 분 거리라 토요일 시부야 동선에서 한 정거장입니다. 가는 전시가 무엇인지는 먼저 확인하세요.",
   id:"ChIJq6radhaLGGAR2-mAGeshrHk", q:"東京都写真美術館", src:"https://www.gotokyo.org/kr/spot/1744/index.html", srcn:"GO TOKYO", lat:35.6419, lng:139.7136, slot:{day:"sat", t:"16:30"}},

  {n:"구풍 카레 본디", ja:"欧風カレー ボンディ 神保町本店", kc:"food", k:"식당, 점심", area:"진보초", when:"fri",
   why:"진보초는 카레 격전지예요. 책을 한 손에 들고 먹을 수 있다는 이유로 헌책방 거리에 카레집이 늘었다고 합니다. 본디는 간다에서 두 번째로 오래된 집이고 1회 카레 그랑프리 우승집입니다.",
   tip:"금요일 12:00 점심으로 일정에 넣었습니다.",
   id:"ChIJBefQ4hOMGGARIkZIs01cRlQ", q:"欧風カレー ボンディ 神保町本店", src:"https://visit-chiyoda.com/kanda-jimbocho-best-eats-cafe-restaurants/", srcn:"Visit Chiyoda", lat:35.6957, lng:139.7582, slot:{day:"fri", t:"12:45"}},

  {n:"수마트라 카레 쿄에이도", ja:"スマトラカレー 共栄堂", kc:"food", k:"식당, 점심", area:"진보초", when:"fri",
   tip:"본디 대신 가고 싶을 때. 같은 진보초라 금요일 점심 자리를 그대로 바꾸면 됩니다.",
   why:"1924년에 문을 연 집입니다. 밀가루를 쓰지 않고 향신료 스물여섯 가지로 채소와 고기 맛을 졸여서 냅니다. 진보초역에서 야스쿠니도리 쪽으로 1분.",
   id:"ChIJc5NiOxGMGGARL8jOKrnIR5c", q:"スマトラカレー 共栄堂", src:"https://japantravel.navitime.com/ko/area/jp/guide/NTJnews0256-ko/", srcn:"NAVITIME", lat:35.6958, lng:139.7597, slot:{day:"fri", t:"12:45"}},

  {n:"진구가이엔 은행나무길", ja:"神宮外苑いちょう並木", kc:"leaf", k:"사진 스팟, 단풍", area:"아오야마", when:"sat",
   why:"300미터 은행나무 터널입니다. 늦가을 도쿄에서 가장 유명한 노란 길이에요.",
   tip:"절정은 11월 하순에서 12월 상순입니다. 18~22일은 절정 직전이라 아직 초록이 섞여 있을 수 있어요. 토요일 14:00에 일정으로 넣었습니다.",
   id:"ChIJ_XxY_JqMGGARACDk4sraoN8", q:"神宮外苑いちょう並木", src:"https://www.gotokyo.org/kr/story/guide/autumn-leaves-forecast/index.html", srcn:"GO TOKYO", lat:35.6745, lng:139.718, slot:{day:"sat", t:"14:00"}},

  {n:"리쿠기엔", ja:"六義園", kc:"leaf", k:"사진 스팟, 정원", area:"고마고메", when:"any",
   why:"에도 시대에 만든 정원입니다. 단풍 드는 나무가 560그루쯤 있어요.",
   tip:"야간 특별 관람은 11월 28일쯤 시작합니다. 이번 일정(~22일)에는 아직 안 하니 낮에 가세요. 목요일 9:00, 한산한 개원 시간에 일정으로 넣었습니다.",
   id:"ChIJYUQ-972NGGAR5W_2E0N3SHY", q:"六義園", src:"https://www.gotokyo.org/kr/story/guide/autumn-leaves-forecast/index.html", srcn:"GO TOKYO", lat:35.73246, lng:139.748314, slot:{day:"thu", t:"9:00"}},

  {n:"Little Soul Cafe", ja:"リトルソウルカフェ", kc:"bar", k:"LP바", area:"시모키타자와", when:"sat",
   why:"시모키타자와에서 20년 넘은 레코드 바. 1만 4천 장 넘는 판에서 소울·펑크·재즈를 한 곡씩 골라 틉니다. 20:00~02:00(금·토 04:00), 연중무휴.",
   tip:"토요일 밤은 시부야 CAVE로 잡았어요. 시모키타자와로 가고 싶으면 토요일 21:00에 넣으세요. 숙소까지는 멀어요. 자리값 500엔, 현금.",
   id:"ChIJf9tx9WrzGGARqYc7EzjP_3A", q:"Little Soul Cafe 下北沢", dig:"@locally.official",  src:"https://www.littlesoulcafe.com/", srcn:"공식", lat:35.6632436, lng:139.6692659, slot:{day:"sat", t:"21:00"}},

  {n:"Spincoaster Music Bar", kc:"bar", k:"LP바", area:"요요기", when:"thu",
   why:"하이레조 음원과 아날로그 레코드를 함께 트는 음악 바. 19:00~02:00, 일요일 휴무, 17석. 예약 사이트에선 'Spincoaster Music Bar Shinjuku'로도 나옵니다.",
   tip:"원래 목요일 밤 자리였는데 아사쿠사에서 멀고 숙소와도 반대 방향이라 bar all로 바꿨습니다.",
   id:"ChIJAQDUsM-MGGARLXIsEQGf3Ig", q:"Spincoaster Music Bar", dig:"@locally.official",  src:"https://www.hotpepper.jp/strJ001170751/", srcn:"핫페퍼", lat:35.6852642, lng:139.6992942, slot:{day:"thu", t:"19:45"}},

  {n:"짓켄바시 역스카이트리", ja:"十間橋", kc:"photo", k:"사진 스팟", area:"오시아게", when:"thu",
   why:"기타짓켄강 작은 다리. 물에 비친 거꾸로 선 스카이트리를 타워와 함께 찍는 유명한 자리예요. 스카이트리에서 걸어서 7~10분, 해 질 무렵이 좋아요.",
   tip:"목요일엔 해 질 때 타워 위에 있어서 둘 다는 어려워요. 필름으로 타워를 찍고 싶으면 입장을 한 시간 당기고 16:40쯤 여기로 오세요(블루아워는 17시 전까지). 타워와 반영을 다 넣으려면 광각(18mm쯤)으로 세로.",
   id:"ChIJC_GzbiuPGGARzxaGF1PUkro", q:"十間橋", outside:true, src:"https://yakei.jp/japan/spot.php?i=jyukken", srcn:"夜景INFO", lat:35.7093, lng:139.8196, slot:{day:"thu", t:"16:40"}},

  {n:"카메라노 키타무라 시부야점", ja:"カメラのキタムラ 渋谷店", kc:"photo", k:"필름 현상", area:"시부야", when:"sat",
   why:"컬러 네거티브·일회용 카메라 현상을 1층에서 받아요. 빠르면 당일에 끝나고 스마트폰으로 받는 데이터도 돼요.",
   tip:"토요일 SPBS 가는 길에 목·금에 찍은 롤을 맡기면 여행 중에 결과를 볼 수 있어요. 당일 완료 여부와 마감 시각은 매장에서 확인하세요.",
   id:"ChIJSbAjEceNGGARy_Dq-SQYNcA", q:"カメラのキタムラ 渋谷店", src:"https://x.com/kitamura_8308/status/1786320543064670325", srcn:"키타무라 시부야점 X", lat:35.6597, lng:139.7005, slot:{day:"sat", t:"16:45"}},

  {n:"다이코쿠야 덴푸라", ja:"大黒家天麩羅 本店", kc:"food", k:"식당, 저녁", area:"아사쿠사", when:"thu",
   why:"아사쿠사의 오래된 튀김집. 진한 양념에 담근 새우튀김 덮밥이 간판이에요. 11:00~20:30(토·공휴일 21:00), 정기 휴일 없음.",
   tip:"고마카타 도제우가 쉬는 날이거나 미꾸라지가 부담스러우면 목요일 저녁을 이쪽으로 바꾸세요. 줄이 길 수 있어요.",
   id:"ChIJ79EaJsGOGGARHgsoZXYMZO0", q:"大黒家天麩羅 本店", src:"https://www.hotpepper.jp/strJ000613522/", srcn:"핫페퍼", lat:35.7124, lng:139.7955, slot:{day:"thu", t:"17:50"}},

  {n:"토라야 아카사카점", ja:"とらや 赤坂店", kc:"photo", k:"건축, 화과자", area:"아카사카", when:"any", dig:"@daytripkorea", 
   why:"500년 된 화과자집 본점. 내부를 노송나무로 짠 건물은 나이토 히로시 설계(2018). 매장 평일 8:30~19:00, 주말 9:30~18:00, 찻집 虎屋菓寮은 11:00부터.",
   tip:"숙소에서 걸어서 갈 거리예요. 목요일 리쿠기엔 가기 전 매장만 잠깐 들르거나, 선물용 양갱은 마지막 날 아침에.",
   id:"ChIJ36cDtmuNGGAR_I6H18yfPgk", q:"とらや 赤坂店", src:"https://www.toraya-group.co.jp/shops/shop-5", srcn:"虎屋 공식", lat:35.6752, lng:139.7331, slot:{day:"thu", t:"8:30"}},

  {n:"푸글렌 아사쿠사", ja:"FUGLEN ASAKUSA", kc:"food", k:"카페", area:"아사쿠사", when:"thu", dig:"@daytripkorea", 
   why:"오슬로 카페의 아사쿠사점. 북유럽풍 실내에서 커피와 와플. 월~목 8:00~21:00, 금~일 23:00까지.",
   tip:"목요일 저녁 아사쿠사에서 도제우 먹고 bar all 가기 전에 커피 한 잔. 목요일은 21시에 닫아요.",
   id:"ChIJzVXOw5SPGGAR7yVtRAihT7o", q:"Fuglen Asakusa", src:"https://fuglencoffee.jp/en/pages/fuglen-asakusa", srcn:"Fuglen 공식", lat:35.716, lng:139.7955, slot:{day:"thu", t:"19:00"}},

  {n:"가톨릭 메구로 성당", ja:"カトリック目黒教会(聖アンセルモ)", kc:"photo", k:"건축, 성당", area:"메구로", when:"sat", dig:"@daytripkorea", 
   why:"안토닌 레이먼드 설계(1956). 접힌 콘크리트 벽과 천장, 세로 틈으로 들어오는 빛. 도쿄도 선정 역사적 건조물. 성당은 7:00~21:00(일요일 19:00까지) 열려 있어요.",
   tip:"동쪽 벽으로 해가 드는 구조라 아침이 가장 좋아요. 토요일 로스터리 전에 넣으려면 6시 반쯤 숙소를 나서세요. 기도하는 곳이니 조용히, 미사 중엔 촬영하지 마세요.",
   id:"ChIJSb9ilB6LGGARriP7IebDgHk", q:"カトリック目黒教会", src:"https://www.artarchi-japan.jp/2023/02/catholic-meguro-church.html", srcn:"建築とアートを巡る", lat:35.6352, lng:139.7135, slot:{day:"sat", t:"7:00"}},

  {n:"호텔 가조엔 도쿄 카나데 라운지", ja:"ホテル雅叙園東京 カナデ ラウンジ", kc:"food", k:"호텔 라운지", area:"메구로", when:"sat", dig:"@hi_dongwon", 
   why:"메구로 호텔 가조엔 도쿄의 1층 라운지. 10:30~22:30(L.O. 21:30).",
   tip:"에비스(사진미술관)에서 한 정거장이라 토요일 오후에 묶기 좋아요. 메구로 성당과도 걸어서 몇 분.",
   id:"ChIJ-RYxUR6LGGAR3Kk7Wtrwdi8", q:"ホテル雅叙園東京", src:"https://gajoen-tokyo.hiltonjapan.co.jp/restaurants/kanade-lounge", srcn:"가조엔 공식", lat:35.6317, lng:139.7123, slot:{day:"sat", t:"16:30"}},

  {n:"쉐라톤 미야코 호텔 도쿄 로비 라운지 뱀부", ja:"シェラトン都ホテル東京 ロビーラウンジ バンブー", kc:"food", k:"호텔 라운지", area:"시로카네다이", when:"sat", dig:"@hi_dongwon", 
   why:"시로카네다이 호텔의 로비 라운지. 평일·일 10:00~19:00, 금·토 21:30까지.",
   tip:"일정과 떨어진 시로카네다이예요. 가조엔·메구로와 묶어 토요일 오후를 통째로 바꾸고 싶을 때.",
   id:"ChIJGRTwpQCLGGARSdElaCeLduY", q:"シェラトン都ホテル東京", src:"https://www.miyakohotels.ne.jp/tokyo/restaurant/bamboo/", srcn:"호텔 공식", lat:35.6397, lng:139.7275, slot:{day:"sat", t:"15:30"}},

  {n:"리가 로열 호텔 도쿄 가든 라운지", ja:"リーガロイヤルホテル東京 ガーデンラウンジ", kc:"food", k:"호텔 라운지", area:"와세다", when:"any", dig:"@hi_dongwon", 
   why:"와세다 호텔의 1층 가든 라운지. 평일 11:00~17:30, 주말 18:30까지, 연중무휴.",
   tip:"와세다라 이번 동선 어디와도 멀어요. 넣는다면 반나절을 따로 잡으세요.",
   id:"ChIJ8cYfpQSNGGARoH2NAbWsjvM", q:"リーガロイヤルホテル東京", src:"https://www.rihga.co.jp/tokyo/restaurant/list/garden_lounge", srcn:"호텔 공식", lat:35.7108, lng:139.7195, slot:{day:"fri", t:"11:30"}},

  {n:"SAFU (도모 미술관 정원 카페)", ja:"カフェダイニング 茶楓", kc:"food", k:"정원 카페", area:"도라노몬", when:"sat", dig:"@hi_dongwon", 
   why:"기쿠치 간지쓰 기념 도모 미술관에 붙은 카페. '도시 속 고요한 정원'이 콘셉트. 11:00~18:00(식사 L.O. 13:00), 월요일 휴무.",
   tip:"숙소에서 가까운 가미야초 쪽이에요. 토요일 국립신미술관 뒤 점심을 여기서 하려면 네즈미술관을 조금 늦추세요. 식사 주문은 13시까지.",
   id:"ChIJry9lZdaLGGARrSf5KFOaLqk", q:"カフェダイニング 茶楓", src:"https://safu.by-onko-chishin.com/", srcn:"공식", lat:35.6632, lng:139.7424, slot:{day:"sat", t:"11:45"}},

  {n:"세타가야 미술관", ja:"世田谷美術館", kc:"art", k:"미술관, 건축", area:"요가", when:"sat", dig:"@hi_dongwon", 
   why:"기누타 공원 숲속에 우치이 쇼조가 설계한 미술관. 10:00~18:00, 월요일 휴관. 2027년 4월부터 2030년 1월까지 전관 휴관이라 이번이 한동안 마지막 기회예요.",
   tip:"用賀역에서 걸어서 17분. 일정과 멀어서 넣으려면 토요일 오전을 통째로 바꿔야 해요.",
   id:"ChIJtSLaI_fzGGAR8w5sxx-9PR4", q:"世田谷美術館", src:"https://www.setagayaartmuseum.or.jp/guide/open/", srcn:"미술관 공식", lat:35.6325, lng:139.6246, slot:{day:"sat", t:"10:00"}},

  {n:"사카에즈시 총본점", ja:"栄寿し総本店", kc:"food", k:"스시, 저녁", area:"소시가야", when:"sat", dig:"@ganbarayyy",
   why:"도쿄에 22년 산 사람이 꼽은 단골 스시집. 11:00~22:00(L.O. 21:30). 목요일과 셋째 수요일(1·5·8·12월 빼고) 휴무.",
   tip:"게이오선 千歳烏山역에서 남쪽으로 걸어서 15분. 토요일 저녁을 푸즈쿠에 대신 여기로 바꿀 수 있어요.",
   id:"ChIJPTM8bYLxGGARIxUjpfG2RLc", q:"栄寿し総本店", src:"https://sakaezushi.jp/", srcn:"공식", lat:35.657, lng:139.6005, slot:{day:"sat", t:"18:45"}},

  {n:"테노하 다이칸야마", ja:"TENOHA DAIKANYAMA", kc:"food", k:"카페, 정원", area:"다이칸야마", when:"sat", dig:"@daytripkorea", 
   why:"다이칸야마역 1분, 나무가 우거진 복합 공간의 카페와 꽃집.",
   tip:"2025년 4월에 새로 열면서 영업시간이 바뀌었어요(10:00~17:30, 수요일 휴무라는 소개가 있지만 출처마다 달라요). 나카메구로 로스터리에서 한 정거장이라 토요일 아침과 묶을 수 있는데, 열기 전일 수 있어요.",
   id:"ChIJFfBeLUKLGGARKSSW3sCZOnM", q:"TENOHA DAIKANYAMA", src:"https://daishizen.co.jp/news/3609/", srcn:"大自然", lat:35.6485, lng:139.703, slot:{day:"sat", t:"9:00"}},

  {n:"시부야구 후레아이 식물센터", ja:"渋谷区ふれあい植物センター", kc:"leaf", k:"식물원, 카페", area:"시부야", when:"sat", dig:"@daytripkorea", 
   why:"'일본에서 가장 작은 식물원'이라 불리는 곳. 먹을 수 있는 식물을 기르고, 안에서 식사·술도 돼요. 10:00~21:00, 월요일 휴원, 입장 100엔.",
   tip:"시부야역에서 걸어서 10분. 토요일 SPBS 전후, 해 진 뒤 조명 켜진 온실도 좋아요.",
   id:"ChIJnRJnNUOLGGARI8rzGiPxTb0", q:"渋谷区ふれあい植物センター", src:"https://sbgf.jp/guide/", srcn:"공식", lat:35.6555, lng:139.7082, slot:{day:"sat", t:"16:30"}},

  {n:"블루보틀 도요스 파크 카페", ja:"ブルーボトルコーヒー 豊洲パークカフェ", kc:"food", k:"카페", area:"도요스", when:"fri", dig:"@daytripkorea", 
   why:"도요스 공원 안, 공원과 이어진 탁 트인 매장(콘셉트가 '보더리스'). 8:00~19:00.",
   tip:"금요일 츠키지 아침 다음, 근대미술관 전에 한 시간이 빕니다. 츠키지에서 다리 건너 도요스까지 가까워요.",
   id:"ChIJdQ36cQCJGGAReGpw_gW7fic", q:"ブルーボトルコーヒー 豊洲パークカフェ", src:"https://store.bluebottlecoffee.jp/pages/toyosupark", srcn:"Blue Bottle 공식", lat:35.6545, lng:139.7925, slot:{day:"fri", t:"9:00"}},

  {n:"STUDIO MULE", kc:"bar", k:"리스닝 바, 와인", area:"오쿠시부야", when:"sat", dig:"@locally.official", 
   why:"레이블 mule musiq의 리스닝 바 겸 레코드 가게. 빈티지 오디오로 장르 없이 트는 판에 내추럴 와인. 일요일 휴무. 여는 시각이 출처마다 17:00·20:00으로 달라요(닫는 건 24:00).",
   tip:"토요일 CAVE 대신 가기 좋은 시부야 쪽 바. 가기 전 인스타로 영업 확인.",
   id:"ChIJ2cFYZNyNGGARHE092RBhteE", q:"STUDIO MULE 渋谷", src:"https://www.audio-technica.co.jp/always-listening/articles/studio-mule/", srcn:"Audio-Technica", lat:35.6645, lng:139.6935, slot:{day:"sat", t:"21:00"}},

  {n:"B.Y.G", kc:"bar", k:"록 찻집", area:"시부야 햣켄다나", when:"sat", dig:"@locally.official", 
   why:"1969년 도겐자카 햣켄다나에 연 록 찻집. 밤엔 록 바, 지하는 라이브 하우스. 새벽 2시까지.",
   tip:"토요일 CAVE 대신. 여는 시각이 출처마다 달라요(16:00 또는 17:30).",
   id:"ChIJF6s2i6mMGGARSL1W3KJWiU0", q:"B.Y.G 渋谷", src:"https://san-tatsu.jp/articles/239189/", srcn:"散歩の達人", lat:35.6588, lng:139.6965, slot:{day:"sat", t:"21:00"}},

  {n:"Grandfather's", kc:"bar", k:"LP바", area:"시부야", when:"sat", dig:"@locally.official", 
   why:"1971년에 연 바. 처음부터 LP만, 한 장에 한 곡씩 트는 '레코드 키퍼'가 있어요. 70~80년대 록·소울 2,000장. 17:00~03:00. 흡연 가능.",
   tip:"토요일 CAVE 대신. 담배 연기가 있어요.",
   id:"ChIJGcOn8KeMGGARcO0CAyjIktE", q:"Grandfather's 渋谷", src:"https://www.audio-technica.co.jp/always-listening/articles/jazz-cafe-grandfathers/", srcn:"Audio-Technica", lat:35.6628, lng:139.7027, slot:{day:"sat", t:"21:00"}},

  {n:"Jazz Inn Uncle Tom", kc:"bar", k:"재즈 바", area:"산겐자야", when:"sat", dig:"@locally.official", 
   why:"산겐자야에서 아버지 가게를 자식이 이어 가는 재즈 바. 18:00~01:30(L.O.), 부정기 휴무.",
   tip:"토요일 CAVE 대신. 산겐자야에서 숙소까지는 멀어서 막차를 먼저 확인하세요.",
   id:"ChIJscQvAKP0GGAR2-XVV2Ep3V0", q:"Jazz Inn Uncle Tom 三軒茶屋", src:"https://www.arban-mag.com/article/46338", srcn:"ARBAN", lat:35.6437, lng:139.671, slot:{day:"sat", t:"21:00"}},

  {n:"모리 미술관 · 모리 마리코전", ja:"森美術館", kc:"art", k:"미술관, 밤까지", area:"롯폰기", when:"sat", dig:"구글 지도", 
   why:"롯폰기힐스 53층. 모리 마리코전(10/31~2027/3/28). 10:00~22:00(화요일은 17:00까지)이라 저녁에 볼 수 있는 몇 안 되는 미술관이에요.",
   tip:"토요일 푸즈쿠에 뒤, Bar Luther 전에. 롯폰기는 숙소와 가까워요.",
   id:"ChIJg5RCD3eLGGAR6dbIHRM98w8", q:"森美術館", src:"https://www.mori.art.museum/jp/exhibitions/", srcn:"모리 미술관 공식", lat:35.6605, lng:139.7292, slot:{day:"sat", t:"19:30"}},

  {n:"메이지 신궁 뮤지엄", ja:"明治神宮ミュージアム", kc:"photo", k:"건축, 박물관", area:"하라주쿠", when:"sat", dig:"구글 지도", 
   why:"구마 겐고 설계(2019). 숲속에 낮게 깔린 지붕과 기둥. 10:00~16:30, 목요일 휴관, 1,000엔.",
   tip:"토요일 와타리움·Utrecht와 같은 하라주쿠 쪽. 네즈미술관(구마 겐고)과 같은 날이라 비교해 보기 좋아요.",
   id:"ChIJw-yvkzeNGGARjGUxRzKNPKQ", q:"明治神宮ミュージアム", fee:1000, feeNote:"일반", src:"https://www.meijijingu.or.jp/museum/", srcn:"明治神宮 공식", lat:35.6725, lng:139.6995, slot:{day:"sat", t:"15:00"}},

  {n:"블루보틀 시부야 카페", ja:"ブルーボトルコーヒー 渋谷カフェ", kc:"food", k:"카페", area:"시부야", when:"sat", dig:"구글 지도", 
   why:"기타야 공원 안 2층 매장. 8:00~20:00.",
   tip:"토요일 기본 일정에 16:00으로 넣었어요. 와타리움에서 SO BOOKS 가는 길이에요.",
   id:"ChIJiXocb7WNGGAReVVBhRwWLoQ", q:"ブルーボトルコーヒー 渋谷カフェ", src:"https://store.bluebottlecoffee.jp/pages/shibuya", srcn:"Blue Bottle 공식", lat:35.6624, lng:139.7019, slot:{day:"sat", t:"16:30"}},

  {n:"COW BOOKS 나카메구로", kc:"book", k:"헌책방", area:"나카메구로", when:"sat", dig:"구글 지도", 
   why:"셀렉트숍 같은 헌책방. 12:00~19:00, 월요일 휴무. 나카메구로역에서 걸어서 7분.",
   tip:"토요일 로스터리와 같은 동네인데 12시에 열어서 아침엔 못 들어가요. '책과 레코드' 플랜은 여기서 시작해요.",
   id:"ChIJB4Y74U2LGGARGLfQNgDZBa8", q:"COW BOOKS 中目黒", src:"https://www.cowbooks.jp/", srcn:"COW BOOKS 공식", lat:35.6475, lng:139.6955, slot:{day:"sat", t:"12:00"}},

  {n:"Books & Cafe 드레드노트", kc:"book", k:"북카페", area:"기요스미시라카와", when:"any", dig:"구글 지도", 
   why:"주인이 고른 책과 커피, 밥. 평일 11:00~19:30, 주말 10:00~20:00, 화요일 휴무.",
   tip:"기요스미시라카와역에서 걸어서 10분. 일정과 떨어져 있어요.",
   gone:"기요스미시라카와 가게는 2025년 11월 말에 문을 닫고 간다진보초로 옮긴다고 공지했어요. 새 가게는 2026-09-27 구글 지도에 아직 없어요.", goneSrc:"https://www.dreadnought-2019.com/news/%E7%8F%BE%E5%BA%97%E8%88%97%E3%81%A7%E3%81%AE%E5%96%B6%E6%A5%AD%E7%B5%82%E4%BA%86%E3%81%AE%E3%81%8A%E7%9F%A5%E3%82%89%E3%81%9B",
   id:"ChIJHWtLM4OJGGARizJ5fr3NIZg", q:"Books&Cafe ドレッドノート", src:"https://www.dreadnought-2019.com/bookcafe", srcn:"공식", lat:35.6795, lng:139.8035, slot:{day:"thu", t:"14:15"}},

  {n:"Forest Library 森の図書室", kc:"book", k:"북라운지", area:"시부야", when:"any", dig:"구글 지도", 
   why:"시부야 교차로 근처 8층, 책장처럼 생긴 문 안쪽의 서재형 공간. 시간제 요금에 음료 포함(1시간 1,000엔).",
   tip:"비 오는 저녁 시부야에서 쉬어 가기 좋아요.",
   id:"ChIJ_76U71WLGGARn9Yb93Tk-Io", q:"森の図書室 渋谷", src:"https://tokyocheapo.com/restaurant/forest-library/", srcn:"Tokyo Cheapo", lat:35.6605, lng:139.6985, slot:{day:"sat", t:"17:00"}},

  {n:"본야 Title", ja:"本屋 Title", kc:"book", k:"서점, 카페", area:"오기쿠보", when:"any", dig:"구글 지도", 
   why:"오래된 건물을 고쳐 만든 동네 서점. 12:00~19:30(일 19:00), 수요일과 첫째·셋째 화요일 휴무.",
   tip:"서쪽 오기쿠보라 이번 동선과 멀어요.",
   id:"ChIJiaUPNuLtGGARgNXSPIJpWkA", q:"本屋 Title 荻窪", src:"https://www.title-books.com/access", srcn:"공식", lat:35.7065, lng:139.6105, slot:{day:"sat", t:"13:00"}},

  {n:"platform3", kc:"book", k:"독립 서점", area:"히가시나카노", when:"any", dig:"구글 지도", 
   why:"loneliness books와 (TT) press가 같이 운영하는 공간. 아시아의 퀴어·페미니즘·고독을 다룬 책과 진. 평일 14:00~22:00, 주말 12:00~22:00.",
   tip:"히가시나카노라 신주쿠 서쪽. 토요일 하츠다이(푸즈쿠에)에서 비교적 가까워요.",
   id:"ChIJaRvUdELzGGAR4QVHRDtUgWQ", q:"platform3 東中野", src:"https://www.timeout.jp/tokyo/ja/news/platform_3-101724", srcn:"Time Out Tokyo", lat:35.7075, lng:139.6835, slot:{day:"sat", t:"20:00"}},

  {n:"LAMBERT", kc:"food", k:"말차 카페", area:"오쿠보", when:"any", dig:"구글 지도", 
   why:"70년 된 일본 가옥을 고친 말차 가게. 10:30~17:00. 매장 안 자리는 예약제, 테이크아웃은 예약 없이.",
   tip:"신오쿠보 쪽이라 일정과 떨어져 있어요. 앉아서 먹으려면 예약부터.",
   id:"ChIJmxV2JgCNGGARuujoiShaWtI", q:"LAMBERT 百人町", src:"https://www.lambert.tokyo/", srcn:"공식", lat:35.7035, lng:139.6975, slot:{day:"sat", t:"13:00"}},

  {n:"SISIRI 에비스", kc:"food", k:"화과자", area:"에비스", when:"sat", dig:"구글 지도", 
   why:"홋카이도 재료로 만드는 화과자집. 오래된 집을 고친 가게. 토·일·공휴일만 10:00~17:00. 눈 모찌(雪もち)가 간판이에요.",
   tip:"토요일에만 맞출 수 있어요. 인기라 공식 사이트 픽업 예약(토요일 9:30 오픈)을 확인하세요.",
   gone:"2026-09-27 구글 지도에 에비스점·히로오점 모두 '폐업'으로 나와요. 공식 사이트 공지는 확인하지 못했어요.",
   id:"ChIJEa9GbZqLGGARfaeihvnDgbM", q:"SISIRI 恵比寿", src:"https://sisiri.com/contact/", srcn:"공식", lat:35.6445, lng:139.7185, slot:{day:"sat", t:"16:30"}},

  {n:"EUREKA!", kc:"bar", k:"사케 바", area:"니시아자부", when:"any", dig:"구글 지도", 
   why:"사케 소믈리에 지바 마리에의 가게. 화~금 18:00~23:30, 토·일 13:00~21:00, 월요일 휴무. 앉으려면 예약, 없으면 서서 마시는 자리.",
   tip:"숙소에서 가까운 편이에요. 목요일이나 금요일 밤 LP바 대신.",
   id:"ChIJo8ezfmuLGGAR3QxD_Ol7kgs", q:"EUREKA! 西麻布", src:"https://www.tablecheck.com/en/eureka-sake", srcn:"TableCheck", lat:35.6575, lng:139.7215, slot:{day:"fri", t:"20:30"}},

  {n:"record bar 33 1/3rpm", kc:"bar", k:"LP바", area:"시부야", when:"sat", dig:"구글 지도", 
   why:"1960~80년대 록·팝을 제대로 듣는 레코드 바. 바 18:00~25:00, 낮엔 카페. 목·일·공휴일 휴무.",
   tip:"토요일 CAVE 대신. 시부야역 서쪽 출구에서 3분.",
   id:"ChIJC_QMtleLGGARuleMBwtv6n4", q:"record bar 33 1/3rpm", src:"https://www.33-1-3rpm.com/%E3%82%A2%E3%82%AF%E3%82%BB%E3%82%B9-%E5%96%B6%E6%A5%AD%E6%99%82%E9%96%93/", srcn:"공식", lat:35.6575, lng:139.6985, slot:{day:"sat", t:"21:00"}},

  {n:"도쿄대 은행나무길과 야스다 강당", ja:"東京大学 銀杏並木", kc:"leaf", k:"은행잎, 건축", area:"혼고", when:"thu", dig:"구글 지도", 
   why:"정문에서 야스다 강당까지 이어지는 은행나무 길. 일반인도 7:00~18:00에 볼 수 있어요(시험 기간 등은 예외).",
   tip:"절정은 예년 11월 하순~12월 초라 19일엔 조금 이를 수 있어요. 목요일 리쿠기엔과 우에노 사이에 있어요.",
   id:"ChIJ1xirLo-NGGARIJFDSkQLIfQ", q:"東京大学 本郷キャンパス 銀杏並木", outside:true, src:"https://www.u-tokyo.ac.jp/ja/about/campus-guide/public02_05.html", srcn:"도쿄대 공식", lat:35.7128, lng:139.7605, slot:{day:"thu", t:"10:00"}},

  {n:"12 KANDA", kc:"photo", k:"건축", area:"간다", when:"fri", dig:"구글 지도", 
   why:"sinato(오노 지카라) 설계. 바깥 피난 계단과 발코니가 층마다 다르게 튀어나온 공유 오피스. 밖에서 보는 건물이에요.",
   tip:"금요일 진보초에서 동쪽으로 조금. 아티존 가는 길에 돌아가도 돼요.",
   id:"ChIJixcjIgCNGGARtR7QtNM-gBk", q:"12 KANDA 神田須田町", outside:true, src:"https://architecturephoto.net/216957/", srcn:"architecturephoto", lat:35.6955, lng:139.7695, slot:{day:"fri", t:"15:15"}},

  {n:"MONOSPINAL", kc:"photo", k:"건축", area:"아사쿠사바시", when:"thu", dig:"구글 지도", 
   why:"야마구치 마코토 설계(2023). 기울어진 벽 아홉 장이 둘러싼 게임 회사 본사. 고가 선로 옆. 밖에서 보는 건물이에요.",
   tip:"목요일 호쿠사이 미술관(료고쿠)에서 강 건너편이에요.",
   id:"ChIJjbXk9mCPGGAROyEZaX-ZuHA", q:"MONOSPINAL 浅草橋", outside:true, src:"https://architecturephoto.net/207637/", srcn:"architecturephoto", lat:35.697, lng:139.7845, slot:{day:"thu", t:"13:50"}},

  {n:"에비스 가든 플레이스", ja:"恵比寿ガーデンプレイス", kc:"photo", k:"사진 스팟", area:"에비스", when:"sat", dig:"구글 지도", 
   why:"겨울마다 세계 최대급 바카라 샹들리에를 광장에 켜요. 2025년엔 11/8~1/12, 11:00~23:00.",
   tip:"2026년 일정은 아직 발표 전이에요. 사진미술관이 바로 여기라 같이 묶으세요.",
   id:"ChIJ3bRi2hWLGGARsMUFP7GRGBI", q:"恵比寿ガーデンプレイス", outside:true, src:"https://event.gardenplace.jp/special/2025baccarat/", srcn:"공식", lat:35.6421, lng:139.7137, slot:{day:"sat", t:"17:30"}},

  {n:"도쿄 타워", ja:"東京タワー", kc:"view", k:"전망대, 야경", area:"시바공원", when:"any", dig:"구글 지도", 
   why:"메인데크(150m) 9:00~23:00, 어른 1,500엔부터.",
   tip:"숙소에서 가까워요. 올라가는 것보다 시바공원이나 조조지 쪽에서 불 켜진 타워를 필름으로 찍는 게 나을 수도 있어요.",
   id:"ChIJCewJkL2LGGAR3Qmk0vCTGkg", q:"東京タワー", src:"https://www.tokyotower.co.jp/fee/", srcn:"도쿄 타워 공식", lat:35.6586, lng:139.7454, slot:{day:"thu", t:"21:00"}}
];

// 컨셉별 일정. 날짜마다 지역은 기본과 같고(목 북동·금 동쪽 도심·토 남서·일 긴자), 무엇을 볼지만 다르다.
// ref = 기본 일정·추천·지나가는 건물의 q. 사실(영업시간·요금)은 원래 항목에서 그대로 가져온다.
// 원래 구간 정보(leg)는 앞 장소가 같을 때만 keep:true 로 살린다. 일요일은 모든 플랜이 같다.
const PLANS = [
  {k:"base", n:"지역별 기본", tag:"고루",
   intro:"하루에 한 지역. 목요일 북동쪽(우에노·스미다·아사쿠사), 금요일 동쪽 도심(츠키지·진보초·니혼바시), 토요일 남서쪽(나카메구로·롯폰기·아오야마·시부야), 일요일 긴자. 미술관·서점·LP바를 고루 넣었어요."},
  {k:"best", n:"Claude 추천", tag:"꼭 갈 곳 + 짧은 동선",
   stars:["六義園","東京大学 本郷キャンパス 銀杏並木","十間橋","東京都写真美術館","森美術館","CHEKCCORI 神保町","KITOKI 兜町"],
   intro:"꼭 갈 일곱 곳(스카이트리, 도쿄 타워, 츠키지, 스타벅스 리저브 로스터리, 네즈미술관·카페, 국립신미술관, SAFU)을 먼저 박고, 날마다 지하철 한 노선 방향으로만 움직이게 짰어요. 겹치는 건 하나씩만: 타워는 목요일 스카이트리(올라가서 노을)와 금요일 밤 도쿄 타워(불 켜진 타워, 숙소 가는 길), 단풍은 토요일 네즈 정원과 진구가이엔 은행나무길(리쿠기엔·도쿄대 은행나무길은 보관함으로), 커피는 로스터리 한 번, 서점·북카페는 하루 두 곳까지, 미술관도 하루 두 곳까지, LP바는 밤마다 한 곳. 빠진 좋은 곳(리쿠기엔, 도쿄대 은행나무길, 짓켄바시, 사진미술관, 모리 미술관, 책거리, KITOKI)은 찜해 두었어요.",
   days:{
    thu:{title:"우에노에서 스카이트리 노을까지", summary:"긴자선 한 줄로 북동쪽. 도쿄국립박물관 특별전, 르코르뷔지에의 서양미술관을 밖에서, 북카페 점심, 호쿠사이 미술관, 해 질 녘 스카이트리, 아사쿠사 저녁과 무료 전망대, 숙소 옆 LP바.", walk:"긴자선 우에노·아사쿠사 방향",
     stops:[{t:"9:30",ref:"東京国立博物館",dur:120},{t:"11:40",ref:"国立西洋美術館",dur:25},{t:"12:10",ref:"ROUTE BOOKS",dur:70},
      {t:"13:40",ref:"すみだ北斎美術館",dur:100},{t:"15:40",ref:"東京スカイツリー",dur:100},{t:"17:45",ref:"駒形どぜう 本店",dur:75},
      {t:"19:10",ref:"浅草文化観光センター",dur:25},{t:"20:00",ref:"bar all 赤坂"}]},
    fri:{title:"츠키지에서 도쿄 타워 불빛까지", summary:"동쪽 도심을 돌고 숙소 쪽으로 돌아오는 날. 츠키지 아침, 근대미술관, 카레 점심, 진보초 서점 두 곳, 아티존, 해 질 녘 불 켜지는 도쿄역, 가부토초 스시, 불 켜진 도쿄 타워, 숙소 앞 LP바.", walk:"동쪽 도심 안에서만",
     stops:[{t:"8:00",ref:"築地場外市場",dur:40},{t:"8:40",ref:"うに虎 中通り店",dur:45},{t:"10:00",ref:"東京国立近代美術館",dur:100},{t:"12:00",ref:"欧風カレー ボンディ 神保町本店",dur:50},
      {t:"13:00",ref:"南洋堂書店",dur:35},{t:"13:45",ref:"神保町ブックセンター",dur:60},{t:"14:45",ref:"アーティゾン美術館",dur:100},{t:"16:35",ref:"東京駅丸の内駅舎",dur:25},
      {t:"17:30",ref:"Kiku Sushi 日本橋"},{t:"19:15",ref:"東京タワー",dur:75},{t:"21:00",ref:"Bar Luther Akasaka"}]},
    sat:{title:"로스터리에서 오모테산도 지나 시부야 밤까지", summary:"남서쪽 한 방향. 7시 반 로스터리 아침, 국립신미술관, 도라노몬 SAFU 정원 카페에서 점심(식사 주문 13시까지), 프라다 아오야마를 지나 네즈미술관 정원과 카페(13:30 입장 예약), 진구가이엔 은행나무길, 오모테산도의 이토 도요·SANAA 건물, 책 읽는 가게에서 쉬며 저녁, 시부야 LP바. 돌아올 땐 긴자선 한 번.", walk:"나카메구로 → 롯폰기 → 도라노몬 → 아오야마 → 오모테산도 → 하츠다이 → 시부야",
     stops:[{t:"7:30",ref:"スターバックス リザーブ ロースタリー 東京",dur:90},{t:"10:00",ref:"国立新美術館",dur:90},{t:"11:45",ref:"カフェダイニング 茶楓",dur:65,pin:true},
      {t:"13:10",ref:"プラダ 青山店",dur:10},{t:"13:30",ref:"根津美術館",dur:110},{t:"15:35",ref:"神宮外苑いちょう並木",dur:40},{t:"16:30",ref:"TOD'S表参道ビル",dur:10},{t:"16:45",ref:"ディオール表参道",dur:10},{t:"17:20",ref:"Bookshelf Fuzkue",dur:130},{t:"20:00",ref:"THE MUSIC BAR CAVE SHIBUYA"}]},
    sun:{title:"도쿄역에서 긴자로, 출국하는 날", summary:"마루노우치선 방향. 체크아웃하고 짐을 맡긴 뒤 8시 반쯤 나와요. 국제포럼 유리동, 트리콜로르 아침, 에르메스 유리 블록, 츠타야, 시세이도 갤러리와 파라 점심, 미키모토 건물을 지나 모리오카 서점에서 끝. 13:25엔 긴자를 떠나요.", walk:"유라쿠초 → 긴자 1초메",
     stops:[{t:"8:45",ref:"東京国際フォーラム",dur:20},{t:"9:15",ref:"銀座トリコロール 本店",dur:45},{t:"10:05",ref:"銀座メゾンエルメス",dur:10},
      {t:"10:30",ref:"銀座 蔦屋書店",dur:35},{t:"11:10",ref:"資生堂ギャラリー",dur:20},{t:"11:30",ref:"資生堂パーラー 銀座本店レストラン",dur:60},
      {t:"12:45",ref:"MIKIMOTO Ginza 2",dur:5},{t:"13:00",ref:"森岡書店 銀座",dur:15}]}
   }},
  {k:"film", n:"필름·건축", tag:"빛 따라 걷기",
   intro:"건축가의 건물과 빛 드는 시간에 맞춘 플랜. 스카이트리는 올라가지 않고 짓켄바시에서 찍고, 금요일 해 질 녘엔 도쿄역, 토요일 아침엔 레이먼드의 성당. 시부야에서 필름 현상을 맡겨요.",
   days:{
    thu:{title:"빛 따라 북동쪽", summary:"아침 정원, 도쿄대 은행나무길, 메이지 양관과 모더니즘, 세지마 가즈요의 호쿠사이 미술관, 해 질 녘엔 짓켄바시에서 물에 비친 스카이트리.", walk:"북쪽에서 동쪽으로, 해 지는 시각에 맞춰",
     stops:[{t:"9:00",ref:"六義園",keep:true},{t:"10:20",ref:"東京大学 本郷キャンパス 銀杏並木"},{t:"11:15",ref:"東京国立博物館"},{t:"12:50",ref:"国立西洋美術館"},
      {t:"13:10",ref:"ROUTE BOOKS"},{t:"14:20",ref:"MONOSPINAL 浅草橋"},{t:"14:50",ref:"すみだ北斎美術館"},
      {t:"16:05",ref:"十間橋",shot:"골든아워에 도착해 블루아워까지 머물러요. 시각은 위 빛 시간표를 보세요. 광각으로 세로, 타워와 물에 비친 모습을 같이."},
      {t:"17:15",ref:"浅草文化観光センター"},{t:"17:50",ref:"駒形どぜう 本店"},{t:"19:45",ref:"bar all 赤坂"}]},
    fri:{title:"동쪽 도심의 건축", summary:"시장 아침, 근대미술관, 건축 책 전문 난요도와 12 KANDA, 아티존을 일찍 보고 해 질 녘엔 도쿄역과 국제포럼. 저녁은 가부토초 스시와 목조 빌딩 KITOKI.", walk:"동쪽 도심 안에서만, 해 질 무렵 도쿄역",
     stops:[{t:"7:30",ref:"築地場外市場"},{t:"8:00",ref:"うに虎 中通り店"},{t:"10:15",ref:"東京国立近代美術館",keep:true},{t:"12:00",ref:"欧風カレー ボンディ 神保町本店"},
      {t:"13:00",ref:"南洋堂書店"},{t:"13:40",ref:"12 KANDA 神田須田町"},
      {t:"14:20",ref:"アーティゾン美術館",note:"이 플랜에선 일찍 봐요. 웹 예약 슬롯을 14:30 전후로 잡고, 해 지기 전에 도쿄역으로 걸어가세요."},
      {t:"16:00",ref:"東京駅丸の内駅舎"},{t:"16:40",ref:"東京国際フォーラム"},{t:"17:30",ref:"Kiku Sushi 日本橋"},{t:"18:50",ref:"KITOKI 兜町"},{t:"20:30",ref:"Bar Luther Akasaka",keep:true}]},
    sat:{title:"아침 빛에서 네온까지", summary:"동쪽 벽으로 빛이 드는 레이먼드의 성당, 로스터리, 구로카와 기쇼의 국립신미술관, 구마 겐고의 네즈와 메이지 신궁 뮤지엄, 오모테산도 건축, 시부야에서 필름 현상 맡기고 사진집 서점.", walk:"남서쪽 한 방향, 밤엔 긴자선 한 번에 숙소로",
     stops:[{t:"7:00",ref:"カトリック目黒教会"},{t:"7:45",ref:"スターバックス リザーブ ロースタリー 東京"},{t:"10:00",ref:"国立新美術館",keep:true},{t:"12:30",ref:"根津美術館",keep:true},
      {t:"14:00",ref:"神宮外苑いちょう並木"},{t:"15:00",ref:"明治神宮ミュージアム",fee:1000,feeNote:"일반"},{t:"16:00",ref:"Utrecht 神宮前"},
      {t:"16:50",ref:"カメラのキタムラ 渋谷店"},{t:"17:40",ref:"SO BOOKS 代々木八幡"},{t:"18:40",ref:"Bookshelf Fuzkue"},{t:"21:00",ref:"THE MUSIC BAR CAVE SHIBUYA"}]}
   }},
  {k:"books", n:"책과 레코드", tag:"서점·LP바",
   intro:"미술관은 줄이고 서점·북카페·레코드 바에 오래 머무는 플랜. 아침은 느긋하게 시작해요.",
   days:{
    thu:{title:"우에노와 강 건너 북카페", summary:"박물관 하나, 우에노 북카페 점심, 호쿠사이, 기요스미시라카와의 드레드노트에서 오후, 저녁은 아사쿠사, 밤엔 숙소 옆 LP바.", walk:"우에노에서 스미다강 동쪽으로",
     stops:[{t:"10:00",ref:"東京国立博物館"},{t:"12:30",ref:"ROUTE BOOKS"},{t:"14:00",ref:"すみだ北斎美術館"},{t:"15:30",ref:"Books&Cafe ドレッドノート"},
      {t:"17:50",ref:"駒形どぜう 本店"},{t:"19:45",ref:"bar all 赤坂"}]},
    fri:{title:"진보초에서 하루", summary:"츠키지 없이 느긋하게. 근대미술관 뒤 진보초 헌책방 거리를 오래 걷고, 아티존, 가부토초 스시, 밤엔 숙소 옆 LP바.", walk:"진보초 안은 걸어서",
     stops:[{t:"10:15",ref:"東京国立近代美術館"},{t:"12:00",ref:"欧風カレー ボンディ 神保町本店"},{t:"13:00",ref:"CHEKCCORI 神保町"},{t:"13:45",ref:"南洋堂書店"},
      {t:"14:30",ref:"神保町ブックセンター"},{t:"15:45",ref:"アーティゾン美術館",keep:true},{t:"17:30",ref:"Kiku Sushi 日本橋"},{t:"19:00",ref:"KITOKI 兜町"},{t:"20:30",ref:"Bar Luther Akasaka",keep:true}]},
    sat:{title:"시부야 책과 레코드", summary:"나카메구로 로스터리와 COW BOOKS, 오모테산도 Utrecht, 시부야 SPBS와 사진집 헌책방 SO BOOKS, 푸즈쿠에에서 저녁 겸 독서, 밤엔 시부야 LP바 두 곳.", walk:"나카메구로에서 시부야까지, 밤엔 긴자선 한 번",
     stops:[{t:"9:30",ref:"スターバックス リザーブ ロースタリー 東京",keep:true},{t:"11:00",ref:"TENOHA DAIKANYAMA",opt:true},{t:"12:00",ref:"COW BOOKS 中目黒"},
      {t:"13:30",ref:"Utrecht 神宮前"},{t:"14:30",ref:"ブルーボトルコーヒー 渋谷カフェ"},{t:"15:30",ref:"SHIBUYA PUBLISHING & BOOKSELLERS"},{t:"16:30",ref:"SO BOOKS 代々木八幡"},
      {t:"17:30",ref:"Bookshelf Fuzkue"},{t:"20:30",ref:"THE MUSIC BAR CAVE SHIBUYA"},{t:"22:00",ref:"Grandfather's 渋谷",opt:true}]}
   }},
  {k:"slow", n:"느린 카페·정원", tag:"쉬엄쉬엄",
   intro:"하루 예닐곱 곳만. 정원과 카페, 호텔 라운지에서 오래 앉아 있는 플랜. 예약이 까다로운 곳과 새벽 일정은 뺐어요.",
   days:{
    thu:{title:"정원과 강가, 천천히", summary:"리쿠기엔을 느긋하게, 박물관 하나, 북카페 점심, 호쿠사이, 해 질 녘 아사쿠사의 북유럽 카페, 저녁은 튀김 덮밥, 밤엔 숙소 옆 LP바.", walk:"북쪽에서 동쪽으로, 천천히",
     stops:[{t:"9:30",ref:"六義園",keep:true},{t:"11:30",ref:"東京国立博物館"},{t:"13:40",ref:"ROUTE BOOKS"},{t:"14:45",ref:"すみだ北斎美術館"},
      {t:"16:30",ref:"Fuglen Asakusa"},{t:"18:00",ref:"大黒家天麩羅 本店"},{t:"19:45",ref:"bar all 赤坂"}]},
    fri:{title:"화과자에서 정원 카페까지", summary:"숙소 앞 토라야에서 시작해 근대미술관, 카레, 진보초 북센터에서 오래 읽고, 도라노몬의 정원 카페, 저녁은 가부토초 스시. 밤은 일찍.", walk:"동쪽 도심, 이동은 짧게",
     stops:[{t:"8:40",ref:"とらや 赤坂店"},{t:"10:15",ref:"東京国立近代美術館"},{t:"12:00",ref:"欧風カレー ボンディ 神保町本店"},{t:"13:15",ref:"神保町ブックセンター"},
      {t:"15:00",ref:"カフェダイニング 茶楓"},{t:"17:30",ref:"Kiku Sushi 日本橋"}]},
    sat:{title:"로스터리, 정원, 식물원", summary:"로스터리 아침, 가조엔 라운지, 네즈미술관 정원, 은행나무길, 시부야의 작은 식물원에서 저녁, 모리 미술관 밤 관람, 숙소 옆 LP바.", walk:"남서쪽, 밤엔 숙소 근처로",
     stops:[{t:"8:00",ref:"スターバックス リザーブ ロースタリー 東京",keep:true},{t:"10:40",ref:"ホテル雅叙園東京"},{t:"12:30",ref:"根津美術館"},{t:"14:30",ref:"神宮外苑いちょう並木"},
      {t:"15:30",ref:"ブルーボトルコーヒー 渋谷カフェ"},{t:"17:00",ref:"渋谷区ふれあい植物センター"},{t:"19:15",ref:"森美術館"},{t:"21:15",ref:"Bar Luther Akasaka"}]}
   }}
];

// 출발 전 준비. 예약 체크리스트와 같은 저장소(tokyo-checks)를 쓴다. 사실 항목은 2026년 9월 24일 검색으로 확인.
const PREP = [
  {id:"vjw", t:"Visit Japan Web 등록", d:"입국 심사와 세관 신고가 QR 하나로 끝납니다. 필수는 아니지만 종이 신고서보다 30분 넘게 빨라질 수 있어요.",
   src:"https://www.kkday.com/ko/blog/37875/asia-japan-visitjp", srcn:"KKday"},
  {id:"suica", t:"애플 지갑에 스이카 넣기", d:"아이폰 8 이상이면 출발 전에 바로 됩니다. 공항에서 카드 사려고 줄 설 일이 없어요."},
  {id:"plug", t:"돼지코 챙기기", d:"일본은 100V에 납작한 11자(A타입) 콘센트입니다. 휴대폰·노트북 충전기는 대부분 100~240V라 어댑터만 있으면 됩니다. 드라이어·고데기처럼 220V 전용인 것은 라벨의 입력 전압을 확인하세요.",
   src:"https://wise.com/kr/blog/voltage-and-outlet-type-in-japan", srcn:"Wise"},
  {id:"data", t:"eSIM이나 로밍", d:"길찾기와 구글 장소 카드는 인터넷이 있어야 열립니다. 일정표와 저장한 지도는 없어도 보여요."},
  {id:"warm", t:"지도 미리 저장", d:"와이파이에서 '다섯 날짜 지도 한 번에 열기'를 한 번 눌러 두세요.", go:"#warmbtn"},
  {id:"rate", t:"장소 평점 넣기", d:"'구글 장소 정보 가져오기'에서 키 없이 붙여넣기로 넣을 수 있어요.", go:"#gstat"},
  {id:"hotel", t:"숙소 체크인 준비물", d:"사진 있는 신분증(여권)과 신용카드. 도착하면 카드로 보증금 5,000엔을 잡고, 체크아웃 때 시설 확인 뒤 돌려줍니다.",
   src:"https://www.hotels.com/ho2980682240/spablic-inn-tokyo-japan/", srcn:"Hotels.com"},
  {id:"train", t:"공항 열차 표 확인", d:"나리타 익스프레스는 전 좌석 지정석입니다. 수요일 밤과 일요일 표를 미리 봐 두세요."},
  {id:"film", t:"필름은 기내 가방에", d:"맡기는 짐의 CT 검사는 현상 전 필름을 흐리게 할 수 있어요. 필름은 기내 가방에 넣고, 보안검색대에서 손 검사를 부탁하세요. 나리타도 요청하면 손으로 검사해 줍니다. 일본어 문장은 도움 탭에 있어요.",
   src:"https://asset.fujifilm.com/www/jp/files/2020-02/4ea03c30a569b6b817ec39e034dbdb9c/20200227_01.pdf", srcn:"후지필름 안내"},
  {id:"cal", t:"폰 캘린더에 일정 넣기", d:"예약 있는 곳은 한 시간 전에 알림이 울리게 들어갑니다.", go:"#icsbtn"}
];

// 긴급 연락처. 대사관 번호는 외교부 주일본대사관 연락처 페이지 기준(2026년 9월 24일 확인). 출발 전에 한 번 더 볼 것.
const SOS = [
  {n:"경찰", tel:"110", d:"사건·사고, 분실물"},
  {n:"화재·구급차", tel:"119", d:"다치거나 아플 때"},
  {n:"영사안전콜센터", tel:"+82-2-3210-0404", d:"외교부, 24시간 한국어"},
  {n:"주일 대사관 긴급", tel:"+81-70-2153-5454", d:"휴일과 평일 18시 이후"},
  {n:"주일 대사관 영사과", tel:"+81-3-3455-2601", d:"평일 근무 시간"}
];

// 보여주는 용도의 일본어. 누르면 크게 뜬다.
const PHRASES = [
  {ko:"이 주소로 가 주세요", ja:"この住所までお願いします"},
  {ko:"예약했어요. 이름은 ○○입니다", ja:"予約しています。名前は○○です"},
  {ko:"한 명이에요", ja:"一人です"},
  {ko:"두 명이에요", ja:"二人です"},
  {ko:"카드 되나요?", ja:"カードは使えますか？"},
  {ko:"현금만 되나요?", ja:"現金だけですか？"},
  {ko:"계산해 주세요", ja:"お会計お願いします"},
  {ko:"영수증 주세요", ja:"レシートをください"},
  {ko:"사진 찍어도 되나요?", ja:"写真を撮ってもいいですか？"},
  {ko:"필름이에요. 엑스레이 말고 손으로 검사해 주세요", ja:"フィルムなので、X線を通さずに手で検査していただけますか？"},
  {ko:"짐을 맡길 수 있나요?", ja:"荷物を預けられますか？"},
  {ko:"화장실은 어디예요?", ja:"トイレはどこですか？"}
];

// 11월 평년값: 일본 기상청 1991–2020. 예보가 없을 때 대신 보여준다.
const NORMALS = {hi:16.7, lo:8.8, src:"https://www.tomogo-travel.com/blog/weather-in-japan-in-november", srcn:"일본 기상청 평년값(1991–2020)"};

const CHECKS = [
  {id:"artizon", t:"아티존 미술관", d:"금요일 15:45 슬롯. 웹 예약이 매진되면 창구 판매가 없어요."},
  {id:"nezu",    t:"네즈미술관",   d:"토요일 12:00 또는 13:00 슬롯. 구매 후 변경·취소 불가, 카드 결제만."},
  {id:"kiku",    t:"기쿠스시",     d:"금요일 17:30."},
  {id:"dozeu",   t:"고마카타 도제우", d:"목요일 17:50. 쉬는 날이 달마다 달라요. 11월 19일 영업하는지 공식 사이트에서 확인."},
  {id:"skytree", t:"스카이트리 날짜 지정권", d:"목요일 16:00 전 입장. 노을 시간대라 빨리 찹니다."},
  {id:"parlour", t:"시세이도 파라 긴자 본점", d:"일요일 11:30. 연휴 일요일이라 예약해 두면 편해요."},
  {id:"tnm",     t:"도쿄국립박물관 대덕사전", d:"일시 지정 예약제인지 공식 사이트에서 확인."}
];

const AIRPORTS = {
  hnd:{n:"하네다", mins:45, q:"羽田空港", last:"게이큐 공항선이 제3터미널 기준 24:13까지 다닙니다.",
    routes:[
      {n:"게이큐 공항선", best:true, d:"시나가와 약 13분", fare:"330엔 (IC 327엔)",
       note:"도에이 아사쿠사선과 직통이라 신바시까지 갈아타지 않습니다. 신바시에서 긴자선으로 赤坂見附까지. 제3터미널 기준 05:26~24:13 운행."},
      {n:"도쿄 모노레일", d:"하마마쓰초 13~19분", fare:"520엔",
       note:"하마마쓰초에서 JR 야마노테선이나 오에도선으로 갈아탑니다."},
      {n:"심야 정액 택시", d:"", fare:"7,600엔",
       note:"하네다에서 지요다구까지 정액 요금입니다. 2026년 4월 20일부터 바뀐 금액이에요."}
    ]},
  nrt:{n:"나리타", mins:80, q:"成田空港", last:"스카이라이너 막차가 23:20입니다.",
    routes:[
      {n:"게이세이 스카이라이너", best:true, d:"닛포리 36분 · 게이세이우에노 41분", fare:"2,580엔",
       note:"가장 빠르고 막차가 23:20으로 가장 늦습니다. 우에노에서 긴자선을 타면 숙소 앞 赤坂見附까지 갈아타지 않아요."},
      {n:"나리타 익스프레스 (N'EX)", d:"도쿄역 약 53분", fare:"3,070엔 (왕복 5,000엔)",
       note:"전 좌석 지정석입니다. 막차가 스카이라이너보다 이르니 밤 도착이면 시간표를 먼저 보세요. 도쿄역에서 마루노우치선으로 赤坂見附까지 한 번에."},
      {n:"에어포트 버스 TYO-NRT", d:"약 1시간", fare:"1,500엔",
       note:"가장 쌉니다. 도쿄역·긴자 방면으로 갑니다."},
      {n:"리무진 버스", d:"약 1시간 30분", fare:"",
       note:"숙소 앞에 서는 노선이 있으면 짐 들고 갈아탈 일이 없습니다. 노선표를 확인해 보세요."}
    ]}
};

// 도착 공항에 따라 수요일 체크인 시각이 달라진다. 수요일 데이터를 이 값으로 덮어쓴다.
const ARRIVE = {
  nrt:{summary:"20시 나리타 착륙, 숙소 도착은 22시 반 전후. 첫날은 비워둡니다.", land:"나리타 공항 도착", checkin:"22:30",
       hotelNote:"스카이라이너로 게이세이우에노까지 41분, 우에노에서 긴자선을 타면 赤坂見附(아카사카미쓰케)까지 갈아타지 않습니다. 역에서 숙소까지 1분. 기다리는 시간까지 넣은 추정입니다. 내일 9시 리쿠기엔부터 시작하니 오늘은 바로 쉬세요."},
  hnd:{summary:"20시 하네다 착륙, 숙소 도착은 21시 반 전후. 첫날은 비워둡니다.", land:"하네다 공항 도착", checkin:"21:30",
       hotelNote:"게이큐 공항선으로 신바시까지 갈아타지 않고, 신바시에서 긴자선으로 赤坂見附까지. 역에서 숙소까지 1분. 기다리는 시간까지 넣은 추정입니다. 내일 9시 리쿠기엔부터 시작하니 오늘은 바로 쉬세요."}
};
function applyArrival(ap){
  const A=ARRIVE[ap]||ARRIVE.nrt, d=DAYS.find(x=>x.key==="wed");
  if(!d) return;
  d.summary=A.summary;
  const land=d.stops.find(s=>s.kc==="move"), hotel=d.stops.find(s=>s.hotel);
  if(land) land.n=A.land;
  if(hotel){ hotel.t=A.checkin; hotel.note=A.hotelNote; }
}

// 도쿄 안에서 움직이는 데 필요한 것. 전부 2026년 9월 22일 검색으로 확인했다.
const TRANSIT = [
  {t:"교통카드부터", body:[
    "스이카·파스모 무기명 카드는 2023년에 판매가 멈췄다가 2025년 3월부터 모든 역에서 다시 팝니다.",
    "아이폰 8 이상이면 출발 전에 애플 지갑에 스이카를 넣어두세요. 공항에서 줄 설 일이 없습니다. 한국에서 산 갤럭시는 일본 내수용이 아니면 안 됩니다.",
    "카드를 원하시면 보증금 없는 웰컴 스이카가 있습니다. 28일간 쓸 수 있어요."],
   src:"https://kr.trip.com/blog/suica/", srcn:"트립닷컴"},

  {t:"도쿄 서브웨이 티켓", body:[
    "24시간 1,000엔 · 48시간 1,500엔 · 72시간 2,000엔. 도쿄메트로 9개 노선과 도에이 4개 노선을 무제한으로 탑니다.",
    "JR과 사철은 포함되지 않습니다. 단기 체류 외국인만 살 수 있고, 자정이 아니라 처음 쓴 시각부터 시간을 셉니다.",
    "이 일정으로 따지면 금요일(진보초·니혼바시)은 거의 메트로라 확실히 이득입니다. 목요일과 토요일은 JR·사철이 섞여요. 72시간권을 목요일 아침에 열면 목·금·토가 들어갑니다. 하루 세 번 이상 메트로를 타면 본전입니다."],
   src:"https://www.tokyometro.jp/tst/en/index.html", srcn:"도쿄메트로 공식"},

  {t:"막차와 택시", body:[
    "목요일(bar all)과 토요일(Bar Luther) 밤은 숙소에서 걸어서 2분 거리 바로 끝납니다. 막차를 신경 쓰지 않아도 돼요.",
    "금요일 CAVE(시부야)만 멀리 있습니다. 긴자선 하나로 赤坂見附까지 돌아오니 그날 역에서 막차 시각을 확인하고, 놓치면 택시로 10분 남짓 거리예요.",
    "도쿄 지하철 막차는 바 영업보다 훨씬 이릅니다. 끝까지 있을 계획이면 택시 예산을 따로 잡아두세요."]}
];

// 야마노테선 고리 — 간단 지도의 방향 참고용
const LOOP = [[35.6812,139.7671,"도쿄"],[35.6918,139.7709],[35.6984,139.7731],[35.7075,139.7748],[35.7138,139.7773,"우에노"],[35.7215,139.7780],[35.7278,139.7707],[35.7320,139.7668],[35.7381,139.7608],[35.7365,139.7470],[35.7334,139.7393],[35.7318,139.7286],[35.7295,139.7109,"이케부쿠로"],[35.7212,139.7066],[35.7126,139.7038],[35.7012,139.7000],[35.6896,139.7006,"신주쿠"],[35.6831,139.7020],[35.6702,139.7027],[35.6580,139.7016,"시부야"],[35.6467,139.7101],[35.6339,139.7157],[35.6262,139.7236],[35.6197,139.7286],[35.6285,139.7388,"시나가와"],[35.6355,139.7407],[35.6457,139.7476],[35.6555,139.7571],[35.6663,139.7583],[35.6750,139.7628]];

// 여는·닫는 시각과 쉬는 요일. 위 장소·추천의 note/why와 그 출처에 적힌 값만 옮겼다(2026-09-27).
// o 여는 시각, c 닫는 시각(자정 넘으면 25:00처럼), off 쉬는 요일. Tokyo Lines의 시간 계산이 쓴다.
// 요일마다 다른 시각(아티존·근대미술관 금요일 20시 등)은 넣지 않는다. 틀린 경고보다 경고 없음이 낫다.
const HOURS = {
  "六義園":{o:"9:00", c:"17:00"},
  "東京国立博物館":{o:"9:30", off:"월"},   // tnm.jp·대덕사전 공식: 9:30~17:00(금·토 20:00), 월 휴관(11/23 월은 개관). 요일마다 닫는 시각이 달라 c는 비움
  "国立新美術館":{o:"10:00", off:"화"},   // nact.jp: 10:00~18:00(기획전 금·토 20:00), 화 휴관

  "うに虎 中通り店":{o:"7:00"},
  "欧風カレー ボンディ 神保町本店":{o:"11:00", c:"22:00"},
  "神保町ブックセンター":{c:"19:00"},
  "KITOKI 兜町":{o:"13:00", c:"22:30"},
  "スターバックス リザーブ ロースタリー 東京":{o:"7:00", c:"22:00"},
  "根津美術館":{o:"10:00", c:"17:00", off:"월"},
  "ブルーボトルコーヒー 渋谷カフェ":{o:"8:00", c:"20:00"},
  "SO BOOKS 代々木八幡":{o:"13:00", c:"19:00", off:"일·월"},
  "Bookshelf Fuzkue":{c:"23:00"},
  "THE MUSIC BAR CAVE SHIBUYA":{c:"27:00", off:"월·일"},
  "スターバックス 皇居外苑 和田倉噴水公園店":{o:"7:00", c:"21:00"},
  "銀座トリコロール 本店":{o:"8:00", c:"19:00"},
  "銀座 蔦屋書店":{o:"10:30"},
  "資生堂パーラー 銀座本店レストラン":{o:"11:30", c:"21:30", off:"월"},
  "資生堂ギャラリー":{o:"11:00", c:"18:00"},
  "森岡書店 銀座":{o:"13:00", off:"월"},
  "すみだ北斎美術館":{o:"9:30", c:"17:30", off:"월"},
  "東京スカイツリー":{o:"10:00", c:"22:00"},
  "駒形どぜう 本店":{o:"11:00", c:"20:30"},
  "bar all 赤坂":{o:"19:00", c:"28:00", off:"일"},
  "アーティゾン美術館":{o:"10:00", off:"월"},
  "東京国立近代美術館":{o:"10:00", off:"월"},
  "Fuglen Asakusa":{o:"8:00", c:"21:00"},
  "カトリック目黒教会":{o:"7:00", c:"21:00"},
  "ホテル雅叙園東京":{o:"10:30", c:"22:30"},
  "カフェダイニング 茶楓":{o:"11:00", c:"18:00", off:"월"},
  "世田谷美術館":{o:"10:00", c:"18:00", off:"월"},
  "栄寿し総本店":{o:"11:00", c:"22:00", off:"목"},
  "渋谷区ふれあい植物センター":{o:"10:00", c:"21:00", off:"월"},
  "ブルーボトルコーヒー 豊洲パークカフェ":{o:"8:00", c:"19:00"},
  "STUDIO MULE 渋谷":{c:"24:00", off:"일"},
  "B.Y.G 渋谷":{c:"26:00"},
  "Grandfather's 渋谷":{o:"17:00", c:"27:00"},
  "Jazz Inn Uncle Tom 三軒茶屋":{o:"18:00"},
  "森美術館":{o:"10:00", c:"22:00"},
  "明治神宮ミュージアム":{o:"10:00", c:"16:30", off:"목"},
  "COW BOOKS 中目黒":{o:"12:00", c:"19:00", off:"월"},
  "本屋 Title 荻窪":{o:"12:00", c:"19:30", off:"수"},
  "LAMBERT 百人町":{o:"10:30", c:"17:00"},
  "SISIRI 恵比寿":{o:"10:00", c:"17:00", off:"월·화·수·목·금"},
  "EUREKA! 西麻布":{off:"월"},
  "record bar 33 1/3rpm":{o:"18:00", c:"25:00", off:"목·일"},
  "東京大学 本郷キャンパス 銀杏並木":{o:"7:00", c:"18:00"},
  "東京タワー":{o:"9:00", c:"23:00"},
  "Little Soul Cafe 下北沢":{o:"20:00", c:"26:00"},
  "Spincoaster Music Bar":{o:"19:00", c:"26:00", off:"일"},
  "大黒家天麩羅 本店":{o:"11:00", c:"20:30"},
  "Books&Cafe ドレッドノート":{off:"화"}
};
/* DATA:END */
