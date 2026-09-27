/* Tokyo Lines — 여행을 지하철 노선도로.
   날마다 노선 하나(도쿄메트로 색), 장소는 블록. 블록을 끌어다 놓으면 이동·영업시간·예약으로 도착 시각을 다시 계산한다.
   데이터(장소·사실)는 data.js, 이 파일은 화면과 계산만. 상태는 localStorage "tokyo-lines". */
"use strict";

/* ─────────────── 기본 도구 ─────────────── */
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const LS={get(k,d){ try{ const v=localStorage.getItem(k); return v==null?d:v; }catch(e){ return d; } },
          set(k,v){ try{ localStorage.setItem(k,v); }catch(e){} },
          del(k){ try{ localStorage.removeItem(k); }catch(e){} }};
const ico=(id,c="ki")=>`<svg class="${c}" aria-hidden="true"><use href="#${id}"/></svg>`;
const HL="&hl=ko";
const MAPS=(q,id)=>"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(q)+(id?"&query_place_id="+encodeURIComponent(id):"")+HL;
const DIR=(o,d)=>"https://www.google.com/maps/dir/?api=1&origin="+o.lat+","+o.lng+"&destination="+(d.q?encodeURIComponent(d.q):d.lat+","+d.lng)+(d.gid?"&destination_place_id="+encodeURIComponent(d.gid):"")+"&travelmode=transit"+HL;
const DAYDIR=pts=>"https://www.google.com/maps/dir/"+pts.map(p=>p.lat+","+p.lng).join("/")+"?hl=ko";
const km=(a,b)=>{ const r=Math.PI/180,x=(b.lng-a.lng)*r*Math.cos((a.lat+b.lat)/2*r),y=(b.lat-a.lat)*r; return Math.sqrt(x*x+y*y)*6371; };
const toMin=t=>{ const m=/^(\d{1,2}):(\d{2})$/.exec(t||""); return m?(+m[1])*60+(+m[2]):NaN; };
const fmt=m=>{ m=Math.round(m); const h=Math.floor(m/60)%24, mm=((m%60)+60)%60; return h+":"+String(mm).padStart(2,"0"); };
const hhmm=t=>{ const m=/^(\d{1,2}):(\d{2})$/.exec(t||""); return m?m[1].padStart(2,"0")+":"+m[2]:""; };
const round5=m=>Math.round(m/5)*5;
const firstSentence=t=>{ const m=String(t||"").match(/^.*?[.!?](\s|$)/); return m?m[0].trim():String(t||""); };
function toast(msg){ const el=$("#toast"); el.textContent=msg; el.classList.add("on"); clearTimeout(el._t); el._t=setTimeout(()=>el.classList.remove("on"),2200); }

/* ─────────────── 노선(날짜) ─────────────── */
const EDIT=["thu","fri","sat","sun"];
const DAYKEYS=["wed",...EDIT];
const LINE={
  wed:{code:"KS", c:"var(--L-wed)", hex:"#1B3D8F", name:"도착"},
  thu:{code:"G",  c:"var(--L-thu)", hex:"#F39700", name:"북동선"},
  fri:{code:"T",  c:"var(--L-fri)", hex:"#009BBF", name:"도심선"},
  sat:{code:"H",  c:"var(--L-sat)", hex:"#9CAEB7", name:"남서선"},
  sun:{code:"M",  c:"var(--L-sun)", hex:"#E60012", name:"긴자선"}
};
const REGION={
  thu:{n:"북동쪽", sub:"우에노 · 스미다 · 아사쿠사", concept:"에도의 동쪽. 박물관 숲 우에노, 호쿠사이의 스미다, 강 건너 스카이트리, 저녁은 아사쿠사 노포."},
  fri:{n:"동쪽 도심", sub:"츠키지 · 진보초 · 마루노우치 · 니혼바시", concept:"새벽 시장과 헌책방 거리, 붉은 벽돌 도쿄역, 증권가 가부토초의 새 가게들."},
  sat:{n:"남서쪽", sub:"나카메구로 · 롯폰기 · 아오야마 · 시부야", concept:"강가 로스터리에서 롯폰기 미술관, 오모테산도 건축, 시부야의 서점과 레코드 바까지."},
  sun:{n:"긴자", sub:"도쿄역 · 유라쿠초 · 긴자", concept:"떠나는 날 오전. 1936년 찻집, 사진집 서가, 책 한 권만 파는 서점."}
};
const DAY=Object.fromEntries(DAYS.map(d=>[d.key,d]));
const WDK={wed:"수",thu:"목",fri:"금",sat:"토",sun:"일"};
// 일요일: 나리타 18:00편 기준으로 긴자를 떠날 시각(숙소에서 짐 찾기 포함, 이동 시간은 추정). 이전 화면의 계산과 같다.
const SUN_LEAVE="13:25";

/* ─────────────── 장소 목록(블록) ───────────────
   id = 장소의 q. 기본 일정 → 빠진 곳(spare) → 추천 → 지나가는 건물 순서로 모으고, 먼저 들어온 값을 우선한다. */
const CAT=new Map();
const KIND={art:{i:"i-art",n:"미술·건축"},photo:{i:"i-camera",n:"건축·사진"},book:{i:"i-book",n:"책"},food:{i:"i-food",n:"먹고 마시기"},
  market:{i:"i-market",n:"시장"},bar:{i:"i-record",n:"음악"},leaf:{i:"i-leaf",n:"정원"},view:{i:"i-view",n:"전망"},hotel:{i:"i-hotel",n:"숙소"},move:{i:"i-move",n:"이동"}};
const MOOD=[{k:"see",n:"보고 찍기",kc:["art","photo"]},{k:"read",n:"읽기",kc:["book"]},{k:"eat",n:"먹고 마시기",kc:["food","market"]},{k:"listen",n:"듣기",kc:["bar"]},{k:"walk",n:"걷기",kc:["leaf","view"]}];
function catAdd(o){
  if(!o || !o.q || !o.lat) return;
  const cur=CAT.get(o.q);
  if(!cur){ CAT.set(o.q, Object.assign({id:o.q}, o)); return; }
  for(const k in o) if(cur[k]===undefined) cur[k]=o[k];
}
const asStop=(s,dk)=>{ const o=Object.assign({}, s, {gid:s.id, home:dk, baseT:s.t}); delete o.id; delete o.t; return o; };
DAYS.forEach(d=>{
  if(d.key==="wed") return;
  (d.stops||[]).forEach(s=>{ if(!s.hotel && s.q) catAdd(asStop(s,d.key)); });
  (d.spare||[]).forEach(s=>catAdd(asStop(s,d.key)));
});
RECS.forEach(r=>catAdd({q:r.q, n:r.n, ja:r.ja, kc:r.kc, k:r.k, note:r.why, tip:r.tip, src:r.src, srcn:r.srcn, lat:r.lat, lng:r.lng, dig:r.dig,
  outside:r.outside, fee:r.fee, feeNote:r.feeNote, slot:r.slot, rec:true}));
SIGHTS.forEach(g=>catAdd({q:g.q, n:g.n, ja:g.ja, kc:"photo", k:"건축", arch:{by:g.by, year:g.year}, note:g.why, src:g.src, srcn:g.srcn,
  lat:g.lat, lng:g.lng, dig:g.dig, outside:true, sday:g.day}));
// 블록 id는 q. 원래 id 필드(구글 place_id)는 gid로 옮겼다
CAT.forEach((p,k)=>{ p.id=k; });

/* ─────────────── 상태 ─────────────── */
const SKEY="tokyo-lines";
let S=null;
function place(id){ return CAT.get(id) || (S && S.added && S.added[id]) || null; }
function blank(){ return {v:1, tpl:"base", days:{thu:[],fri:[],sat:[],sun:[]}, start:{}, pins:{}, dur:{}, star:{}, added:{}}; }
function tplStops(P,dk){
  const d=DAY[dk], pd=P.days && P.days[dk];
  if(!pd) return d.stops.filter(s=>s.q && !s.hotel).map(s=>({q:s.q, t:s.t}));
  return pd.stops.map(sp=>({q:sp.ref, t:sp.t}));
}
function fromTemplate(k, keep){
  const P=PLANS.find(p=>p.k===k)||PLANS.find(p=>p.k==="base");
  const s=blank(); s.tpl=P.k;
  if(keep){ s.star=keep.star||{}; s.added=keep.added||{}; }
  EDIT.forEach(dk=>{
    const st=tplStops(P,dk).filter(x=>place(x.q)||(keep&&keep.added&&keep.added[x.q]));
    s.days[dk]=st.map(x=>x.q);
    st.forEach(x=>{ const p=place(x.q); if(p && (p.need||p.needId||p.kc==="bar")) s.pins[x.q]=x.t; });
    if(st[0]) s.start[dk]=fmt(round5(toMin(st[0].t)-travel(HOTEL,place(st[0].q)).min));
    if(P.k==="base") (DAY[dk].cands||[]).forEach(q=>{ if(place(q)) s.star[q]=true; });
  });
  return s;
}
// 이전 화면에서 고친 "내 일정"(tokyo-myplan)과 추천 넣기(tokyo-mine)가 있으면 그걸로 시작한다
function migrate(){
  let my=null; try{ my=JSON.parse(LS.get("tokyo-myplan","null")); }catch(e){}
  let mine=[]; try{ mine=JSON.parse(LS.get("tokyo-mine","[]"))||[]; }catch(e){}
  const tpl=LS.get("tokyo-plan","base");
  const s=fromTemplate(my && my.from || (PLANS.some(p=>p.k===tpl)?tpl:"base"));
  if(my && my.days){
    Object.entries(my.added||{}).forEach(([k,a])=>{ if(a && a.lat) s.added[k]=Object.assign({id:k}, a, {gid:a.id, id:k}); });
    EDIT.forEach(dk=>{ const list=my.days[dk]||[];
      s.days[dk]=list.filter(e=>e.st==="fix" && place(e.k)).sort((a,b)=>toMin(a.t)-toMin(b.t)).map(e=>e.k);
      list.filter(e=>e.st==="cand" && place(e.k)).forEach(e=>s.star[e.k]=true); });
  }
  mine.forEach(m=>{ const r=RECS.find(x=>x.n===m.rid); if(!r || !EDIT.includes(m.day) || !place(r.q)) return;
    EDIT.forEach(dk=>s.days[dk]=s.days[dk].filter(x=>x!==r.q));
    const list=s.days[m.day]; const at=list.findIndex(id=>{ const p=place(id); return p.baseT && toMin(p.baseT)>toMin(m.t); });
    if(at<0) list.push(r.q); else list.splice(at,0,r.q); s.pins[r.q]=m.t; });
  return s;
}
function load(){
  try{ const v=JSON.parse(LS.get(SKEY,"null")); if(v && v.days){ EDIT.forEach(k=>{ v.days[k]=(v.days[k]||[]); }); v.start=v.start||{}; v.pins=v.pins||{}; v.dur=v.dur||{}; v.star=v.star||{}; v.added=v.added||{}; return v; } }catch(e){}
  return migrate();
}
function save(){ LS.set(SKEY, JSON.stringify(S)); }
S=load();
EDIT.forEach(dk=>{ S.days[dk]=S.days[dk].filter(id=>place(id)); });

/* ─────────────── 시간 계산 ─────────────── */
function travel(a,b){
  if(!a || !b || !a.lat || !b.lat) return {min:0, mode:"same", d:0};
  const d=km(a,b);
  if(d<0.08) return {min:0, mode:"same", d};
  if(d<=1.2) return {min:Math.max(2,Math.round(d*1000/72)), mode:"walk", d};       // 도보 분속 72m
  return {min:Math.round(10+d*2.6), mode:"train", d};                              // 역까지 걷기·기다림 10분 + km당 2.6분(추정)
}
function defDur(p){
  if(p.stay) return p.stay;
  const k=p.k||"";
  switch(p.kc){
    case "market": return 30;
    case "food": return /아침/.test(k)?45:/점심/.test(k)?60:/저녁|스시/.test(k)?80:/라운지/.test(k)?60:/카페|찻집|화과자|말차/.test(k)?45:60;
    case "art": return /갤러리/.test(k)?30:/건축/.test(k)?15:90;
    case "book": return /북카페|북라운지/.test(k)?75:40;
    case "bar": return 120;
    case "leaf": case "view": return 60;
    case "photo": return p.outside?20:(p.fee?60:45);
    default: return 45;
  }
}
const hoursOf=p=>(typeof HOURS!=="undefined" && HOURS[p.q])||{};
function schedule(dk){
  const ids=S.days[dk]||[], wd=WDK[dk], date=DAY[dk].date;
  const depart=toMin(S.start[dk]||"9:00");
  let t=depart, prev=HOTEL; const rows=[];
  ids.forEach((id,i)=>{
    const p=place(id); if(!p) return;
    const tr=travel(prev,p), H=hoursOf(p), warn=[];
    const arr=t+tr.min, pin=S.pins[id], open=H.o?toMin(H.o):null;
    let start=arr, wait=0, late=0;
    if(pin){ const pm=toMin(pin); if(arr<=pm){ wait=pm-arr; start=pm; } else late=arr-pm; }
    else if(open!=null && arr<open){ wait=open-arr; start=open; }
    const dur=S.dur[id]!=null?S.dur[id]:defDur(p), end=start+dur;
    const off=[H.off,p.closed].filter(Boolean).join(" ");
    if(off.includes(wd)) warn.push({lv:"bad", t:`${wd}요일 휴무`});
    let close=H.c?toMin(H.c):(p.close && p.home===dk ? toMin(p.close) : null);
    if(close!=null && close<5*60) close+=1440;
    if(close!=null){ if(start>=close) warn.push({lv:"bad", t:`${fmt(close)}에 닫아요`}); else if(end>close+5) warn.push({lv:"warn", t:`${fmt(close)} 마감, ${close-start}분만`}); }
    if(pin && open!=null && toMin(pin)<open) warn.push({lv:"bad", t:`${H.o}에 열어요`});
    if(late>2) warn.push({lv:"bad", t:`${pin}보다 ${late}분 늦어요`});
    const g=gOpenAt(placeOf(p), date, start); if(g===false && !p.outside) warn.push({lv:"warn", t:"구글: 이 시각엔 닫혀 있음"});
    const G=placeOf(p); if(G && G.status==="CLOSED_PERMANENTLY") warn.push({lv:"bad", t:"구글: 폐업"}); else if(G && G.status==="CLOSED_TEMPORARILY") warn.push({lv:"bad", t:"구글: 임시 휴업"});
    if(dk==="sun" && end>toMin(SUN_LEAVE)) warn.push({lv:end-toMin(SUN_LEAVE)>10?"bad":"warn", t:`${SUN_LEAVE}엔 긴자를 떠나야 해요`});
    rows.push({id, p, i, tr, arr, start, end, dur, wait, late, pin, warn, from:prev});
    t=end; prev=p;
  });
  const back=rows.length?travel(prev,HOTEL):{min:0,d:0};
  const dist=rows.reduce((a,r)=>a+r.tr.d,0)+(back.d||0);
  return {rows, depart, home:t+back.min, back, dist, bad:rows.filter(r=>r.warn.some(w=>w.lv==="bad")).length, warns:rows.reduce((a,r)=>a+r.warn.length,0)};
}
const code=(dk,i)=>({l:LINE[dk].code, n:String(i+1).padStart(2,"0")});
function hopText(r,first){
  const pre=first?"숙소에서 ":"";
  if(r.tr.mode==="same") return `${ico("i-walk")}${pre}같은 건물`;
  const dist=r.tr.d<1?Math.round(r.tr.d*1000)+"m":r.tr.d.toFixed(1)+"km";
  return r.tr.mode==="walk" ? `${ico("i-walk")}${pre}도보 ${r.tr.min}분 · ${dist}` : `${ico("i-train")}${pre}전철 약 ${r.tr.min}분 · ${dist}`;
}

/* ─────────────── 도쿄 시각, 지금·다음 ─────────────── */
const TZ="Asia/Tokyo";
const TFMT=new Intl.DateTimeFormat("en-CA",{timeZone:TZ,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false});
function tokyoNow(d=new Date()){ const p={}; TFMT.formatToParts(d).forEach(x=>{p[x.type]=x.value;}); const h=p.hour==="24"?0:+p.hour; return {ymd:`${p.year}-${p.month}-${p.day}`, min:h*60+(+p.minute)}; }
function tripNow(){
  // 새벽 4시까지는 전날로 친다(새벽까지 여는 바)
  const n=tokyoNow(), cut=tokyoNow(new Date(Date.now()-4*3600e3));
  const dk=DAYKEYS.find(k=>DAY[k].date===cut.ymd) || null;
  const first=DAY.wed.date, last=DAY.sun.date;
  const phase = cut.ymd<first ? "before" : cut.ymd>last ? "after" : "during";
  const min = n.ymd===cut.ymd ? n.min : n.min+1440;
  return {dk, min, phase, ymd:cut.ymd};
}
function nowNext(){
  const N=tripNow(); if(N.phase!=="during" || !N.dk || N.dk==="wed") return {N};
  const sc=schedule(N.dk);
  const cur=sc.rows.find(r=>r.start<=N.min && N.min<r.end);
  const next=sc.rows.find(r=>r.start>N.min);
  return {N, sc, cur, next};
}
function dday(){ const n=tokyoNow(); const a=new Date(n.ymd+"T00:00:00+09:00"), b=new Date(DAY.wed.date+"T00:00:00+09:00"); return Math.round((b-a)/864e5); }

/* ─────────────── 구글 장소 정보(키가 있을 때만) ───────────────
   이전 화면과 같은 저장소(tokyo-places, tokyo-gkey)를 쓴다. 구글 정책상 30일까지만 보관. */
const PMAXAGE=30*864e5;
let PSTORE=(()=>{ try{ return JSON.parse(LS.get("tokyo-places","{}"))||{}; }catch(e){ return {}; } })();
const pkey=p=>p.gid || ("n:"+p.n);
function placeOf(p){ if(!p || !PSTORE.byId || !PSTORE.at || Date.now()-PSTORE.at>PMAXAGE) return null; return PSTORE.byId[pkey(p)]||null; }
function gOpenAt(P,date,min){
  if(!P || !P.periods || !P.periods.length) return null;
  const dow=new Date(date+"T12:00:00+09:00").getUTCDay(), W=7*1440, w=dow*1440+(min%1440)+(min>=1440?1440:0);
  return P.periods.some(x=>{ if(!x.c) return true; const o=x.o[0]*1440+x.o[1]*60+x.o[2]; let c=x.c[0]*1440+x.c[1]*60+x.c[2]; if(c<=o) c+=W; return (w>=o&&w<c)||(w+W>=o&&w+W<c); });
}
function gErr(status,body){
  if(status===403) return "키가 거부됐어요. Places API (New)가 켜져 있는지, 키의 웹사이트 제한에 이 주소가 들어 있는지 확인하세요.";
  if(status===400) return "요청이 거부됐어요. 키를 다시 확인해 주세요.";
  if(status===429) return "요청 한도를 넘었어요. 잠시 뒤에 다시 시도하세요.";
  try{ const j=JSON.parse(body); if(j.error&&j.error.message) return "오류 "+status+": "+j.error.message; }catch(e){}
  return "오류 "+status+"가 났어요.";
}
const PFIELDS="id,displayName,rating,userRatingCount,primaryTypeDisplayName,regularOpeningHours,priceLevel,photos,googleMapsUri,businessStatus,location";
async function findId(key,p){
  const body={textQuery:p.q||p.n, languageCode:"ja", regionCode:"JP", pageSize:1};
  if(p.lat) body.locationBias={circle:{center:{latitude:p.lat, longitude:p.lng}, radius:1000}};
  const r=await fetch("https://places.googleapis.com/v1/places:searchText?key="+encodeURIComponent(key)+"&fields=places.id",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  if(!r.ok) return {status:r.status, body:await r.text().catch(()=>"")};
  const j=await r.json(); return {id:(j.places&&j.places[0]&&j.places[0].id)||""};
}
async function fetchPlaces(key,report){
  const seen=new Set(), jobs=[];
  [...CAT.values(), ...Object.values(S.added)].forEach(p=>{ const k=pkey(p); if(p.lat && !seen.has(k)){ seen.add(k); jobs.push(p); } });
  const out={}; let fail=0, first="", done=0;
  for(const p of jobs){
    report(++done, jobs.length);
    try{
      let id=p.gid;
      if(!id){ const f=await findId(key,p);
        if(f.status){ fail++; first=first||gErr(f.status,f.body); if([400,401,403].includes(f.status)){ fail=jobs.length-Object.keys(out).length; break; } continue; }
        if(!f.id){ fail++; continue; } id=f.id; }
      const r=await fetch("https://places.googleapis.com/v1/places/"+encodeURIComponent(id)+"?key="+encodeURIComponent(key)+"&languageCode=ko&regionCode=JP&fields="+encodeURIComponent(PFIELDS));
      if(!r.ok){ fail++; first=first||gErr(r.status,await r.text().catch(()=>"")); if([400,401,403].includes(r.status)){ fail=jobs.length-Object.keys(out).length; break; } continue; }
      const j=await r.json();
      const rec={n:(j.displayName&&j.displayName.text)||"", rating:j.rating||0, reviews:j.userRatingCount||0,
        type:(j.primaryTypeDisplayName&&j.primaryTypeDisplayName.text)||"", hours:(j.regularOpeningHours&&j.regularOpeningHours.weekdayDescriptions)||[],
        uri:j.googleMapsUri||"", status:j.businessStatus||"", loc:j.location?{lat:j.location.latitude,lng:j.location.longitude}:null,
        periods:((j.regularOpeningHours&&j.regularOpeningHours.periods)||[]).filter(x=>x.open).map(x=>({o:[x.open.day,x.open.hour||0,x.open.minute||0], c:x.close?[x.close.day,x.close.hour||0,x.close.minute||0]:null}))};
      if(!p.gid) rec.gid=id;
      const pn=j.photos&&j.photos[0]&&j.photos[0].name;
      if(pn){ try{ const pr=await fetch("https://places.googleapis.com/v1/"+pn+"/media?maxHeightPx=900&maxWidthPx=1200&skipHttpRedirect=true&key="+encodeURIComponent(key)); if(pr.ok){ const pj=await pr.json(); if(pj.photoUri) rec.photo=pj.photoUri; } }catch(e){} }
      out[pkey(p)]=rec;
    }catch(e){ fail++; first=first||"네트워크에 닿지 못했어요."; }
  }
  return {out, fail, total:jobs.length, first};
}

/* ─────────────── 지역(보관함 필터) ───────────────
   기본 일정의 날 → 지나가는 건물의 날 → 숙소 2.5km 안 → 가장 가까운 날(3km 넘으면 "먼 곳") */
const AREA=new Map();
(function(){
  const anchors={}; EDIT.forEach(dk=>{ anchors[dk]=DAY[dk].stops.filter(s=>s.lat && !s.hotel && km(s,HOTEL)>=2.5); });
  CAT.forEach(p=>{
    let a=p.home || p.sday || null;
    if(!a && km(p,HOTEL)<2.5) a="hotel";
    if(!a){ let best=null,bd=1e9; EDIT.forEach(dk=>anchors[dk].forEach(s=>{ const x=km(s,p); if(x<bd){bd=x;best=dk;} })); a = bd<=3 ? best : "far"; }
    AREA.set(p.id,a);
  });
})();
function areaOf(p){ if(AREA.has(p.id)) return AREA.get(p.id); if(!p.lat) return "far"; if(km(p,HOTEL)<2.5) return "hotel"; let best="far",bd=3; EDIT.forEach(dk=>(S.days[dk]||[]).forEach(id=>{ const q=place(id); if(q && q.lat){ const x=km(q,p); if(x<bd){bd=x;best=dk;} } })); return best; }
const AREANAME={thu:"북동쪽",fri:"동쪽 도심",sat:"남서쪽",sun:"긴자",hotel:"숙소 근처",far:"먼 곳"};
function dayOf(id){ return EDIT.find(dk=>S.days[dk].includes(id))||null; }

/* ─────────────── 변경 ─────────────── */
function commit(msg){ save(); render(); if(msg) toast(msg); }
function removeEverywhere(id){ EDIT.forEach(dk=>{ S.days[dk]=S.days[dk].filter(x=>x!==id); }); }
function moveTo(id,dk,idx){
  const p=place(id); if(!p) return;
  removeEverywhere(id);
  if(dk==="pool"){ delete S.pins[id]; commit(`${p.n} — 보관함으로 뺐어요`); return; }
  const list=S.days[dk];
  if(idx==null){ // 기본 일정 시각이 있으면 그 자리에, 없으면 끝에
    const t=p.baseT && p.home===dk ? toMin(p.baseT) : null;
    const sc=schedule(dk);
    idx = t==null ? list.length : (()=>{ const k=sc.rows.findIndex(r=>r.start>t); return k<0?list.length:k; })();
  }
  list.splice(idx,0,id);
  commit(`${p.n} — ${WDK[dk]}요일 ${LINE[dk].code}${String(list.indexOf(id)+1).padStart(2,"0")}`);
}

/* ─────────────── 화면 ─────────────── */
let VIEW=LS.get("tokyo-lines-view","home"), CUR=LS.get("tokyo-lines-day","thu");
if(!DAYKEYS.includes(CUR)) CUR="thu";
{ const N=tripNow(); if(N.phase==="during" && N.dk) CUR=N.dk; }   // 여행 중에는 앱을 열면 오늘 노선부터
const main=$("#main");
let SORTS=[];
function go(v,dk){
  VIEW=v; LS.set("tokyo-lines-view",v);
  if(dk){ CUR=dk; LS.set("tokyo-lines-day",dk); }
  render(); window.scrollTo({top:0});
}
function render(){
  $$(".tab").forEach(t=>t.setAttribute("aria-selected", String(t.dataset.go===VIEW)));
  document.body.dataset.view=VIEW;
  if(picker.open && VIEW!=="board") picker.close();
  SORTS.forEach(s=>{ try{ s.destroy(); }catch(e){} }); SORTS=[];
  if(VIEW==="board") renderBoard(); else if(VIEW==="pool") renderPool(); else if(VIEW==="tools") renderTools(); else renderHome();
  renderSide();
  if(picker.open && picker._redraw) picker._redraw();
  wireDnD();
  clock();
}

/* 기호 */
const lsym=(dk,cls="")=>`<span class="lsym ${cls}" style="--c:${LINE[dk].c}" aria-hidden="true">${LINE[dk].code}</span>`;
const sta=(dk,i,cls="")=>{ const c=code(dk,i); return `<span class="sta ${cls}" style="--c:${LINE[dk].c}" aria-label="${c.l}${c.n}"><i>${c.l}</i><b>${c.n}</b></span>`; };
const picto=p=>`<span class="picto" title="${esc((KIND[p.kc]||KIND.view).n)}">${ico((KIND[p.kc]||KIND.view).i)}</span>`;
const flag=(lv,t,icon)=>`<span class="flag ${lv}">${icon?ico(icon):""}${esc(t)}</span>`;

/* ── 노선도(홈) ── */
function netmapSVG(){
  const W=360, pad=26;
  const all=[HOTEL]; EDIT.forEach(dk=>S.days[dk].forEach(id=>{ const p=place(id); if(p && p.lat) all.push(p); }));
  const lat0=35.68*Math.PI/180, X=p=>p.lng*Math.cos(lat0), Y=p=>-p.lat;
  const xs=all.map(X), ys=all.map(Y), x0=Math.min(...xs), x1=Math.max(...xs), y0=Math.min(...ys), y1=Math.max(...ys);
  const sc=(W-2*pad)/Math.max(1e-6,x1-x0); let H=Math.round((y1-y0)*sc+2*pad); H=Math.max(230,Math.min(380,H));
  const sc2=Math.min(sc,(H-2*pad)/Math.max(1e-6,y1-y0));
  const ox=(W-(x1-x0)*sc2)/2, oy=(H-(y1-y0)*sc2)/2;
  const G=8, snap=v=>Math.round(v/G)*G;   // 격자에 붙여야 45° 선이 반듯해진다
  const P=p=>({x:snap(ox+(X(p)-x0)*sc2), y:snap(oy+(Y(p)-y0)*sc2)});
  const oct=(a,b)=>{ const dx=b.x-a.x, dy=b.y-a.y, ax=Math.abs(dx), ay=Math.abs(dy);
    const m = ax>ay ? {x:a.x+Math.sign(dx)*(ax-ay), y:a.y} : {x:a.x, y:a.y+Math.sign(dy)*(ay-ax)};
    return `L${m.x.toFixed(1)},${m.y.toFixed(1)} L${b.x},${b.y}`; };
  const h=P(HOTEL);
  let casing="", strokes="", dots="", ends="";
  EDIT.forEach(dk=>{
    const pts=S.days[dk].map(place).filter(p=>p&&p.lat).map(P); if(!pts.length) return;
    const seq=[h,...pts]; let d=`M${h.x},${h.y}`; for(let i=1;i<seq.length;i++) d+=" "+oct(seq[i-1],seq[i]);
    casing+=`<path d="${d}" fill="none" stroke="var(--card)" stroke-width="11" stroke-linejoin="round" stroke-linecap="round"/>`;
    strokes+=`<g class="ln" data-day="${dk}" tabindex="0" role="button" aria-label="${WDK[dk]}요일 노선 보기"><path class="stroke" d="${d}" fill="none" stroke="${LINE[dk].hex}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/></g>`;
    pts.forEach(q=>{ dots+=`<circle cx="${q.x}" cy="${q.y}" r="3.6" fill="var(--card)" stroke="${LINE[dk].hex}" stroke-width="2.6"/>`; });
    const far=pts.reduce((a,b)=>Math.hypot(b.x-h.x,b.y-h.y)>Math.hypot(a.x-h.x,a.y-h.y)?b:a);
    const dx=far.x-h.x, dy=far.y-h.y, dl=Math.hypot(dx,dy)||1;
    const ex=Math.min(W-16,Math.max(16,far.x+dx/dl*20)), ey=Math.min(H-16,Math.max(16,far.y+dy/dl*20));
    ends+=`<g class="ln" data-day="${dk}"><circle cx="${ex}" cy="${ey}" r="12" fill="var(--card)" stroke="${LINE[dk].hex}" stroke-width="4.5"/><text x="${ex}" y="${ey+5}" text-anchor="middle" font-family="Barlow Condensed,Pretendard Variable,sans-serif" font-weight="700" font-size="15" fill="var(--ink)">${LINE[dk].code}</text></g>`;
  });
  const hub=`<g><rect x="${h.x-10}" y="${h.y-10}" width="20" height="20" rx="6" fill="var(--ink)"/><rect x="${h.x-4.5}" y="${h.y-4.5}" width="9" height="9" rx="2.5" fill="var(--card)"/>
    <text x="${h.x}" y="${h.y+26}" text-anchor="middle" font-family="Pretendard Variable,sans-serif" font-weight="800" font-size="11.5" fill="var(--ink)" stroke="var(--card)" stroke-width="5" paint-order="stroke" stroke-linejoin="round">赤坂見附 · 숙소</text></g>`;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="닷새 노선도. 숙소 아카사카미쓰케에서 날마다 한 노선이 나갑니다">${casing}${strokes}${dots}${hub}${ends}</svg>`;
}
function lcdHTML(){
  const {N,cur,next}=nowNext(); if(!N.dk || N.phase!=="during") return "";
  if(N.dk==="wed") return `<section class="lcd"><p class="k">${lsym("wed","sm")} Arrival <em>도착하는 날</em></p><p class="n">나리타 → 아카사카미쓰케</p><p class="w">스카이라이너 → 우에노 → 긴자선</p></section>`;
  const r=cur||next; if(!r) return `<section class="lcd"><p class="k">${lsym(N.dk,"sm")} End of line <em>오늘 운행 끝</em></p><p class="n">숙소로 돌아가요</p><p class="w">赤坂見附 · 긴자선·마루노우치선</p></section>`;
  const c=code(N.dk,r.i), left=r.start-N.min;
  return `<section class="lcd" aria-live="polite">
    <p class="k">${cur?"Now":"Next"} <em>${cur?"지금":"次は · 다음"}</em> <span class="sta sm" style="--c:${LINE[N.dk].c};margin-left:auto"><i>${c.l}</i><b>${c.n}</b></span></p>
    <p class="n">${esc(r.p.n)}</p>${r.p.ja?`<p class="j">${esc(r.p.ja)}</p>`:""}
    <p class="w">${cur?`${fmt(r.end)}까지 · ${r.end-N.min}분 남음`:`${fmt(r.start)} 도착 예정 · ${left}분 뒤`}</p>
    <div class="acts"><a class="btn go" href="${DIR(r.from||HOTEL,r.p)}" target="_blank" rel="noopener">${ico("i-route")}길찾기</a><button class="btn" data-big="${esc(r.id)}">${ico("i-zoom")}크게 보기</button>${VIEW==="board"?"":`<button class="btn" data-go="board" data-day="${N.dk}">운행표</button>`}</div>
  </section>`;
}
function renderHome(){
  const dd=dday(), N=tripNow();
  const rows=EDIT.map(dk=>{ const sc=schedule(dk), n=sc.rows.length;
    const st = sc.bad ? flag("bad",`확인 ${sc.bad}`) : sc.warns ? flag("warn",`주의 ${sc.warns}`) : n ? flag("good","문제 없음") : flag("pin","비어 있음");
    return `<button class="lrow" style="--c:${LINE[dk].c}" data-go="board" data-day="${dk}">
      ${lsym(dk)}<span><span class="t">${WDK[dk]} ${DAY[dk].dt} · ${esc(REGION[dk].n)}</span><span class="s">${esc(REGION[dk].sub)}</span><span style="display:inline-flex;margin-top:6px">${st}</span></span>
      <span class="m"><b>${n}역</b>${n?`${fmt(sc.depart)}–${fmt(sc.home)}`:""}</span></button>`; }).join("");
  const done=CHECKS.filter(c=>CHECKED[c.id]).length;
  main.innerHTML=`<div class="wrap">
    <section class="hero">
      <p class="hero-date num">11.18<span>—</span>22</p>
      <h1 class="hero-t">늦가을 도쿄 노선도</h1>
      <p class="hero-s">${N.phase==="before"?`출발까지 ${dd}일. `:N.phase==="during"?`${DAYKEYS.indexOf(N.dk)+1}일차. `:""}아카사카미쓰케 숙소에서 날마다 한 노선이 나갑니다. 노선을 누르면 그날 운행표로, 블록은 끌어서 옮겨요.</p>
    </section>
    ${lcdHTML()}
    <figure class="netmap" style="margin-top:18px">${netmapSVG()}<figcaption class="cap">Schematic · 숙소에서 뻗는 네 노선</figcaption></figure>
    <section class="sec"><div class="sec-h"><h2>노선 안내</h2><span class="en">Lines</span></div>
      <button class="lrow" style="--c:${LINE.wed.c}" data-go="board" data-day="wed">${lsym("wed")}<span><span class="t">수 ${DAY.wed.dt} · 도착</span><span class="s">나리타 20:00 → 숙소 22:30</span></span><span class="m"><b>—</b></span></button>
      <div class="lines" style="margin-top:10px">${rows}</div></section>
    <section class="sec"><div class="sec-h"><h2>예약</h2><span class="en">Reservations</span></div>
      <button class="lrow" style="--c:var(--ink)" data-go="tools" data-open="resv"><span class="picto" style="width:34px;height:34px;border-radius:10px">${ico("i-check")}</span>
        <span><span class="t">${done}/${CHECKS.length} 완료</span><span class="s">${esc(CHECKS.filter(c=>!CHECKED[c.id]).slice(0,3).map(c=>c.t).join(" · ")||"모두 끝났어요")}</span></span><span class="m"></span></button></section>
    <p class="src" style="margin:28px 0 20px">이전 화면(예산·교통·공항·날씨 안내)은 <a href="classic.html">여기</a>에 그대로 있어요.</p>
  </div>`;
  $$(".netmap .ln").forEach(g=>{ const f=()=>go("board",g.dataset.day); g.addEventListener("click",f); g.addEventListener("keydown",e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); f(); } }); });
}

/* ── 운행표: 선 하나에 역 ──
   카드 상자 없이 시각 | 역 점 | 이름 세 칸. 역 사이 이동은 선 옆 작은 글씨. 고정 UI는 위 날짜 줄 하나뿐. */
function stationHTML(dk,r,now){
  const p=r.p, P=placeOf(p), bad=r.warn.some(w=>w.lv==="bad"), warn=!bad && r.warn.length>0;
  const cur=now && now.cur && now.cur.id===r.id, past=!cur && now && now.N.dk===dk && now.N.min>=r.end;
  const c=code(dk,r.i), meta=[esc(p.k||""), `${r.dur}분`];
  if(r.pin) meta.push(`${ico("i-lock","ki mi")}${esc(r.pin)}`);
  if(p.need||p.needId) meta.push(p.needId && CHECKED[p.needId] ? `<span class="ok">예약 완료</span>` : `<span class="nd">${esc(p.need||p.ask||"예약 확인")}</span>`);
  return `<li class="st${bad?" bad":warn?" warn":""}${cur?" now":""}${past?" past":""}" data-id="${esc(r.id)}">
    <p class="mv">${hopText(r,r.i===0)}${r.wait>=10?` · <span class="wait">${r.wait}분 여유</span>`:""}</p>
    <div class="row" role="button" tabindex="0" data-open="${esc(r.id)}" aria-label="${c.l}${c.n} ${esc(p.n)} ${fmt(r.start)}">
      <span class="t"><b>${fmt(r.start)}</b><i>${c.l}${c.n}</i></span>
      <span class="dot" aria-hidden="true"></span>
      <span class="b"><span class="n">${esc(p.n)}</span><span class="m">${meta.join(" · ")}</span>${r.warn.length?`<span class="w">${r.warn.map(w=>esc(w.t)).join(" · ")}</span>`:""}</span>
      ${P&&P.photo?`<img class="th" src="${esc(P.photo)}" alt="" loading="lazy">`:""}
    </div></li>`;
}
function termHTML(label,time,input){
  return `<div class="term"><span class="tt">${input||`<b>${time}</b>`}</span><span class="hub" aria-hidden="true"></span><span class="tn">${label}</span></div>`;
}
function wedHTML(){
  const w=DAY.wed;
  return `<header class="dh" style="--c:${LINE.wed.c}"><p class="k">${lsym("wed","sm")}<span>도착 · 나리타 → 아카사카미쓰케</span></p>
      <h1>수요일 <span class="num">${w.dt}</span></h1><p class="meta">${esc(w.summary)}</p></header>
    <div class="lw" style="--c:${LINE.wed.c}"><ol class="line">${w.stops.map((x,i)=>`<li class="st"><p class="mv"></p><div class="row" style="cursor:default">
      <span class="t"><b>${esc(x.t)}</b><i>KS${String(i+1).padStart(2,"0")}</i></span><span class="dot"></span>
      <span class="b"><span class="n">${esc(x.n)}</span><span class="m" style="white-space:normal">${esc(x.note||"")}</span></span></div></li>`).join("")}</ol></div>
    <p class="src">공항 접근·막차 안내는 <a href="classic.html">이전 화면</a>의 수요일에 자세히 있어요.</p>`;
}
function dswHTML(){
  return `<nav class="dsw" aria-label="날짜 노선"><div class="wrap" role="tablist">${DAYKEYS.map(dk=>`<div class="dt" role="tab" tabindex="0" data-day="${dk}" style="--c:${LINE[dk].c}" aria-selected="${dk===CUR}" aria-label="${WDK[dk]}요일 ${LINE[dk].code} 노선">
      ${lsym(dk,"sm")}<span class="d">${WDK[dk]} ${DAY[dk].dt.split(".")[1]}</span>${EDIT.includes(dk)?`<ul class="drop" data-day="${dk}" aria-hidden="true"></ul>`:""}</div>`).join("")}</div></nav>`;
}
function renderBoard(){
  let body="";
  if(CUR==="wed") body=wedHTML();
  else{
    const dk=CUR, sc=schedule(dk), now=nowNext(), R=REGION[dk], n=sc.rows.length;
    const pts=[HOTEL,...sc.rows.map(r=>r.p),HOTEL];
    const status = sc.bad ? `<span class="bad">확인 ${sc.bad}</span>` : sc.warns ? `<span class="warn">주의 ${sc.warns}</span>` : n ? `<span class="ok">문제 없음</span>` : "";
    body=`<header class="dh" style="--c:${LINE[dk].c}">
        <p class="k">${lsym(dk,"sm")}<span>${esc(R.n)} · ${esc(R.sub)}</span></p>
        <h1>${WDK[dk]}요일 <span class="num">${DAY[dk].dt}</span></h1>
        <p class="meta">${n?`<b>${n}</b>역 · <b>${fmt(sc.depart)}–${fmt(sc.home)}</b> · ${sc.dist.toFixed(1)}km · ${status}`:"아직 비어 있어요"}</p>
        ${n?`<p class="links"><button class="lk" id="mapbtn">${ico("i-map")}지도</button><a class="lk" href="${DAYDIR(pts)}" target="_blank" rel="noopener">${ico("i-route")}구글 지도 동선</a></p>`:""}
      </header>
      ${now.N.dk===dk?lcdHTML():""}
      <div class="lw" style="--c:${LINE[dk].c}">
        ${termHTML("숙소 출발 <small>· 시각을 눌러 바꿔요</small>","",`<label class="dep"><b>${fmt(sc.depart)}</b><input type="time" id="depart" value="${hhmm(fmt(sc.depart))}" aria-label="숙소 출발 시각"></label>`)}
        <ol class="line" id="line" data-day="${dk}">${sc.rows.map(r=>stationHTML(dk,r,now)).join("")}</ol>
        ${n?`<p class="mv last">${hopText({tr:sc.back},false)}</p>${termHTML("숙소 도착",fmt(sc.home))}`:""}
      </div>
      <button class="addst" id="addst">${ico("i-plus")}장소 추가</button>
      <p class="hint">길게 눌러 끌면 순서가 바뀌어요. 위 날짜에 놓으면 그날로, 아래 '빼기'에 놓으면 보관함으로 가요.<br>시각은 거리로 잡은 추정이고, ${ico("i-lock","ki mi")} 표시는 예약·바처럼 고정한 시각이에요.</p>`;
  }
  main.innerHTML=`${dswHTML()}<div class="wrap">${body}</div>`;
  $$(".dt").forEach(b=>{ const f=()=>{ CUR=b.dataset.day; LS.set("tokyo-lines-day",CUR); render(); window.scrollTo({top:0}); };
    b.addEventListener("click",e=>{ if(e.target.closest(".drop li")) return; f(); });
    b.addEventListener("keydown",e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); f(); } }); });
  const dep=$("#depart"); if(dep) dep.addEventListener("click",()=>{ try{ dep.showPicker(); }catch(e){} });
  if(dep) dep.addEventListener("change",()=>{ const t=dep.value.replace(/^0(\d)/,"$1"); if(isNaN(toMin(t))) return; S.start[CUR]=t; commit(`숙소 출발 ${t}`); });
  const mb=$("#mapbtn"); if(mb) mb.addEventListener("click",()=>openMap(CUR));
  const ad=$("#addst"); if(ad) ad.addEventListener("click",()=>openPicker());
}

/* ── 장소 추가: 휴대폰은 시트, 넓은 화면은 오른쪽 패널(끌어서 넣기) ── */
let DF=LS.get("tokyo-lines-df","area");
const wide=()=>matchMedia("(min-width: 980px)").matches;
function poolItems(scope){
  const placed=new Set(EDIT.flatMap(dk=>S.days[dk]));
  const all=[...CAT.values(), ...Object.values(S.added)].filter(p=>!placed.has(p.id));
  if(scope==="area") return all.filter(p=>areaOf(p)===CUR);
  if(scope==="star") return all.filter(p=>S.star[p.id]);
  if(scope==="hotel") return all.filter(p=>areaOf(p)==="hotel");
  const m=MOOD.find(x=>x.k===scope); if(m) return all.filter(p=>m.kc.includes(p.kc));
  return all;
}
function pkHTML(p){
  return `<li class="pk" data-id="${esc(p.id)}"><span class="pi">${ico((KIND[p.kc]||KIND.view).i)}</span>
    <span class="pb" role="button" tabindex="0" data-open="${esc(p.id)}"><span class="n">${S.star[p.id]?`<span class="star">${ico("i-star","ki mi")}</span>`:""}${esc(p.n)}</span><span class="m">${esc(AREANAME[areaOf(p)]||"")} · ${esc(p.k||"")}</span></span>
    <button class="add" data-add="${esc(p.id)}">넣기</button></li>`;
}
function pickerBody(){
  const scopes=[["area",AREANAME[CUR]||"이 동네"],["star","찜"],["hotel","숙소 근처"],...MOOD.map(m=>[m.k,m.n]),["all","전체"]];
  if(!scopes.some(s=>s[0]===DF)) DF="area";
  const items=poolItems(DF).sort((a,b)=>(!!S.star[b.id]-!!S.star[a.id])||a.n.localeCompare(b.n,"ko"));
  return `<div class="chips pkf">${scopes.map(([k,n])=>`<button class="chip" data-df="${k}" aria-pressed="${k===DF}">${esc(n)} <b>${poolItems(k).length}</b></button>`).join("")}</div>
    <ul class="pool" id="pool">${items.map(pkHTML).join("")||`<li class="src" style="padding:16px 0">여기엔 남은 곳이 없어요. '전체'를 눌러 보세요.</li>`}</ul>`;
}
function renderSide(){
  const side=$("#side");
  const on=VIEW==="board" && CUR!=="wed" && wide();
  side.hidden=!on; document.body.classList.toggle("withside",on);
  if(!on) return;
  side.innerHTML=`<div class="side-h"><b>보관함</b><span>${WDK[CUR]}요일 노선으로 끌어 넣기</span></div>${pickerBody()}`;
  $$("[data-df]",side).forEach(b=>b.addEventListener("click",()=>{ DF=b.dataset.df; LS.set("tokyo-lines-df",DF); renderSide(); wireDnD(); }));
}
const picker=$("#picker");
function openPicker(){
  if(CUR==="wed") return;
  if(wide()){ const s=$("#side"); if(s) s.scrollTop=0; return; }
  const draw=()=>{ picker.innerHTML=`<div class="sh-top"><span class="lsym sm" style="--c:${LINE[CUR].c}">${LINE[CUR].code}</span><b tabindex="-1" autofocus>${WDK[CUR]}요일에 넣기</b>
      <button class="x" data-close aria-label="닫기">${ico("i-x")}</button></div><div class="sh-body">${pickerBody()}</div>`;
    $$("[data-df]",picker).forEach(b=>b.addEventListener("click",()=>{ DF=b.dataset.df; LS.set("tokyo-lines-df",DF); draw(); })); };
  draw(); if(!picker.open) picker.showModal();
  picker._redraw=draw;
}
picker.addEventListener("click",e=>{ if(e.target===picker || e.target.closest("[data-close]")) picker.close(); });

/* ── 끌어서 놓기 ── */
function wireDnD(){
  SORTS.forEach(s=>{ try{ s.destroy(); }catch(e){} }); SORTS=[];
  if(!window.Sortable || VIEW!=="board" || CUR==="wed") return;
  const line=$("#line"), pool=wide()?$("#side #pool"):null, trash=$("#trash ul");
  const clearHot=()=>{ $$(".dt.hot").forEach(x=>x.classList.remove("hot")); $("#trash").classList.remove("hot"); };
  const common={group:{name:"trip",pull:true,put:true}, draggable:"li[data-id]", animation:160, delay:170, delayOnTouchOnly:true, touchStartThreshold:6,
    ghostClass:"ghost", chosenClass:"chosen", forceFallback:true, fallbackOnBody:true, fallbackTolerance:4, scroll:true, scrollSensitivity:90, scrollSpeed:16, bubbleScroll:true,
    filter:".add", preventOnFilter:false,
    onStart(){ document.body.classList.add("dragging"); document.body.style.setProperty("--dc",LINE[CUR].c); try{ navigator.vibrate && navigator.vibrate(12); }catch(e){} },
    onMove(e){ clearHot(); if(e.to && e.to.classList.contains("drop")) e.to.closest(".dt").classList.add("hot"); if(e.to===trash) $("#trash").classList.add("hot"); return true; },
    onEnd(e){ document.body.classList.remove("dragging"); clearHot();
      if(e.to && (e.to.classList.contains("drop") || e.to===trash)) return;     // 날짜 칸·빼기 칸은 onAdd가 처리
      if(e.from===pool && e.to===pool) return;
      const moved=e.item.dataset.id, p=place(moved);
      const ids=$$("#line > li[data-id]").map(x=>x.dataset.id);
      removeEverywhere(moved);
      S.days[CUR]=ids.filter((x,i,a)=>a.indexOf(x)===i);
      if(pool && e.to===pool){ delete S.pins[moved]; setTimeout(()=>commit(`${p.n} — 보관함으로`),0); return; }
      const k=S.days[CUR].indexOf(moved);
      setTimeout(()=>commit(`${p.n} → ${LINE[CUR].code}${String(k+1).padStart(2,"0")}`),0);
    }};
  if(line) SORTS.push(Sortable.create(line, common));
  if(pool) SORTS.push(Sortable.create(pool, Object.assign({}, common, {sort:false})));
  const dropOnly=(el,fn)=>SORTS.push(Sortable.create(el,{group:{name:"trip",pull:false,put:true}, draggable:"li",
    onAdd(e){ const id=e.item.dataset.id; e.item.remove(); document.body.classList.remove("dragging"); clearHot(); setTimeout(()=>fn(id),0); }}));
  $$(".dt .drop").forEach(z=>dropOnly(z,id=>moveTo(id,z.dataset.day)));
  if(trash) dropOnly(trash,id=>moveTo(id,"pool"));
}

/* ── 보관함 탭 ── */
let PF=JSON.parse(LS.get("tokyo-lines-pf",'{"a":"all","m":"all","s":"left"}'));
function renderPool(){
  const placed=new Set(EDIT.flatMap(dk=>S.days[dk]));
  const all=[...CAT.values(), ...Object.values(S.added)];
  const areas=[["all","전체"],...EDIT.map(dk=>[dk,`${WDK[dk]} · ${AREANAME[dk]}`]),["hotel","숙소 근처"],["far","먼 곳"]];
  const moods=[["all","모든 종류"],...MOOD.map(m=>[m.k,m.n])];
  const stats=[["left","아직 안 넣은 곳"],["star","찜"],["in","노선에 있는 곳"],["all","전부"]];
  const f=all.filter(p=>(PF.a==="all"||areaOf(p)===PF.a) && (PF.m==="all"||MOOD.find(m=>m.k===PF.m).kc.includes(p.kc))
    && (PF.s==="all"||(PF.s==="left"&&!placed.has(p.id))||(PF.s==="in"&&placed.has(p.id))||(PF.s==="star"&&S.star[p.id])))
    .sort((a,b)=>(!!S.star[b.id]-!!S.star[a.id])||(EDIT.indexOf(areaOf(a))-EDIT.indexOf(areaOf(b)))||a.n.localeCompare(b.n,"ko"));
  const key=LS.get("tokyo-gkey","");
  const chips=(arr,k)=>`<div class="chips" style="margin-top:8px">${arr.map(([v,n])=>`<button class="chip" data-pf="${k}" data-v="${v}" aria-pressed="${PF[k]===v}">${esc(n)}</button>`).join("")}</div>`;
  main.innerHTML=`<div class="wrap">
    <section class="hero"><p class="hero-date num">${all.length}<span> blocks</span></p><h1 class="hero-t">보관함</h1>
      <p class="hero-s">인스타·구글 지도에서 모은 곳, 추천, 지나가며 볼 건물까지 전부 블록이에요. ☆로 찜해 두면 운행표 서랍 맨 위에 와요.</p></section>
    ${chips(stats,"s")}${chips(areas,"a")}${chips(moods,"m")}
    <form class="search" id="search"><label class="sr" for="sq">장소 찾아 담기</label><input id="sq" name="q" type="search" placeholder="${key?"구글에서 장소 찾아 담기":"장소 이름 (키가 있으면 구글에서 찾아요)"}" autocomplete="off"><button class="btn ink" type="submit">${key?"찾기":"담기"}</button></form>
    <ul class="res" id="res" hidden></ul>
    <ul class="pgrid">${f.map(p=>tileHTML(p,placed)).join("")||`<li class="src">조건에 맞는 곳이 없어요.</li>`}</ul>
    <p class="src" style="margin:20px 0">${f.length}곳 · 사진은 도구 > 구글 장소 정보를 받으면 나와요.</p></div>`;
  $$("[data-pf]").forEach(b=>b.addEventListener("click",()=>{ PF[b.dataset.pf]=b.dataset.v; LS.set("tokyo-lines-pf",JSON.stringify(PF)); renderPool(); }));
  $("#search").addEventListener("submit",onSearch);
}
function tileHTML(p,placed){
  const P=placeOf(p), dk=dayOf(p.id), i=dk?S.days[dk].indexOf(p.id):-1;
  return `<li><button class="tile" data-open="${esc(p.id)}">
    <span class="im" style="--t:${LINE[areaOf(p)]?LINE[areaOf(p)].c:"var(--mute)"}">${P&&P.photo?`<img src="${esc(P.photo)}" alt="" loading="lazy">`:`<span class="big">${ico((KIND[p.kc]||KIND.view).i)}</span>`}</span>
    ${dk?`<span class="on">${sta(dk,i,"sm")}</span>`:""}
    ${S.star[p.id]?`<span class="st star">${ico("i-star")}</span>`:""}
    <span class="bd"><span class="nm">${esc(p.n)}</span><span class="sub">${esc(AREANAME[areaOf(p)]||"")} · ${esc(p.k||"")}</span>${p.dig?`<span class="sub">${esc(p.dig)}</span>`:""}</span>
  </button></li>`;
}
async function onSearch(e){
  e.preventDefault(); const q=e.target.elements.q.value.trim(); if(!q) return;
  const key=LS.get("tokyo-gkey",""), res=$("#res");
  if(!key){ const id="u:"+q; S.added[id]={id, n:q, q, kc:"view", k:"직접 추가", note:"", dig:"직접 추가"}; S.star[id]=true; commit(`${q} — 담았어요(지도 핀 없음)`); return; }
  res.hidden=false; res.innerHTML=`<li class="src">찾는 중…</li>`;
  try{
    const body={textQuery:q, languageCode:"ko", regionCode:"JP", pageSize:5, locationBias:{circle:{center:{latitude:35.6812,longitude:139.7671},radius:30000}}};
    const r=await fetch("https://places.googleapis.com/v1/places:searchText?key="+encodeURIComponent(key)+"&fields="+encodeURIComponent("places.id,places.displayName,places.formattedAddress,places.location,places.primaryType,places.primaryTypeDisplayName"),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    if(!r.ok) throw new Error(gErr(r.status,await r.text().catch(()=>"")));
    const j=await r.json(), list=(j.places||[]).map(x=>({gid:x.id, n:(x.displayName&&x.displayName.text)||q, addr:x.formattedAddress||"", lat:x.location&&x.location.latitude, lng:x.location&&x.location.longitude,
      kc:/book/.test(x.primaryType||"")?"book":/cafe|coffee|bakery|restaurant|food|sushi|ramen/.test(x.primaryType||"")?"food":/bar|night_club|pub|wine/.test(x.primaryType||"")?"bar":/museum|gallery/.test(x.primaryType||"")?"art":/park|garden/.test(x.primaryType||"")?"leaf":"view",
      k:(x.primaryTypeDisplayName&&x.primaryTypeDisplayName.text)||"장소"}));
    if(!list.length){ res.innerHTML=`<li class="src">못 찾았어요. 일본어 이름으로도 찾아보세요.</li>`; return; }
    res.innerHTML=list.map((x,i)=>`<li class="blk mini"><div class="card" style="cursor:default"><span class="picto">${ico((KIND[x.kc]||KIND.view).i)}</span><div style="min-width:0"><p class="nm">${esc(x.n)}</p><p class="sub">${esc(x.addr)}</p></div><span></span><button class="add" data-res="${i}" aria-label="${esc(x.n)} 담기">${ico("i-plus")}</button></div></li>`).join("");
    $$("[data-res]",res).forEach(b=>b.addEventListener("click",()=>{ const x=list[+b.dataset.res], id="g:"+x.gid;
      S.added[id]=Object.assign({id, q:x.n, note:x.addr, dig:"직접 추가"}, x); S.star[id]=true; commit(`${x.n} — 보관함에 담고 찜했어요`); }));
  }catch(err){ res.innerHTML=`<li class="src">${esc(err.message||"검색이 안 돼요")}</li>`; }
}

/* ── 상세 시트 ── */
const sheet=$("#sheet");
function openSheet(id){
  const p=place(id); if(!p) return;
  const dk=dayOf(id), P=placeOf(p), H=hoursOf(p);
  const sc=dk?schedule(dk):null, r=sc?sc.rows.find(x=>x.id===id):null;
  const facts=[];
  if(r && r.warn.length) facts.push(`<div class="fact ${r.warn.some(w=>w.lv==="bad")?"bad":"warn"}"><b>Check</b>${r.warn.map(w=>esc(w.t)).join("<br>")}</div>`);
  if(p.note) facts.push(`<div class="fact"><b>Note</b>${esc(p.note)}</div>`);
  if(p.tip) facts.push(`<div class="fact"><b>Tip</b>${esc(p.tip)}</div>`);
  if(p.shot) facts.push(`<div class="fact"><b>Shot · 찍을 자리</b>${esc(p.shot)}</div>`);
  if(p.arch) facts.push(`<div class="fact"><b>Architect</b>${esc(p.arch.by)}${p.arch.year?` · ${p.arch.year}`:""}${p.arch.note?` · ${esc(p.arch.note)}`:""}</div>`);
  const hrs=[H.o&&`${H.o} 열고`, H.c&&`${fmt(toMin(H.c))} 닫음`, (H.off||p.closed)&&`${H.off||p.closed}`].filter(Boolean).join(" · ");
  if(hrs || (P&&P.hours&&P.hours.length)) facts.push(`<div class="fact"><b>Hours</b>${esc(hrs)}${P&&P.hours&&P.hours.length?`${hrs?"<br>":""}구글: ${esc(P.hours.join(" / "))}`:""}</div>`);
  if(p.fee!=null) facts.push(`<div class="fact"><b>Fee</b>${p.fee>0?p.fee.toLocaleString("ko-KR")+"엔":"무료"}${p.feeNote?` · ${esc(p.feeNote)}`:""}</div>`);
  if(p.rain) facts.push(`<div class="fact"><b>Rain</b>${esc(p.rain)}</div>`);
  if(p.leg && p.home) facts.push(`<div class="fact"><b>Route</b>원래 일정 기준: ${esc(p.leg.line)} ${esc(p.leg.from)} → ${esc(p.leg.to)}${p.leg.note?` · ${esc(p.leg.note)}`:""}</div>`);
  if(P && P.rating) facts.push(`<div class="fact"><b>Google</b>★ ${P.rating.toFixed(1)} (${(P.reviews||0).toLocaleString("ko-KR")}) · ${esc(P.type||"")}</div>`);
  const dur=r?r.dur:(S.dur[id]!=null?S.dur[id]:defDur(p));
  sheet.innerHTML=`<div class="sh-top">${dk?sta(dk,S.days[dk].indexOf(id)):picto(p)}<span class="num" style="font-weight:700;color:var(--sub)">${dk?`${WDK[dk]}요일 ${r?fmt(r.start)+"–"+fmt(r.end):""}`:"보관함"}</span>
      <button class="x" data-close aria-label="닫기">${ico("i-x")}</button></div>
    <div class="sh-body">
      ${P&&P.photo?`<img class="sh-photo" src="${esc(P.photo)}" alt="">`:""}
      <h2 id="sh-title" tabindex="-1" autofocus>${esc(p.n)}</h2>
      ${p.ja?`<button class="jp" data-big="${esc(id)}"><u>${esc(p.ja)}</u> · 크게 보기</button>`:""}
      <div class="mt" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">${picto(p)}<span style="font-size:13px;font-weight:700;color:var(--sub)">${esc(p.k||"")} · ${esc(AREANAME[areaOf(p)]||"")}</span>${p.dig?flag("pin",p.dig):""}</div>
      <div class="ctl">
        <div class="row"><span class="lab">노선</span><div class="daypick">${EDIT.map(k=>`<button data-to="${k}" aria-pressed="${k===dk}">${lsym(k,"sm")}${WDK[k]}</button>`).join("")}<button data-to="pool" aria-pressed="${!dk}">${ico("i-box")}보관함</button></div></div>
        ${dk?`<div class="row"><span class="lab">머무는 시간</span><div class="step"><button data-dur="-15" aria-label="15분 줄이기">−</button><span>${dur}분</span><button data-dur="15" aria-label="15분 늘리기">+</button></div></div>
        <div class="row"><span class="lab">시각 고정</span><input type="time" id="pint" value="${hhmm(S.pins[id]||(r?fmt(r.start):""))}"><button class="btn" id="pinbtn">${ico("i-lock")}${S.pins[id]?"고정 풀기":"이 시각에 고정"}</button></div>`:""}
        <div class="row"><span class="lab">찜</span><button class="btn" id="starbtn">${ico("i-star")}${S.star[id]?"찜 해제":"찜하기"}</button></div>
      </div>
      <div class="facts">${facts.join("")}</div>
      <div class="acts" style="margin-top:16px"><a class="btn ink" href="${MAPS(p.q||p.n,p.gid||(P&&P.gid))}" target="_blank" rel="noopener">${ico("i-map")}구글 지도</a>
        ${p.lat?`<a class="btn" href="${DIR(r&&r.from||HOTEL,p)}" target="_blank" rel="noopener">${ico("i-route")}길찾기</a>`:""}</div>
      ${p.src?`<p class="src">출처: <a href="${esc(p.src)}" target="_blank" rel="noopener">${esc(p.srcn||"링크")}</a></p>`:""}
    </div>`;
  if(!sheet.open) sheet.showModal();
  sheet.dataset.id=id;
  $$("[data-to]",sheet).forEach(b=>b.addEventListener("click",()=>{ moveTo(id,b.dataset.to); openSheet(id); }));
  $$("[data-dur]",sheet).forEach(b=>b.addEventListener("click",()=>{ S.dur[id]=Math.max(10,Math.min(300,dur+(+b.dataset.dur))); commit(`머무는 시간 ${S.dur[id]}분`); openSheet(id); }));
  const pb=$("#pinbtn",sheet); if(pb) pb.addEventListener("click",()=>{ if(S.pins[id]){ delete S.pins[id]; commit("고정을 풀었어요"); } else { const t=$("#pint",sheet).value.replace(/^0(\d)/,"$1"); if(isNaN(toMin(t))) return; S.pins[id]=t; commit(`${t}에 고정`); } openSheet(id); });
  const pi=$("#pint",sheet); if(pi) pi.addEventListener("change",()=>{ if(!S.pins[id]) return; const t=pi.value.replace(/^0(\d)/,"$1"); if(isNaN(toMin(t))) return; S.pins[id]=t; commit(`${t}에 고정`); openSheet(id); });
  $("#starbtn",sheet).addEventListener("click",()=>{ if(S.star[id]) delete S.star[id]; else S.star[id]=true; commit(S.star[id]?"찜했어요":"찜을 풀었어요"); openSheet(id); });
}
sheet.addEventListener("click",e=>{ if(e.target===sheet || e.target.closest("[data-close]")) sheet.close(); });

/* 크게 보기(일본어) */
function bigJa(p){
  const el=document.createElement("div"); el.className="bigja"; el.setAttribute("role","dialog"); el.setAttribute("aria-label","크게 보기");
  el.innerHTML=`<p class="k">${esc(p.n||p.ko||"")}</p><p class="j" lang="ja">${esc(p.ja)}</p>${p.addr?`<p class="a" lang="ja">${esc(p.addr)}</p>`:""}
    <div class="row">${canSpeak()?`<button class="btn" data-say>${ico("i-sound")}소리로 듣기</button>`:""}<button class="btn" data-x>닫기</button></div>`;
  document.body.appendChild(el);
  el.addEventListener("click",e=>{ if(e.target.closest("[data-say]")){ speakJa(p.ja); return; } el.remove(); });
}
const canSpeak=()=>"speechSynthesis" in window && typeof SpeechSynthesisUtterance!=="undefined";
function speakJa(text){ if(!canSpeak()||!text) return; try{ speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(text); u.lang="ja-JP"; u.rate=.9;
  const v=speechSynthesis.getVoices().find(x=>/^ja(-|_|$)/i.test(x.lang)); if(v) u.voice=v; speechSynthesis.speak(u); }catch(e){} }

/* 지도(그날 노선) */
let LMAP=null;
function openMap(dk){
  const sc=schedule(dk), ov=document.createElement("div"); ov.className="mapov";
  ov.innerHTML=`<div class="bar2">${lsym(dk,"sm")}<b>${WDK[dk]}요일 노선 지도</b><span class="spacer" style="flex:1"></span><button class="btn" data-x>${ico("i-x")}닫기</button></div><div id="lmap"></div>`;
  document.body.appendChild(ov);
  ov.querySelector("[data-x]").addEventListener("click",()=>{ if(LMAP){ LMAP.remove(); LMAP=null; } ov.remove(); });
  if(!window.L){ $("#lmap",ov).innerHTML=`<p class="src" style="padding:20px">지도를 불러오지 못했어요.</p>`; return; }
  LMAP=L.map($("#lmap",ov),{zoomControl:true,attributionControl:true});
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(LMAP);
  const pts=[[HOTEL.lat,HOTEL.lng],...sc.rows.map(r=>[r.p.lat,r.p.lng])];
  L.polyline([...pts,[HOTEL.lat,HOTEL.lng]],{color:LINE[dk].hex,weight:6,opacity:.9}).addTo(LMAP);
  L.marker([HOTEL.lat,HOTEL.lng],{icon:L.divIcon({className:"",html:`<span class="lmk" style="--c:#111;background:#111;color:#fff">숙</span>`,iconSize:[30,30],iconAnchor:[15,15]})}).addTo(LMAP);
  sc.rows.forEach(r=>{ const m=L.marker([r.p.lat,r.p.lng],{icon:L.divIcon({className:"",html:`<span class="lmk" style="--c:${LINE[dk].hex}">${String(r.i+1).padStart(2,"0")}</span>`,iconSize:[30,30],iconAnchor:[15,15]})}).addTo(LMAP);
    m.bindPopup(`<b>${fmt(r.start)} ${esc(r.p.n)}</b><br><a href="${MAPS(r.p.q,r.p.gid)}" target="_blank" rel="noopener">구글 지도</a>`); });
  LMAP.fitBounds(pts,{padding:[40,40]});
}

/* ── 도구 ── */
let CHECKED=(()=>{ try{ return JSON.parse(LS.get("tokyo-checks","{}"))||{}; }catch(e){ return {}; } })();
const FILM_KEY="tokyo-film";
function filmGet(){ try{ const v=JSON.parse(LS.get(FILM_KEY,"null")); if(v&&Array.isArray(v.rolls)&&v.rolls.length) return v; }catch(e){} return {rolls:[{id:1,film:"",exp:36,frames:[]}]}; }
function filmShot(delta){
  const v=filmGet(), r=v.rolls[v.rolls.length-1];
  if(delta>0){ if(r.frames.length>=r.exp){ toast("이 롤은 다 찍었어요. 새 롤을 시작하세요"); return; }
    const {cur,next,N}=nowNext(), x=cur||next; r.frames.push({n:r.frames.length+1, ts:Date.now(), place:x?x.p.n:"", ja:x?x.p.ja||"":"", day:N.dk||""}); toast(`${r.frames.length}컷${x?" · "+x.p.n:""}`); }
  else r.frames.pop();
  LS.set(FILM_KEY,JSON.stringify(v)); renderTools(true);
}
function filmText(){
  const v=filmGet(), f=new Intl.DateTimeFormat("ko-KR",{timeZone:TZ,month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit",hour12:false});
  return v.rolls.filter(r=>r.frames.length).map(r=>[`■ 롤 ${r.id}${r.film?" · "+r.film:""}`,...r.frames.map(x=>`#${x.n}  ${f.format(new Date(x.ts))}  ${x.place||"-"}${x.ja?" ("+x.ja+")":""}`)].join("\n")).join("\n\n");
}
let TOOLS_OPEN=LS.get("tokyo-lines-open","");
function renderTools(keep){
  if(VIEW!=="tools") return;
  const openNow=keep?$$(".tl[open]").map(x=>x.dataset.k):[TOOLS_OPEN];
  const film=filmGet(), roll=film.rolls[film.rolls.length-1], key=LS.get("tokyo-gkey",""), n=PSTORE.byId?Object.keys(PSTORE.byId).length:0;
  const tl=(k,icon,t,v,inner)=>`<details class="tl" data-k="${k}"${openNow.includes(k)?" open":""}><summary><span class="picto">${ico(icon)}</span>${t}<span class="v">${v||""}</span></summary><div class="in">${inner}</div></details>`;
  main.innerHTML=`<div class="wrap">
    <section class="hero"><p class="hero-date num">Tools</p><h1 class="hero-t">여행 도구</h1><p class="hero-s">예약 체크, 일본어, 긴급 연락처, 필름 기록, 구글 장소 정보, 노선 템플릿과 백업.</p></section>
    <div class="tools">
      ${tl("resv","i-check","예약 체크",`${CHECKS.filter(c=>CHECKED[c.id]).length}/${CHECKS.length}`,
        CHECKS.map(c=>`<label class="chk"><input type="checkbox" data-chk="${c.id}"${CHECKED[c.id]?" checked":""}><span><b>${esc(c.t)}</b>${esc(c.d)}</span></label>`).join(""))}
      ${tl("film","i-camera","필름 기록",`${roll.frames.length}/${roll.exp}`,
        `<div class="film"><b>${roll.frames.length}</b><span>/ ${roll.exp} · 롤 ${roll.id}</span></div>
         <div class="acts"><button class="btn ink" data-film="1">${ico("i-camera")}한 컷</button><button class="btn" data-film="-1"${roll.frames.length?"":" disabled"}>되돌리기</button><button class="btn" data-film="new">새 롤</button><button class="btn" data-film="copy"${film.rolls.some(r=>r.frames.length)?"":" disabled"}>기록 복사</button></div>
         <div style="display:grid;grid-template-columns:1fr 96px;gap:8px;margin-top:12px"><label class="fld">필름<input id="film-name" value="${esc(roll.film)}" placeholder="예: Kodak Portra 400"></label><label class="fld">컷 수<select id="film-exp">${[12,24,27,36,39].map(x=>`<option${x===roll.exp?" selected":""}>${x}</option>`).join("")}</select></label></div>
         <p>한 컷을 누르면 그 시각과 지금(없으면 다음) 역이 같이 적혀요. 기기에만 저장돼요.</p>`)}
      ${tl("phr","i-sound","일본어 한마디","",
        PHRASES.map((x,i)=>`<div class="phr"><button data-phr="${i}"><b>${esc(x.ko)}</b><span lang="ja">${esc(x.ja)}</span></button>${canSpeak()?`<button class="say" data-say="${i}" aria-label="일본어로 듣기">${ico("i-sound")}</button>`:"<span></span>"}</div>`).join(""))}
      ${tl("hotel","i-hotel","숙소",HOTEL.stn,
        `<p><b style="color:var(--ink);font-size:17px">${esc(HOTEL.n)}</b><br><span lang="ja">${esc(HOTEL.ja)}</span><br><span lang="ja">${esc(HOTEL.addr)}</span></p><p>체크인 ${HOTEL.checkin} · 체크아웃 ${HOTEL.checkout} · 赤坂見附역 1분</p>
         <div class="acts"><button class="btn ink" data-hotel>${ico("i-zoom")}주소 크게 보기</button><a class="btn" href="${MAPS(HOTEL.q)}" target="_blank" rel="noopener">${ico("i-map")}지도</a></div>`)}
      ${tl("sos","i-help","긴급 연락처","",`<div class="sos">${SOS.map(x=>`<a href="tel:${x.tel.replace(/[^+\d]/g,"")}"><span><b>${esc(x.n)}</b><br><span style="font-size:13px">${esc(x.d)}</span></span><span class="num">${esc(x.tel)}</span></a>`).join("")}</div><p style="margin-top:10px">대사관 번호는 출발 전에 외교부 페이지에서 다시 확인하세요.</p>`)}
      ${tl("tpl","i-line","노선 템플릿",PLANS.find(p=>p.k===S.tpl)?.n||"",
        `<p>정리해 둔 네 가지 일정 중 하나로 노선을 다시 짭니다. 찜과 직접 담은 곳은 남아요.</p><div class="tpl">${PLANS.filter(p=>p.k!=="mine").map(p=>`<button data-tpl="${p.k}"><b>${esc(p.n)}${p.k===S.tpl?" · 지금":""}</b><span>${esc(p.intro)}</span></button>`).join("")}</div>`)}
      ${tl("google","i-pin","구글 장소 정보",n?`${n}곳`:"키 없음",
        `<p>키를 넣고 받으면 모든 블록에 사진·평점·요일별 영업시간이 붙고, 영업시간 밖이면 운행표에 경고가 떠요. 30일 동안 보관해요.</p>
         <label class="fld">Places API 키<input type="password" id="gkey" value="${esc(key)}" autocomplete="off" placeholder="AIza…"></label>
         <div class="acts"><button class="btn ink" id="gfetch">장소 정보 받기</button>${n?`<button class="btn" id="gclear">지우기</button>`:""}</div><p id="gstat" style="margin-top:10px">${n?`${n}곳 저장됨 · ${Math.floor((Date.now()-PSTORE.at)/864e5)}일 전`:"아직 받지 않았어요."}</p>
         <p>키 만들기: console.cloud.google.com → Places API (New) 사용 → 사용자 인증 정보에서 API 키 → 웹사이트 제한에 이 주소 추가.</p>`)}
      ${tl("backup","i-box","백업·캘린더","",
        `<p>노선은 이 기기에 저장돼요. 다른 폰으로 옮기려면 파일로 저장하세요.</p>
         <div class="acts"><button class="btn" id="exp">파일로 저장</button><label class="btn" for="imp">불러오기</label><button class="btn" id="ics">${ico("i-cal")}캘린더 파일</button><button class="btn" id="reset">처음 노선으로</button></div><input type="file" id="imp" accept=".json,application/json" hidden>`)}
      <a class="tl" href="classic.html" style="display:flex;align-items:center;gap:12px;min-height:64px;padding:0 16px;font-weight:800;text-decoration:none"><span class="picto" style="width:30px;height:30px;border-radius:9px">${ico("i-more")}</span>예산·교통·공항·날씨 (이전 화면)</a>
    </div><div style="height:28px"></div></div>`;
  $$(".tl").forEach(d=>d.addEventListener("toggle",()=>{ if(d.open){ TOOLS_OPEN=d.dataset.k; LS.set("tokyo-lines-open",TOOLS_OPEN); } }));
  $$("[data-chk]").forEach(c=>c.addEventListener("change",()=>{ if(c.checked) CHECKED[c.dataset.chk]=true; else delete CHECKED[c.dataset.chk]; LS.set("tokyo-checks",JSON.stringify(CHECKED)); renderTools(true); }));
  $$("[data-film]").forEach(b=>b.addEventListener("click",async()=>{ const a=b.dataset.film;
    if(a==="new"){ const v=filmGet(); v.rolls.push({id:v.rolls.length+1, film:roll.film, exp:roll.exp, frames:[]}); LS.set(FILM_KEY,JSON.stringify(v)); toast(`롤 ${v.rolls.length} 시작`); renderTools(true); return; }
    if(a==="copy"){ try{ await navigator.clipboard.writeText(filmText()); toast("기록을 복사했어요"); }catch(e){ toast("복사가 막혀 있어요"); } return; }
    filmShot(+a); }));
  const fn=$("#film-name"); if(fn) fn.addEventListener("change",()=>{ const v=filmGet(); v.rolls[v.rolls.length-1].film=fn.value.trim(); LS.set(FILM_KEY,JSON.stringify(v)); });
  const fe=$("#film-exp"); if(fe) fe.addEventListener("change",()=>{ const v=filmGet(); v.rolls[v.rolls.length-1].exp=+fe.value; LS.set(FILM_KEY,JSON.stringify(v)); renderTools(true); });
  $$("[data-phr]").forEach(b=>b.addEventListener("click",()=>{ const x=PHRASES[+b.dataset.phr]; bigJa({n:x.ko, ja:x.ja}); }));
  $$("[data-say]").forEach(b=>b.addEventListener("click",()=>speakJa(PHRASES[+b.dataset.say].ja)));
  const hb=$("[data-hotel]"); if(hb) hb.addEventListener("click",()=>bigJa({n:HOTEL.n, ja:HOTEL.ja, addr:HOTEL.addr}));
  $$("[data-tpl]").forEach(b=>b.addEventListener("click",()=>{ const P=PLANS.find(p=>p.k===b.dataset.tpl); if(!confirm(`'${P.n}'로 노선을 다시 짤까요? 지금 순서와 고정 시각은 사라져요. 먼저 파일로 저장해 두면 되돌릴 수 있어요.`)) return;
    S=fromTemplate(P.k,{star:S.star, added:S.added}); commit(`'${P.n}' 노선으로 다시 짰어요`); }));
  const gk=$("#gkey"); if(gk) gk.addEventListener("change",()=>LS.set("tokyo-gkey",gk.value.trim()));
  const gf=$("#gfetch"); if(gf) gf.addEventListener("click",async()=>{ const k=gk.value.trim(); if(!k){ $("#gstat").textContent="먼저 키를 넣어 주세요."; gk.focus(); return; }
    LS.set("tokyo-gkey",k); gf.disabled=true;
    const res=await fetchPlaces(k,(i,t)=>{ gf.textContent=`받는 중 ${i}/${t}`; });
    gf.disabled=false; gf.textContent="장소 정보 받기";
    const got=Object.keys(res.out).length;
    if(got){ PSTORE={at:Date.now(), v:1, byId:Object.assign({}, PSTORE.byId||{}, res.out)}; try{ localStorage.setItem("tokyo-places",JSON.stringify(PSTORE)); }catch(e){} }
    renderTools(true); $("#gstat").textContent = res.fail ? `${got}곳 받았고 ${res.fail}곳은 실패했어요. ${res.first}` : `${got}곳 받았어요.`; });
  const gc=$("#gclear"); if(gc) gc.addEventListener("click",()=>{ PSTORE={}; LS.del("tokyo-places"); renderTools(true); });
  $("#exp").addEventListener("click",()=>download("tokyo-lines.json",JSON.stringify(S,null,1),"application/json"));
  $("#imp").addEventListener("change",async e=>{ const f=e.target.files[0]; if(!f) return; try{ const v=JSON.parse(await f.text()); if(!v||!v.days) throw 0; S=v; EDIT.forEach(k=>{ S.days[k]=(S.days[k]||[]).filter(id=>place(id)); }); ["start","pins","dur","star","added"].forEach(k=>S[k]=S[k]||{}); commit("노선을 불러왔어요"); }catch(err){ toast("이 파일은 읽을 수 없어요"); } });
  $("#ics").addEventListener("click",()=>download("tokyo-lines.ics",icsText(),"text/calendar;charset=utf-8"));
  $("#reset").addEventListener("click",()=>{ if(!confirm("처음 노선(지역별 기본)으로 돌아갈까요? 찜과 직접 담은 곳은 남아요.")) return; S=fromTemplate("base",{star:S.star, added:S.added}); commit("처음 노선으로 돌아갔어요"); });
}
function download(name,text,type){ const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([text],{type})); a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },1000); }
function icsText(){
  const enc=new TextEncoder();
  const fold=line=>{ const out=[]; let cur="",n=0; for(const ch of line){ const b=enc.encode(ch).length; if(n+b>(out.length?74:75)){ out.push(cur); cur=""; n=0; } cur+=ch; n+=b; } out.push(cur); return out.join("\r\n "); };
  const tx=v=>String(v??"").replace(/\\/g,"\\\\").replace(/;/g,"\\;").replace(/,/g,"\\,").replace(/\r?\n/g,"\\n");
  const utc=(date,min)=>new Date(new Date(date+"T00:00:00+09:00").getTime()+min*60000).toISOString().replace(/[-:]/g,"").replace(/\.\d{3}/,"");
  const L=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//tokyo-lines//KO","CALSCALE:GREGORIAN","X-WR-CALNAME:Tokyo Lines"];
  EDIT.forEach(dk=>schedule(dk).rows.forEach(r=>{ const c=code(dk,r.i);
    L.push("BEGIN:VEVENT",`UID:${dk}-${r.i}-${encodeURIComponent(r.id).slice(0,40)}@tokyo-lines`,"DTSTAMP:20260927T000000Z",`DTSTART:${utc(DAY[dk].date,r.start)}`,`DTEND:${utc(DAY[dk].date,r.end)}`,
      fold(`SUMMARY:${tx(`${c.l}${c.n} ${r.p.n}`)}`),fold(`LOCATION:${tx(r.p.ja||r.p.n)}`),fold(`DESCRIPTION:${tx(r.p.note||"")}`),
      "BEGIN:VALARM","ACTION:DISPLAY",`TRIGGER:-PT${r.pin?60:30}M`,fold(`DESCRIPTION:${tx(r.p.n)}`),"END:VALARM","END:VEVENT"); }));
  L.push("END:VCALENDAR"); return L.join("\r\n")+"\r\n";
}

/* ─────────────── 공통 이벤트 ─────────────── */
document.addEventListener("click",e=>{
  const g=e.target.closest("[data-go]"); if(g && !e.target.closest(".drop")){ e.preventDefault(); if(g.dataset.open){ TOOLS_OPEN=g.dataset.open; LS.set("tokyo-lines-open",TOOLS_OPEN); } go(g.dataset.go, g.dataset.day); return; }
  const a=e.target.closest("[data-add]"); if(a){ e.stopPropagation(); moveTo(a.dataset.add, CUR==="wed"?"thu":CUR); return; }
  if(e.target.closest(".st .row") && e.target.closest("[data-open]")){ openSheet(e.target.closest("[data-open]").dataset.open); return; }
  const b=e.target.closest("[data-big]"); if(b){ const p=place(b.dataset.big); if(p && p.ja) bigJa(p); return; }
  const o=e.target.closest("[data-open]"); if(o && !e.target.closest(".tl")){ openSheet(o.dataset.open); return; }
});
document.addEventListener("keydown",e=>{ if((e.key==="Enter"||e.key===" ") && e.target.matches("[data-open][role=button]")){ e.preventDefault(); openSheet(e.target.dataset.open); } });
function clock(){
  const n=tokyoNow(), N=tripNow(), el=$("#clock"); if(!el) return;
  el.textContent = `도쿄 ${fmt(n.min)}` + (N.phase==="before"?` · D-${dday()}`:N.phase==="during"?` · ${DAYKEYS.indexOf(N.dk)+1}일차`:"");
}
setInterval(()=>{ clock(); if(tripNow().phase==="during" && (VIEW==="home"||VIEW==="board") && !document.body.classList.contains("dragging") && !sheet.open && !picker.open) render(); },60000);
matchMedia("(min-width: 980px)").addEventListener("change",()=>render());

if(tripNow().phase==="during" && LS.get("tokyo-lines-view",null)===null) VIEW="home";
render();

if("serviceWorker" in navigator && location.protocol!=="file:"){
  navigator.serviceWorker.register("sw.js").catch(()=>{});
}
