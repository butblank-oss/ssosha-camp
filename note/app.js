/* 캠핑수첩: 때찌·때꾸와 갈 캠핑장 후보 (GitHub Pages 판)
 * 데이터 원본: camps.json (캠핑장 id는 고정값) · 사진: photos.json (Actions가 고캠핑에서 받아요)
 * 저장: 이 브라우저(localStorage) + 로그인하면 Supabase camp_note 표에 공유 */
"use strict";
let R={},D=[],PICKS=[],DROP=[],CALLS=[],GC={camps:{}},NEAR=[];
const byId=id=>D.find(d=>d.id===id);
const NEEDS=[["fence","🐾 펜스 있는 곳만",d=>d.fence],["fire","🔥 불멍 확인됨",d=>d.fire==="ok"],["w11","⚡ 1100W 이상",d=>d.w11],["h1","🚗 1시간 이내",d=>d.min<=60],["ok","✅ 바로 예약만",d=>d.fit==="ok"],["clean","👍 후기 주의 빼기",d=>!d.rv||!["bad","warn"].includes(d.rv.lv)],["heat","🌡️ 난로 대여",d=>d.heat&&d.heat.st==="ok"],["day","☀️ 당일 가능",d=>(d.day||[]).length>0],["dogday","🐶 반려견 동반",d=>(d.day||[]).some(x=>x.dog===true)||(!d.solo&&d.dog2!=="no")]];
const RVL={bad:["🚩","후기 주의"],warn:["⚠️","참고할 단점"],mild:["💬","사소한 단점"],ok:["👍","후기 깨끗"]};
const CREDIT="사진: 고캠핑(한국관광공사)";

/* 기록: {saved:[id], calls:[번호], notes:{id:글}, added:[캠핑장]} 하나로 모아 저장해요 */
const KEY="camp_note";
const local={get(k,f){try{const v=localStorage.getItem(k);return v?JSON.parse(v):f}catch(e){return f}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}},del(k){try{localStorage.removeItem(k)}catch(e){}}};
let saved=new Set(),checked=new Set(),notes={},added=[],ratings={};
function loadState(s){s=s||{};saved=new Set(s.saved||[]);checked=new Set(s.calls||[]);notes={...(s.notes||{})};ratings={...(s.ratings||{})};added=(s.added||[]).filter(a=>a&&a.id&&a.n)}
const snapshot=()=>({saved:[...saved],calls:[...checked].sort((a,b)=>a-b),notes,added,ratings});
const hasData=s=>!!(s&&((s.saved||[]).length||(s.calls||[]).length||Object.keys(s.notes||{}).length||(s.added||[]).length||Object.keys(s.ratings||{}).length));
const same=(a,b)=>JSON.stringify(norm(a))===JSON.stringify(norm(b));
function norm(s){s=s||{};const n=s.notes||{};return {saved:[...(s.saved||[])].sort(),calls:[...(s.calls||[])].sort((a,b)=>a-b),notes:Object.keys(n).sort().map(k=>[k,n[k]]),added:[...(s.added||[])].sort((a,b)=>a.id<b.id?-1:1),ratings:Object.keys(s.ratings||{}).sort().map(k=>[k,s.ratings[k]])}}
loadState(local.get(KEY,null));
let view="home",region="all",sort="dist",q="";const need=new Set();let animate=true;
function all(){return D.concat(added.map(a=>({...a,user:true})),NEAR)}
/* 고캠핑 정보: 우리 후보는 id로, 주변 추천은 그 자체로 */
const gco=d=>d.g||GC.camps[d.id]||null;
const dist=d=>d.min?`약 ${hm(d.min)}`:d.km?`직선 ${d.km}km`:"거리 미입력";
function regionOf(a){
  if(/인천/.test(a))return "west";
  if(/충청|충북|충남|세종|대전/.test(a))return "cc";
  if(/서울|안양|의왕|군포|과천|광명|부천|시흥/.test(a))return "city";
  if(/안산|화성|평택|오산|수원|안성/.test(a))return "near";
  return "east";
}
function nearCamp(g){
  return {id:"gc"+g.gc,n:g.name,a:g.addr,r:regionOf(g.addr),km:g.km,p:0,min:0,near:true,g,gc:g.gc,
    fit:"check",dog2:"check",dogT:`고캠핑: 반려동물 ${g.pet}`,fire:"ok",fireT:"고캠핑: 개별 화로대",
    auto:/자동차야영장/.test(g.type)?true:"check",autoT:/자동차야영장/.test(g.type)?"고캠핑: 자동차야영장":"고캠핑 정보로는 차 옆 주차인지 알 수 없어요",
    w:g.sbrs.includes("전기")?"전기 있음 (W는 문의)":"",ask:"무게·마리 수, 때찌 짖음 괜찮은지",sc:"field"};
}

function seed(s){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return ()=>((h=Math.imul(h^h>>>15,2246822507)^Math.imul(h^h>>>13,3266489909))>>>0)/4294967296}
const SKY={day:["#7fc0ff","#e3f2ff","#fff7c2","#7fbf86","#3d7f58"],sunset:["#ff8a5c","#ffd59e","#fff2c9","#9c6178","#4b3557"],dusk:["#3a4b8c","#f3a17a","#ffe3b8","#4c4a7a","#272a4f"],night:["#0d1836","#2c3f73","#f4f1d0","#1f2b4c","#111a33"]};
function hills(r,y,amp){let d=`M0 260L0 ${(y+amp*(r()-.5)).toFixed(1)}`;for(let x=0;x<400;x+=100)d+=`Q${x+50} ${(y-amp*r()).toFixed(1)} ${x+100} ${(y+amp*(r()-.5)).toFixed(1)}`;return d+"L400 260Z"}
function thumb(d,uid){
  const ph=gco(d);
  if(ph&&ph.img)return `<img src="${esc(ph.img)}" alt="" loading="${uid==="h"||uid==="b"?"eager":"lazy"}" decoding="async" referrerpolicy="no-referrer" onerror="window.__noimg(this)" data-id="${esc(d.id)}" data-u="${uid}"><span class="credit">${CREDIT}</span>`;
  return art(d,uid);
}
/* 사진을 못 받으면 그림 썸네일로 바꿔요 */
window.__noimg=img=>{const d=all().find(x=>x.id===img.dataset.id);const c=img.nextElementSibling;if(c&&c.classList.contains("credit"))c.remove();img.outerHTML=d?art(d,img.dataset.u):""};
function art(d,uid){
  const r=seed(d.n);const t=["day","sunset","dusk","night"][Math.floor(r()*4)];const c=SKY[t];const id=uid+d.id;const sc=d.sc||["mtn","sea","lake","field"][Math.floor(r()*4)];
  let s=`<svg viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="g${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c[0]}"/><stop offset="1" stop-color="${c[1]}"/></linearGradient><linearGradient id="w${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c[1]}" stop-opacity=".9"/><stop offset="1" stop-color="${c[4]}"/></linearGradient></defs><rect width="400" height="260" fill="url(#g${id})"/>`;
  if(t==="night")for(let i=0;i<26;i++)s+=`<circle cx="${(r()*400).toFixed(0)}" cy="${(r()*120).toFixed(0)}" r="${(r()*1.4+.4).toFixed(1)}" fill="#fff" opacity="${(r()*.6+.3).toFixed(2)}"/>`;
  const sx=60+r()*280,sy=t==="day"?50+r()*30:t==="night"?45:95+r()*25;
  s+=`<circle cx="${sx.toFixed(0)}" cy="${sy.toFixed(0)}" r="${t==="night"?16:24}" fill="${c[2]}" opacity=".95"/>`;
  if(sc==="city"){for(let x=0;x<400;x+=22+r()*14){const h=40+r()*80;s+=`<rect x="${x.toFixed(0)}" y="${(190-h).toFixed(0)}" width="${(16+r()*12).toFixed(0)}" height="${h.toFixed(0)}" fill="${c[3]}" opacity=".75"/>`}s+=`<path d="${hills(r,200,20)}" fill="${c[4]}"/>`}
  else if(sc==="sea"){s+=`<path d="${hills(r,150,40)}" fill="${c[3]}" opacity=".55"/><rect y="160" width="400" height="100" fill="url(#w${id})"/>`;for(let i=0;i<6;i++)s+=`<rect x="${(r()*360).toFixed(0)}" y="${(172+i*13).toFixed(0)}" width="${(20+r()*40).toFixed(0)}" height="2" rx="1" fill="${c[2]}" opacity=".5"/>`;s+=`<path d="M0 260L0 222Q120 206 230 220T400 214L400 260Z" fill="${c[4]}"/>`}
  else if(sc==="lake"){s+=`<path d="${hills(r,140,60)}" fill="${c[3]}" opacity=".6"/><path d="${hills(r,165,40)}" fill="${c[3]}"/><rect y="182" width="400" height="78" fill="url(#w${id})" opacity=".9"/><path d="M0 260L0 224Q140 210 260 226T400 220L400 260Z" fill="${c[4]}"/>`}
  else if(sc==="field"){s+=`<path d="${hills(r,160,30)}" fill="${c[3]}" opacity=".6"/><path d="${hills(r,195,24)}" fill="${c[4]}"/>`;for(let i=0;i<5;i++){const x=20+r()*360;s+=`<path d="M${x.toFixed(0)} 205l10-34 10 34z" fill="${c[4]}" opacity=".9"/>`}}
  else{s+=`<path d="${hills(r,120,90)}" fill="${c[3]}" opacity=".5"/><path d="${hills(r,160,70)}" fill="${c[3]}"/><path d="${hills(r,205,30)}" fill="${c[4]}"/>`}
  const tx=200+r()*100;
  s+=`<circle cx="${(tx+62).toFixed(0)}" cy="234" r="22" fill="#ffb347" opacity="${t==="day"?.15:.35}"/><path d="M${tx.toFixed(0)} 240l28-44 28 44z" fill="#f6ead6"/><path d="M${(tx+28).toFixed(0)} 240l-9 0 9-18 9 18z" fill="#c9a77a"/><path d="M${(tx+56).toFixed(0)} 240l6-12 6 12z" fill="#ff7a2e"/><path d="M${(tx+59).toFixed(0)} 240l3-7 3 7z" fill="#ffd36b"/></svg>`;
  return s;
}
const won=n=>n?"₩"+Number(n).toLocaleString("ko-KR"):"가격 미입력";
const hm=m=>!m?"거리 미입력":m<60?`${m}분`:`${Math.floor(m/60)}시간${m%60?` ${m%60}분`:""}`;
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const heartSvg='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.6-9 9-9 9z"/></svg>';
const kw=d=>d.kw||d.n.replace(/^(강화|제천|태안|하남|용인|파주|여주|가평|포천|평택|화성|대부도|안양|의왕|안산|상암|인천|고양|충주|석모도|영흥도)\s/,"");
const gcUrl=d=>{const g=d.gc||(gco(d)&&gco(d).gc);return g?`https://www.gocamping.or.kr/bsite/camp/info/read.do?c_no=${encodeURIComponent(g)}`:(d.url&&d.url.includes("gocamping")?d.url:"")};
function links(d){
  const k=encodeURIComponent(kw(d));
  const cf=d.url&&d.url.includes("camfit")?d.url:`https://camfit.co.kr/search/result?keyword=${k}`;
  const a=[["캠핏","#21a366","C",cf],gcUrl(d)?["고캠핑","#3a6fd8","G",gcUrl(d)]:null,["카페 후기","#03c75a","N",`https://search.naver.com/search.naver?where=article&query=${k}`],["지도","#03c75a","M",`https://map.naver.com/p/search/${k}`]].filter(Boolean);
  return `<nav class="links" aria-label="바로가기" style="--n:${a.length}">${a.map(([l,c,i,u])=>`<a class="lk" href="${esc(u)}" target="_blank" rel="noopener"><b style="background:${c}">${i}</b>${l}</a>`).join("")}</nav>`;
}
function pool(){
  let r=all().filter(d=>view==="saved"?saved.has(d.id):d.near?false:view==="solo"?true:!d.solo);
  if(region!=="all")r=r.filter(d=>d.r===region);
  for(const k of need){const f=NEEDS.find(n=>n[0]===k);if(f)r=r.filter(f[2])}
  if(q){const t=q.toLowerCase();r=r.filter(d=>(d.n+d.a+(R[d.r]||[""])[0]).toLowerCase().includes(t))}
  return r.sort((a,b)=>sort==="score"?(starOf(b)-starOf(a))||(a.min||999)-(b.min||999):sort==="dist"?(a.min||999)-(b.min||999)||(a.p||0)-(b.p||0):(a.p||1e9)-(b.p||1e9)||(a.min||0)-(b.min||0));
}
function summary(d){return (d.solo||view==="solo")?[(d.day||[]).length?"☀️ 당일 가능":"",(d.day||[]).some(x=>x.dog===true)||(!d.solo&&d.dog2!=="no")?"🐶 반려견 가능":"",d.fire==="ok"?"🔥 불멍 가능":"🔥 불멍 문의",d.auto?"🚗 오토":"🚶 차 옆 주차 아님"].filter(Boolean).join(" · "):[d.dogT?`🐶 ${d.dogT}`:"",d.fire==="ok"?"🔥 불멍":"🔥 문의",d.fence?"🐾 펜스":""].filter(Boolean).join(" · ")}
function rvLine(d){if(!d.rv)return notes[d.id]?`<span class="rv mild">📝 내 메모 있음</span>`:"";const[i,l]=RVL[d.rv.lv];return `<span class="rv ${d.rv.lv}">${i} ${esc(d.rv.s)}</span>`}
function card(d){
  const badge=d.near?`<span class="badge check">고캠핑 추천</span>`:(d.solo||view==="solo")?"":`<span class="badge${d.fit==="check"?" check":""}">${d.fit==="ok"?"바로 예약 OK":"📞 전화 확인"}</span>`;
  const flag=d.rv&&["bad","warn"].includes(d.rv.lv)?`<span class="flag ${d.rv.lv==="warn"?"warn":""}">${RVL[d.rv.lv][0]} ${RVL[d.rv.lv][1]}</span>`:"";
  return `<article class="card"><div style="position:relative"><button class="ph" data-open="${d.id}" aria-label="${esc(d.n)} 자세히">${thumb(d,"f")}${badge}${flag}</button>
  ${d.user?'<span class="mine">내가 추가</span>':""}<button class="heart" data-heart="${d.id}" aria-pressed="${saved.has(d.id)}" aria-label="${esc(d.n)} 찜">${heartSvg}</button></div>
  <button class="ct" data-open="${d.id}"><span class="row1"><b>${esc(d.n)}</b>${starTag(d)}</span>
  <span class="l2">${(R[d.r]||["지역 미입력"])[0]} · ${dist(d)}</span><span class="l3">${esc(summary(d))}</span>${rvLine(d)}
  <span class="price"><b>${d.near?"요금 문의":won(d.p)}</b> <small>${d.near?"":"/박"}${d.fee&&view!=="solo"?` · 반려견 ${esc(d.fee)}`:""}</small></span></button></article>`;
}
function mini(d){return `<button class="mini" data-open="${d.id}"><span class="ph">${thumb(d,"m")}</span><b>${esc(d.n)}</b><small>${starTag(d,true)} · ${dist(d)}${d.near&&d.g.pet?` · 🐶 ${esc(d.g.pet)}`:""}${d.rv?` · ${RVL[d.rv.lv][0]}`:""}</small><span class="pr">${d.near?"요금 문의":won(d.p)}<small style="font-weight:400">${d.near?"":" /박"}</small></span></button>`}
function emptyBox(t,s){return `<div class="empty"><b>${t}</b><span>${s}</span>${need.size||region!=="all"||q?'<button class="link" data-reset>조건 초기화</button>':""}</div>`}
function renderCats(){
  const regs=view==="check"?[]:Object.keys(R).filter(k=>k==="all"||all().some(d=>d.r===k&&(view==="solo"?true:view==="saved"?saved.has(d.id):!d.solo)));
  if(!regs.includes(region))region="all";
  const el=document.getElementById("cats");el.innerHTML=regs.map(k=>`<button class="cat" role="tab" data-r="${k}" aria-selected="${region===k}"><i>${R[k][1]}</i>${R[k][0]}</button>`).join("");el.hidden=view==="check";
  const n=need.size;const fc=document.getElementById("fcount");fc.hidden=!n;fc.textContent=n;
}
const chip=([k,l])=>`<button class="qc" data-need="${k}" aria-pressed="${need.has(k)}">${l}${need.has(k)?'<span class="qx" aria-hidden="true">✕</span>':""}</button>`;
function quickRow(){return `<div class="quick bleed" role="group" aria-label="필터">${NEEDS.filter(n=>(view==="solo"||n[0]!=="dogday")&&view!=="solo"||["fire","h1","clean","heat","day","dogday"].includes(n[0])).map(chip).join("")}${need.size>1?'<button class="qreset" data-reset>초기화</button>':""}</div>`}
/* 정렬: 목록 제목 오른쪽 (필터와 따로) */
const SORTS=[["dist","가까운 순"],["price","저렴한 순"],["score","평점 높은 순"]];
function sortCtl(){return `<div class="sortwrap"><button class="sortbtn" type="button" data-sortmenu aria-haspopup="true" aria-expanded="false">${SORTS.find(x=>x[0]===sort)[1]}<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button><div class="sortmenu" role="menu" hidden>${SORTS.map(([k,l])=>`<button type="button" role="menuitemradio" aria-checked="${sort===k}" data-sortset="${k}">${l}${sort===k?'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg>':""}</button>`).join("")}</div></div>`}
const addBtn=`<button class="addbtn" data-add>＋ 캠핏에서 찾은 캠핑장 직접 추가</button>`;
function render(){
  renderCats();
  const v=document.getElementById("view");const r=pool();let h="";
  paintMapToggle();
  if(mapMode&&view!=="check"){h=quickRow()+`<div class="mapwrap bleed"><div id="map" role="region" aria-label="캠핑장 지도"></div><p class="maphint" id="maphint"></p></div>`;v.innerHTML=h;animate=false;
    document.querySelectorAll("[data-go]").forEach(b=>b.setAttribute("aria-current",b.dataset.go===view?"page":"false"));drawMap(r);return}
  if(view==="home"){
    h+=quickRow();
    if(!q&&!need.size&&region==="all"){
      h+=`<div class="bnwrap"><div class="banners" id="bn">${PICKS.filter(p=>byId(p.id)).map(p=>{const d=byId(p.id);return `<button class="bn" data-open="${d.id}">${thumb(d,"b")}<span class="k">${p.k}</span><b>${p.t}</b><small>${p.s}</small></button>`}).join("")}</div><span class="bnpage" id="bnpage">1 / ${PICKS.length}</span></div>`;
    }
    const ok=r.filter(d=>d.fit==="ok"&&!(d.rv&&d.rv.lv==="bad"));
    if(ok.length)h+=`<section class="sec"><div class="sh"><h2>바로 예약해도 되는 곳</h2><span>두 마리 OK · 후기 주의 제외 · ${ok.length}곳</span></div><div class="rail bleed">${ok.map(mini).join("")}</div></section>`;
    const nr=NEAR.filter(d=>(region==="all"||d.r===region)&&(!q||(d.n+d.a).toLowerCase().includes(q.toLowerCase())));
    if(nr.length&&!need.size)h+=`<section class="sec"><div class="sh"><h2>근처 고캠핑 추천</h2><span>반려동물·개별 화로대 · ${nr.length}곳</span></div><div class="rail bleed">${nr.map(mini).join("")}</div><p class="hint" style="margin:8px 0 0">고캠핑 공공데이터로 자동으로 고른 곳이라 아직 확인하지 않았어요. 무게·마리 수는 꼭 물어보세요.</p></section>`;
    h+=`<section class="sec"><div class="sh"><h2>${region==="all"?"전체 후보":R[region][0]} <small>${r.length}곳</small></h2>${r.length>1?sortCtl():""}</div>${r.length?`<div class="feed">${r.map(card).join("")}</div>`:emptyBox("조건에 맞는 곳이 없어요","조건을 하나 풀어보세요")}</section>`;
    h+=`<section class="sec">${addBtn}</section><p class="note">캠핏·고캠핑 운영정책과 캠핏 캠핑로그(곳마다 최근 10~80개)를 2026년 11월 9일에 확인했어요. 네이버 카페 후기는 로그인이 필요해서 직접 읽지 못했고, 각 캠핑장 상세에 검색 링크를 달아뒀어요. 가격은 평일 1박 쿠폰가, 거리는 범계 출발 대략치예요.</p>${creditNote()}`;
  }else if(view==="solo"){
    h+=quickRow()+`<section class="sec" style="margin-top:8px"><div class="sh"><h2>둘이서 가볍게 <small>${r.length}곳</small></h2>${r.length>1?sortCtl():""}</div><p class="hint" style="margin:-6px 0 12px">둘이서 가볍게 갈 수 있는 모든 곳 · 반려견과 갈 곳은 🐶 필터, 당일만은 ☀️ 필터</p>${r.length?`<div class="feed">${r.map(card).join("")}</div>`:emptyBox("조건에 맞는 곳이 없어요","조건을 하나 풀어보세요")}</section><section class="sec">${addBtn}</section>`;
  }else if(view==="saved"){
    h+=`<section class="sec" style="margin-top:16px"><div class="sh"><h2>찜한 캠핑장</h2><span>${r.length}곳</span></div>${r.length?`<div class="feed">${r.map(card).join("")}</div>`:emptyBox("아직 찜한 곳이 없어요","사진 오른쪽 위 하트를 눌러 모아보세요")}</section>`;
  }else{
    h+=accountBox()+`<section class="sec"><div class="sh"><h2>예약 전 전화 체크리스트</h2><span>${checked.size} / ${CALLS.length}</span></div><div class="list">${CALLS.map((c,i)=>`<label class="li"><input type="checkbox" data-call="${i}" ${checked.has(i)?"checked":""}><span>${c}</span></label>`).join("")}</div></section>
    <section class="sec"><div class="sh"><h2>내가 추가한 캠핑장</h2><span>${added.length}곳</span></div>${added.length?`<div class="feed">${added.map(a=>card({...a,user:true})).join("")}</div>`:""}<div style="margin-top:12px">${addBtn}</div></section>
    <section class="sec"><div class="sh"><h2>알아봤지만 안 되는 곳</h2><span>${DROP.length}곳</span></div><div class="list">${DROP.map(({n:a,why:b})=>`<div class="li drop"><b>${a}</b><span>${b}</span></div>`).join("")}</div></section>
    <section class="sec"><div class="sh"><h2>표시 설명</h2></div><div class="legend"><span>🚩 후기 주의 (관리·소음 문제 반복)</span><span>⚠️ 참고할 단점</span><span>💬 사소한 단점</span><span>👍 후기 깨끗</span></div></section>
    <p class="note">${syncNote()}</p>`;
  }
  v.innerHTML=`<div ${animate?"data-view":""}>${h}</div>`;animate=false;
  document.querySelectorAll("[data-go]").forEach(b=>b.setAttribute("aria-current",b.dataset.go===view?"page":"false"));
  const sn=document.getElementById("savedN");sn.hidden=!saved.size;sn.textContent=saved.size;
  const bn=document.getElementById("bn");
  if(bn)bn.addEventListener("scroll",()=>{const w=bn.firstElementChild.getBoundingClientRect().width+12;document.getElementById("bnpage").textContent=`${Math.min(PICKS.length,Math.round(bn.scrollLeft/w)+1)} / ${PICKS.length}`},{passive:true});
}
/* 바텀시트 */
const sheet=document.getElementById("sheet"),scrim=document.getElementById("scrim");let lastFocus=null,sheetFor=null;
function openSheet(title,html,forId,bare){
  if(!sheet.classList.contains("on"))lastFocus=document.activeElement;sheetFor=forId||null;
  sheet.classList.toggle("bare",!!bare);sheet.scrollTop=0;
  document.getElementById("sheetTitle").textContent=title;document.getElementById("sheetBody").innerHTML=html;
  sheet.hidden=false;requestAnimationFrame(()=>{sheet.classList.add("on");scrim.classList.add("on")});
  document.getElementById("closeSheet").focus({preventScroll:true});document.documentElement.style.overflow="hidden";
}
function closeSheet(){sheet.classList.remove("on");scrim.classList.remove("on");document.documentElement.style.overflow="";sheetFor=null;
  setTimeout(()=>{if(!sheet.classList.contains("on"))sheet.hidden=true},430);if(lastFocus)lastFocus.focus({preventScroll:true})}
function cond(icon,label,state,text){return `<div class="ctile ${state}"><div class="ctt"><i aria-hidden="true">${icon}</i><b>${label}</b><span class="st ${state}">${state==="ok"?"확인됨":state==="check"?"물어보기":"안 됨"}</span></div><small>${esc(text)}</small></div>`}
function gallery(d){
  const g=gco(d);const imgs=g&&g.imgs&&g.imgs.length?g.imgs:[];
  if(imgs.length<2)return `<div class="hero">${thumb(d,"h")}</div>`;
  return `<div class="hero gal"><div class="galrow" id="gal">${imgs.map((u,i)=>`<img src="${esc(u)}" alt="" loading="${i?"lazy":"eager"}" decoding="async" referrerpolicy="no-referrer" onerror="this.remove()">`).join("")}</div><span class="credit">${CREDIT}</span><span class="galn" id="galn">1 / ${imgs.length}</span></div>`;
}
/* 우리 정보와 고캠핑 정보가 다르면 알려줘요 */
function diffs(d,g){
  if(!g)return [];const out=[];
  if(!d.solo&&g.pet==="불가능")out.push("고캠핑엔 반려동물 '불가능'으로 나와요");
  else if(!d.solo&&g.pet==="가능(소형견)"&&d.dog2==="ok"&&!/kg/.test(d.dogT||""))out.push("고캠핑엔 '소형견만' 가능으로 나와요");
  if(d.fire==="ok"&&g.fire==="불가")out.push("고캠핑엔 화로대 '불가'로 나와요");
  if(d.fire==="ok"&&g.fire==="공동취사장")out.push("고캠핑엔 화로대가 '공동'으로 나와요");
  if(d.fire==="check"&&g.fire==="개별"&&!d.near)out.push("고캠핑엔 개별 화로대 가능으로 나와요 (불멍 될 수도 있어요)");
  if(d.w11&&g.sbrs.length&&!g.sbrs.includes("전기"))out.push("고캠핑 시설 목록에 전기가 없어요");
  return out;
}
function gcBox(g,d){
  const fl=Object.entries(g.floor||{}).map(([k,v])=>`${k} ${v}`).join(" · ");
  const row=(i,l,t)=>t?`<div class="cd"><i>${i}</i><div>${l}<small>${t}</small></div></div>`:"";
  const tel=(g.tel||"").replace(/[^0-9-]/g,"");
  return `<details class="gcbox"><summary><span><b>🏕️ 고캠핑 정보</b>${g.intro?`<small>${esc(g.intro)}</small>`:""}</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></summary><div class="conds">
   ${row("📞","전화",tel?`<a href="tel:${tel}">${esc(g.tel)}</a>`:"")}
   ${row("📅","운영",esc([g.season&&`${g.season}`,g.days].filter(Boolean).join(" · ")))}
   ${row("🪨","사이트 바닥",esc(fl))}
   ${row("🚿","시설",esc((g.sbrs||[]).join(" · ")))}
   ${row("🐶","반려동물",esc(g.pet))}
   ${row("🔥","화로대",esc(g.fire))}
   ${row("🔗","홈페이지·예약",[g.home&&`<a href="${esc(g.home)}" target="_blank" rel="noopener">홈페이지</a>`,g.book&&g.book!==g.home&&`<a href="${esc(g.book)}" target="_blank" rel="noopener">예약 페이지</a>`].filter(Boolean).join(" · "))}
  </div><small class="hint">출처: 고캠핑(한국관광공사) · ${esc(GC.updated||"")} 기준${d.near?" · 자동 추천이라 직접 확인 전이에요":""}</small></details>`;
}
function detail(id){
  const d=all().find(x=>x.id===id);if(!d)return;
  let c="";
  if(!d.solo)c+=cond("🐶","반려견 2마리",d.dog2||"check",d.dogT||"정보 없음");
  c+=cond("🔥","장작 불멍",d.fire==="ok"?"ok":d.fire==="no"?"no":"check",d.fireT||(d.fire==="ok"?"화로대 사용 가능":d.fire==="no"?"금지":"정책에 없어서 확인 필요"));
  c+=cond("⚡","전기",d.w?"ok":"check",d.w||"정책에 W 표기 없음 · 전기장판은 대부분 OK");
  c+=cond("🚗","오토캠핑",d.auto===true?"ok":d.auto==="check"?"check":"no",d.autoT||(d.auto?"차를 사이트 옆에":"주차장에서 걸어서 이동"));
  if(d.fence)c+=cond("🐾","펜스·울타리","ok","반려견 사이트에 울타리");
  if(d.heat)c+=cond("🌡️","난로 대여",d.heat.st,d.heat.t||"");
  if((d.day||[]).length)c+=cond("☀️","당일(캠프닉)","ok",d.day.map(x=>`${x.n}${x.time?" "+x.time:""}${x.price?" · "+x.price:""}${x.dog===true?" · 🐶 가능":x.dog===false?" · 🐶 불가":""}`).join(" / "));
  const rv=d.rv?`<div class="rvbox ${d.rv.lv}"><b>${RVL[d.rv.lv][0]} 후기 요약: ${RVL[d.rv.lv][1]}</b>${d.rv.pts.length?`<ul>${d.rv.pts.map(p=>`<li>${esc(p)}</li>`).join("")}</ul>`:""}<small>캠핏 캠핑로그 최근 후기 키워드 분석 · 2026-11-09</small></div>`:(d.user?"":`<div class="rvbox mild"><small>캠핏 후기가 없어 분석하지 못했어요. 아래 네이버 카페 후기로 확인해 보세요.</small></div>`);
  const g=gco(d);
  const asks=[...diffs(d,g),...(d.ask?d.ask.split(/\s*·\s*|,\s*/).filter(Boolean).map(x=>x.endsWith("?")?x:x):[]),...(d.askBlog?[d.askBlog]:[])];
  const facts=[d.plus,...(d.memo?d.memo.split(/\s*·\s*/):[]),...(d.extra||[])].filter(Boolean);
  const tel=g&&g.tel?g.tel.replace(/[^0-9-]/g,""):"";
  const book=d.near?{u:d.g.book||gcUrl(d),t:d.g.book?"예약 페이지":"고캠핑에서 보기"}:d.url?{u:d.url,t:"예약하러 가기"}:{u:`https://camfit.co.kr/search/result?keyword=${encodeURIComponent(kw(d))}`,t:"캠핏에서 찾기"};
  openSheet(d.n,`${gallery(d)}
   <div class="dt"><h3>${esc(d.n)}</h3>
    <p class="dmeta">${(R[d.r]||["지역 미입력"])[0]} · 범계에서 ${dist(d)}${d.lg?` · 캠핑로그 ${d.lg.toLocaleString()}`:""}</p>
    ${d.a?`<p class="daddr"><span>${esc(d.a)}</span><button class="copy" data-copy="${esc(d.a)}">복사</button></p>`:""}</div>
   ${scoreBox(d)}
   <section class="dsec" aria-label="조건"><div class="ctg">${c}</div></section>
   ${asks.length?`<section class="askbox"><b>📞 전화로 확인할 것</b><ul>${asks.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>${diffs(d,g).length?`<small>고캠핑 정보와 다른 부분이 있어요. 고캠핑 정보가 예전 것일 수 있어요.</small>`:""}</section>`:""}
   ${rv}
   ${blogBox(d)}
   ${spotsBox(d)}
   ${facts.length?`<section class="facts"><b>📌 알아둘 것</b><ul>${facts.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></section>`:""}
   ${g?gcBox(g,d):""}
   ${links(d)}
   <div class="memo-in"><b>📝 내 메모</b><textarea id="noteText" placeholder="캠핏·카페에서 확인한 것, 통화 결과 등을 적어두세요">${esc(notes[d.id]||"")}</textarea><div class="row"><span class="hint" id="noteState">${shared.mode==="live"?"공유 기록에 저장돼요":"이 브라우저에 저장돼요"}</span><span style="display:flex;gap:8px">${d.user?`<button class="sbtn danger" data-del="${d.id}">삭제</button><button class="sbtn ghost" data-edit="${d.id}">수정</button>`:""}<button class="sbtn" data-savenote="${d.id}">메모 저장</button></span></div></div>
   <div class="cta"><div class="p"><b>${d.near?"요금 문의":won(d.p)}</b>${d.near?"":" /박"}<small>${esc(d.ps||"")}${d.fee?` · 반려견 ${esc(d.fee)}`:""}</small></div>
    ${tel?`<a class="callbtn" href="tel:${tel}" aria-label="전화 걸기 ${esc(g.tel)}"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg></a>`:""}
    <a class="go" href="${esc(book.u)}" target="_blank" rel="noopener">${book.t}</a></div>`,d.id,true);
}
function filterSheet(){
  openSheet("필터",`<div class="fs"><h4>꼭 필요한 것</h4><div class="opts">${NEEDS.map(chip).join("")}</div>${need.size?'<button class="link" data-reset style="margin-top:6px;padding-left:0">필터 모두 풀기</button>':""}</div>
  <div class="legend"><span>🚩 후기 주의</span><span>⚠️ 참고할 단점</span><span>💬 사소한 단점</span><span>👍 후기 깨끗</span></div>
  <button class="apply" data-close>${pool().length}곳 보기</button>`);
}
function addSheet(edit){
  const a=edit||{};const opt=(v,l,cur)=>`<option value="${v}" ${cur===v?"selected":""}>${l}</option>`;
  openSheet(edit?"캠핑장 수정":"캠핑장 직접 추가",`<p class="hint" style="margin:0">캠핏에서 찾은 곳을 적어두면 목록에 같이 나와요. 이름만 적어도 저장돼요.</p>
  <div class="links"><a class="lk" href="https://camfit.co.kr/search/result?reservationOptions=canBringPet&types=autoCamping" target="_blank" rel="noopener"><b style="background:#21a366">C</b>캠핏 반려견·오토 검색</a><a class="lk" href="https://camfit.co.kr/camp/exhibition?sort=priceAsc&exhibitionCode=E340&type=additional" target="_blank" rel="noopener"><b style="background:#21a366">C</b>반려견 기획전</a></div>
  <form class="form" id="addForm">
   <label>캠핑장 이름<input name="n" required value="${esc(a.n||"")}" placeholder="예: 강화 ○○캠핑장"></label>
   <label>캠핏 링크<input name="url" type="url" value="${esc(a.url||"")}" placeholder="https://camfit.co.kr/camp/..."></label>
   <div class="two"><label>누구랑<select name="solo">${opt("0","🐶 반려견과",a.solo?"1":"0")}${opt("1","🧺 둘이서",a.solo?"1":"0")}</select></label>
   <label>지역<select name="r">${Object.keys(R).filter(k=>k!=="all").map(k=>opt(k,R[k][0],a.r||"west")).join("")}</select></label></div>
   <label>주소<input name="a" value="${esc(a.a||"")}" placeholder="예: 인천 강화군 ○○면"></label>
   <div class="two"><label>평일 1박 (원)<input name="p" type="number" inputmode="numeric" min="0" step="1000" value="${a.p||""}"></label><label>범계에서 (분)<input name="min" type="number" inputmode="numeric" min="0" value="${a.min||""}"></label></div>
   <label>반려견 규정<input name="dogT" value="${esc(a.dogT||"")}" placeholder="예: 10kg 미만 2마리, 1마리 5천원"></label>
   <div class="two"><label>두 마리 가능?<select name="dog2">${opt("ok","✅ 확인됨",a.dog2)}${opt("check","📞 물어봐야 함",a.dog2||"check")}${opt("no","❌ 안 됨",a.dog2)}</select></label>
   <label>장작 불멍<select name="fire">${opt("ok","🔥 가능",a.fire)}${opt("check","❓ 모름",a.fire||"check")}${opt("no","🚫 금지",a.fire)}</select></label></div>
   <div class="two"><label>전력<input name="w" value="${esc(a.w||"")}" placeholder="예: 600W"></label><label>차 옆 주차<select name="auto">${opt("1","🚗 가능",a.auto===false?"0":"1")}${opt("0","🚶 안 됨",a.auto===false?"0":"1")}</select></label></div>
   <label>후기 메모<textarea name="memo" rows="3" placeholder="예: 화장실 깨끗, 매너타임 잘 지켜짐">${esc(a.memo||"")}</textarea></label>
   <button class="apply" type="submit">${edit?"수정 저장":"추가하기"}</button><span class="hint" id="addState"></span>
  </form>`);
  document.getElementById("addForm").addEventListener("submit",e=>{e.preventDefault();saveAdded(new FormData(e.target),edit&&edit.id)});
}
/* 저장 동작: 이 브라우저에 먼저 저장하고, 로그인돼 있으면 공유 기록에도 올려요 */
function commit(){local.set(KEY,snapshot());shared.push()}
function persist(){commit()}
function saveNote(id){
  const t=document.getElementById("noteText").value.trim().slice(0,2000);const st=document.getElementById("noteState");
  if(t)notes[id]=t;else delete notes[id];commit();
  st.textContent=shared.mode==="live"?"공유 기록에 저장됐어요 ✓":"이 브라우저에 저장됐어요 ✓";
  render();
}
function saveAdded(fd,editId){
  const o={n:String(fd.get("n")||"").trim().slice(0,60),url:String(fd.get("url")||"").trim().slice(0,300),solo:fd.get("solo")==="1"?1:0,r:fd.get("r"),a:String(fd.get("a")||"").slice(0,120),p:+fd.get("p")||0,min:+fd.get("min")||0,dogT:String(fd.get("dogT")||"").slice(0,80),dog2:fd.get("dog2"),fire:fd.get("fire"),w:String(fd.get("w")||"").slice(0,30),auto:fd.get("auto")==="1",memo:String(fd.get("memo")||"").slice(0,400),fit:fd.get("dog2")==="ok"?"ok":"check"};
  if(!o.n)return;if(o.url&&!/^https:\/\//.test(o.url))o.url="";
  o.id=editId||("u"+Date.now().toString(36)+Math.random().toString(36).slice(2,6));
  added=added.filter(x=>x.id!==o.id).concat(o);commit();
  closeSheet();render();toast(editId?"수정했어요":"추가했어요");
}
function delAdded(id){
  added=added.filter(x=>x.id!==id);saved.delete(id);delete notes[id];commit();
  closeSheet();render();toast("삭제했어요");
}
document.addEventListener("click",e=>{
  const t=e.target.closest("button,[data-open]");if(!t)return;
  if(t.dataset.heart){const id=t.dataset.heart;saved.has(id)?saved.delete(id):saved.add(id);persist("saved");t.setAttribute("aria-pressed",saved.has(id));const sn=document.getElementById("savedN");sn.hidden=!saved.size;sn.textContent=saved.size;if(view==="saved")render();return}
  if(t.dataset.open){detail(t.dataset.open);return}
  if(t.dataset.go){location.hash=t.dataset.go;return}
  if(t.dataset.r){region=t.dataset.r;render();return}
  if(t.dataset.need){const k=t.dataset.need;need.has(k)?need.delete(k):need.add(k);const inSheet=t.closest("#sheet");render();if(inSheet)filterSheet();return}
  if(t.hasAttribute("data-sortmenu")){const m=t.nextElementSibling;const open=m.hidden;closeSortMenus();m.hidden=!open;t.setAttribute("aria-expanded",open);if(open)m.querySelector('[aria-checked="true"]').focus();return}
  if(t.dataset.sortset){sort=t.dataset.sortset;render();const b=document.querySelector("[data-sortmenu]");if(b)b.focus({preventScroll:true});return}
  if(t.hasAttribute("data-reset")){const inSheet=t.closest("#sheet");need.clear();if(!inSheet&&!t.classList.contains("qreset")){region="all";q="";document.getElementById("q").value=""}render();if(inSheet)filterSheet();return}
  if(t.hasAttribute("data-close")||t.id==="closeSheet"){closeSheet();return}
  if(t.hasAttribute("data-add")){addSheet();return}
  if(t.dataset.edit){addSheet(added.find(x=>x.id===t.dataset.edit));return}
  if(t.dataset.del){if(t.dataset.armed){delAdded(t.dataset.del)}else{t.dataset.armed="1";t.textContent="한 번 더 누르면 삭제"}return}
  if(t.dataset.savenote){saveNote(t.dataset.savenote);return}
  if(t.id==="openFilter"){e.preventDefault();filterSheet();return}
  if(t.dataset.copy){const s=t.dataset.copy;try{navigator.clipboard.writeText(s).then(()=>{t.textContent="복사됨"},()=>{t.textContent="길게 눌러 복사"})}catch(_){t.textContent="길게 눌러 복사"}}
});
scrim.addEventListener("click",closeSheet);
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&sheet.classList.contains("on"))closeSheet()});
document.addEventListener("change",e=>{if(e.target.dataset.call!==undefined){const i=+e.target.dataset.call;e.target.checked?checked.add(i):checked.delete(i);persist("calls");render()}});
document.getElementById("q").addEventListener("input",e=>{q=e.target.value.trim();if(view==="check")location.hash="home";else render()});
function route(){const h=location.hash.slice(1);view=["home","solo","saved","check"].includes(h)?h:"home";sort=view==="solo"?"price":"dist";if(sheet.classList.contains("on"))closeSheet();animate=true;render();window.scrollTo({top:0})}

/* ---------- 공유 기록 (Supabase camp_note 표의 'shared' 줄 하나) ---------- */
const shared={sb:null,table:"camp_note",user:null,mode:"off",timer:null,lastSent:"",ch:null,
  push(){
    if(this.mode!=="live")return;
    clearTimeout(this.timer);
    this.timer=setTimeout(()=>this.flush(),600);
  },
  async flush(){
    const body=snapshot();const s=JSON.stringify(body);if(s===this.lastSent)return;
    const {error}=await this.sb.from(this.table).upsert({id:"shared",data:body,updated_at:new Date().toISOString()});
    if(error){
      if(/42501|permission|row-level/i.test((error.code||"")+(error.message||""))){this.mode="readonly"}else{this.mode="error"}
      paintSync();return;
    }
    this.lastSent=s;
  }
};
function toast(msg){let t=document.querySelector(".toast");if(!t){t=document.createElement("div");t.className="toast";t.setAttribute("role","status");document.body.appendChild(t)}t.textContent=msg;clearTimeout(toast.t);t.hidden=false;toast.t=setTimeout(()=>{t.hidden=true},2400)}
function paintSync(){
  const el=document.getElementById("syncbar");
  const msg={off:"",local:"이 브라우저에만 저장돼요",loading:"공유 기록 불러오는 중…",live:`공유 기록에 저장 중 · ${shared.user?esc(shared.user.email):""}`,readonly:"이 계정은 보기만 할 수 있어요",error:"공유 저장에 잠시 실패했어요 · 이 기기엔 남아 있어요"}[shared.mode];
  el.hidden=!msg;el.className="syncbar "+shared.mode;
  el.innerHTML=msg?`<i aria-hidden="true"></i><span>${msg}</span>${shared.mode==="local"||shared.mode==="readonly"?'<button type="button" data-login>로그인</button>':""}`:"";
  if(view==="check")render();
}
function syncNote(){return shared.mode==="live"?"찜·체크·메모·직접 추가한 캠핑장은 공유 기록에 저장돼서 다른 기기에서도 보여요.":"지금은 이 브라우저에만 저장돼요. 로그인하면 다른 기기와 함께 써요."}
function creditNote(){return Object.keys(GC.camps).length?`<p class="note">${CREDIT} · <a href="https://www.data.go.kr/data/15101933/openapi.do" target="_blank" rel="noopener">고캠핑 정보 조회서비스</a>(공공누리 제1유형: 출처 표시). 고캠핑에 있는 곳만 사진과 정보가 나오고, 나머지는 그림이에요.</p>`:""}
function accountBox(){
  if(!shared.sb)return `<section class="sec" style="margin-top:16px"><div class="sync"><div><b>📱 이 브라우저에 저장 중</b><small>공유 저장소에 연결하지 못했어요. 기록은 이 기기에 남아요.</small></div></div></section>`;
  if(!shared.user)return `<section class="sec" style="margin-top:16px"><div class="sync"><div><b>📱 이 브라우저에만 저장 중</b><small>지쏘·시아 이메일로 로그인하면 찜·메모가 다른 기기와 함께 저장돼요.</small></div><button class="sbtn" data-login>이메일로 로그인</button></div></section>`;
  return `<section class="sec" style="margin-top:16px"><div class="sync"><div><b>${shared.mode==="readonly"?"👀 보기 전용 계정":"☁️ 공유 기록 사용 중"}</b><small>${esc(shared.user.email)}${shared.mode==="readonly"?" · 이 이메일은 고칠 수 없어요":""}</small></div><button class="sbtn ghost" data-logout>로그아웃</button></div></section>`;
}
function signInSheet(){
  openSheet("이메일로 로그인",`<p class="hint" style="margin:0">메일로 온 링크를 누르면 로그인돼요. 링크는 이 기기에서 열어야 이 기기가 로그인돼요.</p>
  <form class="form" id="loginForm"><label>이메일<input id="liEmail" name="email" type="email" inputmode="email" autocomplete="email" required placeholder="예: but.blank@gmail.com"></label>
  <button class="apply" type="submit" id="liSend">로그인 링크 받기</button><span class="hint">지쏘·시아 이메일만 기록을 고칠 수 있어요.</span></form>`);
  document.getElementById("loginForm").addEventListener("submit",async e=>{
    e.preventDefault();const email=document.getElementById("liEmail").value.trim();const b=document.getElementById("liSend");
    b.disabled=true;
    const {error}=await shared.sb.auth.signInWithOtp({email,options:{emailRedirectTo:location.origin+location.pathname,shouldCreateUser:true}});
    b.disabled=false;
    if(error){toast(/rate|seconds/i.test(error.message)?"잠시 뒤 다시 시도해 주세요":"링크를 보내지 못했어요");return}
    closeSheet();toast("메일함에서 로그인 링크를 눌러 주세요");
  });
}
const countOf=s=>`찜 ${(s.saved||[]).length}곳 · 메모 ${Object.keys(s.notes||{}).length}개 · 직접 추가 ${(s.added||[]).length}곳 · 체크 ${(s.calls||[]).length}개 · 평점 ${Object.keys(s.ratings||{}).length}개`;
function askWhichRecord(remote,mine){
  openSheet("어느 기록을 쓸까요?",`<p class="hint" style="margin:0">이 기기에 저장된 기록과 공유 기록이 달라요.</p>
  <div class="pickrow"><button class="pick" type="button" data-pick="local"><b>📱 이 기기 기록을 공유 기록으로 올리기</b><small>${countOf(mine)}</small></button>
  <button class="pick" type="button" data-pick="remote"><b>☁️ 공유 기록 불러오기</b><small>${countOf(remote)}</small></button></div>
  <p class="hint">어느 쪽을 골라도 고르지 않은 기록은 이 브라우저에 따로 보관해 둬요.</p>`);
  document.querySelector("[data-pick=local]").onclick=()=>{local.set(KEY+"-before-sync-"+Date.now(),remote);loadState(mine);done("이 기기 기록을 공유 기록으로 올렸어요")};
  document.querySelector("[data-pick=remote]").onclick=()=>{local.set(KEY+"-before-sync-"+Date.now(),mine);loadState(remote);done("공유 기록을 불러왔어요")};
  function done(m){local.set(KEY+"-synced",shared.user.id);shared.mode="live";shared.lastSent=JSON.stringify(remote);commit();closeSheet();paintSync();render();toast(m)}
}
async function readRemote(){const {data,error}=await shared.sb.from(shared.table).select("data, updated_at").eq("id","shared").maybeSingle();if(error)throw error;return data?data.data:null}
async function onUser(u){
  const was=shared.user&&shared.user.id;shared.user=u||null;
  if(shared.ch){shared.sb.removeChannel(shared.ch);shared.ch=null}
  if(!u){shared.mode="local";if(was)local.del(KEY+"-synced");paintSync();peekRemote();return}
  shared.mode="loading";paintSync();
  let remote;try{remote=await readRemote()}catch(e){shared.mode="error";paintSync();return}
  const mine=snapshot();const syncedHere=local.get(KEY+"-synced",null)===u.id;
  shared.mode="live";
  if(!remote){local.set(KEY+"-synced",u.id);shared.lastSent="";shared.push()}
  else if(same(remote,mine)){local.set(KEY+"-synced",u.id);shared.lastSent=JSON.stringify(remote)}
  else if(!syncedHere&&hasData(mine)){askWhichRecord(remote,mine)}
  else{local.set(KEY+"-synced",u.id);shared.lastSent=JSON.stringify(remote);loadState(remote);local.set(KEY,snapshot());render()}
  paintSync();
  /* 다른 기기에서 고치면 바로 반영 (Realtime) */
  shared.ch=shared.sb.channel("camp-note-shared").on("postgres_changes",{event:"*",schema:"public",table:shared.table,filter:"id=eq.shared"},p=>{
    const d=p.new&&p.new.data;if(!d||same(d,snapshot()))return;
    shared.lastSent=JSON.stringify(d);loadState(d);local.set(KEY,snapshot());if(!sheet.classList.contains("on"))render();
  }).subscribe();
}
/* 로그인 전: 이 기기에 기록이 없으면 공유 기록을 출발점으로 보여줘요 (고치면 이 기기에만 저장) */
async function peekRemote(){
  if(hasData(snapshot()))return;
  try{const r=await readRemote();if(r&&hasData(r)&&!hasData(snapshot())){loadState(r);local.set(KEY,snapshot());render()}}catch(e){}
}
const loadScript=src=>new Promise((ok,no)=>{const s=document.createElement("script");s.src=src;s.onload=ok;s.onerror=no;document.head.appendChild(s)});
async function startShared(){
  const cfg=window.CAMP_NOTE_SUPABASE;
  if(!cfg||!cfg.url||!cfg.anonKey){shared.mode="local";paintSync();return}
  try{await loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js")}catch(e){shared.mode="local";paintSync();return}
  shared.sb=window.supabase.createClient(cfg.url,cfg.anonKey);shared.table=cfg.table||"camp_note";
  const {data}=await shared.sb.auth.getSession();
  await onUser(data&&data.session?data.session.user:null);
  shared.sb.auth.onAuthStateChange((ev,session)=>{
    const u=session?session.user:null;
    if((u&&u.id)!==(shared.user&&shared.user.id))onUser(u);
    if(ev==="SIGNED_IN"&&/access_token|type=magiclink/.test(location.hash))location.hash="check"; // 메일 링크로 들어오면 체크리스트 탭(로그인 상자)으로
  });
}
document.addEventListener("click",e=>{
  const t=e.target.closest("[data-login],[data-logout]");if(!t)return;
  if(t.hasAttribute("data-login")){if(shared.sb)signInSheet();else toast("공유 저장소에 연결하지 못했어요");return}
  if(t.hasAttribute("data-logout")){shared.sb.auth.signOut().then(()=>toast("로그아웃했어요"))}
});

/* ---------- 시작: 데이터 받기 ---------- */
(async()=>{
  const V="20261110t";
  try{
    const [c,_,p]=await Promise.all([fetch("camps.json?v="+V).then(r=>r.json()),fetch("coords.json?v="+V).then(r=>r.ok?r.json():{}).catch(()=>({})).then(x=>{COORD=x||{}}),fetch("gocamping.json",{cache:"no-cache"}).then(r=>r.ok?r.json():{camps:{}}).catch(()=>({camps:{}}))]);
    R=Object.fromEntries(c.regions.map(x=>[x.k,[x.name,x.icon]]));D=c.camps;PICKS=c.picks;DROP=c.drop;CALLS=c.calls;GC={camps:{},nearby:[],...p};NEAR=(GC.nearby||[]).map(nearCamp);
  }catch(e){document.getElementById("view").innerHTML=`<div class="empty"><b>캠핑장 목록을 불러오지 못했어요</b><span>잠시 뒤 새로고침해 주세요.</span></div>`;return}
  window.addEventListener("hashchange",route);route();
  startShared();
})();
/* 상세 사진첩: 몇 번째 사진인지 */
document.addEventListener("scroll",e=>{const g=e.target;if(!g||g.id!=="gal")return;const n=document.getElementById("galn");if(n)n.textContent=`${Math.round(g.scrollLeft/g.clientWidth)+1} / ${g.children.length}`},true);

/* 정렬 메뉴: 바깥을 누르거나 Esc면 닫기 */
function closeSortMenus(){document.querySelectorAll(".sortmenu").forEach(m=>{m.hidden=true;const b=m.previousElementSibling;if(b)b.setAttribute("aria-expanded","false")})}
document.addEventListener("click",e=>{if(!e.target.closest(".sortwrap"))closeSortMenus()},true);
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeSortMenus()});

/* ---------- 예상 평점: 지쏘 조건 기준 (가중치는 여기서 바꿔요) ---------- */
const WEIGHTS={dog:25,fire:25,dist:15,price:15,review:12,power:5,auto:3};
/* 후기 점수: 캠핏 분석(rv)과 네이버 블로그 후기(brv)를 반씩, 하나만 있으면 그것만, 둘 다 없으면 중간 */
const RVS={ok:1,mild:.7,warn:.35,bad:0};
function revScore(d){const a=[d.rv&&RVS[d.rv.lv],d.brv&&RVS[d.brv.lv]].filter(x=>x!==undefined&&x!==null&&x!==false);return a.length?a.reduce((x,y)=>x+y,0)/a.length:.5}
const WLABEL={dog:["🐶","반려견 2마리"],fire:["🔥","장작 불멍"],dist:["📍","거리"],price:["💸","가격"],review:["👍","후기"],power:["⚡","전력"],auto:["🚗","오토캠핑"]};
function mins(d){return d.min||(d.km?Math.round(d.km*1.2+10):0)}
function parts(d,solo){
  const st=v=>v==="ok"?1:v==="no"?0:.5;const m=mins(d);const p=d.p;
  const o={
    dog:st(d.dog2||"check"),
    fire:st(d.fire==="ok"?"ok":d.fire==="no"?"no":"check"),
    dist:!m?.5:m<=30?1:m<=60?.85:m<=90?.65:m<=120?.45:.25,
    price:!p?.5:p<=20000?1:p<=30000?.9:p<=40000?.75:p<=50000?.55:p<=60000?.4:.25,
    review:revScore(d),
    power:d.w11?1:d.w?.6:.4,
    auto:d.auto===true?1:d.auto==="check"?.5:0,
  };
  if(solo)delete o.dog;
  return o;
}
function expected(d){const solo=!!d.solo||view==="solo";const o=parts(d,solo);let t=0,w=0;for(const k in o){t+=WEIGHTS[k]*o[k];w+=WEIGHTS[k]}return Math.round(t/w*50)/10}
const mine=d=>ratings[d.id]&&ratings[d.id].star?ratings[d.id]:null;
const starOf=d=>mine(d)?mine(d).star:expected(d);
function starTag(d,short){const r=mine(d);return r?`<span class="star mine" title="내 평점">★ ${r.star.toFixed(1)}${short?"":" 내 평점"}</span>`:`<span class="star" title="지쏘 조건으로 계산한 예상 평점">★ ${expected(d).toFixed(1)}${short?"":" 예상"}</span>`}
function scoreBox(d){
  const solo=!!d.solo||view==="solo";const o=parts(d,solo);const e=expected(d);const r=mine(d);
  const bars=Object.keys(o).map(k=>`<div class="sbar"><span>${WLABEL[k][0]} ${WLABEL[k][1]}</span><i><b style="width:${Math.round(o[k]*100)}%"></b></i><em>${Math.round(o[k]*WEIGHTS[k])}/${WEIGHTS[k]}</em></div>`).join("");
  const my=r?`<div class="myrate"><div class="row"><b>내 평점 <span class="stars" aria-label="${r.star}점">${starsHtml(r.star)}</span> ${r.star.toFixed(1)}</b><button class="sbtn ghost" data-rate="${d.id}">수정</button></div>
     <small>${esc(r.date||"")} 다녀옴${r.again?" · 또 갈래요 💚":""}</small>
     ${RITEMS.filter(([k])=>r.items&&r.items[k]).length?`<div class="ritems">${RITEMS.filter(([k])=>r.items&&r.items[k]).map(([k,l])=>`<span>${l} ${"★".repeat(r.items[k])}</span>`).join("")}</div>`:""}
     ${r.text?`<p>"${esc(r.text)}"</p>`:""}</div>`:`<button class="ratebtn" data-rate="${d.id}">⛺ 다녀왔어요 · 평점 남기기</button>`;
  return `<section class="scorebox"><details><summary><span class="big">★ ${e.toFixed(1)}</span><span><b>예상 평점</b><small>지쏘 조건 기준 · 반려견·불멍을 가장 중요하게</small></span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></summary><div class="sbars">${bars}<small class="hint">${solo?"캠프닉이라 반려견 항목은 빼고 계산했어요. ":""}모르는 정보는 중간 점수로 넣었어요.</small></div></details>${my}</section>`;
}
/* ---------- 실제 평점: 다녀와서 남기기 ---------- */
const RITEMS=[["dog","🐶 반려견 편함"],["fire","🔥 불멍"],["clean","🚿 청결"],["quiet","🤫 조용함"]];
function starsHtml(v){let h="";for(let i=1;i<=5;i++)h+=`<i class="${v>=i?"on":v>=i-.5?"half":""}">★</i>`;return h}
function starPicker(name,v,half){return `<div class="spick" data-name="${name}" data-half="${half?1:0}" data-v="${v||0}" role="radiogroup" aria-label="${name==="star"?"전체 별점":"항목 별점"}">${[1,2,3,4,5].map(i=>`<button type="button" data-star="${i}" aria-label="${i}점">${"★"}</button>`).join("")}<output>${v?(+v).toFixed(half?1:0):"-"}</output></div>`}
function paintPicker(el){const v=+el.dataset.v;el.querySelectorAll("[data-star]").forEach(b=>{const i=+b.dataset.star;b.className=v>=i?"on":v>=i-.5?"half":""});el.querySelector("output").textContent=v?(el.dataset.half==="1"?v.toFixed(1):v):"-"}
function rateSheet(id){
  const d=all().find(x=>x.id===id);if(!d)return;const r=ratings[id]||{};const today=new Date(Date.now()-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10);
  openSheet("평점 남기기",`<p class="hint" style="margin:0">${esc(d.n)}</p>
  <form class="form" id="rateForm">
   <div class="flabel">전체 별점 <small class="hint">같은 별을 한 번 더 누르면 반 개</small>${starPicker("star",r.star,true)}</div>
   <label>다녀온 날<input type="date" name="date" value="${esc(r.date||today)}" max="${today}"></label>
   <div class="ritemsin">${RITEMS.filter(([k])=>!(k==="dog"&&d.solo)).map(([k,l])=>`<div class="ritem"><span>${l}</span>${starPicker(k,r.items&&r.items[k],false)}</div>`).join("")}</div>
   <label>한 줄 후기<textarea name="text" maxlength="300" rows="3" placeholder="예: 때찌가 안 짖고 잘 잤어요, 화장실 깨끗">${esc(r.text||"")}</textarea></label>
   <label class="again"><input type="checkbox" name="again" ${r.again?"checked":""}> 💚 또 갈래요</label>
   <button class="apply" type="submit">저장</button>
   <div class="row">${r.star?`<button type="button" class="sbtn danger" data-unrate="${id}">평점 지우기</button>`:"<span></span>"}<button type="button" class="sbtn ghost" data-open="${id}">돌아가기</button></div>
   <span class="hint" id="rateState"></span>
  </form>`);
  document.querySelectorAll("#rateForm .spick").forEach(paintPicker);
  document.getElementById("rateForm").addEventListener("submit",e=>{
    e.preventDefault();const f=e.target;const v=n=>+(f.querySelector(`.spick[data-name="${n}"]`)||{dataset:{v:0}}).dataset.v;
    const star=v("star");if(!star){document.getElementById("rateState").textContent="전체 별점을 눌러 주세요";return}
    const items={};RITEMS.forEach(([k])=>{const x=v(k);if(x)items[k]=x});
    ratings[id]={star,date:f.date.value,items,text:f.text.value.trim().slice(0,300),again:f.again.checked,at:Date.now()};
    commit();render();detail(id);toast("평점을 저장했어요");
  });
}
document.addEventListener("click",e=>{
  const b=e.target.closest("[data-star]");
  if(b){const el=b.closest(".spick");const i=+b.dataset.star;const cur=+el.dataset.v;el.dataset.v=el.dataset.half==="1"&&cur===i?i-.5:i;paintPicker(el);return}
  const t=e.target.closest("[data-rate],[data-unrate]");if(!t)return;
  if(t.dataset.rate){rateSheet(t.dataset.rate);return}
  if(t.dataset.unrate){if(t.dataset.armed){delete ratings[t.dataset.unrate];commit();render();detail(t.dataset.unrate);toast("평점을 지웠어요")}else{t.dataset.armed="1";t.textContent="한 번 더 누르면 지워요"}}
});

/* 추천 자리: 네이버 블로그 후기에서 모은 명당 (camps.json의 spots) */
function spotsBox(d){
  const sp=d.spots||[];if(!sp.length)return "";
  const good=sp.filter(x=>!x.avoid),bad=sp.filter(x=>x.avoid);
  const li=x=>`<li><b class="spt${x.avoid?" bad":""}">${esc(x.s)}</b><span>${esc(x.why)}</span></li>`;
  return `<section class="spots"><b>📍 추천 자리</b>${good.length?`<ul>${good.map(li).join("")}</ul>`:""}${bad.length?`<p class="spbad">피할 자리</p><ul>${bad.map(li).join("")}</ul>`:""}${(d.spotSrc||[]).length?`<small>출처: 네이버 블로그 ${d.spotSrc.map((u,i)=>`<a href="${esc(u)}" target="_blank" rel="noopener">${i+1}</a>`).join(" · ")}</small>`:""}</section>`;
}

/* 네이버 블로그 후기 요약 (camps.json의 brv) */
function blogBox(d){const b=d.brv;if(!b)return "";
  return `<div class="rvbox ${b.lv}"><b>📝 블로그 후기: ${RVL[b.lv][1]}</b><span>${esc(b.s)}</span>${(b.pts||[]).length?`<ul>${b.pts.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:""}<small>네이버 블로그 ${b.n||(b.src||[]).length}개 분석 · ${esc(b.at||"")} · ${(b.src||[]).map((u,i)=>`<a href="${esc(u)}" target="_blank" rel="noopener">${i+1}</a>`).join(" · ")}</small></div>`}

/* ---------- 지도 (오픈스트리트맵 + Leaflet) ---------- */
let mapMode=false,COORD={},LMAP=null;const HOME=[37.3899,126.9507];
function coordOf(d){if(COORD[d.id])return COORD[d.id];const g=gco(d);return g&&g.lat&&g.lng?[g.lat,g.lng]:null}
function paintMapToggle(){let b=document.getElementById("mapToggle");
  if(!b){b=document.createElement("button");b.id="mapToggle";b.type="button";b.className="maptoggle";b.addEventListener("click",()=>{mapMode=!mapMode;try{localStorage.setItem("camp_note_map",mapMode?"1":"")}catch(e){}render();window.scrollTo({top:0})});document.body.appendChild(b)}
  b.hidden=view==="check";b.innerHTML=mapMode?'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>목록으로 보기':'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/></svg>지도로 보기'}
let leafletP=null;
function loadLeaflet(){if(window.L)return Promise.resolve();if(leafletP)return leafletP;
  leafletP=new Promise((ok,no)=>{const l=document.createElement("link");l.rel="stylesheet";l.href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";document.head.appendChild(l);
    const s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";s.onload=ok;s.onerror=no;document.head.appendChild(s)});return leafletP}
function pinColor(v){return v>=4.2?"#1f7a5a":v>=3.6?"#e0a21f":"#c2413a"}
let kakaoP=null;
function loadKakao(){const k=window.CAMP_NOTE_KAKAO;if(!k)return Promise.reject();if(window.kakao&&kakao.maps&&kakao.maps.LatLng)return Promise.resolve();if(kakaoP)return kakaoP;
  kakaoP=new Promise((ok,no)=>{const s=document.createElement("script");s.src=`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(k)}&autoload=false`;s.onload=()=>{try{kakao.maps.load(ok)}catch(e){no(e)}};s.onerror=no;document.head.appendChild(s);setTimeout(()=>no(new Error("timeout")),8000)});
  kakaoP.catch(()=>{kakaoP=null;window.CAMP_NOTE_KAKAO=""});return kakaoP}
function mapItems(list){return list.concat(view==="home"?NEAR.filter(d=>(region==="all"||d.r===region)&&!need.size):[])}
function pinHtml(d){const v=starOf(d);const m=mine(d);return `<b class="kpin${saved.has(d.id)?" saved":""}" style="background:${d.near?"#7d8882":pinColor(v)}">${m?"★":""}${v.toFixed(1)}</b>`}
function popHtml(d){return `<div class="mpop"><b>${esc(d.n)}</b><span>${dist(d)} · ${d.near?"요금 문의":won(d.p)}</span><span>${esc(summary(d))}</span><button type="button" class="sbtn" data-open="${d.id}">자세히 보기</button></div>`}
function mapHint(n,miss){document.getElementById("maphint").textContent=`${n}곳 표시${miss?` · 위치를 모르는 ${miss}곳은 빠졌어요`:""} · 핀 숫자는 ${view==="home"?"예상 평점 (회색은 고캠핑 추천)":"예상 평점"}`}
async function drawKakao(el,list){
  const map=new kakao.maps.Map(el,{center:new kakao.maps.LatLng(HOME[0],HOME[1]),level:10});
  map.addControl(new kakao.maps.ZoomControl(),kakao.maps.ControlPosition.RIGHT);
  const bounds=new kakao.maps.LatLngBounds(),near=new kakao.maps.LatLngBounds();const P=(c)=>new kakao.maps.LatLng(c[0],c[1]);bounds.extend(P(HOME));near.extend(P(HOME));let nNear=0;
  const km=c=>Math.hypot((c[0]-HOME[0])*111,(c[1]-HOME[1])*88.6);
  new kakao.maps.CustomOverlay({map,position:P(HOME),content:'<div class="kpin home" title="범계 (집)">🏠</div>',yAnchor:.5});
  let pop=null;const items=mapItems(list);let miss=0;
  for(const d of items){const c=coordOf(d);if(!c){miss++;continue}bounds.extend(P(c));if(km(c)<=80){near.extend(P(c));nNear++}
    const el2=document.createElement("div");el2.innerHTML=pinHtml(d);el2.title=d.n;
    el2.addEventListener("click",()=>{if(pop)pop.setMap(null);const box=document.createElement("div");box.className="kpop";box.innerHTML=popHtml(d)+'<button type="button" class="kx" aria-label="닫기">✕</button>';box.querySelector(".kx").onclick=()=>pop.setMap(null);
      pop=new kakao.maps.CustomOverlay({map,position:P(c),content:box,yAnchor:1.25,zIndex:10})});
    new kakao.maps.CustomOverlay({map,position:P(c),content:el2,yAnchor:1})}
  const fit=()=>{map.relayout();if(items.length-miss>0)map.setBounds(nNear>=3?near:bounds,30,20,60,20)};setTimeout(fit,60);setTimeout(fit,400);
  mapHint(items.length-miss,miss);
}
async function drawMap(list){
  const el0=document.getElementById("map");
  if(window.CAMP_NOTE_KAKAO){try{await loadKakao();if(!document.getElementById("map"))return;if(LMAP){LMAP.remove();LMAP=null}return drawKakao(document.getElementById("map"),list)}catch(e){}}
  try{await loadLeaflet()}catch(e){document.getElementById("maphint").textContent="지도를 불러오지 못했어요";return}
  const el=document.getElementById("map");if(!el)return;if(LMAP){LMAP.remove();LMAP=null}
  LMAP=L.map(el,{zoomControl:true,attributionControl:true}).setView(HOME,9);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:18,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(LMAP);
  L.marker(HOME,{icon:L.divIcon({className:"pin home",html:"🏠",iconSize:[30,30],iconAnchor:[15,15]}),title:"범계 (집)"}).addTo(LMAP);
  const items=list.concat(view==="home"?NEAR.filter(d=>(region==="all"||d.r===region)&&!need.size):[]);
  const pts=[HOME];let miss=0;
  for(const d of items){const c=coordOf(d);if(!c){miss++;continue}pts.push(c);const v=starOf(d);const m=mine(d);
    const icon=L.divIcon({className:"pin"+(d.near?" near":"")+(saved.has(d.id)?" saved":""),html:`<b style="background:${d.near?"#7d8882":pinColor(v)}">${m?"★":""}${v.toFixed(1)}</b>`,iconSize:[44,26],iconAnchor:[22,26]});
    L.marker(c,{icon,title:d.n}).addTo(LMAP).bindPopup(`<div class="mpop"><b>${esc(d.n)}</b><span>${dist(d)} · ${d.near?"요금 문의":won(d.p)}</span><span>${esc(summary(d))}</span><button type="button" class="sbtn" data-open="${d.id}">자세히 보기</button></div>`)}
  if(pts.length>1)LMAP.fitBounds(pts,{padding:[30,30],maxZoom:12});
  document.getElementById("maphint").textContent=`${items.length-miss}곳 표시${miss?` · 위치를 모르는 ${miss}곳은 빠졌어요`:""} · 핀 숫자는 ${view==="home"?"예상 평점 (회색은 고캠핑 추천)":"예상 평점"}`;
}
try{mapMode=localStorage.getItem("camp_note_map")==="1"}catch(e){}
