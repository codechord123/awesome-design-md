import 'models.dart';
import 'time.dart';

enum Mode { noloc, same, walk, train }

/// 이동 추정. 직선거리 1.2km까지 도보(분속 72m), 그 위는 전철(역까지 걷기·기다림 10분 + km당 2.6분).
/// 웹앱(tokyo-trip)의 travel()과 같은 값이어야 한다 — 큐레이션 일정은 이 값으로 경고 0을 맞췄다.
class Travel {
  final int min;
  final Mode mode;
  final double d;
  const Travel(this.min, this.mode, this.d);
}

Travel travel(Place? a, Place? b) {
  if (a?.loc == null || b?.loc == null) return const Travel(0, Mode.noloc, 0);
  final d = km(a!.loc!, b!.loc!);
  if (d < 0.08) return Travel(0, Mode.same, d);
  if (d <= 1.2) return Travel((d * 1000 / 72).round().clamp(2, 1 << 30), Mode.walk, d);
  return Travel((10 + d * 2.6).round(), Mode.train, d);
}

/// 머무는 시간 기본값(분). 종류 글자(label)로 끼니·카페를 가른다.
int defDur(Place p) {
  if (p.stay != null) return p.stay!;
  final k = p.label;
  switch (p.kind) {
    case Kind.market:
      return 30;
    case Kind.food:
      if (k.contains('아침')) return 45;
      if (k.contains('점심')) return 60;
      if (k.contains('저녁') || k.contains('스시')) return 80;
      if (k.contains('라운지')) return 60;
      if (RegExp('카페|찻집|화과자|말차').hasMatch(k)) return 45;
      return 60;
    case Kind.art:
      if (k.contains('갤러리')) return 30;
      if (k.contains('건축')) return 15;
      return 90;
    case Kind.book:
      return RegExp('북카페|북라운지').hasMatch(k) ? 75 : 40;
    case Kind.bar:
      return 120;
    case Kind.leaf:
    case Kind.view:
      return 60;
    case Kind.photo:
      return p.outside ? 20 : (p.fee != null && p.fee! > 0 ? 60 : 45);
    default:
      return 45;
  }
}

enum Level { warn, bad }

class Warn {
  final Level lv;
  final String t;
  const Warn(this.lv, this.t);
  @override
  String toString() => '${lv.name}:$t';
}

class Stop {
  final Place p;
  final int i, arr, start, end, dur, wait, late;
  final Travel tr;
  final String? pin;
  final List<Warn> warn;
  final Place from;
  const Stop(this.p, this.i, this.tr, this.arr, this.start, this.end, this.dur, this.wait, this.late, this.pin, this.warn, this.from);
}

class DaySchedule {
  final List<Stop> rows;
  final int depart, home;
  final Travel back;
  final double dist;
  const DaySchedule(this.rows, this.depart, this.home, this.back, this.dist);
  int get bad => rows.where((r) => r.warn.any((w) => w.lv == Level.bad)).length;
  int get warns => rows.fold(0, (a, r) => a + r.warn.length);
}

/// 구글에서 받은 정보(앱 밖)를 쓰고 싶을 때 넘긴다. 없으면 출처 있는 Hours만 본다.
class Extra {
  /// 그 시각에 열려 있나(null = 모름)
  final bool? Function(Place p, DateTime date, int min)? openAt;

  /// "CLOSED_PERMANENTLY" / "CLOSED_TEMPORARILY" / null
  final String? Function(Place p)? status;
  const Extra({this.openAt, this.status});
}

const _wd = ['', '월', '화', '수', '목', '금', '토', '일'];

/// 하루 시간표. 숙소 출발부터 차례로: 이동 → 도착 → 고정 시각이나 여는 시각까지 기다림 → 머무는 시간.
/// 마지막 날이고 [Trip.departure]가 있으면, 숙소로 돌아가 짐 찾는 10분까지 더해 공항 출발 시각을 넘는지 본다.
DaySchedule schedule(Trip trip, int dayIndex, Place? Function(String id) place, {Extra extra = const Extra()}) {
  final day = trip.days[dayIndex];
  final depart = toMin(day.start) ?? 9 * 60;
  final last = dayIndex == trip.days.length - 1 && trip.departure != null;
  final leave = last ? leaveMin(trip.departure!) : null;
  var t = depart;
  Place prev = trip.hotel;
  final rows = <Stop>[];
  var i = 0;
  for (final id in day.stops) {
    final p = place(id);
    if (p == null) continue;
    final tr = travel(prev, p), h = p.hours, warn = <Warn>[];
    final arr = t + tr.min, pin = trip.pins[id], open = toMin(h.open);
    var start = arr, wait = 0, late = 0;
    final pm = toMin(pin);
    if (pm != null) {
      if (arr <= pm) {
        wait = pm - arr;
        start = pm;
      } else {
        late = arr - pm;
      }
    } else if (open != null && arr < open) {
      wait = open - arr;
      start = open;
    }
    final dur = trip.dur[id] ?? defDur(p), end = start + dur;
    if (h.off.contains(day.date.weekday)) warn.add(Warn(Level.bad, '${_wd[day.date.weekday]}요일 휴무'));
    var close = toMin(h.close);
    if (close != null && close < 5 * 60) close += 1440; // 새벽 마감
    if (close != null) {
      if (start >= close) {
        warn.add(Warn(Level.bad, '${fmt(close)}에 닫아요'));
      } else if (end > close + 5) {
        warn.add(Warn(Level.warn, '${fmt(close)} 마감, ${close - start}분만'));
      }
    }
    if (pm != null && open != null && pm < open) warn.add(Warn(Level.bad, '${h.open}에 열어요'));
    if (late > 2) warn.add(Warn(Level.bad, '$pin보다 $late분 늦어요'));
    if (!p.outside && extra.openAt?.call(p, day.date, start) == false) warn.add(const Warn(Level.warn, '구글: 이 시각엔 닫혀 있음'));
    final st = extra.status?.call(p);
    if (st == 'CLOSED_PERMANENTLY') warn.add(const Warn(Level.bad, '구글: 폐업'));
    if (st == 'CLOSED_TEMPORARILY') warn.add(const Warn(Level.bad, '구글: 임시 휴업'));
    if (leave != null) {
      final lim = leave - travel(p, trip.hotel).min - 10;
      if (end > lim) warn.add(Warn(end - lim > 10 ? Level.bad : Level.warn, '${fmt(leave)}엔 숙소에서 공항으로 떠나야 해요'));
    }
    rows.add(Stop(p, i++, tr, arr, start, end, dur, wait, late, pin, warn, prev));
    t = end;
    prev = p;
  }
  final back = rows.isEmpty ? const Travel(0, Mode.noloc, 0) : travel(prev, trip.hotel);
  final dist = rows.fold<double>(0, (a, r) => a + r.tr.d) + back.d;
  return DaySchedule(rows, depart, t + back.min, back, dist);
}

/// 숙소를 떠나야 하는 시각(분) = 비행기 − 공항 여유 − 이동 − 15분.
int leaveMin(Departure d) => (toMin(d.flight) ?? 18 * 60) - d.bufferMin - d.moveMin - 15;
