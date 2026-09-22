/* index.html 의 DATA 블록을 읽어 data/places.csv 를 다시 만든다.
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
