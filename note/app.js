/* 캠핑수첩: 때찌·때꾸와 갈 캠핑장 후보 (GitHub Pages 판)
 * 데이터 원본: camps.json (캠핑장 id는 고정값) · 사진: photos.json (Actions가 고캠핑에서 받아요)
 * 저장: 이 브라우저(localStorage) + 로그인하면 Supabase camp_note 표에 공유 */
"use strict";
let R={},D=[],PICKS=[],DROP=[],CALLS=[],PHOTO={};
const byId=id=>D.find(d=>d.id===id);
const NEEDS=[["fence","🐾 펜스 있는 곳만",d=>d.fence],["fire","🔥 불멍 확인됨",d=>d.fire==="ok"],["w11","⚡ 1100W 이상",d=>d.w11],["h1","🚗 1시간 이내",d=>d.min<=60],["ok","✅ 바로 예약만",d=>d.fit==="ok"],["clean","👍 후기 주의 빼기",d=>!d.rv||!["bad","warn"].includes(d.rv.lv)]];
const RVL={bad:["🚩","후기 주의"],warn:["⚠️","참고할 단점"],mild:["💬","사소한 단점"],ok:["👍","후기 깨끗"]};
const CREDIT="사진: 고캠핑(한국관광공사)";

/* 기록: {saved:[id], calls:[번호], notes:{id:글}, added:[캠핑장]} 하나로 모아 저장해요 */
const KEY="camp_note";
const local={get(k,f){try{const v=localStorage.getItem(k);return v?JSON.parse(v):f}catch(e){return f}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}},del(k){try{localStorage.removeItem(k)}catch(e){}}};
let saved=new Set(),checked=new Set(),notes={},added=[];
function loadState(s){s=s||{};saved=new Set(s.saved||[]);checked=new Set(s.calls||[]);notes={...(s.notes||{})};added=(s.added||[]).filter(a=>a&&a.id&&a.n)}
const snapshot=()=>({saved:[...saved],calls:[...checked].sort((a,b)=>a-b),notes,added});
const hasData=s=>!!(s&&((s.saved||[]).length||(s.calls||[]).length||Object.keys(s.notes||{}).length||(s.added||[]).length));
const same=(a,b)=>JSON.stringify(norm(a))===JSON.stringify(norm(b));
function norm(s){s=s||{};const n=s.notes||{};return {saved:[...(s.saved||[])].sort(),calls:[...(s.calls||[])].sort((a,b)=>a-b),notes:Object.keys(n).sort().map(k=>[k,n[k]]),added:[...(s.added||[])].sort((a,b)=>a.id<b.id?-1:1)}}
loadState(local.get(KEY,null));
let view="home",region="all",sort="dist",q="";const need=new Set();let animate=true;
function all(){return D.concat(added.map(a=>({...a,user:true})))}

function seed(s){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return ()=>((h=Math.imul(h^h>>>15,2246822507)^Math.imul(h^h>>>13,3266489909))>>>0)/4294967296}
const SKY={day:["#7fc0ff","#e3f2ff","#fff7c2","#7fbf86","#3d7f58"],sunset:["#ff8a5c","#ffd59e","#fff2c9","#9c6178","#4b3557"],dusk:["#3a4b8c","#f3a17a","#ffe3b8","#4c4a7a","#272a4f"],night:["#0d1836","#2c3f73","#f4f1d0","#1f2b4c","#111a33"]};
function hills(r,y,amp){let d=`M0 260L0 ${(y+amp*(r()-.5)).toFixed(1)}`;for(let x=0;x<400;x+=100)d+=`Q${x+50} ${(y-amp*r()).toFixed(1)} ${x+100} ${(y+amp*(r()-.5)).toFixed(1)}`;return d+"L400 260Z"}
function thumb(d,uid){
  const ph=PHOTO[d.id];
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
const gcUrl=d=>{const g=d.gc||(PHOTO[d.id]&&PHOTO[d.id].gc);return g?`https://www.gocamping.or.kr/bsite/camp/info/read.do?c_no=${encodeURIComponent(g)}`:(d.url&&d.url.includes("gocamping")?d.url:"")};
function links(d){
  const k=encodeURIComponent(kw(d));
  return `<div class="links">${d.url&&d.url.includes("camfit")?`<a class="lk" href="${esc(d.url)}" target="_blank" rel="noopener"><b style="background:#21a366">C</b>캠핏 상세</a>`:`<a class="lk" href="https://camfit.co.kr/search/result?keyword=${k}" target="_blank" rel="noopener"><b style="background:#21a366">C</b>캠핏에서 검색</a>`}
  ${gcUrl(d)?`<a class="lk" href="${esc(gcUrl(d))}" target="_blank" rel="noopener"><b style="background:#3a6fd8">G</b>고캠핑</a>`:""}
  <a class="lk" href="https://search.naver.com/search.naver?where=article&query=${k}" target="_blank" rel="noopener"><b style="background:#03c75a">N</b>네이버 카페 후기</a>
  <a class="lk" href="https://map.naver.com/p/search/${k}" target="_blank" rel="noopener"><b style="background:#03c75a">M</b>네이버 지도</a></div>`;
}
function pool(){
  let r=all().filter(d=>view==="saved"?saved.has(d.id):view==="solo"?true:!d.solo);
  if(region!=="all")r=r.filter(d=>d.r===region);
  for(const k of need){const f=NEEDS.find(n=>n[0]===k);if(f)r=r.filter(f[2])}
  if(q){const t=q.toLowerCase();r=r.filter(d=>(d.n+d.a+(R[d.r]||[""])[0]).toLowerCase().includes(t))}
  return r.sort((a,b)=>sort==="dist"?(a.min||999)-(b.min||999)||(a.p||0)-(b.p||0):(a.p||1e9)-(b.p||1e9)||(a.min||0)-(b.min||0));
}
function summary(d){return (d.solo||view==="solo")?[d.fire==="ok"?"🔥 불멍 가능":"🔥 불멍 문의",d.auto?"🚗 오토":"🚶 차 옆 주차 아님"].join(" · "):[d.dogT?`🐶 ${d.dogT}`:"",d.fire==="ok"?"🔥 불멍":"🔥 문의",d.fence?"🐾 펜스":""].filter(Boolean).join(" · ")}
function rvLine(d){if(!d.rv)return notes[d.id]?`<span class="rv mild">📝 내 메모 있음</span>`:"";const[i,l]=RVL[d.rv.lv];return `<span class="rv ${d.rv.lv}">${i} ${esc(d.rv.s)}</span>`}
function card(d){
  const badge=(d.solo||view==="solo")?"":`<span class="badge${d.fit==="check"?" check":""}">${d.fit==="ok"?"바로 예약 OK":"📞 전화 확인"}</span>`;
  const flag=d.rv&&["bad","warn"].includes(d.rv.lv)?`<span class="flag ${d.rv.lv==="warn"?"warn":""}">${RVL[d.rv.lv][0]} ${RVL[d.rv.lv][1]}</span>`:"";
  return `<article class="card"><div style="position:relative"><button class="ph" data-open="${d.id}" aria-label="${esc(d.n)} 자세히">${thumb(d,"f")}${badge}${flag}</button>
  ${d.user?'<span class="mine">내가 추가</span>':""}<button class="heart" data-heart="${d.id}" aria-pressed="${saved.has(d.id)}" aria-label="${esc(d.n)} 찜">${heartSvg}</button></div>
  <button class="ct" data-open="${d.id}"><span class="row1"><b>${esc(d.n)}</b>${d.lg?`<span>로그 ${d.lg.toLocaleString()}</span>`:""}</span>
  <span class="l2">${(R[d.r]||["지역 미입력"])[0]} · 약 ${hm(d.min)}</span><span class="l3">${esc(summary(d))}</span>${rvLine(d)}
  <span class="price"><b>${won(d.p)}</b> <small>/박${d.fee&&view!=="solo"?` · 반려견 ${esc(d.fee)}`:""}</small></span></button></article>`;
}
function mini(d){return `<button class="mini" data-open="${d.id}"><span class="ph">${thumb(d,"m")}</span><b>${esc(d.n)}</b><small>약 ${hm(d.min)}${d.rv?` · ${RVL[d.rv.lv][0]}`:""}</small><span class="pr">${won(d.p)}<small style="font-weight:400"> /박</small></span></button>`}
function emptyBox(t,s){return `<div class="empty"><b>${t}</b><span>${s}</span>${need.size||region!=="all"||q?'<button class="link" data-reset>조건 초기화</button>':""}</div>`}
function renderCats(){
  const regs=view==="check"?[]:Object.keys(R).filter(k=>k==="all"||all().some(d=>d.r===k&&(view==="solo"?true:view==="saved"?saved.has(d.id):!d.solo)));
  if(!regs.includes(region))region="all";
  const el=document.getElementById("cats");el.innerHTML=regs.map(k=>`<button class="cat" role="tab" data-r="${k}" aria-selected="${region===k}"><i>${R[k][1]}</i>${R[k][0]}</button>`).join("");el.hidden=view==="check";
  const n=need.size+(sort!=="dist"?1:0);const fc=document.getElementById("fcount");fc.hidden=!n;fc.textContent=n;
}
function quickRow(){return `<div class="quick bleed" role="group" aria-label="빠른 조건">${NEEDS.filter(n=>view!=="solo"||["fire","h1","clean"].includes(n[0])).map(([k,l])=>`<button class="qc" data-need="${k}" aria-pressed="${need.has(k)}">${l}</button>`).join("")}<button class="qc" data-sort aria-pressed="${sort==="price"}">${sort==="price"?"💸 저렴한 순":"📍 가까운 순"}</button></div>`}
const addBtn=`<button class="addbtn" data-add>＋ 캠핏에서 찾은 캠핑장 직접 추가</button>`;
function render(){
  renderCats();
  const v=document.getElementById("view");const r=pool();let h="";
  if(view==="home"){
    h+=quickRow();
    if(!q&&!need.size&&region==="all"){
      h+=`<div class="bnwrap"><div class="banners" id="bn">${PICKS.filter(p=>byId(p.id)).map(p=>{const d=byId(p.id);return `<button class="bn" data-open="${d.id}">${thumb(d,"b")}<span class="k">${p.k}</span><b>${p.t}</b><small>${p.s}</small></button>`}).join("")}</div><span class="bnpage" id="bnpage">1 / ${PICKS.length}</span></div>`;
    }
    const ok=r.filter(d=>d.fit==="ok"&&!(d.rv&&d.rv.lv==="bad"));
    if(ok.length)h+=`<section class="sec"><div class="sh"><h2>바로 예약해도 되는 곳</h2><span>두 마리 OK · 후기 주의 제외 · ${ok.length}곳</span></div><div class="rail bleed">${ok.map(mini).join("")}</div></section>`;
    h+=`<section class="sec"><div class="sh"><h2>${region==="all"?"전체 후보":R[region][0]}</h2><span>${r.length}곳 · ${sort==="dist"?"가까운 순":"저렴한 순"}</span></div>${r.length?`<div class="feed">${r.map(card).join("")}</div>`:emptyBox("조건에 맞는 곳이 없어요","조건을 하나 풀어보세요")}</section>`;
    h+=`<section class="sec">${addBtn}</section><p class="note">캠핏·고캠핑 운영정책과 캠핏 캠핑로그(곳마다 최근 10~80개)를 2026년 11월 9일에 확인했어요. 네이버 카페 후기는 로그인이 필요해서 직접 읽지 못했고, 각 캠핑장 상세에 검색 링크를 달아뒀어요. 가격은 평일 1박 쿠폰가, 거리는 범계 출발 대략치예요.</p>${creditNote()}`;
  }else if(view==="solo"){
    h+=quickRow()+`<section class="sec" style="margin-top:8px"><div class="sh"><h2>둘이서 가볍게</h2><span>반려견 없이 갈 수 있는 모든 곳 · ${r.length}곳</span></div>${r.length?`<div class="feed">${r.map(card).join("")}</div>`:emptyBox("조건에 맞는 곳이 없어요","조건을 하나 풀어보세요")}</section><section class="sec">${addBtn}</section>`;
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
function openSheet(title,html,forId){
  if(!sheet.classList.contains("on"))lastFocus=document.activeElement;sheetFor=forId||null;
  document.getElementById("sheetTitle").textContent=title;document.getElementById("sheetBody").innerHTML=html;
  sheet.hidden=false;requestAnimationFrame(()=>{sheet.classList.add("on");scrim.classList.add("on")});
  document.getElementById("closeSheet").focus({preventScroll:true});document.documentElement.style.overflow="hidden";
}
function closeSheet(){sheet.classList.remove("on");scrim.classList.remove("on");document.documentElement.style.overflow="";sheetFor=null;
  setTimeout(()=>{if(!sheet.classList.contains("on"))sheet.hidden=true},430);if(lastFocus)lastFocus.focus({preventScroll:true})}
function cond(icon,label,state,text){return `<div class="cd"><i>${icon}</i><div>${label}<small>${esc(text)}</small></div><span class="st ${state}">${state==="ok"?"확인됨":state==="check"?"물어보기":"안 됨"}</span></div>`}
function detail(id){
  const d=all().find(x=>x.id===id);if(!d)return;
  let c="";
  if(!d.solo)c+=cond("🐶","반려견 두 마리",d.dog2||"check",d.dogT||"정보 없음");
  c+=cond("🔥","장작 불멍",d.fire==="ok"?"ok":d.fire==="no"?"no":"check",d.fireT||(d.fire==="ok"?"화로대 사용 가능":d.fire==="no"?"금지":"정책에 없어서 확인 필요"));
  c+=cond("⚡","전기",d.w?"ok":"check",d.w||"정책에 W 표기 없음 · 전기장판은 대부분 OK");
  c+=cond("🚗","오토캠핑",d.auto===true?"ok":d.auto==="check"?"check":"no",d.autoT||(d.auto?"차를 사이트 옆에":"주차장에서 걸어서 이동"));
  if(d.fence)c+=cond("🐾","펜스·울타리","ok","반려견 사이트에 울타리");
  const rv=d.rv?`<div class="rvbox ${d.rv.lv}"><b>${RVL[d.rv.lv][0]} 후기 요약: ${RVL[d.rv.lv][1]}</b>${d.rv.pts.length?`<ul>${d.rv.pts.map(p=>`<li>${esc(p)}</li>`).join("")}</ul>`:""}<small>캠핏 캠핑로그 최근 후기 키워드 분석 · 2026-11-09</small></div>`:(d.user?"":`<div class="rvbox mild"><small>캠핏 후기가 없어 분석하지 못했어요. 아래 네이버 카페 후기로 확인해 보세요.</small></div>`);
  openSheet(d.n,`<div class="hero">${thumb(d,"h")}</div>
   <div class="dt"><h3>${esc(d.n)}</h3><p>${esc(d.a||"주소 미입력")} ${d.a?`<button class="copy" data-copy="${esc(d.a)}">주소 복사</button>`:""}</p><p>${(R[d.r]||["지역 미입력"])[0]} · 범계에서 약 ${hm(d.min)}${d.lg?` · 캠핑로그 ${d.lg.toLocaleString()}`:""}</p></div>
   ${links(d)}
   ${rv}
   <div class="conds">${c}</div>
   ${d.plus?`<div class="memo">＋ ${esc(d.plus)}</div>`:""}${d.memo?`<div class="memo">${esc(d.memo)}</div>`:""}${d.ask?`<div class="ask">📞 물어볼 것: ${esc(d.ask)}</div>`:""}
   <div class="memo-in"><b>📝 내 메모</b><textarea id="noteText" placeholder="캠핏·카페에서 확인한 것, 통화 결과 등을 적어두세요">${esc(notes[d.id]||"")}</textarea><div class="row"><span class="hint" id="noteState">${shared.mode==="live"?"공유 기록에 저장돼요":"이 브라우저에 저장돼요"}</span><span style="display:flex;gap:8px">${d.user?`<button class="sbtn danger" data-del="${d.id}">삭제</button><button class="sbtn ghost" data-edit="${d.id}">수정</button>`:""}<button class="sbtn" data-savenote="${d.id}">메모 저장</button></span></div></div>
   <div class="cta"><div class="p"><b>${won(d.p)}</b> /박<small>${esc(d.ps||"")}${d.fee?` · 반려견 ${esc(d.fee)}`:""}</small></div>${d.url?`<a class="go" href="${esc(d.url)}" target="_blank" rel="noopener">예약하러 가기</a>`:`<a class="go" href="https://camfit.co.kr/search/result?keyword=${encodeURIComponent(kw(d))}" target="_blank" rel="noopener">캠핏에서 찾기</a>`}</div>`,d.id);
}
function filterSheet(){
  openSheet("조건과 정렬",`<div class="fs"><h4>정렬</h4><div class="opts"><button class="qc" data-sortset="dist" aria-pressed="${sort==="dist"}">📍 가까운 순</button><button class="qc" data-sortset="price" aria-pressed="${sort==="price"}">💸 저렴한 순</button></div></div>
  <div class="fs"><h4>꼭 필요한 것</h4><div class="opts">${NEEDS.map(([k,l])=>`<button class="qc" data-need="${k}" aria-pressed="${need.has(k)}">${l}</button>`).join("")}</div></div>
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
  if(t.hasAttribute("data-sort")){sort=sort==="dist"?"price":"dist";render();return}
  if(t.dataset.sortset){sort=t.dataset.sortset;render();filterSheet();return}
  if(t.hasAttribute("data-reset")){need.clear();region="all";q="";document.getElementById("q").value="";render();return}
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
function creditNote(){return Object.keys(PHOTO).length?`<p class="note">${CREDIT} · <a href="https://www.data.go.kr/data/15101933/openapi.do" target="_blank" rel="noopener">고캠핑 정보 조회서비스</a>(공공누리 제1유형: 출처 표시). 고캠핑에 있는 곳만 사진이 나오고, 나머지는 그림이에요.</p>`:""}
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
const countOf=s=>`찜 ${(s.saved||[]).length}곳 · 메모 ${Object.keys(s.notes||{}).length}개 · 직접 추가 ${(s.added||[]).length}곳 · 체크 ${(s.calls||[]).length}개`;
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
  const V="20261109a";
  try{
    const [c,p]=await Promise.all([fetch("camps.json?v="+V).then(r=>r.json()),fetch("photos.json?v="+V).then(r=>r.ok?r.json():{items:{}}).catch(()=>({items:{}}))]);
    R=Object.fromEntries(c.regions.map(x=>[x.k,[x.name,x.icon]]));D=c.camps;PICKS=c.picks;DROP=c.drop;CALLS=c.calls;PHOTO=p.items||{};
  }catch(e){document.getElementById("view").innerHTML=`<div class="empty"><b>캠핑장 목록을 불러오지 못했어요</b><span>잠시 뒤 새로고침해 주세요.</span></div>`;return}
  window.addEventListener("hashchange",route);route();
  startShared();
})();
