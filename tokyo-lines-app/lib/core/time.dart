import 'dart:math' as math;

/// 시각은 그날 0시부터 센 분(int). 자정을 넘기면 1440 이상(새벽까지 여는 바).
int? toMin(String? t) {
  final m = RegExp(r'^(\d{1,2}):(\d{2})$').firstMatch(t ?? '');
  if (m == null) return null;
  return int.parse(m.group(1)!) * 60 + int.parse(m.group(2)!);
}

String fmt(num minutes) {
  final m = minutes.round();
  final h = (m ~/ 60) % 24, mm = ((m % 60) + 60) % 60;
  return '$h:${mm.toString().padLeft(2, '0')}';
}

int round5(num m) => (m / 5).round() * 5;

/// 해 지는 시각(현지 0시부터 분). NOAA 일반 식이라 ±1분쯤.
/// [utcOffsetHours]는 그 도시의 표준시(도쿄 9).
int sunsetMin(DateTime date, double lat, double lng, {double utcOffsetHours = 9}) {
  final d = DateTime.utc(date.year, date.month, date.day, 12);
  final n = d.difference(DateTime.utc(date.year, 1, 1)).inDays + 1;
  final g = 2 * math.pi / 365 * (n - 1), r = math.pi / 180;
  final eq = 229.18 *
      (0.000075 + 0.001868 * math.cos(g) - 0.032077 * math.sin(g) - 0.014615 * math.cos(2 * g) - 0.040849 * math.sin(2 * g));
  final dec = 0.006918 - 0.399912 * math.cos(g) + 0.070257 * math.sin(g) - 0.006758 * math.cos(2 * g) +
      0.000907 * math.sin(2 * g) - 0.002697 * math.cos(3 * g) + 0.00148 * math.sin(3 * g);
  final ha = math.acos(math.cos(90.833 * r) / (math.cos(lat * r) * math.cos(dec)) - math.tan(lat * r) * math.tan(dec)) / r;
  return (720 - 4 * (lng - ha) - eq + utcOffsetHours * 60).round();
}
