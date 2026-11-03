/* 캠핑장 찾기: 고캠핑 공공데이터(campsites.json)에서 조건에 맞는 캠핑장을 찾고 관심 캠핑장으로 저장해요 */
(() => {
  "use strict";
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const enc = encodeURIComponent;
  const TYPES = ["일반야영장", "자동차야영장", "글램핑", "카라반"];
  const PAGE = 30;
  let data = null, loadErr = false, shown = PAGE;
  const f = { q: "", doNm: "", sigungu: "", dog: true, elec: true, types: new Set() };

  const api = () => window.SOSHA;
  const favs = () => { const st = api().state; st.campFav = st.campFav || []; return st.campFav; };
  const isFav = (id) => favs().some((c) => c.contentId === id);
  const dogOk = (c) => /가능/.test(c.animalCmgCl || "") && !/불가능/.test(c.animalCmgCl || "");
  const hasElec = (c) => /전기/.test(c.sbrsCl || "");

  async function load() {
    try {
      const r = await fetch("campsites.json", { cache: "no-cache" });
      if (!r.ok) throw new Error(r.status);
      data = await r.json();
    } catch { loadErr = true; }
    render();
  }

  function match(c) {
    if (f.doNm && c.doNm !== f.doNm) return false;
    if (f.sigungu && c.sigunguNm !== f.sigungu) return false;
    if (f.dog && !dogOk(c)) return false;
    if (f.elec && !hasElec(c)) return false;
    if (f.types.size && ![...f.types].some((t) => (c.induty || "").includes(t))) return false;
    if (f.q) { const h = (c.facltNm + c.addr1 + c.lineIntro + c.lctCl).toLowerCase(); if (!h.includes(f.q.toLowerCase())) return false; }
    return true;
  }

  function links(c) {
    const q = `${c.facltNm} ${c.sigunguNm || ""}`.trim();
    return [
      c.resveUrl && [c.resveUrl, "예약"],
      c.homepage && !c.resveUrl && [c.homepage, "홈페이지"],
      [`https://map.naver.com/p/search/${enc(q)}`, "네이버 지도"],
      [`https://search.naver.com/search.naver?ssc=tab.blog.all&query=${enc(c.facltNm + " 후기")}`, "후기"],
    ].filter(Boolean).map(([u, n]) => `<a class="link" href="${esc(u)}" target="_blank" rel="noopener">${n}</a>`).join("");
  }

  function campRow(c) {
    const fav = isFav(c.contentId);
    const tags = [
      dogOk(c) ? `<span class="badge b-ok">${esc(c.animalCmgCl)}</span>` : `<span class="badge">반려견 ${esc(c.animalCmgCl || "정보 없음")}</span>`,
      hasElec(c) ? '<span class="badge b-dog">전기</span>' : "",
      ...(c.induty || "").split(",").filter(Boolean).map((t) => `<span class="badge">${esc(t)}</span>`),
    ].join("");
    return `<li class="camp-row">
      <div class="camp-main">
        <div class="camp-top"><strong>${esc(c.facltNm)}</strong><span class="hint">${esc([c.doNm, c.sigunguNm].filter(Boolean).join(" "))}</span></div>
        <div class="meta">${tags}</div>
        ${c.lineIntro ? `<p class="camp-intro">${esc(c.lineIntro)}</p>` : ""}
        <p class="hint">${esc(c.addr1)}${c.tel ? `, ${esc(c.tel)}` : ""}${c.operPdCl ? `, 운영 ${esc(c.operPdCl)}` : ""}</p>
        <div class="links">${links(c)}</div>
      </div>
      <div class="camp-actions">
        <button class="btn btn-sm ${fav ? "btn-primary" : ""}" data-fav="${esc(c.contentId)}" aria-pressed="${fav}">${fav ? "관심 저장됨" : "관심 저장"}</button>
        <button class="btn btn-sm" data-plan="${esc(c.contentId)}">이곳으로 계획</button>
      </div>
    </li>`;
  }

  function setupHTML() {
    return `<div class="panel-card camp-setup">
      <h3>캠핑장 목록이 아직 없어요</h3>
      <p>한국관광공사 고캠핑 공공데이터로 전국 캠핑장 목록을 불러와요. 처음 한 번만 설정하면 매주 월요일에 자동으로 새로 받아요.</p>
      <ol>
        <li><a href="https://www.data.go.kr/data/15101933/openapi.do" target="_blank" rel="noopener">공공데이터포털의 고캠핑 정보 조회서비스</a>에서 PC로 활용신청을 해요. 보통 바로 승인돼요.</li>
        <li>마이페이지에서 '일반 인증키(Decoding)'를 복사해요.</li>
        <li>GitHub ssosha-camp 레포의 Settings → Secrets and variables → Actions에 이름 <code>GOCAMPING_KEY</code>로 붙여넣어요.</li>
        <li>Actions 탭에서 '캠핑장 목록 받기'를 골라 Run workflow를 눌러요. 1~2분 뒤 이 화면에 목록이 나와요.</li>
      </ol>
      <p class="hint">그 전에는 아래 사이트에서 바로 찾아볼 수 있어요.</p>
      <div class="links">
        <a class="link" href="https://www.gocamping.or.kr/bsite/camp/info/list.do" target="_blank" rel="noopener">고캠핑</a>
        <a class="link" href="https://www.thankqcamping.com/" target="_blank" rel="noopener">땡큐캠핑</a>
        <a class="link" href="https://www.campfit.co.kr/" target="_blank" rel="noopener">캠핏</a>
        <a class="link" href="https://map.naver.com/p/search/${enc("애견동반 캠핑장")}" target="_blank" rel="noopener">네이버 지도 애견동반 캠핑장</a>
      </div>
    </div>`;
  }

  function favHTML() {
    const list = favs();
    if (!list.length) return "";
    return `<div class="section-head"><h2>관심 캠핑장 ${list.length}곳</h2></div>
      <ul class="camp-list">${list.map(campRow).join("")}</ul>`;
  }

  function render() {
    const root = document.getElementById("campsRoot");
    if (!root || !api()) return;
    if (!data) {
      root.innerHTML = loadErr ? favHTML() + setupHTML() : '<p class="hint">캠핑장 목록을 불러오는 중이에요…</p>';
      bind(root);
      return;
    }
    const items = data.items || [];
    const dos = [...new Set(items.map((c) => c.doNm).filter(Boolean))].sort();
    const sigs = f.doNm ? [...new Set(items.filter((c) => c.doNm === f.doNm).map((c) => c.sigunguNm).filter(Boolean))].sort() : [];
    const res = items.filter(match);
    root.innerHTML = `
      ${favHTML()}
      <div class="section-head"><div><h2>캠핑장 찾기</h2><p class="hint">고캠핑 공공데이터 ${data.count}곳, ${esc(data.updated)} 기준이에요. 예약 가능 여부는 각 사이트에서 확인하세요.</p></div></div>
      <div class="panel-card camp-filter">
        <label class="search"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><span class="sr">캠핑장 이름이나 지역</span><input id="cfQ" type="search" value="${esc(f.q)}" placeholder="이름이나 지역 (예: 가평, 계곡)"></label>
        <div class="grid2">
          <label class="field"><span>도</span><select id="cfDo"><option value="">전국</option>${dos.map((d) => `<option ${d === f.doNm ? "selected" : ""}>${esc(d)}</option>`).join("")}</select></label>
          <label class="field"><span>시군구</span><select id="cfSig" ${f.doNm ? "" : "disabled"}><option value="">전체</option>${sigs.map((d) => `<option ${d === f.sigungu ? "selected" : ""}>${esc(d)}</option>`).join("")}</select></label>
        </div>
        <div class="toolbar-row">
          <label class="toggle"><input type="checkbox" id="cfDog" ${f.dog ? "checked" : ""}> 반려견 동반 가능</label>
          <label class="toggle"><input type="checkbox" id="cfElec" ${f.elec ? "checked" : ""}> 전기 사용 가능</label>
        </div>
        <div class="chips">${TYPES.map((t) => `<button class="chip" data-type="${t}" aria-pressed="${f.types.has(t)}">${t}</button>`).join("")}</div>
      </div>
      <p class="hint camp-count">조건에 맞는 캠핑장 ${res.length}곳</p>
      ${res.length ? `<ul class="camp-list">${res.slice(0, shown).map(campRow).join("")}</ul>` : '<div class="empty">조건에 맞는 캠핑장이 없어요. 지역을 넓히거나 조건을 하나 빼 보세요.</div>'}
      ${res.length > shown ? `<button class="btn camp-more" id="cfMore">${Math.min(PAGE, res.length - shown)}곳 더 보기</button>` : ""}`;
    bind(root);
  }

  function bind(root) {
    const on = (sel, ev, fn) => { const el = root.querySelector(sel); if (el) el[ev] = fn; };
    let t;
    on("#cfQ", "oninput", (e) => { clearTimeout(t); t = setTimeout(() => { f.q = e.target.value.trim(); shown = PAGE; render(); root.querySelector("#cfQ").focus(); }, 250); });
    on("#cfDo", "onchange", (e) => { f.doNm = e.target.value; f.sigungu = ""; shown = PAGE; render(); });
    on("#cfSig", "onchange", (e) => { f.sigungu = e.target.value; shown = PAGE; render(); });
    on("#cfDog", "onchange", (e) => { f.dog = e.target.checked; shown = PAGE; render(); });
    on("#cfElec", "onchange", (e) => { f.elec = e.target.checked; shown = PAGE; render(); });
    on("#cfMore", "onclick", () => { shown += PAGE; render(); });
    root.querySelectorAll("[data-type]").forEach((b) => (b.onclick = () => { const v = b.dataset.type; f.types.has(v) ? f.types.delete(v) : f.types.add(v); shown = PAGE; render(); }));
    const find = (id) => (data && data.items.find((c) => c.contentId === id)) || favs().find((c) => c.contentId === id);
    root.querySelectorAll("[data-fav]").forEach((b) => (b.onclick = () => {
      const id = b.dataset.fav, list = favs(), i = list.findIndex((c) => c.contentId === id);
      if (i >= 0) list.splice(i, 1); else { const c = find(id); if (c) list.unshift(c); }
      api().save(); render();
    }));
    root.querySelectorAll("[data-plan]").forEach((b) => (b.onclick = () => {
      const c = find(b.dataset.plan); if (!c) return;
      if (!isFav(c.contentId)) { favs().unshift(c); api().save(); }
      if (window.SoshaPlans) window.SoshaPlans.openNew({ place: c.facltNm, campId: c.contentId, dog: dogOk(c) });
    }));
  }

  window.SoshaCamps = { render, init() { render(); load(); }, favs: () => (api() ? favs() : []) };
})();
