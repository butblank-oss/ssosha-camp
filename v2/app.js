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
  /* 영수증 반영: data.js의 SOSHA_RECEIPTS를 한 번만 적용해요.
   * 이미 같은 물건을 '샀어요'로 적어 둔 기록(구매처·제품명·직접 추가한 품목 설명)이 있으면 건너뛰어요. */
  function applyReceipts() {
    const done = new Set(state.receipts || []);
    const recText = (i, cust) => [(cust || i.custom) ? `${i.name || ""} ${i.spec || ""}` : "", i.purchase ? `${i.purchase.where || ""} ${i.purchase.model || ""}` : ""].join(" ");
    const records = (skipId) => {
      const out = [];
      Object.entries(state.items || {}).forEach(([id, v]) => { if (id !== skipId && (v.status === "bought" || v.status === "owned") && v.purchase) out.push(recText(v, false)); });
      (state.custom || []).forEach((c) => { if (c.id !== skipId && (c.status === "bought" || c.status === "owned")) out.push(recText(c, true)); });
      return out;
    };
    const covered = (e, skipId) => records(skipId).some((t) => e.keys.some((k) => t.includes(k)));
    let changed = false;
    (window.SOSHA_RECEIPTS || []).forEach((r) => {
      if (done.has(r.id)) return;
      // 예전 버전이 이미 적용됐다면, 그때 넣은 기록 중 다른 기록과 겹치는 것을 되돌려요
      if (r.replaces && done.has(r.replaces)) {
        r.entries.forEach((e) => {
          const v = e.id && state.items[e.id];
          if (v && v.purchase && v.purchase.model === e.model && v.purchase.where === r.where && covered(e, e.id)) { delete state.items[e.id]; changed = true; }
        });
        done.delete(r.replaces);
      }
      r.entries.forEach((e) => {
        if (e.id) {
          const cur = state.items[e.id] || {};
          const pur = cur.purchase || {};
          if (cur.status === "bought" && pur.price !== undefined && pur.price !== "") return;
          if (covered(e, e.id)) return;
          state.items[e.id] = Object.assign({}, cur, { status: "bought", purchase: Object.assign({}, pur, { where: r.where, date: r.date, cond: r.cond, how: r.how, price: e.price, model: e.model }) });
        } else if (e.add) {
          if ((state.custom || []).some((c) => c.id === e.add.id) || covered(e, null)) return;
          state.custom = (state.custom || []).concat([Object.assign({ custom: true, pri: 3, q: e.add.name, spec: e.model, newPrice: "", usedPrice: "" }, e.add, { status: "bought", purchase: { where: r.where, date: r.date, cond: r.cond, how: r.how, price: e.price, model: e.model } })]);
        }
      });
      done.add(r.id); changed = true;
    });
    if (changed) state.receipts = [...done];
    return changed;
  }
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
      catch (e) { this.mode = e && /not_granted|permission|denied|invalid_argument/i.test((e.code || "") + (e.message || "")) ? "readonly" : "error"; if (this.mode === "readonly") this.canWrite = false; paintSync(); }
      finally { this.writing = false; if (this.queued != null) this.flush(); }
    },
  };
  function replaceState(next) {
    Object.keys(state).forEach((k) => delete state[k]);
    Object.assign(state, { items: {}, custom: [], order: {}, trips: [], plans: [] }, next);
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
    if (applyReceipts()) save();
  }
  function paintSync() {
    let el = document.getElementById("syncBanner");
    const fb = shared.backend === "cloud";
    const msg = {
      loading: "공유 기록을 불러오는 중이에요…",
      readonly: fb ? (shared.user ? "이 계정은 보기만 할 수 있어요. 지쏘·시아 이메일로 로그인해요." : "보기 전용이에요. 지쏘·시아는 기록 탭에서 이메일로 로그인하면 고칠 수 있어요.") : "보기 전용이에요. 지쏘와 시아만 고칠 수 있어요.",
      error: "공유 저장에 잠시 실패했어요. 바뀐 내용은 이 기기에 남아 있어요.",
    }[shared.mode];
    if (!msg) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement("div"); el.id = "syncBanner"; el.setAttribute("role", "status"); document.body.appendChild(el); }
    el.className = "sync-banner " + shared.mode;
    el.textContent = msg;
  }
  /* 공유 기록 구독: 아티팩트 db와 Firebase Firestore가 같은 모양(ref.set / ref.onSnapshot)이라 함께 써요 */
  const hasData = (s) => !!(s && (Object.keys(s.items || {}).length || (s.custom || []).length || (s.trips || []).length || (s.plans || []).length));
  function subscribeShared() {
    if (shared.unsub) shared.unsub();
    shared.mode = "loading"; paintSync();
    const t = setTimeout(() => { if (shared.mode === "loading") { shared.mode = "error"; paintSync(); } }, 10000);
    let first = true;
    shared.unsub = shared.ref.onSnapshot((snap) => {
      if (snap.metadata && !snap.metadata.fromCache) clearTimeout(t);
      if (snap.metadata && snap.metadata.hasPendingWrites) return;
      const remote = snap.exists && snap.data() && snap.data().state;
      if (remote) {
        const body = JSON.stringify(remote);
        if (shared.backend === "cloud" && !shared.canWrite && hasData(state) && body !== JSON.stringify(state) && !mineSaved()) {
          // 로그인 전에는 공유 기록을 보여주되, 이 기기 기록은 따로 보관해 둬요 (로그인하면 어느 쪽을 쓸지 물어봐요)
          try { localStorage.setItem(KEY + "-mine", JSON.stringify(state)); } catch {}
        }
        const mine = shared.backend === "cloud" && shared.canWrite && first ? (mineSaved() || (hasData(state) ? state : null)) : null;
        if (mine && body !== JSON.stringify(mine)) {
          // 처음 로그인한 기기: 이 기기 기록과 공유 기록이 다르면 어느 쪽을 쓸지 물어봐요
          askWhichRecord(remote, mine);
        } else {
          shared.lastSent = body;
          if (body !== JSON.stringify(state)) { replaceState(remote); rerender(); }
        }
      }
      shared.mode = shared.canWrite ? "live" : "readonly";
      paintSync();
      if (first && !snap.exists && shared.canWrite) shared.push(); // 처음 한 번: 이 기기 기록을 공유 기록으로 올려요
      first = false;
    }, () => { clearTimeout(t); shared.mode = "error"; paintSync(); });
  }
  const mineSaved = () => { try { return JSON.parse(localStorage.getItem(KEY + "-mine")) || null; } catch { return null; } };
  const clearMine = () => { try { localStorage.removeItem(KEY + "-mine"); } catch {} };
  function askWhichRecord(remote, mine) {
    const n = (s) => `산 것 ${Object.values(s.items || {}).filter((v) => v.status === "bought").length + (s.custom || []).filter((c) => c.status === "bought").length}개 · 일정 ${(s.plans || []).length}개 · 기록 ${(s.trips || []).length}개`;
    openSheet(() => `<div class="sheet-head"><div><h2 id="sheetTitle">어느 기록을 쓸까요?</h2><span class="muted" style="font-size:14px">이 기기에 저장된 기록과 공유 기록이 달라요</span></div></div>
      <div class="list">
        <button class="link-row" type="button" data-pick="local"><span class="ico sm"><img src="v2/icons/backpack.png" alt=""></span><b>이 기기 기록을 공유 기록으로 올리기<br><span class="muted" style="font-size:13px;font-weight:400">${n(mine)}</span></b></button>
        <button class="link-row" type="button" data-pick="remote"><span class="ico sm"><img src="v2/icons/link.png" alt=""></span><b>공유 기록 불러오기<br><span class="muted" style="font-size:13px;font-weight:400">${n(remote)}</span></b></button>
      </div>
      <p class="faint" style="font-size:12.5px">어느 쪽을 골라도 이 기기 기록은 브라우저에 따로 보관해 둬요. 최근에 장비를 업데이트한 기기라면 '올리기'를 골라요.</p>`, {
      after: () => {
        $("#sheet [data-pick=local]").onclick = () => { try { localStorage.setItem(KEY + "-before-sync-" + Date.now(), JSON.stringify(remote)); } catch {} replaceState(mine); clearMine(); shared.lastSent = ""; shared.mode = "live"; shared.push(); closeSheet(); rerender(); toast("이 기기 기록을 공유 기록으로 올렸어요"); };
        $("#sheet [data-pick=remote]").onclick = () => { try { localStorage.setItem(KEY + "-before-sync-" + Date.now(), JSON.stringify(mine)); } catch {} clearMine(); shared.lastSent = JSON.stringify(remote); replaceState(remote); closeSheet(); rerender(); toast("공유 기록을 불러왔어요"); };
      },
    });
  }
  const loadScript = (src) => new Promise((ok, no) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
  /* Supabase: boards 테이블의 'shared' 줄 하나에 기록 전체를 저장해요 (누구나 읽기, 지쏘·시아만 쓰기는 RLS 정책이 막아요) */
  async function startSupabase(cfg) {
    try { await loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js"); }
    catch { shared.mode = "error"; paintSync(); return; }
    const sb = window.supabase.createClient(cfg.url, cfg.anonKey);
    const T = cfg.table || "sosha_boards"; // 이미 쓰는 프로젝트에 붙여도 겹치지 않게 이름을 따로 써요
    shared.backend = "cloud";
    shared.sb = sb;
    const snapOf = (row) => ({ exists: !!row, data: () => (row ? { state: row.state, at: row.at } : null), metadata: { fromCache: false, hasPendingWrites: false } });
    shared.ref = {
      async set(d) {
        const { error } = await sb.from(T).upsert({ id: "shared", state: d.state, at: new Date(d.at || Date.now()).toISOString() });
        if (error) throw { code: error.code === "42501" ? "permission-denied" : error.code, message: error.message };
      },
      onSnapshot(cb, onErr) {
        let alive = true;
        sb.from(T).select("state, at").eq("id", "shared").maybeSingle().then(({ data, error }) => { if (!alive) return; if (error) onErr && onErr(error); else cb(snapOf(data)); });
        const ch = sb.channel("sosha-board-shared").on("postgres_changes", { event: "*", schema: "public", table: T, filter: "id=eq.shared" }, (p) => { if (alive && p.new && p.new.state) cb(snapOf(p.new)); }).subscribe();
        return () => { alive = false; sb.removeChannel(ch); };
      },
    };
    const onUser = (u) => {
      const was = shared.user && shared.user.id;
      shared.user = u || null;
      shared.canWrite = !!u;
      if (was !== (u && u.id) || !shared.unsub) subscribeShared();
      if (route === "log") rerender();
    };
    const { data } = await sb.auth.getSession();
    onUser(data && data.session ? data.session.user : null);
    sb.auth.onAuthStateChange((e, session) => {
      onUser(session ? session.user : null);
      if (e === "SIGNED_IN" && /access_token|type=magiclink/.test(location.hash)) location.hash = "#log"; // 메일 링크로 들어오면 기록 탭으로
    });
  }
  function signIn() {
    if (!shared.sb) return;
    openSheet(() => `<div class="sheet-head"><div><h2 id="sheetTitle">이메일로 로그인</h2><span class="muted" style="font-size:14px">메일로 온 링크를 누르면 로그인돼요</span></div>${xBtn()}</div>
      <label class="field"><span>이메일</span><input id="liEmail" type="email" inputmode="email" autocomplete="email" placeholder="예: jisso@gmail.com"></label>
      <p class="faint" style="font-size:12.5px">지쏘·시아 이메일만 기록을 고칠 수 있어요. 링크는 이 기기에서 열어야 이 기기가 로그인돼요.</p>
      <div class="sheet-foot"><button class="btn" type="button" data-close>취소</button><button class="btn btn-primary" style="flex:1" type="button" id="liSend">로그인 링크 받기</button></div>`, {
      after: () => {
        $("#liSend").onclick = async () => {
          const email = $("#liEmail").value.trim();
          if (!/.+@.+\..+/.test(email)) { toast("이메일을 확인해 주세요"); return; }
          $("#liSend").disabled = true;
          const { error } = await shared.sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname, shouldCreateUser: true } });
          $("#liSend").disabled = false;
          if (error) { toast(/rate|seconds/i.test(error.message) ? "잠시 뒤 다시 시도해 주세요" : "링크를 보내지 못했어요"); return; }
          closeSheet(); toast("메일함에서 로그인 링크를 눌러 주세요");
        };
      },
    });
  }
  async function startShared() {
    if (window.claude && typeof window.claude.use === "function") {
      const db = await window.claude.use("db").catch(() => null);
      if (db) {
        const user = await window.claude.use("user").catch(() => null);
        const may = user ? await user.can("data.write").catch(() => null) : null;
        shared.canWrite = may !== false; // null(모름)이면 써 보고, 거절되면 읽기 전용으로 바꿔요
        shared.backend = "artifact";
        shared.ref = db.doc("shared/board");
        subscribeShared();
        return;
      }
    }
    const cfg = window.SOSHA_SUPABASE;
    if (cfg && cfg.url && cfg.anonKey) startSupabase(cfg);
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
    tent: "tent", livingshell: "camping", woodstove: "fire", peg: "hammer", rope: "knot", groundsheet: "camping", mat: "bed", rug: "scarf", bedding: "bed", pillow: "bed",
    tarp: "umbrella-on-ground", shelter: "tent", cot: "bed", reel: "electric-plug", eblanket: "thermometer", heater: "fire",
    co: "bell", hotpack: "socks", circulator: "wind-face", burner: "fire", isoburner: "fire", gas: "fuel-pump", windscreen: "wind-face",
    torch: "fire", cookset: "cooking", griddle: "cooking", tongs: "chopsticks", scissors: "scissors", board: "kitchen-knife", spice: "salt",
    cooler: "ice", jug: "droplet", dishbag: "shopping-bags", coffee: "hot-beverage", dishes: "bowl-with-spoon", cutlery: "fork-and-knife",
    cups: "hot-beverage", foodmenu: "pot-of-food", firepit: "fire", gloves: "gloves", wood: "wood", extinguisher: "fire-extinguisher",
    firemat: "fire", table1: "package", chairs: "chair", storage: "package", igt: "cooking", shelf: "package", trash: "wastebasket",
    carabiner: "link", mainlamp: "lantern", headlamp: "flashlight", moodlamp: "candle", toiletry: "toothbrush", tissue: "roll-of-paper",
    clothes: "coat", battery: "battery", dogleash: "link", dogbowl: "bone", dogbed: "dog-face", dogwear: "coat", dogpoop: "roll-of-paper", dogfence: "dog-face", foammat: "bed", picnicmat: "umbrella-on-ground",
    deckpeg: "hammer", screwpeg: "hammer", thorbox: "package", thortop: "package", thorstand: "package", lanternhook: "lantern", lanternpole: "lantern",
    kitchentool: "cooking", thermo: "thermometer", condtowel: "roll-of-paper", hotwater: "droplet", flask: "hot-beverage",
    dogharness: "link", dogpad: "dog-face", pawwax: "bone", doghouse: "dog-face",
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
  const XP_TRIP = (GAME && GAME.xpTrip) || 60, XP_PICNIC = (GAME && GAME.xpPicnic) || 15, XP_DAY = (GAME && GAME.xpDay) || 30,
    KIND = { camp: { n: "캠핑 (1박)", w: "캠핑", ico: "camping" }, daycamp: { n: "당일 캠핑", w: "당일 캠핑", ico: "tent" }, picnic: { n: "피크닉", w: "피크닉", ico: "umbrella-on-ground" } },
    kindOf = (k) => KIND[k] || KIND.camp, xpOfKind = (k) => (k === "picnic" ? XP_PICNIC : k === "daycamp" ? XP_DAY : XP_TRIP),
    kindChips = (attr, cur) => Object.entries(KIND).map(([k, v]) => `<button class="chip" type="button" ${attr}="${k}" aria-pressed="${(cur || "camp") === k}">${v.n}</button>`).join(""), XP_REVIEW = (GAME && GAME.xpReview) || 10;

  /* ---------- 다음 캠핑 ---------- */
  const today = () => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; };
  const planById = (id) => (state.plans || []).find((x) => x.id === id) || null;
  function upcomingPlans() {
    const since = new Date(); since.setHours(0, 0, 0, 0); since.setDate(since.getDate() - 3);
    return (state.plans || []).filter((p) => p.date && new Date(p.date + "T00:00:00") >= since).sort((a, b) => a.date.localeCompare(b.date));
  }
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
    const paid = items().filter((i) => i.status === "bought" && i.purchase && i.purchase.price !== "" && i.purchase.price != null);
    const spent = paid.reduce((s, i) => s + (+i.purchase.price || 0), 0);
    const boughtN = items().filter((i) => i.status === "bought").length;
    return { must, cheap, unknown, spent, paidN: paid.length, boughtN };
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
      ? daysTo(p.date) < 0 ? `<h1>${esc(p.place || "캠핑")},<br><em>잘 다녀왔어요?</em></h1><button class="hero-set" type="button" data-trip>다녀왔어요 · +${XP_TRIP} XP</button>` : `<h1>${esc(p.place || "다음 캠핑")}까지<br>${daysTo(p.date) === 0 ? "<em>오늘</em> 떠나요" : `<em>${daysTo(p.date)}일</em> 남았어요`}</h1>${daysTo(p.date) > 0 ? `<button class="hero-set" type="button" data-pack="${esc(p.id)}">짐 챙기기 · ${(() => { const d = packData(p); return `${d.done}/${d.total}`; })()}</button>` : ""}${daysTo(p.date) <= 0 ? `<button class="hero-set" type="button" data-trip>다녀왔어요 · +${XP_TRIP} XP</button>` : ""}`
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
          <a class="spent-row" href="#gear" data-quick="bought"><span>지금까지 산 것 <b class="num">${s.boughtN}개</b></span><strong class="num">${won(s.spent) || "0원"}</strong></a>
          ${s.boughtN > s.paidN ? `<p class="faint" style="font-size:12.5px;text-align:center;margin-top:-6px">가격을 안 적은 ${s.boughtN - s.paidN}개는 빼고 더했어요</p>` : ""}
          <a class="btn btn-primary btn-block" href="#gear">살 것 목록 보기</a>
        </section>
      </div>
      <div class="page">
        <nav class="quick" aria-label="바로가기">
          <a href="#gear" data-quick="bought">${icoImg("shopping-bags")}산 것 보기</a>
          <a href="#explore" data-quick="used">${icoImg("label")}중고 찾기</a>
          <button type="button" ${p ? `data-pack="${esc(p.id)}"` : "data-plan"}>${icoImg("backpack")}${p ? "짐 챙기기" : "일정 정하기"}</button>
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
  /* ---------- 우리 장비 진단: 가진 장비를 보고 다음에 보강할 것을 순서대로 골라요 ---------- */
  function gearAdvice() {
    const hv = (id) => { const i = get(id); return !!(i && have(i)); };
    const miss = (ids) => ids.filter((id) => get(id) && !hv(id));
    const steps = [
      { ids: ["bedding"], t: "겨울엔 침낭·이불부터", d: "동계 침낭(컴포트 -5℃ 이하) 2개, 아니면 두꺼운 집 이불 + 극세사 담요라도 꼭 챙겨요. 추위는 장비보다 잠자리에서 갈려요." },
      { ids: ["groundsheet", "foammat"], t: "바닥 3중 단열", d: "그라운드시트 → 발포매트 → 자충매트 → 전기장판 순서로 깔아요. 원터치 텐트는 바닥 냉기가 제일 큰 약점이에요." },
      { ids: ["co"], t: "일산화탄소 경보기", d: "텐트 안에서 난방을 하면 꼭 있어야 하는 생명 장비예요. 머리 높이에 걸어요." },
      { ids: ["reel", "eblanket"], t: "전기 사이트 준비", d: "누전차단 릴선 + 200W 이하 전기장판이면 영상권 겨울은 편하게 나요. 600W를 넘지 않게 써요." },
      { ids: ["dogpad", "dogwear"], t: "강아지 방한", d: "시츄는 추위에 약해요. 저전력 펫 온열매트와 패딩을 챙겨요." },
      { ids: ["mainlamp", "headlamp"], t: "조명", d: "첫 캠핑 교훈이에요. 메인 랜턴 하나와 1인 1 헤드랜턴이면 조리·철수가 편해요." },
      { ids: ["heater"], t: "600W 이하 온풍기", d: "전기장판으로 부족한 날 텐트 공기를 데워요. 전도 시 자동 차단되는 것으로 골라요." },
      ...(hv("livingshell") ? [{ ids: ["livingshell"], t: "알베르게 미리 쳐 보기", d: "겨울 1박은 알베르게로 가요. 16kg이라 둘이 같이 들어요. 처음엔 1시간 넘게 걸릴 수 있으니 당일 캠핑이나 낮 시간에 한 번 연습해요. 쳐 봤으면 아래 버튼을 눌러요.", practice: true }] : []),
      { ids: ["shelter"], t: "영하 -5℃ 아래라면 쉘터", skip: hv("livingshell"), d: "텐트를 바꾸지 말고 쉘터를 거실로 쓰고 원터치 텐트를 그 안에 넣어 침실로 써요. 바람과 냉기를 한 겹 더 막아줘요." },
      { ids: ["igt"], t: "IGT로 주방 정리", d: "쉘터까지 갖췄다면 다음은 IGT예요. 조리 공간이 정리돼서 만족도가 높아요." },
    ];
    return steps.filter((s) => !s.skip).map((s) => Object.assign({}, s, { missing: s.practice ? (state.pitched ? [] : ["practice"]) : miss(s.ids) })).filter((s) => s.ids.some((id) => get(id)));
  }
  function diagHTML() {
    const adv = gearAdvice();
    const todo = adv.filter((s) => s.missing.length);
    const tent = get("tent");
    const sh = ((window.SOSHA_PICKS || {}).shelter || []).filter((p) => p.price).slice(0, 4);
    const chip = (id) => { const i = get(id); return i ? `<button class="diag-chip ${have(i) ? "ok" : ""}" type="button" data-open="${esc(id)}">${have(i) ? "✓ " : ""}${esc(i.name)}</button>` : ""; };
    const ls = get("livingshell");
    return `<p style="font-size:15px;line-height:1.7">${ls && have(ls) ? "텐트가 두 개예요. <b>원터치 텐트</b>는 얇은 천과 파이버글라스 폴이라 봄·가을, 당일 캠핑, 영상권 1박에 가볍게 쓰고, <b>미니멀웍스 알베르게</b>는 이너텐트와 루프플라이가 있는 터널형이라 겨울 1박에 써요. 길이 6.5m라 데크보다 파쇄석·잔디 사이트가 맞아요. 쉘터는 따로 안 사도 돼요." : tent && have(tent) ? "지금 원터치 텐트는 얇은 천(190T)과 파이버글라스 폴, 스커트가 없는 구조라 <b>봄·가을과 영상권 겨울(밤 0℃ 안팎)</b>까지가 편하게 쓸 수 있는 한계예요. 영하로 내려가면 바닥 냉기, 결로, 바람이 문제예요." : "텐트를 먼저 정해요."}</p>
      <h3 class="camp-h">순서대로 보강하기 <span class="faint">${todo.length ? `${todo.length}단계 남았어요` : "다 갖췄어요!"}</span></h3>
      <ol class="diag-steps">${adv.map((s) => `<li class="${s.missing.length ? "" : "done"}"><b>${s.missing.length ? "" : "✓ "}${esc(s.t)}</b><p>${esc(s.d)}</p><div class="diag-chips">${s.ids.map(chip).join("")}${s.practice ? `<button class="diag-chip ${state.pitched ? "ok" : ""}" type="button" data-pitched>${state.pitched ? "✓ 쳐 봤어요" : "쳐 봤어요"}</button>` : ""}</div></li>`).join("")}</ol>
      ${sh.length && !(ls && have(ls)) ? `<h3 class="camp-h">쉘터 후보 <span class="faint">원터치 텐트를 안에 넣는 방식</span></h3>
      <div class="list">${sh.map((p) => `<div class="link-row" style="align-items:flex-start"><span class="ico sm"><img src="v2/icons/tent.png" alt=""></span><b>${esc(p.brand)} ${esc(p.model)}<br><span class="muted" style="font-size:13px;font-weight:400">${p.weightKg ? `${p.weightKg}kg · ` : ""}${esc(p.why || "")}</span></b><small>${won(p.price)}</small></div>`).join("")}</div>
      <p class="faint" style="font-size:12.5px">원터치 텐트(223×203cm)가 쉘터 안에 들어가는지는 실측해서 확인해요. 텐트를 리빙쉘·터널형으로 바꾸는 건 10~15kg이라 미니 트렁크엔 부담이 커요.</p>` : ""}
      <h3 class="camp-h">계절 따라 나중에</h3>
      <ul class="bullets"><li>타프: 쉘터가 있으면 겨울엔 필요 없어요. 봄·여름 비·햇빛 대비로.</li><li>아이스박스: 겨울엔 안 사도 돼요. 봄에 사요.</li><li>야전침대: 겨울엔 바닥보다 추워서 나중에.</li></ul>`;
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
    const adv = gearAdvice().filter((s) => s.missing.length);
    const advCard = !ui.q && adv.length ? `<button class="card adv-card" type="button" data-guide="@diag"><small>다음 단계 · 우리 장비 진단</small><b>${esc(adv[0].t)}</b><p>${esc(adv[0].d)}</p>${adv[1] ? `<span class="faint">그다음: ${esc(adv[1].t)}</span>` : ""}<span class="adv-more">자세히 보기 ›</span></button>` : "";
    const body = () => `${advCard}${ui.q ? "" : `<div class="seg" role="tablist" aria-label="상태">${STATUS.map(([k, n]) => `<button role="tab" type="button" data-status="${k}" aria-selected="${ui.status === k}">${n}<b>${counts[k]}</b></button>`).join("")}</div>
      <div class="chips" role="group" aria-label="분류">${[["all", "전체"], ["lesson", "교훈만"]].concat(CATS.map((c) => [c.id, c.name])).map(([k, n]) => `<button class="chip" type="button" data-cat="${k}" aria-pressed="${ui.cat === k}">${n}</button>`).join("")}</div>`}
      <div class="list" aria-live="polite">
        ${groups.length ? groups.map((g) => `<div class="group-head"><span><span class="tag ${PRI[g.p][1]}">${PRI[g.p][0]}</span> ${g.rows.length}개</span>${g.p === 1 && ui.status !== "owned" ? "<small>교훈 품목이 위에 와요</small>" : ""}</div>${g.rows.map(rowHTML).join("")}`).join("")
          : `<div class="empty"><img src="v2/icons/${ui.q ? "label" : "party-popper"}.png" alt="">${ui.q ? "찾는 장비가 없어요. 이름을 바꿔 보거나 직접 추가해요." : ui.status === "todo" ? "사야 할 장비가 없어요!" : "여기엔 아직 아무것도 없어요"}</div>`}
      </div>
      ${footNote()}
      ${showSum && s.must.length ? `<div class="sumbar"><span>필수 ${s.must.length}개 다 사면 (가성비)</span><strong>${won(s.cheap)}</strong></div>` : ""}`;
    // 검색 중에는 입력창은 그대로 두고 아래 목록만 다시 그려요 (한글 조합이 끊기지 않게)
    const live = $("#gearQ");
    if (live && document.activeElement === live && $("#gearBody")) {
      $("#gearBody").innerHTML = body();
      const c = $("[data-clear]"); if (c) c.hidden = !ui.q;
      bindCommon($("#gearBody"));
      $$("#gearBody [data-status]").forEach((b) => (b.onclick = () => { ui.status = b.dataset.status; renderGear(); }));
      $$("#gearBody [data-cat]").forEach((b) => (b.onclick = () => { ui.cat = b.dataset.cat; renderGear(); }));
      return;
    }
    $("#view").innerHTML = `<div class="page">
      <header class="page-head"><h1>장비</h1><button class="btn btn-soft btn-sm" type="button" data-add><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>추가</button></header>
      <label class="search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><span class="sr">장비 검색</span>
        <input id="gearQ" type="search" placeholder="장비 이름으로 찾기 (예: 릴선)" value="${esc(ui.q)}" autocomplete="off">
        <button class="clear" type="button" data-clear aria-label="검색어 지우기"${ui.q ? "" : " hidden"}>✕</button></label>
      <div id="gearBody">${body()}</div>
    </div>`;
    bindCommon();
    const q = $("#gearQ");
    q.oninput = () => { ui.q = q.value; renderGear(); };
    $$("[data-status]").forEach((b) => (b.onclick = () => { ui.status = b.dataset.status; renderGear(); }));
    $$("[data-cat]").forEach((b) => (b.onclick = () => { ui.cat = b.dataset.cat; renderGear(); }));
    const c = $("[data-clear]"); if (c) c.onclick = () => { ui.q = ""; q.value = ""; renderGear(); q.focus(); };
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
          <button class="link-row" type="button" data-guide="@diag">${icoImg("clipboard")}<b>우리 장비 진단</b><small>다음에 뭘 보강할까</small></button>
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
    let title, body, after;
    if (key === "@shelter") {
      title = "겨울 쉘터 고르는 법";
      body = `<ul class="bullets">${window.SOSHA_SHELTER_TIPS.map((t) => `<li>${esc(t.tip)}${t.url ? ` <a class="src" href="${esc(t.url)}" target="_blank" rel="noopener">출처</a>` : ""}</li>`).join("")}</ul>`;
    } else if (key === "@diag") {
      title = "우리 장비 진단";
      body = diagHTML();
      after = () => { const b = $("#sheet [data-pitched]"); if (b) b.onclick = () => { state.pitched = !state.pitched; save(); sheetState.refresh(); rerender(); }; };
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
    openSheet(() => `<div class="sheet-head"><div><h2 id="sheetTitle">${esc(title)}</h2></div>${xBtn()}</div>${key === "@diag" ? diagHTML() : body}`, { after });
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
        <div class="sec-head"><h2>캠핑 계획</h2>${upcomingPlans().length ? `<span class="more">${upcomingPlans().length}개</span>` : ""}</div>
        ${upcomingPlans().length ? `<div class="card list" style="padding:0">${upcomingPlans().map((q) => `<button class="link-row" type="button" data-pack="${esc(q.id)}" style="min-height:72px">
          ${icoImg(q.kind === "picnic" || q.kind === "daycamp" ? kindOf(q.kind).ico : "calendar")}<b>${esc(q.place || (q.kind === "picnic" ? "피크닉" : "캠핑장 미정"))}<br><span class="muted" style="font-size:13px;font-weight:400">${fmtDate(q.date)}${q.kind === "picnic" || q.kind === "daycamp" ? ` · ${kindOf(q.kind).w}` : ""}${q.dog ? " · 강아지 동반" : ""} · 짐 ${(() => { const d = packData(q); return `${d.done}/${d.total}`; })()}</span></b>
          <small style="color:var(--brand-ink);font-weight:600">${daysTo(q.date) > 0 ? `D-${daysTo(q.date)}` : daysTo(q.date) === 0 ? "오늘" : "다녀왔어요?"}</small>
        </button>`).join("")}</div>` : `<button class="card link-row" type="button" data-plan style="border-top:0;min-height:72px">${icoImg("calendar")}<b>아직 정하지 않았어요</b><small style="color:var(--brand-ink);font-weight:600">정하기</small></button>`}
        ${upcomingPlans().length ? `<button class="btn btn-soft btn-block" type="button" data-plan style="margin-top:8px">+ 캠핑·피크닉 계획 추가</button>` : ""}
      </section>
      <section class="card stat3" aria-label="우리 기록">
        <div><span>캠퍼 단계</span><strong>Lv.${g.lv + 1}</strong></div>
        <div><span>갖춘 장비</span><strong class="num">${owned} / ${total}</strong></div>
        <div><span>쓴 돈</span><strong class="num">${won(s.spent) || "0원"}</strong></div>
      </section>
      <section class="sec">
        <div class="sec-head"><h2>다녀온 캠핑·피크닉</h2><span class="more">${(() => { const T = state.trips || [], n = (k) => T.filter((t) => (t.kind || "camp") === k).length; return [`캠핑 ${n("camp") + 1}번`, n("daycamp") ? `당일 ${n("daycamp")}번` : "", n("picnic") ? `피크닉 ${n("picnic")}번` : ""].filter(Boolean).join(" · "); })()}</span></div>
        <div class="list">
          ${(state.trips || []).slice().reverse().map((t) => `<button class="link-row" type="button" data-review="${esc(t.id)}"><span class="ico sm"><img src="v2/icons/${kindOf(t.kind).ico}.png" alt=""></span><b>${esc(t.place || kindOf(t.kind).w)}<br><span class="muted" style="font-size:13px;font-weight:400">${esc(t.date)}${t.kind === "daycamp" || t.kind === "picnic" ? ` · ${kindOf(t.kind).w}` : ""}${t.dog ? " · 강아지 동반" : ""}</span></b><small>${String(t.notes || "").trim() ? "후기 있음" : `후기 쓰기 +${XP_REVIEW}`}</small></button>`).join("")}
          <div class="link-row"><span class="ico sm"><img src="v2/icons/tent.png" alt=""></span><b>${esc(TRIP.place || "첫 캠핑")}<br><span class="muted" style="font-size:13px;font-weight:400">${esc(TRIP.date || "")}</span></b><small>첫 캠핑</small></div>
        </div>
        <button class="btn btn-primary btn-block" type="button" data-trip>다녀왔어요 기록하기 · 캠핑 +${XP_TRIP} · 당일 +${XP_DAY} · 피크닉 +${XP_PICNIC}</button>
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
          ${shared.backend === "cloud" ? `<div class="sync-acct"><span>${shared.user ? `${esc(shared.user.email || "")}로 로그인됨 · ${shared.mode === "live" ? "실시간 공유 중" : "보기 전용"}` : "이메일로 로그인하면 집·회사·폰 어디서든 같은 기록을 써요"}</span>${shared.user ? '<button class="btn btn-sm" type="button" data-signout>로그아웃</button>' : '<button class="btn btn-sm btn-primary" type="button" data-signin>이메일로 로그인</button>'}</div>` : ""}
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
    const si = $("[data-signin]"); if (si) si.onclick = signIn;
    const so = $("[data-signout]"); if (so) so.onclick = () => shared.sb && shared.sb.auth.signOut().then(() => toast("로그아웃했어요"));
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
  function openPlan(draft, planId) {
    const p = planById(planId || (draft && draft.planId)) || null;
    const dv = (k, fb) => (draft && draft[k] !== undefined ? draft[k] : fb);
    openSheet(() => `<div class="sheet-head"><div><h2 id="sheetTitle">${p ? "캠핑 계획 고치기" : "캠핑 계획 추가"}</h2></div>${xBtn()}</div>
      <label class="field"><span>언제 가요?</span><input id="pDate" type="date" value="${esc(dv("date", p ? p.date : ""))}" min="${new Date().toISOString().slice(0, 10)}"></label>
      <label class="field"><span>어디로 가요?</span><input id="pPlace" placeholder="예: 가평 자라섬" value="${esc(dv("place", p ? p.place : ""))}"></label>
      <button class="btn btn-soft btn-block" type="button" id="pFind">${icoImg("camping")}<span class="pfind-label">${dv("kind", p ? p.kind || "camp" : "camp") === "picnic" ? "피크닉 장소 고르기" : "조건에 맞는 캠핑장 찾기"}</span></button>
      <div class="pills pills-wrap">${kindChips("data-pkind", dv("kind", p ? p.kind || "camp" : "camp"))}</div>
      <p class="faint" style="font-size:12.5px;margin-top:-4px">텐트만 치고 밤엔 집에서 자면 '당일 캠핑'이에요. 잠자리 짐이 빠져요. 가서 바뀌면 나중에 고쳐도 돼요.</p>
      <div class="pills"><button class="chip" type="button" id="pDog" aria-pressed="${dv("dog", p ? !!p.dog : true)}">강아지 동반</button><button class="chip" type="button" id="pElec" aria-pressed="${dv("elec", p ? !!p.elec : true)}">전기 있음</button></div>
      <div class="sheet-foot">${p ? '<button class="btn" type="button" id="pDel">삭제</button>' : '<button class="btn" type="button" data-close>취소</button>'}<button class="btn btn-primary" style="flex:1" type="button" id="pSave">저장</button></div>`, {
      after: () => {
        const curKind = () => (($("#sheet [data-pkind][aria-pressed=true]") || {}).dataset || {}).pkind || "camp";
        $$("#sheet [data-pkind]").forEach((b) => (b.onclick = () => { $$("#sheet [data-pkind]").forEach((x) => x.setAttribute("aria-pressed", x === b)); $("#pFind .pfind-label").textContent = b.dataset.pkind === "picnic" ? "피크닉 장소 고르기" : "조건에 맞는 캠핑장 찾기"; }));
        $("#pFind").onclick = () => (curKind() === "picnic" ? openPicnicFinder : openCampFinder)({ planId: p ? p.id : null, date: $("#pDate").value, place: $("#pPlace").value, kind: curKind(), dog: $("#pDog").getAttribute("aria-pressed") === "true", elec: $("#pElec").getAttribute("aria-pressed") === "true" });
        ["pDog", "pElec"].forEach((k) => ($("#" + k).onclick = (e) => e.currentTarget.setAttribute("aria-pressed", e.currentTarget.getAttribute("aria-pressed") !== "true")));
        $("#pSave").onclick = () => {
          const date = $("#pDate").value;
          if (!date) { toast("날짜를 골라 주세요"); $("#pDate").focus(); return; }
          const place = $("#pPlace").value.trim();
          const camp = draft && draft.camp && draft.place === place ? draft.camp : (p && p.place === place ? p.camp : null);
          const d = { date, place, camp: camp || null, kind: curKind(), dog: $("#pDog").getAttribute("aria-pressed") === "true", elec: $("#pElec").getAttribute("aria-pressed") === "true" };
          state.plans = state.plans || [];
          let id = p && p.id;
          if (p) Object.assign(p, d); else { id = "p" + Date.now(); state.plans.push(Object.assign({ id, gear: [], packed: [], season: "", nights: 1 }, d)); }
          save(); rerender(); openPack(id); toast(daysTo(date) === 0 ? "오늘 출발이에요. 즐거운 캠핑 해요!" : `D-${daysTo(date)}, 짐을 챙겨 볼까요?`);
        };
        const del = $("#pDel"); if (del) del.onclick = () => { state.plans = state.plans.filter((x) => x !== p); save(); closeSheet(); rerender(); toast("캠핑 일정을 지웠어요"); };
      },
    });
  }

  /* ---------- 캠핑장 찾기 ----------
   * 우리 추천(data.js SOSHA_CAMPSITES, 직접 조사)과 고캠핑 공공데이터(campsites.json, 매주 자동 갱신)를 함께 보여줘요.
   * 거리는 집(안양 범계역) 기준 직선거리로 운전 시간을 어림해요. */
  let CAMPS = null, campsLoad = null;
  const loadCamps = () => campsLoad || (campsLoad = fetch("campsites.json", { cache: "no-cache" }).then((r) => (r.ok ? r.json() : null)).catch(() => null).then((d) => (CAMPS = d)));
  const driveMin = (km) => Math.round((km * 1.3) / 70 * 60 + 10);
  const campF = { fire: true, elec: true, pet: true, winter: true, near: true, floor: "", more: false };
  const CAMP_FILTERS = [["fire", "🔥 장작 가능"], ["elec", "⚡ 전기"], ["pet", "🐶 반려견"], ["winter", "❄️ 겨울 운영"], ["near", "🚗 2시간 이내"]];
  function campList() {
    const cur = (window.SOSHA_CAMPSITES || []).map((c) => Object.assign({ ours: true }, c));
    const pub = ((CAMPS && CAMPS.items) || []).map((c) => Object.assign({}, c, { min: c.km == null ? null : driveMin(c.km) }));
    const ok = (c) => (!campF.fire || (c.ours ? c.fire === true || c.fire === null : c.fire === "개별" || c.fire === "공용"))
      && (!campF.elec || (c.ours ? c.elec !== false : c.elec))
      && (!campF.pet || (c.ours ? c.pet !== false : /^가능/.test(c.pet)))
      && (!campF.winter || (c.ours ? c.winter !== false : /겨울/.test(c.season)))
      && (!campF.near || (c.min == null ? /서울|경기|인천/.test(c.area || "") : c.min <= 120))
      && (!campF.floor || (c.ours ? (c.floor || []).includes(campF.floor) : !!(c.floor || {})[campF.floor]));
    const seen = new Set(cur.map((c) => c.name.replace(/\s/g, "")));
    return { ours: cur.filter(ok).sort((x, y) => (x.fire === false) - (y.fire === false) || !!y.fav - !!x.fav || x.min - y.min), pub: pub.filter((c) => !seen.has(c.name.replace(/\s/g, ""))).filter(ok).sort((x, y) => (x.km == null) - (y.km == null) || (x.km || 0) - (y.km || 0)) };
  }
  function campCard(c) {
    const floor = c.ours ? (c.floor || []).join("·") : Object.keys(c.floor || {}).join("·");
    const tags = [
      c.ours ? (c.fire === false ? "🚫 불멍 안 됨" : c.fire === null ? "🔥 장작 전화 확인" : `🔥 ${c.wood ? "장작 판매" : "장작 가능"}`) : c.fire && c.fire !== "불가" ? `🔥 화로 ${c.fire}${c.wood ? " · 장작 판매" : ""}` : "",
      (c.ours ? c.elec : c.elec) ? `⚡ ${c.ours && c.elecW ? c.elecW : "전기"}` : c.ours && c.elec === null ? "⚡ 전기 확인" : "",
      c.ours ? (c.pet === false ? "🐾 반려견 불가" : c.petNote ? `🐶 ${c.petNote}` : c.pet === null ? "🐾 반려견 확인" : "") : c.pet ? `🐶 ${c.pet}` : "",
      c.ours && c.winter === false ? "❄️ 겨울 휴장" : "",
      floor ? `바닥 ${floor}` : "",
      c.ours && c.tarp ? `타프 ${c.tarp}` : "",
    ].filter(Boolean);
    const where = [c.area, c.min ? `차로 약 ${c.min >= 60 ? `${Math.floor(c.min / 60)}시간 ${c.min % 60 ? `${c.min % 60}분` : ""}` : `${c.min}분`}` : ""].filter(Boolean).join(" · ");
    return `<div class="camp-card${c.ours && c.fire === false ? " nofire" : ""}">
      <div class="camp-top"><b>${esc(c.name)}</b>${c.fav ? '<span class="tag tag-pick">⭐ 좋았던 곳</span>' : c.ours ? '<span class="tag tag-pick">우리 추천</span>' : ""}${c.price ? `<span class="camp-price">${esc(c.price)}</span>` : ""}</div>
      <small class="muted">${esc(where)}</small>
      <div class="camp-tags">${tags.map((t) => `<span>${esc(t)}</span>`).join("")}</div>
      ${c.note ? `<p class="camp-note">${esc(c.note)}</p>` : ""}
      <div class="camp-acts">${c.url ? `<a class="btn btn-sm" href="${esc(c.url)}" target="_blank" rel="noopener">예약·정보</a>` : ""}<button class="btn btn-sm btn-primary" type="button" data-pickcamp="${esc(c.ours ? "o:" + c.id : "g:" + c.id)}">여기로 정하기</button></div>
    </div>`;
  }
  function openCampFinder(draft) {
    loadCamps().then(() => sheetState.refresh && sheetState.refresh());
    openSheet(() => {
      const L = campList();
      const pubShown = campF.more ? L.pub.slice(0, 120) : L.pub.slice(0, 20);
      const hasPub = !!(CAMPS && CAMPS.items && CAMPS.items.length);
      return `<div class="sheet-head"><div><h2 id="sheetTitle">캠핑장 찾기</h2><span class="muted" style="font-size:13px">집(범계역)에서 가까운 순이에요</span></div>${xBtn()}</div>
      <div class="pills pills-wrap" role="group" aria-label="조건">${CAMP_FILTERS.map(([k, n]) => `<button class="chip" type="button" data-cf="${k}" aria-pressed="${campF[k]}">${n}</button>`).join("")}</div>
      <div class="pills pills-wrap" role="group" aria-label="바닥">${["데크", "파쇄석", "잔디"].map((f) => `<button class="chip" type="button" data-cfloor="${f}" aria-pressed="${campF.floor === f}">${f}</button>`).join("")}</div>
      ${L.ours.length ? `<h3 class="camp-h">우리 추천 <span class="faint">${L.ours.length}곳 · 가격·타프는 직접 조사</span></h3>${L.ours.map(campCard).join("")}` : ""}
      <h3 class="camp-h">전국 캠핑장 <span class="faint">${hasPub ? `${L.pub.length}곳 · 고캠핑 공공데이터 ${esc(CAMPS.updated || "")}` : CAMPS === null && campsLoad ? "불러오는 중…" : "아직 연결 전"}</span></h3>
      ${hasPub ? (pubShown.length ? pubShown.map(campCard).join("") : '<p class="muted" style="font-size:14px">조건에 맞는 곳이 없어요. 조건을 하나 꺼 보세요.</p>') : '<p class="muted" style="font-size:14px">공공데이터 연결 키를 넣으면 전국 캠핑장이 여기 떠요.</p>'}
      ${hasPub && L.pub.length > pubShown.length ? `<button class="btn btn-block" type="button" data-cmore>${L.pub.length - pubShown.length}곳 더 보기</button>` : ""}
      <p class="faint" style="font-size:12.5px">운전 시간은 직선거리로 어림한 값이에요. 공공데이터에는 가격과 전기 용량이 없어서 예약 페이지에서 확인해요.</p>
      <div class="sheet-foot"><button class="btn btn-block" type="button" data-cback>일정으로 돌아가기</button></div>`;
    }, {
      after: () => {
        $$("#sheet [data-cf]").forEach((b) => (b.onclick = () => { campF[b.dataset.cf] = !campF[b.dataset.cf]; campF.more = false; sheetState.refresh(); }));
        $$("#sheet [data-cfloor]").forEach((b) => (b.onclick = () => { campF.floor = campF.floor === b.dataset.cfloor ? "" : b.dataset.cfloor; sheetState.refresh(); }));
        const m = $("#sheet [data-cmore]"); if (m) m.onclick = () => { campF.more = true; sheetState.refresh(); };
        $("#sheet [data-cback]").onclick = () => openPlan(draft);
        $$("#sheet [data-pickcamp]").forEach((b) => (b.onclick = () => {
          const [src, id] = [b.dataset.pickcamp.slice(0, 1), b.dataset.pickcamp.slice(2)];
          const c = src === "o" ? (window.SOSHA_CAMPSITES || []).find((x) => x.id === id) : ((CAMPS && CAMPS.items) || []).find((x) => x.id === id);
          if (!c) return;
          openPlan(Object.assign({}, draft, { place: c.name, camp: { src, id, name: c.name, url: c.url || "" } }));
        }));
      },
    });
  }

  /* ---------- 짐 챙기기 ----------
   * 가진 장비(산 것·원래 있던 것)를 기준으로, 일정 성격(캠핑/피크닉, 계절, 장작, 전기, 강아지, 데크)에 맞는 짐을 골라요.
   * 아직 없는 건 '있으면 좋은 것'으로 따로 보여줘요. 체크 상태는 일정(plan.packed)에 저장돼 둘이 같이 봐요. */
  const R = window.SOSHA_RULES || {};
  const CAMP_RULES = {
    base: (R.base || []).concat(["thorbox", "thortop", "lanternpole", "lanternhook", "kitchentool", "dishbag", "toiletry", "tissue", "clothes"]),
    fire: R.fire || [], winter: (R.winter || []).concat(["foammat", "thermo", "hotwater", "flask", "condtowel"]), winterElec: R.winterElec || [], elec: R.elec || [],
    summer: R.summer || [], mild: R.mild || [], nights2: R.nights2 || [], dog: (R.dog || []).concat(["dogharness"]), dogWinter: (R.dogWinter || []).concat(["dogpad", "pawwax"]),
    deck: (R.deck || []).concat(["deckpeg"]),
  };
  const PICNIC_RULES = {
    base: ["picnicmat", "table1", "chairs", "cups", "cutlery", "trash", "tissue", "coffee", "flask", "storage", "toiletry"],
    cook: ["isoburner", "gas", "windscreen", "cookset", "tongs", "scissors", "kitchentool", "spice", "dishes", "board"],
    winter: ["rug", "hotpack", "clothes", "hotwater"], summer: ["cooler", "jug"], mild: ["cooler"],
    dog: ["dogleash", "dogharness", "dogbowl", "dogpoop"], dogWinter: ["dogwear", "pawwax"],
  };
  const SEASON_NAME = { winter: "겨울", summer: "여름", mild: "봄·가을" };
  function planSite(p) {
    if (!p || !p.camp) return null;
    if (p.camp.src === "o") return Object.assign({ ours: true }, (window.SOSHA_CAMPSITES || []).find((c) => c.id === p.camp.id) || {});
    return ((CAMPS && CAMPS.items) || []).find((c) => c.id === p.camp.id) || null;
  }
  function packConds(p) {
    const m = new Date(p.date + "T00:00:00").getMonth() + 1;
    const season = m >= 11 || m <= 3 ? "winter" : m >= 6 && m <= 8 ? "summer" : "mild";
    const site = planSite(p);
    const picnic = p.kind === "picnic";
    const fire = !picnic && (site ? (site.ours ? site.fire !== false : !site.fire || site.fire === "개별" || site.fire === "공용") : true);
    const deck = !!site && (site.ours ? (site.floor || []).includes("데크") : !!(site.floor || {})["데크"]);
    const day = p.kind === "daycamp";
    const lsOwned = (() => { const i = get("livingshell"); return !!(i && have(i)); })();
    const tent = p.tent && (p.tent !== "livingshell" || lsOwned) ? p.tent : lsOwned && season === "winter" && !day ? "livingshell" : "tent";
    return { picnic, day, tent, lsOwned, season, fire, deck, elec: !picnic && !!p.elec, dog: !!p.dog, nights2: !day && (p.nights || 1) >= 2, cook: picnic && !!p.cook, site };
  }
  function packIds(c) {
    const S = Object.assign({}, c.picnic ? PICNIC_RULES : CAMP_RULES, { tentpick: c.picnic ? [] : [c.tent] });
    const keys = ["base", c.season, "tentpick"];
    if (c.picnic) { if (c.cook) keys.push("cook"); }
    else { if (c.fire) keys.push("fire"); if (c.elec) keys.push("elec"); if (c.elec && c.season === "winter") keys.push("winterElec"); if (c.nights2) keys.push("nights2"); if (c.deck) keys.push("deck"); }
    if (c.dog) { keys.push("dog"); if (c.season === "winter") keys.push("dogWinter"); }
    const TENTS = ["tent", "livingshell"];
    const SLEEP = ["bedding", "pillow", "cot", "eblanket", "hotwater", "condtowel", "toiletry"]; // 당일 캠핑은 잠자리 짐을 빼요
    const out = [];
    keys.forEach((k) => (S[k] || []).forEach((id) => { if (!out.includes(id) && !(c.day && SLEEP.includes(id)) && !(TENTS.includes(id) && id !== c.tent)) out.push(id); }));
    return out;
  }
  /* 항상 챙기는 장비: state.packAlways. 아직 정한 적 없으면 멀티바스켓·육각스툴을 기본으로 넣어요 */
  function alwaysIds() {
    if (Array.isArray(state.packAlways)) return state.packAlways;
    const txt = (i) => `${i.name || ""} ${i.spec || ""} ${(i.purchase && (i.purchase.where || "") + " " + (i.purchase.model || "")) || ""}`;
    return items().filter((i) => have(i) && /멀티바스켓|육각스툴/.test(txt(i))).map((i) => i.id);
  }
  function packData(p) {
    const c = packConds(p);
    const rule = packIds(c);
    const rem = new Set(p.remove || []);
    const always = alwaysIds();
    const ids = [...new Set(rule.concat(always, p.add || []))].filter((id) => !rem.has(id));
    const all = items();
    const byId = (id) => all.find((i) => i.id === id);
    const take = ids.map(byId).filter(Boolean).filter((i) => have(i) || (p.add || []).includes(i.id));
    const need = rule.filter((id) => !rem.has(id) && !(p.add || []).includes(id)).map(byId).filter((i) => i && !have(i)).sort((x, y) => x.pri - y.pri);
    const extra = all.filter((i) => have(i) && !take.includes(i) && (i.custom || !i.dog || c.dog) && !(c.picnic && ["tent", "peg", "bedding", "pillow", "cot", "shelter"].includes(i.id)));
    const packed = new Set(p.packed || []);
    const total = take.length;
    const done = take.filter((i) => packed.has(i.id)).length;
    return { c, take, need, extra, packed, total, done, always: new Set(always) };
  }
  let packOpenExtra = false;
  function openPack(planId) {
    const p = planById(planId) || nextPlan();
    if (!p) { openPlan(); return; }
    const pid = p.id;
    if (p.camp && p.camp.src === "g" && !CAMPS) loadCamps().then(() => sheetState.refresh && sheetState.refresh());
    const catName = (id) => (CATS.find((x) => x.id === id) || {}).name || "기타";
    const row = (i, d) => `<div class="pack-row"><label class="pack-check"><input type="checkbox" data-packid="${esc(i.id)}"${d.packed.has(i.id) ? " checked" : ""}><span class="ico sm"><img src="${iconSrc(i)}" alt=""></span><b>${esc(i.name)}${have(i) ? "" : ' <em class="pack-none">아직 없음</em>'}</b></label><button class="pack-pin" type="button" data-ppin="${esc(i.id)}" aria-pressed="${d.always.has(i.id)}" title="매번 챙기기">${d.always.has(i.id) ? "📌 항상" : "📌"}</button><button class="pack-btn rem" type="button" data-prem="${esc(i.id)}" aria-label="${esc(i.name)} 빼기">빼기</button></div>`;
    const addRow = (i) => `<div class="pack-row"><span class="ico sm"><img src="${iconSrc(i)}" alt=""></span><button class="pack-name" type="button" data-open="${esc(i.id)}">${esc(i.name)}${have(i) ? "" : ` <span class="tag ${PRI[i.pri][1]}">${PRI[i.pri][0]}</span>`}</button><button class="pack-btn add" type="button" data-padd="${esc(i.id)}" aria-label="${esc(i.name)} 챙길 것에 추가">+ 추가</button></div>`;
    const byCat = (list, fn) => CATS.map((ct) => ({ ct, rows: list.filter((i) => i.cat === ct.id) })).concat([{ ct: { name: "기타" }, rows: list.filter((i) => !CATS.some((ct) => ct.id === i.cat)) }])
      .filter((g) => g.rows.length).map((g) => `<div class="pack-cat">${esc(g.ct.name)}</div>${g.rows.map(fn).join("")}`).join("");
    openSheet(() => {
      const q = planById(pid) || p;
      const d = packData(q);
      const c = d.c;
      const chips = [c.picnic ? "🧺 피크닉 (당일)" : c.day ? "⛺ 당일 캠핑 (밤엔 집)" : `⛺ 캠핑 ${q.nights >= 2 ? `${q.nights}박` : "1박"}`, `${c.season === "winter" ? "❄️" : c.season === "summer" ? "☀️" : "🍂"} ${SEASON_NAME[c.season]}`,
        c.fire ? "🔥 장작" : "", c.elec ? "⚡ 전기" : "", c.dog ? "🐶 강아지 동반" : "", c.deck ? "데크" : ""].filter(Boolean);
      const pct = d.total ? Math.round((d.done / d.total) * 100) : 0;
      return `<div class="sheet-head"><span class="ico"><img src="v2/icons/backpack.png" alt=""></span><div><h2 id="sheetTitle">짐 챙기기</h2><span class="muted" style="font-size:14px">${esc(q.place || (c.picnic ? "피크닉" : "캠핑"))} · ${fmtDate(q.date)} · ${daysTo(q.date) > 0 ? `D-${daysTo(q.date)}` : "오늘"}</span></div>${xBtn()}</div>
      <div class="camp-tags pack-conds">${chips.map((t) => `<span>${esc(t)}</span>`).join("")}<button class="linkbtn" type="button" data-editplan>일정 고치기</button></div>
      ${!c.picnic && c.lsOwned ? `<div class="pills"><span class="faint" style="font-size:13px;align-self:center">텐트</span><button class="chip" type="button" data-tent="tent" aria-pressed="${c.tent === "tent"}">원터치</button><button class="chip" type="button" data-tent="livingshell" aria-pressed="${c.tent === "livingshell"}">알베르게</button></div>` : ""}
      ${!c.picnic && c.tent === "livingshell" && c.deck ? `<p class="pack-warn">⚠️ 알베르게는 길이 6.5m예요. 이 캠핑장 데크에 들어가는지 미리 확인해요.</p>` : ""}
      ${c.picnic ? `<div class="pills"><button class="chip" type="button" data-cook aria-pressed="${!!q.cook}">🍳 요리해 먹기</button></div>` : ""}
      <div class="pack-prog"><span>챙긴 짐 <b class="num">${d.done} / ${d.total}</b></span><i><b style="width:${pct}%"></b></i></div>
      <h3 class="camp-h">가진 장비 중 챙길 것 <span class="faint">${d.take.length}개</span></h3>
      ${d.take.length ? byCat(d.take, (i) => row(i, d)) : '<p class="muted" style="font-size:14px">이번 일정에 맞는 가진 장비가 아직 없어요.</p>'}
      ${d.need.length ? `<h3 class="camp-h">있으면 좋은 것 <span class="faint">아직 없어요 · ${d.need.length}개</span></h3>
        ${d.need.map(addRow).join("")}
        <p class="faint" style="font-size:12.5px">이름을 누르면 추천 제품을 봐요. 빌려 가거나 이미 있으면 '+ 추가'로 챙길 것에 넣어요.</p>` : ""}
      ${d.extra.length ? `<details class="pack-extra"${packOpenExtra ? " open" : ""}><summary>그 외 가진 장비 ${d.extra.length}개 · 필요하면 추가</summary>${byCat(d.extra, addRow)}</details>` : ""}
      <div class="sheet-foot"><button class="btn btn-block" type="button" data-close>닫기</button></div>`;
    }, {
      after: () => {
        $$("#sheet [data-packid]").forEach((b) => (b.onchange = () => {
          const q = planById(pid); if (!q) return;
          const s = new Set(q.packed || []);
          if (b.checked) s.add(b.dataset.packid); else s.delete(b.dataset.packid);
          q.packed = [...s]; save(); sheetState.refresh();
        }));
        const edit = (fn) => { const q = planById(pid); if (!q) return; fn(q); save(); const ex = $("#sheet .pack-extra"); packOpenExtra = !!(ex && ex.open); sheetState.refresh(); };
        $$("#sheet [data-padd]").forEach((b) => (b.onclick = () => edit((q) => { const id = b.dataset.padd; q.add = [...new Set((q.add || []).concat(id))]; q.remove = (q.remove || []).filter((x) => x !== id); toast("챙길 것에 넣었어요"); })));
        $$("#sheet [data-prem]").forEach((b) => (b.onclick = () => edit((q) => { const id = b.dataset.prem; q.remove = [...new Set((q.remove || []).concat(id))]; q.add = (q.add || []).filter((x) => x !== id); q.packed = (q.packed || []).filter((x) => x !== id);
          toast("이번 짐에서 뺐어요", [{ label: "되돌리기", run: () => { const r = planById(pid); r.remove = (r.remove || []).filter((x) => x !== id); save(); sheetState.refresh(); } }]); })));
        $$("#sheet [data-ppin]").forEach((b) => (b.onclick = () => edit(() => { const id = b.dataset.ppin; const cur = new Set(alwaysIds()); if (cur.has(id)) cur.delete(id); else cur.add(id); state.packAlways = [...cur]; toast(cur.has(id) ? "캠핑·피크닉 때마다 챙길게요" : "매번 챙기기에서 뺐어요"); })));
        $$("#sheet [data-tent]").forEach((b) => (b.onclick = () => { const q = planById(pid); q.tent = b.dataset.tent; save(); sheetState.refresh(); }));
        const ck = $("#sheet [data-cook]"); if (ck) ck.onclick = () => { const q = planById(pid); q.cook = !q.cook; save(); sheetState.refresh(); };
        $("#sheet [data-editplan]").onclick = () => openPlan(null, pid);
      },
    });
  }

  /* ---------- 피크닉 장소 고르기 ---------- */
  function openPicnicFinder(draft) {
    const P = window.SOSHA_PICNICS || [];
    openSheet(() => `<div class="sheet-head"><div><h2 id="sheetTitle">피크닉 장소</h2><span class="muted" style="font-size:13px">집(범계역)에서 가까운 순이에요</span></div>${xBtn()}</div>
      ${P.slice().sort((x, y) => x.min - y.min).map((c) => `<div class="camp-card">
        <div class="camp-top"><b>${esc(c.name)}</b></div>
        <small class="muted">${esc(c.area)} · 차로 약 ${c.min}분</small>
        <div class="camp-tags">${[c.dog ? "🐶 반려견 가능" : "🐾 반려견 불가", c.shade ? "⛺ 그늘막·텐트 가능" : "", c.cook ? "🍳 버너 가능" : "🚫 취사 불가", c.park ? `🅿️ ${c.park}` : ""].filter(Boolean).map((t) => `<span>${esc(t)}</span>`).join("")}</div>
        <p class="camp-note">${esc(c.note)}</p>
        <div class="camp-acts">${c.url ? `<a class="btn btn-sm" href="${esc(c.url)}" target="_blank" rel="noopener">정보</a>` : ""}<button class="btn btn-sm btn-primary" type="button" data-pickpic="${esc(c.id)}">여기로 정하기</button></div>
      </div>`).join("")}
      <p class="faint" style="font-size:12.5px">공원 규정(그늘막 시간, 반려견, 취사)은 바뀔 수 있어서 가기 전에 확인해요.</p>
      <div class="sheet-foot"><button class="btn btn-block" type="button" data-cback>일정으로 돌아가기</button></div>`, {
      after: () => {
        $("#sheet [data-cback]").onclick = () => openPlan(draft);
        $$("#sheet [data-pickpic]").forEach((b) => (b.onclick = () => {
          const c = P.find((x) => x.id === b.dataset.pickpic); if (!c) return;
          openPlan(Object.assign({}, draft, { place: c.name, camp: null, dog: draft.dog !== undefined ? draft.dog && c.dog : c.dog }));
        }));
      },
    });
  }

  /* ---------- 다녀온 캠핑 기록 ---------- */
  function openTrip(tripId, startKind) {
    const existing = tripId ? (state.trips || []).find((t) => t.id === tripId) : null;
    let kind = existing ? existing.kind || "camp" : startKind || ((nextPlan() || {}).kind) || "camp";
    const plan = existing ? null : (upcomingPlans().find((q) => (q.kind || "camp") === kind) || (kind === "picnic" ? null : nextPlan()));
    const t = existing || { date: plan ? plan.date : new Date().toISOString().slice(0, 10), place: plan ? plan.place : "", dog: plan ? !!plan.dog : kind !== "picnic", temp: "", notes: "" };
    const word = () => kindOf(kind).w;
    openSheet(() => `<div class="sheet-head"><span class="ico"><img src="v2/icons/${kindOf(kind).ico}.png" alt=""></span><div><h2 id="sheetTitle">${existing ? `${word()} 후기` : `${word()} 다녀왔어요`}</h2><span class="muted" style="font-size:14px">${existing ? `후기를 남기면 +${XP_REVIEW} XP` : `기록하면 +${xpOfKind(kind)} XP, 후기까지 쓰면 +${XP_REVIEW} XP 더`}</span></div>${xBtn()}</div>
      <div class="grid2">
        <label class="field"><span>언제</span><input id="tDate" type="date" value="${esc(t.date)}"></label>
        <div class="field"><span>${kind === "camp" ? "밤 최저기온" : "기온"} (℃)</span><div class="temp-in"><div class="temp-sign" role="group" aria-label="영상 영하"><button type="button" data-sign="+" class="plus" aria-pressed="${!String(t.temp || "").startsWith("-")}">영상</button><button type="button" data-sign="-" class="minus" aria-pressed="${String(t.temp || "").startsWith("-")}">영하</button></div><input id="tTemp" inputmode="numeric" pattern="[0-9]*" placeholder="예: 2" aria-label="기온 숫자" value="${esc(String(t.temp || "").replace("-", ""))}"></div></div>
      </div>
      <label class="field"><span>어디로</span><input id="tPlace" placeholder="${kind === "picnic" ? "예: 평촌중앙공원, 한강 반포" : "예: 가평 자라섬"}" value="${esc(t.place)}"></label>
      <div class="pills pills-wrap">${kindChips("data-kind", kind)}<span class="pills-gap" aria-hidden="true"></span><button class="chip" type="button" id="tDog" aria-pressed="${!!t.dog}">강아지 동반</button></div>
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
        $$("#sheet [data-sign]").forEach((b) => (b.onclick = () => $$("#sheet [data-sign]").forEach((x) => x.setAttribute("aria-pressed", x === b))));
        const tempVal = () => { const n = $("#tTemp").value.replace(/[^0-9]/g, ""); return n === "" ? "" : ($("#sheet [data-sign=\"-\"]").getAttribute("aria-pressed") === "true" && n !== "0" ? "-" : "") + n; };
        $$("#sheet [data-kind]").forEach((b) => (b.onclick = () => {
          // 입력해 둔 값은 그대로 두고 종류만 바꿔요
          Object.assign(t, { date: $("#tDate").value, place: $("#tPlace").value, temp: tempVal(), notes: $("#tNotes").value, dog: $("#tDog").getAttribute("aria-pressed") === "true" });
          kind = b.dataset.kind; sheetState.refresh();
        }));
        $("#tSave").onclick = () => {
          const before = game();
          const d = { date: $("#tDate").value || new Date().toISOString().slice(0, 10), place: $("#tPlace").value.trim(), dog: $("#tDog").getAttribute("aria-pressed") === "true", temp: tempVal(), notes: $("#tNotes").value.trim(), kind };
          d.dateLabel = d.date;
          state.trips = state.trips || [];
          if (existing) Object.assign(existing, d);
          else {
            state.trips.push(Object.assign({ id: "t" + Date.now(), cost: "", weather: "", needs: [], photos: [], gear: items().filter(have).map((i) => i.id) }, d));
            if (plan && daysTo(plan.date) <= 0) state.plans = (state.plans || []).filter((x) => x !== plan);
          }
          save(); closeSheet(); rerender();
          const after = game();
          if (after.lv > before.lv) showLevelUp(after);
          else toast(existing ? `후기를 남겼어요 · +${d.notes ? XP_REVIEW : 0} XP` : `${word()} 기록 완료 · +${xpOfKind(kind) + (d.notes ? XP_REVIEW : 0)} XP`);
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
        <button class="lvup-x" type="button" id="lvupX" aria-label="닫기"><svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
        <div class="lvup-scene" aria-hidden="true">${sceneImg(g.lv)}</div>
        <div class="lvup-text">
          <span class="lvup-eyebrow">레벨 업!</span>
          <h2 id="lvupTitle">Lv.${g.lv + 1} ${esc(g.cur.name)}${iga(g.cur.name)} 됐어요</h2>
          ${LEVEL_FX[g.lv] ? `<p>${esc(LEVEL_FX[g.lv])}</p>` : ""}
          ${g.next ? `<small>다음 단계 ${esc(g.next.name)}까지 ${g.next.xp - g.xp} XP · 캠핑을 다녀오면 +${XP_TRIP} XP</small>` : "<small>최고 단계에 올랐어요. 이제 캠핑 고수예요!</small>"}
          <div class="lvup-acts"><button class="btn" type="button" id="lvupClose">닫기</button><button class="btn btn-primary" type="button" id="lvupOk">우리 캠프 보러 가기</button></div>
        </div>
      </div>`;
    el.hidden = false;
    document.body.style.overflow = "hidden";
    const hide = () => { el.hidden = true; document.body.style.overflow = ""; document.removeEventListener("keydown", onKey); if (prevFocus && document.contains(prevFocus)) prevFocus.focus({ preventScroll: true }); };
    const close = () => { hide(); if (route !== "home") location.hash = "#home"; else window.scrollTo({ top: 0, behavior: "smooth" }); };
    const onKey = (e) => { if (e.key === "Escape") { e.preventDefault(); hide(); } };
    document.addEventListener("keydown", onKey);
    $("#lvupOk").onclick = close;
    $("#lvupClose").onclick = hide; $("#lvupX").onclick = hide;
    el.onclick = (e) => { if (e.target === el) hide(); };
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
    $$("[data-plan]", root).forEach((b) => (b.onclick = () => openPlan()));
    $$("[data-pack]", root).forEach((b) => (b.onclick = () => openPack(b.dataset.pack || undefined)));
    $$("[data-trip]", root).forEach((b) => (b.onclick = () => openTrip()));
    $$("[data-picnic]", root).forEach((b) => (b.onclick = () => openTrip(null, "picnic")));
    $$("[data-review]", root).forEach((b) => (b.onclick = () => openTrip(b.dataset.review)));
    $$("[data-levels]", root).forEach((b) => (b.onclick = openLevels));
    $$("[data-add]", root).forEach((b) => (b.onclick = openAdd));
    $$("[data-guide]", root).forEach((b) => (b.onclick = () => openGuide(b.dataset.guide)));
    $$("[data-search]", root).forEach((b) => (b.onclick = () => { ui.q = ""; location.hash = "#gear"; setTimeout(() => { const q = $("#gearQ"); if (q) q.focus(); }, 30); }));
    $$("[data-quick]", root).forEach((a) => (a.onclick = () => { if (a.dataset.quick === "bought") { ui.status = "bought"; ui.cat = "all"; ui.q = ""; } }));
  }

  window.addEventListener("hashchange", () => { if (sheetState.open) closeSheet(); go(); });
  window.addEventListener("storage", (e) => { if (e.key === KEY) { Object.assign(state, load()); rerender(); } });
  if (applyReceipts()) save();
  go();
  startShared();
})();
