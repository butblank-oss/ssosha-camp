(() => {
  "use strict";
  const KEY = "sosha-camp-v1";
  const CATS = window.SOSHA_CATEGORIES;
  const BASE = window.SOSHA_ITEMS;
  const TRIP = window.SOSHA_FIRST_TRIP;
  const COLS = [
    { id: "todo", name: "사야 해요" },
    { id: "research", name: "알아보는 중" },
    { id: "bought", name: "구매 완료" },
    { id: "owned", name: "원래 있던 것" },
  ];
  const PRI = { 1: ["필수", "b-must"], 2: ["권장", "b-nice"], 3: ["나중에", ""] };
  const catName = (id) => (CATS.find((c) => c.id === id) || {}).name || "기타";
  const won = (n) => (n ? Number(n).toLocaleString("ko-KR") + "원" : "-");
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const $ = (s, el = document) => el.querySelector(s);

  /* ---------- 저장소 ---------- */
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
  }
  let state = Object.assign({ items: {}, custom: [], order: {} }, load());
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* 저장 불가 환경 */ }
    if (window.SoshaSync) window.SoshaSync.push(state);
  }
  function allItems() {
    return BASE.concat(state.custom).map((b) => Object.assign({}, b, state.items[b.id] || {}));
  }
  const getItem = (id) => allItems().find((i) => i.id === id);

  /* ---------- 검색 링크 ---------- */
  const enc = encodeURIComponent;
  function linksFor(q) {
    return [
      ["l-dg", "당근", `https://www.daangn.com/kr/search/buy-sell/?q=${enc(q)}`],
      ["l-nv", "N플리마켓", `https://fleamarket.naver.com/search?query=${enc(q)}`],
      ["l-cf", "초캠장터", `https://cafe.naver.com/f-e/cafes/20486145/menus/0?q=${enc(q)}`],
      ["l-ds", "다이소몰", `https://www.daisomall.co.kr/ds/dst/SCR_DST_0015?searchTerm=${enc(q)}`],
      ["l-dn", "다나와 인기순", `https://search.danawa.com/?query=${enc(q)}&sort=saveDESC`],
    ];
  }
  const linksHTML = (q) => `<div class="links">${linksFor(q).map(([c, n, u]) =>
    `<a class="link ${c}" href="${u}" target="_blank" rel="noopener">${n}</a>`).join("")}</div>`;

  /* ---------- 필터 ---------- */
  const filter = { cat: "all", q: "", pri: 0, dog: true };
  function visible(it) {
    if (filter.cat !== "all" && it.cat !== filter.cat) return false;
    if (filter.pri && it.pri > filter.pri) return false;
    if (!filter.dog && it.cat === "dog") return false;
    if (filter.q) {
      const hay = (it.name + it.spec + (it.why || "") + catName(it.cat)).toLowerCase();
      if (!hay.includes(filter.q.toLowerCase())) return false;
    }
    return true;
  }
  function renderChips() {
    const el = $("#catChips");
    el.innerHTML = [{ id: "all", name: "전체" }].concat(CATS).map((c) =>
      `<button class="chip" data-cat="${c.id}" aria-pressed="${filter.cat === c.id}">${c.name}</button>`).join("");
    el.onclick = (e) => {
      const b = e.target.closest(".chip"); if (!b) return;
      filter.cat = b.dataset.cat; renderChips(); renderBoard();
    };
  }

  /* ---------- 보드 ---------- */
  /* 다녀온 캠핑의 배운 점에 걸린 장비는 우선순위를 맨 위로 올려요 */
  function lessonIds() {
    const ids = new Set();
    (TRIP.lessons || []).forEach((l) => (l.items || []).forEach((id) => ids.add(id)));
    allItems().forEach((i) => { if (i.lesson) ids.add(i.id); });
    return ids;
  }
  const isLesson = (it) => lessonIds().has(it.id);
  function sorted(status) {
    const items = allItems().filter((i) => i.status === status);
    const ord = state.order[status] || [];
    const L = lessonIds();
    return items.sort((a, b) => {
      if ((status === "todo" || status === "research") && L.has(a.id) !== L.has(b.id)) return L.has(a.id) ? -1 : 1;
      const ia = ord.indexOf(a.id), ib = ord.indexOf(b.id);
      if (ia !== -1 || ib !== -1) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
      return a.pri - b.pri;
    });
  }
  function cardHTML(it) {
    const [pl, pc] = PRI[it.pri] || PRI[3];
    const paid = it.purchase && it.purchase.price;
    return `<article class="card" data-id="${esc(it.id)}" data-pri="${it.pri}" tabindex="0" role="button" aria-label="${esc(it.name)} 자세히 보기">
      <div class="card-top"><h3>${esc(it.name)}</h3>${it.rating ? `<span class="rating">활용도 ${it.rating}/5</span>` : ""}</div>
      <p>${esc(it.model || it.spec)}</p>
      <div class="meta">
        ${isLesson(it) && it.status !== "bought" && it.status !== "owned" ? '<span class="badge b-lesson">교훈</span>' : ""}<span class="badge ${pc}">${pl}</span>
        <span>${esc(catName(it.cat))}</span>
        ${paid ? `<span class="price">${won(it.purchase.price)}${it.purchase.where ? ", " + esc(it.purchase.where) : ""}</span>` : ""}
        ${!paid && (it.status === "todo" || it.status === "research") && window.SoshaGame ? `<span class="xp-tag">+${window.SoshaGame.xpFor(it)} XP</span>` : ""}
        ${it.status === "todo" || it.status === "research" ? `<button class="quick-move" data-move="${esc(it.id)}" aria-label="${esc(it.name)} 구매 완료로 옮기기">샀어요</button>` : ""}
        <button class="move-menu" data-menu="${esc(it.id)}" aria-label="${esc(it.name)} 다른 칸으로 옮기기"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg></button>
      </div>
    </article>`;
  }
  let sortables = [];
  let mobileCol = (() => { try { return localStorage.getItem("sosha-col") || "todo"; } catch { return "todo"; } })();
  function renderBoard() {
    const board = $("#board");
    const tabs = $("#colTabs");
    if (tabs) {
      tabs.innerHTML = COLS.map((c) => {
        const n = allItems().filter((i) => i.status === c.id && visible(i)).length;
        return `<button role="tab" class="col-tab" data-coltab="${c.id}" aria-selected="${c.id === mobileCol}">${c.name}<b>${n}</b></button>`;
      }).join("");
    }
    board.dataset.active = mobileCol;
    board.innerHTML = COLS.map((c) => {
      const all = sorted(c.id);
      const vis = all.filter(visible);
      const sum = all.reduce((s, i) => s + ((i.purchase && +i.purchase.price) || 0), 0);
      return `<section class="col" data-col="${c.id}" aria-label="${c.name}">
        <div class="col-head"><h2>${c.name}</h2><span class="count">${vis.length}${vis.length !== all.length ? " / " + all.length : ""}개</span></div>
        ${sum ? `<div class="col-sum">합계 ${won(sum)}</div>` : ""}
        <div class="list" data-status="${c.id}">${vis.map(cardHTML).join("") || '<div class="empty">여기로 끌어다 놓으세요</div>'}</div>
      </section>`;
    }).join("");
    sortables.forEach((s) => s.destroy());
    sortables = [];
    if (window.Sortable) {
      board.querySelectorAll(".list").forEach((list) => {
        sortables.push(new Sortable(list, {
          group: "board", animation: 180, ghostClass: "ghost", dragClass: "drag",
          delay: 150, delayOnTouchOnly: true, filter: ".empty, .quick-move, .move-menu", preventOnFilter: false, forceFallback: true, fallbackOnBody: true, fallbackTolerance: 4, scroll: true, bubbleScroll: true, scrollSensitivity: 80,
          onEnd: syncFromDOM,
        }));
      });
    }
    renderStats();
  }
  function moveTo(id, status) {
    setField(id, { status });
    state.order[status] = [id].concat((state.order[status] || []).filter((x) => x !== id));
    save(); renderBoard(); renderUsed();
    const c = COLS.find((x) => x.id === status);
    const t = $("#toast"); if (t) { t.textContent = `'${c.name}'(으)로 옮겼어요`; t.classList.add("show"); clearTimeout(moveTo._t); moveTo._t = setTimeout(() => t.classList.remove("show"), 2200); }
  }
  function openMove(id) {
    const it = getItem(id); const dlg = $("#moveDlg"); if (!it || !dlg) return;
    $("#moveTitle").textContent = it.name;
    $("#moveBody").innerHTML = COLS.map((c) => `<button type="button" class="move-opt" data-to="${c.id}" ${c.id === it.status ? "disabled" : ""}>${c.name}${c.id === it.status ? " (지금)" : ""}</button>`).join("") +
      `<button type="button" class="move-opt ghost-opt" data-detail="1">자세히 보기, 구매 기록 남기기</button>`;
    $("#moveBody").querySelectorAll("[data-to]").forEach((b) => (b.onclick = () => { dlg.close(); moveTo(id, b.dataset.to); }));
    $("#moveBody").querySelector("[data-detail]").onclick = () => { dlg.close(); openItem(id); };
    dlg.showModal();
  }
  function syncFromDOM() {
    document.querySelectorAll("#board .list").forEach((list) => {
      const status = list.dataset.status;
      const ids = [...list.querySelectorAll(".card")].map((c) => c.dataset.id);
      ids.forEach((id) => setField(id, { status }));
      const hidden = (state.order[status] || []).filter((id) => !ids.includes(id) && (getItem(id) || {}).status === status);
      state.order[status] = ids.concat(hidden);
    });
    save();
    renderBoard();
  }
  function setField(id, patch) {
    const custom = state.custom.find((c) => c.id === id);
    if (custom) Object.assign(custom, patch);
    else state.items[id] = Object.assign({}, state.items[id], patch);
  }

  function renderStats() {
    const items = allItems();
    const spent = TRIP.site + items.reduce((s, i) => s + (((i.status === "bought" || i.status === "owned") && i.purchase && +i.purchase.price) || 0), 0);
    const must = items.filter((i) => i.pri === 1 && (i.status === "todo" || i.status === "research")).length;
    const have = items.filter((i) => i.status === "bought" || i.status === "owned").length;
    const pct = Math.round((have / items.length) * 100);
    if ($("#log") && $("#log").childElementCount) renderLog();
    if (window.SoshaGame) window.SoshaGame.render(items, { spent: won(spent), must: must + "개", pct: pct + "%" });
  }

  /* ---------- 추천 제품 ---------- */
  function picksHTML(id) {
    const ps = (window.SOSHA_PICKS || {})[id];
    if (!ps || !ps.length) return "";
    return `<div class="field"><span>추천 제품 (다나와 최저가 기준, 무게와 크기에 '추정' 표시가 있으면 판매 페이지에서 확인)</span><div class="picks">${ps.map((p) => {
      const sz = p.packedCm ? p.packedCm.join("×") + "cm" : "";
      const spec = [p.weightKg ? p.weightKg + "kg" : "", sz].filter(Boolean).join(", ") + (p.est ? " (추정)" : "");
      return `<div class="pick ${p.pick ? "best" : ""}">
        <div class="pick-top"><strong>${p.pick ? '<span class="badge b-ok">추천</span> ' : ""}${esc(p.brand)} ${esc(p.model)}</strong><span>${p.price ? won(p.price) : "-"}</span></div>
        <p>${esc(p.why)}</p>
        ${spec ? `<span class="spec">${esc(spec)}</span>` : ""}
        ${p.url ? `<a href="${esc(p.url)}" target="_blank" rel="noopener">상품 보기</a>` : ""}
      </div>`;
    }).join("")}</div></div>`;
  }

  /* ---------- 상세 다이얼로그 ---------- */
  const dlg = $("#dlg");
  let editing = null;
  let draftRating = 0;
  function openItem(id) {
    const isNew = !id;
    const it = isNew ? { id: "c" + Date.now(), name: "", cat: "kitchen", status: "todo", pri: 2, spec: "", why: "", q: "", newPrice: "", usedPrice: "", custom: true } : getItem(id);
    editing = { id: it.id, isNew, custom: isNew || !!state.custom.find((c) => c.id === it.id) };
    draftRating = it.rating || 0;
    const p = it.purchase || {};
    $("#dlgCat").textContent = catName(it.cat);
    $("#dlgTitle").textContent = it.name || "새 품목";
    $("#delBtn").hidden = !editing.custom || isNew;
    const opt = (arr, cur) => arr.map(([v, n]) => `<option value="${v}" ${String(v) === String(cur) ? "selected" : ""}>${n}</option>`).join("");
    $("#dlgBody").innerHTML = `
      ${editing.custom ? `
        <label class="field"><span>품목 이름</span><input type="text" name="name" value="${esc(it.name)}" required></label>
        <div class="grid2">
          <label class="field"><span>카테고리</span><select name="cat">${opt(CATS.map((c) => [c.id, c.name]), it.cat)}</select></label>
          <label class="field"><span>검색어 (중고 검색용)</span><input type="text" name="q" value="${esc(it.q)}"></label>
        </div>
        <label class="field"><span>추천 스펙 / 메모</span><input type="text" name="spec" value="${esc(it.spec)}"></label>` : `
        ${it.model ? `<div class="box"><h4>우리 모델</h4><p>${esc(it.model)}</p></div>` : ""}
        <div class="box"><h4>추천 스펙</h4><p>${esc(it.spec)}</p></div>
        <div class="box"><h4>왜 필요해요?</h4><p>${esc(it.why)}</p></div>
        <div class="prices"><div class="box"><h4>신품 시세</h4><p class="num">${esc(it.newPrice || "-")}</p></div><div class="box"><h4>중고 시세</h4><p class="num">${esc(it.usedPrice || "-")}</p></div></div>
        ${picksHTML(it.id)}`}
      ${it.q || it.name ? `<div class="field"><span>매물 찾아보기: "${esc(it.q || it.name)}"</span>${linksHTML(it.q || it.name)}${it.link ? `<a class="link" href="${esc(it.link)}" target="_blank" rel="noopener">다나와 제품 페이지</a>` : ""}</div>` : ""}
      <div class="grid2">
        <label class="field"><span>상태</span><select name="status">${opt(COLS.map((c) => [c.id, c.name]), it.status)}</select></label>
        <label class="field"><span>우선순위</span><select name="pri">${opt([[1, "필수"], [2, "권장"], [3, "나중에"]], it.pri)}</select></label>
      </div>
      <fieldset class="purchase">
        <legend>구매 기록</legend>
        <div class="grid2">
          <label class="field"><span>어디서</span><input type="text" name="where" value="${esc(p.where)}" placeholder="예: 당근, 고릴라캠핑"></label>
          <label class="field"><span>얼마에 (원)</span><input type="number" inputmode="numeric" name="price" value="${esc(p.price)}" placeholder="59000"></label>
          <label class="field"><span>언제</span><input type="text" name="date" value="${esc(p.date)}" placeholder="2026-11"></label>
          <label class="field"><span>상태</span><select name="cond">${opt([["", "-"], ["신품", "신품"], ["중고", "중고"], ["선물", "선물·집에 있던 것"]], p.cond || "")}</select></label>
        </div>
        <label class="field"><span>어떻게 샀는지 메모</span><input type="text" name="how" value="${esc(p.how)}" placeholder="예: 직거래, 쿠폰 할인, 세트로 구매"></label>
      </fieldset>
      <div class="field"><span>활용도</span><div class="rate" id="rate" role="radiogroup" aria-label="활용도">${[1, 2, 3, 4, 5].map((n) =>
        `<button type="button" role="radio" aria-checked="${n === draftRating}" aria-label="${n}점" data-n="${n}" class="${n <= draftRating ? "on" : ""}">${n}</button>`).join("")}</div></div>
      <label class="field"><span>활용도 메모 (써보니 어땠는지)</span><textarea name="memo" placeholder="예: 11월 밤에도 전기장판 2단이면 충분했음">${esc(it.memo)}</textarea></label>`;
    $("#rate").onclick = (e) => {
      const b = e.target.closest("button"); if (!b) return;
      const n = +b.dataset.n;
      draftRating = draftRating === n ? 0 : n;
      [...$("#rate").children].forEach((x) => { const on = +x.dataset.n <= draftRating; x.classList.toggle("on", on); x.setAttribute("aria-checked", +x.dataset.n === draftRating); });
    };
    dlg.showModal();
  }
  dlg.addEventListener("close", () => {
    if (dlg.returnValue !== "save" || !editing) return;
    const f = $("#dlgForm");
    const v = (n) => (f.elements[n] ? f.elements[n].value.trim() : undefined);
    const patch = {
      status: v("status"), pri: +v("pri"), rating: draftRating, memo: v("memo"),
      purchase: { where: v("where"), price: v("price") ? +v("price") : "", date: v("date"), cond: v("cond"), how: v("how") },
    };
    if (editing.custom) Object.assign(patch, { name: v("name") || "이름 없는 품목", cat: v("cat"), q: v("q"), spec: v("spec") });
    if (editing.isNew) state.custom.push(Object.assign({ id: editing.id, custom: true, why: "", newPrice: "", usedPrice: "" }, patch));
    else setField(editing.id, patch);
    save(); renderBoard(); renderUsed();
    editing = null;
  });
  $("#delBtn").onclick = () => {
    if (!editing) return;
    const b = $("#delBtn");
    if (b.dataset.armed !== "1") { b.dataset.armed = "1"; b.textContent = "한 번 더 누르면 삭제"; setTimeout(() => { b.dataset.armed = ""; b.textContent = "삭제"; }, 3000); return; }
    b.dataset.armed = ""; b.textContent = "삭제";
    state.custom = state.custom.filter((c) => c.id !== editing.id);
    editing = null; save(); dlg.close(); renderBoard(); renderUsed();
  };

  /* ---------- 가이드 ---------- */
  const I = {
    box: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/></svg>',
    bowl: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11h18a9 9 0 0 1-18 0z"/><path d="M8 7c0-1 1-1 1-2M12 7c0-1 1-1 1-2M16 7c0-1 1-1 1-2"/></svg>',
    bolt: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>',
    flame: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22c4 0 7-3 7-7 0-5-5-7-5-12-3 2-4 5-4 7-1-1-2-2-2-4-2 2-3 5-3 9 0 4 3 7 7 7z"/></svg>',
    alert: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 2 21h20z"/><path d="M12 10v5M12 18h.01"/></svg>',
    paw: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="5.5" cy="10" r="2"/><circle cx="9.5" cy="5.5" r="2"/><circle cx="14.5" cy="5.5" r="2"/><circle cx="18.5" cy="10" r="2"/><path d="M12 12c-3 0-6 4-6 6.5 0 1.5 1 2.5 2.5 2.5 1.5 0 2.3-1 3.5-1s2 1 3.5 1c1.5 0 2.5-1 2.5-2.5C18 16 15 12 12 12z"/></svg>',
    moon: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>',
    list: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/></svg>',
  };
  function renderGuide() {
    $("#guide").innerHTML = `
    <article class="g panel-card"><h3><span class="ico-wrap">${I.box}</span>아이스박스는 몇 리터?</h3>
      <table class="mini"><tr><th>상황</th><th>추천 용량</th></tr>
      <tr><td>2인 1박 (지금 우리)</td><td><strong>25~30L</strong></td></tr>
      <tr><td>2인 2박, 여름</td><td>40~45L</td></tr>
      <tr><td>겨울 1박</td><td>소프트쿨러 20L로 충분</td></tr></table>
      <ul><li>1L 정도 = 캔 1.5개라고 생각하면 쉬워요. 고기 1kg + 반찬 + 음료 8캔이면 25L면 돼요.</li>
      <li>하드쿨러는 의자나 테이블로도 쓸 수 있어요. 바퀴 달린 45L 이상은 2인에겐 무거워요.</li>
      <li>아이스팩은 위아래에 하나씩. 얼린 생수를 넣으면 다음 날 마실 물이 돼요.</li></ul></article>

    <article class="g panel-card"><h3><span class="ico-wrap">${I.bowl}</span>그릇은 뭘 사야 해요?</h3>
      <table class="mini"><tr><th></th><th>스테인리스</th><th>멜라민</th></tr>
      <tr><td>무게</td><td>보통</td><td>가벼움</td></tr>
      <tr><td>불·열</td><td>강함</td><td>약함 (변형)</td></tr>
      <tr><td>깨짐</td><td>안 깨짐</td><td>잘 안 깨짐</td></tr>
      <tr><td>추천</td><td><strong>우리에게 추천</strong></td><td>피크닉용</td></tr></table>
      <ul><li>2인 기본: 큰 접시 2, 앞접시 2, 국그릇(볼) 2, 보온 머그 2, 수저 2벌</li>
      <li>떡볶이·찌개처럼 국물 요리가 많으면 볼을 깊은 것으로 골라요.</li>
      <li>겹쳐서 수납되는 세트를 고르면 폴딩박스에 쏙 들어가요.</li></ul></article>

    <article class="g panel-card"><h3><span class="ico-wrap">${I.bolt}</span>캠핑장 전기 계산법</h3>
      <p>캠핑장 전기는 보통 <strong>사이트당 600W~1kW</strong>로 제한돼요. 넘으면 차단기가 내려가요.</p>
      <table class="mini"><tr><th>기기</th><th>전력</th></tr>
      <tr><td>전기장판 더블</td><td>약 150~200W</td></tr>
      <tr><td>소형 온풍기</td><td>약 500~800W</td></tr>
      <tr><td>휴대폰·랜턴 충전</td><td>약 20~60W</td></tr>
      <tr><td>전기포트</td><td>1000W 이상 (대부분 금지)</td></tr></table>
      <ul><li>릴선은 <strong>1.5sq면 충분</strong>해요(약 15A까지 버텨요). 굵기보다 과부하·누전 차단기와 접지가 중요하고, 쓸 때는 끝까지 풀어서 써야 열이 안 나요.</li></ul></article>

    <article class="g warn panel-card"><h3><span class="ico-wrap">${I.alert}</span>겨울 안전 (꼭 읽기)</h3>
      <ul><li><strong>부탄가스를 불 옆에서 데우지 마세요.</strong> 가스통이 터질 수 있어요. 동계용(이소부탄) 가스를 쓰고, 쓰기 전까지 침낭이나 주머니에 넣어 체온으로 데워요.</li>
      <li>원터치 텐트 안에서는 <strong>가스·숯·등유 난로를 쓰지 마세요.</strong> 환기가 안 되고 천이 얇아서 화재와 일산화탄소 중독 위험이 커요. 전기장판과 전기 온풍기만 써요.</li>
      <li>일산화탄소 경보기는 사람과 강아지 모두를 위한 장비예요.</li>
      <li>화로대 근처에 소화기와 물 한 통을 놓아요.</li></ul></article>

    <article class="g panel-card"><h3><span class="ico-wrap">${I.moon}</span>어두워지기 전 루틴</h3>
      <ul><li>도착하면 해 지기 전에 <strong>텐트 → 팩질 → 전기 → 조명</strong> 순서로 설치해요.</li>
      <li>저녁 재료 손질은 밝을 때 끝내요. 떡볶이처럼 불기 쉬운 메뉴는 먹기 직전에 끓여요.</li>
      <li>헤드랜턴은 1인당 하나. 메인 랜턴은 높이 걸면 넓게 비춰요.</li>
      <li>철수할 때는 폴딩박스 2개(주방 / 생활)에 정해진 물건만 넣어요. 박스가 정리 순서가 돼요.</li></ul></article>

    <article class="g panel-card"><h3><span class="ico-wrap">${I.paw}</span>강아지 동반 체크</h3>
      <ul><li>'애견 동반 가능'인지, 몸무게나 마릿수 제한이 있는지 예약 전에 확인해요.</li>
      <li>리드줄 고정 앵커로 화로대에서 2m 이상 떨어진 곳에 자리를 만들어줘요.</li>
      <li>집에서 쓰던 담요, 물그릇, 사료 1회분 소분, 배변봉투, 발 닦을 물티슈를 챙겨요.</li>
      <li>장작 연기는 강아지에게 자극적이니 바람 반대쪽에 두어요.</li>
      <li>소형견은 밤에 체온이 금방 떨어져요. 패딩을 입히고 전기장판 위에 같이 재워요.</li></ul></article>

    <article class="g panel-card"><h3><span class="ico-wrap">${I.list}</span>구매 순서 추천</h3>
      <ol>
      <li><strong>1순위 (다음 캠핑 전)</strong>: 릴선, 전기장판, 헤드랜턴·메인 랜턴, 단조팩·망치, 동계용 가스, 가위·집게·양념통, 식기·수저, 폴딩박스, 일산화탄소 경보기</li>
      <li><strong>2순위</strong>: 그라운드시트, 아이스박스, 그리들, 설거지 가방, 방염포, 강아지 앵커·방석</li>
      <li><strong>3순위 (취향이 생기면)</strong>: 타프, 야전침대, 동계 침낭, 리빙쉘 텐트(한겨울용)</li></ol>
      <p class="hint">릴선, 랜턴, 폴딩박스는 중고가 많고 상태 차이가 적어서 중고로 사기 좋아요. 전기장판과 가스류는 신품을 추천해요.</p></article>
    ${guideExtra()}`;
  }
  function guideExtra() {
    const PICKS = window.SOSHA_PICKS || {};
    const top = Object.keys(PICKS).map((id) => ({ id, it: getItem(id), p: PICKS[id].find((x) => x.pick) })).filter((x) => x.it && x.p);
    const shops = window.SOSHA_SHOPS || [], tips = window.SOSHA_TIPS || [];
    const usedNew = `<table class="mini"><tr><th>중고로 사도 괜찮아요</th><th>새로 사요</th></tr>
      <tr><td>랜턴, 테이블, 의자, 폴딩박스, 릴선(차단기 작동 확인), 아이스박스, 타프</td><td>침낭과 매트(위생, 보온 성능), 전기장판, 부탄가스, 소화기, 일산화탄소 경보기</td></tr></table>`;
    const byTopic = {};
    tips.forEach((t) => { (byTopic[t.topic] = byTopic[t.topic] || []).push(t); });
    return `
    <article class="g panel-card g-wide"><h3><span class="ico-wrap">${I.list}</span>필수 품목 추천 제품 한눈에</h3>
      <p class="hint">다나와 최저가 기준으로 조사했어요(2026년 11월). 카드를 누르면 다른 후보 2개도 볼 수 있어요.</p>
      <div class="table-wrap"><table class="tbl"><thead><tr><th>품목</th><th>추천 제품</th><th>가격</th><th>무게</th><th>왜</th></tr></thead><tbody>
      ${top.map(({ it, p }) => `<tr><td><strong>${esc(it.name)}</strong></td><td>${esc(p.brand)} ${esc(p.model)}</td><td class="num">${won(p.price)}</td><td class="num">${p.weightKg ? p.weightKg + "kg" + (p.est ? " (추정)" : "") : "-"}</td><td>${esc(p.why)}</td></tr>`).join("")}
      </tbody></table></div></article>

    <article class="g panel-card g-wide"><h3><span class="ico-wrap">${I.box}</span>어디서 사요? 생활 매장 구매 경로</h3>
      <div class="shop-grid">${shops.map((sh) => `<div class="shop"><strong>${esc(sh.shop)}</strong>
        ${sh.buy && sh.buy.length ? `<ul>${sh.buy.map((b) => `<li>${esc(b.product || b.item)}${b.price && b.price !== "미확인" ? `, ${esc(b.price)}` : ""}${b.note ? `: ${esc(b.note)}` : ""}${b.url ? ` <a class="src" href="${esc(b.url)}" target="_blank" rel="noopener">출처</a>` : ""}</li>`).join("")}</ul>` : ""}
        ${sh.avoid && sh.avoid.length ? `<ul>${sh.avoid.map((a) => `<li><strong>${esc(a.item)}</strong>: ${esc(a.why)}${a.url ? ` <a class="src" href="${esc(a.url)}" target="_blank" rel="noopener">출처</a>` : ""}</li>`).join("")}</ul>` : ""}
      </div>`).join("")}</div>
      <p class="hint">트레이더스, 이마트, 노브랜드, 홈플러스, 데카트론, 무인양품은 믿을 만한 후기를 찾지 못해서 넣지 않았어요. 매장에서 보면 위 '새로 사요' 목록만 피하면 돼요.</p>
      ${usedNew}</article>

    ${(window.SOSHA_SHELTER_TIPS || []).length ? `<article class="g panel-card g-wide"><h3><span class="ico-wrap">${I.box}</span>겨울 쉘터 고르는 법 (경량, 우레탄창)</h3>
      <ul>${window.SOSHA_SHELTER_TIPS.map((t) => `<li>${esc(t.tip)}${t.url ? ` <a class="src" href="${esc(t.url)}" target="_blank" rel="noopener">출처</a>` : ""}</li>`).join("")}</ul>
      <p class="hint">후보 제품은 준비 보드의 '경량 쉘터 (우레탄창)' 카드를 눌러 보세요.</p></article>` : ""}
    <article class="g panel-card g-wide"><h3><span class="ico-wrap">${I.moon}</span>베테랑 캠퍼들의 조언</h3>
      <div class="shop-grid">${Object.entries(byTopic).map(([topic, ts]) => `<div class="shop"><strong>${esc(topic)}</strong><ul>${ts.map((t) => `<li>${esc(t.tip)}${t.url ? ` <a class="src" href="${esc(t.url)}" target="_blank" rel="noopener">출처</a>` : ""}</li>`).join("")}</ul></div>`).join("")}</div>
    </article>`;
  }

  /* ---------- 중고·다나와 ---------- */
  function renderMarket() {
    $("#danawa").innerHTML = window.SOSHA_DANAWA.map((d) => {
      const [pl, pc] = PRI[d.pri];
      return `<a class="dn" href="https://search.danawa.com/?query=${enc(d.q)}&sort=saveDESC" target="_blank" rel="noopener">
        <strong>${esc(d.name)} <span class="badge ${pc}">${pl}</span></strong>
        <span>추천 필터: ${esc(d.filter)}</span></a>`;
    }).join("");
    const fq = $("#freeQ");
    fq.oninput = () => { $("#freeLinks").innerHTML = fq.value.trim() ? linksHTML(fq.value.trim()) : ""; };
    renderUsed();
  }
  function renderUsed() {
    const rows = allItems().filter((i) => i.status === "todo" || i.status === "research").sort((a, b) => a.pri - b.pri);
    $("#usedTbl").innerHTML = `<thead><tr><th>품목</th><th>중고 시세</th><th>신품 시세</th><th>바로가기</th></tr></thead><tbody>${rows.map((i) => {
      const [pl, pc] = PRI[i.pri] || PRI[3];
      return `<tr><td><strong>${esc(i.name)}</strong><br><span class="badge ${pc}">${pl}</span></td><td class="num">${esc(i.usedPrice || "-")}</td><td class="num">${esc(i.newPrice || "-")}</td><td>${linksHTML(i.q || i.name)}</td></tr>`;
    }).join("")}</tbody>`;
  }

  /* ---------- 기록 ---------- */
  function renderLog() {
    const spentItems = TRIP.spent.reduce((s, x) => s + x.price, 0);
    const haveIt = (id) => { const it = getItem(id); return it && (it.status === "bought" || it.status === "owned"); };
    const solved = TRIP.lessons.filter((l) => (l.items || []).every(haveIt)).length;
    $("#log").innerHTML = `<article class="trip">
      <div class="trip-head">
        <span class="badge b-ok">첫 캠핑</span>
        <h2>${esc(TRIP.place)}</h2>
        <div class="trip-sum">
          <span>${esc(TRIP.date)}</span>
          <span>합계 <strong class="num">${won(TRIP.site + spentItems)}</strong></span>
          <span>사이트 ${won(TRIP.site)}</span>
          ${TRIP.spent.map((x) => `<span>${esc(x.name.replace(/ \(.*\)/, ""))} ${won(x.price)}, ${esc(x.where)} ${esc(x.cond)}</span>`).join("")}
        </div>
      </div>
      <div class="lesson-head"><h3>첫 캠핑에서 배운 점</h3><span class="lesson-score">해결 ${solved} / ${TRIP.lessons.length}</span></div>
      <p class="hint">장비를 사서 구매 완료로 옮기면 그 교훈이 해결로 바뀌어요. 장비 이름을 누르면 추천 제품을 볼 수 있어요.</p>
      <div class="lessons">${TRIP.lessons.map((l, i) => {
        const done = (l.items || []).every(haveIt);
        return `<div class="lesson ${done ? "done" : ""}">
          <div class="lesson-top"><span class="lesson-n">${i + 1}</span><strong>${esc(l.t)}</strong>${done ? '<span class="badge b-ok">해결</span>' : ""}</div>
          <p class="lesson-what">${esc(l.d)}</p>
          <div class="lesson-fix"><span>다음엔 이렇게</span><p>${esc(l.fix || "")}</p></div>
          <div class="lesson-items">${(l.items || []).map((id) => { const it = getItem(id); if (!it) return ""; const h = haveIt(id); return `<button class="item-chip ${h ? "have" : ""}" data-open="${esc(id)}">${h ? "가짐" : "필요"} ${esc(it.name)}</button>`; }).join("")}</div>
        </div>`;
      }).join("")}</div>
    </article>`;
    $("#log").querySelectorAll("[data-open]").forEach((b) => (b.onclick = () => openItem(b.dataset.open)));
  }

  /* ---------- 탭 ---------- */
  function showTab(name) {
    document.querySelectorAll(".tab").forEach((t) => t.setAttribute("aria-selected", t.dataset.tab === name));
    document.querySelectorAll(".panel").forEach((p) => (p.hidden = p.id !== "tab-" + name));
    try { history.replaceState(null, "", "#" + name); } catch { /* noop */ }
  }
  document.querySelector(".tabs").onclick = (e) => { const t = e.target.closest(".tab"); if (t) showTab(t.dataset.tab); };

  /* ---------- 이벤트 ---------- */
  $("#board").addEventListener("click", (e) => {
    const menu = e.target.closest("[data-menu]");
    if (menu) { e.stopPropagation(); openMove(menu.dataset.menu); return; }
    const mv = e.target.closest("[data-move]");
    if (mv) {
      e.stopPropagation();
      setField(mv.dataset.move, { status: "bought" });
      state.order.bought = [mv.dataset.move].concat((state.order.bought || []).filter((x) => x !== mv.dataset.move));
      save(); renderBoard(); renderUsed();
      const t = $("#toast"); if (t) { t.textContent = "구매 완료로 옮겼어요. 카드를 눌러 가격을 적으면 +5 XP예요"; t.classList.add("show"); setTimeout(() => t.classList.remove("show"), 2600); }
      return;
    }
    const c = e.target.closest(".card"); if (c) openItem(c.dataset.id);
  });
  $("#board").addEventListener("keydown", (e) => {
    const c = e.target.closest(".card");
    if (c && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openItem(c.dataset.id); }
  });
  const colTabs = $("#colTabs");
  if (colTabs) colTabs.onclick = (e) => {
    const b = e.target.closest("[data-coltab]"); if (!b) return;
    mobileCol = b.dataset.coltab; try { localStorage.setItem("sosha-col", mobileCol); } catch { /* 저장 불가 */ }
    renderBoard();
  };
  $("#q").oninput = (e) => { filter.q = e.target.value.trim(); renderBoard(); };
  const topQ = $("#topQ");
  if (topQ) topQ.oninput = (e) => { filter.q = e.target.value.trim(); $("#q").value = e.target.value; showTab("board"); renderBoard(); };
  $("#priSel").onchange = (e) => { filter.pri = +e.target.value; renderBoard(); };
  $("#dogToggle").onchange = (e) => { filter.dog = e.target.checked; renderBoard(); };
  $("#addBtn").onclick = () => openItem(null);
  function note(msg) {
    const t = $("#toast"); if (!t) return;
    t.textContent = msg; t.classList.add("show");
    clearTimeout(note._t); note._t = setTimeout(() => t.classList.remove("show"), 2600);
  }
  $("#exportBtn").onclick = async () => {
    const filename = `sosha-camp-${new Date().toISOString().slice(0, 10)}.json`;
    const data = JSON.stringify(state, null, 2);
    if (window.claude && typeof window.claude.use === "function") {
      const dl = await window.claude.use("downloads").catch(() => null);
      if (dl) { try { await dl.save({ filename, data }); note("백업 파일을 저장했어요"); } catch { note("저장을 취소했어요"); } return; }
    }
    const blob = new Blob([data], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  $("#importFile").onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      state = Object.assign({ items: {}, custom: [], order: {} }, data);
      save(); renderBoard(); renderUsed(); note("백업을 불러왔어요");
    } catch { note("파일을 읽지 못했어요. sosha-camp 백업 파일인지 확인해 주세요."); }
    e.target.value = "";
  };
  $("#resetBtn").onclick = (e) => {
    const b = e.currentTarget;
    if (b.dataset.armed !== "1") { b.dataset.armed = "1"; b.textContent = "한 번 더 누르면 모두 지워요"; setTimeout(() => { b.dataset.armed = ""; b.textContent = "처음 상태로 되돌리기"; }, 3000); return; }
    b.dataset.armed = ""; b.textContent = "처음 상태로 되돌리기";
    state = { items: {}, custom: [], order: {} }; save(); renderBoard(); renderUsed();
  };

  window.SOSHA = {
    allItems, save, openItem, moveTo, lessonIds, get state() { return state; },
    replaceState(next) {
      state = Object.assign({ items: {}, custom: [], order: {} }, next);
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* 저장 불가 환경 */ }
      renderBoard(); renderUsed();
      if (window.SoshaTrips) window.SoshaTrips.render();
      if (window.SoshaPlans) window.SoshaPlans.render();
    },
  };
  window.SOSHA_REFRESH = () => { renderBoard(); renderUsed(); };
  renderChips(); renderBoard(); renderGuide(); renderMarket(); renderLog();
  if (window.SoshaTrips) window.SoshaTrips.init();
  if (window.SoshaPlans) window.SoshaPlans.init();
  const h = location.hash.slice(1);
  if (["board", "guide", "market", "log"].includes(h)) showTab(h);
})();
