/* 다음 캠핑 계획: D-day와 짐 체크리스트. 다녀오면 그대로 캠핑 기록이 돼요 */
(() => {
  "use strict";
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const CATS = window.SOSHA_CATEGORIES || [];
  const api = () => window.SOSHA;
  const views = {}; // 계획마다 보고 있는 탭 (저장하지 않아요)
  const plans = () => { const st = api().state; st.plans = st.plans || []; return st.plans; };
  const items = () => api().allItems();
  const itemById = (id) => items().find((i) => i.id === id);
  const have = (it) => it.status === "bought" || it.status === "owned";
  const R = window.SOSHA_RULES || {};
  const won = (n) => (n ? Number(n).toLocaleString("ko-KR") + "원" : "-");
  const DEF_COND = { season: "winter", elec: true, rain: false, nights: 1, site: "gravel", fire: true };
  const SEASONS = [["winter", "겨울"], ["mild", "봄·가을"], ["summer", "여름"]];
  const SITES = [["gravel", "파쇄석"], ["deck", "데크"], ["grass", "잔디·흙"]];
  function needIds(p) {
    const c = Object.assign({}, DEF_COND, p.cond || {});
    const ids = new Set(R.base || []);
    const add = (k) => (R[k] || []).forEach((id) => ids.add(id));
    if (c.fire) add("fire");
    if (c.elec) add("elec");
    if (c.season === "winter") { add("winter"); if (c.elec) add("winterElec"); }
    if (c.season === "summer") add("summer");
    if (c.season === "mild") add("mild");
    if (c.rain) add("rain");
    if (+c.nights >= 2) add("nights2");
    if (p.dog) { add("dog"); if (c.season === "winter") add("dogWinter"); }
    if (c.site === "deck") add("deck");
    return [...ids].filter((id) => itemById(id));
  }
  function condLabel(p) {
    const c = Object.assign({}, DEF_COND, p.cond || {});
    return [
      (SEASONS.find((x) => x[0] === c.season) || [])[1], c.elec ? "전기" : "전기 없음", (SITES.find((x) => x[0] === c.site) || [])[1],
      +c.nights >= 2 ? "2박 이상" : "1박", c.rain ? "비 예보" : "", c.fire ? "불멍" : "", p.dog ? "강아지 동반" : "",
    ].filter(Boolean);
  }
  function buyPlan(p) {
    const PICKS = window.SOSHA_PICKS || {};
    const L = window.SOSHA.lessonIds ? window.SOSHA.lessonIds() : new Set();
    const miss = needIds(p).map(itemById).filter((i) => i && !have(i)).sort((a, b) => (L.has(b.id) - L.has(a.id)) || a.pri - b.pri);
    let cheap = 0, full = 0, unknown = 0, cheapMust = 0, fullMust = 0;
    const rows = miss.map((i) => {
      const ps = (PICKS[i.id] || []).filter((x) => x.price);
      const best = ps.find((x) => x.pick) || ps[0];
      const low = ps.slice().sort((a, b) => a.price - b.price)[0];
      if (low) cheap += low.price; if (best) full += best.price; if (!low) unknown++;
      if (i.pri === 1) { if (low) cheapMust += low.price; if (best) fullMust += best.price; }
      return { i, low, best };
    });
    return { rows, cheap, full, unknown, cheapMust, fullMust };
  }

  function dday(date) {
    const d = new Date(date + "T00:00:00"), t = new Date(); t.setHours(0, 0, 0, 0);
    if (isNaN(d)) return { n: null, label: "날짜 미정" };
    const n = Math.round((d - t) / 86400000);
    return { n, label: n > 0 ? `D-${n}` : n === 0 ? "D-day" : `D+${-n}` };
  }
  const fmtDate = (date) => { const d = new Date(date + "T00:00:00"); return isNaN(d) ? date : `${d.getMonth() + 1}월 ${d.getDate()}일 (${"일월화수목금토"[d.getDay()]})`; };

  function card(p) {
    const dd = dday(p.date);
    const gear = (p.gear || []).map(itemById).filter(Boolean);
    const packed = new Set(p.packed || []);
    const done = gear.filter((g) => packed.has(g.id)).length;
    const bp = buyPlan(p);
    const L = window.SOSHA.lessonIds ? window.SOSHA.lessonIds() : new Set();
    const view = views[p.id] || "pack";
    const others = items().filter((i) => !(p.gear || []).includes(i.id) && i.id !== "foodmenu");
    const byCat = CATS.map((c) => {
      const xs = gear.filter((g) => g.cat === c.id);
      return xs.length ? `<div class="gear-group"><span>${esc(c.name)}</span><div class="gear-picks">${xs.map((g) => `<label class="gear-pick"><input type="checkbox" data-pack="${esc(p.id)}" value="${esc(g.id)}" ${packed.has(g.id) ? "checked" : ""}> ${esc(g.name)}<button type="button" class="x" data-drop="${esc(p.id)}" value="${esc(g.id)}" aria-label="${esc(g.name)} 빼기">×</button></label>`).join("")}</div></div>` : "";
    }).join("");
    return `<article class="plan-card panel-card">
      <div class="plan-top">
        <div class="plan-dday ${dd.n !== null && dd.n <= 3 && dd.n >= 0 ? "soon" : ""}">${dd.label}</div>
        <div class="plan-title"><strong>${esc(p.place || "캠핑장 미정")}</strong><span class="hint">${esc(fmtDate(p.date))}${p.dog ? ", 강아지 동반" : ""}</span></div>
        <div class="plan-acts"><button class="btn btn-sm" data-pedit="${esc(p.id)}">고치기</button><button class="btn btn-sm btn-primary" data-pdone="${esc(p.id)}">다녀왔어요</button></div>
      </div>
      <div class="plan-progress"><div class="meter-top"><span>짐 챙기기</span><strong class="num">${done} / ${gear.length}</strong></div><div class="meter-bar"><i style="--p:${gear.length ? done / gear.length : 0}"></i></div></div>
      <div class="cond-chips">${condLabel(p).map((t) => `<span class="badge">${esc(t)}</span>`).join("")}</div>
      <div class="plan-tabs" role="tablist">
        <button role="tab" data-pview="${esc(p.id)}" value="pack" aria-selected="${view === "pack"}">챙길 것 <b>${gear.length}</b></button>
        <button role="tab" data-pview="${esc(p.id)}" value="cheap" aria-selected="${view === "cheap"}">가성비로 채우기 <b>${bp.rows.length}</b></button>
        <button role="tab" data-pview="${esc(p.id)}" value="full" aria-selected="${view === "full"}">풀패키지</button>
      </div>
      ${view === "pack" ? `
        <div class="gear-groups">${byCat || '<p class="hint">이번 조건에 맞는 가진 장비가 없어요. 아래에서 더해 주세요.</p>'}</div>
        <div class="toolbar-row"><label class="sel">장비 더하기 <select data-addg="${esc(p.id)}"><option value="">고르기</option>${others.map((o) => `<option value="${esc(o.id)}">${esc(o.name)}${have(o) ? "" : " (아직 없음)"}</option>`).join("")}</select></label></div>`
      : bp.rows.length ? `
        <div class="buy-sum"><div><span>필수만 사면</span><strong class="num">${won(view === "cheap" ? bp.cheapMust : bp.fullMust)}</strong></div><div><span>${view === "cheap" ? "가장 싼 제품으로 다 사면" : "추천 제품으로 다 갖추면"}</span><strong class="num">${won(view === "cheap" ? bp.cheap : bp.full)}</strong></div>${bp.unknown ? `<span class="hint">가격 정보가 없는 ${bp.unknown}개는 빼고 계산했어요</span>` : ""}</div>
        <ul class="buy-list">${bp.rows.map(({ i, low, best }) => { const x = view === "cheap" ? low : best; return `<li>
          <button class="buy-name" data-open="${esc(i.id)}"><strong>${esc(i.name)}</strong>${L.has(i.id) ? '<span class="badge b-lesson">교훈</span>' : ""}<span class="badge ${i.pri === 1 ? "b-must" : i.pri === 2 ? "b-nice" : ""}">${i.pri === 1 ? "필수" : i.pri === 2 ? "권장" : "나중에"}</span></button>
          <span class="buy-pick">${x ? `${esc(x.brand)} ${esc(x.model)}` : `${esc(i.newPrice || "추천 제품 조사 전")}${i.usedPrice && i.usedPrice !== "-" ? `, 중고 ${esc(i.usedPrice)}` : ""}`}</span>
          <span class="buy-price num">${x ? won(x.price) : ""}</span>
          <span class="buy-acts"><button class="btn btn-sm" data-got="${esc(p.id)}" data-item="${esc(i.id)}" value="bought">샀어요</button><button class="btn btn-sm btn-ghost" data-got="${esc(p.id)}" data-item="${esc(i.id)}" value="owned">원래 있어요</button></span></li>`; }).join("")}</ul>
        <p class="hint">${view === "cheap" ? "가성비 칸은 후보 중 가장 싼 제품이에요. 중고로 사면 더 아낄 수 있어요." : "풀패키지는 조사한 후보 중 추천(★) 제품 기준이에요."} 이름을 누르면 후보와 중고 바로가기를 볼 수 있어요.</p>`
      : '<div class="empty">이번 조건에 필요한 장비를 다 가지고 있어요!</div>'}
      <div class="toolbar-row plan-foot"><button class="btn btn-sm btn-danger" data-pdel="${esc(p.id)}">계획 삭제</button></div>
    </article>`;
  }

  function render() {
    const root = document.getElementById("plans");
    if (!root || !api()) return;
    const list = plans().slice().sort((a, b) => String(a.date).localeCompare(String(b.date)));
    root.innerHTML = `<div class="section-head"><div><h2>다음 캠핑</h2><p class="hint">날짜와 캠핑장을 정하면 가진 장비로 짐 목록이 만들어져요. 다녀오면 '다녀왔어요'로 바로 기록해요.</p></div>
      <button class="btn" id="planAdd"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>계획 추가</button></div>
      ${list.length ? list.map(card).join("") : '<div class="empty">계획한 캠핑이 없어요. \'계획 추가\'를 눌러 보세요.</div>'}`;
    const find = (id) => plans().find((p) => p.id === id);
    root.querySelector("#planAdd").onclick = () => openNew({});
    root.querySelectorAll("[data-pack]").forEach((cb) => (cb.onchange = () => {
      const p = find(cb.dataset.pack); const s = new Set(p.packed || []);
      cb.checked ? s.add(cb.value) : s.delete(cb.value); p.packed = [...s]; persist();
    }));
    root.querySelectorAll("[data-drop]").forEach((b) => (b.onclick = (e) => {
      e.preventDefault(); const p = find(b.dataset.drop);
      p.gear = (p.gear || []).filter((x) => x !== b.value); p.packed = (p.packed || []).filter((x) => x !== b.value); persist();
    }));
    root.querySelectorAll("[data-addg]").forEach((sel) => (sel.onchange = () => {
      if (!sel.value) return; const p = find(sel.dataset.addg); p.gear = (p.gear || []).concat(sel.value); persist();
    }));
    root.querySelectorAll("[data-pview]").forEach((b) => (b.onclick = () => { views[b.dataset.pview] = b.value; render(); }));
    root.querySelectorAll("[data-got]").forEach((b) => (b.onclick = () => {
      const p = find(b.dataset.got), id = b.dataset.item;
      p.gear = [...new Set((p.gear || []).concat(id))];
      if (window.SOSHA.moveTo) window.SOSHA.moveTo(id, b.value); else api().save();
      render();
    }));
    root.querySelectorAll("[data-open]").forEach((b) => (b.onclick = () => { if (window.SOSHA.openItem) window.SOSHA.openItem(b.dataset.open); }));
    root.querySelectorAll("[data-pdel]").forEach((b) => (b.onclick = () => {
      if (b.dataset.armed !== "1") { b.dataset.armed = "1"; b.textContent = "한 번 더 누르면 삭제"; setTimeout(() => { b.dataset.armed = ""; b.textContent = "계획 삭제"; }, 3000); return; }
      const arr = plans(); arr.splice(arr.findIndex((x) => x.id === b.dataset.pdel), 1); persist();
    }));
    root.querySelectorAll("[data-pedit]").forEach((b) => (b.onclick = () => openForm(find(b.dataset.pedit))));
    root.querySelectorAll("[data-pdone]").forEach((b) => (b.onclick = () => {
      const p = find(b.dataset.pdone);
      const gear = (p.packed && p.packed.length ? p.packed : p.gear) || [];
      window.SoshaTrips.openNew({ date: p.date, place: p.place, dog: !!p.dog, gear }, () => {
        const arr = plans(); const i = arr.findIndex((x) => x.id === p.id); if (i >= 0) arr.splice(i, 1);
        api().save(); render(); renderChip();
      });
    }));
    renderChip();
  }

  /* 상단 바에 가장 가까운 캠핑 D-day를 보여줘요 */
  function renderChip() {
    const el = document.getElementById("ddayChip");
    if (!el || !api()) return;
    const next = plans().map((p) => ({ p, d: dday(p.date) })).filter((x) => x.d.n !== null && x.d.n >= 0).sort((a, b) => a.d.n - b.d.n)[0];
    el.hidden = !next;
    if (next) el.innerHTML = `<b>${next.d.label}</b> ${esc(next.p.place || "다음 캠핑")}`;
  }

  function persist() { api().save(); render(); }

  /* ---------- 계획 폼 ---------- */
  let editing = null;
  function openForm(p) {
    editing = p;
    const dlg = document.getElementById("planDlg");
    const favs = window.SoshaCamps ? window.SoshaCamps.favs() : [];
    const c = Object.assign({}, DEF_COND, p.cond || {});
    document.getElementById("planTitle").textContent = p && p.id ? "계획 고치기" : "캠핑 계획 추가";
    document.getElementById("planBody").innerHTML = `
      <div class="grid2">
        <label class="field"><span>날짜</span><input type="date" id="pDate" value="${esc(p.date || "")}"></label>
        <label class="field"><span>캠핑장</span><input type="text" id="pPlace" list="pFavs" value="${esc(p.place || "")}" placeholder="예: 집 앞 OO캠핑장"></label>
      </div>
      <datalist id="pFavs">${favs.map((c) => `<option value="${esc(c.facltNm)}">`).join("")}</datalist>
      <div class="grid2">
        <label class="field"><span>계절</span><select id="pSeason">${SEASONS.map(([v, n]) => `<option value="${v}" ${c.season === v ? "selected" : ""}>${n}</option>`).join("")}</select></label>
        <label class="field"><span>사이트 바닥</span><select id="pSite">${SITES.map(([v, n]) => `<option value="${v}" ${c.site === v ? "selected" : ""}>${n}</option>`).join("")}</select></label>
        <label class="field"><span>몇 박</span><select id="pNights"><option value="1" ${+c.nights < 2 ? "selected" : ""}>1박</option><option value="2" ${+c.nights >= 2 ? "selected" : ""}>2박 이상</option></select></label>
      </div>
      <div class="toolbar-row">
        <label class="toggle"><input type="checkbox" id="pElec" ${c.elec ? "checked" : ""}> 전기 사이트</label>
        <label class="toggle"><input type="checkbox" id="pFire" ${c.fire ? "checked" : ""}> 불멍 가능</label>
        <label class="toggle"><input type="checkbox" id="pRain" ${c.rain ? "checked" : ""}> 비 예보</label>
        <label class="toggle"><input type="checkbox" id="pDog" ${p.dog ? "checked" : ""}> 강아지 동반</label>
      </div>
      <p class="hint">조건에 맞춰 챙길 것과 아직 없는 장비가 나뉘어요. 저장한 뒤에도 장비를 더하거나 뺄 수 있어요.</p>`;
    dlg.showModal();
  }
  function openNew(prefill) {
    const d = new Date(); d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
    openForm(Object.assign({ date: d.toISOString().slice(0, 10), place: "", dog: false }, prefill));
    const tab = document.querySelector('.tab[data-tab="log"]'); if (tab) tab.click();
  }
  function bind() {
    const dlg = document.getElementById("planDlg");
    if (!dlg) return;
    dlg.addEventListener("close", () => {
      if (dlg.returnValue !== "save" || !editing) return;
      const v = (id) => document.getElementById(id);
      const date = v("pDate").value, place = v("pPlace").value.trim(), dog = v("pDog").checked;
      const cond = { season: v("pSeason").value, site: v("pSite").value, nights: +v("pNights").value, elec: v("pElec").checked, fire: v("pFire").checked, rain: v("pRain").checked };
      const target = editing.id ? editing : { id: "p" + Date.now(), campId: editing.campId || "", packed: [] };
      Object.assign(target, { date, place, dog, cond });
      target.gear = needIds(target).filter((id) => have(itemById(id)));
      target.packed = (target.packed || []).filter((id) => target.gear.includes(id));
      if (!editing.id) plans().push(target);
      editing = null; persist();
    });
    const chip = document.getElementById("ddayChip");
    if (chip) chip.onclick = () => { const tab = document.querySelector('.tab[data-tab="log"]'); if (tab) tab.click(); };
  }

  window.SoshaPlans = { render, init() { bind(); render(); }, openNew };
})();
