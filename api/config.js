// 구글 키(GMAPS_KEY)와 로그인 클라이언트 ID(GOOGLE_CLIENT_ID)를 Vercel 환경 변수에서 건네준다 — 기기마다 넣지 않도록.
// 키는 공개 저장소에 넣지 않는다. 키 자체는 웹사이트(도메인) 제한과 Places API 제한으로 지킨다.
module.exports = (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  // GOOGLE_CLIENT_ID = 구글 계정 연동(드라이브 앱 폴더)용 OAuth 웹 클라이언트 ID. 비밀은 아니지만 키와 같은 곳에 둔다.
  res.end(JSON.stringify({ gkey: process.env.GMAPS_KEY || "", gclient: process.env.GOOGLE_CLIENT_ID || "" }));
};
