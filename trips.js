/* 캠핑 기록: 다녀온 캠핑을 목록으로 보고, 누르면 펼쳐져요.
 * 기록을 추가하면 준비 보드의 '구매 완료'와 '원래 있던 것' 장비가 챙긴 장비로 미리 체크돼요. */
(() => {
  "use strict";
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const won = (n) => (n ? Number(n).toLocaleString("ko-KR") + "원" : "-");
  const TRIP_XP = 40;
  const MAX_PHOTOS = 4;
  const CATS = window.SOSHA_CATEGORIES || [];
  const FIRST = window.SOSHA_FIRST_TRIP;
  const open = new Set();

  const api = () => window.SOSHA;
  function trips() { const st = api().state; st.trips = st.trips || []; st.trips.forEach((t, i) => { if (!t.id) t.id = "t" + Date.now() + i; }); return st.trips; }
  const items = () => api().allItems();
  const itemById = (id) => items().find((i) => i.id === id);
  const have = (it) => it.status === "bought" || it.status === "owned";

  function shrink(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const k = Math.min(1, 1024 / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL("image/jpeg", 0.72));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image")); };
      img.src = url;
    });
  }

  /* 첫 캠핑도 목록의 한 줄로 보여줘요 (고칠 수는 없어요) */
  function firstTrip() {
    const cost = FIRST.site + FIRST.spent.reduce((s, x) => s + x.price, 0);
    return { id: "first", fixed: true, date: FIRST.dateISO, dateLabel: "2026-11 초", place: FIRST.place, cost, weather: FIRST.weather, temp: "", dog: false,
      notes: FIRST.lessons.map((l) => l.t).join("\n"), needs: [], photos: [], gear: FIRST.gear };
  }
  function allTrips() {
    return trips().slice().concat([firstTrip()]).sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  }

  function gearChips(ids) {
    const byCat = {};
    (ids || []).forEach((id) => { const it = itemById(id); if (it) (byCat[it.cat] = byCat[it.cat] || []).push(it); });
    const groups = CATS.filter((c) => byCat[c.id]).map((c) => `<div class="gear-group"><span>${esc(c.name)}</span><div>${byCat[c.id].map((it) => `<span class="gear-chip">${esc(it.name)}</span>`).join("")}</div></div>`);
    return groups.length ? groups.join("") : '<p class="hint">챙긴 장비를 기록하지 않았어요.</p>';
  }

  function detail(t) {
    const needs = (t.needs || []).map((n) => `<li>${esc(n.text)}${n.added ? ' <span class="badge b-ok">보드에 추가됨</span>' : ` <button class="btn btn-sm" data-add="${esc(t.id)}" data-text="${esc(n.text)}">보드에 추가</button>`}</li>`).join("");
    return `<div class="trip-detail">
      ${t.link ? `<a class="hint" href="${esc(t.link)}" target="_blank" rel="noopener">캠핑장 링크 열기</a>` : ""}
      ${t.photos && t.photos.length ? `<div class="photos">${t.photos.map((p) => `<img src="${esc(p)}" alt="${esc(t.place)} 캠핑 사진" loading="lazy">`).join("")}</div>` : ""}
      ${t.notes ? `<div class="td-block"><strong>${t.fixed ? "배운 점 (위에서 자세히 볼 수 있어요)" : "배운 점, 아쉬웠던 점"}</strong><p class="trip-notes">${esc(t.notes)}</p></div>` : ""}
      <div class="td-block"><strong>챙겨간 장비 ${(t.gear || []).length}개</strong><div class="gear-groups">${gearChips(t.gear)}</div></div>
      ${needs ? `<div class="td-block"><strong>다음엔 챙길 것</strong><ul class="needs">${needs}</ul></div>` : ""}
      ${t.fixed ? "" : `<div class="trip-actions"><button class="btn btn-sm" data-edit="${esc(t.id)}">고치기</button><button class="btn btn-sm btn-danger" data-del="${esc(t.id)}">삭제</button></div>`}
    </div>`;
  }

  function row(t) {
    const isOpen = open.has(t.id);
    const temp = t.temp !== "" && t.temp != null ? `${t.temp}℃` : "";
    return `<li class="trip-row ${isOpen ? "open" : ""}">
      <button class="trip-line" data-toggle="${esc(t.id)}" aria-expanded="${isOpen}">
        <span class="tl-date num">${esc(t.dateLabel || t.date || "-")}</span>
        <span class="tl-place"><strong>${esc(t.place)}</strong><small>${[t.weather, temp, t.dog ? "강아지 동반" : ""].filter(Boolean).map(esc).join(", ") || "날씨 기록 없음"}</small></span>
        <span class="tl-gear">장비 ${(t.gear || []).length}개</span>
        <span class="tl-cost num">${won(t.cost)}</span>
        <svg class="ico tl-caret" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
      </button>
      ${isOpen ? detail(t) : ""}
    </li>`;
  }

  function render() {
    const root = document.getElementById("trips");
    if (!root || !api()) return;
    const list = allTrips();
    const total = list.reduce((s, t) => s + (+t.cost || 0), 0);
    root.innerHTML = `
      <div class="section-head"><div><h2>다녀온 캠핑</h2><p class="hint">${list.length}번 다녀왔어요. 지금까지 캠핑에 ${won(total)}을 썼어요.</p></div>
        <button class="btn btn-primary" id="tripAdd"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>기록 추가</button></div>
      <div class="trip-table">
        <div class="trip-th" aria-hidden="true"><span>날짜</span><span>캠핑장</span><span>장비</span><span>비용</span><span></span></div>
        <ul class="trip-rows">${list.map(row).join("")}</ul>
      </div>`;
    root.querySelector("#tripAdd").onclick = () => openForm(null);
    root.querySelectorAll("[data-toggle]").forEach((b) => (b.onclick = () => { const id = b.dataset.toggle; open.has(id) ? open.delete(id) : open.add(id); render(); }));
    root.querySelectorAll("[data-edit]").forEach((b) => (b.onclick = () => openForm(b.dataset.edit)));
    root.querySelectorAll("[data-del]").forEach((b) => (b.onclick = () => {
      if (b.dataset.armed !== "1") { b.dataset.armed = "1"; b.textContent = "한 번 더 누르면 삭제"; setTimeout(() => { b.dataset.armed = ""; b.textContent = "삭제"; }, 3000); return; }
      const arr = trips(); const i = arr.findIndex((t) => t.id === b.dataset.del); if (i >= 0) arr.splice(i, 1); persist();
    }));
    root.querySelectorAll("[data-add]").forEach((b) => (b.onclick = () => {
      const t = trips().find((x) => x.id === b.dataset.add); if (!t) return;
      const text = b.dataset.text;
      api().state.custom.push({ id: "c" + Date.now(), custom: true, name: text, cat: "life", status: "todo", pri: 1, spec: `${t.place}에서 아쉬웠던 것`, why: t.notes || "", q: text, newPrice: "", usedPrice: "" });
      const n = (t.needs || []).find((x) => x.text === text); if (n) n.added = true;
      persist();
    }));
  }

  function persist() {
    api().save();
    render();
    if (window.SOSHA_REFRESH) window.SOSHA_REFRESH();
  }

  /* ---------- 입력 폼 ---------- */
  let editingId = null, photos = [], gear = new Set();
  function gearPicker() {
    const all = items().filter((i) => i.id !== "foodmenu");
    const mine = all.filter(have), others = all.filter((i) => !have(i));
    const box = (it) => `<label class="gear-pick"><input type="checkbox" data-gear="${esc(it.id)}" ${gear.has(it.id) ? "checked" : ""}> ${esc(it.name)}</label>`;
    const byCat = (arr) => CATS.map((c) => { const xs = arr.filter((i) => i.cat === c.id); return xs.length ? `<div class="gear-group"><span>${esc(c.name)}</span><div class="gear-picks">${xs.map(box).join("")}</div></div>` : ""; }).join("");
    return `<div class="field"><span>챙겨간 장비 <b id="gearCount">${gear.size}</b>개 (준비 보드의 구매 완료, 원래 있던 것이 미리 체크돼요. 안 가져간 건 빼 주세요)</span>
      <div class="toolbar-row"><button type="button" class="btn btn-sm" id="gearAll">가진 장비 모두 체크</button><button type="button" class="btn btn-sm" id="gearNone">모두 빼기</button></div>
      <div class="gear-groups">${byCat(mine) || '<p class="hint">준비 보드에 가진 장비가 아직 없어요.</p>'}</div>
      ${others.length ? `<details class="gear-more"><summary>빌렸거나 아직 보드에 '사야 해요'로 있는 장비도 넣기 (${others.length}개)</summary><div class="gear-groups">${byCat(others)}</div></details>` : ""}
    </div>`;
  }
  function openForm(id) {
    const dlg = document.getElementById("tripDlg");
    editingId = id;
    const t = id == null
      ? { date: new Date().toISOString().slice(0, 10), place: "", link: "", cost: "", weather: "", temp: "", dog: false, notes: "", needs: [], photos: [], gear: items().filter(have).map((i) => i.id) }
      : trips().find((x) => x.id === id);
    photos = (t.photos || []).slice();
    gear = new Set(t.gear || []);
    document.getElementById("tripTitle").textContent = id == null ? "캠핑 기록 추가" : "캠핑 기록 고치기";
    document.getElementById("tripBody").innerHTML = `
      <div class="grid2">
        <label class="field"><span>날짜</span><input type="text" id="tDate" value="${esc(t.date)}" placeholder="2026-11-15"></label>
        <label class="field"><span>캠핑장 이름</span><input type="text" id="tPlace" value="${esc(t.place)}" placeholder="예: 집 앞 OO캠핑장"></label>
      </div>
      <label class="field"><span>캠핑장 링크 (선택)</span><input type="text" id="tLink" value="${esc(t.link)}" placeholder="https://"></label>
      <div class="grid2">
        <label class="field"><span>쓴 돈 (원)</span><input type="number" inputmode="numeric" id="tCost" value="${esc(t.cost)}" placeholder="50000"></label>
        <label class="field"><span>날씨</span><select id="tWeather">${["", "맑음", "흐림", "비", "눈", "바람 강함"].map((w) => `<option ${w === t.weather ? "selected" : ""} value="${w}">${w || "-"}</option>`).join("")}</select></label>
        <label class="field"><span>밤 최저기온 (℃)</span><input type="number" inputmode="numeric" id="tTemp" value="${esc(t.temp)}" placeholder="2"></label>
        <label class="toggle"><input type="checkbox" id="tDog" ${t.dog ? "checked" : ""}> 강아지랑 같이 갔어요</label>
      </div>
      ${gearPicker()}
      <label class="field"><span>배운 점, 아쉬웠던 점</span><textarea id="tNotes" placeholder="예: 새벽에 결로가 심했어요. 텐트 문을 조금 열어둘 걸.">${esc(t.notes)}</textarea></label>
      <label class="field"><span>다음엔 챙길 것 (한 줄에 하나, 나중에 보드에 바로 추가할 수 있어요)</span><textarea id="tNeeds" placeholder="예:&#10;결로 닦을 수건&#10;텐트 안 슬리퍼">${esc((t.needs || []).filter((n) => !n.added).map((n) => n.text).join("\n"))}</textarea></label>
      <div class="field"><span>사진 (최대 ${MAX_PHOTOS}장)</span>
        <div class="photos" id="tPhotos"></div>
        <label class="btn btn-sm" style="justify-self:start">사진 고르기<input type="file" id="tFile" accept="image/*" multiple hidden></label>
      </div>`;
    const body = document.getElementById("tripBody");
    const syncCount = () => { document.getElementById("gearCount").textContent = gear.size; };
    body.querySelectorAll("[data-gear]").forEach((cb) => (cb.onchange = () => { cb.checked ? gear.add(cb.dataset.gear) : gear.delete(cb.dataset.gear); syncCount(); }));
    body.querySelector("#gearAll").onclick = () => { items().filter(have).forEach((i) => gear.add(i.id)); body.querySelectorAll("[data-gear]").forEach((cb) => (cb.checked = gear.has(cb.dataset.gear))); syncCount(); };
    body.querySelector("#gearNone").onclick = () => { gear.clear(); body.querySelectorAll("[data-gear]").forEach((cb) => (cb.checked = false)); syncCount(); };
    const drawPhotos = () => {
      document.getElementById("tPhotos").innerHTML = photos.map((p, i) => `<div class="ph"><img src="${esc(p)}" alt="선택한 사진 ${i + 1}"><button type="button" class="icon-btn" data-rm="${i}" aria-label="사진 ${i + 1} 빼기"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>`).join("");
      document.querySelectorAll("#tPhotos [data-rm]").forEach((b) => (b.onclick = () => { photos.splice(+b.dataset.rm, 1); drawPhotos(); }));
    };
    drawPhotos();
    document.getElementById("tFile").onchange = async (e) => {
      for (const f of [...e.target.files].slice(0, MAX_PHOTOS - photos.length)) {
        try {
          let src = await shrink(f);
          if (window.SoshaSync && window.SoshaSync.uploadPhoto) src = await window.SoshaSync.uploadPhoto(src);
          photos.push(src);
        } catch { /* 읽지 못한 사진은 건너뛰어요 */ }
      }
      e.target.value = ""; drawPhotos();
    };
    dlg.showModal();
  }
  function bindForm() {
    const dlg = document.getElementById("tripDlg");
    if (!dlg) return;
    dlg.addEventListener("close", () => {
      if (dlg.returnValue !== "save") return;
      const v = (id) => document.getElementById(id).value.trim();
      const arr = trips();
      const prev = editingId == null ? null : arr.find((x) => x.id === editingId);
      const kept = prev ? (prev.needs || []).filter((n) => n.added) : [];
      const t = {
        id: prev ? prev.id : "t" + Date.now(),
        date: v("tDate"), place: v("tPlace") || "이름 없는 캠핑장", link: v("tLink"), cost: v("tCost") ? +v("tCost") : "",
        weather: v("tWeather"), temp: v("tTemp") === "" ? "" : +v("tTemp"), dog: document.getElementById("tDog").checked,
        notes: v("tNotes"), needs: kept.concat(v("tNeeds").split("\n").map((x) => x.trim()).filter(Boolean).map((text) => ({ text, added: false }))),
        photos: photos.slice(), gear: [...gear],
      };
      if (prev) arr[arr.indexOf(prev)] = t; else arr.unshift(t);
      open.add(t.id);
      try { api().save(); localStorage.setItem("sosha-camp-v1", JSON.stringify(api().state)); }
      catch { t.photos = t.photos.filter((p) => !String(p).startsWith("data:")); api().save(); const n = document.getElementById("toast"); if (n) { n.textContent = "저장 공간이 부족해서 사진은 빼고 저장했어요"; n.classList.add("show"); setTimeout(() => n.classList.remove("show"), 3000); } }
      render();
      if (window.SOSHA_REFRESH) window.SOSHA_REFRESH();
    });
  }

  window.SoshaTrips = {
    TRIP_XP,
    render,
    init() { bindForm(); render(); },
    list: () => (api() ? trips() : []),
  };
})();
