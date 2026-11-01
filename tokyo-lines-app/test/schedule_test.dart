import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:tokyo_lines/core/models.dart';
import 'package:tokyo_lines/core/schedule.dart';
import 'package:tokyo_lines/core/time.dart';

Place _p(String id, double lat, double lng, {Kind k = Kind.art, String label = '', Hours h = const Hours(), bool out = false}) =>
    Place(id: id, name: id, kind: k, label: label, loc: LatLng(lat, lng), hours: h, outside: out);

Trip _trip(List<String> stops, {String start = '9:00', DateTime? date, Map<String, String>? pins, Departure? dep}) => Trip(
      id: 't',
      title: 't',
      city: 'tokyo',
      hotel: _p('hotel', 35.676047, 139.736752, k: Kind.hotel),
      days: [DayPlan(date: date ?? DateTime(2026, 11, 19), start: start, stops: stops)],
      pins: pins,
      departure: dep,
    );

void main() {
  group('travel', () {
    final a = _p('a', 35.676047, 139.736752);
    test('80m 안은 같은 곳', () => expect(travel(a, _p('b', 35.6763, 139.7368)).mode, Mode.same));
    test('1.2km까지 걸어서 분속 72m', () {
      final t = travel(a, _p('b', 35.6850, 139.7368)); // 약 1.05km
      expect(t.mode, Mode.walk);
      expect(t.min, (t.d * 1000 / 72).round());
    });
    test('그 위는 전철 10분 + km당 2.6분', () {
      final t = travel(a, _p('b', 35.7188, 139.7765));
      expect(t.mode, Mode.train);
      expect(t.min, (10 + t.d * 2.6).round());
    });
    test('좌표가 없으면 모름', () => expect(travel(a, const Place(id: 'x', name: 'x', kind: Kind.art)).mode, Mode.noloc));
  });

  group('schedule', () {
    final museum = _p('m', 35.7188, 139.7765, h: const Hours(open: '9:30', close: '17:00', off: {1}));
    Place? lookup(String id) => {'m': museum}[id];

    test('여는 시각까지 기다린다', () {
      final s = schedule(_trip(['m'], start: '8:30'), 0, lookup);
      expect(s.rows.first.start, toMin('9:30'));
      expect(s.rows.first.wait, greaterThan(0));
    });
    test('쉬는 요일이면 빨간 경고', () {
      final s = schedule(_trip(['m'], date: DateTime(2026, 11, 23)), 0, lookup); // 월요일
      expect(s.rows.first.warn.map((w) => w.t), contains('월요일 휴무'));
      expect(s.bad, 1);
    });
    test('닫은 뒤 도착하면 빨간 경고', () {
      final s = schedule(_trip(['m'], start: '17:30'), 0, lookup);
      expect(s.rows.first.warn.any((w) => w.lv == Level.bad && w.t.contains('닫아요')), isTrue);
    });
    test('고정 시각보다 늦으면 경고, 이르면 기다림', () {
      expect(schedule(_trip(['m'], start: '9:00', pins: {'m': '9:10'}), 0, lookup).rows.first.warn.any((w) => w.t.contains('늦어요')), isTrue);
      final s = schedule(_trip(['m'], start: '9:00', pins: {'m': '11:00'}), 0, lookup);
      expect(s.rows.first.start, toMin('11:00'));
    });
    test('마지막 날 공항 시각을 넘기면 경고', () {
      final s = schedule(_trip(['m'], start: '12:30', dep: const Departure(flight: '18:00')), 0, lookup);
      expect(leaveMin(const Departure(flight: '18:00')), toMin('13:55'));
      expect(s.rows.first.warn.any((w) => w.t.contains('공항')), isTrue);
    });
  });

  test('버전을 오가도 고친 노선이 남는다', () {
    final t = _trip(['a', 'b']);
    Map<String, dynamic> fresh() => {
          'days': [DayPlan(date: DateTime(2026, 11, 19), stops: ['x']).toJson()],
          'pins': <String, String>{},
          'dur': <String, int>{},
        };
    t.switchVersion('rain', fresh);
    expect(t.days.first.stops, ['x']);
    t.days.first.stops.add('y');
    t.switchVersion('mine', fresh);
    expect(t.days.first.stops, ['a', 'b']);
    t.switchVersion('rain', fresh);
    expect(t.days.first.stops, ['x', 'y']);
    expect(Trip.fromJson(jsonDecode(jsonEncode(t.toJson())) as Map<String, dynamic>).versions.keys, ['mine']);
  });

  // 웹앱(tokyo-trip) schedule()이 낸 값과 같아야 한다. 픽스처는 스크래치 fixture.mjs로 뽑았다(data.js 좌표만, 구글 정보 없이).
  test('웹앱과 같은 시간표', () {
    final fx = jsonDecode(File('test/fixtures/web_schedule.json').readAsStringSync()) as List;
    const keys = ['thu', 'fri', 'sat', 'sun'];
    for (final f in fx.cast<Map<String, dynamic>>()) {
      final trip = Trip.fromJson(f['trip'] as Map<String, dynamic>);
      final raw = (f['places'] as Map).cast<String, Map<String, dynamic>>();
      for (var i = 0; i < trip.days.length; i++) {
        // 웹앱은 원래 요일의 close를 그날에만 본다(p.home)
        Place? lookup(String id) {
          final j = raw[id];
          if (j == null) return null;
          final hc = j['_homeClose'] as Map?;
          final h = Map<String, dynamic>.from(j['h'] as Map);
          if (hc != null && hc['dk'] == keys[i] && h['c'] == null) h['c'] = hc['c'];
          return Place.fromJson({...j, 'h': h});
        }

        final s = schedule(trip, i, lookup);
        final exp = (f['exp'] as List)[i] as Map<String, dynamic>;
        final er = (exp['rows'] as List).cast<Map<String, dynamic>>();
        expect(s.rows.length, er.length, reason: '${f['k']} ${keys[i]} rows');
        for (var r = 0; r < er.length; r++) {
          final why = '${f['k']} ${keys[i]} ${er[r]['id']}';
          expect(s.rows[r].start, er[r]['start'], reason: '$why start');
          expect(s.rows[r].end, er[r]['end'], reason: '$why end');
          expect(s.rows[r].warn.map((w) => '${w.lv.name}:${w.t}').toList(), (er[r]['warn'] as List).cast<String>(), reason: '$why warn');
        }
        expect(s.home, exp['home'], reason: '${f['k']} ${keys[i]} home');
      }
    }
  });
}
