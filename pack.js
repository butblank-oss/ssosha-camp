/* 적재 테트리스: 트렁크 크기 안에 짐을 자동으로 쌓아보고 무게와 부피를 계산해요 */
(() => {
  "use strict";
  const PACK = window.SOSHA_PACK || {};
  const OWNED = window.SOSHA_PACK_OWNED || {};
  const PICKS = window.SOSHA_PICKS || {};
  const CARS = window.SOSHA_CARS || [];
  const SMALL_L = 3; // 3L 미만은 소품으로 묶어요
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const have = (it) => it.status === "bought" || it.status === "owned";

  function dims(it) {
    if (OWNED[it.id]) { const [w, d, h, kg, qty] = OWNED[it.id]; return { w, d, h, kg, qty: qty || 1, src: "실측/추정" }; }
    const pick = (PICKS[it.id] || []).find((p) => p.pick);
    if (pick && pick.packedCm && pick.weightKg) { const [w, d, h] = pick.packedCm; return { w, d, h, kg: pick.weightKg, qty: 1, src: pick.brand }; }
    if (PACK[it.id]) { const [w, d, h, kg] = PACK[it.id]; return { w, d, h, kg, qty: 1, src: "추정" }; }
    return null;
  }

  /* 3D 극점(extreme point) 배치: 무거운 것부터 안쪽 바닥에 */
  function pack(boxes, W, D, H) {
    const placed = [], out = [];
    let eps = [{ x: 0, y: 0, z: 0 }];
    const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.d && a.y + a.d > b.y && a.z < b.z + b.h && a.z + a.h > b.z;
    const support = (c) => {
      if (c.z === 0) return 1;
      let area = 0;
      for (const p of placed) {
        if (Math.abs(p.z + p.h - c.z) > 0.5) continue;
        const ox = Math.max(0, Math.min(c.x + c.w, p.x + p.w) - Math.max(c.x, p.x));
        const oy = Math.max(0, Math.min(c.y + c.d, p.y + p.d) - Math.max(c.y, p.y));
        area += ox * oy;
      }
      return area / (c.w * c.d);
    };
    for (const b of boxes) {
      const [a, c, e] = [b.w, b.d, b.h];
      const oris = [[a, c, e], [c, a, e], [a, e, c], [e, a, c], [c, e, a], [e, c, a]]
        .filter((o, i, arr) => arr.findIndex((p) => p.join() === o.join()) === i)
        .sort((p, q) => p[2] - q[2]);
      let best = null;
      eps.sort((p, q) => p.z - q.z || p.y - q.y || p.x - q.x);
      for (const ep of eps) {
        for (const [w, d, h] of oris) {
          const cand = { x: ep.x, y: ep.y, z: ep.z, w, d, h };
          if (cand.x + w > W + 0.01 || cand.y + d > D + 0.01 || cand.z + h > H + 0.01) continue;
          if (placed.some((p) => overlap(cand, p))) continue;
          if (support(cand) < 0.7) continue;
          const score = cand.z * 1e6 + (cand.y + d) * 1e3 + cand.x;
          if (!best || score < best.score) best = { ...cand, score };
        }
        if (best && best.z === ep.z) break;
      }
      if (!best) { out.push(b); continue; }
      const p = { ...b, x: best.x, y: best.y, z: best.z, w: best.w, d: best.d, h: best.h };
      placed.push(p);
      eps.push({ x: p.x + p.w, y: p.y, z: p.z }, { x: p.x, y: p.y + p.d, z: p.z }, { x: p.x, y: p.y, z: p.z + p.h });
      eps = eps.filter((q, i, arr) => q.x < W && q.y < D && q.z < H && arr.findIndex((r) => r.x === q.x && r.y === q.y && r.z === q.z) === i);
    }
    return { placed, out };
  }

  const SWAP = {
    chairs: "의자 2개가 꽤 커요. 1kg대 경량 체어(헬리녹스형)로 바꾸면 부피가 절반 이하로 줄어요.",
    cooler: "하드쿨러는 부피가 커요. 겨울엔 접히는 소프트쿨러 20L로 바꾸면 트렁크가 넉넉해져요.",
    tent: "텐트가 트렁크 폭을 거의 다 써요. 가로로 맨 안쪽에 먼저 눕혀 넣으세요.",
    mat: "자충매트는 공기를 빼고 단단히 말면 지름이 5cm 정도 줄어요.",
    table1: "테이블은 세워서 옆벽에 붙이면 바닥 공간이 생겨요.",
    bedding: "이불은 압축팩에 넣으면 부피가 1/3로 줄어요.",
    storage: "폴딩박스 안에 소품을 다 넣고 뚜껑 위에 가벼운 짐을 쌓아요.",
    wood: "장작은 무겁고 부피가 커요. 캠핑장에서 사는 게 좋아요.",
  };

  function render(items, state, save) {
    const root = document.getElementById("packRoot");
    if (!root) return;
    state.pack = Object.assign({ car: "f60", w: null, d: null, h: null, fold: false, preview: false, off: {} }, state.pack);
    const ps = state.pack;
    const car = CARS.find((c) => c.id === ps.car) || CARS[0];
    const W = ps.w || car.w, H = ps.h || car.h, D = ps.fold ? (ps.dFold || car.dFolded) : (ps.d || car.d);

    const pool = items.filter((it) => (have(it) || (ps.preview && it.pri === 1)) && it.cat !== undefined);
    const rows = [];
    pool.forEach((it) => {
      const dm = dims(it);
      if (!dm || it.id === "foodmenu") return;
      rows.push({ it, dm, on: ps.off[it.id] ? false : it.id !== "wood" || ps.off.wood === false });
    });
    const chosen = rows.filter((r) => r.on);
    const vol = (r) => (r.dm.w * r.dm.d * r.dm.h * r.dm.qty) / 1000;
    const hasStorage = chosen.some((r) => r.it.id === "storage");
    const smalls = chosen.filter((r) => vol(r) < SMALL_L && r.it.id !== "storage");
    const bigs = chosen.filter((r) => !smalls.includes(r));
    const boxes = [];
    bigs.forEach((r) => { for (let q = 0; q < r.dm.qty; q++) boxes.push({ id: r.it.id, name: r.it.name, w: r.dm.w, d: r.dm.d, h: r.dm.h, kg: r.dm.kg / 1 }); });
    const smallVol = smalls.reduce((s, r) => s + vol(r), 0);
    const smallKg = smalls.reduce((s, r) => s + r.dm.kg * r.dm.qty, 0);
    if (smalls.length) {
      if (hasStorage) {
        const sb = boxes.find((b) => b.id === "storage");
        sb.w = 50; sb.d = 35; sb.h = 30; sb.kg += smallKg; sb.name = `폴딩박스 (소품 ${smalls.length}개)`;
      } else {
        const h = Math.max(10, Math.ceil((smallVol * 1000 * 1.3) / (45 * 30)));
        boxes.push({ id: "smalls", name: `소품 가방 (${smalls.length}개)`, w: 45, d: 30, h, kg: smallKg });
      }
    }
    boxes.sort((a, b) => b.w * b.d * b.h - a.w * a.d * a.h || b.kg - a.kg);
    const { placed, out } = pack(boxes, W, D, H);
    const totalVol = boxes.reduce((s, b) => s + (b.w * b.d * b.h) / 1000, 0);
    const trunkVol = (W * D * H) / 1000;
    const totalKg = rows.filter((r) => r.on).reduce((s, r) => s + r.dm.kg * r.dm.qty, 0);
    const fill = Math.min(1, totalVol / trunkVol);

    /* 위에서 본 트렁크 */
    const S = 520 / Math.max(W, D * 1.1), pad = 28;
    const vw = W * S + pad * 2, vh = D * S + pad * 2;
    const layer = (z) => (z === 0 ? 0 : z < H * 0.34 ? 1 : z < H * 0.67 ? 2 : 3);
    const sorted = placed.slice().sort((a, b) => a.z - b.z);
    const svg = `<svg class="trunk-svg" viewBox="0 0 ${vw} ${vh}" role="img" aria-label="트렁크를 위에서 본 적재 배치">
      <rect class="tk-floor" x="${pad}" y="${pad}" width="${W * S}" height="${D * S}" rx="10"/>
      <text class="tk-axis" x="${vw / 2}" y="${pad - 10}" text-anchor="middle">뒷좌석 쪽 (안쪽)</text>
      <text class="tk-axis" x="${vw / 2}" y="${vh - 8}" text-anchor="middle">트렁크 문 쪽, 폭 ${W}cm × 깊이 ${D}cm × 높이 ${H}cm</text>
      ${sorted.map((p) => {
        const x = pad + p.x * S, y = pad + p.y * S, w = p.w * S, h = p.d * S;
        const big = w > 54 && h > 20;
        return `<g><rect class="tk-box l${layer(p.z)}" x="${x}" y="${y}" width="${w}" height="${h}" rx="4"><title>${esc(p.name)}: ${p.w}×${p.d}×${p.h}cm, 바닥에서 ${Math.round(p.z)}cm</title></rect>
          ${big ? `<text class="tk-label" x="${x + 6}" y="${y + 15}">${esc(p.name.length > 9 ? p.name.slice(0, 9) + "…" : p.name)}</text>` : ""}</g>`;
      }).join("")}
    </svg>`;

    const tips = [];
    if (out.length) tips.push(`<div class="pack-tip warn"><strong>트렁크에 안 들어가요:</strong> ${out.map((b) => esc(b.name)).join(", ")}. 뒷좌석 발밑이나 한쪽 좌석을 접어서 실어요.</div>`);
    if (fill > 0.85) tips.push(`<div class="pack-tip warn">부피가 트렁크의 ${Math.round(fill * 100)}%예요. 실제로는 빈틈이 생겨서 85%를 넘으면 빡빡해요.</div>`);
    boxes.slice(0, 3).forEach((b) => { if (SWAP[b.id]) tips.push(`<div class="pack-tip"><strong>${esc(b.name)}</strong>: ${SWAP[b.id]}</div>`); });
    tips.push(`<div class="pack-tip">무거운 짐(쿨러, 릴선, 장작)은 바닥 안쪽에, 가벼운 이불과 의자는 위에 실어요. 랜턴과 헤드랜턴은 도착하자마자 꺼낼 수 있게 맨 위 문 쪽에 둬요.</div>`);

    const carOpts = CARS.map((c) => `<option value="${c.id}" ${c.id === ps.car ? "selected" : ""}>${esc(c.name)}</option>`).join("");
    root.innerHTML = `
      <div class="panel-card pack-view">
        <div class="section-head" style="margin:0"><h2>트렁크 테트리스</h2><span class="hint">${placed.length}개 실림, ${out.length}개 남음</span></div>
        <div class="grid2">
          <label class="field"><span>차량</span><select id="pkCar">${carOpts}</select></label>
          <label class="toggle"><input type="checkbox" id="pkFold" ${ps.fold ? "checked" : ""}> 뒷좌석 접기 (깊이 ${car.dFolded}cm)</label>
        </div>
        <div class="car-row">
          <label class="field"><span>폭 cm</span><input type="number" inputmode="numeric" id="pkW" value="${W}"></label>
          <label class="field"><span>깊이 cm</span><input type="number" inputmode="numeric" id="pkD" value="${D}"></label>
          <label class="field"><span>높이 cm</span><input type="number" inputmode="numeric" id="pkH" value="${H}"></label>
        </div>
        ${car.est ? `<p class="hint">F60 트렁크 용량은 450L(뒷좌석 접으면 1,390L)로 확인했지만, 바닥 폭과 깊이 실측값은 찾지 못했어요. 지금 값은 추정치라서 줄자로 재서 고치면 정확해져요.</p>` : ""}
        <div class="trunk">${svg}</div>
        <div class="legend"><span><i class="lg0"></i>바닥</span><span><i class="lg1"></i>2층</span><span><i class="lg2"></i>3층</span><span><i class="lg3"></i>맨 위</span></div>
        <div class="meters">
          <div class="meter"><div class="meter-top"><span>부피</span><strong>${Math.round(totalVol)}L / ${Math.round(trunkVol)}L</strong></div><div class="meter-bar ${fill > 0.85 ? "over" : ""}"><i style="--p:${fill}"></i></div></div>
          <div class="meter"><div class="meter-top"><span>무게</span><strong>${totalKg.toFixed(1)}kg</strong></div><div class="meter-bar"><i style="--p:${Math.min(1, totalKg / 80)}"></i></div></div>
        </div>
        <div class="pack-tips">${tips.join("")}</div>
      </div>
      <div class="panel-card pack-side">
        <h2>실을 짐 고르기</h2>
        <label class="toggle"><input type="checkbox" id="pkPreview" ${ps.preview ? "checked" : ""}> 아직 안 산 필수 품목도 미리 넣어보기</label>
        <p class="hint">작은 소품은 폴딩박스나 소품 가방 하나로 묶어서 계산해요.</p>
        <div class="pack-list">${rows.sort((a, b) => vol(b) - vol(a)).map((r) => `
          <label class="pack-item ${out.some((b) => b.id === r.it.id) ? "out" : ""}">
            <input type="checkbox" data-pk="${esc(r.it.id)}" ${r.on ? "checked" : ""}>
            <span>${esc(r.it.name)}${r.dm.qty > 1 && !r.it.name.includes("개") ? ` ×${r.dm.qty}` : ""}<small>${r.dm.w}×${r.dm.d}×${r.dm.h}cm, ${Math.round(vol(r))}L${have(r.it) ? "" : ", 구매 예정"}</small></span>
            <span class="kg">${(r.dm.kg * r.dm.qty).toFixed(1)}kg</span>
          </label>`).join("")}</div>
      </div>`;

    const rerender = () => { save(); render(window.SOSHA.allItems(), state, save); };
    root.querySelector("#pkCar").onchange = (e) => { ps.car = e.target.value; ps.w = ps.d = ps.h = null; rerender(); };
    root.querySelector("#pkFold").onchange = (e) => { ps.fold = e.target.checked; rerender(); };
    root.querySelector("#pkPreview").onchange = (e) => { ps.preview = e.target.checked; rerender(); };
    root.querySelector("#pkW").onchange = (e) => { ps.w = +e.target.value || null; rerender(); };
    root.querySelector("#pkH").onchange = (e) => { ps.h = +e.target.value || null; rerender(); };
    root.querySelector("#pkD").onchange = (e) => { if (ps.fold) ps.dFold = +e.target.value || null; else ps.d = +e.target.value || null; rerender(); };
    root.querySelectorAll("[data-pk]").forEach((cb) => { cb.onchange = () => { ps.off[cb.dataset.pk] = !cb.checked; rerender(); }; });
  }

  window.SoshaPack = { render, dims };
})();
