/* index.html 의 DATA 블록을 읽어 두 파일을 다시 만든다.
   - data/places.csv     Google My Maps 가져오기용
   - data/tokyo-trip.ics 폰 캘린더용 (예약 있는 곳은 60분 전, 나머지는 30분 전 알림)
   사용법:  node tools/make-csv.mjs      (저장소 어디서든)  */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

const a = html.indexOf("/* DATA:START");
const b = html.indexOf("/* DATA:END");
if (a < 0 || b < 0) throw new Error("index.html 에서 DATA 블록을 찾지 못했습니다.");
const block = html.slice(html.indexOf("*/", a) + 2, b);

const { HOTEL, DAYS } = new Function(block + "\nreturn {HOTEL, DAYS};")();

const q = v => '"' + String(v ?? "").replace(/"/g, '""') + '"';
const rows = [["일차","순서","시간","이름","일본어","종류","예약","메모","위도","경도"]];
rows.push(["숙소","","",HOTEL.n,HOTEL.ja ?? "","숙소","","",HOTEL.lat,HOTEL.lng]);

for (const d of DAYS) {
  let i = 0;
  for (const s of d.stops) {
    if (!s.lat || s.hotel) continue;
    i++;
    rows.push([
      `${d.wd} ${d.dt}`, i, s.t, s.n, s.ja ?? "", s.k,
      s.need ?? s.ask ?? "", s.note ?? "", s.lat, s.lng
    ]);
  }
}

const csv = rows.map(r => r.map(q).join(",")).join("\n") + "\n";
fs.mkdirSync(path.join(root, "data"), { recursive: true });
fs.writeFileSync(path.join(root, "data", "places.csv"), csv);
console.log(`data/places.csv — ${rows.length - 1}줄 생성`);

/* ---------- 캘린더 (.ics) ---------- */
const at = (date, t) => { const [h, m] = t.split(":"); return new Date(`${date}T${h.padStart(2, "0")}:${m}:00+09:00`); };
const utc = d => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const icsText = v => String(v ?? "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
// RFC 5545: 한 줄은 75옥텟을 넘으면 접는다. 한글이 3바이트라 글자 수가 아니라 바이트로 센다.
const enc = new TextEncoder();
function fold(line) {
  const out = []; let cur = "", n = 0;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (n + b > (out.length ? 74 : 75)) { out.push(cur); cur = ""; n = 0; }
    cur += ch; n += b;
  }
  out.push(cur);
  return out.join("\r\n ");
}
const MAPS = (q, id) => "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q || "") + (id ? "&query_place_id=" + id : "") + "&hl=ko";
// 파일을 다시 만들 때마다 내용이 바뀌지 않도록 DTSTAMP 는 고정값을 쓴다.
const stamp = "20260924T000000Z";
// 번호는 index.html 과 같은 규칙: 위치 있는 곳만, 숙소 제외
for (const d of DAYS) { let k = 0; d.stops.forEach(s => { if (s.lat && !s.hotel) s.num = ++k; }); }
const ev = [];
for (const d of DAYS) {
  d.stops.forEach((s, i) => {
    const start = at(d.date, s.t);
    const nx = d.stops[i + 1];
    let end = nx ? at(d.date, nx.t) : new Date(start.getTime() + 90 * 60e3);
    if (end <= start) end = new Date(start.getTime() + 60 * 60e3);
    if (end - start > 3 * 3600e3) end = new Date(start.getTime() + 3 * 3600e3);
    const url = s.q ? MAPS(s.q, s.id) : "";
    const desc = [s.ja, s.note, s.need ? "예약: " + s.need : "", url].filter(Boolean).join("\n");
    const lines = [
      "BEGIN:VEVENT",
      `UID:tokyo-2026-${d.key}-${i}@tokyo-trip`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${utc(start)}`,
      `DTEND:${utc(end)}`,
      `SUMMARY:${icsText((s.num ? s.num + ". " : "") + s.n)}`,
      s.ja || s.q ? `LOCATION:${icsText(s.ja || s.q)}` : "",
      desc ? `DESCRIPTION:${icsText(desc)}` : "",
      url ? `URL:${url}` : "",
      "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${icsText(s.n)}`,
      `TRIGGER:-PT${s.need ? 60 : 30}M`, "END:VALARM",
      "END:VEVENT"
    ].filter(Boolean);
    ev.push(...lines);
  });
}
const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//tokyo-trip//KO", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
  "X-WR-CALNAME:늦가을 도쿄", "X-WR-TIMEZONE:Asia/Tokyo", ...ev, "END:VCALENDAR"].map(fold).join("\r\n") + "\r\n";
fs.writeFileSync(path.join(root, "data", "tokyo-trip.ics"), ics);
console.log(`data/tokyo-trip.ics — 일정 ${ev.filter(l => l === "BEGIN:VEVENT").length}개 생성`);
