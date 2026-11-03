/* 캠퍼 성장 시스템: 경험치, 레벨, 뱃지, 자라는 캠프 장면 */
(() => {
  "use strict";
  const LEVELS = [
    { xp: 0, name: "텐트 초보" },
    { xp: 120, name: "불멍 입문" },
    { xp: 300, name: "주말 캠퍼" },
    { xp: 520, name: "동계 캠퍼" },
    { xp: 800, name: "베테랑 캠퍼" },
  ];
  const XP_BY_PRI = { 1: 30, 2: 20, 3: 10 };
  const BADGES = [
    { id: "first", name: "첫 구매", test: (h, its) => its.some((i) => i.status === "bought") },
    { id: "warm", name: "따뜻한 밤", need: ["reel", "eblanket"] },
    { id: "bright", name: "밝은 밤", need: ["mainlamp", "headlamp"] },
    { id: "fort", name: "단단한 집", need: ["peg", "groundsheet"] },
    { id: "chef", name: "캠핑 셰프", need: ["scissors", "tongs", "spice", "dishes"] },
    { id: "safe", name: "안전 제일", need: ["co", "extinguisher"] },
    { id: "tidy", name: "정리왕", need: ["storage"] },
    { id: "dog", name: "댕댕 캠퍼", need: ["dogleash", "dogbowl", "dogbed"] },
    { id: "used", name: "중고 고수", test: (h, its) => its.filter((i) => i.purchase && i.purchase.cond === "중고").length >= 3 },
    { id: "review", name: "기록왕", test: (h, its) => its.filter((i) => i.rating).length >= 5 },
  ];
  const have = (it) => it.status === "bought" || it.status === "owned";

  function itemXP(it) {
    if (!have(it)) return 0;
    let x = it.status === "owned" ? 10 : XP_BY_PRI[it.pri] || 10;
    if (it.purchase && it.purchase.price) x += 5;
    if (it.rating) x += 5;
    if (it.memo) x += 5;
    return x;
  }
  function compute(items) {
    const h = new Set(items.filter(have).map((i) => i.id));
    const trips = window.SoshaTrips ? window.SoshaTrips.list() : [];
    const tripCount = trips.length + 1; // 첫 캠핑 포함
    const xp = items.reduce((s, i) => s + itemXP(i), 0) + tripCount * 40;
    let lv = 0;
    LEVELS.forEach((l, i) => { if (xp >= l.xp) lv = i; });
    const cur = LEVELS[lv], next = LEVELS[lv + 1];
    const tripBadges = [
      { id: "trip1", name: "첫 캠핑 완주", on: true },
      { id: "winter", name: "영하의 밤", on: trips.some((t) => t.temp !== "" && t.temp != null && +t.temp <= 0) },
      { id: "dogtrip", name: "댕댕이와 1박", on: trips.some((t) => t.dog) },
      { id: "regular", name: "단골 캠퍼", on: tripCount >= 3 },
    ];
    const badges = BADGES.map((b) => ({ ...b, on: b.test ? b.test(h, items) : b.need.every((id) => h.has(id)) })).concat(tripBadges);
    const quest = items.filter((i) => !have(i) && i.pri === 1).sort((a, b) => a.pri - b.pri)[0];
    return { h, xp, lv, cur, next, badges, quest };
  }

  /* ---------- 장면 ---------- */
  const STARS = [[40, 40], [120, 70], [200, 30], [300, 55], [380, 25], [450, 80], [520, 35], [600, 110], [90, 120], [250, 100], [340, 130], [480, 140], [30, 170], [600, 175], [160, 160], [410, 105], [560, 150], [270, 150], [80, 95], [620, 60]];
  function pine(x, y, s, cls) {
    return `<g><rect class="sc-trunk" x="${x - 3 * s}" y="${y - 10 * s}" width="${6 * s}" height="${12 * s}"/>
      <polygon class="${cls}" points="${x},${y - 80 * s} ${x - 26 * s},${y - 30 * s} ${x + 26 * s},${y - 30 * s}"/>
      <polygon class="${cls}" points="${x},${y - 60 * s} ${x - 32 * s},${y - 8 * s} ${x + 32 * s},${y - 8 * s}"/></g>`;
  }
  function person(x, y, hair, coat, h, lv) {
    const coatCls = h.has("clothes") ? coat : "sc-coat-3";
    const hairShape = hair === 1
      ? `<path class="sc-hair-1" d="M${x - 15},${y - 52} q15,-22 30,0 v26 q-4,6 -8,0 v-20 h-14 v20 q-4,6 -8,0z"/>`
      : `<path class="sc-hair-2" d="M${x - 15},${y - 50} q15,-22 30,0 v12 q-15,-6 -30,0z"/>`;
    const beanie = lv >= 2 ? `<path class="${hair === 1 ? "sc-coat-2" : "sc-coat-1"}" d="M${x - 15},${y - 54} q15,-24 30,0z"/><circle class="sc-star" cx="${x}" cy="${y - 68}" r="4"/>` : "";
    const lamp = h.has("headlamp") ? `<polygon class="sc-beam" points="${x + 12},${y - 52} ${x + 90},${y - 70} ${x + 90},${y - 20}"/><circle class="sc-fire-2" cx="${x + 10}" cy="${y - 52}" r="3.5"/>` : "";
    return `<g>
      <rect class="sc-metal" x="${x - 20}" y="${y - 2}" width="40" height="6" rx="3"/>
      <line class="sc-line" x1="${x - 16}" y1="${y + 4}" x2="${x - 22}" y2="${y + 26}"/><line class="sc-line" x1="${x + 16}" y1="${y + 4}" x2="${x + 22}" y2="${y + 26}"/>
      <rect class="sc-pants" x="${x - 12}" y="${y - 4}" width="24" height="10" rx="4"/>
      <rect class="sc-pants" x="${x + 4}" y="${y}" width="9" height="24" rx="4"/>
      <rect class="${coatCls}" x="${x - 15}" y="${y - 34}" width="30" height="36" rx="12"/>
      ${lamp}
      <circle class="sc-skin" cx="${x}" cy="${y - 46}" r="14"/>
      ${hairShape}${beanie}
      <circle class="sc-ink" cx="${x + 5}" cy="${y - 45}" r="1.8"/><circle class="sc-cheek" cx="${x + 9}" cy="${y - 40}" r="2.6"/>
    </g>`;
  }
  function dog(x, y, cls, coat, h, flip) {
    const t = flip ? `translate(${2 * x},0) scale(-1,1)` : "";
    const wear = h.has("dogwear") ? `<path class="${coat}" d="M${x - 16},${y - 6} q16,-14 30,0 v8 h-30z"/>` : "";
    return `<g transform="${t}">
      <ellipse class="sc-shadow" cx="${x}" cy="${y + 12}" rx="22" ry="4"/>
      <path class="${cls} wag" d="M${x - 18},${y - 2} q-12,-10 -6,-18" stroke-width="6" stroke-linecap="round" style="stroke:var(--s-${cls === "sc-dog-1" ? "dog-1" : "dog-2"});fill:none"/>
      <ellipse class="${cls}" cx="${x}" cy="${y}" rx="20" ry="12"/>
      <rect class="${cls}" x="${x - 14}" y="${y + 4}" width="6" height="10" rx="3"/><rect class="${cls}" x="${x + 8}" y="${y + 4}" width="6" height="10" rx="3"/>
      ${wear}
      <circle class="${cls}" cx="${x + 20}" cy="${y - 12}" r="12"/>
      <ellipse class="${cls === "sc-dog-1" ? "sc-dog-2" : "sc-ink"}" cx="${x + 12}" cy="${y - 16}" rx="5" ry="9" opacity=".55"/>
      <circle class="sc-ink" cx="${x + 24}" cy="${y - 14}" r="1.8"/><circle class="sc-ink" cx="${x + 31}" cy="${y - 10}" r="2.4"/>
      <circle class="sc-cheek" cx="${x + 24}" cy="${y - 7}" r="2.4"/>
    </g>`;
  }
  function scene(g) {
    const h = g.h, lv = g.lv;
    const stars = STARS.slice(0, 6 + lv * 3).map(([x, y], i) => `<circle class="sc-star twinkle" style="animation-delay:${(i % 5) * 0.6}s" cx="${x}" cy="${y}" r="${i % 3 ? 1.4 : 2}"/>`).join("");
    const trees = [pine(40, 262, 1.2, "sc-tree"), pine(98, 262, 0.9, "sc-tree-2"), pine(612, 262, 1.3, "sc-tree")]
      .concat(lv >= 1 ? [pine(560, 262, 0.8, "sc-tree-2")] : [])
      .concat(lv >= 3 ? [pine(150, 258, 0.7, "sc-tree"), pine(520, 258, 0.6, "sc-tree")] : []).join("");
    const warm = h.has("eblanket");
    const fire = h.has("firepit") ? `<g>
      <ellipse class="sc-glow" cx="460" cy="292" rx="70" ry="30"/>
      <rect class="sc-wood" x="436" y="284" width="48" height="6" rx="3" transform="rotate(-12 460 287)"/>
      <rect class="sc-wood" x="436" y="284" width="48" height="6" rx="3" transform="rotate(12 460 287)"/>
      <path class="sc-fire flame" d="M446,288 q-4,-20 8,-34 q2,14 8,10 q10,12 4,24z"/>
      <path class="sc-fire-2 flame" style="animation-delay:.3s" d="M454,288 q-2,-12 6,-20 q6,10 2,20z"/>
      <path class="sc-metal" d="M424,290 h72 l-10,14 h-52z"/>
      <rect class="sc-metal" x="440" y="304" width="4" height="10"/><rect class="sc-metal" x="476" y="304" width="4" height="10"/></g>` : "";
    const lantern = h.has("mainlamp")
      ? `<circle class="sc-glow" cx="372" cy="196" r="58"/><line class="sc-line" x1="372" y1="300" x2="372" y2="192"/><path class="sc-line" d="M372,192 h14"/><rect class="sc-fire-2" x="380" y="196" width="12" height="18" rx="4"/>`
      : (h.has("moodlamp") ? `<circle class="sc-glow" cx="352" cy="288" r="22"/><rect class="sc-fire-2" x="346" y="280" width="10" height="14" rx="3"/>` : "");
    const tarp = h.has("tarp") ? `<path class="sc-tarp" d="M150,170 L360,150 L380,182 L170,200z" opacity=".95"/><line class="sc-line" x1="160" y1="186" x2="160" y2="290"/><line class="sc-line" x1="372" y1="168" x2="372" y2="290"/>` : "";
    const cable = h.has("reel") ? `<path class="sc-cable" d="M0,330 q120,-10 190,-32 q30,-10 60,-22"/><rect class="sc-cable" x="2" y="320" width="18" height="18" rx="4" style="fill:var(--s-cable)"/>` : "";
    const boxes = h.has("storage") ? `<rect class="sc-box" x="108" y="268" width="42" height="28" rx="4"/><rect class="sc-box" x="114" y="246" width="34" height="22" rx="4" opacity=".85"/>` : "";
    const table = h.has("table1") ? `<rect class="sc-metal" x="540" y="282" width="62" height="5" rx="2"/><line class="sc-line" x1="546" y1="287" x2="542" y2="312"/><line class="sc-line" x1="596" y1="287" x2="600" y2="312"/><rect class="sc-fire-2" x="552" y="274" width="10" height="8" rx="2"/><rect class="sc-coat-1" x="572" y="272" width="12" height="10" rx="3"/>` : "";
    const cooler = h.has("cooler") ? `<rect class="sc-cooler" x="604" y="290" width="30" height="24" rx="4"/><rect class="sc-star" x="608" y="294" width="22" height="4" rx="2" opacity=".6"/>` : "";
    const bed = h.has("dogbed") ? `<ellipse class="sc-cushion" cx="196" cy="326" rx="70" ry="12"/>` : "";
    const stake = h.has("dogleash") ? `<rect class="sc-metal" x="270" y="318" width="4" height="16"/><path class="sc-leash" d="M168,316 q50,18 104,6"/><path class="sc-leash" d="M228,318 q24,12 44,4"/>` : "";
    const garland = lv >= 3 ? `<path class="sc-line" d="M40,200 Q190,240 330,196" style="stroke:var(--s-metal);opacity:.7"/>${[70,110,150,190,230,270,305].map((x, i) => `<circle class="${i % 2 ? "sc-fire-2" : "sc-cushion"} twinkle" style="animation-delay:${i * 0.3}s" cx="${x}" cy="${200 + Math.sin((x - 40) / 290 * Math.PI) * 26 - (x - 40) * 0.0}" r="4"/>`).join("")}` : "";
    const shoot = lv >= 4 ? `<path class="sc-star" d="M420,40 l60,-18 l-58,22z" opacity=".9"/>` : "";
    const flag = lv >= 4 ? `<line class="sc-line" x1="250" y1="168" x2="250" y2="140"/><path class="sc-fire" d="M250,140 l22,6 -22,6z"/>` : "";
    return `<svg viewBox="0 0 640 360" role="img" aria-label="우리 캠프 장면: 레벨 ${lv + 1}, 장비를 살수록 캠프가 꾸며져요" preserveAspectRatio="xMidYMid slice">
      <defs><linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="sc-sky-a"/><stop offset="1" class="sc-sky-b"/></linearGradient></defs>
      <rect width="640" height="360" fill="url(#skyGrad)"/>
      ${stars}<circle class="sc-moon" cx="560" cy="62" r="22"/><circle class="sc-sky-b" cx="570" cy="56" r="18" style="fill:var(--s-sky)"/>
      ${trees}
      <path class="sc-ground" d="M0,262 Q160,244 320,256 T640,252 V360 H0z"/>
      <path class="sc-ground-2" d="M0,320 Q200,306 420,318 T640,312 V360 H0z"/>
      ${shoot}${garland}${tarp}${cable}${boxes}
      ${warm ? '<ellipse class="sc-glow" cx="252" cy="262" rx="90" ry="30"/>' : ""}
      <polygon class="sc-tent" points="160,292 252,176 344,292"/>
      <polygon class="sc-tent-2" points="252,176 344,292 300,292"/>
      <path class="sc-door ${warm ? "warm" : ""}" d="M228,292 L252,232 L276,292z"/>
      ${flag}${lantern}${fire}${table}${cooler}${bed}${stake}
      ${dog(170, 312, "sc-dog-1", "sc-coat-2", h, false)}
      ${dog(232, 314, "sc-dog-2", "sc-coat-1", h, false)}
      ${h.has("chairs") ? person(408, 290, 1, "sc-coat-1", h, lv) + person(514, 290, 2, "sc-coat-2", h, lv) : ""}
    </svg>`;
  }

  /* ---------- 뱃지 아이콘 ---------- */
  const medalSVG = (on) => `<svg viewBox="0 0 24 24" aria-hidden="true"><circle class="m-bg" cx="12" cy="12" r="11"/>${on ? '<path class="m-fg" d="m7.5 12.5 3 3 6-6.5"/>' : '<path class="m-fg" d="M12 8v4M12 16h.01"/>'}</svg>`;

  const LEVEL_FX = [
    "기본 숲과 텐트, 별 6개로 시작해요.",
    "별이 늘고 나무가 한 그루 더 자라요.",
    "두 사람이 털모자(비니)를 써요.",
    "숲이 우거지고 나무 사이에 전구 줄이 켜져요.",
    "텐트 위에 깃발이 꽂히고 별똥별이 떨어져요.",
  ];
  const ITEM_FX = [
    ["chairs", "두 사람이 의자에 앉아요"], ["firepit", "모닥불이 타올라요"], ["eblanket", "텐트 문에 따뜻한 불빛이 켜져요"],
    ["reel", "전기 릴선이 텐트까지 이어져요"], ["mainlamp", "밝은 랜턴 기둥이 서요"], ["headlamp", "머리에 헤드랜턴 불빛이 생겨요"],
    ["clothes", "두 사람이 패딩을 입어요"], ["dogwear", "강아지들이 옷을 입어요"], ["dogbed", "강아지 방석이 깔려요"],
    ["dogleash", "리드줄과 고정 말뚝이 생겨요"], ["storage", "폴딩박스가 쌓여요"], ["table1", "테이블에 컵이 놓여요"],
    ["cooler", "아이스박스가 생겨요"], ["tarp", "타프가 펼쳐져요"],
  ];
  function openPreview(g, items) {
    let dlg = document.getElementById("lvDlg");
    if (!dlg) {
      dlg = document.createElement("dialog");
      dlg.id = "lvDlg"; dlg.setAttribute("aria-labelledby", "lvTitle");
      document.body.appendChild(dlg);
    }
    const all = new Set(ITEM_FX.map(([id]) => id).concat(["moodlamp"]));
    const nameOf = (id) => (items.find((i) => i.id === id) || {}).name || id;
    dlg.innerHTML = `<form method="dialog" class="lv-form">
      <div class="dlg-head"><div><span class="badge b-ok">지금 Lv.${g.lv + 1} ${g.cur.name}</span><h2 id="lvTitle">레벨 미리보기</h2></div>
        <button class="icon-btn" value="cancel" aria-label="닫기"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>
      <div class="dlg-body">
        <p class="hint">경험치로 레벨이 오르면 장면 전체가 바뀌고, 장비를 사면 그 장비가 장면에 하나씩 생겨요. 아래 그림은 지금 가진 장비 기준이에요.</p>
        <div class="lv-grid">${LEVELS.map((l, i) => `<div class="lv-step ${i === g.lv ? "now" : ""} ${i < g.lv ? "past" : ""}">
          <div class="lv-scene">${scene({ h: g.h, lv: i })}</div>
          <div class="lv-meta"><strong>Lv.${i + 1} ${l.name}</strong><span>${l.xp} XP${i === g.lv ? ", 지금" : i > g.lv ? `, ${l.xp - g.xp} XP 남음` : ", 달성"}</span></div>
          <p>${LEVEL_FX[i]}</p></div>`).join("")}</div>
        <h3 class="lv-sub">장비가 바꾸는 장면</h3>
        <ul class="fx-list">${ITEM_FX.map(([id, fx]) => `<li class="${g.h.has(id) ? "on" : ""}"><span class="badge ${g.h.has(id) ? "b-ok" : ""}">${g.h.has(id) ? "생김" : "아직"}</span><strong>${nameOf(id)}</strong> ${fx}</li>`).join("")}</ul>
        <h3 class="lv-sub">다 갖추면 이런 모습이에요</h3>
        <div class="lv-scene lv-final">${scene({ h: all, lv: 4 })}</div>
      </div></form>`;
    dlg.showModal();
  }

  let lastLv = null, lastBadges = null;
  function toast(msg) {
    const t = document.getElementById("toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove("show"), 2600);
  }

  window.SoshaGame = {
    xpOf: itemXP,
    xpFor: (it) => (XP_BY_PRI[it.pri] || 10) + 5,
    render(items, stats) {
      const g = compute(items);
      const el = document.getElementById("camp");
      if (!el) return;
      const pct = g.next ? (g.xp - g.cur.xp) / (g.next.xp - g.cur.xp) : 1;
      el.innerHTML = `
        <div class="scene">${scene(g)}<div class="scene-lv"><b>Lv.${g.lv + 1}</b>${g.cur.name}</div></div>
        <div class="panel-card player">
          <div>
            <div class="player-head"><div><p class="hint">우리 캠퍼 레벨</p><h2>${g.cur.name}</h2></div><button class="btn btn-sm" id="lvPreview">레벨 미리보기</button></div>
            <div class="xp-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct * 100)}" aria-label="다음 레벨까지 경험치"><i style="--p:${pct}"></i></div>
            <div class="xp-row"><span class="num">${g.xp} XP</span><span>${g.next ? `다음 레벨 ${g.next.name}까지 ${g.next.xp - g.xp} XP` : "최고 레벨이에요"}</span></div>
          </div>
          <div class="stats">
            <div class="stat"><span class="stat-k">쓴 돈</span><strong>${stats.spent}</strong></div>
            <div class="stat"><span class="stat-k">필수 남음</span><strong>${stats.must}</strong></div>
            <div class="stat"><span class="stat-k">준비율</span><strong>${stats.pct}</strong></div>
          </div>
          ${g.quest ? `<div class="next-quest"><strong>다음 퀘스트: ${g.quest.name}</strong><span>구매 완료로 옮기면 +${(XP_BY_PRI[g.quest.pri] || 10)} XP, 가격까지 적으면 +5 XP 더 받아요.</span></div>` : ""}
        </div>
        <div class="panel-card badge-card">
          <span class="hint">뱃지 ${g.badges.filter((b) => b.on).length} / ${g.badges.length}</span>
          <div class="badges" aria-label="뱃지">${g.badges.map((b) => `<span class="medal ${b.on ? "on" : ""}" title="${b.need ? "필요: " + b.need.length + "개 품목" : ""}">${medalSVG(b.on)}${b.name}</span>`).join("")}</div>
        </div>`;
      el.querySelector("#lvPreview").onclick = () => openPreview(g, items);
      const onIds = g.badges.filter((b) => b.on).map((b) => b.id);
      if (lastLv !== null && g.lv > lastLv) toast(`레벨 업! 이제 ${g.cur.name}이에요`);
      else if (lastBadges && onIds.some((id) => !lastBadges.includes(id))) {
        const nb = g.badges.find((b) => b.on && !lastBadges.includes(b.id));
        toast(`새 뱃지: ${nb.name}`);
      }
      lastLv = g.lv; lastBadges = onIds;
    },
  };
})();
