/* Tokyo Lines — 여행을 지하철 노선도로.
   날마다 노선 하나(도쿄메트로 색), 장소는 블록. 블록을 끌어다 놓으면 이동·영업시간·예약으로 도착 시각을 다시 계산한다.
   데이터(장소·사실)는 data.js, 이 파일은 화면과 계산만. 상태는 localStorage "tokyo-lines". */
"use strict";

/* ─────────────── 기본 도구 ─────────────── */
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const LS={get(k,d){ try{ const v=localStorage.getItem(k); return v==null?d:v; }catch(e){ return d; } },
          set(k,v){ try{ localStorage.setItem(k,v); }catch(e){} if(k==="tokyo-lines"||k==="tokyo-checks"||k==="tokyo-film"||k==="tokyo-spend") syncDirty(); },
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
function toast(msg){ const el=$("#toast"); el.textContent=msg; el.classList.remove("act"); el.classList.add("on"); clearTimeout(el._t); el._t=setTimeout(()=>el.classList.remove("on"),2200); }

/* ─────────────── 노선(날짜) ─────────────── */
const EDIT=["thu","fri","sat","sun"];
const DAYKEYS=["wed",...EDIT];
const LINE={
  wed:{code:"KS", c:"var(--L-wed)", hex:"#1B3D8F", name:"도착"},
  thu:{code:"G",  c:"var(--L-thu)", hex:"#F39700", name:"북동선"},
  fri:{code:"T",  c:"var(--L-fri)", hex:"#009BBF", name:"도심선"},
  sat:{code:"Z",  c:"var(--L-sat)", hex:"#8F76D6", name:"남서선"},   // 한조몬선 보라. 히비야선 은색은 회색 지도와 섞여서 바꿨다(2026-09-28)
  sun:{code:"M",  c:"var(--L-sun)", hex:"#E60012", name:"긴자선"}
};
const REGION={
  thu:{n:"북동쪽", sub:"고마고메 · 야나카 · 우에노 · 간다", concept:"가장 먼 다이묘 정원에서 시작해 야나카 옛 찻집과 목욕탕 갤러리, 박물관 숲 우에노, 콘도르의 양관, 저녁은 간다 소바 노포."},
  fri:{n:"동쪽 도심", sub:"츠키지 · 진보초 · 시바 · 긴자", concept:"새벽 시장과 헌책방 거리, 두 미술관, 해 지는 도쿄 타워, 긴자 스시 노포."},
  sat:{n:"남서쪽", sub:"나카메구로 · 아오야마 · 롯폰기 · 시부야", concept:"강가 로스터리에서 네즈 정원, 은행나무길, 국립신미술관, 해 지는 시부야 스카이, 도겐자카 라멘."},
  sun:{n:"긴자", sub:"쓰키지 · 긴자 · 도라노몬", concept:"떠나는 날 오전. 혼간지 아침, 문구와 사진집 서가, 정원 카페 점심."}
};
const DAY=Object.fromEntries(DAYS.map(d=>[d.key,d]));
const WDK={wed:"수",thu:"목",fri:"금",sat:"토",sun:"일"};
// 일요일: 나리타 18:00편 기준으로 긴자를 떠날 시각(숙소에서 짐 찾기 포함, 이동 시간은 추정). 이전 화면의 계산과 같다.
// 일요일: 숙소에서 공항으로 떠날 시각 = 비행기 − 공항 여유 − 이동 − 15분(도구 > 공항에서 바꿈, 이전 화면과 같은 저장 키)
function airOut(){ const a=LS.get("tokyo-air",LS.get("tokyo-air-in","nrt")); return AIRPORTS[a]?a:"nrt"; }
function sunLeaveMin(){ const ap=airOut(), ft=LS.get("tokyo-flight","18:00")||"18:00", buf=+LS.get("tokyo-buffer","150")||150, mv=+LS.get("tokyo-move",String(AIRPORTS[ap].mins))||AIRPORTS[ap].mins;
  return toMin(ft)-buf-mv-15; }

/* ─────────────── 장소 목록(블록) ───────────────
   id = 장소의 q. 기본 일정 → 빠진 곳(spare) → 추천 → 지나가는 건물 순서로 모으고, 먼저 들어온 값을 우선한다. */
const CAT=new Map();
const KIND={art:{i:"i-art",n:"미술·건축"},photo:{i:"i-camera",n:"건축·사진"},book:{i:"i-book",n:"책"},food:{i:"i-food",n:"먹고 마시기"},
  market:{i:"i-market",n:"시장"},bar:{i:"i-record",n:"음악"},leaf:{i:"i-leaf",n:"정원"},view:{i:"i-view",n:"전망"},hotel:{i:"i-hotel",n:"숙소"},move:{i:"i-move",n:"이동"}};
const MOOD=[{k:"see",n:"보고 찍기",kc:["art","photo"]},{k:"read",n:"읽기",kc:["book"]},{k:"eat",n:"먹고 마시기",kc:["food","market"]},{k:"listen",n:"듣기",kc:["bar"]},{k:"walk",n:"걷기",kc:["leaf","view"]}];
function catAdd(o){
  if(!o || !o.q || !(o.lat || o.gid)) return;
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
RECS.forEach(r=>catAdd({q:r.q, n:r.n, ja:r.ja, kc:r.kc, k:r.k, note:r.why, tip:r.tip, src:r.src, srcn:r.srcn, lat:r.lat, lng:r.lng, dig:r.dig, gid:r.id, found:r.found, shot:r.shot, fee:r.fee, feeNote:r.feeNote,
  outside:r.outside, fee:r.fee, feeNote:r.feeNote, slot:r.slot, gone:r.gone, goneSrc:r.goneSrc, rec:true}));
SIGHTS.forEach(g=>catAdd({q:g.q, n:g.n, ja:g.ja, kc:"photo", k:"건축", arch:{by:g.by, year:g.year}, note:g.why, src:g.src, srcn:g.srcn, gid:g.id,
  lat:g.lat, lng:g.lng, dig:g.dig, outside:true, sday:g.day}));
// 블록 id는 q. 원래 id 필드(구글 place_id)는 gid로 옮겼다
CAT.forEach((p,k)=>{ p.id=k; });

/* ─────────────── 상태 ─────────────── */
const SKEY="tokyo-lines";
let S=null;
function place(id){ return CAT.get(id) || (S && S.added && S.added[id]) || null; }
function blank(){ return {v:1, pv:PLANVER, tpl:DEFPLAN, days:{thu:[],fri:[],sat:[],sun:[]}, start:{}, pins:{}, dur:{}, star:{}, added:{}}; }
// 노선 판(pv)이 바뀌면 한 번 새 추천 노선으로 바꾸고, 이전 노선은 tokyo-lines-prev에 남겨 되돌릴 수 있게 한다
const PLANVER=4;
const DEFPLAN="henry";
function tplStops(P,dk){
  const d=DAY[dk], pd=P.days && P.days[dk];
  if(!pd) return d.stops.filter(s=>s.q && !s.hotel).map(s=>({q:s.q, t:s.t}));
  return pd.stops.map(sp=>({q:sp.ref, t:sp.t, pin:sp.pin, dur:sp.dur}));
}
function fromTemplate(k, keep){
  const P=PLANS.find(p=>p.k===k)||PLANS.find(p=>p.k==="base");
  const s=blank(); s.tpl=P.k;
  if(keep){ s.star=keep.star||{}; s.added=keep.added||{}; }
  EDIT.forEach(dk=>{
    const st=tplStops(P,dk).filter(x=>(place(x.q)&&!place(x.q).gone)||(keep&&keep.added&&keep.added[x.q]));
    s.days[dk]=st.map(x=>x.q);
    st.forEach(x=>{ const p=place(x.q); if(p && (p.need||p.needId||p.kc==="bar"||x.pin)) s.pins[x.q]=x.t; if(x.dur) s.dur[x.q]=x.dur; });
    const pd=P.days && P.days[dk];
    if(pd && pd.start) s.start[dk]=pd.start;
    else if(st[0]) s.start[dk]=fmt(round5(toMin(st[0].t)-travel(HOTEL,place(st[0].q)).min));
    if(P.k==="base") (DAY[dk].cands||[]).forEach(q=>{ if(place(q)) s.star[q]=true; });
    (P.stars||[]).forEach(q=>{ if(place(q)) s.star[q]=true; });
  });
  return s;
}
// 이전 화면에서 고친 "내 일정"(tokyo-myplan)과 추천 넣기(tokyo-mine)가 있으면 그걸로 시작한다
function migrate(){
  let my=null; try{ my=JSON.parse(LS.get("tokyo-myplan","null")); }catch(e){}
  let mine=[]; try{ mine=JSON.parse(LS.get("tokyo-mine","[]"))||[]; }catch(e){}
  const tpl=LS.get("tokyo-plan","base");
  const s=fromTemplate(my && my.from || (LS.get("tokyo-plan","") && PLANS.some(p=>p.k===tpl) ? tpl : DEFPLAN));
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
let NEWPLAN=false;
function load(){
  try{ const v=JSON.parse(LS.get(SKEY,"null")); if(v && v.days){ EDIT.forEach(k=>{ v.days[k]=(v.days[k]||[]); }); v.start=v.start||{}; v.pins=v.pins||{}; v.dur=v.dur||{}; v.star=v.star||{}; v.added=v.added||{};
    if((v.pv||1)<PLANVER){ LS.set("tokyo-lines-prev",JSON.stringify(v)); LS.set("tokyo-lines-news",DEFPLAN); const n=fromTemplate(DEFPLAN,{star:v.star, added:v.added}); NEWPLAN=true; return n; }
    return v; } }catch(e){}
  return migrate();
}
function save(){ LS.set(SKEY, JSON.stringify(S)); }
S=load();
if(NEWPLAN) save();
EDIT.forEach(dk=>{ S.days[dk]=S.days[dk].filter(id=>place(id)); });

/* ─────────────── 시간 계산 ─────────────── */
function travel(a,b){
  if(!a || !b || !a.lat || !b.lat) return {min:0, mode:"noloc", d:0};   // 좌표 없음(구글 정보를 받기 전의 Claude 발견 장소)
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
    if(p.gone) warn.push({lv:"bad", t:"문 닫은 곳이에요"});
    const G=placeOf(p); if(G && G.status==="CLOSED_PERMANENTLY") warn.push({lv:"bad", t:"구글: 폐업"}); else if(G && G.status==="CLOSED_TEMPORARILY") warn.push({lv:"bad", t:"구글: 임시 휴업"});
    if(dk==="sun"){ const lv=sunLeaveMin(), lim=lv-travel(p,HOTEL).min-10; if(end>lim) warn.push({lv:end-lim>10?"bad":"warn", t:`${fmt(lv)}엔 숙소에서 공항으로 떠나야 해요`}); }
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
  if(r.tr.mode==="noloc") return `${ico("i-walk")}${pre}이동 시간 모름 · 구글 장소 정보를 받으면 계산돼요`;
  const dist=r.tr.d<1?Math.round(r.tr.d*1000)+"m":r.tr.d.toFixed(1)+"km";
  return r.tr.mode==="walk" ? `${ico("i-walk")}${pre}도보 ${r.tr.min}분 · ${dist}` : `${ico("i-train")}${pre}전철 약 ${r.tr.min}분 · ${dist}`;
}

/* ─────────────── 구간 교통: 구글 Routes API(2026-09-28) ───────────────
   Henry: "다음 이정표로 교통안내가 잘 나왔으면." 전철 구간(1.2km 넘는 곳)마다 computeRoutes(TRANSIT)로 탈 노선·탈 역·내릴 역·정거장 수를 받는다.
   키의 API 제한에 Routes API가 있어야 한다. 경로는 저장하지 않고 이 세션(sessionStorage)에만 둔다(구글 정책 — 좌표·place ID 말고는 캐시 조심).
   실패하면 2분 쉬고, 그동안은 앱의 추정(hopText)을 보여 준다. 화면 전체를 다시 그리지 않고 [data-leg] 자리만 바꾼다(끄는 중 흔들리지 않게). */
let RT=(()=>{ try{ return new Map(JSON.parse(sessionStorage.getItem("tokyo-rt")||"[]")); }catch(e){ return new Map(); } })();
const LEGINFO=new Map(), RTWAIT=new Set();
const legKey=(a,b)=>`${(+a.lat).toFixed(4)},${(+a.lng).toFixed(4)}>${(+b.lat).toFixed(4)},${(+b.lng).toFixed(4)}`;
function legAttr(a,b,tr,big,dep){
  if(!tr || tr.mode!=="train" || !a || !b || !a.lat || !b.lat) return "";
  const k=legKey(a,b), I=LEGINFO.get(k)||{a,b,tr}; if(dep) I.dep=dep; LEGINFO.set(k,I);
  return ` data-leg="${k}"${big?' data-bigleg="1"':""}`;
}
function rlChip(t){ return `<span class="rl" style="--lc:${esc(t.color)};--lt:${esc(t.text)}">${esc(t.name||t.line||"전철")}</span>`; }
function legText(a,b,tr,first){
  const R=a&&b&&a.lat&&b.lat?RT.get(legKey(a,b)):null, pre=first?"숙소에서 ":"";
  if(!R || !R.steps) return `<span class="lg">${hopText({tr},first)}</span>`;
  const T=R.steps.filter(x=>!x.w);
  if(!T.length) return `<span class="lg">${ico("i-walk")}${pre}걸어서 약 ${R.min}분</span>`;
  return `<span class="lg rt">${ico("i-train")}${pre}${T.map(t=>`${rlChip(t)}${esc(t.from)}→${esc(t.to)}`).join(" · ")} · 약 ${R.min}분</span>`;
}
function legBig(a,b,tr){
  const R=a&&b&&a.lat&&b.lat?RT.get(legKey(a,b)):null;
  if(!R || !R.steps) return `<p class="lgt">${tr&&tr.mode==="train"?`전철 약 ${tr.min}분(추정) · 길찾기로 경로를 보세요`:tr&&tr.mode==="walk"?`걸어서 약 ${tr.min}분`:tr&&tr.mode==="noloc"?"위치를 받기 전이에요 · 길찾기로 경로를 보세요":"바로 옆이에요"}</p>`;
  return `<ol class="lgb">${R.steps.map(t=>t.w?`<li class="w">${ico("i-walk")}걸어서 ${t.w}분</li>`
      :`<li>${rlChip(t)}<span><b>${esc(t.from)}</b> → <b>${esc(t.to)}</b><small>${[t.head?esc(t.head)+" 방면":"", t.n?t.n+"정거장":"", t.min?t.min+"분":""].filter(Boolean).join(" · ")}</small></span></li>`).join("")}</ol>
    <p class="lgt">약 ${R.min}분 · 구글 경로</p>`;
}
function rtOff(){ return !!LS.get("tokyo-rt-err","") && Date.now()-(+LS.get("tokyo-rt-try","0"))<2*60e3; }
async function rtFetch(k){
  const I=LEGINFO.get(k), key=LS.get("tokyo-gkey",""); if(!I || !key) return;
  const body={origin:{location:{latLng:{latitude:+I.a.lat,longitude:+I.a.lng}}}, destination:{location:{latLng:{latitude:+I.b.lat,longitude:+I.b.lng}}}, travelMode:"TRANSIT", languageCode:"ja", regionCode:"JP"};
  if(I.dep && I.dep>Date.now()+60e3) body.departureTime=new Date(I.dep).toISOString();
  const call=b=>fetch("https://routes.googleapis.com/directions/v2:computeRoutes",{method:"POST",headers:{"Content-Type":"application/json","X-Goog-Api-Key":key,
    "X-Goog-FieldMask":"routes.duration,routes.travelAdvisory.transitFare,routes.legs.steps.travelMode,routes.legs.steps.staticDuration,routes.legs.steps.transitDetails"},body:JSON.stringify(b)});
  let r=await call(body);
  if(r.status===400 && body.departureTime){ delete body.departureTime; r=await call(body); }
  if(!r.ok){ const t=await r.text().catch(()=>"");
    if(r.status===401||r.status===403){ LS.set("tokyo-rt-err",/SERVICE_BLOCKED|has not been used|is disabled|not enabled/i.test(t)?"Routes API가 꺼져 있거나 키의 API 제한에 없어요.":/referer|referrer/i.test(t)?"키의 웹사이트 제한에 지금 주소가 없어요.":"Routes API 오류 "+r.status); LS.set("tokyo-rt-try",String(Date.now())); throw new Error("off"); }
    return; }
  const j=await r.json(), R=j.routes&&j.routes[0]; if(!R){ RT.set(k,{steps:[],min:0,none:true}); return; }
  const out=[]; let walk=0;
  (R.legs||[]).forEach(L=>(L.steps||[]).forEach(st=>{ const sec=parseInt(st.staticDuration)||0;
    if(st.travelMode==="TRANSIT" && st.transitDetails){ if(walk>=60){ out.push({w:Math.round(walk/60)}); } walk=0;
      const T=st.transitDetails, Ln=T.transitLine||{}, SD=T.stopDetails||{};
      out.push({line:Ln.nameShort||"", name:Ln.name||Ln.nameShort||"", color:Ln.color||"#555555", text:Ln.textColor||"#ffffff", from:(SD.departureStop||{}).name||"", to:(SD.arrivalStop||{}).name||"", n:T.stopCount||0, head:T.headsign||"", min:Math.round(sec/60)});
    } else walk+=sec; }));
  if(walk>=60) out.push({w:Math.round(walk/60)});
  const F=R.travelAdvisory&&R.travelAdvisory.transitFare, fare=F&&(!F.currencyCode||F.currencyCode==="JPY")?(+F.units||0)+Math.round((F.nanos||0)/1e9):null;
  RT.set(k,{steps:out, min:Math.round((parseInt(R.duration)||0)/60), fare}); LS.del("tokyo-rt-err");
  try{ sessionStorage.setItem("tokyo-rt",JSON.stringify([...RT])); }catch(e){}
}
// 화면에 있는 전철 구간 중 아직 없는 것만 받아서 그 자리만 바꾼다. dk를 주면 그날 출발 시각도 넘긴다
async function legFill(dk){ await legFill0(dk); if(VIEW==="home") briefFare(); }
async function legFill0(dk){
  if(!LS.get("tokyo-gkey","") || navigator.onLine===false || rtOff()) return;
  if(dk && DAY[dk] && EDIT.includes(dk)){ const sc=schedule(dk), base=new Date(DAY[dk].date+"T00:00:00+09:00").getTime();
    sc.rows.forEach(r=>{ const a=r.from||HOTEL; if(r.tr.mode==="train" && a.lat && r.p.lat){ const I=LEGINFO.get(legKey(a,r.p)); if(I) I.dep=base+(r.arr-r.tr.min)*60000; } }); }
  const ks=[...new Set($$("[data-leg]").map(e=>e.dataset.leg))].filter(k=>!RT.has(k) && !RTWAIT.has(k)).slice(0,12);
  for(const k of ks){ RTWAIT.add(k);
    try{ await rtFetch(k); }catch(e){ RTWAIT.delete(k); break; }
    RTWAIT.delete(k);
    $$(`[data-leg="${CSS.escape(k)}"]`).forEach(el=>{ const I=LEGINFO.get(k); if(!I) return;
      if(el.dataset.bigleg) el.innerHTML=legBig(I.a,I.b,I.tr); else { const lg=el.querySelector(".lg"); if(lg) lg.outerHTML=legText(I.a,I.b,I.tr,I.a===HOTEL); } }); }
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
function placeOf(p){ if(!p || !PSTORE.byId || !PSTORE.at || Date.now()-PSTORE.at>PMAXAGE) return null; return PSTORE.byId[pkey(p)]||PSTORE.byId["n:"+p.n]||null; }   // 예전엔 추천을 이름으로 저장했다
function gOpenAt(P,date,min){
  if(!P || !P.periods || !P.periods.length) return null;
  const dow=new Date(date+"T12:00:00+09:00").getUTCDay(), W=7*1440, w=dow*1440+(min%1440)+(min>=1440?1440:0);
  return P.periods.some(x=>{ if(!x.c) return true; const o=x.o[0]*1440+x.o[1]*60+x.o[2]; let c=x.c[0]*1440+x.c[1]*60+x.c[2]; if(c<=o) c+=W; return (w>=o&&w<c)||(w+W>=o&&w+W<c); });
}
function gErr(status,body){
  if(status===403){ let m=""; try{ m=JSON.parse(body).error.message||""; }catch(e){}
    if(/referer|referrer/i.test(m)) return `키의 웹사이트 제한에 지금 주소가 없어요. 구글 콘솔에서 키 제한에 ${location.origin}/* 를 더하세요.`;
    if(/not been used|disabled|SERVICE_DISABLED/i.test(m)) return "이 키의 프로젝트에서 Places API (New)가 꺼져 있어요. 콘솔에서 사용을 눌러 주세요.";
    return "키가 거부됐어요. Places API (New)가 켜져 있는지, 키의 웹사이트 제한에 이 주소가 들어 있는지 확인하세요."; }
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
async function gPhoto(key,j){   // 사진 주소(photoUri)는 금방 만료된다 — 저장된 게 깨지면 photoFix가 다시 받는다
  const pn=j.photos&&j.photos[0]&&j.photos[0].name; if(!pn) return "";
  try{ const pr=await fetch("https://places.googleapis.com/v1/"+pn+"/media?maxHeightPx=900&maxWidthPx=1200&skipHttpRedirect=true&key="+encodeURIComponent(key)); if(pr.ok){ const pj=await pr.json(); return pj.photoUri||""; } }catch(e){}
  return "";
}
async function fetchPlaces(key,report){
  const seen=new Set(), jobs=[];
  [...CAT.values(), ...Object.values(S.added)].forEach(p=>{ const k=pkey(p); if((p.lat||p.gid) && !seen.has(k)){ seen.add(k); jobs.push(p); } });
  const out={}; let fail=0, first="", done=0, stop=false, next=0;
  async function one(p){
    try{
      let id=p.gid;
      if(!id){ const f=await findId(key,p);
        if(f.status){ fail++; first=first||gErr(f.status,f.body); if([400,401,403].includes(f.status)) stop=true; return; }
        if(!f.id){ fail++; return; } id=f.id; }
      const r=await fetch("https://places.googleapis.com/v1/places/"+encodeURIComponent(id)+"?key="+encodeURIComponent(key)+"&languageCode=ko&regionCode=JP&fields="+encodeURIComponent(PFIELDS));
      if(!r.ok){ fail++; first=first||gErr(r.status,await r.text().catch(()=>"")); if([400,401,403].includes(r.status)) stop=true; return; }
      const j=await r.json();
      const rec={n:(j.displayName&&j.displayName.text)||"", rating:j.rating||0, reviews:j.userRatingCount||0,
        type:(j.primaryTypeDisplayName&&j.primaryTypeDisplayName.text)||"", hours:(j.regularOpeningHours&&j.regularOpeningHours.weekdayDescriptions)||[],
        uri:j.googleMapsUri||"", status:j.businessStatus||"", loc:j.location?{lat:j.location.latitude,lng:j.location.longitude}:null,
        periods:((j.regularOpeningHours&&j.regularOpeningHours.periods)||[]).filter(x=>x.open).map(x=>({o:[x.open.day,x.open.hour||0,x.open.minute||0], c:x.close?[x.close.day,x.close.hour||0,x.close.minute||0]:null}))};
      if(!p.gid) rec.gid=id;
      const ph=await gPhoto(key,j); if(ph){ rec.photo=ph; rec.pat=Date.now(); }
      out[pkey(p)]=rec;
    }catch(e){ fail++; first=first||"네트워크에 닿지 못했어요."; }
  }
  async function worker(){ while(!stop && next<jobs.length){ const p=jobs[next++]; await one(p); report(++done, jobs.length); } }
  await Promise.all(Array.from({length:6},worker));
  if(stop) fail=jobs.length-Object.keys(out).length;
  return {out, fail, total:jobs.length, first};
}

/* ─────────────── 지역(보관함 필터) ───────────────
   기본 일정의 날 → 지나가는 건물의 날 → 숙소 2.5km 안 → 가장 가까운 날(3km 넘으면 "먼 곳") */
const AREA=new Map();
function buildArea(){
  const anchors={}; EDIT.forEach(dk=>{ anchors[dk]=DAY[dk].stops.filter(s=>s.lat && !s.hotel && km(s,HOTEL)>=2.5); });
  CAT.forEach(p=>{
    let a=p.home || p.sday || null;
    if(!a && km(p,HOTEL)<2.5) a="hotel";
    if(!a){ let best=null,bd=1e9; EDIT.forEach(dk=>anchors[dk].forEach(s=>{ const x=km(s,p); if(x<bd){bd=x;best=dk;} })); a = bd<=3 ? best : "far"; }
    AREA.set(p.id,a);
  });
}
/* 발견 장소처럼 좌표 없이 place ID만 있는 곳은 받아 둔 구글 정보(30일 보관)의 위치로 채운다 */
function hydrateLoc(){
  let n=0; CAT.forEach(p=>{ if(p.lat || !p.gid) return; const P=PSTORE.byId && (PSTORE.byId[pkey(p)]||PSTORE.byId["n:"+p.n]); if(P && P.loc && PSTORE.at && Date.now()-PSTORE.at<PMAXAGE){ p.lat=P.loc.lat; p.lng=P.loc.lng; p.gloc=true; n++; } });
  if(n) buildArea(); return n;
}
buildArea(); hydrateLoc();
function areaOf(p){ if(AREA.has(p.id)) return AREA.get(p.id); if(!p.lat) return "far"; if(km(p,HOTEL)<2.5) return "hotel"; let best="far",bd=3; EDIT.forEach(dk=>(S.days[dk]||[]).forEach(id=>{ const q=place(id); if(q && q.lat){ const x=km(q,p); if(x<bd){bd=x;best=dk;} } })); return best; }
const AREANAME={thu:"북동쪽",fri:"동쪽 도심",sat:"남서쪽",sun:"긴자",hotel:"숙소 근처",far:"먼 곳"};
function dayOf(id){ return EDIT.find(dk=>S.days[dk].includes(id))||null; }
// 예약 체크는 지금 노선에 든 곳만(q 없는 항목은 늘)
function checksNow(){ return CHECKS.filter(c=>!c.q || !!dayOf(c.q)); }

/* 새 추천 노선 알림 — 한 번 바꾼 뒤 되돌리기를 고를 수 있게 */
function newsHTML(){
  const P=PLANS.find(p=>p.k===LS.get("tokyo-lines-news",""));
  if(!P) return "";
  return `<div class="news" role="status"><p><b>${esc(P.n)} 노선으로 바꿨어요</b>${esc(P.news||P.intro||"")}${LS.get("tokyo-lines-prev","")?" 직접 고친 노선은 따로 보관해 두었어요.":""}</p>
    <div class="acts">${LS.get("tokyo-lines-prev","")?`<button class="btn" data-news="undo">이전 노선으로</button>`:""}<button class="btn ink" data-news="ok">좋아요</button></div></div>`;
}
function newsAct(k){
  if(k==="undo"){ try{ const v=JSON.parse(LS.get("tokyo-lines-prev","null")); if(v&&v.days){ useLines(v); } }catch(e){} LS.del("tokyo-lines-news"); commit("이전 노선으로 돌아갔어요"); return; }
  LS.del("tokyo-lines-news"); render();
}

/* ─────────────── 어디에 넣을까 ───────────────
   Henry: "지도에서 위치를 모르니까 어디에 넣어야 할지 모르겠어" → 날마다 가장 덜 돌아가는 자리를 계산해서 보여 주고 거기 넣는다. */
function offOn(p,dk){ const H=hoursOf(p), off=[H.off,p.closed].filter(Boolean).join(" "); return off.includes(WDK[dk]); }
function detour(dk,p){   // 그날 노선에 끼웠을 때 이동이 가장 적게 느는 자리 {idx, add(분)}
  const ids=S.days[dk].filter(x=>x!==p.id), pts=[HOTEL,...ids.map(place),HOTEL];
  if(!p.lat) return {idx:ids.length, add:null};
  let best=null;
  for(let i=0;i<pts.length-1;i++){ const a=pts[i], b=pts[i+1]; if(!a||!b||!a.lat||!b.lat) continue;
    const add=travel(a,p).min+travel(p,b).min-travel(a,b).min; if(!best||add<best.add) best={idx:i, add}; }
  return best ? {idx:best.idx, add:Math.max(0,Math.round(best.add))} : {idx:ids.length, add:null};
}
// 종류별로 보통 여는 때(분). 출처 있는 시각이 아니라서 경고엔 쓰지 않고, 넣을 자리를 고를 때만 벌점으로 쓴다
const KWIN={art:[600,1080], book:[660,1200], bar:[1080,1740], market:[360,840], leaf:[540,1050]};
/* fit(p,dk): 그날 모든 자리에 실제로 끼워 보고 가장 나은 자리를 고른다.
   벌점 = 넣은 곳이 닫혀 있음(2000) + 다른 곳에 새로 생긴 경고(600) + 예약 시각이 밀린 분×12(바 같은 느슨한 고정은 ×4)
        + 그 종류로는 이상한 시각(1000, 밤 11시 미술관 같은) + 늘어난 이동 분. 고정 시각이 10분 넘게 밀리거나 새 경고가 생기면 "밀림".
   이동만 보던 첫 판은 꽉 찬 날이면 무엇이든 밤 LP바 뒤로 보냈다. 렌더마다 FITC를 비운다. */
// 이 곳을 둘 만한 때: 종류에 아침·점심·저녁이 적혀 있으면 식사 시간, 출처 있는 여는 시각이 있으면 그걸 따르고(여기선 안 봄), 아니면 종류별 보통 시각
function kwin(p){ if(p.outside) return null; const k=p.k||"";
  if(/아침/.test(k)) return [360,630]; if(/점심/.test(k)) return [660,870]; if(/저녁/.test(k)) return [1020,1290];
  if(hoursOf(p).o) return null; return KWIN[p.kc]||null; }
let FITC=new Map();
const hardBad=r=>r.warn.filter(w=>w.lv==="bad" && !/늦어요/.test(w.t)).length;
function fit(p,dk){
  const key=dk+"|"+p.id; if(FITC.has(key)) return FITC.get(key);
  const saved=S.days[dk], list=saved.filter(x=>x!==p.id);
  S.days[dk]=list; const b0=new Map(schedule(dk).rows.map(r=>[r.id,{late:r.late||0, bad:hardBad(r)}]));
  const lw=r=>(r.p.need||r.p.needId)?12:4;
  let best=null;
  for(let i=0;i<=list.length;i++){
    const L=list.slice(); L.splice(i,0,p.id); S.days[dk]=L; const sc=schedule(dk);
    let pen=0, own=null, flag=false, worst=null;
    sc.rows.forEach(r=>{ if(r.id===p.id){ own=r; const hb=hardBad(r); pen+=hb*2000+(r.late||0)*12; if(hb||(r.late||0)>10) flag=true; }
      else { const o=b0.get(r.id)||{late:0,bad:0}, dl=Math.max(0,(r.late||0)-o.late), nb=Math.max(0,hardBad(r)-o.bad);
        pen+=dl*lw(r)+nb*600; if(dl>10||nb){ flag=true; if(!worst||dl>worst.m) worst={n:r.p.n, m:dl}; } } });
    const w=kwin(p); if(w && own && (own.start<w[0] || own.end>w[1]+30)){ pen+=1000; flag=true; }
    const pts=[HOTEL,...list.map(place),HOTEL], a=pts[i], b=pts[i+1];
    const d=(p.lat&&a&&b&&a.lat&&b.lat)?travel(a,p).min+travel(p,b).min-travel(a,b).min:0;
    if(!best || pen+d<best.cost) best={idx:i, cost:pen+d, add:p.lat?Math.max(0,Math.round(d)):null, tight:flag, worst};
  }
  S.days[dk]=saved;
  best.off=offOn(p,dk); FITC.set(key,best); return best;
}
function spots(p){ return EDIT.map(dk=>Object.assign({dk}, fit(p,dk))).sort((a,b)=>(a.off-b.off)||(a.cost-b.cost)); }
function placeInto(id,dk,quiet){
  const p=place(id); if(!p) return;
  FITC.delete(dk+"|"+id); const f=fit(p,dk);
  removeEverywhere(id); S.days[dk].splice(f.idx,0,id); FITC=new Map();
  if(!quiet) commit(placeMsg(p,dk,f));
  return f;
}
const placeMsg=(p,dk,f)=>`${p.n} → ${WDK[dk]} ${LINE[dk].code}${String(f.idx+1).padStart(2,"0")}${f.add!=null?` · 이동 +${f.add}분`:""}${f.tight?(f.worst&&f.worst.m?` · ${f.worst.n} ${f.worst.m}분 밀려요`:" · 시간이 빠듯해요"):""}`;
/* 지도에서 바로 넣고 빼기(2026-09-28) — Henry: "지도 메뉴에서도 목록에서 넣고 빼고, 지도 보면서 바로." 넣는 자리는 자동(fit), 둘 다 되돌리기 토스트 */
function toastUndo(msg,fn){ const el=$("#toast"); el.innerHTML=`<span>${esc(msg)}</span><button type="button" class="tu">되돌리기</button>`; el.classList.add("on","act"); clearTimeout(el._t);
  el.querySelector(".tu").onclick=()=>{ clearTimeout(el._t); el.classList.remove("on","act"); fn(); }; el._t=setTimeout(()=>el.classList.remove("on","act"),5000); }
function daySnap(){ return {days:JSON.parse(JSON.stringify(S.days)), pins:Object.assign({},S.pins)}; }
function mapPut(id,dk){ const p=place(id); if(!p) return; const snap=daySnap(); XSEL=id; const f=placeInto(id,dk,true); commit();
  toastUndo(placeMsg(p,dk,f),()=>{ S.days=snap.days; S.pins=snap.pins; commit("되돌렸어요"); }); }
function mapOut(id){ const p=place(id); if(!p) return; const snap=daySnap(); removeEverywhere(id); delete S.pins[id]; if(XSEL===id) XSEL=null; commit();
  toastUndo(`${p.n} — 보관함으로`,()=>{ S.days=snap.days; S.pins=snap.pins; XSEL=id; commit("되돌렸어요"); }); }
// 그날 노선 근처(역·숙소에서 1.5km, 찜은 3km)의 아직 안 넣은 곳 — 운행표 지도의 후보 핀과 넓은 화면 목록
function xCands(dk){
  const placed=new Set(EDIT.flatMap(k=>S.days[k])), stops=[HOTEL,...S.days[dk].map(place).filter(q=>q&&q.lat)];
  return [...CAT.values(), ...Object.values(S.added)].filter(p=>p.lat && !p.gone && !placed.has(p.id))
    .map(p=>({p, d:Math.min(...stops.map(q=>km(q,p)))})).filter(x=>x.d<=(S.star[x.p.id]?3:1.5)).sort((a,b)=>a.d-b.d).slice(0,30).map(x=>x.p);
}
/* ─────────────── 동선 최적화 ───────────────
   Henry: "동선을 가장 최소화하는 일정표가 있으면 좋겠어." 그날 역 순서만 바꿔서 이동 시간을 줄인다.
   점수 = 닫혀 있음·출국 넘김 같은 빨간 경고 2000 + 노란 경고 150 + 예약 시각에 늦은 분×12 + 그 종류로 이상한 시각 1000
        + 이동 분 + 기다리는 분×0.3. 지금 순서와 가까운 곳부터 잇는 순서에서 출발해 옮기기·바꾸기·뒤집기를 더 나아지지 않을 때까지. */
function dayScore(dk){
  const sc=schedule(dk); let pen=0, mv=0, wait=0;
  sc.rows.forEach(r=>{ pen+=hardBad(r)*2000+r.warn.filter(w=>w.lv!=="bad").length*150+(r.late||0)*12; mv+=r.tr.min; wait+=r.wait||0;
    const w=kwin(r.p); if(w && (r.start<w[0] || r.end>w[1]+30)) pen+=1000; });
  mv+=sc.back.min;
  return {score:pen+mv+wait*0.3, mv, km:sc.dist, pen};
}
function optimizeDay(dk){
  const orig=S.days[dk].slice(); if(orig.length<3) return null;
  const evalO=o=>{ S.days[dk]=o; return dayScore(dk).score; };
  const nn=(()=>{ const left=orig.slice(), out=[]; let cur=HOTEL;          // 가까운 곳부터(고정 시각이 있으면 그 시각 순서를 먼저 지킨다)
    const pinned=left.filter(id=>S.pins[id]).sort((a,b)=>toMin(S.pins[a])-toMin(S.pins[b]));
    while(left.length){ let bi=0,bd=1e9; left.forEach((id,i)=>{ const p=place(id); const d=(p&&p.lat&&cur.lat)?km(cur,p):0; const pk=pinned.indexOf(id); const pen=pk>0&&!out.includes(pinned[pk-1])?1e3:0; if(d+pen<bd){bd=d+pen;bi=i;} });
      const id=left.splice(bi,1)[0]; out.push(id); cur=place(id)||cur; }
    return out; })();
  let best=orig.slice(), bestS=evalO(orig);
  for(const start of [orig, nn]){
    let cur=start.slice(), curS=evalO(cur), improved=true, guard=0;
    while(improved && guard++<60){
      improved=false;
      const n=cur.length;
      for(let i=0;i<n && !improved;i++) for(let j=0;j<n && !improved;j++){ if(i===j) continue;
        const o=cur.slice(); const [x]=o.splice(i,1); o.splice(j,0,x); const sc=evalO(o); if(sc<curS-0.5){ cur=o; curS=sc; improved=true; } }
      for(let i=0;i<n-1 && !improved;i++) for(let j=i+2;j<=n && !improved;j++){
        const o=cur.slice(0,i).concat(cur.slice(i,j).reverse(),cur.slice(j)); const sc=evalO(o); if(sc<curS-0.5){ cur=o; curS=sc; improved=true; } }
    }
    if(curS<bestS-0.5){ best=cur; bestS=curS; }
  }
  S.days[dk]=orig; const before=dayScore(dk);
  S.days[dk]=best; const after=dayScore(dk); S.days[dk]=orig;
  return {order:best, before, after, changed:best.join("|")!==orig.join("|")};
}
let OPTRES=null;   // 방금 최적화한 날의 이전 순서(되돌리기)
function runOptimize(dk){
  const r=optimizeDay(dk);
  if(!r || !r.changed || r.after.mv>=r.before.mv && r.after.pen>=r.before.pen){ toast("이미 가장 덜 움직이는 순서예요"); return; }
  OPTRES={dk, prev:S.days[dk].slice(), before:r.before, after:r.after};
  S.days[dk]=r.order; commit(`이동 ${r.before.mv}분 → ${r.after.mv}분`);
}
function optHTML(){
  if(!OPTRES || OPTRES.dk!==CUR) return "";
  const {before:b, after:a}=OPTRES, d=b.mv-a.mv;
  return `<div class="news opt" role="status"><p><b>동선을 다시 짰어요 · 이동 ${d>=0?"−":"+"}${Math.abs(d)}분</b>이동 ${b.mv}분(${b.km.toFixed(1)}km) → ${a.mv}분(${a.km.toFixed(1)}km). 예약 시각과 여는 시각은 그대로 지켰어요.</p>
    <div class="acts"><button class="btn" data-opt="undo">되돌리기</button><button class="btn ink" data-opt="ok">좋아요</button></div></div>`;
}

const addTxt=x=>x.off?"휴무":x.tight?(x.add==null?"밀림":`+${x.add}분 · 밀림`):x.add==null?"":`+${x.add}분`;

/* ─────────────── 변경 ─────────────── */
function commit(msg){ if(OPTRES && OPTRES.prev && S.days[OPTRES.dk] && OPTRES.shown && S.days[OPTRES.dk].join("|")!==OPTRES.shown) OPTRES=null; if(OPTRES) OPTRES.shown=S.days[OPTRES.dk].join("|"); save(); render(); if(msg) toast(msg); }
function removeEverywhere(id){ EDIT.forEach(dk=>{ S.days[dk]=S.days[dk].filter(x=>x!==id); }); }
function moveTo(id,dk,idx){
  const p=place(id); if(!p) return;
  removeEverywhere(id);
  if(dk==="pool"){ delete S.pins[id]; commit(`${p.n} — 보관함으로 뺐어요`); return; }
  if(idx==null){ placeInto(id,dk); return; }   // 자리를 안 정했으면 가장 덜 돌아가는 자리에
  const list=S.days[dk];
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
  FITC=new Map();
  $$(".tab").forEach(t=>t.setAttribute("aria-selected", String(t.dataset.go===VIEW)));
  document.body.dataset.view=VIEW;
  if(picker.open && VIEW!=="board") picker.close();
  SORTS.forEach(s=>{ try{ s.destroy(); }catch(e){} }); SORTS=[];
  if(!(VIEW==="pool" && POOLMODE==="map") && !(VIEW==="board" && CUR!=="wed")) killXMap();
  if(VIEW!=="board") document.body.dataset.boardmap="0";
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
    ${(()=>{ const nx=cur?next:r; if(!nx) return ""; const a=nx.from||HOTEL;   // 다음 이정표: 지금 있는 곳에서 다음 역까지 가는 법
      return `<div class="lcdleg">${cur?`<p class="nx">다음 ${sta(N.dk,nx.i,"sm")} <b>${esc(nx.p.n)}</b> · ${fmt(nx.start)}</p>`:""}<div${legAttr(a,nx.p,nx.tr,true)}>${legBig(a,nx.p,nx.tr)}</div></div>`; })()}
    <div class="acts"><a class="btn go" href="${DIR(r.from||HOTEL,r.p)}" target="_blank" rel="noopener">${ico("i-route")}길찾기</a><button class="btn" data-big="${esc(r.id)}">${ico("i-zoom")}크게 보기</button>${VIEW==="board"?"":`<button class="btn" data-go="board" data-day="${N.dk}">일정</button>`}</div>
  </section>`;
}
/* ── 오늘(홈) = 그날 브리핑(2026-09-28 두 번째) ──
   Henry: "오늘 탭은 그날 필요한 정보: 예상 지출, 사전 지출, 지하철 이용 안내 등." (돈·지하철·시간 약속·날씨 넷 다 골랐다)
   여행 중엔 오늘, 여행 전엔 위 날짜 칩으로 아무 날이나(tokyo-brief). 여행 중 오늘이면 맨 위에 지금/다음(LCD). */
const SUBTIX={h24:1000, h48:1500, h72:2000};   // TRANSIT[1] 도쿄메트로 공식(도쿄 서브웨이 티켓)
const SUBLINE=/東京メトロ|都営|銀座線|丸ノ内線|日比谷線|東西線|千代田線|有楽町線|半蔵門線|南北線|副都心線|浅草線|三田線|新宿線|大江戸線/;
function briefDay(){ const N=tripNow(); if(N.phase==="during" && EDIT.includes(N.dk)) return N.dk; const b=LS.get("tokyo-brief","thu"); return EDIT.includes(b)?b:"thu"; }
function briefLegs(dk){
  const sc=schedule(dk), out=[];
  sc.rows.forEach(r=>{ if(r.tr.mode==="train" && r.tr.d>1.6) out.push({a:r.from||HOTEL, b:r.p, tr:r.tr, an:r.i?r.from.n:"숙소", bn:r.p.n}); });
  if(sc.rows.length && sc.back.mode==="train" && sc.back.d>1.6){ const l=sc.rows[sc.rows.length-1]; out.push({a:l.p, b:HOTEL, tr:sc.back, an:l.p.n, bn:"숙소", last:true}); }
  return out;
}
function briefFare(){
  const el=$("#bfare"); if(!el) return; const dk=el.dataset.day, legs=briefLegs(dk);
  const R=legs.map(l=>l.a.lat&&l.b.lat?RT.get(legKey(l.a,l.b)):null), got=R.filter(r=>r&&r.fare!=null);
  if(!legs.length){ el.innerHTML="이날은 전철을 안 타요(1.6km 안쪽은 걸어서)."; return; }
  if(!got.length){ el.innerHTML=LS.get("tokyo-rt-err","")?`교통비는 구글 Routes API를 켜면 계산돼요(도구 &gt; 교통).`:`교통비 계산 중…`; return; }
  const sum=got.reduce((a,r)=>a+r.fare,0), all=got.length===legs.length;
  const other=R.some(r=>r&&r.steps&&r.steps.some(t=>!t.w && !SUBLINE.test(t.name||t.line||"")));
  el.innerHTML=`전철 ${legs.length}번 · 교통비 ${all?"":"약 "}<b>${yen(sum)}</b>${all?"":` (${got.length}/${legs.length}구간)`} · ${sum>SUBTIX.h24?`도쿄 서브웨이 24시간권(${yen(SUBTIX.h24)})을 사면 <b>${yen(sum-SUBTIX.h24)} 아껴요</b>`:`낱장이 24시간권(${yen(SUBTIX.h24)})보다 ${yen(SUBTIX.h24-sum)} 싸요`}${other?" · JR·사철 구간은 서브웨이 티켓에 안 들어가요":""}`;
  const m=$("#bmoney-fare"); if(m) m.textContent=yen(sum)+(all?"":"+");
}
function clothes(f){
  if(!f) return `예보 전이에요. 11월 평년은 낮 ${NORMALS.hi}°, 밤 ${NORMALS.lo}°라 니트에 가벼운 겉옷, 밤엔 한 겹 더.`;
  const lo=f.lo, t=lo<8?"밤엔 코트나 얇은 패딩":lo<12?"니트에 가벼운 겉옷, 밤엔 한 겹 더":"얇은 겉옷이면 충분";
  return `${esc(WMO(f.c))} ${Math.round(f.hi)}°/${Math.round(f.lo)}° · ${t}${f.rain>=50?` · 비 ${f.rain}% — 우산 챙기기`:""}`;
}
function renderHome(){
  const dd=dday(), N=tripNow(), dk=briefDay(), sc=schedule(dk), today=N.phase==="during" && N.dk===dk;
  const rows=sc.rows, V=spendGet(), W=wxDays().find(x=>x.k===dk), T=dayTrains(dk);
  // 돈: 이 날 역의 예약 결제(이미 냄) / 현장에서 낼 입장료·식사(출처 있는 fee) / 값 모름 / 현금
  const paidQ=new Map(CHECKS.filter(c=>c.q && c.id in V.paid).map(c=>[c.q,{c,amt:+V.paid[c.id]}]));
  const inDay=rows.map(r=>r.p);
  const paid=inDay.filter(p=>paidQ.has(p.id)).map(p=>({p, amt:paidQ.get(p.id).amt}));
  const onsite=inDay.filter(p=>!paidQ.has(p.id) && typeof p.fee==="number" && p.fee>0);
  const unknown=inDay.filter(p=>!paidQ.has(p.id) && typeof p.fee!=="number" && ["food","bar","art","view"].includes(p.kc) && !p.outside);
  const cash=inDay.filter(p=>p.cash);
  const logged=V.log.filter(x=>x.day===dk), logSum=spendSum(logged);
  const onsum=onsite.reduce((a,p)=>a+p.fee,0);
  // 시간 약속: 고정 시각·예약·마감 경고·노을
  const CK=new Map(CHECKS.filter(c=>c.q).map(c=>[c.q,c]));
  const appts=rows.filter(r=>r.pin || CK.has(r.id) || r.warn.length);
  const legs=briefLegs(dk);
  const lastR=rows[rows.length-1], lastFar=lastR&&lastR.p.lat?km(lastR.p,HOTEL):null;
  main.innerHTML=`<div class="wrap">${newsHTML()}
    <section class="hero bh0"><p class="hero-date num">${N.phase==="before"?`D-${dd}`:N.phase==="during"?`${DAYKEYS.indexOf(N.dk)+1}일차`:"11.18—22"}</p>
      <h1 class="hero-t">${WDK[dk]}요일 ${DAY[dk].dt} ${today?"오늘":"브리핑"}</h1>
      <p class="hero-s">${esc(REGION[dk].n)} · ${esc(REGION[dk].sub)}${rows.length?` · ${rows.length}역 ${fmt(sc.depart)}–${fmt(sc.home)}`:""}</p></section>
    ${N.phase==="during"?"":`<div class="chips bchips">${EDIT.map(k=>`<button class="chip line" data-brief="${k}" aria-pressed="${k===dk}" style="--c:${LINE[k].c}">${lsym(k,"sm")}${WDK[k]} ${DAY[k].dt.split(".")[1]}</button>`).join("")}</div>`}
    ${today?lcdHTML():""}
    <section class="bcard"><h2>${ico("i-tool")}오늘의 돈</h2>
      <div class="bm"><div><span>이미 낸 돈</span><b>${yen(paid.reduce((a,x)=>a+x.amt,0))}</b><small>예약 결제 ${paid.length}곳</small></div>
        <div><span>이날 쓸 돈(예상)</span><b>${yen(onsum)} + <i id="bmoney-fare">교통비</i></b><small>현장 입장료·식사 ${onsite.length}곳${unknown.length?` · 값 모름 ${unknown.length}곳`:""}</small></div></div>
      <ul class="bl">${paid.map(x=>`<li><span>${esc(x.p.n)} <em>결제함</em></span><b>${yen(x.amt)}</b></li>`).join("")}
        ${onsite.map(p=>`<li><span>${esc(p.n)}${p.feeNote?` <em>${esc(p.feeNote)}</em>`:""}</span><b>${yen(p.fee)}</b></li>`).join("")}
        ${unknown.map(p=>`<li class="mu"><span>${esc(p.n)}</span><b>값 모름</b></li>`).join("")}</ul>
      ${cash.length?`<p class="warnline">${ico("i-check")}현금 챙기기: ${cash.map(p=>esc(p.n)).join(", ")}</p>`:""}
      ${logged.length?`<p class="src">이날 적은 지출 ${sumTxt(logSum)} · <a href="#" data-go="tools" data-open="spend">장부</a></p>`:`<p class="src">쓴 돈은 <a href="#" data-go="tools" data-open="spend">도구 &gt; 지출 장부</a>에 적어요. 예약 결제는 도구 &gt; 예약 체크의 "결제함".</p>`}</section>
    <section class="bcard"><h2>${ico("i-train")}지하철</h2>
      <p class="bf" id="bfare" data-day="${dk}"></p>
      ${legs.length?`<ol class="bleg">${legs.map(l=>`<li><p class="bh2"><b>${esc(l.an)}</b> → <b>${esc(l.bn)}</b></p><p class="mv"${legAttr(l.a,l.b,l.tr)}>${legText(l.a,l.b,l.tr,false)}</p></li>`).join("")}</ol>`:""}
      <p class="src">${lastFar==null?"":lastFar<=0.6?`밤엔 ${esc(lastR.p.n)}에서 숙소까지 걸어서 들어와요. 막차 걱정 없어요.`:`마지막 구간 ${esc(lastR.p.n)} → 숙소는 전철이에요. 막차 시각은 역에서 확인하세요.`} 걷는 거리 ${T.walk.toFixed(1)}km.</p></section>
    <section class="bcard"><h2>${ico("i-lock")}시간 약속</h2>
      <ul class="bl">${rows.length?`<li><span>숙소 출발</span><b>${fmt(sc.depart)}</b></li>`:""}
        ${appts.map(r=>{ const c=CK.get(r.id); return `<li${r.warn.some(w=>w.lv==="bad")?' class="bad"':""}><span>${esc(r.p.n)}${c?` <em>${CHECKED[c.id]?"예약 완료":"예약 전"} · ${esc(c.d)}</em>`:""}${r.warn.length?` <em class="w">${r.warn.map(w=>esc(w.t)).join(" · ")}</em>`:""}</span><b>${fmt(r.start)}</b></li>`; }).join("")}
        <li><span>해 지는 시각</span><b>${fmt(sunset(DAY[dk].date))}</b></li>
        ${rows.length?`<li><span>숙소 도착</span><b>${fmt(sc.home)}</b></li>`:""}</ul></section>
    <section class="bcard"><h2>${ico("i-sun")}날씨·옷차림</h2>
      <p>${clothes(W&&W.f)}</p>${rainHTML(dk)?`<p class="warnline">${ico("i-rain")}비 대안이 있어요 · <a href="#" data-go="board" data-day="${dk}">일정에서 보기</a></p>`:""}</section>
    ${N.phase==="before"?`<section class="bcard"><h2>${ico("i-check")}출발 전 할 일</h2><ul class="bl">${checksNow().filter(c=>!CHECKED[c.id]).map(c=>`<li><span>${esc(c.t)} <em>${esc(c.d)}</em></span><b>예약 전</b></li>`).join("")||`<li><span>예약 모두 끝</span><b>✓</b></li>`}
      ${LS.get("tokyo-pre-at","")?"":`<li><span>오프라인 준비(지도·사진 미리 받기)</span><b>전</b></li>`}</ul><p class="src"><a href="#" data-go="tools" data-open="resv">도구 &gt; 예약 체크</a></p></section>`:""}
    <p class="src" style="margin:22px 0 20px">예산·교통·공항·날씨 전체는 도구에 있어요.</p>
  </div>`;
  $$("[data-brief]").forEach(b=>b.addEventListener("click",()=>{ LS.set("tokyo-brief",b.dataset.brief); render(); window.scrollTo({top:0}); }));
  briefFare(); legFill(dk);
  wxFetch();
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
    <p class="mv"${legAttr(r.from||HOTEL,r.p,r.tr)}>${legText(r.from||HOTEL,r.p,r.tr,r.i===0)}${r.wait>=10?` · <span class="wait">${r.wait}분 여유</span>`:""}</p>
    <div class="row" role="button" tabindex="0" data-open="${esc(r.id)}" aria-label="${c.l}${c.n} ${esc(p.n)} ${fmt(r.start)}">
      <span class="t"><b>${fmt(r.start)}</b><i>${c.l}${c.n}</i></span>
      <span class="dot" aria-hidden="true"></span>
      <span class="b"><span class="n">${esc(p.n)}</span><span class="m">${meta.join(" · ")}</span>${r.warn.length?`<span class="w">${r.warn.map(w=>esc(w.t)).join(" · ")}</span>`:""}</span>
      ${P&&P.photo?`<img class="th" src="${esc(P.photo)}" data-pid="${esc(r.id)}" alt="" loading="lazy">`:""}
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
    <p class="src">공항에서 숙소까지 가는 법과 막차는 <a href="#" data-go="tools" data-open="air">도구 &gt; 공항</a>에 있어요.</p>`;
}
function dswHTML(){
  return `<nav class="dsw" aria-label="날짜 노선"><div class="wrap" role="tablist">${DAYKEYS.map(dk=>`<div class="dt" role="tab" tabindex="0" data-day="${dk}" style="--c:${LINE[dk].c}" aria-selected="${dk===CUR}" aria-label="${WDK[dk]}요일 ${LINE[dk].code} 노선">
      ${lsym(dk,"sm")}<span class="d">${WDK[dk]} ${DAY[dk].dt.split(".")[1]}</span>${EDIT.includes(dk)?`<ul class="drop" data-day="${dk}" aria-hidden="true"></ul>`:""}</div>`).join("")}</div></nav>`;
}
/* ── 일정 = 한 지도(2026-09-28 세 번째) ──
   날짜 칩(목·금·토·일·전체)과 컨셉 칩 두 줄. 날을 고르면 그날 노선을 굵게·다른 날은 흐리게, 컨셉 칩(XCF)으로 안 넣은 곳을 후보 핀으로.
   "전체"(MAPALL)면 예전 장소 지도처럼 네 날 노선과 모든 곳(XF.c로 거름). 아래 사진 카드와 패널(renderPanel)은 두 경우 모두. 수요일은 목록 화면. */
// 안 넣은 곳 핀 색 = 컨셉 색(노선 색 주황·하늘·보라·빨강·남색은 피한다). 넣으면 그날 노선 색 원+번호로 바뀐다(2026-09-28 Henry)
const KCOL={art:"#D9468F",photo:"#D9468F",book:"#8B5A2B",bar:"#222222",food:"#2E9D57",market:"#2E9D57",leaf:"#0F7B6C",view:"#0F7B6C"};
const XCOL={art:"#D9468F",book:"#8B5A2B",bar:"#222222",food:"#2E9D57",walk:"#0F7B6C"};
const kcol=p=>KCOL[p.kc]||"#5E6B78";
let XCF="near";
let MAPALL=LS.get("tokyo-lines-mapall","0")==="1", MC=LS.get("tokyo-lines-mc",""), MAPFIT=false;
const XCFS=[["near","근처 후보","i-map"],["star","찜","i-star"],["found","새로 발견","i-compass"],["art","미술관·건축","i-art"],["book","서점","i-book"],["bar","LP바","i-record"],["food","먹고 마시기","i-food"],["walk","단풍·전망","i-leaf"]];
function planCands(){
  if(!XCF || CUR==="wed") return [];
  if(XCF==="near") return xCands(CUR);
  const placed=new Set(EDIT.flatMap(k=>S.days[k])), c=XC.find(x=>x.k===XCF);
  return [...CAT.values(),...Object.values(S.added)].filter(p=>p.lat && !p.gone && !placed.has(p.id)
    && (XCF==="star"?S.star[p.id]:XCF==="found"?p.found:(c&&c.kc||[]).includes(p.kc))).slice(0,80);
}
function setMapDay(k){
  const c=$("#xcards"); XSEL=null; MAPFIT=true;
  if(k==="all"){ MAPALL=true; } else { MAPALL=false; CUR=k; LS.set("tokyo-lines-day",k); }
  LS.set("tokyo-lines-mapall",MAPALL?"1":"0"); render();
}
function mapTop(){
  const dk=CUR, day=!MAPALL;
  const dates=`<div class="chips xrow">${EDIT.map(k=>`<button class="chip line" data-mday="${k}" aria-pressed="${day&&k===dk}" style="--c:${LINE[k].c}">${lsym(k,"sm")}${WDK[k]} ${DAY[k].dt.split(".")[1]}</button>`).join("")}<button class="chip" data-mday="all" aria-pressed="${MAPALL}">${ico("i-network")}전체</button><button class="chip" data-mday="wed">${lsym("wed","sm")}수 도착</button></div>`;
  const cnt=k=>{ if(day){ const s0=XCF; XCF=k===""?"near":k; const v=planCands().length; XCF=s0; return v; }
    const s0=XF.c; XF.c=k===""?"all":k; const v=xItems().length; XF.c=s0; return v; };
  const cons=`<div class="chips xrow">${[["",day?"근처 후보":"모든 곳","i-map"],...XCFS.slice(1)].map(([k,n,i])=>`<button class="chip" data-mc="${k}" aria-pressed="${MC===k}"${XCOL[k]?` style="--k:${XCOL[k]}"`:""}>${ico(i)}${n} <b>${cnt(k)}</b></button>`).join("")}${day?`<button class="chip" data-mc="none" aria-pressed="${MC==="none"}">후보 끄기</button>`:""}<button class="chip" data-go="pool">${ico("i-line")}목록·검색</button></div>`;
  let sum="";
  if(day){ const sc=schedule(dk), n=sc.rows.length, pts=[HOTEL,...sc.rows.map(r=>r.p),HOTEL];
    const st = sc.bad ? `<span class="bad">확인 ${sc.bad}</span>` : sc.warns ? `<span class="warn">주의 ${sc.warns}</span>` : n ? `<span class="ok">문제 없음</span>` : "";
    sum=`<div class="xsum"><b>${WDK[dk]} ${esc(REGION[dk].n)}</b><span>${n}역 · ${n?`${fmt(sc.depart)}–${fmt(sc.home)} · ${sc.dist.toFixed(1)}km · `:""}${st}</span><span class="xsl">${n?`<a class="lk" href="${DAYDIR(pts)}" target="_blank" rel="noopener">${ico("i-route")}구글 동선</a>`:""}</span></div>`; }
  return dates+cons+sum+gStatHTML();
}
function renderBoard(){
  if(CUR==="wed"){ document.body.dataset.boardmap="0"; main.innerHTML=`${dswHTML()}<div class="wrap">${newsHTML()}${wedHTML()}</div>`;
    $$(".dt").forEach(b=>b.addEventListener("click",e=>{ if(e.target.closest(".drop li")) return; CUR=b.dataset.day; LS.set("tokyo-lines-day",CUR); MAPALL=false; LS.set("tokyo-lines-mapall","0"); MAPFIT=true; render(); window.scrollTo({top:0}); }));
    return; }
  XCF = MC==="none" ? "" : (MC||"near");
  if(MAPALL) XF={c:(MC&&MC!=="none")?MC:"all", a:"all"};
  renderMapView(MAPALL?"explore":"route");
}

/* ── 장소 추가: 휴대폰은 시트, 넓은 화면은 오른쪽 패널(끌어서 넣기) ── */
let DF=LS.get("tokyo-lines-df","area");
const wide=()=>matchMedia("(min-width: 980px)").matches;
function poolItems(scope){
  const placed=new Set(EDIT.flatMap(dk=>S.days[dk]));
  const all=[...CAT.values(), ...Object.values(S.added)].filter(p=>!placed.has(p.id) && !p.gone);
  if(scope==="area") return all.filter(p=>areaOf(p)===CUR);
  if(scope==="star") return all.filter(p=>S.star[p.id]);
  if(scope==="hotel") return all.filter(p=>areaOf(p)==="hotel");
  const m=MOOD.find(x=>x.k===scope); if(m) return all.filter(p=>m.kc.includes(p.kc));
  return all;
}
function pkHTML(p){
  const d=fit(p,CUR), t=addTxt(d);
  return `<li class="pk" data-id="${esc(p.id)}"><span class="pi">${ico((KIND[p.kc]||KIND.view).i)}</span>
    <span class="pb" role="button" tabindex="0" data-open="${esc(p.id)}"><span class="n">${S.star[p.id]?`<span class="star">${ico("i-star","ki mi")}</span>`:""}${esc(p.n)}</span><span class="m">${esc(AREANAME[areaOf(p)]||"")} · ${esc(p.k||"")}${t?` · <span class="${d.off?"bad":d.tight?"warn":d.add<=10?"ok":""}">${WDK[CUR]} ${t}</span>`:""}</span></span>
    <button class="add" data-add="${esc(p.id)}">넣기</button></li>`;
}
function detourKey(p){ const d=fit(p,CUR); return (d.off?1e5:0)+d.cost; }
function pickerBody(){
  const scopes=[["area",AREANAME[CUR]||"이 동네"],["star","찜"],["hotel","숙소 근처"],...MOOD.map(m=>[m.k,m.n]),["all","전체"]];
  if(!scopes.some(s=>s[0]===DF)) DF="area";
  const items=poolItems(DF).map(p=>[p,detourKey(p)]).sort((a,b)=>(!!S.star[b[0].id]-!!S.star[a[0].id])||(a[1]-b[1])||a[0].n.localeCompare(b[0].n,"ko")).map(x=>x[0]);
  return `<div class="chips pkf">${scopes.map(([k,n])=>`<button class="chip" data-df="${k}" aria-pressed="${k===DF}">${esc(n)} <b>${poolItems(k).length}</b></button>`).join("")}</div>
    <ul class="pool" id="pool">${items.map(pkHTML).join("")||`<li class="src" style="padding:16px 0">여기엔 남은 곳이 없어요. '전체'를 눌러 보세요.</li>`}</ul>`;
}
function renderSide(){
  if(VIEW==="board" && CUR!=="wed" && $("#xp")) return;   // 일정 지도는 xUpdate → renderPanel이 그린다
  const side=$("#side"); side.hidden=true; document.body.classList.remove("withside");
}
/* ── 일정 지도의 패널(2026-09-28 세 번째) ──
   Henry: "일정에서 목록과 지도를 함께 보며 조정하는 것과, 지도에서 전체 목록·일정을 함께 보는 기능을 합치라는 거였어."
   넓은 화면은 오른쪽 패널(#side), 폰은 "목록"을 누르면 반 화면 시트(#xsheet). 날을 고르면 그날 노선(⠿ 끌어 순서·× 빼기·구간 교통·출발 시각·최적화)과
   후보(⠿ 노선으로 끌기·넣기), "전체"면 닷새 노선 넷(날 사이로 끌어 옮기기)과 보관함(날짜로 끌기·가장 좋은 날에 넣기). */
let PSORTS=[], XSHEET=false;
const rowWarn=r=>r.warn.length?`<small class="${r.warn.some(w=>w.lv==="bad")?"bad":"warn"}">${esc(r.warn.map(w=>w.t).join(" · "))}</small>`:"";
function routeSideHTML(){
  const dk=CUR, sc=schedule(dk), n=sc.rows.length, N=tripNow();
  const rows=sc.rows.map(r=>`<li class="rs${XSEL===r.id?" on":""}" data-id="${esc(r.id)}"><span class="h" aria-label="끌어서 순서 바꾸기">⠿</span>${sta(dk,r.i,"sm")}
    <button class="rb" data-xsel="${esc(r.id)}"><b>${esc(r.p.n)}</b><small>${fmt(r.start)}–${fmt(r.end)} · ${r.dur}분${r.pin?` · 고정 ${esc(r.pin)}`:""}</small>
      <span class="mv2"${legAttr(r.from||HOTEL,r.p,r.tr)}>${legText(r.from||HOTEL,r.p,r.tr,r.i===0)}</span>${rowWarn(r)}</button>
    <button class="rx" data-xout="${esc(r.id)}" aria-label="${esc(r.p.n)} 빼기">${ico("i-x")}</button></li>`).join("");
  const C=planCands().map(p=>({p, f:Object.assign({dk}, fit(p,dk))})).sort((a,b)=>(a.f.off-b.f.off)||(a.f.cost-b.f.cost)).slice(0,25);
  const cands=C.map(({p,f})=>`<li class="rs cand${XSEL===p.id?" on":""}" data-id="${esc(p.id)}"><span class="h" aria-label="노선으로 끌기">⠿</span><span class="pi" style="--k:${kcol(p)}">${ico((KIND[p.kc]||KIND.view).i)}</span>
      <button class="rb" data-xsel="${esc(p.id)}"><b>${S.star[p.id]?"★ ":""}${esc(p.n)}</b><small>${esc(p.k||(KIND[p.kc]||KIND.view).n)}${addTxt(f)?` · ${esc(addTxt(f))}`:""}</small></button>
      ${f.off?`<span class="rs-off">휴무</span>`:`<button class="add" data-xput="${esc(p.id)}" data-day="${dk}">넣기</button>`}</li>`).join("");
  const last=n?sc.rows[n-1]:null, cn=(XCFS.find(x=>x[0]===XCF)||["","후보"])[1];
  return `${N.phase==="during"&&N.dk===dk?lcdHTML():""}${optHTML()}
    <div class="side-h"><b>${WDK[dk]}요일 노선</b><span>⠿ 끌어서 순서 · × 빼기</span></div>
    <div class="rtools"><label class="dep2">숙소 출발 <input type="time" id="depart2" value="${hhmm(fmt(sc.depart))}"></label>${n?`<button class="lk" id="optbtn2">${ico("i-route")}동선 최적화</button>`:""}<button class="lk" id="addst2">${ico("i-plus")}장소 추가</button></div>
    ${rainHTML(dk)}
    <ol class="rsl" id="rsl">${rows||`<li class="src empty">비어 있어요. 아래 후보를 끌어 오거나 넣어 보세요.</li>`}</ol>
    ${last?`<p class="rsend"><span class="mv2"${legAttr(last.p,HOTEL,sc.back)}>${legText(last.p,HOTEL,sc.back,false)}</span><b>${fmt(sc.home)} 숙소 도착</b></p>`:""}
    ${XCF?`<div class="side-h sub"><b>${esc(cn)}</b><span>⠿ 노선으로 끌거나 넣기</span></div><ul class="rsl" id="rcand">${cands||`<li class="src empty">남은 곳이 없어요.</li>`}</ul>`:""}`;
}
function overviewHTML(){
  const days=EDIT.map(dk=>{ const sc=schedule(dk);
    return `<div class="ovd"><p class="ovh">${lsym(dk,"sm")}<b>${WDK[dk]} ${DAY[dk].dt}</b><span>${sc.rows.length}역${sc.rows.length?` · ${fmt(sc.depart)}–${fmt(sc.home)}`:""}${sc.bad?` · <em class="bad">확인 ${sc.bad}</em>`:""}</span><button class="lk" data-mday="${dk}">이날 지도</button></p>
      <ol class="rsl ovday" data-day="${dk}">${sc.rows.map(r=>`<li class="rs${XSEL===r.id?" on":""}" data-id="${esc(r.id)}"><span class="h" aria-label="끌어서 옮기기">⠿</span>${sta(dk,r.i,"sm")}
        <button class="rb" data-xsel="${esc(r.id)}"><b>${esc(r.p.n)}</b><small>${fmt(r.start)}</small>${rowWarn(r)}</button><button class="rx" data-xout="${esc(r.id)}" aria-label="${esc(r.p.n)} 빼기">${ico("i-x")}</button></li>`).join("")}</ol></div>`; }).join("");
  const placed=new Set(EDIT.flatMap(k=>S.days[k])), c=XC.find(x=>x.k===XF.c)||XC[0];
  const pool=[...CAT.values(),...Object.values(S.added)].filter(p=>p.lat && !p.gone && !placed.has(p.id) && (c.k==="all"||(c.k==="star"?S.star[p.id]:c.k==="found"?p.found:c.kc.includes(p.kc))))
    .sort((a,b)=>(!!S.star[b.id]-!!S.star[a.id])||a.n.localeCompare(b.n,"ko")).slice(0,60);
  const prow=p=>{ const sp=spots(p)[0]; return `<li class="rs cand${XSEL===p.id?" on":""}" data-id="${esc(p.id)}"><span class="h" aria-label="날짜로 끌기">⠿</span><span class="pi" style="--k:${kcol(p)}">${ico((KIND[p.kc]||KIND.view).i)}</span>
      <button class="rb" data-xsel="${esc(p.id)}"><b>${S.star[p.id]?"★ ":""}${esc(p.n)}</b><small>${esc(AREANAME[areaOf(p)]||"")}${sp&&!sp.off&&addTxt(sp)?` · ${WDK[sp.dk]} ${esc(addTxt(sp))}`:""}</small></button>
      ${sp&&!sp.off?`<button class="add" data-xput="${esc(p.id)}" data-day="${sp.dk}">${WDK[sp.dk]}에 넣기</button>`:""}</li>`; };
  return `<div class="side-h"><b>닷새 노선</b><span>⠿ 끌어서 날짜·순서 바꾸기</span></div>${days}
    <div class="side-h sub"><b>보관함${c.k==="all"?"":` · ${esc(c.n)}`}</b><span>⠿ 날짜로 끌거나 넣기</span></div><ul class="rsl" id="ovpool">${pool.map(prow).join("")||`<li class="src empty">남은 곳이 없어요.</li>`}</ul>`;
}
function renderPanel(){
  PSORTS.forEach(x=>{ try{ x.destroy(); }catch(e){} }); PSORTS=[];
  const side=$("#side"), sh=$("#xsheet"), xp=$("#xp"), on=VIEW==="board" && CUR!=="wed" && !!xp, w=wide();
  const was=document.body.classList.contains("withside");
  side.hidden=!(on&&w); document.body.classList.toggle("withside",!!(on&&w));
  if(sh){ sh.hidden=!(on&&!w&&XSHEET); xp.classList.toggle("sheet",!!(on&&!w&&XSHEET)); }
  const lb=$("#xlist"); if(lb) lb.textContent=XSHEET?"지도만":"목록";
  if(XMAP && was!==(on&&w)) requestAnimationFrame(()=>{ if(XMAP) XMAP.invalidateSize(); });
  const host=on?(w?side:(XSHEET?sh:null)):null; if(!host) return;
  const top=host.scrollTop; host.innerHTML=(w?"":`<p class="sh-grab" aria-hidden="true"></p>`)+(MAPALL?overviewHTML():routeSideHTML()); host.scrollTop=top;
  wirePanel(host); legFill(MAPALL?null:CUR);
}
function wirePanel(host){
  $$("[data-xsel]",host).forEach(b=>b.addEventListener("click",()=>xSelect(b.dataset.xsel,true)));
  $$("[data-xout]",host).forEach(b=>b.addEventListener("click",()=>mapOut(b.dataset.xout)));
  $$("[data-xput]",host).forEach(b=>b.addEventListener("click",()=>mapPut(b.dataset.xput,b.dataset.day)));
  $$("[data-mday]",host).forEach(b=>b.addEventListener("click",()=>setMapDay(b.dataset.mday)));
  $$("[data-rainswap]",host).forEach(b=>b.addEventListener("click",()=>rainSwap(b.dataset.rainswap,b.dataset.to)));
  const dep=$("#depart2",host); if(dep) dep.addEventListener("change",()=>{ const t=dep.value.replace(/^0(\d)/,"$1"); if(isNaN(toMin(t))) return; S.start[CUR]=t; commit(`숙소 출발 ${t}`); });
  const ob=$("#optbtn2",host); if(ob) ob.addEventListener("click",()=>runOptimize(CUR));
  const ad=$("#addst2",host); if(ad) ad.addEventListener("click",()=>openPicker());
  if(!window.Sortable) return;
  const common={handle:".h", draggable:"li[data-id]", animation:160, ghostClass:"ghost", chosenClass:"chosen", fallbackOnBody:true, forceFallback:true, fallbackTolerance:3, scroll:true, scrollSensitivity:90, scrollSpeed:22, bubbleScroll:true};
  const undo=snap=>()=>{ S.days=snap.days; S.pins=snap.pins; commit("되돌렸어요"); };
  if(!MAPALL){
    const snap=daySnap();
    const dayDrop=e=>{ if(!e.to || e.to.id!=="rsl") return; if(e.from===e.to && e.oldIndex===e.newIndex) return;
      const ids=$$(":scope > li[data-id]",e.to).map(x=>x.dataset.id); ids.forEach(id=>{ if(!S.days[CUR].includes(id)) removeEverywhere(id); }); S.days[CUR]=ids;
      setTimeout(()=>{ commit(); toastUndo("노선을 바꿨어요",undo(snap)); },0); };
    const rsl=$("#rsl",host), rc=$("#rcand",host);
    if(rsl) PSORTS.push(Sortable.create(rsl,Object.assign({},common,{group:{name:"rt",pull:false,put:true}, onEnd:dayDrop})));
    if(rc) PSORTS.push(Sortable.create(rc,Object.assign({},common,{group:{name:"rt",pull:true,put:false}, sort:false, onEnd:dayDrop})));
  } else {
    const snap=daySnap();
    const ovDrop=e=>{ if(!e.to || e.to.id==="ovpool") return; if(e.from===e.to && e.oldIndex===e.newIndex) return;
      EDIT.forEach(dk=>{ const ol=$(`.ovday[data-day="${dk}"]`,host); if(ol) S.days[dk]=$$(":scope > li[data-id]",ol).map(x=>x.dataset.id); });
      setTimeout(()=>{ commit(); toastUndo("노선을 바꿨어요",undo(snap)); },0); };
    $$(".ovday",host).forEach(ol=>PSORTS.push(Sortable.create(ol,Object.assign({},common,{group:{name:"ov",pull:true,put:true}, onEnd:ovDrop}))));
    const pl=$("#ovpool",host); if(pl) PSORTS.push(Sortable.create(pl,Object.assign({},common,{group:{name:"ov",pull:true,put:false}, sort:false, onEnd:ovDrop})));
  }
}
const picker=$("#picker");
function openPicker(){
  if(CUR==="wed") return;
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
function renderPoolList(){
  const placed=new Set(EDIT.flatMap(dk=>S.days[dk]));
  const all=[...CAT.values(), ...Object.values(S.added)];
  const areas=[["all","전체"],...EDIT.map(dk=>[dk,`${WDK[dk]} · ${AREANAME[dk]}`]),["hotel","숙소 근처"],["far","먼 곳"]];
  const moods=[["all","모든 종류"],...MOOD.map(m=>[m.k,m.n])];
  const stats=[["left","아직 안 넣은 곳"],["star","찜"],["in","노선에 있는 곳"],["all","전부"]];
  const f=all.filter(p=>(!p.gone||placed.has(p.id)) && (PF.a==="all"||areaOf(p)===PF.a) && (PF.m==="all"||MOOD.find(m=>m.k===PF.m).kc.includes(p.kc))
    && (PF.s==="all"||(PF.s==="left"&&!placed.has(p.id))||(PF.s==="in"&&placed.has(p.id))||(PF.s==="star"&&S.star[p.id])))
    .sort((a,b)=>(!!S.star[b.id]-!!S.star[a.id])||(EDIT.indexOf(areaOf(a))-EDIT.indexOf(areaOf(b)))||a.n.localeCompare(b.n,"ko"));
  const key=LS.get("tokyo-gkey","");
  const chips=(arr,k)=>`<div class="chips" style="margin-top:8px">${arr.map(([v,n])=>`<button class="chip" data-pf="${k}" data-v="${v}" aria-pressed="${PF[k]===v}">${esc(n)}</button>`).join("")}</div>`;
  main.innerHTML=`<div class="wrap">
    <section class="hero"><p class="hero-date num">${all.length}<span> places</span></p><h1 class="hero-t">모든 장소</h1>
      <p class="hero-s">인스타·구글 지도에서 모은 곳, 추천, 지나가며 볼 건물까지 전부예요. ☆로 찜해 두면 장소 추가 목록 맨 위에 와요.</p>
      <div class="acts" style="margin-top:12px"><button class="btn ink" data-go="board">${ico("i-map")}일정 지도로 돌아가기</button></div></section>
    ${chips(stats,"s")}${chips(areas,"a")}${chips(moods,"m")}
    <form class="search" id="search"><label class="sr" for="sq">장소 찾아 담기</label><input id="sq" name="q" type="search" placeholder="${key?"구글에서 장소 찾아 담기":"장소 이름 (키가 있으면 구글에서 찾아요)"}" autocomplete="off"><button class="btn ink" type="submit">${key?"찾기":"담기"}</button></form>
    <ul class="res" id="res" hidden></ul>
    <ul class="pgrid">${f.map(p=>tileHTML(p,placed)).join("")||`<li class="src">조건에 맞는 곳이 없어요.</li>`}</ul>
    <p class="src" style="margin:20px 0">${f.length}곳 · 사진은 도구 > 구글 장소 정보를 받으면 나와요.</p></div>`;
  $$("[data-pf]").forEach(b=>b.addEventListener("click",()=>{ PF[b.dataset.pf]=b.dataset.v; LS.set("tokyo-lines-pf",JSON.stringify(PF)); renderPoolList(); }));
  $$("button[data-pm]",main).forEach(b=>b.addEventListener("click",()=>setPM(b.dataset.pm)));
  $("#search").addEventListener("submit",onSearch);
}

/* ─────────────── 지도 탭 ───────────────
   Henry: "지도가 있고, 컨셉을 누르면 그 컨셉만, 지역을 누르면 그 지역만 쫙 보여야 해."
   컨셉 칩 × 지역 칩으로 거른 곳만 핀으로 찍고, 아래엔 사진 카드. 지역 칩은 곧 그날 노선이라
   날을 고르면 그날 역 순서와 시각이, 아직 안 넣은 곳엔 "그날에 넣기 +N분"이 붙는다.
   지도는 한 번만 만들고 칩을 바꿀 때는 핀·카드만 다시 그린다. */
const XC=[{k:"all",n:"전체"},{k:"star",n:"찜",i:"i-star"},{k:"found",n:"새로 발견",i:"i-compass"},{k:"art",n:"미술관·건축",i:"i-art",kc:["art","photo"]},{k:"book",n:"서점·북카페",i:"i-book",kc:["book"]},
  {k:"bar",n:"LP바",i:"i-record",kc:["bar"]},{k:"food",n:"먹고 마시기",i:"i-food",kc:["food","market"]},{k:"walk",n:"단풍·전망",i:"i-leaf",kc:["leaf","view"]}];
const XA=["all",...EDIT,"hotel","far"];
let XF=(()=>{ try{ return Object.assign({c:"all",a:"all"},JSON.parse(LS.get("tokyo-lines-xf","{}"))); }catch(e){ return {c:"all",a:"all"}; } })();
let POOLMODE=LS.get("tokyo-lines-pm","map");
let XMAP=null, XLAY=null, XMK=new Map(), XSEL=null, XME=null, XMEMK=null;
function setPM(m){ POOLMODE=m; LS.set("tokyo-lines-pm",m); render(); window.scrollTo({top:0}); }
function renderPool(){ POOLMODE="list";   // 2026-09-28 장소 탭을 일정 지도에 합쳐서, 여기는 전체 목록·검색만(지도 칩 "전체 목록·검색"에서 온다)
  document.body.dataset.poolmode=POOLMODE; if(POOLMODE==="list"){ killXMap(); renderPoolList(); } else renderExplore(); }
function killXMap(){ if(XMAP){ try{ XMAP.remove(); }catch(e){} XMAP=null; XLAY=null; XMK=new Map(); XMEMK=null; } }
const kfmt=n=>n>=1000?(n/1000).toFixed(1).replace(/\.0$/,"")+"천":String(n||0);
function xItems(){
  if(XMODE==="plan") return S.days[CUR].map(place).filter(p=>p&&p.lat).concat(planCands());
  if(XMODE==="route") return S.days[CUR].map(place).filter(p=>p&&p.lat).concat(planCands());
  const placed=new Set(EDIT.flatMap(dk=>S.days[dk])), c=XC.find(x=>x.k===XF.c)||XC[0], a=XF.a;
  return [...CAT.values(), ...Object.values(S.added)].filter(p=>p.lat && (!p.gone||placed.has(p.id))
    && (c.k==="all" || (c.k==="star" ? S.star[p.id] : c.k==="found" ? p.found : c.kc.includes(p.kc)))
    && (a==="all" || (EDIT.includes(a) ? (placed.has(p.id) ? dayOf(p.id)===a : areaOf(p)===a) : areaOf(p)===a)));
}
function xInfo(items){   // 카드 순서와 붙일 말: 역이면 시각, 아니면 넣을 날 +N분(또는 내 위치에서 거리)
  const rows={}; EDIT.forEach(dk=>{ rows[dk]=new Map(schedule(dk).rows.map(r=>[r.id,r])); });
  const one=EDIT.includes(XF.a)?XF.a:null;
  if(XMODE==="route" || XMODE==="plan"){
    const st=items.filter(p=>rows[CUR].has(p.id)).map(p=>({p, dk:CUR, r:rows[CUR].get(p.id), sp:null, far:null})).sort((a,b)=>a.r.i-b.r.i);
    const cd=items.filter(p=>!rows[CUR].has(p.id)).map(p=>({p, dk:null, r:null, sp:Object.assign({dk:CUR}, fit(p,CUR)), far:null, cand:true})).sort((a,b)=>(a.sp.off-b.sp.off)||(a.sp.cost-b.sp.cost));
    return st.concat(cd); }
  const L=items.map(p=>{ const dk=dayOf(p.id), r=dk?rows[dk].get(p.id):null;
    const sp=dk?null:(one?Object.assign({dk:one}, fit(p,one)):spots(p)[0]);
    const far=XME?km(XME,p):null;
    return {p, dk, r, sp, far}; });
  const ord=x=>x.dk ? EDIT.indexOf(x.dk)*1000+x.r.i : 1e5+(x.sp.off?1e5:0)+x.sp.cost;
  if(XME) L.sort((a,b)=>a.far-b.far); else L.sort((a,b)=>ord(a)-ord(b));
  return L;
}
function xPin(x,sel){
  const {p,dk,r}=x, star=S.star[p.id];
  const html = dk ? `<span class="xpin on${sel?" sel":""}" style="--c:${LINE[dk].hex}">${r?r.i+1:""}</span>`
                  : `<span class="xpin free${x.cand?" cand":""}${star?" star":""}${sel?" sel":""}" style="--k:${kcol(p)}">${ico((KIND[p.kc]||KIND.view).i)}</span>`;
  const z=dk?30:x.cand?24:26; return L.divIcon({className:"xpw", html, iconSize:[z,z], iconAnchor:[z/2,z/2]});
}
function xCard(x){
  const {p,dk,r,sp,far}=x, P=placeOf(p), kind=KIND[p.kc]||KIND.view, tint=dk?LINE[dk].c:(LINE[areaOf(p)]?LINE[areaOf(p)].c:"var(--mute)");
  const where = (XMODE==="route"||XMODE==="plan") && r ? `${sta(dk,r.i,"sm")}<span>${fmt(r.start)}–${fmt(r.end)}</span>`
              : dk ? `${sta(dk,S.days[dk].indexOf(p.id),"sm")}<span>${WDK[dk]}요일 ${r?fmt(r.start):""}</span>`
                   : `<span class="xk-a">${x.cand?"후보":esc(AREANAME[areaOf(p)]||"")}</span>${p.found?`<span class="xf">발견</span>`:""}`;
  const dist = far!=null ? (far<1.2?`도보 ${Math.max(1,Math.round(far*1000/72))}분`:`${far.toFixed(1)}km`) : "";
  const meta=[esc(p.k||kind.n), P&&P.rating?`★ ${P.rating.toFixed(1)} (${kfmt(P.reviews)})`:"", dist].filter(Boolean).join(" · ");
  const warn = r && r.warn.some(w=>w.lv==="bad") ? `<span class="xw">${esc(r.warn.find(w=>w.lv==="bad").t)}</span>` : "";
  const out=`<button class="xa soft" data-xout="${esc(p.id)}" aria-label="${esc(p.n)} 빼기">빼기</button>`;
  const put = sp && !sp.off ? `<button class="xa" data-xput="${esc(p.id)}" data-day="${sp.dk}">${lsym(sp.dk,"sm")}${WDK[sp.dk]}에 넣기${sp.add!=null||sp.tight?` <small>${esc(addTxt(sp))}</small>`:""}</button>`
                            : `<span class="xa off">${sp?WDK[sp.dk]+"요일 휴무":""}</span>`;
  const act = (XMODE==="route"||XMODE==="plan") ? (x.cand ? put : `<span class="xas"><a class="xa soft" href="${DIR(r&&r.from||HOTEL,p)}" target="_blank" rel="noopener">${ico("i-route")}길찾기</a>${out}</span>`)
            : dk ? `<span class="xas"><button class="xa soft" data-xboard="${dk}">일정</button>${out}</span>` : put;
  return `<li class="xc${XSEL===p.id?" on":""}" data-x="${esc(p.id)}" style="--t:${tint}">
    <button class="xb" data-open="${esc(p.id)}" aria-label="${esc(p.n)} 자세히">
      <span class="xph">${P&&P.photo?`<img src="${esc(P.photo)}" data-pid="${esc(p.id)}" alt="" loading="lazy">`:`<span class="big">${ico(kind.i)}</span>`}${S.star[p.id]?`<span class="xst">${ico("i-star")}</span>`:""}</span>
      <span class="xt"><span class="xk">${where}</span><b class="xn">${esc(p.n)}</b><span class="xm">${meta}</span>${XMODE==="route"&&r?`<span class="xh">${hopText(r,r.i===0)}${r.wait>=10?` · ${r.wait}분 여유`:""}</span>`:""}${warn}</span>
    </button>${act}</li>`;
}
let XMODE="explore";   // "explore"(지도 탭) | "route"(운행표를 지도로)
function renderExplore(){ renderMapView("explore"); }
function renderMapView(mode){
  XMODE=mode; document.body.dataset.boardmap="1";
  const fresh=!$("#xp");
  if(fresh){
    killXMap();
    const fab=`<span class="xcount" id="xcount"></span><button class="fab" id="xme" aria-label="내 위치에서 가까운 순">${ico("i-locate")}</button><button class="fab" id="xfit" aria-label="다 보이게">${ico("i-fit")}</button><button class="fab txt" id="xlist">목록</button>`;
    main.innerHTML=`<section class="xp" id="xp" data-mode="map">
      <div class="xtop" id="xtop"></div>
      <div id="xmap" class="xmap" role="application" aria-label="${mode==="route"?"그날 노선 지도":"장소 지도"}"></div>
      <div class="xfab">${fab}</div>
      <ul class="xcards" id="xcards"></ul>
      <button class="xnav prev" id="xprev" aria-label="이전 장소">‹</button><button class="xnav next" id="xnext" aria-label="다음 장소">›</button>
      <div class="xsheet" id="xsheet" hidden></div></section>`;
    $("#xlist").addEventListener("click",()=>{ XSHEET=!XSHEET; renderPanel(); if(XMAP) setTimeout(()=>{ XMAP.invalidateSize(); if(XSEL) xSelect(XSEL,false,false); },60); });
    $$("button[data-pm]",main).forEach(b=>b.addEventListener("click",()=>setPM(b.dataset.pm)));
    $("#xfit").addEventListener("click",()=>xFit());
    const me=$("#xme"); if(me) me.addEventListener("click",xLocate);
    const cards=$("#xcards"); let t=0;
    cards.addEventListener("scroll",()=>{ clearTimeout(t); t=setTimeout(()=>{ const r=cards.getBoundingClientRect(), mid=r.left+r.width/2;
      let best=null,bd=1e9; $$(".xc",cards).forEach(li=>{ const b=li.getBoundingClientRect(), d=Math.abs(b.left+b.width/2-mid); if(d<bd){bd=d;best=li;} });
      if(best && best.dataset.x && best.dataset.x!==XSEL) xSelect(best.dataset.x,false); },120); },{passive:true});
    // PC(마우스)에서도 넘기게: 끌기·휠·‹ › 버튼·← →. 손가락 스와이프는 그대로. 6px 넘게 끌면 카드 누름으로 치지 않는다
    let drag=null;
    cards.addEventListener("pointerdown",e=>{ if(e.pointerType!=="mouse" || e.button!==0 || e.target.closest(".xa")) return; drag={id:e.pointerId, x:e.clientX, s:cards.scrollLeft, moved:false}; });
    cards.addEventListener("pointermove",e=>{ if(!drag || e.pointerId!==drag.id) return; const d=e.clientX-drag.x;
      if(!drag.moved && Math.abs(d)>6){ drag.moved=true; cards.classList.add("drag"); try{ cards.setPointerCapture(e.pointerId); }catch(er){} }
      if(drag.moved) cards.scrollLeft=drag.s-d; });
    const dragEnd=()=>{ if(!drag) return; if(drag.moved){ cards.classList.remove("drag"); cards.dataset.dragged="1"; setTimeout(()=>{ delete cards.dataset.dragged; },0); } drag=null; };
    cards.addEventListener("pointerup",dragEnd); cards.addEventListener("pointercancel",dragEnd);
    cards.addEventListener("click",e=>{ if(cards.dataset.dragged){ e.stopPropagation(); e.preventDefault(); } },true);
    let wheelAt=0;
    cards.addEventListener("wheel",e=>{ const d=Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY; if(Math.abs(d)<4) return; e.preventDefault();
      const now=Date.now(); if(now-wheelAt<320) return; wheelAt=now; xStep(d>0?1:-1); },{passive:false});
    $("#xprev").addEventListener("click",()=>xStep(-1)); $("#xnext").addEventListener("click",()=>xStep(1));
    if(window.L){
      XMAP=L.map($("#xmap"),{zoomControl:false, attributionControl:true});
      xBase(XMAP);
      XLAY=L.layerGroup().addTo(XMAP);
      requestAnimationFrame(()=>{ if(XMAP){ XMAP.invalidateSize(); xFit(); } });
    } else $("#xmap").innerHTML=`<p class="src" style="padding:20px">지도를 불러오지 못했어요. 아래 카드는 그대로 쓸 수 있어요.</p>`;
    if(mode==="route"){ const N=tripNow(); if(N.phase==="during" && N.dk===CUR && !XSEL){ const nn=nowNext(); const x=nn.cur||nn.next; if(x) XSEL=x.id; } }
  }
  xUpdate(fresh || MAPFIT); MAPFIT=false;
}
/* 지도 바탕: 키가 있고 Map Tiles API가 켜져 있으면 구글 지도(한국어 지명), 아니면 국토지리원 담색지도(없으면 OSM).
   구글 타일은 정책상 캐시·오프라인 금지라 서비스 워커가 손대지 않고, 구글 로고 글자와 뷰포트 저작권 문구를 오른쪽 아래에 둔다. */
function gsiBase(map){
  map._bases=map._bases||[];
  const gsi=L.tileLayer("https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png",{minZoom:5, maxNativeZoom:18, maxZoom:20, className:"xtiles", crossOrigin:LS.get("tokyo-gsi-cors","")==="1"?"":undefined,
    attribution:'<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noopener">地理院タイル</a>'}).addTo(map);
  map._bases.push(gsi);
  let bad=0, ok=0; gsi.on("tileload",()=>ok++); gsi.on("tileerror",()=>{ if(++bad>=6 && !ok && XMAP===map && map.hasLayer(gsi)){ map.removeLayer(gsi);
    map._bases.push(L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19, className:"xtiles osm", attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(map)); } });
  return gsi;
}
async function gSession(key){
  try{ const t=JSON.parse(LS.get("tokyo-gtile","null")); if(t && t.session && t.key===key && t.exp*1000>Date.now()+36e5) return t.session; }catch(e){}
  const make=async body=>fetch("https://tile.googleapis.com/v1/createSession?key="+encodeURIComponent(key),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  let r=await make({mapType:"roadmap", language:"ko-KR", region:"JP", scale:"scaleFactor2x", highDpi:true});
  if(r.status===400) r=await make({mapType:"roadmap", language:"ko-KR", region:"JP"});
  if(!r.ok){ const t=await r.text().catch(()=>""); throw new Error(r.status===403?"Map Tiles API가 꺼져 있거나 키의 API 제한에 없어요.":"구글 지도 타일 오류 "+r.status+(t?": "+t.slice(0,80):"")); }
  const j=await r.json(); LS.set("tokyo-gtile",JSON.stringify({session:j.session, exp:+j.expiry||0, key}));
  return j.session;
}
function xBase(map){
  const key=LS.get("tokyo-gkey","");
  const gsi=gsiBase(map);
  const skip=!key || navigator.onLine===false || (LS.get("tokyo-gtile-err","") && Date.now()-(+LS.get("tokyo-gtile-try","0"))<2*60e3);   // 실패하면 2분만 쉰다(Henry: 콘솔에서 켜면 바로 보이게)
  if(skip) return;
  gSession(key).then(sess=>{
    if(XMAP!==map) return;
    const gl=L.tileLayer(`https://tile.googleapis.com/v1/2dtiles/{z}/{x}/{y}?session=${encodeURIComponent(sess)}&key=${encodeURIComponent(key)}`,{maxZoom:20, className:"gtiles", attribution:""});
    let bad=0, ok=0, done=false;
    gl.on("tileload",()=>{ ok++; if(!done && ok>=4){ done=true; (map._bases||[]).forEach(l=>{ if(map.hasLayer(l)) map.removeLayer(l); }); map._bases=[]; } });
    gl.on("tileerror",()=>{ if(++bad>=6 && ok<3 && map.hasLayer(gl)){ map.removeLayer(gl); LS.del("tokyo-gtile"); if(!(map._bases||[]).some(l=>map.hasLayer(l))) gsiBase(map); if(ga) map.removeControl(ga); } });
    gl.addTo(map);
    const ga=L.control({position:"bottomright"});
    ga.onAdd=()=>{ const d=L.DomUtil.create("div","gattr"); d.innerHTML=`<b class="glogo">Google Maps</b><span class="gcopy"></span>`; return d; };
    ga.addTo(map);
    let tm=0; const upd=()=>{ clearTimeout(tm); tm=setTimeout(async()=>{ if(XMAP!==map) return; const b=map.getBounds();
      try{ const r=await fetch(`https://tile.googleapis.com/tile/v1/viewport?session=${encodeURIComponent(sess)}&key=${encodeURIComponent(key)}&zoom=${map.getZoom()}&north=${b.getNorth()}&south=${b.getSouth()}&east=${b.getEast()}&west=${b.getWest()}`);
        const j=r.ok?await r.json():{}; const el=map.getContainer().querySelector(".gcopy"); if(el) el.textContent=j.copyright||"©Google"; }catch(e){} },400); };
    map.on("moveend",upd); upd();
    LS.del("tokyo-gtile-err");
  }).catch(err=>{ LS.set("tokyo-gtile-err",err.message||"구글 지도 타일을 쓸 수 없어요."); LS.set("tokyo-gtile-try",String(Date.now())); });
}
let XL=[];
function xUpdate(fit){
  $("#xtop").innerHTML=mapTop();
  $$("#xtop [data-mday]").forEach(b=>b.addEventListener("click",()=>setMapDay(b.dataset.mday)));
  $$("#xtop [data-mc]").forEach(b=>b.addEventListener("click",()=>{ const k=b.dataset.mc; MC=(MC===k&&k!=="")?"":k; LS.set("tokyo-lines-mc",MC); XSEL=null; render(); }));
  $$("#xtop .chip[aria-pressed=true]").forEach(c=>{ const row=c.parentElement; row.scrollLeft=Math.max(0,c.offsetLeft-row.clientWidth/2+c.offsetWidth/2); });
  const items=xItems(); XL=xInfo(items);
  if(XSEL && !XL.some(x=>x.p.id===XSEL)) XSEL=null;
  const nc=XL.filter(x=>x.cand).length;
  $("#xcount").textContent=XMODE==="route"?`${XL.length-nc}역${nc?` · 후보 ${nc}`:""}`:`${XL.length}곳`;
  const cards=$("#xcards");
  cards.innerHTML=XL.length ? XL.map(xCard).join("") : `<li class="xc empty"><p>${XMODE==="route"?"이날은 아직 비어 있어요.<br>목록에서 장소를 넣어 주세요.":"이 조건엔 장소가 없어요.<br>칩을 한 번 더 누르면 풀려요."}</p></li>`;
  $("#xp").style.setProperty("--xch",(cards.offsetHeight+10)+"px");
  $$("[data-xput]",cards).forEach(b=>b.addEventListener("click",e=>{ e.stopPropagation(); mapPut(b.dataset.xput,b.dataset.day); }));
  $$("[data-xout]",cards).forEach(b=>b.addEventListener("click",e=>{ e.stopPropagation(); mapOut(b.dataset.xout); }));
  $$("[data-xboard]",cards).forEach(b=>b.addEventListener("click",e=>{ e.stopPropagation(); setMapDay(b.dataset.xboard); }));
  if(!XMAP) return;
  XLAY.clearLayers(); XMK=new Map();
  const one=XMODE==="route"?CUR:(EDIT.includes(XF.a)?XF.a:null), days=XMODE==="route"?[...EDIT.filter(k=>k!==CUR),CUR]:(one?[one]:EDIT);
  days.forEach(dk=>{ const pts=[[HOTEL.lat,HOTEL.lng],...S.days[dk].map(place).filter(q=>q&&q.lat).map(q=>[q.lat,q.lng]),[HOTEL.lat,HOTEL.lng]];
    if(one && dk!==one){ L.polyline(pts,{color:LINE[dk].hex, weight:3, opacity:.35, dashArray:"6 6", interactive:false}).addTo(XLAY); return; }   // 다른 날은 흐린 점선
    // 전체에선 네 노선을 다 진하게(2026-09-28 Henry: 흐리면 날끼리 비교가 어렵다)
    L.polyline(pts,{color:"#101010", weight:one?12:10, opacity:.16, interactive:false}).addTo(XLAY);
    L.polyline(pts,{color:"#fff", weight:one?10:8, opacity:.95, interactive:false}).addTo(XLAY);
    L.polyline(pts,{color:LINE[dk].hex, weight:one?6:5, opacity:1, interactive:false}).addTo(XLAY); });
  L.marker([HOTEL.lat,HOTEL.lng],{icon:L.divIcon({className:"xpw",html:`<span class="xhub" title="숙소"></span>`,iconSize:[24,24],iconAnchor:[12,12]}),keyboard:false}).addTo(XLAY);
  XL.forEach(x=>{ const m=L.marker([x.p.lat,x.p.lng],{icon:xPin(x,XSEL===x.p.id), title:x.p.n, riseOnHover:true}).addTo(XLAY);
    m.on("click",()=>xSelect(x.p.id,true)); XMK.set(x.p.id,{m,x}); });
  if(XME) xMeMarker();
  if(fit) xFit();
  if(XSEL) xSelect(XSEL,true,true);
  renderPanel();
}
function xFit(){
  if(!XMAP) return;
  if(XMAP._animatingZoom){ XMAP.once("zoomend",()=>xFit()); return; }   // 확대 애니메이션 중엔 Leaflet이 새 요청을 버린다(칩을 빨리 연달아 누를 때)
  const pts=XL.filter(x=>!x.cand).map(x=>[x.p.lat,x.p.lng]); if(XMODE==="route" || XMODE==="plan" || EDIT.includes(XF.a)) pts.push([HOTEL.lat,HOTEL.lng]);
  if(!pts.length) pts.push([HOTEL.lat,HOTEL.lng]);
  const {top,bot}=xPad();
  XMAP.fitBounds(pts,{paddingTopLeft:[28,top+24], paddingBottomRight:[28,bot+24], maxZoom:15});
}
function xPad(){ const h=s=>($(s)||{offsetHeight:0}).offsetHeight;
  return {top:h("#xtop"), bot:$("#xp.sheet")?h("#xsheet"):h("#xcards")}; }
function xSelect(id,fromMap,quiet){
  const prev=XSEL; XSEL=id;
  [prev,id].forEach(k=>{ const o=k&&XMK.get(k); if(o){ o.m.setIcon(xPin(o.x,k===id)); o.m.setZIndexOffset(k===id?1000:0); } });
  $$("#xcards .xc").forEach(li=>li.classList.toggle("on",li.dataset.x===id));
  $$("#side .rs, #xsheet .rs").forEach(li=>{ const on=li.dataset.id===id; li.classList.toggle("on",on); if(on && fromMap) li.scrollIntoView({block:"nearest",behavior:"smooth"}); });
  const o=XMK.get(id);
  $$("#line li.st").forEach(li=>li.classList.toggle("sel",li.dataset.id===id));
  if(o && XMAP && !quiet){ const {top,bot}=xPad(), pt=XMAP.latLngToContainerPoint(o.m.getLatLng()), sz=XMAP.getSize();
    if(pt.y<top+20 || pt.y>sz.y-bot-20 || pt.x<20 || pt.x>sz.x-20){ const c=XMAP.containerPointToLatLng([sz.x/2, top+(sz.y-top-bot)/2]), cur=XMAP.getCenter(), ll=o.m.getLatLng();
      XMAP.panTo([cur.lat+(ll.lat-c.lat), cur.lng+(ll.lng-c.lng)],{animate:true}); } }
  if(fromMap){ const li=$(`#xcards .xc[data-x="${CSS.escape(id)}"]`); if(li) li.scrollIntoView({behavior:quiet?"auto":"smooth",inline:"center",block:"nearest"}); }
}
// 이전/다음 장소로(버튼·휠·← →). 고른 게 없으면 가운데 카드부터
function xStep(dir){
  if(!XL || !XL.length) return;
  let i=XL.findIndex(x=>x.p.id===XSEL);
  if(i<0){ const cards=$("#xcards"), r=cards.getBoundingClientRect(), mid=r.left+r.width/2; let bd=1e9;
    $$(".xc[data-x]",cards).forEach((li,k)=>{ const b=li.getBoundingClientRect(), d=Math.abs(b.left+b.width/2-mid); if(d<bd){ bd=d; i=k; } }); if(i<0) i=0; else i-=dir; }
  const j=Math.max(0,Math.min(XL.length-1,i+dir)); xSelect(XL[j].p.id,true);
}
document.addEventListener("keydown",e=>{ if((e.key!=="ArrowLeft" && e.key!=="ArrowRight") || !$("#xcards") || e.target.closest("input,textarea,select,[contenteditable],.leaflet-container") || e.altKey || e.ctrlKey || e.metaKey) return;
  e.preventDefault(); xStep(e.key==="ArrowRight"?1:-1); });
function xMeMarker(){ if(!XMAP||!XME) return; if(XMEMK) XMEMK.remove(); XMEMK=L.marker([XME.lat,XME.lng],{icon:L.divIcon({className:"xpw",html:`<span class="xme"></span>`,iconSize:[22,22],iconAnchor:[11,11]}),interactive:false,keyboard:false}).addTo(XMAP); }
function xLocate(){
  if(XME){ XME=null; if(XMEMK){ XMEMK.remove(); XMEMK=null; } $("#xme").classList.remove("on"); xUpdate(false); return; }
  if(!navigator.geolocation){ toast("이 기기에선 위치를 쓸 수 없어요"); return; }
  toast("내 위치를 찾는 중…");
  navigator.geolocation.getCurrentPosition(pos=>{ XME={lat:pos.coords.latitude, lng:pos.coords.longitude}; $("#xme").classList.add("on");
    xUpdate(false); if(XMAP) XMAP.setView([XME.lat,XME.lng],15); toast("가까운 순서로 보여 줘요"); },
    ()=>toast("위치 권한이 없어서 못 찾았어요"), {enableHighAccuracy:true, timeout:10000, maximumAge:60000});
}
function tileHTML(p,placed){
  const P=placeOf(p), dk=dayOf(p.id), i=dk?S.days[dk].indexOf(p.id):-1;
  return `<li><button class="tile" data-open="${esc(p.id)}">
    <span class="im" style="--t:${LINE[areaOf(p)]?LINE[areaOf(p)].c:"var(--mute)"}">${P&&P.photo?`<img src="${esc(P.photo)}" data-pid="${esc(p.id)}" alt="" loading="lazy">`:`<span class="big">${ico((KIND[p.kc]||KIND.view).i)}</span>`}</span>
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
  if(p.gone) facts.push(`<div class="fact bad"><b>Closed</b>${esc(p.gone)}${p.goneSrc?` <a href="${esc(p.goneSrc)}" target="_blank" rel="noopener">공지</a>`:""}</div>`);
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
      ${P&&P.photo?`<img class="sh-photo" src="${esc(P.photo)}" data-pid="${esc(id)}" alt="">`:""}
      <h2 id="sh-title" tabindex="-1" autofocus>${esc(p.n)}</h2>
      ${p.ja?`<button class="jp" data-big="${esc(id)}"><u>${esc(p.ja)}</u> · 크게 보기</button>`:""}
      <div class="mt" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">${picto(p)}<span style="font-size:13px;font-weight:700;color:var(--sub)">${esc(p.k||"")} · ${esc(AREANAME[areaOf(p)]||"")}</span>${p.dig?flag("pin",p.dig):""}</div>
      <div class="ctl">
        <div class="row"><span class="lab">노선</span><div class="daypick">${(()=>{ const sp=spots(p), best=sp.find(x=>x.dk!==dk&&!x.off&&!x.tight); return EDIT.map(k=>{ const x=sp.find(y=>y.dk===k), t=k===dk?"":addTxt(x);
          return `<button data-to="${k}" aria-pressed="${k===dk}"${best&&best.dk===k&&!dk?' class="best"':""}>${lsym(k,"sm")}${WDK[k]}${t?`<small class="${x.off?"bad":x.tight?"warn":""}">${t}</small>`:""}</button>`; }).join(""); })()}<button data-to="pool" aria-pressed="${!dk}">${ico("i-box")}보관함</button></div></div>
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
/* 다른 기기로 옮기기 — 서버가 없어서 복사·붙여넣기 글자로 옮긴다.
   노선(S)·예약 체크·필름·구글 키만. 구글 장소 정보(tokyo-places)는 30일 보관 규칙이 있어 기기마다 새로 받는다. */
const MOVE_TAG="TOKYOLINES1.";
let MOVED=false;
function packAll(){
  const o={v:1, at:Date.now(), lines:S, checks:CHECKED, film:filmGet(), spend:spendGet(), gkey:LS.get("tokyo-gkey","")};
  const b=new TextEncoder().encode(JSON.stringify(o)); let bin=""; b.forEach(x=>{ bin+=String.fromCharCode(x); });
  return MOVE_TAG+btoa(bin);
}
function unpackAll(text){
  const t=String(text||"").replace(/\s+/g,"");
  try{
    const i=t.indexOf(MOVE_TAG);
    if(i>=0){ const bin=atob(t.slice(i+MOVE_TAG.length).replace(/[^A-Za-z0-9+/=]/g,"")); const o=JSON.parse(new TextDecoder().decode(Uint8Array.from(bin,c=>c.charCodeAt(0))));
      return o && o.lines && o.lines.days ? o : null; }
    const v=JSON.parse(text); return v && v.days ? {lines:v} : null;     // 예전 백업 파일 내용을 붙여넣은 경우
  }catch(e){ return null; }
}
function useLines(v){ S=v; S.pv=PLANVER; EDIT.forEach(k=>{ S.days[k]=(S.days[k]||[]).filter(id=>place(id)); }); ["start","pins","dur","star","added"].forEach(k=>S[k]=S[k]||{}); }
function applyAll(o){
  useLines(o.lines);
  if(o.checks){ CHECKED=o.checks; LS.set("tokyo-checks",JSON.stringify(CHECKED)); }
  if(o.film && o.film.rolls) LS.set(FILM_KEY,JSON.stringify(o.film));
  if(o.spend && o.spend.log) LS.set("tokyo-spend",JSON.stringify(o.spend));
  if(o.gkey){ LS.set("tokyo-gkey",o.gkey); LS.del("tokyo-gkey-src"); }
}
/* 구글 계정 연동(2026-09-28) — Henry: "기기마다 바꾼 게 연동되게, 데이터 내려받는 과정 없이. 나만 쓰니까 구글 계정으로."
   구글 로그인(Google Identity Services 토큰) → 그 계정 구글 드라이브의 앱 전용 숨김 폴더(appDataFolder)에 tokyo-lines.json 하나.
   그 폴더는 로그인한 계정만 읽을 수 있어서 이메일을 코드에 적지 않는다. 노선·찜·예약 체크·필름 기록만 — 구글 장소 정보는 옮기지 않는다(30일 규칙).
   두 기기에서 같이 고치면 나중에 고친 쪽이 남는다. 토큰은 1시간짜리라, 끝나면 화면을 처음 누를 때 구글 창을 잠깐 띄워 이어 간다(팝업은 누를 때만 열 수 있다).
   tokyo-sync-local = 이 기기에서 마지막으로 고친 시각, tokyo-sync-seen = 드라이브와 마지막으로 맞춘 파일의 at. */
var SYNC_APPLYING=false, SYNC_T=0, SYNC_BUSY=false, SYNC_ARMED=false, GTC=null, GTC_CB=null;
const SYNC_FILE="tokyo-lines.json", SYNC_SCOPE="https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/userinfo.email";
function syncOn(){ return LS.get("tokyo-sync-on","")==="1" && !!LS.get("tokyo-gclient",""); }
function gTok(){ try{ const t=JSON.parse(LS.get("tokyo-gtok","null")); return t && t.t && Date.now()<t.exp-60000 ? t.t : ""; }catch(e){ return ""; } }
function syncDirty(){
  if(SYNC_APPLYING) return;
  try{ localStorage.setItem("tokyo-sync-local",String(Date.now())); }catch(e){}
  if(!syncOn()) return;
  clearTimeout(SYNC_T); SYNC_T=setTimeout(()=>{ if(gTok()) syncNow(); else syncArm(); },2000);
}
function gisLoad(){
  if(window.google && google.accounts && google.accounts.oauth2) return Promise.resolve();
  return new Promise((ok,no)=>{ const sc=document.createElement("script"); sc.src="https://accounts.google.com/gsi/client"; sc.async=true; sc.onload=ok; sc.onerror=()=>no(new Error("구글 로그인 스크립트를 못 불렀어요")); document.head.appendChild(sc); });
}
// 누르는 순간(사용자 동작)에 불러야 팝업이 막히지 않는다. gisLoad는 미리 해 둔다.
function gLogin(consent){
  return new Promise((ok,no)=>{
    if(!(window.google && google.accounts && google.accounts.oauth2)){ no(new Error("구글 로그인 준비 중이에요. 잠시 뒤 다시 눌러 주세요")); return; }
    if(!GTC) GTC=google.accounts.oauth2.initTokenClient({client_id:LS.get("tokyo-gclient",""), scope:SYNC_SCOPE, callback:r=>GTC_CB&&GTC_CB(r), error_callback:e=>GTC_CB&&GTC_CB({error:e&&e.type||"popup"})});
    GTC_CB=r=>{ if(!r || r.error){ no(new Error(r&&r.error==="popup_closed"?"로그인 창을 닫았어요":"구글 로그인에 실패했어요")); return; }
      if(google.accounts.oauth2.hasGrantedAllScopes && !google.accounts.oauth2.hasGrantedAllScopes(r,"https://www.googleapis.com/auth/drive.appdata")){ no(new Error("드라이브 권한 체크 칸이 꺼져 있었어요. 다시 누르고 '앱 데이터 보기·관리' 칸을 켜 주세요")); return; }
      LS.set("tokyo-gtok",JSON.stringify({t:r.access_token, exp:Date.now()+(+r.expires_in||3600)*1000})); ok(r.access_token); };
    const o={prompt:consent?"consent":""}; const hint=LS.get("tokyo-gmail",""); if(hint) o.login_hint=hint;
    GTC.requestAccessToken(o);
  });
}
function syncArm(){
  if(SYNC_ARMED || !syncOn()) return; SYNC_ARMED=true; gisLoad().catch(()=>{});
  document.addEventListener("pointerup",function once(){ document.removeEventListener("pointerup",once,true); SYNC_ARMED=false;
    if(gTok()) { syncNow(); return; }
    gLogin(false).then(()=>syncNow()).catch(e=>{ LS.set("tokyo-sync-err",e.message); }); },true);
}
async function gdrive(path,opt){
  const t=gTok(); if(!t) throw Object.assign(new Error("로그인이 끝났어요"),{auth:true});
  const r=await fetch("https://www.googleapis.com/"+path,Object.assign({},opt,{headers:Object.assign({Authorization:"Bearer "+t},(opt&&opt.headers)||{})}));
  if(r.status===401){ LS.del("tokyo-gtok"); throw Object.assign(new Error("로그인이 끝났어요"),{auth:true}); }
  if(!r.ok){ let why=""; try{ const j=await r.json(), er=j.error||{}; why=((er.errors||[])[0]||{}).reason||er.status||""; why+=" "+(er.message||""); }catch(e){}
    if(/accessNotConfigured|SERVICE_DISABLED|has not been used|is disabled/i.test(why)) throw new Error("구글 콘솔에서 Google Drive API가 꺼져 있어요. 켠 뒤 몇 분 기다렸다가 '지금 맞추기'를 눌러 주세요.");
    if(/insufficient|SCOPE|PERMISSION_DENIED/i.test(why)) throw new Error("로그인할 때 드라이브 권한이 체크되지 않았어요. '연동 끄기' 뒤 다시 연동하면서 권한 체크 칸을 켜 주세요.");
    throw new Error("구글 드라이브 "+r.status+(why.trim()?" · "+why.trim().slice(0,120):"")); }
  return r;
}
function syncBody(at){ return JSON.stringify({v:1, at, lines:S, checks:CHECKED, film:filmGet(), spend:spendGet()}); }
async function syncPush(at){
  let fid=LS.get("tokyo-sync-fid","");
  if(fid){ try{ await gdrive("upload/drive/v3/files/"+fid+"?uploadType=media",{method:"PATCH",headers:{"Content-Type":"application/json"},body:syncBody(at)}); return; }catch(e){ if(e.auth) throw e; fid=""; LS.del("tokyo-sync-fid"); } }
  const bd="tl"+Date.now(), meta=JSON.stringify({name:SYNC_FILE, parents:["appDataFolder"], mimeType:"application/json"});
  const body=`--${bd}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${bd}\r\nContent-Type: application/json\r\n\r\n${syncBody(at)}\r\n--${bd}--`;
  const r=await gdrive("upload/drive/v3/files?uploadType=multipart&fields=id",{method:"POST",headers:{"Content-Type":"multipart/related; boundary="+bd},body});
  LS.set("tokyo-sync-fid",(await r.json()).id);
}
async function syncNow(first){
  if(!syncOn() || SYNC_BUSY || navigator.onLine===false) return;
  if(!gTok()){ syncArm(); return; }
  SYNC_BUSY=true;
  try{
    let fid=LS.get("tokyo-sync-fid",""), remote=null;
    if(!fid){ const l=await (await gdrive("drive/v3/files?spaces=appDataFolder&fields=files(id,modifiedTime)&orderBy=modifiedTime%20desc&q="+encodeURIComponent(`name='${SYNC_FILE}'`))).json();
      fid=(l.files&&l.files[0]&&l.files[0].id)||""; if(fid) LS.set("tokyo-sync-fid",fid); }
    if(fid){ try{ remote=await (await gdrive("drive/v3/files/"+fid+"?alt=media")).json(); }catch(e){ if(e.auth) throw e; LS.del("tokyo-sync-fid"); } }
    const local=+LS.get("tokyo-sync-local","0"), seen=+LS.get("tokyo-sync-seen","0");
    const rat=remote && remote.lines && remote.lines.days ? +remote.at||0 : 0;
    // 처음 잇는 기기는 드라이브 쪽을 따른다(이 기기 것은 tokyo-sync-backup에 남긴다)
    const takeRemote = rat && (first ? true : (rat>seen && (local<=seen || rat>local)));
    if(takeRemote){
      if(first) LS.set("tokyo-sync-backup",JSON.stringify({at:Date.now(), lines:S, checks:CHECKED, film:filmGet()}));
      SYNC_APPLYING=true; try{ applyAll({lines:remote.lines, checks:remote.checks, film:remote.film, spend:remote.spend}); save(); } finally{ SYNC_APPLYING=false; }
      try{ localStorage.setItem("tokyo-sync-local",String(rat)); }catch(e){}
      LS.set("tokyo-sync-seen",String(rat)); render(); if(!first) toast("다른 기기에서 고친 내용을 받아왔어요");
    } else if(!rat || local>seen){
      const at=local||Date.now(); await syncPush(at); LS.set("tokyo-sync-seen",String(at));
      try{ localStorage.setItem("tokyo-sync-local",String(at)); }catch(e){}
    }
    LS.set("tokyo-sync-last",String(Date.now())); LS.del("tokyo-sync-err");
  }catch(e){ if(e.auth) syncArm(); else LS.set("tokyo-sync-err",e.message||"연동 실패"); }
  finally{ SYNC_BUSY=false; if(VIEW==="tools") renderTools(true); }
}
async function syncStart(){
  try{
    await gisLoad(); const t=await gLogin(true);
    try{ const u=await (await fetch("https://www.googleapis.com/oauth2/v3/userinfo",{headers:{Authorization:"Bearer "+t}})).json(); if(u && u.email) LS.set("tokyo-gmail",u.email); }catch(e){}
    LS.set("tokyo-sync-on","1"); LS.del("tokyo-sync-seen"); LS.del("tokyo-sync-fid");
    await syncNow(true); toast("구글 계정으로 연동했어요");
  }catch(e){ toast(e.message||"연동하지 못했어요"); }
  renderTools(true);
}
function syncOff(){ ["tokyo-sync-on","tokyo-gtok","tokyo-sync-fid","tokyo-sync-seen","tokyo-sync-err","tokyo-gmail"].forEach(k=>LS.del(k)); GTC=null; renderTools(true); toast("연동을 껐어요. 드라이브의 내용은 그대로 있어요"); }
function syncHTML(){
  if(!LS.get("tokyo-gclient","")) return `<p>구글 계정으로 기기끼리 맞추려면 Vercel 환경 변수 <code>GOOGLE_CLIENT_ID</code>가 필요해요. 넣고 다시 배포하면 여기 버튼이 생겨요.</p>`;
  if(!syncOn()) return `<p>구글 계정으로 <b>한 번만</b> 로그인하면 노선·찜·예약 체크·필름 기록이 이 계정의 구글 드라이브(앱 전용 숨김 폴더)에 저장되고, 같은 계정으로 로그인한 다른 기기와 저절로 맞춰져요. 두 기기에서 같이 고치면 나중에 고친 쪽이 남아요.</p>
    <p>처음 잇는 기기는 드라이브에 있는 내용을 따라가요(이 기기 것은 따로 보관).</p><div class="acts"><button class="btn ink" id="sy-on">구글로 연동 시작</button></div>`;
  const last=+LS.get("tokyo-sync-last","0"), err=LS.get("tokyo-sync-err","");
  return `<p><b>${esc(LS.get("tokyo-gmail","구글 계정"))}</b>로 연동 중${last?` · 마지막으로 맞춘 시각 ${new Date(last).toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit"})}`:""}</p>
    ${!gTok()?`<p>로그인이 한 시간마다 끝나요. 화면을 한 번 누르면 구글 창이 잠깐 떴다 닫히며 이어서 맞춰요.</p>`:""}${err?`<p class="bad">${esc(err)}</p>`:""}
    <div class="acts"><button class="btn ink" id="sy-now">지금 맞추기</button><button class="btn" id="sy-off">연동 끄기</button></div>`;
}
/* 키가 있으면 사진·영업시간을 알아서 받는다(30일 보관 규칙). 실패하면 이유를 남겨 화면에 보여 주고 6시간 뒤 다시.
   Henry: "API 등록까지 했는데 왜 사진 안 나와?" — 키가 그 기기에 없었는지, 주소 제한인지, 사진 주소가 만료됐는지 화면에서 바로 알 수 있게 했다. */
let GBUSY=false, GPROG="";
const gPhotos=()=>PSTORE.byId?Object.values(PSTORE.byId).filter(x=>x.photo).length:0;
function gState(){
  const key=LS.get("tokyo-gkey",""), err=LS.get("tokyo-gerr","");
  if(!key) return {k:"nokey", t:"사진은 구글 키를 이 기기에 한 번 넣으면 나와요."};
  if(GBUSY) return {k:"busy", t:`사진 받는 중 ${GPROG||"…"}`};
  if(err) return {k:"err", t:err};
  if(!gPhotos() || !(PSTORE.at && Date.now()-PSTORE.at<PMAXAGE)) return {k:"none", t:"아직 사진을 받지 않았어요."};
  return {k:"ok"};
}
function gStatHTML(){
  const g=gState(); if(g.k==="ok") return "";
  const act = g.k==="nokey" ? `<button data-gkey>키 붙여넣기</button>` : g.k==="busy" ? "" : `<button data-gretry>다시 받기</button>`;
  return `<div class="gst ${g.k}" role="status"><span class="gt">${esc(g.t)}</span>${act}</div>`;
}
function gTick(){ $$(".gst .gt").forEach(el=>{ el.textContent=gState().t; }); }
// 서버(Vercel 환경 변수 GMAPS_KEY)에 키가 있으면 받아 쓴다. 이 기기에 직접 넣은 키가 있으면 그게 먼저다.
// 서버에서 받은 키는 tokyo-gkey-src="server"로 표시해 두고, 서버 키가 바뀌면 따라 바꾼다.
async function serverKey(){
  if(navigator.onLine===false) return;
  try{
    const r=await fetch("/api/config",{cache:"no-store"}); if(!r.ok) return;
    const cfg=(await r.json())||{};
    if(cfg.gclient) LS.set("tokyo-gclient",String(cfg.gclient)); else LS.del("tokyo-gclient");
    const k=String(cfg.gkey||"").trim(); if(!/^AIza[0-9A-Za-z_\-]{30,}$/.test(k)) return;
    const cur=LS.get("tokyo-gkey","");
    if(cur && LS.get("tokyo-gkey-src","")!=="server") return;
    if(cur!==k){ LS.set("tokyo-gkey",k); LS.set("tokyo-gkey-src","server"); LS.del("tokyo-gerr"); LS.del("tokyo-gtile-err"); gTick(); }
  }catch(e){}
}
function askKey(){
  const v=(prompt("구글 Places API 키를 붙여넣으세요 (AIza로 시작해요)")||"").trim(); if(!v) return;
  if(!/^AIza[0-9A-Za-z_\-]{30,}$/.test(v)){ toast("키 모양이 아니에요. AIza로 시작하는 전체를 붙여넣으세요"); return; }
  LS.set("tokyo-gkey",v); LS.del("tokyo-gkey-src"); LS.del("tokyo-gerr"); autoPlaces(true);
}
async function autoPlaces(force){
  const key=LS.get("tokyo-gkey",""); if(!key || GBUSY || (navigator.onLine===false)) return;
  if(!force){
    const fresh=PSTORE.at && Date.now()-PSTORE.at < PMAXAGE-2*864e5;
    if(fresh && gPhotos()) return;
    if(LS.get("tokyo-gerr","") && Date.now()-(+LS.get("tokyo-gtry","0")) < 6*3600e3) return;
  }
  LS.set("tokyo-gtry",String(Date.now())); GBUSY=true; GPROG=""; if(!sheet.open) render();
  try{
    const res=await fetchPlaces(key,(i,t)=>{ GPROG=`${i}/${t}`; gTick(); });
    const got=Object.keys(res.out).length;
    if(got){ PSTORE={at:Date.now(), v:1, byId:Object.assign({}, PSTORE.byId||{}, res.out)}; try{ localStorage.setItem("tokyo-places",JSON.stringify(PSTORE)); }catch(e){} hydrateLoc(); }
    if(got && res.fail<=res.total/2){ LS.del("tokyo-gerr"); toast(`${got}곳 사진·영업시간을 받았어요`); }
    else { LS.set("tokyo-gerr",res.first||"구글 장소 정보를 받지 못했어요."); toast(res.first||"구글 장소 정보를 받지 못했어요"); }
  }catch(e){ LS.set("tokyo-gerr","네트워크에 닿지 못했어요. 인터넷이 될 때 '다시 받기'를 눌러 주세요."); }
  GBUSY=false; GPROG=""; PHOTOFIX.clear();
  if(!sheet.open && !document.body.classList.contains("dragging")) render();
}
/* 사진 주소는 짧게만 유효하다(구글 문서). 이미지가 안 뜨면 그곳만 사진을 새로 받아 바꿔 끼운다. */
const PHOTOFIX=new Set(); let PFQ=[], PFT=0;
document.addEventListener("error",e=>{
  const im=e.target; if(!(im instanceof HTMLImageElement) || !im.dataset.pid) return;
  im.classList.add("broken"); const id=im.dataset.pid; if(PHOTOFIX.has(id)) return;
  PHOTOFIX.add(id); PFQ.push(id); clearTimeout(PFT); PFT=setTimeout(photoFix,700);
},true);
async function photoFix(){
  const key=LS.get("tokyo-gkey",""), ids=PFQ.splice(0); if(!key || !ids.length || !PSTORE.byId) return;
  let n=0, i=0;
  async function worker(){ while(i<ids.length){ const p=place(ids[i++]); if(!p) continue; const rec=PSTORE.byId[pkey(p)]||PSTORE.byId["n:"+p.n]; const gid=p.gid||(rec&&rec.gid); if(!rec||!gid) continue;
    try{ const r=await fetch("https://places.googleapis.com/v1/places/"+encodeURIComponent(gid)+"?key="+encodeURIComponent(key)+"&fields=photos"); if(!r.ok) continue;
      const ph=await gPhoto(key,await r.json()); if(ph){ rec.photo=ph; rec.pat=Date.now(); n++; } }catch(e){} } }
  await Promise.all(Array.from({length:4},worker));
  if(n){ try{ localStorage.setItem("tokyo-places",JSON.stringify(PSTORE)); }catch(e){} if(!sheet.open && !document.body.classList.contains("dragging")) render(); }
}
/* ─────────────── 예산·교통·공항·날씨(2026-09-28) ───────────────
   Henry: "예산·교통·공항·날씨 이전 화면에 있는 걸 업데이트해 줘." → 도구 탭으로 옮기고 지금 노선에서 계산한다.
   입장료·식사는 출처 있는 fee만 더하고, 없으면 "확인 전"으로 이름만. 공항 요금은 AIRPORTS 추천 경로의 fare. */
const yen=n=>n.toLocaleString("ko-KR")+"엔";
const fareNum=f=>{ const m=String(f||"").match(/([\d,]+)\s*엔/); return m?+m[1].replace(/,/g,""):null; };
function budgetData(){
  const days=EDIT.map(dk=>{ const items=[], unk=[];
    S.days[dk].map(place).filter(Boolean).forEach(p=>{
      if(typeof p.fee==="number"){ if(p.fee>0) items.push({p, fee:p.fee, food:p.kc==="food"||p.kc==="market"}); }
      else if(["food","bar"].includes(p.kc)) unk.push({p, food:true});
      else if(["art","view","photo","leaf"].includes(p.kc) && !p.outside) unk.push({p, food:false}); });
    return {dk, items, unk, sum:items.reduce((a,x)=>a+x.fee,0)}; });
  const air=[["도착",LS.get("tokyo-air-in","nrt")],["출국",airOut()]].map(([k,a])=>{ const A=AIRPORTS[a]||AIRPORTS.nrt, r=A.routes.find(x=>x.best)||A.routes[0]; return {k, a:A.n, r:r.n, fee:fareNum(r.fare)}; });
  const total=days.reduce((a,d)=>a+d.sum,0)+air.reduce((a,x)=>a+(x.fee||0),0);
  return {days, air, total};
}
const BUDGET_V=()=>yen(budgetData().total);
function infoBudget(){
  const B=budgetData();
  const unk=B.days.flatMap(d=>d.unk.map(x=>({...x, dk:d.dk})));
  return `<div class="bt"><span>출처로 확인된 합계</span><b>${yen(B.total)}</b></div>
    ${B.days.filter(d=>d.items.length).map(d=>`<div class="bd"><p class="bh">${lsym(d.dk,"sm")}<b>${WDK[d.dk]}요일</b><span>${yen(d.sum)}</span></p>
      <ul>${d.items.map(x=>`<li><span>${esc(x.p.n)}${x.p.feeNote?` <em>${esc(x.p.feeNote)}</em>`:""}</span><b>${yen(x.fee)}</b></li>`).join("")}</ul></div>`).join("")}
    <div class="bd"><p class="bh"><b>공항 오가기</b><span>${yen(B.air.reduce((a,x)=>a+(x.fee||0),0))}</span></p>
      <ul>${B.air.map(x=>`<li><span>${x.k} · ${esc(x.a)} ${esc(x.r)}</span><b>${x.fee!=null?yen(x.fee):"확인 전"}</b></li>`).join("")}</ul></div>
    ${unk.length?`<p class="bu"><b>입장료 확인 전</b> ${unk.filter(x=>!x.food).map(x=>`${WDK[x.dk]} ${esc(x.p.n)}`).join(", ")||"없음"}</p>
      <p class="bu"><b>식사·바 값 미정</b> ${unk.filter(x=>x.food).map(x=>`${WDK[x.dk]} ${esc(x.p.n)}`).join(", ")||"없음"}</p>`:""}
    <p>전철은 도쿄 서브웨이 티켓(아래 교통)이나 교통카드로 따로 잡으세요. 노선을 바꾸면 합계도 따라 바뀌어요.</p>`;
}
// 그날 전철 구간(앱의 추정: 1.2km 넘으면 전철). 좌표가 없는 구간은 모름
function dayTrains(dk){
  const sc=schedule(dk), legs=[]; let walk=0, unknown=0;
  // 1.6km 안쪽은 걸어갈 만한 거리로 친다(Henry 코스의 규칙). 계산은 여전히 앱의 추정을 쓴다
  const add=(from,to,tr)=>{ if(tr.mode==="train" && tr.d>1.6) legs.push({from, to, min:tr.min, d:tr.d}); else if(tr.mode==="train"||tr.mode==="walk") walk+=tr.d; else if(tr.mode==="noloc") unknown++; };
  sc.rows.forEach(r=>add(r.i?r.from.n:"숙소", r.p.n, r.tr));
  if(sc.rows.length) add(sc.rows[sc.rows.length-1].p.n, "숙소", sc.back);
  return {n:legs.length, legs, walk, unknown, sc};
}
function infoTransit(){
  const T=EDIT.map(dk=>({dk, ...dayTrains(dk)}));
  const nights=T.filter(t=>t.sc.rows.length).map(t=>{ const l=t.sc.rows[t.sc.rows.length-1]; const far=l.p.lat?km(l.p,HOTEL):null;
    return `<li>${lsym(t.dk,"sm")}<span><b>${WDK[t.dk]} ${esc(l.p.n)}</b> ${fmt(t.sc.home)} 숙소 · ${far==null?"거리 모름":far<=0.6?"걸어서 숙소":`숙소까지 ${far.toFixed(1)}km — 막차 확인`}</span></li>`; }).join("");
  const card=x=>`<div class="tc"><p class="th">${esc(x.t)}</p>${x.body.map(b=>`<p>${esc(b)}</p>`).join("")}${x.src?`<p class="src"><a href="${esc(x.src)}" target="_blank" rel="noopener">${esc(x.srcn||"출처")}</a></p>`:""}</div>`;
  const rte=LS.get("tokyo-rt-err","");
  return `<p>${rte?`<span class="bad">구간 교통: ${esc(rte)}</span> 구글 콘솔에서 <a href="https://console.cloud.google.com/apis/library/routes.googleapis.com" target="_blank" rel="noopener">Routes API</a>를 켜고 키의 API 제한에 더하면, 일정의 전철 구간마다 탈 노선·역이 나와요.`
      :LS.get("tokyo-gkey","")?"일정의 전철 구간마다 구글 경로(탈 노선·탈 역·내릴 역)가 붙어요. 여행 중엔 오늘 탭의 다음 역 판에도.":"구글 키가 있으면 일정의 전철 구간마다 탈 노선·역이 붙어요."}</p>
    ${T.map(t=>`<div class="bd"><p class="bh">${lsym(t.dk,"sm")}<b>${WDK[t.dk]}요일 전철 ${t.n}번</b><span>걸어서 ${t.walk.toFixed(1)}km${t.unknown?` · 모름 ${t.unknown}`:""}</span></p>
      ${t.legs.length?`<ul>${t.legs.map(l=>`<li><span>${esc(l.from)} → ${esc(l.to)}</span><b>약 ${l.min}분</b></li>`).join("")}</ul>`:""}</div>`).join("")}
    <p class="src" style="margin:-4px 0 12px">1.6km 안쪽은 걸어서(분속 72m)로 셌어요. 전철 분은 앱의 추정(역까지 걷기·기다림 10분 + km당 2.6분)이라 실제 노선은 운행표의 길찾기로.</p>
    <div class="bd"><p class="bh"><b>밤의 끝</b></p><ul class="nt">${nights}</ul></div>
    ${TRANSIT.map(card).join("")}`;
}
function infoAir(){
  const ai=LS.get("tokyo-air-in","nrt"), A=AIRPORTS[ai]||AIRPORTS.nrt, ao=airOut(), ft=LS.get("tokyo-flight","18:00"), buf=LS.get("tokyo-buffer","150"), mv=LS.get("tokyo-move",String(AIRPORTS[ao].mins));
  const sc=schedule("sun"), lv=sunLeaveMin(), back=sc.rows.length?sc.home:null, slack=back!=null?lv-back:null;
  const opt=(v,cur)=>Object.entries(AIRPORTS).map(([k,x])=>`<option value="${k}"${k===cur?" selected":""}>${x.n}</option>`).join("");
  return `<p class="th">수요일 도착 · 공항에서 숙소까지</p>
    <label class="fld">도착 공항<select id="ai-in">${opt(0,ai)}</select></label>
    ${A.routes.map(r=>`<div class="tc${r.best?" best":""}"><p class="th">${esc(r.n)}${r.best?" · 추천":""}</p><p><b>${esc(r.d||"")}</b>${r.fare?` · ${esc(r.fare)}`:""}</p><p>${esc(r.note)}</p></div>`).join("")}
    <p>${esc(A.last)}</p>
    <div class="acts"><a class="btn" href="https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(A.q)}&destination=${encodeURIComponent(HOTEL.q||HOTEL.addr)}&travelmode=transit" target="_blank" rel="noopener">${ico("i-route")}${esc(A.n)} → 숙소 길찾기</a></div>
    <p class="th" style="margin-top:18px">일요일 출국 · 언제 숙소를 나설까</p>
    <div class="f2"><label class="fld">공항<select id="ai-out">${opt(0,ao)}</select></label><label class="fld">비행기 출발<input type="time" id="ai-ft" value="${esc(ft)}"></label></div>
    <div class="f2"><label class="fld">공항 도착 여유<select id="ai-buf">${[["120","2시간 전"],["150","2시간 30분 전"],["180","3시간 전"]].map(([v,n])=>`<option value="${v}"${v===buf?" selected":""}>${n}</option>`).join("")}</select></label>
      <label class="fld">숙소 → 공항(분)<input type="number" id="ai-mv" min="10" max="180" step="5" value="${esc(mv)}"></label></div>
    <div class="bt"><span>숙소에서 공항으로</span><b>${fmt(lv)}</b></div>
    <p>${back==null?"일요일 노선이 비어 있어요.":slack>=20?`지금 노선은 <b>${fmt(back)}</b>에 숙소로 돌아와요. <b>${slack}분</b> 여유가 있어요.`:slack>=0?`지금 노선은 <b>${fmt(back)}</b>에 숙소로 돌아와요. 여유가 ${slack}분뿐이라 마지막 역을 줄이는 게 좋아요.`:`<span class="bad">지금 노선은 ${fmt(back)}에 숙소로 돌아와서 ${-slack}분 늦어요.</span> 운행표 일요일에서 역을 빼 주세요.`}</p>
    <p class="src">이동 분은 추정이에요. 출발 전날 실제 경로로 한 번 확인하세요. 요금·운행: 2026년 9월 확인 · <a href="https://www.kkday.com/ko/blog/27152/asia-japan-tokyo-limousinebus" target="_blank" rel="noopener">나리타</a> · <a href="https://www.haneda-tokyo-access.com/kr/ride/fares.html" target="_blank" rel="noopener">하네다</a></p>`;
}
// 날씨: Open-Meteo 16일 예보(이전 화면과 같은 저장 tokyo-wx) + 평년값 + 해 지는 시각(NOAA 식 계산)
const WX_KEY="tokyo-wx";
function wxGet(){ try{ const w=JSON.parse(LS.get(WX_KEY,"null")); return w && w.at && Date.now()-w.at<72*3600e3 ? w : null; }catch(e){ return null; } }
async function wxFetch(){
  const w=wxGet(); if(navigator.onLine===false || (w && Date.now()-w.at<3600e3)) return;
  try{ const r=await fetch("https://api.open-meteo.com/v1/forecast?latitude="+HOTEL.lat+"&longitude="+HOTEL.lng+"&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&current=temperature_2m,weather_code&timezone=Asia%2FTokyo&forecast_days=16");
    if(!r.ok) return; const j=await r.json(); if(!j||!j.daily) return; LS.set(WX_KEY,JSON.stringify({at:Date.now(), daily:j.daily, current:j.current||null})); if(VIEW==="tools") renderTools(true); }catch(e){}
}
const WMO=c=>c<=1?"맑음":c===2?"구름 조금":c===3?"흐림":(c===45||c===48)?"안개":(c>=51&&c<=57)?"이슬비":(c>=61&&c<=67)?"비":(c>=71&&c<=77)?"눈":(c>=80&&c<=82)?"소나기":(c===85||c===86)?"눈":c>=95?"뇌우":"";
function sunset(date){   // NOAA 일반 식, 숙소 좌표·일본 표준시. ±1분 정도
  const d=new Date(date+"T12:00:00+09:00"), N=Math.round((d-new Date(d.getUTCFullYear()+"-01-01T00:00:00Z"))/864e5)+1, g=2*Math.PI/365*(N-1), R=Math.PI/180;
  const eq=229.18*(0.000075+0.001868*Math.cos(g)-0.032077*Math.sin(g)-0.014615*Math.cos(2*g)-0.040849*Math.sin(2*g));
  const dec=0.006918-0.399912*Math.cos(g)+0.070257*Math.sin(g)-0.006758*Math.cos(2*g)+0.000907*Math.sin(2*g)-0.002697*Math.cos(3*g)+0.00148*Math.sin(3*g);
  const ha=Math.acos(Math.cos(90.833*R)/(Math.cos(HOTEL.lat*R)*Math.cos(dec))-Math.tan(HOTEL.lat*R)*Math.tan(dec))/R;
  return Math.round(720-4*(HOTEL.lng-ha)-eq+540);
}
function wxDays(){ const w=wxGet(); return ["wed",...EDIT].map(k=>{ const D=w&&w.daily, i=D?D.time.indexOf(DAY[k].date):-1;
  return {k, date:DAY[k].date, ss:sunset(DAY[k].date), f:i>=0?{c:D.weather_code[i], hi:D.temperature_2m_max[i], lo:D.temperature_2m_min[i], rain:D.precipitation_probability_max?D.precipitation_probability_max[i]:null}:null}; }); }
function wxSummary(){ const d=wxDays(), f=d.filter(x=>x.f); return f.length?`${Math.round(Math.max(...f.map(x=>x.f.hi)))}°/${Math.round(Math.min(...f.map(x=>x.f.lo)))}°`:`평년 ${NORMALS.hi}°/${NORMALS.lo}°`; }
function infoWx(){
  const d=wxDays(), w=wxGet(), open=new Date(new Date(DAY.wed.date+"T00:00:00+09:00").getTime()-16*864e5);
  return `<div class="wxg">${d.map(x=>`<div class="wxc${x.f&&x.f.rain>=50?" wet":""}"><b>${WDK[x.k]} ${DAY[x.k].dt.split(".")[1]}</b>
      ${x.f?`<span class="wc">${esc(WMO(x.f.c))}</span><span class="wt">${Math.round(x.f.hi)}°/${Math.round(x.f.lo)}°</span>${x.f.rain!=null?`<span class="wr">비 ${x.f.rain}%</span>`:""}`:`<span class="wc">예보 전</span><span class="wt">–</span>`}
      <span class="ws">해 짐 ${fmt(x.ss)}</span></div>`).join("")}</div>
    ${d.some(x=>x.f)?"":`<p>예보는 16일 앞까지만 나와서 <b>${open.getMonth()+1}월 ${open.getDate()}일쯤</b>부터 날짜별로 채워져요.</p>`}
    <p>11월 평년값은 낮 <b>${NORMALS.hi}°C</b>, 밤 <b>${NORMALS.lo}°C</b>예요. 하순은 달 평균보다 조금 더 쌀쌀해요. 낮엔 니트나 가벼운 겉옷, 전망대 노을(16시 반쯤)과 밤 LP바엔 한 겹 더.</p>
    <p class="src">예보 <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a>${w?` · ${new Date(w.at).toLocaleString("ko-KR",{month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"})} 받음`:""} · 평년값 <a href="${esc(NORMALS.src)}" target="_blank" rel="noopener">${esc(NORMALS.srcn)}</a> · 해 지는 시각은 NOAA 식으로 계산한 값(±1분)</p>`;
}
/* 오프라인 준비(2026-09-28): 노선이 지나는 곳의 국토지리원 타일(13~16단계)과 장소 사진을 미리 받아 서비스 워커에 둔다.
   구글 지도 타일은 캐시 금지라 받지 않는다(오프라인에선 국토지리원 지도로 떨어진다). OSM은 대량 받기 금지라 쓰지 않는다. */
function preTiles(){
  const set=new Set(), t2=(lat,lng,z)=>{ const n=2**z, x=Math.floor((lng+180)/360*n), r=lat*Math.PI/180, y=Math.floor((1-Math.log(Math.tan(r)+1/Math.cos(r))/Math.PI)/2*n); return [x,y]; };
  EDIT.forEach(dk=>{ const pts=[HOTEL,...S.days[dk].map(place).filter(p=>p&&p.lat)]; if(pts.length<2) return;
    const la=pts.map(p=>+p.lat), ln=pts.map(p=>+p.lng), pad=0.006, S0=Math.min(...la)-pad, N0=Math.max(...la)+pad, W0=Math.min(...ln)-pad, E0=Math.max(...ln)+pad;
    for(let z=13;z<=16;z++){ const [x0,y0]=t2(N0,W0,z), [x1,y1]=t2(S0,E0,z); for(let x=x0;x<=x1;x++) for(let y=y0;y<=y1;y++) set.add(`${z}/${x}/${y}`); } });
  return [...set].slice(0,2200);
}
function infoOffline(){
  const n=preTiles().length, ph=EDIT.flatMap(dk=>S.days[dk]).map(place).filter(p=>p && placeOf(p) && placeOf(p).photo).length;
  return `<p>와이파이에서 한 번 눌러 두면, 도쿄에서 데이터가 약해도 일정·지도·사진이 열려요. 지금 노선이 지나는 곳의 지도 ${n}장과 사진 ${ph}장이에요. 노선을 크게 바꿨으면 다시 눌러 주세요.</p>
    <div class="acts"><button class="btn ink" id="prefetch"${PREBUSY?" disabled":""}>${PREBUSY?`받는 중 ${PREBUSY}`:"지도·사진 미리 받기"}</button></div>
    <p class="src">구글 지도는 정책상 저장할 수 없어서, 인터넷이 없을 땐 국토지리원 지도로 보여요. 구간 교통(구글 경로)도 인터넷이 있어야 나와요.</p>`;
}
let PREBUSY="";
async function prefetchAll(){
  if(PREBUSY) return; if(navigator.onLine===false){ toast("인터넷이 연결된 곳에서 눌러 주세요"); return; }
  const tiles=preTiles(), photos=[...new Set(EDIT.flatMap(dk=>S.days[dk]).map(place).map(p=>p&&placeOf(p)&&placeOf(p).photo).filter(Boolean))];
  let done=0, ok=0; const all=tiles.length+photos.length, tick=()=>{ PREBUSY=`${done}/${all}`; const b=$("#prefetch"); if(b) b.textContent=`받는 중 ${PREBUSY}`; };
  PREBUSY="0/"+all; renderTools(true);
  const job=async u=>{ try{ const r=await fetch(u,{mode:"cors"}); if(r.ok) ok++; }catch(e){} done++; if(done%20===0) tick(); };
  const q=tiles.map(t=>`https://cyberjapandata.gsi.go.jp/xyz/pale/${t}.png`);
  for(let i=0;i<q.length;i+=6) await Promise.all(q.slice(i,i+6).map(job));
  if(ok>tiles.length*0.5) LS.set("tokyo-gsi-cors","1");
  for(const u of photos){ try{ await fetch(u,{mode:"no-cors"}); }catch(e){} done++; }
  PREBUSY=""; LS.set("tokyo-pre-at",String(Date.now())); renderTools(true);
  toast(ok?`지도 ${ok}장, 사진 ${photos.length}장을 받아 뒀어요`:"지도를 미리 받지 못했어요. 지도 탭을 날짜별로 한 번씩 열어 두세요");
}
// 예약 알림 캘린더: 판매 시작이 확인된 곳(open)은 그 시각, 나머지는 한 번에 모아 10/20 20:00(지났으면 내일 20:00)
function resvIcs(){
  const enc=new TextEncoder(), fold=line=>{ const out=[]; let cur="",n=0; for(const ch of line){ const b=enc.encode(ch).length; if(n+b>(out.length?74:75)){ out.push(cur); cur=""; n=0; } cur+=ch; n+=b; } out.push(cur); return out.join("\r\n "); };
  const tx=v=>String(v??"").replace(/\\/g,"\\\\").replace(/;/g,"\\;").replace(/,/g,"\\,").replace(/\r?\n/g,"\\n");
  const z=ms=>new Date(ms).toISOString().replace(/[-:]/g,"").replace(/\.\d{3}/,"");
  const left=checksNow().filter(c=>!CHECKED[c.id]), L=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//tokyo-lines//KO","CALSCALE:GREGORIAN","X-WR-CALNAME:도쿄 예약 알림"];
  const ev=(uid,ms,sum,desc,url,alarms)=>{ L.push("BEGIN:VEVENT",`UID:${uid}@tokyo-lines`,"DTSTAMP:20260928T000000Z",`DTSTART:${z(ms)}`,`DTEND:${z(ms+30*60000)}`,fold(`SUMMARY:${tx(sum)}`),fold(`DESCRIPTION:${tx(desc)}`),...(url?[fold(`URL:${url}`)]:[]));
    alarms.forEach(m=>L.push("BEGIN:VALARM","ACTION:DISPLAY",`TRIGGER:-PT${m}M`,fold(`DESCRIPTION:${tx(sum)}`),"END:VALARM")); L.push("END:VEVENT"); };
  left.filter(c=>c.open).forEach(c=>ev(`open-${c.id}`, new Date(c.open).getTime(), `${c.t} 예약 오픈`, c.d, c.url, [30,0]));
  const rest=left.filter(c=>!c.open);
  if(rest.length){ let t=new Date("2026-10-20T20:00:00+09:00").getTime(); if(t<Date.now()){ const d=new Date(Date.now()+864e5); t=new Date(d.toISOString().slice(0,10)+"T20:00:00+09:00").getTime(); }
    ev("todo-all", t, `도쿄 예약 챙기기 ${rest.length}곳`, rest.map(c=>`${c.t}: ${c.d}`).join("\n"), "", [0]); }
  L.push("END:VCALENDAR"); return L.join("\r\n")+"\r\n";
}
/* 비 오는 날 대안(2026-09-28): 그날 비 확률 50% 이상이면 밖에서 보는 곳마다 가까운 실내 후보(미술관·서점, 2km 안, 그날 여는 곳)를 "바꾸기"로 */
function rainHTML(dk){
  const w=wxDays().find(x=>x.k===dk); if(!w || !w.f || w.f.rain<50) return "";
  const placed=new Set(EDIT.flatMap(k=>S.days[k]));
  const outs=S.days[dk].map(place).filter(p=>p && (p.outside || ["leaf","view","market"].includes(p.kc)));
  if(!outs.length) return "";
  const alts=p=>!p.lat?[]:[...CAT.values()].filter(q=>q.lat && !q.gone && !q.outside && ["art","book"].includes(q.kc) && !placed.has(q.id) && !offOn(q,dk) && km(p,q)<=2)
    .sort((a,b)=>km(p,a)-km(p,b)).slice(0,2);
  return `<section class="rainbox"><p class="rh">${ico("i-rain")}<b>${WDK[dk]}요일 비 ${w.f.rain}% 예보</b><span>${esc(WMO(w.f.c))} ${Math.round(w.f.hi)}°</span></p>
    <ul>${outs.map(p=>{ const A=alts(p); return `<li><b>${esc(p.n)}</b>${p.rain?`<small>${esc(p.rain)}</small>`:""}${A.length?`<span class="ra">대신 ${A.map(q=>`<button class="lk" data-rainswap="${esc(p.id)}" data-to="${esc(q.id)}">${esc(q.n)} <small>${km(p,q).toFixed(1)}km</small></button>`).join("")}</span>`:`<small>근처 실내 후보가 없어요</small>`}</li>`; }).join("")}</ul></section>`;
}
function rainSwap(from,to){
  const dk=EDIT.find(k=>S.days[k].includes(from)); if(!dk) return; const a=place(from), b=place(to); if(!a||!b) return;
  const snap=daySnap(); const i=S.days[dk].indexOf(from); S.days[dk][i]=to; delete S.pins[from]; commit();
  toastUndo(`${a.n} → ${b.n}`,()=>{ S.days=snap.days; S.pins=snap.pins; commit("되돌렸어요"); });
}
function wireInfo(){
  const on=(id,fn)=>{ const el=$(id); if(el) el.addEventListener("change",fn); };
  on("#ai-in",e=>{ LS.set("tokyo-air-in",e.target.value); if(LS.get("tokyo-air-manual","")!=="1") LS.set("tokyo-air",e.target.value); renderTools(true); });
  on("#ai-out",e=>{ LS.set("tokyo-air",e.target.value); LS.set("tokyo-air-manual","1"); LS.set("tokyo-move",String(AIRPORTS[e.target.value].mins)); renderTools(true); });
  on("#ai-ft",e=>{ LS.set("tokyo-flight",e.target.value||"18:00"); renderTools(true); });
  on("#ai-buf",e=>{ LS.set("tokyo-buffer",e.target.value); renderTools(true); });
  on("#ai-mv",e=>{ LS.set("tokyo-move",String(Math.max(10,+e.target.value||0))); renderTools(true); });
  if(TOOLS_OPEN==="wx" || $(".tl[data-k=wx][open]")) wxFetch();
  const wx=$(".tl[data-k=wx]"); if(wx) wx.addEventListener("toggle",()=>{ if(wx.open) wxFetch(); });
}
/* ─────────────── 지출(2026-09-28) ───────────────
   Henry: "예상 지출 내역, 사전 지출 내역." → 둘 다: 예약 체크의 "결제함"(paid: 체크 id → 엔)과 직접 적는 장부(log).
   tokyo-spend = {paid:{id:엔}, log:[{id, day:"pre"|요일키, cat, n, amt, cur:"JPY"|"KRW"}]}. 구글 연동·옮기기에 같이 간다.
   환율은 출처 없이 쓰지 않는다 — 엔과 원은 따로 더한다. */
function spendGet(){ try{ const v=JSON.parse(LS.get("tokyo-spend","null")); if(v && v.log) return Object.assign({paid:{}},v); }catch(e){} return {paid:{}, log:[]}; }
function spendSet(v){ LS.set("tokyo-spend",JSON.stringify(v)); }
const SPCAT=["항공","숙소","입장권","교통","식사","쇼핑","기타"];
const SPDAY=[["pre","여행 전"],["wed","수"],["thu","목"],["fri","금"],["sat","토"],["sun","일"]];
const won=n=>n.toLocaleString("ko-KR")+"원";
function checkFee(c){ const p=c.q&&place(c.q); return p&&typeof p.fee==="number"?p.fee:0; }
function spendSum(list){ return list.reduce((a,x)=>{ a[x.cur||"JPY"]=(a[x.cur||"JPY"]||0)+(+x.amt||0); return a; },{}); }
const sumTxt=o=>[o.JPY?yen(o.JPY):"", o.KRW?won(o.KRW):""].filter(Boolean).join(" + ")||"0엔";
function infoSpend(){
  const V=spendGet(), paid=Object.entries(V.paid).map(([id,amt])=>({id, amt, c:CHECKS.find(c=>c.id===id)})).filter(x=>x.c);
  const tot=spendSum(V.log.concat(paid.map(x=>({amt:x.amt,cur:"JPY"}))));
  return `<div class="bt"><span>적은 지출 + 결제한 예약</span><b>${sumTxt(tot)}</b></div>
    <form class="spf" id="spf">
      <div class="f2"><label class="fld">날<select name="day">${SPDAY.map(([k,n])=>`<option value="${k}"${k===(LS.get("tokyo-spday","pre"))?" selected":""}>${n}</option>`).join("")}</select></label>
        <label class="fld">분류<select name="cat">${SPCAT.map(c=>`<option>${c}</option>`).join("")}</select></label></div>
      <label class="fld">무엇<input name="n" placeholder="예: 항공권, 스카이라이너, 규베에" autocomplete="off"></label>
      <div class="f2"><label class="fld">금액<input name="amt" type="number" inputmode="numeric" min="0" step="1" required></label>
        <label class="fld">통화<select name="cur"><option value="JPY">엔</option><option value="KRW">원</option></select></label></div>
      <div class="acts"><button class="btn ink" type="submit">${ico("i-plus")}적기</button></div></form>
    ${SPDAY.map(([k,n])=>{ const L=V.log.filter(x=>x.day===k), P=paid.filter(x=>{ const d=x.c.q&&dayOf(x.c.q); return k==="pre"?!d:d===k; });
      if(!L.length && !P.length) return "";
      return `<div class="bd"><p class="bh"><b>${n==="여행 전"?n:n+"요일"}</b><span>${sumTxt(spendSum(L.concat(P.map(x=>({amt:x.amt,cur:"JPY"})))))}</span></p><ul>
        ${P.map(x=>`<li><span>${esc(x.c.t)} <em>예약 결제</em></span><b>${yen(+x.amt)}</b></li>`).join("")}
        ${L.map(x=>`<li><span>${esc(x.n||x.cat)} <em>${esc(x.cat)}</em></span><b>${x.cur==="KRW"?won(+x.amt):yen(+x.amt)} <button class="x" data-spdel="${esc(x.id)}" aria-label="지우기">×</button></b></li>`).join("")}</ul></div>`; }).join("")}
    <p class="src">엔과 원은 따로 더해요(환율을 넣지 않았어요). 예약 체크에서 "결제함"을 누른 입장권은 여기와 오늘 탭의 "이미 낸 돈"에 같이 들어가요.</p>`;
}
function wireSpend(){
  const f=$("#spf"); if(f) f.addEventListener("submit",e=>{ e.preventDefault(); const d=new FormData(f), amt=Math.round(+d.get("amt")||0); if(!amt){ toast("금액을 넣어 주세요"); return; }
    const V=spendGet(); V.log.push({id:"s"+Date.now().toString(36), day:d.get("day"), cat:d.get("cat"), n:String(d.get("n")||"").trim(), amt, cur:d.get("cur")}); LS.set("tokyo-spday",d.get("day")); spendSet(V); toast("적었어요"); renderTools(true); });
  $$("[data-spdel]").forEach(b=>b.addEventListener("click",()=>{ const V=spendGet(); V.log=V.log.filter(x=>x.id!==b.dataset.spdel); spendSet(V); renderTools(true); }));
  $$("[data-paid]").forEach(c=>c.addEventListener("change",()=>{ const V=spendGet(), id=c.dataset.paid; if(c.checked){ const a=$(`[data-pamt="${id}"]`); V.paid[id]=Math.max(0,Math.round(+(a&&a.value)||0)); } else delete V.paid[id]; spendSet(V); renderTools(true); }));
  $$("[data-pamt]").forEach(i=>i.addEventListener("change",()=>{ const V=spendGet(), id=i.dataset.pamt; if(id in V.paid){ V.paid[id]=Math.max(0,Math.round(+i.value||0)); spendSet(V); renderTools(true); } }));
}
function renderTools(keep){
  if(VIEW!=="tools") return;
  const openNow=keep?$$(".tl[open]").map(x=>x.dataset.k):[TOOLS_OPEN];
  const film=filmGet(), roll=film.rolls[film.rolls.length-1], key=LS.get("tokyo-gkey",""), n=PSTORE.byId?Object.keys(PSTORE.byId).length:0;
  const tl=(k,icon,t,v,inner)=>`<details class="tl" data-k="${k}"${openNow.includes(k)?" open":""}><summary><span class="picto">${ico(icon)}</span>${t}<span class="v">${v||""}</span></summary><div class="in">${inner}</div></details>`;
  main.innerHTML=`<div class="wrap">
    <section class="hero"><p class="hero-date num">Tools</p><h1 class="hero-t">여행 도구</h1><p class="hero-s">예약 체크, 일본어, 긴급 연락처, 필름 기록, 구글 장소 정보, 노선 템플릿과 백업.</p></section>
    <div class="tools">
      ${tl("sync","i-network","구글 계정으로 연동",syncOn()?"켜짐":"",syncHTML())}
      ${tl("move","i-network","다른 기기로 옮기기",MOVED?"가져옴":"",
        `<p>노선·찜·예약 체크·필름 기록·구글 키는 <b>이 기기에만</b> 저장돼요. 아이폰과 아이패드는 서로의 내용을 모르고, 같은 기기라도 사파리와 홈 화면 아이콘은 저장소가 따로예요.</p>
         <p><b>1. 보내는 기기</b>에서 복사하고 <b>2. 받는 기기</b>에서 붙여넣으세요. 같은 Apple ID로 로그인돼 있으면 아이폰에서 복사한 걸 아이패드에서 바로 붙여넣을 수 있어요.</p>
         <div class="acts"><button class="btn ink" id="mv-copy">이 기기 내용 복사</button>${navigator.share?`<button class="btn" id="mv-share">공유로 보내기</button>`:""}</div>
         <label class="fld" style="margin-top:14px">받는 기기: 여기에 붙여넣기<textarea id="mv-in" rows="3" placeholder="TOKYOLINES1.…" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"></textarea></label>
         <div class="acts"><button class="btn" id="mv-paste">클립보드에서 붙여넣기</button><button class="btn ink" id="mv-go">가져오기</button></div>
         <p id="mv-stat" style="margin-top:10px"></p>`)}
      ${tl("resv","i-check","예약 체크",`${checksNow().filter(c=>CHECKED[c.id]).length}/${checksNow().length}`,
        checksNow().map(c=>{ const V=spendGet(), paid=c.id in V.paid, amt=paid?V.paid[c.id]:checkFee(c);
          return `<div class="chkw"><label class="chk"><input type="checkbox" data-chk="${c.id}"${CHECKED[c.id]?" checked":""}><span><b>${esc(c.t)}</b>${esc(c.d)}${c.url?` <a href="${esc(c.url)}" target="_blank" rel="noopener">예약 페이지</a>`:""}</span></label>
          <p class="pay"><label><input type="checkbox" data-paid="${c.id}"${paid?" checked":""}> 결제함</label><input type="number" inputmode="numeric" min="0" data-pamt="${c.id}" value="${amt||""}" placeholder="금액" aria-label="${esc(c.t)} 결제 금액"><span>엔</span></p></div>`; }).join("")
        +`<div class="acts" style="margin-top:12px"><button class="btn" id="resvics">${ico("i-cal")}예약 알림 캘린더</button></div><p class="src">판매 시작 시각이 확인된 곳(시부야 스카이 11/7 0시)은 그 시각과 30분 전에, 나머지는 10월 20일 저녁 8시에 한 번 "예약 챙기기" 알림이 와요(이 날짜는 앱이 정한 것).</p>`)}
      ${tl("offline","i-box","오프라인 준비",LS.get("tokyo-pre-at","")?`${new Date(+LS.get("tokyo-pre-at")).toLocaleDateString("ko-KR",{month:"numeric",day:"numeric"})} 받음`:"",infoOffline())}
      ${tl("spend","i-tool","지출 장부",sumTxt(spendSum(spendGet().log.concat(Object.values(spendGet().paid).map(a=>({amt:a,cur:"JPY"}))))),infoSpend())}
      ${tl("budget","i-tool","예산",BUDGET_V(),infoBudget())}
      ${tl("transit","i-train","교통",`전철 ${EDIT.reduce((a,dk)=>a+dayTrains(dk).n,0)}번`,infoTransit())}
      ${tl("air","i-move","공항",`${AIRPORTS[LS.get("tokyo-air-in","nrt")]?.n||"나리타"} · 일 ${fmt(sunLeaveMin())} 출발`,infoAir())}
      ${tl("wx","i-sun","날씨",wxSummary(),infoWx())}
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
        `<p>정리해 둔 일정 중 하나로 노선을 다시 짭니다. 찜과 직접 담은 곳은 남아요.</p><div class="tpl">${PLANS.filter(p=>p.k!=="mine").map(p=>`<button data-tpl="${p.k}"><b>${esc(p.n)}${p.k===S.tpl?" · 지금":""}</b><span>${esc(p.intro)}</span></button>`).join("")}</div>`)}
      ${tl("google","i-pin","구글 장소 정보",n?`${n}곳`:"키 없음",
        `<p>키를 넣고 받으면 모든 블록에 사진·평점·요일별 영업시간이 붙고, 영업시간 밖이면 일정에 경고가 떠요. 30일 동안 보관해요.</p>
         <label class="fld">Places API 키<input type="password" id="gkey" value="${esc(key)}" autocomplete="off" placeholder="AIza…"></label>
         <div class="acts"><button class="btn ink" id="gfetch">장소 정보 받기</button>${n?`<button class="btn" id="gclear">지우기</button>`:""}</div><p id="gstat" style="margin-top:10px">${GBUSY?`받는 중 ${GPROG}`:n?`${n}곳 저장됨 · 사진 ${gPhotos()}곳 · ${Math.floor((Date.now()-PSTORE.at)/864e5)}일 전`:"아직 받지 않았어요."}</p>${LS.get("tokyo-gerr","")?`<p class="gerr">${esc(LS.get("tokyo-gerr",""))}</p>`:""}
         <p>키 만들기: console.cloud.google.com → Places API (New) 사용 → 사용자 인증 정보에서 API 키 → 웹사이트 제한에 이 주소 추가.</p>`)}
      ${tl("backup","i-box","백업·캘린더","",
        `<p>노선을 파일로 저장해 두거나 불러와요. 다른 기기로 옮길 땐 맨 위 "다른 기기로 옮기기"가 더 쉬워요.</p>
         <div class="acts"><button class="btn" id="exp">파일로 저장</button><label class="btn" for="imp">불러오기</label><button class="btn" id="ics">${ico("i-cal")}캘린더 파일</button><button class="btn" id="reset">처음 노선으로</button></div><input type="file" id="imp" accept=".json,application/json" hidden>`)}
      <a class="tl" href="classic.html" style="display:flex;align-items:center;gap:12px;min-height:64px;padding:0 16px;font-weight:800;text-decoration:none"><span class="picto" style="width:30px;height:30px;border-radius:9px">${ico("i-more")}</span>이전 화면</a>
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
  const gk=$("#gkey"); if(gk) gk.addEventListener("change",()=>{ LS.set("tokyo-gkey",gk.value.trim()); LS.del("tokyo-gkey-src"); LS.del("tokyo-gerr"); if(gk.value.trim()) autoPlaces(true); });
  const gf=$("#gfetch"); if(gf) gf.addEventListener("click",()=>{ const k=gk.value.trim(); if(!k){ $("#gstat").textContent="먼저 키를 넣어 주세요."; gk.focus(); return; }
    LS.set("tokyo-gkey",k); LS.del("tokyo-gkey-src"); LS.del("tokyo-gerr"); autoPlaces(true); });
  const gc=$("#gclear"); if(gc) gc.addEventListener("click",()=>{ PSTORE={}; LS.del("tokyo-places"); renderTools(true); });
  const mstat=t=>{ const e=$("#mv-stat"); if(e) e.textContent=t; };
  wireInfo(); wireSpend();
  const rv=$("#resvics"); if(rv) rv.addEventListener("click",()=>download("tokyo-reservations.ics",resvIcs(),"text/calendar;charset=utf-8"));
  const pf=$("#prefetch"); if(pf) pf.addEventListener("click",()=>prefetchAll());
  const syOn=$("#sy-on"); if(syOn) syOn.addEventListener("click",syncStart);
  const syNow=$("#sy-now"); if(syNow) syNow.addEventListener("click",()=>{ if(gTok()) syncNow(); else gLogin(false).then(()=>syncNow()).catch(e=>toast(e.message)); });
  const syOff=$("#sy-off"); if(syOff) syOff.addEventListener("click",syncOff);
  if(LS.get("tokyo-gclient","") && !(window.google && google.accounts)) gisLoad().catch(()=>{});
  $("#mv-copy").addEventListener("click",async()=>{ const code=packAll();
    try{ await navigator.clipboard.writeText(code); mstat("복사했어요. 이제 받는 기기에서 붙여넣으세요."); toast("복사했어요"); }
    catch(e){ const ta=$("#mv-in"); ta.value=code; ta.focus(); ta.select(); mstat("자동 복사가 막혀서 아래 칸에 넣었어요. 길게 눌러 '복사'하세요."); } });
  const msh=$("#mv-share"); if(msh) msh.addEventListener("click",async()=>{ try{ await navigator.share({title:"Tokyo Lines 옮기기", text:packAll()}); }catch(e){} });
  $("#mv-paste").addEventListener("click",async()=>{ try{ const t=await navigator.clipboard.readText(); if(t) $("#mv-in").value=t; mstat(t?"붙여넣었어요. '가져오기'를 누르세요.":"클립보드가 비어 있어요."); }
    catch(e){ $("#mv-in").focus(); mstat("칸을 길게 눌러 '붙여넣기'를 고르세요."); } });
  $("#mv-go").addEventListener("click",()=>{ const o=unpackAll($("#mv-in").value);
    if(!o){ mstat("옮기기 글자를 읽지 못했어요. 'TOKYOLINES1.'로 시작하는 전체를 붙여넣었는지 확인하세요."); return; }
    const n=EDIT.reduce((a,k)=>a+((o.lines.days||{})[k]||[]).length,0);
    if(!confirm(`가져온 노선(${n}역)으로 이 기기 내용을 바꿀까요? 이 기기의 지금 노선은 사라져요.`)) return;
    applyAll(o); MOVED=true;
    commit("다른 기기 내용을 가져왔어요"); if(o.gkey) setTimeout(()=>autoPlaces(true),600); });
  $("#exp").addEventListener("click",()=>download("tokyo-lines.json",JSON.stringify(S,null,1),"application/json"));
  $("#imp").addEventListener("change",async e=>{ const f=e.target.files[0]; if(!f) return; try{ const v=JSON.parse(await f.text()); if(!v||!v.days) throw 0; useLines(v); commit("노선을 불러왔어요"); }catch(err){ toast("이 파일은 읽을 수 없어요"); } });
  $("#ics").addEventListener("click",()=>download("tokyo-lines.ics",icsText(),"text/calendar;charset=utf-8"));
  $("#reset").addEventListener("click",()=>{ if(!confirm(`처음 노선(${(PLANS.find(p=>p.k===DEFPLAN)||{}).n})으로 돌아갈까요? 찜과 직접 담은 곳은 남아요.`)) return; S=fromTemplate(DEFPLAN,{star:S.star, added:S.added}); commit("처음 노선으로 돌아갔어요"); });
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
  const nw=e.target.closest("[data-news]"); if(nw){ newsAct(nw.dataset.news); return; }
  if(e.target.closest("[data-gkey]")){ askKey(); return; }
  const op=e.target.closest("[data-opt]"); if(op){ if(op.dataset.opt==="undo" && OPTRES){ S.days[OPTRES.dk]=OPTRES.prev; OPTRES=null; commit("원래 순서로 돌아갔어요"); } else { OPTRES=null; render(); } return; }
  if(e.target.closest("[data-gretry]")){ LS.del("tokyo-gerr"); autoPlaces(true); return; }
  const xc=e.target.closest("#xcards .xc[data-x]"); if(xc && !xc.classList.contains("on")){ xSelect(xc.dataset.x,false); return; }   // 지도 카드는 처음 누르면 고르고, 한 번 더 누르면 자세히
  if(e.target.closest(".st .row") && e.target.closest("[data-open]")){ openSheet(e.target.closest("[data-open]").dataset.open); return; }
  const b=e.target.closest("[data-big]"); if(b){ const p=place(b.dataset.big); if(p && p.ja) bigJa(p); return; }
  const o=e.target.closest("[data-open]"); if(o && !e.target.closest(".tl")){ openSheet(o.dataset.open); return; }
});
setTimeout(async()=>{ await serverKey(); autoPlaces(false); syncNow(); },1500);
document.addEventListener("visibilitychange",()=>{ if(document.visibilityState==="visible") syncNow(); });
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
