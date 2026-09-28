// 구글 키를 Vercel 환경 변수(GMAPS_KEY)에서 건네준다 — 기기마다 키를 넣지 않도록.
// 키는 공개 저장소에 넣지 않는다. 키 자체는 웹사이트(도메인) 제한과 Places API 제한으로 지킨다.
module.exports = (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify({ gkey: process.env.GMAPS_KEY || "" }));
};
