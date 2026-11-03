/* 캠핑 기록: 다녀온 캠핑을 추가하고, 배운 점을 보드에 넣고, 사진을 남기고, 경험치를 받아요 */
(() => {
  "use strict";
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const won = (n) => (n ? Number(n).toLocaleString("ko-KR") + "원" : "-");
  const TRIP_XP = 40;
  const MAX_PHOTOS = 4;

  function api() { return window.SOSHA; }
  function trips() { const st = api().state; st.trips = st.trips || []; return st.trips; }

  /* 사진은 긴 변 1024px JPEG로 줄여서 저장해요 */
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

  function tripCard(t, i) {
    const facts = [
      t.date && `<span class="badge">${esc(t.date)}</span>`,
      t.cost && `<span class="badge">${won(t.cost)}</span>`,
      t.weather && `<span class="badge">${esc(t.weather)}</span>`,
      t.temp !== "" && t.temp != null && `<span class="badge">최저 ${esc(t.temp)}℃</span>`,
      t.dog && '<span class="badge b-dog">강아지 동반</span>',
    ].filter(Boolean).join("");
    const needs = (t.needs || []).map((n) => `<li>${esc(n.text)}${n.added ? ' <span class="badge b-ok">보드에 추가됨</span>' : ` <button class="btn btn-sm" data-add="${i}:${esc(n.text)}">보드에 추가</button>`}</li>`).join("");
    return `<article class="panel-card trip-card">
      <div class="trip-top"><h3>${esc(t.place || "이름 없는 캠핑장")}</h3><span class="xp-tag">+${TRIP_XP} XP</span></div>
      <div class="meta">${facts}</div>
      ${t.link ? `<a class="hint" href="${esc(t.link)}" target="_blank" rel="noopener">캠핑장 링크</a>` : ""}
      ${t.photos && t.photos.length ? `<div class="photos">${t.photos.map((p) => `<img src="${p}" alt="${esc(t.place)} 캠핑 사진" loading="lazy">`).join("")}</div>` : ""}
      ${t.notes ? `<p class="trip-notes">${esc(t.notes)}</p>` : ""}
      ${needs ? `<div><strong class="trip-sub">다음엔 챙길 것</strong><ul class="needs">${needs}</ul></div>` : ""}
      <div class="trip-actions"><button class="btn btn-sm" data-edit="${i}">고치기</button><button class="btn btn-sm btn-danger" data-del="${i}">삭제</button></div>
    </article>`;
  }

  function render() {
    const root = document.getElementById("trips");
    if (!root || !api()) return;
    const list = trips();
    root.innerHTML = `
      <div class="section-head"><h2>다녀온 캠핑</h2><button class="btn btn-primary" id="tripAdd"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>캠핑 기록 추가</button></div>
      ${list.length ? `<div class="trip-list">${list.map(tripCard).join("")}</div>` : '<div class="empty">아직 추가한 캠핑이 없어요. 다녀오면 "캠핑 기록 추가"를 눌러 남겨 보세요. 한 번 다녀올 때마다 40 XP를 받아요.</div>'}`;
    root.querySelector("#tripAdd").onclick = () => openForm(null);
    root.querySelectorAll("[data-edit]").forEach((b) => (b.onclick = () => openForm(+b.dataset.edit)));
    root.querySelectorAll("[data-del]").forEach((b) => (b.onclick = () => {
      if (b.dataset.armed !== "1") { b.dataset.armed = "1"; b.textContent = "한 번 더 누르면 삭제"; setTimeout(() => { b.dataset.armed = ""; b.textContent = "삭제"; }, 3000); return; }
      list.splice(+b.dataset.del, 1); persist();
    }));
    root.querySelectorAll("[data-add]").forEach((b) => (b.onclick = () => {
      const [i, ...rest] = b.dataset.add.split(":");
      const text = rest.join(":");
      const t = list[+i];
      api().state.custom.push({ id: "c" + Date.now(), custom: true, name: text, cat: "life", status: "todo", pri: 1, spec: `${t.place || "캠핑"}에서 아쉬웠던 것`, why: t.notes || "", q: text, newPrice: "", usedPrice: "" });
      const n = t.needs.find((x) => x.text === text); if (n) n.added = true;
      persist();
    }));
  }

  function persist() {
    try { api().save(); } catch { /* 저장 공간 부족 */ }
    render();
    if (window.SOSHA_REFRESH) window.SOSHA_REFRESH();
  }

  /* ---------- 입력 폼 ---------- */
  let editingIdx = null, photos = [];
  function openForm(idx) {
    const dlg = document.getElementById("tripDlg");
    editingIdx = idx;
    const t = idx == null ? { date: new Date().toISOString().slice(0, 10), place: "", link: "", cost: "", weather: "", temp: "", dog: false, notes: "", needs: [], photos: [] } : trips()[idx];
    photos = (t.photos || []).slice();
    document.getElementById("tripTitle").textContent = idx == null ? "캠핑 기록 추가" : "캠핑 기록 고치기";
    document.getElementById("tripBody").innerHTML = `
      <div class="grid2">
        <label class="field"><span>날짜</span><input type="text" id="tDate" value="${esc(t.date)}" placeholder="2026-11-15"></label>
        <label class="field"><span>캠핑장 이름</span><input type="text" id="tPlace" value="${esc(t.place)}" placeholder="예: 집 앞 OO캠핑장" required></label>
      </div>
      <label class="field"><span>캠핑장 링크 (선택)</span><input type="text" id="tLink" value="${esc(t.link)}" placeholder="https://"></label>
      <div class="grid2">
        <label class="field"><span>쓴 돈 (원)</span><input type="number" inputmode="numeric" id="tCost" value="${esc(t.cost)}" placeholder="50000"></label>
        <label class="field"><span>날씨</span><select id="tWeather">${["", "맑음", "흐림", "비", "눈", "바람 강함"].map((w) => `<option ${w === t.weather ? "selected" : ""} value="${w}">${w || "-"}</option>`).join("")}</select></label>
        <label class="field"><span>밤 최저기온 (℃)</span><input type="number" inputmode="numeric" id="tTemp" value="${esc(t.temp)}" placeholder="2"></label>
        <label class="toggle"><input type="checkbox" id="tDog" ${t.dog ? "checked" : ""}> 강아지랑 같이 갔어요</label>
      </div>
      <label class="field"><span>배운 점, 아쉬웠던 점</span><textarea id="tNotes" placeholder="예: 새벽에 결로가 심했어요. 텐트 문을 조금 열어둘 걸.">${esc(t.notes)}</textarea></label>
      <label class="field"><span>다음엔 챙길 것 (한 줄에 하나, 나중에 보드에 바로 추가할 수 있어요)</span><textarea id="tNeeds" placeholder="예:&#10;결로 닦을 수건&#10;텐트 안 슬리퍼">${esc((t.needs || []).filter((n) => !n.added).map((n) => n.text).join("\n"))}</textarea></label>
      <div class="field"><span>사진 (최대 ${MAX_PHOTOS}장, 이 기기에만 저장돼요)</span>
        <div class="photos" id="tPhotos"></div>
        <label class="btn btn-sm" style="justify-self:start">사진 고르기<input type="file" id="tFile" accept="image/*" multiple hidden></label>
      </div>`;
    const drawPhotos = () => {
      document.getElementById("tPhotos").innerHTML = photos.map((p, i) => `<div class="ph"><img src="${p}" alt="선택한 사진 ${i + 1}"><button type="button" class="icon-btn" data-rm="${i}" aria-label="사진 ${i + 1} 빼기"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>`).join("");
      document.querySelectorAll("#tPhotos [data-rm]").forEach((b) => (b.onclick = () => { photos.splice(+b.dataset.rm, 1); drawPhotos(); }));
    };
    drawPhotos();
    document.getElementById("tFile").onchange = async (e) => {
      for (const f of [...e.target.files].slice(0, MAX_PHOTOS - photos.length)) {
        try { photos.push(await shrink(f)); } catch { /* 읽지 못한 사진은 건너뛰어요 */ }
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
      const prev = editingIdx == null ? null : trips()[editingIdx];
      const kept = prev ? (prev.needs || []).filter((n) => n.added) : [];
      const t = {
        date: v("tDate"), place: v("tPlace") || "이름 없는 캠핑장", link: v("tLink"), cost: v("tCost") ? +v("tCost") : "",
        weather: v("tWeather"), temp: v("tTemp") === "" ? "" : +v("tTemp"), dog: document.getElementById("tDog").checked,
        notes: v("tNotes"), needs: kept.concat(v("tNeeds").split("\n").map((x) => x.trim()).filter(Boolean).map((text) => ({ text, added: false }))),
        photos: photos.slice(),
      };
      if (editingIdx == null) trips().unshift(t); else trips()[editingIdx] = t;
      try { api().save(); localStorage.setItem("sosha-camp-v1", JSON.stringify(api().state)); }
      catch { t.photos = []; api().save(); const n = document.getElementById("toast"); if (n) { n.textContent = "저장 공간이 부족해서 사진은 빼고 저장했어요"; n.classList.add("show"); setTimeout(() => n.classList.remove("show"), 3000); } }
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
