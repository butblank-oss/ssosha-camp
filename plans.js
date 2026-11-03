/* 다음 캠핑 계획: D-day와 짐 체크리스트. 다녀오면 그대로 캠핑 기록이 돼요 */
(() => {
  "use strict";
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const CATS = window.SOSHA_CATEGORIES || [];
  const api = () => window.SOSHA;
  const plans = () => { const st = api().state; st.plans = st.plans || []; return st.plans; };
  const items = () => api().allItems();
  const itemById = (id) => items().find((i) => i.id === id);
  const have = (it) => it.status === "bought" || it.status === "owned";

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
    const missing = items().filter((i) => i.pri === 1 && !have(i) && !(p.gear || []).includes(i.id) && (p.dog || i.cat !== "dog"));
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
      ${missing.length ? `<div class="plan-warn"><strong>아직 없는 필수품 ${missing.length}개</strong><span>${missing.slice(0, 8).map((m) => esc(m.name)).join(", ")}${missing.length > 8 ? " 외" : ""}</span></div>` : ""}
      <div class="gear-groups">${byCat || '<p class="hint">챙길 장비가 없어요. 아래에서 더해 주세요.</p>'}</div>
      <div class="toolbar-row"><label class="sel">장비 더하기 <select data-addg="${esc(p.id)}"><option value="">고르기</option>${others.map((o) => `<option value="${esc(o.id)}">${esc(o.name)}${have(o) ? "" : " (아직 없음)"}</option>`).join("")}</select></label>
        <button class="btn btn-sm btn-danger" data-pdel="${esc(p.id)}">계획 삭제</button></div>
    </article>`;
  }

  function render() {
    const root = document.getElementById("plans");
    if (!root || !api()) return;
    const list = plans().slice().sort((a, b) => String(a.date).localeCompare(String(b.date)));
    root.innerHTML = `<div class="section-head"><div><h2>다음 캠핑</h2><p class="hint">날짜와 캠핑장을 정하면 가진 장비로 짐 목록이 만들어져요. 다녀오면 '다녀왔어요'로 바로 기록해요.</p></div>
      <button class="btn" id="planAdd"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>계획 추가</button></div>
      ${list.length ? list.map(card).join("") : '<div class="empty">계획한 캠핑이 없어요. \'계획 추가\'를 누르거나 캠핑장 탭에서 \'이곳으로 계획\'을 눌러 보세요.</div>'}`;
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
    document.getElementById("planTitle").textContent = p && p.id ? "계획 고치기" : "캠핑 계획 추가";
    document.getElementById("planBody").innerHTML = `
      <div class="grid2">
        <label class="field"><span>날짜</span><input type="date" id="pDate" value="${esc(p.date || "")}"></label>
        <label class="field"><span>캠핑장</span><input type="text" id="pPlace" list="pFavs" value="${esc(p.place || "")}" placeholder="예: 집 앞 OO캠핑장"></label>
      </div>
      <datalist id="pFavs">${favs.map((c) => `<option value="${esc(c.facltNm)}">`).join("")}</datalist>
      <label class="toggle"><input type="checkbox" id="pDog" ${p.dog ? "checked" : ""}> 강아지랑 같이 가요</label>
      <p class="hint">짐 목록은 준비 보드의 '구매 완료'와 '원래 있던 것'으로 만들어져요. 강아지랑 안 가면 강아지 용품은 빼고 만들어요.</p>`;
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
      const date = document.getElementById("pDate").value, place = document.getElementById("pPlace").value.trim(), dog = document.getElementById("pDog").checked;
      if (editing.id) {
        Object.assign(editing, { date, place, dog });
      } else {
        const gear = items().filter((i) => have(i) && (dog || i.cat !== "dog")).map((i) => i.id);
        plans().push({ id: "p" + Date.now(), date, place, dog, campId: editing.campId || "", gear, packed: [] });
      }
      editing = null; persist();
    });
    const chip = document.getElementById("ddayChip");
    if (chip) chip.onclick = () => { const tab = document.querySelector('.tab[data-tab="log"]'); if (tab) tab.click(); };
  }

  window.SoshaPlans = { render, init() { bind(); render(); }, openNew };
})();
