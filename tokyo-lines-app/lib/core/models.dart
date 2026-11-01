import 'dart:math' as math;

/// 장소 종류. 웹앱(tokyo-trip)의 kc와 같다.
enum Kind { art, book, food, bar, market, view, leaf, photo, hotel, move }

class LatLng {
  final double lat, lng;
  const LatLng(this.lat, this.lng);
  Map<String, dynamic> toJson() => {'lat': lat, 'lng': lng};
  factory LatLng.fromJson(Map<String, dynamic> j) => LatLng((j['lat'] as num).toDouble(), (j['lng'] as num).toDouble());
}

/// 두 점 사이 직선거리(km). 도시 안 거리라 평면 근사로 충분하다.
double km(LatLng a, LatLng b) {
  const r = math.pi / 180;
  final x = (b.lng - a.lng) * r * math.cos((a.lat + b.lat) / 2 * r), y = (b.lat - a.lat) * r;
  return math.sqrt(x * x + y * y) * 6371;
}

/// 출처 있는 영업시간만. 요일마다 다른 시각은 넣지 않는다(틀린 경고보다 경고 없음이 낫다).
/// [off]는 DateTime.weekday(월 1 … 일 7).
class Hours {
  final String? open, close;
  final Set<int> off;
  const Hours({this.open, this.close, this.off = const {}});
  Map<String, dynamic> toJson() => {if (open != null) 'o': open, if (close != null) 'c': close, if (off.isNotEmpty) 'off': off.toList()};
  factory Hours.fromJson(Map<String, dynamic>? j) => j == null
      ? const Hours()
      : Hours(open: j['o'] as String?, close: j['c'] as String?, off: {...((j['off'] as List?) ?? const []).cast<int>()});
}

/// 출처 한 줄. 큐레이션 데이터의 사실(영업시간·요금·설계자)마다 붙인다.
class Source {
  final String name, url, checked; // checked = 확인한 날(yyyy-mm-dd)
  const Source(this.name, this.url, this.checked);
  Map<String, dynamic> toJson() => {'n': name, 'u': url, 'd': checked};
  factory Source.fromJson(Map<String, dynamic> j) => Source(j['n'] as String, j['u'] as String, j['d'] as String);
}

class Place {
  final String id; // 앱 안 id. 큐레이션은 영문 슬러그, 사용자가 담은 곳은 'g:<구글 place id>'
  final String name; // 한국어 이름
  final String? ja; // 현지 표기
  final Kind kind;
  final String label; // 종류 글자 ("미술관", "카페, 아침")
  final LatLng? loc; // 구글에서 받은 좌표는 30일만 둘 수 있어 큐레이션엔 출처 있는 좌표만
  final String? gid; // 구글 place id(무기한 보관 가능)
  final Hours hours;
  final int? stay; // 머무는 분(기본값 대신)
  final int? fee; // 출처 있는 요금(엔), 0은 무료
  final bool outside; // 밖에서 보는 곳(영업시간을 안 봄)
  final String? need; // 예약 필요 문구
  final String? note;
  final List<Source> src;
  const Place({
    required this.id,
    required this.name,
    required this.kind,
    this.ja,
    this.label = '',
    this.loc,
    this.gid,
    this.hours = const Hours(),
    this.stay,
    this.fee,
    this.outside = false,
    this.need,
    this.note,
    this.src = const [],
  });

  Place withLoc(LatLng l) => Place(
      id: id, name: name, kind: kind, ja: ja, label: label, loc: l, gid: gid, hours: hours,
      stay: stay, fee: fee, outside: outside, need: need, note: note, src: src);

  Map<String, dynamic> toJson() => {
        'id': id, 'n': name, 'k': kind.name, if (ja != null) 'ja': ja, if (label.isNotEmpty) 'l': label,
        if (loc != null) 'loc': loc!.toJson(), if (gid != null) 'gid': gid, 'h': hours.toJson(),
        if (stay != null) 'stay': stay, if (fee != null) 'fee': fee, if (outside) 'out': true,
        if (need != null) 'need': need, if (note != null) 'note': note, if (src.isNotEmpty) 'src': src.map((s) => s.toJson()).toList(),
      };
  factory Place.fromJson(Map<String, dynamic> j) => Place(
        id: j['id'] as String,
        name: j['n'] as String,
        kind: Kind.values.byName(j['k'] as String),
        ja: j['ja'] as String?,
        label: (j['l'] as String?) ?? '',
        loc: j['loc'] == null ? null : LatLng.fromJson(j['loc'] as Map<String, dynamic>),
        gid: j['gid'] as String?,
        hours: Hours.fromJson(j['h'] as Map<String, dynamic>?),
        stay: j['stay'] as int?,
        fee: j['fee'] as int?,
        outside: (j['out'] as bool?) ?? false,
        need: j['need'] as String?,
        note: j['note'] as String?,
        src: ((j['src'] as List?) ?? const []).map((s) => Source.fromJson(s as Map<String, dynamic>)).toList(),
      );
}

/// 하루 노선. 순서가 곧 일정이고, 시각은 schedule()이 계산한다.
class DayPlan {
  final DateTime date;
  String start; // 숙소 출발 "8:30"
  List<String> stops;
  DayPlan({required this.date, this.start = '9:00', List<String>? stops}) : stops = stops ?? [];
  Map<String, dynamic> toJson() => {'date': _ymd(date), 'start': start, 'stops': stops};
  factory DayPlan.fromJson(Map<String, dynamic> j) =>
      DayPlan(date: DateTime.parse(j['date'] as String), start: j['start'] as String, stops: (j['stops'] as List).cast<String>());
}

String _ymd(DateTime d) => '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

/// 마지막 날 공항으로 떠나는 계산(비행기 − 공항 여유 − 이동 − 짐 찾기 15분).
class Departure {
  final String flight; // "18:00"
  final int bufferMin, moveMin;
  const Departure({required this.flight, this.bufferMin = 150, this.moveMin = 80});
  Map<String, dynamic> toJson() => {'f': flight, 'b': bufferMin, 'm': moveMin};
  factory Departure.fromJson(Map<String, dynamic> j) =>
      Departure(flight: j['f'] as String, bufferMin: j['b'] as int, moveMin: j['m'] as int);
}

/// 여행 하나. 버전(웹앱의 S.alt)은 [versions]에 이름별 날 목록으로 둔다.
class Trip {
  final String id;
  String title, city;
  Place hotel;
  List<DayPlan> days;
  Map<String, String> pins; // 장소 id → 고정 시각(장소마다 하나: 같은 곳이 두 날에 나오면 시각도 같다)
  Map<String, int> dur; // 장소 id → 머무는 분
  Set<String> star;
  Map<String, Place> added; // 사용자가 직접 담은 곳
  Departure? departure;
  String version; // 지금 버전 이름(큐레이션 템플릿 id 또는 'mine')
  Map<String, Map<String, dynamic>> versions; // 다른 버전들의 {days, pins, dur}

  Trip({
    required this.id,
    required this.title,
    required this.city,
    required this.hotel,
    required this.days,
    Map<String, String>? pins,
    Map<String, int>? dur,
    Set<String>? star,
    Map<String, Place>? added,
    this.departure,
    this.version = 'mine',
    Map<String, Map<String, dynamic>>? versions,
  })  : pins = pins ?? {},
        dur = dur ?? {},
        star = star ?? {},
        added = added ?? {},
        versions = versions ?? {};

  Map<String, dynamic> _state() => {
        'days': days.map((d) => d.toJson()).toList(),
        'pins': Map<String, String>.from(pins),
        'dur': Map<String, int>.from(dur),
      };

  void _load(Map<String, dynamic> s) {
    days = (s['days'] as List).map((d) => DayPlan.fromJson(d as Map<String, dynamic>)).toList();
    pins = Map<String, String>.from(s['pins'] as Map);
    dur = Map<String, int>.from(s['dur'] as Map);
  }

  /// 버전 바꾸기. 지금 노선은 그 버전에 남고, 고른 버전의 마지막 상태(없으면 [fresh])를 꺼낸다.
  void switchVersion(String to, Map<String, dynamic> Function() fresh) {
    if (to == version) return;
    versions[version] = _state();
    _load(versions.remove(to) ?? fresh());
    version = to;
  }

  Map<String, dynamic> toJson() => {
        'v': 1, 'id': id, 'title': title, 'city': city, 'hotel': hotel.toJson(), ..._state(),
        'star': star.toList(), 'added': added.map((k, p) => MapEntry(k, p.toJson())),
        if (departure != null) 'dep': departure!.toJson(), 'ver': version, 'vers': versions,
      };

  factory Trip.fromJson(Map<String, dynamic> j) {
    final t = Trip(
      id: j['id'] as String,
      title: j['title'] as String,
      city: j['city'] as String,
      hotel: Place.fromJson(j['hotel'] as Map<String, dynamic>),
      days: const [],
      star: {...((j['star'] as List?) ?? const []).cast<String>()},
      added: ((j['added'] as Map?) ?? const {}).map((k, v) => MapEntry(k as String, Place.fromJson(v as Map<String, dynamic>))),
      departure: j['dep'] == null ? null : Departure.fromJson(j['dep'] as Map<String, dynamic>),
      version: (j['ver'] as String?) ?? 'mine',
      versions: ((j['vers'] as Map?) ?? const {}).map((k, v) => MapEntry(k as String, Map<String, dynamic>.from(v as Map))),
    );
    t._load(j);
    return t;
  }
}
