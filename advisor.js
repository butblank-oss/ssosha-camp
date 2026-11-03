/* AI 베테랑 캠퍼: Claude 아티팩트 안에서만 동작해요 (sample 기능). GitHub Pages에서는 아티팩트 링크를 안내해요. */
(() => {
  "use strict";
  const ARTIFACT_URL = window.SOSHA_ARTIFACT_URL || "";
  const root = document.getElementById("advisorRoot");
  if (!root) return;
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const QUICK = [
    "다음에 뭘 사는 게 좋을까요? 예산 10만 원이에요",
    "이번 주말 11월 캠핑, 빠뜨린 짐 없는지 체크해줘요",
    "미니 컨트리맨 트렁크에 짐 싣는 순서를 알려줘요",
    "강아지 두 마리랑 겨울 캠핑할 때 꼭 챙길 것과 주의할 점은요?",
    "원터치 텐트로 영하권 캠핑 가도 될까요?",
  ];
  const turns = [];
  let sample = null, ctl = null, busy = false;

  function context() {
    const api = window.SOSHA;
    if (!api) return "";
    const items = api.allItems();
    const pick = (f) => items.filter(f).map((i) => i.name + (i.purchase && i.purchase.price ? `(${i.purchase.price}원, ${i.purchase.where || ""})` : "")).join(", ");
    const st = api.state.pack || {};
    return [
      "캠퍼: 여자 2명, 소형견 2마리(가끔 동반). 집 근처 오토캠핑, 11월부터 동계 입문.",
      "차: 미니 컨트리맨 F60(트렁크 약 450L), 보통 1대로 이동." + (st.fold ? " 뒷좌석 접기 사용." : ""),
      "텐트: 로티캠프 COM4 원터치 4인(4.2kg, 내수압 3000mm, 피크닉용에 가까움).",
      "첫 캠핑에서 겪은 일: 부탄가스 화력 저하(화로 옆에서 데움), 가위 없음, 어두워서 조리 실패, 전기 릴선과 장판이 없어 추움, 어두워서 철수 못 함, 팩질 안 함.",
      "가진 것: " + pick((i) => i.status === "owned" || i.status === "bought"),
      "알아보는 중: " + pick((i) => i.status === "research"),
      "아직 필요한 필수품: " + pick((i) => i.status === "todo" && i.pri === 1),
    ].join("\n");
  }
  function promptFor(question) {
    return [
      "너는 한국에서 15년째 오토캠핑과 동계 캠핑을 해온 베테랑 캠퍼야. 반려견 동반 캠핑 경험도 많아.",
      "아래 캠퍼 정보를 보고 질문에 답해. 해요체로, 친근하지만 짧고 구체적으로. 제품은 범주와 스펙(용량, 무게, 크기, 가격대) 위주로 말하고, 모르는 가격이나 모델명은 지어내지 마.",
      "안전(일산화탄소, 가스, 화재, 전기 용량)은 꼭 짚어줘. 목록은 5개 이하로. 마크다운 제목은 쓰지 말고 짧은 문단과 '-' 목록만 써.",
      "",
      "[캠퍼 정보]",
      context(),
      "",
      "[대화]",
      ...turns.slice(-6).map((t) => (t.role === "user" ? "캠퍼: " : "베테랑: ") + t.content),
      "캠퍼: " + question,
    ].join("\n");
  }
  function fmt(text) {
    return esc(text).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/^- (.*)$/gm, "<li>$1</li>").replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`).replace(/\n{2,}/g, "<br><br>").replace(/\n/g, " ");
  }
  function renderLog(streaming) {
    const log = root.querySelector("#advLog");
    log.innerHTML = turns.map((t) => `<div class="msg ${t.role}">${t.role === "user" ? esc(t.content) : fmt(t.content)}</div>`).join("") + (streaming !== undefined ? `<div class="msg assistant">${streaming ? fmt(streaming) : '<span class="thinking">생각하는 중…</span>'}</div>` : "");
    log.scrollTop = log.scrollHeight;
  }
  async function ask(q) {
    q = q.trim();
    if (!q || busy || !sample) return;
    busy = true; setBusy(true);
    const prompt = promptFor(q);
    turns.push({ role: "user", content: q });
    renderLog("");
    ctl = new AbortController();
    try {
      const { text } = await sample(prompt, { signal: ctl.signal, cache: false, onText: ({ text }) => renderLog(text) });
      turns.push({ role: "assistant", content: text });
    } catch (e) {
      const msg = {
        not_granted: "Claude 사용을 허용하지 않아서 답할 수 없어요. 아티팩트 메뉴의 권한에서 허용할 수 있어요.",
        rate_limited: "질문이 많아서 잠깐 쉬어야 해요. 1분쯤 뒤에 다시 물어봐 주세요.",
        aborted: "답변을 멈췄어요.",
      }[e && e.code] || "답을 받지 못했어요. 잠시 뒤에 다시 물어봐 주세요.";
      turns.push({ role: "assistant", content: (e && e.text ? e.text + "\n\n" : "") + msg });
    } finally {
      busy = false; ctl = null; setBusy(false); renderLog();
    }
  }
  function setBusy(b) {
    root.querySelector("#advSend").disabled = b;
    root.querySelector("#advStop").hidden = !b;
    root.querySelectorAll("[data-q]").forEach((x) => (x.disabled = b));
  }

  /* ---------- GitHub Pages: 이슈로 묻고 Actions의 Claude가 답해요 ---------- */
  const REPO = "butblank-oss/ssosha-camp";
  const PREFIX = "[AI 캠퍼]";
  async function loadThreads() {
    const box = root.querySelector("#ghLog");
    box.innerHTML = '<p class="hint">질문과 답을 불러오는 중…</p>';
    try {
      const r = await fetch(`https://api.github.com/repos/${REPO}/issues?state=all&per_page=15`, { headers: { Accept: "application/vnd.github+json" } });
      if (!r.ok) throw new Error(r.status);
      const issues = (await r.json()).filter((i) => !i.pull_request && i.title.startsWith(PREFIX));
      if (!issues.length) { box.innerHTML = '<p class="hint">아직 질문이 없어요. 위에서 첫 질문을 보내보세요.</p>'; return; }
      const threads = await Promise.all(issues.map(async (i) => {
        let comments = [];
        if (i.comments) { const c = await fetch(i.comments_url); if (c.ok) comments = await c.json(); }
        return { i, comments };
      }));
      box.innerHTML = threads.map(({ i, comments }) => {
        const q = (i.body || "").split("\n---")[0].trim();
        const ans = comments.map((c) => `<div class="msg assistant">${fmt(c.body.replace(/\n---\n_AI 베테랑 캠퍼[^\n]*$/, ""))}</div>`).join("");
        return `<div class="thread"><div class="msg user">${esc(q || i.title.replace(PREFIX, ""))}</div>${ans || '<div class="msg assistant"><span class="thinking">답을 쓰는 중이에요. 1~2분 뒤에 새로고침해 주세요.</span></div>'}<a class="hint" href="${esc(i.html_url)}" target="_blank" rel="noopener">GitHub에서 보기</a></div>`;
      }).join("");
    } catch {
      box.innerHTML = '<p class="hint">질문 목록을 불러오지 못했어요. 잠시 뒤에 새로고침해 주세요.</p>';
    }
  }
  function renderUnavailable() {
    root.innerHTML = `<div class="panel-card adv">
      <div class="adv-head"><div><h2>AI 베테랑 캠퍼</h2>
        <p class="hint">질문을 보내면 GitHub에 질문이 올라가고, 1~2분 안에 Claude가 답을 달아요. 보내기를 누르면 GitHub 화면이 열리니 아래 '이슈 만들기'(Submit new issue)를 눌러 주세요.</p></div></div>
      <div class="adv-quick">${QUICK.map((q) => `<button class="chip" data-q="${esc(q)}">${esc(q)}</button>`).join("")}</div>
      <form class="adv-form" id="ghForm">
        <label class="sr" for="ghInput">질문</label>
        <textarea id="ghInput" rows="3" placeholder="예: 전기장판은 어떤 걸 사야 해요?"></textarea>
        <div class="adv-actions"><button type="button" class="btn" id="ghRefresh">새로고침</button><button class="btn btn-primary">GitHub로 질문 보내기</button></div>
      </form>
      <div class="adv-log" id="ghLog" aria-live="polite"></div>
      ${ARTIFACT_URL ? `<p class="hint">바로바로 대화하고 싶으면 <a href="${esc(ARTIFACT_URL)}" target="_blank" rel="noopener">Claude에서 열기</a>를 쓰세요. 그쪽은 기다릴 필요 없이 실시간으로 답해요.</p>` : ""}
    </div>`;
    const input = root.querySelector("#ghInput");
    root.querySelectorAll("[data-q]").forEach((b) => (b.onclick = () => { input.value = b.dataset.q; input.focus(); }));
    root.querySelector("#ghRefresh").onclick = loadThreads;
    root.querySelector("#ghForm").onsubmit = (e) => {
      e.preventDefault();
      const q = input.value.trim();
      if (!q) { input.focus(); return; }
      const title = `${PREFIX} ${q.length > 40 ? q.slice(0, 40) + "…" : q}`;
      const body = `${q}\n\n---\n캠퍼 정보 (사이트에서 자동으로 붙였어요)\n${context()}`.slice(0, 6000);
      const url = `https://github.com/${REPO}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
      const a = document.createElement("a"); a.href = url; a.target = "_blank"; a.rel = "noopener"; a.click();
      input.value = "";
      setTimeout(loadThreads, 60000);
    };
    loadThreads();
  }
  function renderChat() {
    root.innerHTML = `<div class="panel-card adv">
      <div class="adv-head"><div><h2>AI 베테랑 캠퍼</h2><p class="hint">보드에 적힌 장비, 차량, 강아지 정보를 보고 답해요. 처음 물어볼 때 Claude 사용 허락을 한 번 물어봐요.</p></div></div>
      <div class="adv-quick">${QUICK.map((q) => `<button class="chip" data-q="${esc(q)}">${esc(q)}</button>`).join("")}</div>
      <div class="adv-log" id="advLog" aria-live="polite"><div class="msg assistant">안녕하세요! 첫 캠핑 이야기 잘 봤어요. 장비, 짐 싣기, 강아지랑 겨울 캠핑, 뭐든 물어보세요.</div></div>
      <form class="adv-form" id="advForm">
        <label class="sr" for="advInput">질문</label>
        <textarea id="advInput" rows="2" placeholder="예: 전기장판은 어떤 걸 사야 해요?"></textarea>
        <div class="adv-actions"><button type="button" class="btn" id="advStop" hidden>멈추기</button><button class="btn btn-primary" id="advSend">물어보기</button></div>
      </form>
    </div>`;
    root.querySelector("#advForm").onsubmit = (e) => { e.preventDefault(); const t = root.querySelector("#advInput"); const v = t.value; t.value = ""; ask(v); };
    root.querySelector("#advInput").onkeydown = (e) => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); root.querySelector("#advForm").requestSubmit(); } };
    root.querySelector("#advStop").onclick = () => ctl && ctl.abort();
    root.querySelectorAll("[data-q]").forEach((b) => (b.onclick = () => ask(b.dataset.q)));
  }

  renderUnavailable();
  if (window.claude && typeof window.claude.use === "function") {
    window.claude.use("sample").then((s) => { if (s) { sample = s; renderChat(); } }).catch(() => {});
  }
})();
