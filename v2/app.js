/* Sosha Camp v2 프로토타입
 * - 데이터: data.js, research.js (v1과 같은 파일), 저장 키도 v1과 같아서 기록이 이어져요
 * - 장면: game.js의 SVG 장면을 그대로 써요 (가진 장비와 레벨에 따라 바뀜, 나중에 캐릭터 커스텀 자리)
 * - 화면: 홈 / 장비 / 알아보기 / 기록, 장비 상세와 입력은 바텀시트
 */
(() => {
  "use strict";
  const KEY = "sosha-camp-v1";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const enc = encodeURIComponent;
  /* 받침에 따라 이/가 */
  const iga = (w) => { const c = String(w).charCodeAt(String(w).length - 1); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 ? "이" : "가"; };
  const won = (n) => (n == null || n === "" || isNaN(+n) ? "" : (+n).toLocaleString("ko-KR") + "원");

  const BASE = window.SOSHA_ITEMS || [];
  const CATS = window.SOSHA_CATEGORIES || [];
  const PICKS = window.SOSHA_PICKS || {};
  const TRIP = window.SOSHA_FIRST_TRIP || { lessons: [] };
  const TIPS = window.SOSHA_TIPS || [];
  const GAME = window.SoshaGame;
  const CP = window.SOSHA_COUPANG || {};
  /* 파트너스 링크가 아직 없으면 쿠팡 검색으로 연결해요. coupang.js에 링크가 생기면 자동으로 그 링크를 써요 */
  const cpFor = (id) => {
    const c = CP[id];
    if (c && (c.url || c.searchUrl)) return c;
    const i = BASE.concat(state.custom || []).find((x) => x.id === id);
    return i ? { name: i.name, searchUrl: `https://www.coupang.com/np/search?q=${enc(i.q || i.name)}` } : null;
  };
  const hasCP = () => true;
  /* 쿠팡 파트너스 고지
   * - 링크 카드 안, 구매 버튼 바로 위에 한 줄 (링크를 누르기 전에 반드시 보이는 자리)
   * - 화면 맨 아래에 서비스 전체 고지 */
  const footNote = () => (hasCP() ? '<footer class="foot-note"><p>이 서비스의 구매 링크는 쿠팡 파트너스 활동의 일환이며, 이를 통해 일정액의 수수료를 받습니다. <b>수수료는 추천 순서와 내용에 영향을 주지 않습니다.</b></p><p>© 2026 Sosha Camp</p></footer>' : "");

  /* ---------- 저장 ---------- */
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } }
  const state = Object.assign({ items: {}, custom: [], order: {}, trips: [], plans: [] }, load());
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* 저장이 막힌 브라우저에서도 화면은 동작해요 */ } shared.push(); }

  /* ---------- 공유: 지쏘·시아가 같은 기록을 봐요 ----------
   * Claude 아티팩트에서 열면 공유 저장소(shared/board)와 실시간으로 맞춰요.
   * 편집 권한이 있는 사람(지쏘·시아)만 저장하고, 나머지는 보기 전용이에요.
   * GitHub Pages처럼 공유 저장소가 없는 곳에서는 이 브라우저에만 저장돼요. */
  const shared = {
    mode: "local", // local | loading | live | readonly | error
    ref: null, canWrite: false, timer: null, lastSent: "", writing: false, queued: null,
    push() {
      if (this.mode !== "live" || !this.canWrite || !this.ref) return;
      const body = JSON.stringify(state, (k, v) => (typeof v === "string" && v.startsWith("data:") ? undefined : v));
      if (body === this.lastSent) return;
      this.queued = body;
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.flush(), 600);
    },
    async flush() {
      if (this.writing || this.queued == null) return;
      this.writing = true;
      const body = this.queued; this.queued = null;
      try { await this.ref.set({ state: JSON.parse(body), at: Date.now() }); this.lastSent = body; }
      catch (e) { this.mode = e && /not_granted|permission|denied|invalid_argument/i.test((e.code || "") + (e.message || "")) ? "readonly" : "error"; paintSync(); }
      finally { this.writing = false; if (this.queued != null) this.flush(); }
    },
  };
  function replaceState(next) {
    Object.keys(state).forEach((k) => delete state[k]);
    Object.assign(state, { items: {}, custom: [], order: {}, trips: [], plans: [] }, next);
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  }
  function paintSync() {
    let el = document.getElementById("syncBanner");
    const msg = { loading: "공유 기록을 불러오는 중이에요…", readonly: "보기 전용이에요. 지쏘와 시아만 고칠 수 있어요.", error: "공유 저장에 잠시 실패했어요. 바뀐 내용은 이 기기에 남아 있어요." }[shared.mode];
    if (!msg) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement("div"); el.id = "syncBanner"; el.setAttribute("role", "status"); document.body.appendChild(el); }
    el.className = "sync-banner " + shared.mode;
    el.textContent = msg;
  }
  async function startShared() {
    if (!window.claude || typeof window.claude.use !== "function") return;
    const db = await window.claude.use("db").catch(() => null);
    if (!db) return;
    const user = await window.claude.use("user").catch(() => null);
    const may = user ? await user.can("data.write").catch(() => null) : null;
    shared.canWrite = may !== false; // null(모름)이면 써 보고, 거절되면 읽기 전용으로 바꿔요
    shared.ref = db.doc("shared/board");
    shared.mode = "loading"; paintSync();
    const t = setTimeout(() => { if (shared.mode === "loading") { shared.mode = "error"; paintSync(); } }, 10000);
    let first = true;
    shared.ref.onSnapshot((snap) => {
      if (snap.metadata && !snap.metadata.fromCache) clearTimeout(t);
      if (snap.metadata && snap.metadata.hasPendingWrites) return;
      if (snap.exists && snap.data() && snap.data().state) {
        const body = JSON.stringify(snap.data().state);
        shared.lastSent = body;
        if (body !== JSON.stringify(state)) { replaceState(snap.data().state); rerender(); }
      }
      shared.mode = shared.canWrite ? "live" : "readonly";
      paintSync();
      if (first && !snap.exists && shared.canWrite) shared.push(); // 처음 한 번: 이 기기 기록을 공유 기록으로 올려요
      first = false;
    }, () => { clearTimeout(t); shared.mode = "error"; paintSync(); });
  }

  /* game.js가 다녀온 캠핑 수로 경험치를 계산할 수 있게 연결해요 (첫 캠핑은 game.js가 따로 더해요) */
  window.SoshaTrips = window.SoshaTrips || { list: () => state.trips || [] };
  const items = () => BASE.concat(state.custom || []).map((b) => Object.assign({}, b, state.items[b.id] || {}));
  const get = (id) => items().find((i) => i.id === id);
  const have = (i) => i.status === "bought" || i.status === "owned";
  function patch(id, p) {
    const custom = (state.custom || []).find((c) => c.id === id);
    if (custom) Object.assign(custom, p);
    else state.items[id] = Object.assign({}, state.items[id] || {}, p);
    save();
  }
  function lessonIds() {
    const s = new Set();
    (TRIP.lessons || []).forEach((l) => (l.items || []).forEach((id) => s.add(id)));
    return s;
  }
  const isLesson = (i) => lessonIds().has(i.id) && !have(i);
  const pricedPicks = (id) => (PICKS[id] || []).filter((p) => p.price);
  const bestPick = (id) => { const ps = pricedPicks(id); return ps.find((p) => p.pick) || ps[0]; };
  const cheapPick = (id) => pricedPicks(id).slice().sort((a, b) => a.price - b.price)[0];

  /* ---------- 아이콘 (틸 단색 3D) ---------- */
  const ICON_BY_ID = {
    tent: "tent", peg: "hammer", rope: "knot", groundsheet: "camping", mat: "bed", rug: "scarf", bedding: "bed", pillow: "bed",
    tarp: "umbrella-on-ground", shelter: "tent", cot: "bed", reel: "electric-plug", eblanket: "thermometer", heater: "fire",
    co: "bell", hotpack: "socks", circulator: "wind-face", burner: "fire", isoburner: "fire", gas: "fuel-pump", windscreen: "wind-face",
    torch: "fire", cookset: "cooking", griddle: "cooking", tongs: "chopsticks", scissors: "scissors", board: "kitchen-knife", spice: "salt",
    cooler: "ice", jug: "droplet", dishbag: "shopping-bags", coffee: "hot-beverage", dishes: "bowl-with-spoon", cutlery: "fork-and-knife",
    cups: "hot-beverage", foodmenu: "pot-of-food", firepit: "fire", gloves: "gloves", wood: "wood", extinguisher: "fire-extinguisher",
    firemat: "fire", table1: "package", chairs: "chair", storage: "package", igt: "cooking", shelf: "package", trash: "wastebasket",
    carabiner: "link", mainlamp: "lantern", headlamp: "flashlight", moodlamp: "candle", toiletry: "toothbrush", tissue: "roll-of-paper",
    clothes: "coat", battery: "battery", dogleash: "link", dogbowl: "bone", dogbed: "dog-face", dogwear: "coat", dogpoop: "roll-of-paper", dogfence: "dog-face",
  };
  const ICON_BY_CAT = { shelter: "tent", warm: "thermometer", kitchen: "cooking", table: "fork-and-knife", fire: "fire", furniture: "chair", light: "light-bulb", life: "toothbrush", dog: "dog-face" };
  const iconSrc = (i) => `v2/icons/${ICON_BY_ID[i.id] || ICON_BY_CAT[i.cat] || "package"}.png`;
  const icoHTML = (i, size = "", check = false) =>
    `<span class="ico ${size}"><img src="${iconSrc(i)}" alt="">${check ? '<span class="check"><svg viewBox="0 0 24 24"><path d="m5 12 5 5 9-10"/></svg></span>' : ""}</span>`;

  const PRI = { 1: ["필수", "tag-must"], 2: ["권장", "tag-nice"], 3: ["나중에", "tag-later"] };
  const STATUS = [["todo", "사야 해요"], ["research", "알아보는 중"], ["bought", "샀어요"], ["owned", "원래 있음"]];
  const SITES = (q) => [
    ["s-dg", "당근", `https://www.daangn.com/kr/search/buy-sell/?q=${enc(q)}`],
    ["s-nv", "네이버", `https://fleamarket.naver.com/search?query=${enc(q)}`],
    ["s-cf", "초캠장터", `https://cafe.naver.com/f-e/cafes/20486145/menus/0?q=${enc(q)}`],
    ["s-dn", "다나와", `https://search.danawa.com/?query=${enc(q)}&sort=saveDESC`],
  ];
  const sitesHTML = (q) => `<div class="sites">${SITES(q).map(([c, n, u]) => `<a class="site ${c}" href="${u}" target="_blank" rel="noopener">${n}</a>`).join("")}</div>`;

  /* ---------- 경험치 ---------- */
  const game = () => (GAME ? GAME.compute(items()) : { xp: 0, lv: 0, cur: { name: "거지 캠퍼", xp: 0 }, next: { name: "불멍 입문", xp: 200 } });
  const xpFor = (i) => (GAME && GAME.xpFor ? GAME.xpFor(i) : 15);
  const LEVELS = (GAME && GAME.levels) || [];
  const LEVEL_FX = (GAME && GAME.levelFx) || [];
  const XP_TRIP = (GAME && GAME.xpTrip) || 60, XP_REVIEW = (GAME && GAME.xpReview) || 10;

  /* ---------- 다음 캠핑 ---------- */
  const today = () => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; };
  function nextPlan() {
    const t = today();
    const since = new Date(t); since.setDate(since.getDate() - 7); // 다녀온 뒤 일주일 동안은 '다녀왔어요'를 띄워요
    return (state.plans || []).filter((p) => p.date && new Date(p.date + "T00:00:00") >= since).sort((a, b) => a.date.localeCompare(b.date))[0];
  }
  const daysTo = (date) => Math.round((new Date(date + "T00:00:00") - today()) / 86400000);
  const fmtDate = (date) => { const d = new Date(date + "T00:00:00"); return isNaN(d) ? "" : `${d.getMonth() + 1}월 ${d.getDate()}일 (${"일월화수목금토"[d.getDay()]})`; };

  /* ---------- 토스트 (되돌리기 포함) ---------- */
  let toastTimer = null;
  function toast(msg, actions = []) {
    const el = $("#toast");
    el.innerHTML = `<span>${esc(msg)}</span>${actions.map((a, i) => `<button type="button" data-t="${i}">${esc(a.label)}</button>`).join("")}`;
    el.hidden = false;
    el.style.animation = "none"; void el.offsetWidth; el.style.animation = "";
    $$("button", el).forEach((b) => (b.onclick = () => { hideToast(); actions[+b.dataset.t].run(); }));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, actions.length ? 5000 : 2400);
  }
  function hideToast() { $("#toast").hidden = true; }

  /* ---------- 상태 바꾸기 ---------- */
  function setStatus(id, status, { quiet = false } = {}) {
    const before = game();
    const prev = get(id).status;
    patch(id, { status });
    const after = game();
    rerender();
    if (quiet) return;
    const it = get(id);
    const undo = { label: "되돌리기", run: () => { patch(id, { status: prev }); rerender(); } };
    if (after.lv > before.lv) showLevelUp(after);
    if (status === "bought") toast(`${it.name} 샀어요 · +${xpFor(it) - 2} XP`, [{ label: "가격 적기", run: () => openItem(id, { focusPrice: true }) }, undo]);
    else if (status === "owned") toast("원래 있던 것으로 옮겼어요", [undo]);
    else toast(`${STATUS.find((s) => s[0] === status)[1]}로 옮겼어요`, [undo]);
  }

  /* ---------- 라우터 ---------- */
  const ROUTES = { home: renderHome, gear: renderGear, explore: renderExplore, log: renderLog };
  let route = "home";
  function go() {
    const h = (location.hash || "#home").slice(1);
    route = ROUTES[h] ? h : "home";
    $$(".tab").forEach((t) => { if (t.dataset.route === route) t.setAttribute("aria-current", "page"); else t.removeAttribute("aria-current"); });
    rerender();
    window.scrollTo(0, 0);
  }
  function rerender() {
    const keepY = window.scrollY;
    ROUTES[route]();
    if (sheetState.open && sheetState.refresh) sheetState.refresh();
    window.scrollTo(0, keepY);
  }

  /* ---------- 홈 ---------- */
  function summary() {
    const must = items().filter((i) => i.pri === 1 && !have(i));
    const cheap = must.reduce((s, i) => s + ((cheapPick(i.id) || {}).price || 0), 0);
    const unknown = must.filter((i) => !cheapPick(i.id)).length;
    const spent = items().reduce((s, i) => s + ((i.purchase && +i.purchase.price) || 0), 0);
    return { must, cheap, unknown, spent };
  }
  /* 단계 미션: 첫 캠핑 숙제 → 필수 장비 → 캠핑 다녀오기·후기 → 권장 장비 순으로 계속 이어져요 */
  function missions() {
    const L = lessonIds();
    const pool = items().filter((i) => !have(i));
    const lessonOnes = pool.filter((i) => L.has(i.id)).sort((a, b) => a.pri - b.pri);
    const must = pool.filter((i) => !L.has(i.id) && i.pri === 1);
    const list = lessonOnes.concat(must).slice(0, 3).map((i) => ({ type: "item", item: i }));
    const p = nextPlan();
    const noReview = (state.trips || []).filter((t) => !String(t.notes || "").trim()).slice(-1)[0];
    if (list.length < 3) list.push({ type: "trip", label: p ? `${p.place || "다음 캠핑"} 다녀오기` : "캠핑 한 번 다녀오기", xp: XP_TRIP });
    if (list.length < 3 && noReview) list.push({ type: "review", trip: noReview, label: `${noReview.place || "다녀온 캠핑"} 후기 남기기`, xp: XP_REVIEW });
    pool.filter((i) => i.pri === 2).forEach((i) => { if (list.length < 3) list.push({ type: "item", item: i }); });
    const title = lessonOnes.length ? "첫 캠핑 숙제 해결하기" : must.length ? "필수 장비 채우기" : "캠핑 다녀오며 성장하기";
    return { list, title };
  }
  function tipOfDay() {
    if (!TIPS.length) return null;
    const d = today(); return TIPS[(d.getFullYear() * 400 + d.getMonth() * 31 + d.getDate()) % TIPS.length];
  }
  /* 홈 캠프 장면: 레벨(1~7)마다 3D 일러스트 한 장 */
  const sceneImg = (lv) => `<img src="v2/scenes/level${Math.max(1, Math.min(7, (lv || 0) + 1))}.webp" alt="" decoding="async">`;
  function renderHome() {
    const g = game(), s = summary(), p = nextPlan(), m = missions(), tip = tipOfDay();
    const pct = g.next ? Math.min(1, (g.xp - g.cur.xp) / (g.next.xp - g.cur.xp)) : 1;
    const steps = LEVELS.length || 5;
    const scene = sceneImg(g.lv);
    const copy = p
      ? daysTo(p.date) < 0 ? `<h1>${esc(p.place || "캠핑")},<br><em>잘 다녀왔어요?</em></h1><button class="hero-set" type="button" data-trip>다녀왔어요 · +${XP_TRIP} XP</button>` : `<h1>${esc(p.place || "다음 캠핑")}까지<br>${daysTo(p.date) === 0 ? "<em>오늘</em> 떠나요" : `<em>${daysTo(p.date)}일</em> 남았어요`}</h1>${daysTo(p.date) <= 0 ? `<button class="hero-set" type="button" data-trip>다녀왔어요 · +${XP_TRIP} XP</button>` : ""}`
      : `<h1>다음 캠핑,<br>언제 떠날까요?</h1><button class="hero-set" type="button" data-plan>날짜 정하기</button>`;
    $("#view").innerHTML = `
      <div class="home-top">
        <section class="hero" aria-label="우리 캠프">
          <div class="hero-scene" aria-hidden="true">${scene}</div>
          <div class="hero-top">
            <span class="hero-brand"><img src="v2/icons/tent.png" alt="">Sosha Camp</span>
            <button class="round" type="button" data-search aria-label="장비 검색"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg></button>
          </div>
          <div class="hero-copy">
            <button class="lv-chip" type="button" data-levels aria-label="캠퍼 단계 보기"><b>Lv.${g.lv + 1}</b>${esc(g.cur.name)}</button>
            ${copy}
          </div>
        </section>
        <section class="summary" aria-label="준비 현황">
          <div class="summary-nums">
            <div><span>꼭 살 것</span><strong class="num">${s.must.length}개</strong></div>
            <div><span>다 사면 (가성비)</span><strong class="num">${won(s.cheap) || "0원"}</strong></div>
          </div>
          ${s.unknown ? `<p class="faint" style="font-size:12.5px;text-align:center">가격 조사 전인 ${s.unknown}개는 빼고 계산했어요</p>` : ""}
          <a class="btn btn-primary btn-block" href="#gear">살 것 목록 보기</a>
        </section>
      </div>
      <div class="page">
        <nav class="quick" aria-label="바로가기">
          <a href="#gear" data-quick="bought">${icoImg("shopping-bags")}산 것 보기</a>
          <a href="#explore" data-quick="used">${icoImg("label")}중고 찾기</a>
          <button type="button" data-plan>${icoImg("backpack")}${p ? "캠핑 일정" : "일정 정하기"}</button>
          <a href="#explore">${icoImg("open-book")}고르는 법</a>
        </nav>
        <div class="home-grid">
          <section class="stage" aria-label="캠퍼 단계">
            <div class="stage-head">
              <div><small>캠퍼 단계 ${g.lv + 1} / ${steps}</small><strong><span class="nw">${esc(g.cur.name)}</span>${g.next ? ` <span class="nw">→ ${esc(g.next.name)}</span>` : ""}</strong></div>
              <span class="xp num">${g.next ? `${g.xp} / ${g.next.xp} XP` : `${g.xp} XP`}</span>
            </div>
            <div class="steps" aria-hidden="true">${Array.from({ length: steps }, (_, i) => `<i><b style="--p:${i < g.lv ? 100 : i === g.lv ? Math.round(pct * 100) : 0}%"></b></i>`).join("")}</div>
            <div class="mission">
              <span>이번 단계 미션 · ${m.title}</span>
              ${m.list.map((x) => x.type === "item" ? `<div class="mission-row">
                  ${icoHTML(x.item, "sm")}
                  <button class="name" type="button" data-open="${esc(x.item.id)}">${esc(x.item.name)}</button>
                  <span class="xp num">+${xpFor(x.item) - 2} XP</span>
                  <button class="row-check" type="button" data-buy="${esc(x.item.id)}" aria-pressed="false" aria-label="${esc(x.item.name)} 샀어요"><span><svg viewBox="0 0 24 24"><path d="m5 12 5 5 9-10"/></svg></span></button>
                </div>` : `<div class="mission-row">
                  <span class="ico sm"><img src="v2/icons/${x.type === "trip" ? "camping" : "pencil"}.png" alt=""></span>
                  <button class="name" type="button" ${x.type === "trip" ? "data-trip" : `data-review="${esc(x.trip.id)}"`}>${esc(x.label)}</button>
                  <span class="xp num">+${x.xp} XP</span>
                  <button class="btn btn-soft btn-sm" type="button" ${x.type === "trip" ? "data-trip" : `data-review="${esc(x.trip.id)}"`}>${x.type === "trip" ? "기록" : "쓰기"}</button>
                </div>`).join("")}
            </div>
          </section>
          ${(() => { const rc = readCards(g, tip); return rc.length ? `<section class="sec">
            <div class="sec-head"><h2>지금 읽으면 좋아요</h2><a class="more" href="#explore">더 보기</a></div>
            <div class="list">${rc.map((c) => `<button class="link-row" type="button" data-guide="${esc(c.key)}">${icoImg(c.ico)}<b>${esc(c.t)}</b><small>${esc(c.sub)}</small></button>`).join("")}</div>
          </section>` : ""; })()}
        </div>
        ${footNote()}
      </div>`;
    bindCommon();
  }
  const icoImg = (name) => `<span class="ico"><img src="v2/icons/${name}.png" alt=""></span>`;

  /* 홈 '지금 읽으면 좋아요': 레벨과 산 것에 따라 알아보기 글 3개를 골라요 */
  function readCards(g, tip) {
    const hv = (id) => { const i = get(id); return !!(i && have(i)); };
    const st = (id) => (get(id) || {}).status;
    const bought = items().filter((i) => i.status === "bought").length;
    const hasTopic = (key) => key.startsWith("@") || key.split("|").some((t) => TIPS.some((x) => x.topic === t));
    const warm = hv("heater") || hv("eblanket") || hv("hotpack");
    const cards = [
      { key: "동계 첫 장비 순서", ico: "clipboard", t: "처음 살 것 순서", sub: "필수부터 차근차근", score: g.lv === 0 && bought < 3 ? 9 : 1 },
      { key: "@daiso", ico: "shopping-bags", t: "다이소 찐템", sub: "싸게 채우기", score: (window.SOSHA_DAISO || []).length ? (bought < 6 ? 8 : 3) : -1 },
      { key: "안전(일산화탄소)|동계 열원·단열", ico: "snowflake", t: "겨울 안전", sub: warm ? "난방용품 샀다면 꼭 읽기" : "추워지기 전에 읽기", score: warm ? 10 : 6 },
      { key: "캠핑장 전기|전기장판 사용", ico: "high-voltage", t: "캠핑장 전기 계산법", sub: hv("reel") ? "릴선 샀다면 600W 확인" : "릴선 고르기 전에", score: hv("reel") || hv("eblanket") ? 9 : 5 },
      { key: "@shelter", ico: "tent", t: "겨울 쉘터 고르는 법", sub: "다음 단계 텐트", score: (window.SOSHA_SHELTER_TIPS || []).length ? (g.lv >= 2 ? 8 : st("shelter") === "research" ? 4 : 1) : -1 },
      { key: "강아지 동반", ico: "dog-face", t: "강아지와 캠핑", sub: "추위 타는 시츄 챙기기", score: hv("dogwear") && hv("dogbed") ? 2 : 4 },
      { key: "작은 차 적재", ico: "package", t: "작은 차에 싣기", sub: "짐이 늘었다면", score: bought >= 8 ? 7 : 1 },
      { key: "@tips", ico: "sparkles", t: "고수 한마디", sub: tip ? tip.topic : "캠퍼들이 남긴 팁", score: TIPS.length ? 3 : -1 },
    ];
    return cards.filter((c) => c.score >= 0 && hasTopic(c.key)).sort((a, b) => b.score - a.score).slice(0, 3);
  }

  /* ---------- 장비 ---------- */
  const ui = { status: "todo", cat: "all", q: "" };
  function filtered() {
    const L = lessonIds();
    const q = ui.q.trim().toLowerCase();
    return items().filter((i) => {
      if (q) return [i.name, i.model, i.spec, i.q].some((t) => String(t || "").toLowerCase().includes(q));
      if (i.status !== ui.status) return false;
      if (ui.cat === "lesson") return L.has(i.id);
      return ui.cat === "all" || i.cat === ui.cat;
    }).sort((a, b) => (a.pri - b.pri) || (L.has(b.id) - L.has(a.id)));
  }
  function rowHTML(i) {
    const p = bestPick(i.id);
    const paid = i.purchase && i.purchase.price !== "" && i.purchase.price != null;
    const done = have(i);
    const sub = paid ? esc([i.purchase.model, i.purchase.where ? `${i.purchase.where} 구매` : ""].filter(Boolean).join(" · ") || "구매") : p ? `${esc(p.brand)} ${esc(p.model)}` : "추천 제품 조사 전";
    const price = paid ? won(i.purchase.price) : p ? won(p.price) : esc((i.newPrice || "").replace(/\s*\(.*\)/, "")) || "가격 미정";
    const est = !paid && !p;
    return `<div class="row ${done ? "done" : ""}">
      <button class="row-main" type="button" data-open="${esc(i.id)}">
        ${icoHTML(i, "", done)}
        <span class="row-text">
          <span class="row-title"><b>${esc(i.name)}</b>${isLesson(i) ? '<span class="tag tag-lesson">교훈</span>' : ""}</span>
          <span class="row-sub ${est ? "est" : ""}">${sub}</span>
        </span>
        <span class="row-price ${est ? "est" : ""}">${price}</span>
      </button>
      <button class="row-check" type="button" data-buy="${esc(i.id)}" aria-pressed="${done}" aria-label="${esc(i.name)} ${done ? "산 것 취소" : "샀어요"}"><span><svg viewBox="0 0 24 24"><path d="m5 12 5 5 9-10"/></svg></span></button>
    </div>`;
  }
  function renderGear() {
    const all = items();
    const counts = Object.fromEntries(STATUS.map(([k]) => [k, all.filter((i) => i.status === k).length]));
    const list = filtered();
    const groups = [1, 2, 3].map((p) => ({ p, rows: list.filter((i) => i.pri === p) })).filter((g) => g.rows.length);
    const showSum = !ui.q && (ui.status === "todo" || ui.status === "research");
    const s = summary();
    $("#view").innerHTML = `<div class="page">
      <header class="page-head"><h1>장비</h1><button class="btn btn-soft btn-sm" type="button" data-add><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>추가</button></header>
      <label class="search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><span class="sr">장비 검색</span>
        <input id="gearQ" type="search" placeholder="장비 이름으로 찾기 (예: 릴선)" value="${esc(ui.q)}" autocomplete="off">
        ${ui.q ? '<button class="clear" type="button" data-clear aria-label="검색어 지우기">✕</button>' : ""}</label>
      ${ui.q ? "" : `<div class="seg" role="tablist" aria-label="상태">${STATUS.map(([k, n]) => `<button role="tab" type="button" data-status="${k}" aria-selected="${ui.status === k}">${n}<b>${counts[k]}</b></button>`).join("")}</div>
      <div class="chips" role="group" aria-label="분류">${[["all", "전체"], ["lesson", "교훈만"]].concat(CATS.map((c) => [c.id, c.name])).map(([k, n]) => `<button class="chip" type="button" data-cat="${k}" aria-pressed="${ui.cat === k}">${n}</button>`).join("")}</div>`}
      <div class="list" aria-live="polite">
        ${groups.length ? groups.map((g) => `<div class="group-head"><span><span class="tag ${PRI[g.p][1]}">${PRI[g.p][0]}</span> ${g.rows.length}개</span>${g.p === 1 && ui.status !== "owned" ? "<small>교훈 품목이 위에 와요</small>" : ""}</div>${g.rows.map(rowHTML).join("")}`).join("")
          : `<div class="empty"><img src="v2/icons/${ui.q ? "label" : "party-popper"}.png" alt="">${ui.q ? "찾는 장비가 없어요. 이름을 바꿔 보거나 직접 추가해요." : ui.status === "todo" ? "사야 할 장비가 없어요!" : "여기엔 아직 아무것도 없어요"}</div>`}
      </div>
      ${footNote()}
      ${showSum && s.must.length ? `<div class="sumbar"><span>필수 ${s.must.length}개 다 사면 (가성비)</span><strong>${won(s.cheap)}</strong></div>` : ""}
    </div>`;
    bindCommon();
    const q = $("#gearQ");
    q.oninput = () => { ui.q = q.value; const pos = q.selectionStart; renderGear(); const nq = $("#gearQ"); nq.focus(); nq.setSelectionRange(pos, pos); };
    $$("[data-status]").forEach((b) => (b.onclick = () => { ui.status = b.dataset.status; renderGear(); }));
    $$("[data-cat]").forEach((b) => (b.onclick = () => { ui.cat = b.dataset.cat; renderGear(); }));
    const c = $("[data-clear]"); if (c) c.onclick = () => { ui.q = ""; renderGear(); $("#gearQ").focus(); };
  }

  /* ---------- 알아보기 ---------- */
  const TOPIC_ICON = { "동계 첫 장비 순서": "clipboard", "동계 열원·단열": "thermometer", "안전(일산화탄소)": "bell", "캠핑장 전기": "electric-plug", "전기장판 사용": "thermometer", "작은 차 적재": "package", "소프트백 vs 하드박스": "shopping-bags", "중고 vs 신품": "label", "강아지 동반": "dog-face", "소비 순서": "clipboard" };
  let freeQ = "";
  function renderExplore() {
    const topics = [...new Set(TIPS.map((t) => t.topic))];
    $("#view").innerHTML = `<div class="page">
      <header class="page-head"><h1>알아보기</h1></header>
      <section class="sec">
        <label class="search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><span class="sr">중고와 새 제품 검색</span>
          <input id="freeQ" type="search" placeholder="무엇이든 검색하면 4곳을 한 번에 열어요" value="${esc(freeQ)}" autocomplete="off"></label>
        <div id="freeLinks">${freeQ.trim() ? sitesHTML(freeQ.trim()) : '<p class="faint" style="font-size:13px;padding:0 4px">당근·네이버·초캠장터는 자동 수집을 막고 있어서, 검색어로 각 사이트를 바로 열어요.</p>'}</div>
      </section>
      <section class="sec">
        <div class="sec-head"><h2>이번 캠핑 전에 읽기</h2></div>
        <div class="cards2">
          <button class="tile-card" type="button" data-guide="안전(일산화탄소)|동계 열원·단열"><img src="v2/icons/snowflake.png" alt=""><span>겨울 안전<br><em>꼭 읽기</em></span></button>
          <button class="tile-card" type="button" data-guide="캠핑장 전기|전기장판 사용"><img src="v2/icons/high-voltage.png" alt=""><span>캠핑장 전기<br>계산법</span></button>
        </div>
      </section>
      ${(() => { const tip = tipOfDay(); return tip ? `<section class="sec">
        <div class="sec-head"><h2>고수 한마디</h2><button class="more" type="button" data-guide="@tips">전체 보기</button></div>
        <div class="card tip">
          <span class="ico"><img src="v2/icons/sparkles.png" alt=""></span>
          <div><small>${esc(tip.topic)}</small><p>${esc(tip.tip)}</p>${tip.url ? `<a href="${esc(tip.url)}" target="_blank" rel="noopener">출처 보기</a>` : ""}</div>
        </div>
      </section>` : ""; })()}
      <section class="sec">
        <div class="sec-head"><h2>고수들이 말하는 고르는 법</h2></div>
        <div class="list">
          ${(window.SOSHA_SHELTER_TIPS || []).length ? `<button class="link-row" type="button" data-guide="@shelter">${icoImg("tent")}<b>겨울 쉘터 고르는 법</b><small>경량 · 우레탄창</small></button>` : ""}
          ${(window.SOSHA_DAISO || []).length ? `<button class="link-row" type="button" data-guide="@daiso">${icoImg("shopping-bags")}<b>다이소 찐템</b><small>캠퍼들이 꼽은 것</small></button>` : ""}
          ${topics.filter((t) => !/일산화탄소|열원|캠핑장 전기|전기장판/.test(t)).map((t) => `<button class="link-row" type="button" data-guide="${esc(t)}">${icoImg(TOPIC_ICON[t] || "open-book")}<b>${esc(t)}</b><small>${TIPS.filter((x) => x.topic === t).length}개 의견</small></button>`).join("")}
        </div>
      </section>
      <section class="sec">
        <div class="sec-head"><h2>다나와 인기순으로 보기</h2></div>
        <div class="list">${(window.SOSHA_DANAWA || []).map((d) => `<a class="link-row" href="https://search.danawa.com/?query=${enc(d.q)}&sort=saveDESC" target="_blank" rel="noopener"><span class="ico sm"><img src="v2/icons/label.png" alt=""></span><b>${esc(d.name)}<br><small style="text-align:left;display:block">${esc(d.filter)}</small></b>${d.pri === 1 ? '<span class="tag tag-must">필수</span>' : ""}</a>`).join("")}</div>
      </section>
      ${footNote()}
    </div>`;
    bindCommon();
    const q = $("#freeQ");
    q.oninput = () => { freeQ = q.value; $("#freeLinks").innerHTML = freeQ.trim() ? sitesHTML(freeQ.trim()) : ""; };
  }
  function openGuide(key) {
    let title, body;
    if (key === "@shelter") {
      title = "겨울 쉘터 고르는 법";
      body = `<ul class="bullets">${window.SOSHA_SHELTER_TIPS.map((t) => `<li>${esc(t.tip)}${t.url ? ` <a class="src" href="${esc(t.url)}" target="_blank" rel="noopener">출처</a>` : ""}</li>`).join("")}</ul>`;
    } else if (key === "@tips") {
      title = "고수 한마디";
      const topics = [...new Set(TIPS.map((t) => t.topic))];
      body = topics.map((tp) => `<h3 style="font-size:15px;margin:16px 0 6px">${esc(tp)}</h3><ul class="bullets">${TIPS.filter((t) => t.topic === tp).map((t) => `<li>${esc(t.tip)}${t.url ? ` <a class="src" href="${esc(t.url)}" target="_blank" rel="noopener">출처</a>` : ""}</li>`).join("")}</ul>`).join("");
    } else if (key === "@daiso") {
      title = "다이소 찐템";
      body = `<div class="list">${window.SOSHA_DAISO.slice().sort((a, b) => b.votes - a.votes).map((d) => `<div class="link-row" style="align-items:flex-start;padding-top:12px;padding-bottom:12px"><span class="ico sm"><img src="v2/icons/shopping-bags.png" alt=""></span><b>${esc(d.name)} <span class="faint" style="font-size:13px">${esc(d.price || "")}</span><br><span class="muted" style="font-size:13px;font-weight:400">${esc(d.tip || d.use || "")}</span></b></div>`).join("")}</div>`;
    } else {
      const ts = key.split("|");
      title = ts.length > 1 ? (ts[0].includes("일산화탄소") ? "겨울 안전" : "캠핑장 전기") : ts[0];
      body = `<ul class="bullets">${TIPS.filter((t) => ts.includes(t.topic)).map((t) => `<li>${esc(t.tip)}${t.url ? ` <a class="src" href="${esc(t.url)}" target="_blank" rel="noopener">출처</a>` : ""}</li>`).join("")}</ul>`;
    }
    openSheet(() => `<div class="sheet-head"><div><h2 id="sheetTitle">${esc(title)}</h2></div>${xBtn()}</div>${body}`);
  }

  /* ---------- 기록 ---------- */
  function renderLog() {
    const g = game(), s = summary(), p = nextPlan();
    const owned = items().filter(have).length, total = items().length;
    const L = TRIP.lessons || [];
    const solved = L.filter((l) => (l.items || []).every((id) => { const i = get(id); return i && have(i); })).length;
    $("#view").innerHTML = `<div class="page">
      <header class="page-head"><h1>기록</h1></header>
      <section class="sec">
        <div class="sec-head"><h2>다음 캠핑</h2></div>
        <button class="card link-row" type="button" data-plan style="border-top:0;min-height:72px">
          ${icoImg("calendar")}<b>${p ? `${esc(p.place || "캠핑장 미정")}<br><span class="muted" style="font-size:13px;font-weight:400">${fmtDate(p.date)}${p.dog ? " · 강아지 동반" : ""}</span>` : "아직 정하지 않았어요"}</b>
          <small style="color:var(--brand-ink);font-weight:600">${p ? `D-${daysTo(p.date)}` : "정하기"}</small>
        </button>
      </section>
      <section class="card stat3" aria-label="우리 기록">
        <div><span>캠퍼 단계</span><strong>Lv.${g.lv + 1}</strong></div>
        <div><span>갖춘 장비</span><strong class="num">${owned} / ${total}</strong></div>
        <div><span>쓴 돈</span><strong class="num">${won(s.spent) || "0원"}</strong></div>
      </section>
      <section class="sec">
        <div class="sec-head"><h2>다녀온 캠핑</h2><span class="more">${(state.trips || []).length + 1}번</span></div>
        <div class="list">
          ${(state.trips || []).slice().reverse().map((t) => `<button class="link-row" type="button" data-review="${esc(t.id)}"><span class="ico sm"><img src="v2/icons/camping.png" alt=""></span><b>${esc(t.place || "캠핑")}<br><span class="muted" style="font-size:13px;font-weight:400">${esc(t.date)}${t.dog ? " · 강아지 동반" : ""}</span></b><small>${String(t.notes || "").trim() ? "후기 있음" : `후기 쓰기 +${XP_REVIEW}`}</small></button>`).join("")}
          <div class="link-row"><span class="ico sm"><img src="v2/icons/tent.png" alt=""></span><b>${esc(TRIP.place || "첫 캠핑")}<br><span class="muted" style="font-size:13px;font-weight:400">${esc(TRIP.date || "")}</span></b><small>첫 캠핑</small></div>
        </div>
        <button class="btn btn-primary btn-block" type="button" data-trip>캠핑 다녀왔어요 · +${XP_TRIP} XP</button>
      </section>
      <section class="sec">
        <div class="sec-head"><h2>첫 캠핑에서 배운 점</h2><span class="more">해결 ${solved} / ${L.length}</span></div>
        ${L.map((l, n) => {
          const done = (l.items || []).every((id) => { const i = get(id); return i && have(i); });
          return `<article class="card lesson ${done ? "done" : ""}">
            <div class="lesson-top"><span class="lesson-n">${n + 1}</span><b>${esc(l.t)}</b>${done ? '<span class="tag tag-brand">해결</span>' : ""}</div>
            <p>${esc(l.fix || l.d)}</p>
            <div class="mini-items">${(l.items || []).map((id) => { const i = get(id); return i ? `<button class="mini-item ${have(i) ? "have" : ""}" type="button" data-open="${esc(id)}"><img src="${iconSrc(i)}" alt="">${have(i) ? "가짐 · " : ""}${esc(i.name)}</button>` : ""; }).join("")}</div>
          </article>`;
        }).join("")}
      </section>
      <section class="sec">
        <div class="sec-head"><h2>백업</h2></div>
        <div class="card" style="padding:16px;display:grid;gap:10px">
          <p class="muted" style="font-size:14px">${shared.mode === "live" ? "지금 시아와 실시간으로 같은 기록을 보고 있어요. 백업은 혹시 모를 때를 위한 거예요." : shared.mode === "readonly" ? "보기 전용으로 공유된 기록을 보고 있어요." : "기록은 이 브라우저에 저장돼요. 둘이 같이 보려면 공유 링크(Claude 아티팩트)로 열어요. 다른 폰으로 옮기려면 백업 글자를 복사해서 붙여넣어요."}</p>
          <div class="grid2"><button class="btn" type="button" data-backup>백업 복사</button><button class="btn" type="button" data-restore>붙여넣어 불러오기</button></div>
          <button class="btn btn-danger-ghost" type="button" data-reset>기록 초기화</button>
        </div>
      </section>
      ${footNote()}
    </div>`;
    bindCommon();
    $("[data-reset]").onclick = () => openSheet(() => `<div class="sheet-head"><div><h2 id="sheetTitle">기록 초기화</h2><span class="muted" style="font-size:14px">지운 뒤에는 되돌릴 수 없어요. 걱정되면 먼저 백업 복사를 해 두세요.</span></div>${xBtn()}</div>
      <div style="display:grid;gap:10px">
        <button class="btn btn-block" type="button" data-wipe="trips">캠핑 기록만 지우기<br><small class="muted">다녀온 캠핑 ${(state.trips || []).length}개와 일정이 지워져요. 장비는 그대로예요.</small></button>
        <button class="btn btn-block btn-danger" type="button" data-wipe="all">처음 상태로 되돌리기<br><small>장비 체크, 구매 기록, 캠핑 기록이 모두 지워져요.</small></button>
      </div>`, {
      after: () => $$("[data-wipe]").forEach((b) => (b.onclick = () => {
        if (b.dataset.wipe === "all") { Object.keys(state).forEach((k) => delete state[k]); Object.assign(state, { items: {}, custom: [], order: {}, trips: [], plans: [] }); }
        else { state.trips = []; state.plans = []; }
        save(); closeSheet(); rerender(); toast(b.dataset.wipe === "all" ? "처음 상태로 되돌렸어요" : "캠핑 기록을 지웠어요");
      })),
    });
    $("[data-backup]").onclick = async () => {
      const text = JSON.stringify(state);
      try { await navigator.clipboard.writeText(text); toast("백업을 복사했어요. 메모나 카톡에 붙여 둬요"); }
      catch { openSheet(() => `<div class="sheet-head"><div><h2 id="sheetTitle">백업 글자</h2></div>${xBtn()}</div><p class="muted" style="font-size:14px">아래 글자를 길게 눌러 모두 선택한 뒤 복사해요.</p><div class="field"><textarea readonly id="bk" style="min-height:200px">${esc(text)}</textarea></div>`); setTimeout(() => { const t = $("#bk"); if (t) t.select(); }, 50); }
    };
    $("[data-restore]").onclick = () => openSheet(() => `<div class="sheet-head"><div><h2 id="sheetTitle">백업 불러오기</h2></div>${xBtn()}</div>
      <label class="field"><span>복사해 둔 백업 글자</span><textarea id="rs" style="min-height:180px" placeholder="여기에 붙여넣어요"></textarea></label>
      <p class="muted" style="font-size:13px">불러오면 지금 기록이 백업 내용으로 바뀌어요.</p>
      <div class="sheet-foot"><button class="btn" type="button" data-close>취소</button><button class="btn btn-primary" style="flex:1" type="button" id="rsGo">불러오기</button></div>`, {
      after: () => { $("#rsGo").onclick = () => {
        try { const d = JSON.parse($("#rs").value); if (!d || typeof d !== "object" || !d.items) throw 0; Object.keys(state).forEach((k) => delete state[k]); Object.assign(state, { items: {}, custom: [], order: {}, trips: [], plans: [] }, d); save(); closeSheet(); rerender(); toast("백업을 불러왔어요"); }
        catch { toast("백업 글자가 올바르지 않아요. 처음부터 끝까지 복사했는지 확인해요"); }
      }; },
    });
  }

  /* ---------- 바텀시트 ---------- */
  const sheetState = { open: false, refresh: null, opener: null };
  const xBtn = () => `<button class="x" type="button" data-close aria-label="닫기"><svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg></button>`;
  function openSheet(build, { after } = {}) {
    const wrap = $("#sheetWrap"), body = $("#sheetBody"), sheet = $("#sheet");
    if (!sheetState.open) sheetState.opener = document.activeElement;
    const draw = () => { const y = body.scrollTop; body.innerHTML = build(); body.scrollTop = y; bindCommon(body); bindSheet(); if (after) after(); };
    sheetState.refresh = draw;
    sheetState.open = true;
    wrap.hidden = false;
    sheet.classList.remove("closing");
    body.scrollTop = 0;
    draw();
    document.body.style.overflow = "hidden";
    sheet.focus({ preventScroll: true });
  }
  function closeSheet() {
    if (!sheetState.open) return;
    const wrap = $("#sheetWrap"), sheet = $("#sheet");
    sheetState.open = false; sheetState.refresh = null;
    sheet.classList.add("closing");
    setTimeout(() => { wrap.hidden = true; sheet.classList.remove("closing"); sheet.style.transform = ""; }, 200);
    document.body.style.overflow = "";
    if (sheetState.opener && document.contains(sheetState.opener)) sheetState.opener.focus({ preventScroll: true });
  }
  function bindSheet() { $$("#sheetWrap [data-close]").forEach((b) => (b.onclick = closeSheet)); }
  // 손잡이를 아래로 끌면 닫혀요
  (() => {
    const sheet = $("#sheet"); let y0 = null, dy = 0;
    const start = (e) => { if (!e.target.closest("[data-grip]")) return; y0 = e.clientY; dy = 0; sheet.classList.add("dragging"); sheet.setPointerCapture(e.pointerId); };
    sheet.addEventListener("pointerdown", start);
    sheet.addEventListener("pointermove", (e) => { if (y0 == null) return; dy = Math.max(0, e.clientY - y0); sheet.style.transform = `translateY(${dy}px)`; });
    const end = () => { if (y0 == null) return; y0 = null; sheet.classList.remove("dragging"); if (dy > 90) closeSheet(); else sheet.style.transform = ""; };
    sheet.addEventListener("pointerup", end); sheet.addEventListener("pointercancel", end);
  })();
  document.addEventListener("keydown", (e) => {
    if (!sheetState.open) return;
    if (e.key === "Escape") { e.preventDefault(); closeSheet(); }
    if (e.key === "Tab") {
      const f = $$("#sheet button, #sheet a[href], #sheet input, #sheet textarea, #sheet select").filter((x) => !x.disabled && x.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ---------- 장비 상세 ---------- */
  function openItem(id, { focusPrice = false } = {}) {
    let more = false;
    let draft = null; // 저장 전 입력값
    const build = () => {
      const i = get(id); if (!i) return "";
      const L = (TRIP.lessons || []).find((l) => (l.items || []).includes(id));
      const ps = (PICKS[id] || []).slice().sort((a, b) => (b.pick ? 1 : 0) - (a.pick ? 1 : 0));
      const ds = (window.SOSHA_DAISO || []).filter((d) => d.item === id);
      const pur = draft || i.purchase || {};
      const done = have(i);
      return `
        <div class="sheet-head">
          ${icoHTML(i, "lg", done)}
          <div><div class="tags"><span class="tag ${PRI[i.pri][1]}">${PRI[i.pri][0]}</span>${isLesson(i) ? '<span class="tag tag-lesson">교훈</span>' : ""}<span class="tag tag-later">${esc((CATS.find((c) => c.id === i.cat) || {}).name || "")}</span></div>
          <h2 id="sheetTitle">${esc(i.name)}</h2></div>
          ${xBtn()}
        </div>
        <div class="status-seg" role="group" aria-label="상태">${STATUS.map(([k, n]) => `<button type="button" data-set="${k}" aria-pressed="${i.status === k}">${n}</button>`).join("")}</div>
        ${L && !done ? `<div class="note"><small>첫 캠핑에서 · ${esc(L.t)}</small><p>${esc(L.d)}</p></div>` : ""}
        ${i.why ? `<div class="sec"><p class="${more ? "" : "clamp"}" style="font-size:15px;line-height:1.7">${esc(i.why)}</p>${i.why.length > 90 ? `<button class="linkbtn" type="button" data-more>${more ? "접기" : "더 보기"}</button>` : ""}</div>` : ""}
        ${i.spec ? `<div class="note"><small>이렇게 고르면 돼요</small><p>${esc(i.spec)}</p></div>` : ""}
        <div class="sec" aria-label="새 제품">
          <div class="sec-head" style="padding:0"><h2 style="font-size:15px">새 제품</h2><span class="more">${ps.length ? `${ps.length}개 후보` : esc(i.newPrice || "")}</span></div>
          <p class="cp-disc"><span class="cp-ad">광고</span>쿠팡 버튼은 쿠팡 파트너스 링크로, 이를 통해 구매하면 일정액의 수수료를 제공받습니다.</p>
          ${ps.length ? ps.slice(0, more ? ps.length : 3).map((p, n) => newPick(i, p, n)).join("")
            : `<div class="pick"><div class="pick-top"><b>${esc(i.name)}</b><strong>${esc((i.newPrice || "").replace(/\s*\(.*\)/, "")) || "가격 확인"}</strong></div>
               <p>추천 제품을 아직 조사하지 않았어요. 쿠팡에서 찾아볼 수 있어요.</p>
               <div class="pick-acts"><a class="btn btn-soft btn-sm" href="${esc(cpLink(i, null, 0))}" target="_blank" rel="noopener sponsored"><span class="cp-logo">쿠팡</span>에서 찾아보기</a></div></div>`}
          ${ps.length > 3 && !more ? `<button class="linkbtn" type="button" data-more>후보 ${ps.length - 3}개 더 보기</button>` : ""}
        </div>
        ${ds.length ? `<div class="note"><small>다이소 대안</small>${ds.map((d) => `<p>${esc(d.name)} ${esc(d.price || "")} · ${esc(d.tip || d.use || "")}</p>`).join("")}</div>` : ""}
        <div class="sec">
          <div class="sec-head" style="padding:0"><h2 style="font-size:15px">중고로 찾기</h2><span class="more">${i.usedPrice && i.usedPrice !== "-" ? `중고 ${esc(i.usedPrice)}` : esc(i.newPrice || "")}</span></div>
          ${sitesHTML(i.q || i.name)}
        </div>
        ${done ? `<form class="form" id="purForm" novalidate>
          <h3>${i.status === "owned" ? "메모" : "구매 기록"} <span class="faint" style="font-size:12px;font-weight:500">적으면 +2 XP</span></h3>
          ${i.status === "bought" ? `<label class="field"><span>어떤 제품</span><input id="fModel" placeholder="예: 버티탭 슬림릴 1.5SQ 10m" value="${esc(pur.model || "")}"></label>
          ${ps.length ? `<div class="pills pills-wrap" role="group" aria-label="추천 제품에서 고르기">${ps.slice(0, 4).map((q, n) => { const nm = `${q.brand} ${q.model}`.trim(); return `<button class="chip chip-pick" type="button" data-pickfill="${n}" aria-pressed="${pur.model === nm}">${esc(nm)}</button>`; }).join("")}</div>` : ""}
          <div class="grid2">
            <label class="field"><span>얼마에</span><input id="fPrice" inputmode="numeric" pattern="[0-9]*" placeholder="예: 18900" value="${esc(pur.price === 0 ? "0" : pur.price || "")}"></label>
            <label class="field"><span>어디서</span><input id="fWhere" placeholder="예: 쿠팡, 당근" value="${esc(pur.where || "")}"></label>
          </div>
          <div class="pills" role="group" aria-label="상태">${["신품", "중고"].map((c) => `<button class="chip" type="button" data-cond="${c}" aria-pressed="${(pur.cond || "신품") === c}">${c}</button>`).join("")}<span class="pills-gap" aria-hidden="true"></span>${["매장", "기타"].map((c) => `<button class="chip" type="button" data-how="${c}" aria-pressed="${pur.how === c}">${c}</button>`).join("")}</div>` : ""}
          <label class="field"><span>써 보니 어땠어요?</span><textarea id="fMemo" placeholder="다음에 살 사람에게 남기는 한마디">${esc((draft && draft.memo) != null ? draft.memo : i.memo || "")}</textarea></label>
        </form>` : ""}
        <div class="sheet-foot">
          ${done ? `<button class="btn" type="button" data-close>닫기</button><button class="btn btn-primary" style="flex:1" type="button" data-savepur>저장</button>`
            : `<button class="btn" type="button" data-set="${i.status === "research" ? "todo" : "research"}">${i.status === "research" ? "사야 해요로" : "알아보는 중"}</button><button class="btn btn-primary" style="flex:1" type="button" data-set="bought">샀어요 · +${xpFor(i) - 2} XP</button>`}
        </div>`;
    };
    const readDraft = () => {
      if (!$("#purForm")) return;
      const prev = draft || get(id).purchase || {};
      draft = { model: ($("#fModel") || {}).value || "", price: ($("#fPrice") || {}).value ? $("#fPrice").value.replace(/[^0-9]/g, "") : "", where: ($("#fWhere") || {}).value || "", cond: prev.cond || "신품", how: prev.how || "", memo: ($("#fMemo") || {}).value || "" };
    };
    openSheet(build, {
      after: () => {
        $$("#sheet [data-set]").forEach((b) => (b.onclick = () => {
          const to = b.dataset.set;
          const before = game();
          setStatus(id, to, { quiet: true });
          const after = game(); if (after.lv > before.lv) { closeSheet(); showLevelUp(after); return; }
          if (to === "bought") { toast(`${get(id).name} 샀어요 · +${xpFor(get(id)) - 2} XP`, [{ label: "되돌리기", run: () => { setStatus(id, "todo", { quiet: true }); } }]); setTimeout(() => { const f = $("#fPrice"); if (f) f.focus(); }, 60); }
        }));
        $$("#sheet [data-more]").forEach((b) => (b.onclick = () => { readDraft(); more = !more; sheetState.refresh(); }));
        $$("#sheet [data-cond]").forEach((b) => (b.onclick = () => { readDraft(); draft.cond = b.dataset.cond; sheetState.refresh(); }));
        $$("#sheet [data-how]").forEach((b) => (b.onclick = () => { readDraft(); draft.how = draft.how === b.dataset.how ? "" : b.dataset.how; sheetState.refresh(); }));
        $$("#sheet [data-pickfill]").forEach((b) => (b.onclick = () => {
          readDraft();
          const q = (PICKS[id] || []).slice().sort((a, c) => (c.pick ? 1 : 0) - (a.pick ? 1 : 0))[+b.dataset.pickfill];
          if (!q) return;
          draft.model = `${q.brand} ${q.model}`.trim();
          if (q.price) draft.price = String(q.price);
          sheetState.refresh();
        }));
        const sv = $("#sheet [data-savepur]");
        if (sv) sv.onclick = () => {
          readDraft();
          const i = get(id);
          const p = { memo: draft.memo };
          if (i.status === "bought") p.purchase = Object.assign({}, i.purchase || {}, { model: draft.model.trim(), price: draft.price ? +draft.price : "", where: draft.where, cond: draft.cond, how: draft.how, date: (i.purchase && i.purchase.date) || new Date().toISOString().slice(0, 7) });
          const before = game();
          patch(id, p); draft = null; closeSheet(); rerender(); toast("기록했어요 · +2 XP");
          const after = game(); if (after.lv > before.lv) showLevelUp(after);
        };
        if (focusPrice) { focusPrice = false; setTimeout(() => { const f = $("#fPrice"); if (f) f.focus(); }, 80); }
      },
    });
  }

  /* 새 제품: 추천 제품마다 쿠팡 버튼. coupang.js에 확인된 파트너스 링크가 있으면 첫 추천 제품에 그 링크를 써요 */
  function cpLink(i, p, n) {
    const c = CP[i.id];
    if (c && c.checked && c.url && n === 0) return c.url;
    const q = p ? `${p.brand} ${p.model}`.replace(/\(.*?\)/g, "").trim() : (i.q || i.name);
    return `https://www.coupang.com/np/search?q=${enc(q)}`;
  }
  function newPick(i, p, n) {
    return `<div class="pick ${p.pick ? "best" : ""}">
      <div class="pick-top"><b>${p.pick ? '<span class="tag tag-brand">추천</span>' : ""}${esc(p.brand)} ${esc(p.model)}</b><strong>${p.price ? won(p.price) : "가격 확인"}</strong></div>
      ${p.why ? `<p>${esc(p.why)}</p>` : ""}
      <div class="pick-acts">
        <a class="btn ${p.pick ? "btn-primary" : "btn-soft"} btn-sm" href="${esc(cpLink(i, p, n))}" target="_blank" rel="noopener sponsored">쿠팡에서 보기</a>
        ${p.url ? `<a class="linkbtn" href="${esc(p.url)}" target="_blank" rel="noopener">다른 판매처 비교</a>` : ""}
      </div>
    </div>`;
  }

  /* ---------- 다음 캠핑 계획 ---------- */
  function openPlan() {
    const p = nextPlan();
    openSheet(() => `<div class="sheet-head"><div><h2 id="sheetTitle">${p ? "다음 캠핑 고치기" : "다음 캠핑 정하기"}</h2></div>${xBtn()}</div>
      <label class="field"><span>언제 가요?</span><input id="pDate" type="date" value="${esc(p ? p.date : "")}" min="${new Date().toISOString().slice(0, 10)}"></label>
      <label class="field"><span>어디로 가요?</span><input id="pPlace" placeholder="예: 가평 자라섬" value="${esc(p ? p.place : "")}"></label>
      <div class="pills"><button class="chip" type="button" id="pDog" aria-pressed="${p ? !!p.dog : true}">강아지 동반</button><button class="chip" type="button" id="pElec" aria-pressed="${p ? !!p.elec : true}">전기 있음</button></div>
      <div class="sheet-foot">${p ? '<button class="btn" type="button" id="pDel">삭제</button>' : '<button class="btn" type="button" data-close>취소</button>'}<button class="btn btn-primary" style="flex:1" type="button" id="pSave">저장</button></div>`, {
      after: () => {
        ["pDog", "pElec"].forEach((k) => ($("#" + k).onclick = (e) => e.currentTarget.setAttribute("aria-pressed", e.currentTarget.getAttribute("aria-pressed") !== "true")));
        $("#pSave").onclick = () => {
          const date = $("#pDate").value;
          if (!date) { toast("날짜를 골라 주세요"); $("#pDate").focus(); return; }
          const d = { date, place: $("#pPlace").value.trim(), dog: $("#pDog").getAttribute("aria-pressed") === "true", elec: $("#pElec").getAttribute("aria-pressed") === "true" };
          state.plans = state.plans || [];
          if (p) Object.assign(p, d); else state.plans.push(Object.assign({ id: "p" + Date.now(), gear: [], packed: [], season: "", nights: 1 }, d));
          save(); closeSheet(); rerender(); toast(daysTo(date) === 0 ? "오늘 출발이에요. 즐거운 캠핑 해요!" : `D-${daysTo(date)}, 준비를 시작해요`);
        };
        const del = $("#pDel"); if (del) del.onclick = () => { state.plans = state.plans.filter((x) => x !== p); save(); closeSheet(); rerender(); toast("캠핑 일정을 지웠어요"); };
      },
    });
  }

  /* ---------- 다녀온 캠핑 기록 ---------- */
  function openTrip(tripId) {
    const existing = tripId ? (state.trips || []).find((t) => t.id === tripId) : null;
    const plan = existing ? null : nextPlan();
    const t = existing || { date: plan ? plan.date : new Date().toISOString().slice(0, 10), place: plan ? plan.place : "", dog: plan ? !!plan.dog : true, temp: "", notes: "" };
    openSheet(() => `<div class="sheet-head"><span class="ico"><img src="v2/icons/camping.png" alt=""></span><div><h2 id="sheetTitle">${existing ? "캠핑 후기" : "캠핑 다녀왔어요"}</h2><span class="muted" style="font-size:14px">${existing ? `후기를 남기면 +${XP_REVIEW} XP` : `기록하면 +${XP_TRIP} XP, 후기까지 쓰면 +${XP_REVIEW} XP 더`}</span></div>${xBtn()}</div>
      <div class="grid2">
        <label class="field"><span>언제</span><input id="tDate" type="date" value="${esc(t.date)}"></label>
        <label class="field"><span>밤 최저기온 (℃)</span><input id="tTemp" inputmode="numeric" placeholder="예: 2" value="${esc(t.temp)}"></label>
      </div>
      <label class="field"><span>어디로</span><input id="tPlace" placeholder="예: 가평 자라섬" value="${esc(t.place)}"></label>
      <div class="pills"><button class="chip" type="button" id="tDog" aria-pressed="${!!t.dog}">강아지 동반</button></div>
      <label class="field"><span>후기 · 배운 점</span><textarea id="tNotes" placeholder="예: 새벽에 결로가 심했어요. 다음엔 문을 조금 열어둘래요.">${esc(t.notes)}</textarea></label>
      <div class="sheet-foot">${existing ? '<button class="btn btn-danger" type="button" id="tDel">삭제</button>' : '<button class="btn" type="button" data-close>취소</button>'}<button class="btn btn-primary" style="flex:1" type="button" id="tSave">${existing ? "저장" : "기록하기"}</button></div>`, {
      after: () => {
        const del = $("#tDel");
        if (del) del.onclick = () => {
          const at = state.trips.indexOf(existing);
          state.trips = state.trips.filter((x) => x !== existing);
          save(); closeSheet(); rerender();
          toast("캠핑 기록을 지웠어요", [{ label: "되돌리기", run: () => { state.trips.splice(Math.max(0, at), 0, existing); save(); rerender(); } }]);
        };
        $("#tDog").onclick = (e) => e.currentTarget.setAttribute("aria-pressed", e.currentTarget.getAttribute("aria-pressed") !== "true");
        $("#tSave").onclick = () => {
          const before = game();
          const d = { date: $("#tDate").value || new Date().toISOString().slice(0, 10), place: $("#tPlace").value.trim(), dog: $("#tDog").getAttribute("aria-pressed") === "true", temp: $("#tTemp").value.replace(/[^0-9-]/g, ""), notes: $("#tNotes").value.trim() };
          d.dateLabel = d.date;
          state.trips = state.trips || [];
          if (existing) Object.assign(existing, d);
          else {
            state.trips.push(Object.assign({ id: "t" + Date.now(), cost: "", weather: "", needs: [], photos: [], gear: items().filter(have).map((i) => i.id) }, d));
            if (plan) state.plans = (state.plans || []).filter((x) => x !== plan);
          }
          save(); closeSheet(); rerender();
          const after = game();
          if (after.lv > before.lv) showLevelUp(after);
          else toast(existing ? `후기를 남겼어요 · +${d.notes ? XP_REVIEW : 0} XP` : `캠핑을 기록했어요 · +${XP_TRIP + (d.notes ? XP_REVIEW : 0)} XP`);
        };
      },
    });
  }

  /* ---------- 레벨 업 축하 화면 ---------- */
  function showLevelUp(g) {
    let el = $("#lvup");
    if (!el) { el = document.createElement("div"); el.id = "lvup"; el.className = "lvup"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-labelledby", "lvupTitle"); document.body.appendChild(el); }
    const prevFocus = document.activeElement;
    el.innerHTML = `<div class="lvup-card">
        <div class="lvup-scene" aria-hidden="true">${sceneImg(g.lv)}</div>
        <div class="lvup-text">
          <span class="lvup-eyebrow">레벨 업!</span>
          <h2 id="lvupTitle">Lv.${g.lv + 1} ${esc(g.cur.name)}${iga(g.cur.name)} 됐어요</h2>
          ${LEVEL_FX[g.lv] ? `<p>${esc(LEVEL_FX[g.lv])}</p>` : ""}
          ${g.next ? `<small>다음 단계 ${esc(g.next.name)}까지 ${g.next.xp - g.xp} XP · 캠핑을 다녀오면 +${XP_TRIP} XP</small>` : "<small>최고 단계에 올랐어요. 이제 캠핑 고수예요!</small>"}
          <button class="btn btn-primary btn-block" type="button" id="lvupOk">우리 캠프 보러 가기</button>
        </div>
      </div>`;
    el.hidden = false;
    document.body.style.overflow = "hidden";
    const close = () => { el.hidden = true; document.body.style.overflow = ""; document.removeEventListener("keydown", onKey); if (route !== "home") location.hash = "#home"; else window.scrollTo({ top: 0, behavior: "smooth" }); if (prevFocus && document.contains(prevFocus)) prevFocus.focus({ preventScroll: true }); };
    const onKey = (e) => { if (e.key === "Escape" || e.key === "Enter") { e.preventDefault(); close(); } };
    document.addEventListener("keydown", onKey);
    $("#lvupOk").onclick = close;
    setTimeout(() => $("#lvupOk").focus(), 50);
  }

  /* ---------- 레벨 보기 ---------- */
  function openLevels() {
    const g = game();
    openSheet(() => `<div class="sheet-head"><div><h2 id="sheetTitle">캠퍼 단계</h2><span class="muted" style="font-size:14px">장비를 사고 캠핑을 다녀올수록 단계가 올라가요</span></div>${xBtn()}</div>
      <div class="lv-list">${LEVELS.map((l, n) => `<div class="lv-item ${n === g.lv ? "now" : n > g.lv ? "locked" : ""}"><span class="lesson-n">${n + 1}</span><b>${esc(l.name)}</b><span class="num">${n < g.lv ? "완료" : n === g.lv ? `지금 ${g.xp} XP` : `${l.xp} XP`}</span></div>`).join("")}</div>
      <div class="note"><small>경험치 얻는 법</small><p>캠핑 다녀오기 +${XP_TRIP} · 후기 남기기 +${XP_REVIEW} · 필수 장비 사기 +15 · 권장 +10 · 나중에 +5 · 가격이나 메모 적기 +2 · 원래 있던 것 +3</p><p>장비만 사서는 단계가 다 오르지 않아요. 캠핑을 다녀올수록 고수가 돼요.</p></div>`);
  }

  /* ---------- 품목 추가 ---------- */
  function openAdd() {
    openSheet(() => `<div class="sheet-head"><div><h2 id="sheetTitle">장비 추가</h2></div>${xBtn()}</div>
      <label class="field"><span>이름</span><input id="aName" placeholder="예: 캠핑 의자 커버" autocomplete="off"></label>
      <div class="grid2">
        <label class="field"><span>분류</span><select id="aCat">${CATS.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select></label>
        <label class="field"><span>중요도</span><select id="aPri"><option value="1">필수</option><option value="2" selected>권장</option><option value="3">나중에</option></select></label>
      </div>
      <div class="sheet-foot"><button class="btn" type="button" data-close>취소</button><button class="btn btn-primary" style="flex:1" type="button" id="aSave">추가</button></div>`, {
      after: () => {
        setTimeout(() => $("#aName").focus(), 60);
        $("#aSave").onclick = () => {
          const name = $("#aName").value.trim();
          if (!name) { toast("이름을 적어 주세요"); $("#aName").focus(); return; }
          state.custom = state.custom || [];
          state.custom.push({ id: "c" + Date.now(), name, cat: $("#aCat").value, pri: +$("#aPri").value, status: "todo", custom: true, q: name, why: "", spec: "", newPrice: "", usedPrice: "" });
          save(); closeSheet(); ui.status = "todo"; ui.cat = "all"; ui.q = ""; rerender(); toast(`${name}을(를) 사야 해요에 넣었어요`);
        };
      },
    });
  }

  /* ---------- 공통 이벤트 ---------- */
  function bindCommon(root = document) {
    $$("[data-open]", root).forEach((b) => (b.onclick = () => openItem(b.dataset.open)));
    $$("[data-buy]", root).forEach((b) => (b.onclick = (e) => {
      e.stopPropagation();
      const i = get(b.dataset.buy);
      b.classList.add("pop");
      if (have(i)) setStatus(i.id, "todo"); else setStatus(i.id, "bought");
    }));
    $$("[data-plan]", root).forEach((b) => (b.onclick = openPlan));
    $$("[data-trip]", root).forEach((b) => (b.onclick = () => openTrip()));
    $$("[data-review]", root).forEach((b) => (b.onclick = () => openTrip(b.dataset.review)));
    $$("[data-levels]", root).forEach((b) => (b.onclick = openLevels));
    $$("[data-add]", root).forEach((b) => (b.onclick = openAdd));
    $$("[data-guide]", root).forEach((b) => (b.onclick = () => openGuide(b.dataset.guide)));
    $$("[data-search]", root).forEach((b) => (b.onclick = () => { ui.q = ""; location.hash = "#gear"; setTimeout(() => { const q = $("#gearQ"); if (q) q.focus(); }, 30); }));
    $$("[data-quick]", root).forEach((a) => (a.onclick = () => { if (a.dataset.quick === "bought") { ui.status = "bought"; ui.cat = "all"; ui.q = ""; } }));
  }

  window.addEventListener("hashchange", () => { if (sheetState.open) closeSheet(); go(); });
  window.addEventListener("storage", (e) => { if (e.key === KEY) { Object.assign(state, load()); rerender(); } });
  go();
  startShared();
})();
