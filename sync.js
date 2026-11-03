/* 공유 저장소: Claude 아티팩트에서만 동작해요.
 * 편집자(지쏘, 시아)만 저장할 수 있고, 다른 사람은 보기만 해요.
 * 한 명이 바꾸면 다른 사람 화면에도 바로 반영돼요. GitHub Pages에서는 아무것도 하지 않아요. */
(() => {
  "use strict";
  const PATH = "shared/board";
  let db = null, ref = null, canWrite = false, ready = false;
  let writing = false, queued = null, timer = null, lastSent = "";

  function banner(text, kind) {
    let el = document.getElementById("syncBanner");
    if (!el) {
      el = document.createElement("div");
      el.id = "syncBanner";
      el.className = "sync-banner";
      el.setAttribute("role", "status");
      const main = document.getElementById("main");
      main.insertBefore(el, main.firstChild);
    }
    el.textContent = text;
    el.dataset.kind = kind || "";
    el.hidden = !text;
  }

  async function flush() {
    if (writing || queued == null) return;
    writing = true;
    const body = queued; queued = null;
    try {
      await ref.set({ state: JSON.parse(body), at: Date.now() });
      lastSent = body;
    } catch (e) {
      if (e && e.code === "invalid_argument") { canWrite = false; banner("보기 전용이에요. 바꾼 내용은 이 기기에만 남아요.", "ro"); }
      else banner("공유 저장에 실패했어요. 잠시 뒤 다시 바꾸면 저장돼요.", "warn");
    } finally {
      writing = false;
      if (queued != null) flush();
    }
  }

  /* 사진은 공유 문서에 넣기엔 커서, 따로 업로드하고 주소만 저장해요 */
  async function uploadPhoto(dataUrl) {
    try {
      const assets = await window.claude.use("assets");
      if (!assets) return dataUrl;
      const blob = await (await fetch(dataUrl)).blob();
      const r = await assets.upload(blob);
      return r.url;
    } catch { return dataUrl; }
  }

  window.SoshaSync = {
    active: () => ready,
    canWrite: () => canWrite,
    uploadPhoto: null,
    push(state) {
      if (!ready || !canWrite || !ref) return;
      // 기기에만 있는 사진(data:)은 공유 문서 크기 한도 때문에 빼고 보내요
      const body = JSON.stringify(state, (k, v) => (typeof v === "string" && v.startsWith("data:image") ? undefined : v));
      if (body === lastSent) return;
      queued = body;
      clearTimeout(timer);
      timer = setTimeout(flush, 700);
    },
  };

  async function start() {
    if (!window.claude || typeof window.claude.use !== "function") return;
    db = await window.claude.use("db").catch(() => null);
    if (!db) return;
    const user = await window.claude.use("user").catch(() => null);
    canWrite = user ? await user.canEdit().catch(() => false) : false;
    window.SoshaSync.uploadPhoto = canWrite ? uploadPhoto : null;
    ref = db.doc(PATH);
    banner("공유 기록을 불러오는 중이에요…", "");
    const t = setTimeout(() => banner("공유 기록에 아직 연결하지 못했어요. 지금 보이는 건 이 기기의 기록이에요.", "warn"), 10000);
    let first = true;
    ref.onSnapshot((snap) => {
      if (!snap.metadata || !snap.metadata.fromCache) clearTimeout(t);
      if (snap.metadata && snap.metadata.hasPendingWrites) return;
      const api = window.SOSHA;
      if (snap.exists) {
        const data = snap.data();
        if (data && data.state) {
          const body = JSON.stringify(data.state);
          lastSent = body;
          if (body !== JSON.stringify(api.state)) api.replaceState(data.state);
        }
      } else if (first && canWrite) {
        // 처음 한 번: 지금 이 기기의 기록을 공유 기록으로 올려요
        ready = true;
        window.SoshaSync.push(api.state);
      }
      first = false;
      ready = true;
      banner(canWrite ? "" : "보기 전용이에요. 지쏘와 시아만 고칠 수 있어요.", canWrite ? "" : "ro");
    }, () => {
      clearTimeout(t);
      banner("공유 기록에 연결하지 못했어요. 지금 보이는 건 이 기기의 기록이에요.", "warn");
    });
  }
  start();
})();
