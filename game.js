/* 캠퍼 성장 시스템: 경험치, 레벨, 뱃지, 자라는 캠프 장면 */
(() => {
  "use strict";
  const LEVELS = [
    { xp: 0, name: "거지 캠퍼" },
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
  /* 레벨이 오르거나 그 장비를 사면 장면에 생겨요 */
  const on = (h, lv, id, minLv) => (id && h.has(id)) || lv >= minLv;

  /* 사람: (x, y)는 의자 앉는 면의 가운데. dir 1은 오른쪽, -1은 왼쪽(불 쪽)을 봐요 */
  function person(x, y, hair, coat, h, lv, dir) {
    const padded = on(h, lv, "clothes", 3);
    const coatCls = padded ? coat : "sc-coat-3";
    const seat = lv === 0
      ? `<rect class="sc-cardboard" x="-19" y="-2" width="38" height="28" rx="2"/><path class="sc-tape-line" d="M-19,9 h38"/><path class="sc-fold" d="M-19,-2 l6,-5 h26 l6,5"/>`
      : `<rect class="sc-chairfab" x="-21" y="-38" width="10" height="38" rx="4" transform="rotate(-8 -16 0)"/>
         <rect class="sc-chairfab" x="-20" y="-3" width="40" height="8" rx="4"/>
         <path class="sc-line" d="M-16,5 L-22,27 M16,5 L22,27 M-14,5 L18,27 M14,5 L-18,27"/>`;
    const hc = hair === 1 ? "sc-hair-1" : "sc-hair-2";
    const back = hair === 1
      ? `<path class="${hc}" d="M-15,-50 C-19,-30 -14,-22 -6,-21 H11 C19,-22 23,-30 19,-50z"/>`
      : `<path class="${hc}" d="M-16,-50 C-18,-38 -14,-34 -7,-34 H12 C19,-34 22,-38 20,-50z"/>`;
    const top = hair === 1
      ? `<path class="${hc}" d="M-16,-47 C-17,-68 21,-68 20,-47 C18,-51 14,-55 9,-55 C7,-51 3,-50 0,-51 C-3,-53 -6,-52 -8,-50 C-11,-49 -14,-48 -16,-47z"/>`
      : `<path class="${hc}" d="M-16,-46 C-18,-68 22,-68 20,-46 C17,-51 13,-53 8,-52 C5,-49 1,-49 -2,-51 C-6,-50 -12,-48 -16,-46z"/>`;
    const hat = lv >= 2
      ? `<path class="${hair === 1 ? "sc-coat-2" : "sc-coat-1"}" d="M-16,-53 C-16,-74 20,-74 20,-53z"/><rect class="sc-hatband" x="-17" y="-57" width="38" height="6" rx="3"/><circle class="sc-star" cx="2" cy="-74" r="4.5"/>`
      : "";
    const lamp = on(h, lv, "headlamp", 3)
      ? `<polygon class="sc-beam" points="6,-55 92,-78 92,-30"/><path class="sc-lampband" d="M-15,-53 C-6,-57 10,-57 19,-53"/><circle class="sc-fire-2" cx="5" cy="-55" r="3.5"/>`
      : "";
    const quilt = padded ? `<path class="sc-quilt" d="M-12,-24 C-4,-22 4,-22 12,-24 M-13,-12 C-4,-10 4,-10 13,-12"/>` : (lv === 0 ? `<rect class="sc-patch" x="-8" y="-16" width="8" height="7" rx="1" transform="rotate(-8 -4 -12)"/>` : "");
    const scarf = padded ? `<path class="${coat === "sc-coat-1" ? "sc-coat-2" : "sc-coat-1"}" d="M-8,-36 C-2,-33 6,-33 11,-36 L11,-31 C6,-28 -2,-28 -8,-31z M5,-31 l4,12 l-6,1z"/>` : "";
    const holding = lv >= 4
      ? `<rect class="sc-mug" x="25" y="-23" width="10" height="11" rx="2"/><path class="sc-mug-h" d="M35,-20 q4,2 0,6"/><path class="sc-steam" d="M28,-27 q-3,-5 0,-9 M32,-27 q-3,-5 0,-9"/>`
      : lv >= 2 ? `<path class="sc-stick" d="M27,-15 L54,-30"/><rect class="sc-marsh" x="51" y="-35" width="8" height="7" rx="2" transform="rotate(-28 55 -31)"/>` : "";
    const mouth = lv === 0 ? `<path class="sc-mouth" d="M2,-37.5 q2.2,-1.8 4.4,0"/>` : `<path class="sc-mouth" d="M2,-38.6 q2.2,2 4.4,0"/>`;
    const sniffle = lv === 0 ? `<path class="sc-drop" d="M5,-41 q2.2,3.6 0,6.4 q-2.2,-2.8 0,-6.4z"/>` : "";
    return `<g class="${lv === 0 ? "shiver" : ""}" transform="translate(${x} ${y}) scale(${dir} 1)">
      ${seat}
      <path class="sc-pants" d="M-11,-5 H16 a5,5 0 0 1 0,10 H-11z"/>
      <rect class="sc-pants" x="12" y="3" width="9" height="21" rx="4"/>
      <ellipse class="sc-shoe" cx="20" cy="25" rx="8" ry="4"/>
      ${back}
      <path class="${coatCls}" d="M-14,1 C-17,-18 -12,-34 1,-36 C13,-35 17,-20 15,1z"/>
      ${quilt}
      <path class="sc-arm ${coatCls}" d="M6,-27 C14,-24 20,-19 25,-15" style="stroke:var(--s-${coatCls.replace("sc-", "")})"/>
      <circle class="sc-skin" cx="27" cy="-15" r="4"/>
      ${holding}${scarf}
      <ellipse class="sc-skin" cx="2" cy="-46" rx="15" ry="14.5"/>
      ${top}${hat}${lamp}
      <ellipse class="sc-ink" cx="-1" cy="-44.5" rx="1.9" ry="2.5"/><circle class="sc-eye-hl" cx="-.3" cy="-45.5" r=".8"/>
      <ellipse class="sc-ink" cx="9" cy="-44.5" rx="1.9" ry="2.5"/><circle class="sc-eye-hl" cx="9.7" cy="-45.5" r=".8"/>
      <ellipse class="sc-cheek" cx="-4" cy="-39.5" rx="2.8" ry="1.7"/><ellipse class="sc-cheek" cx="12.5" cy="-39.5" rx="2.8" ry="1.7"/>
      ${mouth}${sniffle}
    </g>`;
  }
  /* 강아지: 시츄 두 마리. 1은 8kg 큰 아이(흰 바탕에 금빛 무늬), 2는 4kg 작은 아이(금빛 바탕에 흰 얼굴) */
  function dog(x, y, kind, coat, h, lv, dir, size) {
    const base = kind === 1 ? "sc-shih-w" : "sc-shih-g";
    const patch = kind === 1 ? "sc-shih-g" : "sc-shih-w";
    const ear = kind === 1 ? "sc-shih-g" : "sc-shih-b";
    const wear = on(h, lv, "dogwear", 2) ? `<path class="${coat}" d="M-16,-9 C-10,-19 10,-19 15,-9 L15,1 C6,4 -8,4 -16,1z"/><path class="sc-quilt" d="M-13,-4 h26"/>` : "";
    const scarf = lv >= 4 ? `<path class="sc-fire" d="M7,-6 C12,-2 22,-2 27,-6 L26,0 C21,3 12,3 7,0z"/>` : `<path class="sc-collar" d="M8,-5 C13,-2 21,-2 26,-5"/><circle class="sc-tag" cx="17" cy="-1.5" r="2"/>`;
    const blaze = kind === 2 ? `<path class="sc-shih-w" d="M15,-30 C13,-24 12,-18 12,-12 C16,-9 22,-9 25,-12 C25,-18 21,-24 18,-30z"/>` : `<ellipse class="sc-shih-g" cx="-4" cy="-6" rx="9" ry="5"/>`;
    const tongue = lv >= 1 ? `<path class="sc-tongue" d="M19,-6.5 q.8,3.6 -1.8,4.2 q-1.6,-2.4 -.6,-4.2z"/>` : "";
    return `<g transform="translate(${x} ${y}) scale(${dir * size} ${size})">
      <ellipse class="sc-shadow" cx="0" cy="13" rx="24" ry="4"/>
      <path class="wag" d="M-16,-8 C-30,-14 -26,-30 -14,-24 C-20,-20 -20,-14 -14,-12" style="fill:var(--s-${kind === 1 ? "shih-w" : "shih-g"})"/>
      <path class="${base}" d="M-21,-4 C-21,-15 -6,-17 8,-15 C15,-14 18,-8 18,-2 L19,11 C14,12 12,10 10,12 C6,10 2,12 -2,11 C-6,12 -10,10 -14,12 C-17,10 -20,12 -22,11z"/>
      ${blaze}
      <ellipse class="sc-shoe" cx="-12" cy="12.5" rx="3.4" ry="1.6" opacity=".35"/><ellipse class="sc-shoe" cx="10" cy="12.5" rx="3.4" ry="1.6" opacity=".35"/>
      ${wear}
      <path class="${ear}" d="M4,-24 C-2,-22 -3,-8 2,-3 C6,-5 8,-14 7,-22z"/>
      <circle class="${base}" cx="17" cy="-18" r="13"/>
      <path class="${patch === "sc-shih-w" ? "sc-shih-g" : "sc-shih-g"}" d="M8,-27 C11,-31 23,-31 26,-26 C22,-27 18,-25 17,-21 C15,-25 11,-27 8,-27z" opacity="${kind === 1 ? 1 : 0}"/>
      ${kind === 2 ? `<path class="sc-shih-w" d="M15,-29 C14,-24 14,-20 17,-18 C20,-20 20,-24 19,-29z"/>` : ""}
      <path class="${ear}" d="M28,-24 C33,-20 34,-8 29,-4 C26,-7 25,-15 26,-22z"/>
      <path class="sc-shih-w" d="M10,-12 C10,-6 14,-3 18,-3 C22,-3 26,-6 26,-12 C22,-14 14,-14 10,-12z"/>
      <path class="sc-bow" d="M17,-33 l-6,-4 v8z M17,-33 l6,-4 v8z"/><circle class="sc-bow" cx="17" cy="-33" r="2.2"/>
      <path class="${base}" d="M14,-33 C14,-38 20,-38 20,-33z"/>
      <circle class="sc-ink" cx="12" cy="-19" r="2.7"/><circle class="sc-eye-hl" cx="12.9" cy="-20" r=".9"/>
      <circle class="sc-ink" cx="22" cy="-19" r="2.7"/><circle class="sc-eye-hl" cx="22.9" cy="-20" r=".9"/>
      <ellipse class="sc-ink" cx="17" cy="-13.5" rx="2.4" ry="1.7"/>
      <path class="sc-mouth" d="M15,-10.5 q2,1.6 4,0"/>
      ${tongue}
      <ellipse class="sc-cheek" cx="9" cy="-14" rx="2" ry="1.3"/><ellipse class="sc-cheek" cx="25" cy="-14" rx="2" ry="1.3"/>
      ${scarf}
    </g>`;
  }
  function tent(lv, warm) {
    const door = `sc-door ${warm ? "warm" : ""}`;
    if (lv === 0) return `<g transform="rotate(-6 238 302)">
      <polygon class="sc-tent" points="188,302 236,232 288,302"/><polygon class="sc-tent-2" points="236,232 288,302 262,302"/>
      <path class="${door}" d="M222,302 L236,270 L250,302z"/>
      <path class="sc-tape-line" d="M198,284 l16,-8 M200,276 l10,12"/><rect class="sc-tape" x="256" y="262" width="16" height="10" transform="rotate(14 264 267)"/>
      <line class="sc-line" x1="236" y1="232" x2="226" y2="214"/></g>`;
    if (lv === 1) return `<polygon class="sc-tent" points="160,302 252,186 344,302"/><polygon class="sc-tent-2" points="252,186 344,302 300,302"/><path class="${door}" d="M228,302 L252,242 L276,302z"/>`;
    if (lv === 2) return `<path class="sc-tent" d="M128,304 C128,214 190,180 249,180 C308,180 370,214 370,304z"/><path class="sc-tent-2" d="M249,180 C308,180 370,214 370,304 L316,304 C316,240 290,196 249,180z"/>
      <path class="sc-seam" d="M150,250 C190,214 308,214 348,250"/><path class="${door}" d="M220,304 C220,262 234,248 249,248 C264,248 278,262 278,304z"/>`;
    const w = lv >= 4 ? 18 : 0;
    return `<path class="sc-tent" d="M${98 - w},304 C${98 - w},210 ${150 - w},178 ${200 - w},176 L330,180 C376,184 ${398 + w},230 ${398 + w},304z"/>
      <path class="sc-tent-2" d="M330,180 C376,184 ${398 + w},230 ${398 + w},304 L350,304 C350,240 340,200 330,180z"/>
      <path class="sc-seam" d="M${140 - w},304 C${140 - w},230 ${170 - w},196 ${205 - w},190 M200,180 C220,220 226,262 226,304 M262,178 C280,220 286,262 286,304"/>
      <rect class="sc-window" x="${150 - w}" y="222" width="36" height="18" rx="6"/><rect class="sc-window" x="240" y="214" width="34" height="18" rx="6"/>
      <path class="${door}" d="M296,304 C296,262 306,240 322,236 C336,240 346,262 346,304z"/>
      ${lv >= 4 ? `<path class="sc-tent-2" d="M${398 + w},304 L${430 + w},304 L${398 + w},250z"/>` : ""}`;
  }
  function scene(g) {
    const h = g.h, lv = g.lv;
    const warm = on(h, lv, "eblanket", 2);
    const stars = STARS.slice(0, 4 + lv * 4).map(([x, y], i) => `<circle class="sc-star twinkle" style="animation-delay:${(i % 5) * 0.6}s" cx="${x}" cy="${y}" r="${i % 3 ? 1.4 : 2}"/>`).join("");
    const trees = [pine(40, 262, 1.2, "sc-tree"), pine(612, 262, 1.3, "sc-tree")]
      .concat(lv >= 1 ? [pine(98, 262, 0.9, "sc-tree-2"), pine(560, 262, 0.8, "sc-tree-2")] : [])
      .concat(lv >= 3 ? [pine(150, 252, 0.7, "sc-tree"), pine(520, 252, 0.6, "sc-tree")] : []).join("");
    const car = lv >= 4 ? `<g><rect class="sc-car" x="-6" y="246" width="118" height="40" rx="14"/><path class="sc-car" d="M10,250 Q22,220 44,218 H86 Q100,220 106,250z"/>
      <rect class="sc-car-2" x="20" y="214" width="76" height="10" rx="4"/><path class="sc-window" d="M24,248 Q32,228 46,226 H62 V248z M68,226 H84 Q94,228 100,248 H68z"/>
      <circle class="sc-car-2" cx="22" cy="288" r="12"/><circle class="sc-car-2" cx="90" cy="288" r="12"/><rect class="sc-box" x="30" y="200" width="56" height="14" rx="6"/></g>` : "";
    const fireScale = lv === 0 ? 0 : lv >= 3 ? 1.25 : 1;
    const fire = lv === 0
      ? `<g><circle class="sc-glow" cx="468" cy="296" r="22"/><rect class="sc-metal" x="460" y="290" width="16" height="14" rx="2"/><path class="sc-fire-2 flame" d="M468,290 q-4,-8 0,-14 q4,6 0,14z"/></g>`
      : on(h, lv, "firepit", 1) ? `<g transform="translate(460 300) scale(${fireScale}) translate(-460 -300)">
      <ellipse class="sc-glow" cx="460" cy="292" rx="${60 + lv * 8}" ry="${26 + lv * 3}"/>
      <rect class="sc-wood" x="436" y="284" width="48" height="6" rx="3" transform="rotate(-12 460 287)"/>
      <rect class="sc-wood" x="436" y="284" width="48" height="6" rx="3" transform="rotate(12 460 287)"/>
      <path class="sc-fire flame" d="M446,288 q-4,-20 8,-34 q2,14 8,10 q10,12 4,24z"/>
      <path class="sc-fire-2 flame" style="animation-delay:.3s" d="M454,288 q-2,-12 6,-20 q6,10 2,20z"/>
      <path class="sc-metal" d="M424,290 h72 l-10,14 h-52z"/>
      <rect class="sc-metal" x="440" y="304" width="4" height="10"/><rect class="sc-metal" x="476" y="304" width="4" height="10"/></g>` : "";
    const tarp = on(h, lv, "tarp", 3) ? `<g><path class="sc-tarp" d="M372,186 L636,160 L640,198 L384,222z"/><path class="sc-seam" d="M378,204 L638,179"/>
      <line class="sc-line" x1="384" y1="200" x2="384" y2="306"/><line class="sc-line" x1="630" y1="172" x2="630" y2="306"/>
      <path class="sc-leash" d="M384,200 L360,306 M630,172 L640,250"/></g>` : "";
    const lantern = on(h, lv, "mainlamp", 2)
      ? `<circle class="sc-glow" cx="${lv >= 3 ? 404 : 372}" cy="196" r="58"/><line class="sc-line" x1="${lv >= 3 ? 404 : 372}" y1="304" x2="${lv >= 3 ? 404 : 372}" y2="192"/><path class="sc-line" d="M${lv >= 3 ? 404 : 372},192 h14"/><rect class="sc-fire-2" x="${lv >= 3 ? 412 : 380}" y="196" width="12" height="18" rx="4"/>`
      : on(h, lv, "moodlamp", 1) ? `<circle class="sc-glow" cx="352" cy="294" r="22"/><rect class="sc-fire-2" x="346" y="286" width="10" height="14" rx="3"/>` : "";
    const garland = lv >= 3 ? `<path class="sc-line" d="M40,198 Q190,238 340,190" style="opacity:.7"/>${[70, 110, 150, 190, 230, 270, 310].map((x, i) => `<circle class="${i % 2 ? "sc-fire-2" : "sc-cushion"} twinkle" style="animation-delay:${i * 0.3}s" cx="${x}" cy="${206 + Math.sin(((x - 40) / 300) * Math.PI) * 18}" r="4"/>`).join("")}` : "";
    const shoot = lv >= 4 ? `<path class="sc-star" d="M420,40 l60,-18 l-58,22z" opacity=".9"/>` : "";
    const flag = lv >= 4 ? `<line class="sc-line" x1="214" y1="178" x2="214" y2="146"/><path class="sc-fire" d="M214,146 l24,7 -24,7z"/>` : "";
    const cable = on(h, lv, "reel", 2) ? `<path class="sc-cable" d="M0,336 q120,-10 190,-32 q30,-10 60,-22"/>` : "";
    const boxes = on(h, lv, "storage", 3) ? `<rect class="sc-box" x="596" y="268" width="40" height="30" rx="4"/><rect class="sc-box" x="602" y="246" width="32" height="22" rx="4" opacity=".85"/>` : "";
    const table = lv === 0 ? `<rect class="sc-paper" x="540" y="304" width="56" height="10" rx="1" transform="rotate(-4 568 309)"/><rect class="sc-metal" x="552" y="292" width="14" height="14" rx="2"/>`
      : on(h, lv, "table1", 1) ? `<rect class="sc-metal" x="540" y="282" width="62" height="5" rx="2"/><line class="sc-line" x1="546" y1="287" x2="542" y2="312"/><line class="sc-line" x1="596" y1="287" x2="600" y2="312"/><rect class="sc-fire-2" x="552" y="274" width="10" height="8" rx="2"/><rect class="sc-coat-1" x="572" y="272" width="12" height="10" rx="3"/>` : "";
    const cooler = on(h, lv, "cooler", 3) ? `<rect class="sc-cooler" x="600" y="300" width="34" height="26" rx="4"/><rect class="sc-star" x="604" y="304" width="26" height="4" rx="2" opacity=".6"/>` : "";
    const trash = lv === 0 ? `<path class="sc-trash" d="M330,304 q-10,-24 6,-30 l6,-6 l4,6 q14,8 4,30z"/>` : "";
    const ground = lv === 0 ? `<rect class="sc-paper" x="128" y="320" width="120" height="14" rx="1" transform="rotate(2 188 327)"/>` : "";
    const bed = on(h, lv, "dogbed", 1) ? `<ellipse class="sc-cushion" cx="190" cy="328" rx="74" ry="12"/>` : "";
    const bowls = lv >= 2 || h.has("dogbowl") ? `<ellipse class="sc-cooler" cx="276" cy="334" rx="10" ry="4"/><ellipse class="sc-coat-2" cx="298" cy="336" rx="10" ry="4"/>` : "";
    const dogHouse = lv >= 3 ? `<g><polygon class="sc-coat-1" points="40,330 66,292 92,330"/><polygon class="sc-tent-2" points="66,292 92,330 80,330"/><path class="sc-door" d="M58,330 q8,-20 16,0z"/><path class="sc-fire" d="M66,292 l0,-12 l10,4 -10,4"/></g>` : "";
    const fence = lv >= 4 ? `<g class="sc-fence">${[120, 150, 180, 210, 240, 270].map((x) => `<rect x="${x}" y="326" width="4" height="18" rx="1"/>`).join("")}<rect x="118" y="330" width="158" height="3"/><rect x="118" y="338" width="158" height="3"/></g>` : "";
    const stake = on(h, lv, "dogleash", 3) ? `<rect class="sc-metal" x="306" y="318" width="4" height="16"/><path class="sc-leash" d="M168,316 q70,18 138,6"/><path class="sc-leash" d="M232,318 q40,12 74,4"/>` : "";
    const bone = lv >= 4 ? `<path class="sc-star" d="M250,342 h14 m-16,-3 a3,3 0 1,0 0,6 m16,-6 a3,3 0 1,1 0,6"/>` : "";
    const chairs = lv >= 1 || h.has("chairs");
    return `<svg viewBox="0 0 640 360" role="img" aria-label="우리 캠프 장면: 레벨 ${lv + 1}, 레벨이 오르고 장비를 살수록 캠프가 꾸며져요" preserveAspectRatio="xMidYMax meet">
      <defs><linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="sc-sky-a"/><stop offset="1" class="sc-sky-b"/></linearGradient></defs>
      <rect width="640" height="360" fill="url(#skyGrad)"/>
      ${stars}<circle class="sc-moon" cx="536" cy="66" r="20"/><circle cx="545" cy="60" r="17" style="fill:var(--s-sky)"/>
      ${shoot}${trees}
      <path class="sc-ground" d="M0,262 Q160,244 320,256 T640,252 V360 H0z"/>
      <path class="sc-ground-2" d="M0,320 Q200,306 420,318 T640,312 V360 H0z"/>
      ${car}${garland}${tarp}${cable}${boxes}
      ${warm ? '<ellipse class="sc-glow" cx="252" cy="268" rx="110" ry="34"/>' : ""}
      ${tent(lv, warm)}${flag}${trash}${lantern}${fire}${table}${cooler}
      ${dogHouse}${ground}${bed}${bowls}${stake}
      ${dog(166, 312, 1, "sc-coat-2", h, lv, 1, 1.18)}
      ${dog(252, 318, 2, "sc-coat-1", h, lv, -1, 0.86)}
      ${fence}${bone}
      ${chairs || lv === 0 ? person(418, 290, 1, "sc-coat-1", h, lv, 1) + person(512, 290, 2, "sc-coat-2", h, lv, -1) : ""}
    </svg>`;
  }

  /* ---------- 뱃지 아이콘 ---------- */
  const medalSVG = (on) => `<svg viewBox="0 0 24 24" aria-hidden="true"><circle class="m-bg" cx="12" cy="12" r="11"/>${on ? '<path class="m-fg" d="m7.5 12.5 3 3 6-6.5"/>' : '<path class="m-fg" d="M12 8v4M12 16h.01"/>'}</svg>`;

  const LEVEL_FX = [
    "찌그러진 작은 텐트에 테이프를 덕지덕지, 박스에 앉아 깡통 촛불을 쬐요. 강아지들은 신문지 위에서 덜덜.",
    "번듯한 원터치 텐트와 캠핑 의자, 작은 모닥불이 생겨요. 강아지들은 방석에 앉아요.",
    "돔 텐트로 커지고 텐트 안에 불이 켜져요. 랜턴과 릴선이 생기고, 둘은 털모자를, 강아지들은 옷을 입어요.",
    "커다란 터널형 텐트에 타프가 쳐지고 전구 줄이 켜져요. 패딩과 헤드랜턴, 강아지 집과 리드줄이 생겨요.",
    "텐트 위에 깃발, 차에는 루프박스! 강아지 울타리와 장난감, 머플러에 따뜻한 머그잔까지 생겨요.",
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
