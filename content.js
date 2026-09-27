/**
 * Page Helper AI — Content Script
 *
 * Injects the floating UI (Solve with AI, Select Area, End Session, and the
 * answer panel) into every page. Because many modern sites use client-side
 * routing / dynamic DOM updates, injected elements can occasionally be
 * removed by the host page's own scripts. To guarantee the UI is always
 * present, this script self-heals via a MutationObserver plus a low-cost
 * periodic fallback check.
 */
(function () {
  const IDS = ["ph-ai-btn", "ph-region-btn", "ph-end-btn", "ph-ai-panel"];

  let panelBody, followupRow, followupInput, followupSend;

  function isInjected() {
    return !!document.getElementById("ph-ai-btn");
  }

  function injectUI() {
    if (isInjected()) return;

    const btn = document.createElement("button");
    btn.id = "ph-ai-btn";
    btn.type = "button";
    btn.textContent = "⚡ Snip & Ask";

    const regionBtn = document.createElement("button");
    regionBtn.id = "ph-region-btn";
    regionBtn.type = "button";
    regionBtn.textContent = "🎯 Snip Area [Alt+S]";

    const endBtn = document.createElement("button");
    endBtn.id = "ph-end-btn";
    endBtn.type = "button";
    endBtn.textContent = "📄 End Session";

    const panel = document.createElement("div");
    panel.id = "ph-ai-panel";
    panel.className = "ph-hidden";
    panel.innerHTML =
      '<div class="ph-panel-header">' +
      "<span>⚡ DezignSnap AI</span>" +
      '<button id="ph-panel-close" type="button" aria-label="Close">✕</button>' +
      "</div>" +
      '<div id="ph-panel-body"></div>' +
      '<div id="ph-followup-row" class="ph-hidden">' +
      '<input type="text" id="ph-followup-input" placeholder="Ask a follow-up question..." />' +
      '<button id="ph-followup-send" type="button" aria-label="Send">➤</button>' +
      "</div>";

    document.documentElement.appendChild(btn);
    document.documentElement.appendChild(regionBtn);
    document.documentElement.appendChild(endBtn);
    document.documentElement.appendChild(panel);

    panelBody = panel.querySelector("#ph-panel-body");
    followupRow = panel.querySelector("#ph-followup-row");
    followupInput = panel.querySelector("#ph-followup-input");
    followupSend = panel.querySelector("#ph-followup-send");

    panel.querySelector("#ph-panel-close").addEventListener("click", () => {
      panel.classList.add("ph-hidden");
    });

    btn.addEventListener("click", onSolveClick);
    regionBtn.addEventListener("click", startRegionSelection);
    endBtn.addEventListener("click", onEndSessionClick);
    followupSend.addEventListener("click", sendFollowup);
    followupInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") sendFollowup(e);
    });

    // Listen for extension commands (e.g. Alt+S hotkey or right-click text query)
    chrome.runtime.onMessage.addListener((message) => {
      if (message && message.type === "TRIGGER_SNIP") {
        startRegionSelection({ isTrusted: true });
      } else if (message && message.type === "START_TEXT_QUERY") {
        resetPanel();
        appendUserBubble(`Selected: "${message.text}"`);
        appendLoading("🧠 Analyzing selected text...");
      } else if (message && message.type === "SHOW_RESULT") {
        handleResponse(message.result);
      }
    });
  }

  function resetPanel() {
    const panel = document.getElementById("ph-ai-panel");
    if (!panel) return;
    panelBody.innerHTML = "";
    followupRow.classList.add("ph-hidden");
    panel.classList.remove("ph-hidden");
  }

  function appendUserBubble(text) {
    const div = document.createElement("div");
    div.className = "ph-bubble ph-bubble-user";
    div.textContent = text;
    panelBody.appendChild(div);
    panelBody.scrollTop = panelBody.scrollHeight;
  }

  function appendAssistantBubble(text, confidence) {
    const wrap = document.createElement("div");
    wrap.className = "ph-bubble ph-bubble-ai";

    if (confidence) {
      const badge = document.createElement("span");
      badge.className = "ph-badge ph-badge-" + confidence.toLowerCase();
      badge.textContent = confidence + " confidence";
      wrap.appendChild(badge);
    }

    const textDiv = document.createElement("div");
    textDiv.className = "ph-bubble-text";
    textDiv.textContent = text;
    wrap.appendChild(textDiv);

    panelBody.appendChild(wrap);

    if (confidence === "Low") {
      const tip = document.createElement("div");
      tip.className = "ph-tip";
      tip.textContent = "💡 This answer has low confidence — try 🎯 Select Area to zoom into the specific part for a more reliable answer.";
      panelBody.appendChild(tip);
    }

    panelBody.scrollTop = panelBody.scrollHeight;
  }

  function appendLoading(text) {
    const div = document.createElement("div");
    div.className = "ph-bubble ph-bubble-loading";
    div.id = "ph-loading-bubble";
    div.textContent = text;
    panelBody.appendChild(div);
    panelBody.scrollTop = panelBody.scrollHeight;
  }

  function clearLoading() {
    const el = panelBody.querySelector("#ph-loading-bubble");
    if (el) el.remove();
  }

  function appendError(text) {
    clearLoading();
    const div = document.createElement("div");
    div.className = "ph-bubble ph-bubble-error";
    div.textContent = "❌ " + text;
    panelBody.appendChild(div);
    panelBody.scrollTop = panelBody.scrollHeight;
  }

  function handleResponse(response) {
    clearLoading();
    if (chrome.runtime.lastError) {
      appendError(chrome.runtime.lastError.message);
      return;
    }
    if (response && response.success) {
      appendAssistantBubble(response.answer, response.confidence);
      followupRow.classList.remove("ph-hidden");
    } else {
      appendError(response?.error || "Something went wrong.");
    }
  }

  let isRequestInFlight = false;

  function onSolveClick(e) {
    if (e && !e.isTrusted) return; // Prevent malicious host-page script clickjacking
    if (isRequestInFlight) return;
    isRequestInFlight = true;
    resetPanel();
    appendLoading("📸 Capturing screenshot and preparing your answer...");
    chrome.runtime.sendMessage({ type: "SOLVE_WITH_AI" }, (response) => {
      isRequestInFlight = false;
      if (response && response.success && response.instructionUsed) {
        clearLoading();
        appendUserBubble(response.instructionUsed);
        appendAssistantBubble(response.answer, response.confidence);
        followupRow.classList.remove("ph-hidden");
      } else {
        handleResponse(response);
      }
    });
  }

  function startRegionSelection(e) {
    if (e && !e.isTrusted) return; // Prevent malicious host-page script clickjacking
    if (isRequestInFlight) return;
    const overlay = document.createElement("div");
    overlay.id = "ph-select-overlay";

    const box = document.createElement("div");
    box.id = "ph-select-box";
    box.className = "ph-hidden";
    overlay.appendChild(box);

    let startX = 0, startY = 0, dragging = false;

    function onMouseDown(e) {
      if (e && !e.isTrusted) return;
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      box.style.left = startX + "px";
      box.style.top = startY + "px";
      box.style.width = "0px";
      box.style.height = "0px";
      box.classList.remove("ph-hidden");
    }

    function onMouseMove(e) {
      if (!dragging) return;
      const x = Math.min(startX, e.clientX);
      const y = Math.min(startY, e.clientY);
      const w = Math.abs(e.clientX - startX);
      const h = Math.abs(e.clientY - startY);
      box.style.left = x + "px";
      box.style.top = y + "px";
      box.style.width = w + "px";
      box.style.height = h + "px";
    }

    function onMouseUp(e) {
      if (e && !e.isTrusted) {
        cleanup();
        return;
      }
      dragging = false;
      const x = Math.min(startX, e.clientX);
      const y = Math.min(startY, e.clientY);
      const width = Math.abs(e.clientX - startX);
      const height = Math.abs(e.clientY - startY);
      cleanup();

      if (width < 12 || height < 12) return; // selection too small, ignore

      const region = { x, y, width, height, dpr: window.devicePixelRatio || 1 };

      isRequestInFlight = true;
      resetPanel();
      appendUserBubble("[Selected area] 🎯");
      appendLoading("🔍 Analyzing the selected area...");
      chrome.runtime.sendMessage({ type: "SOLVE_WITH_AI_REGION", region }, (res) => {
        isRequestInFlight = false;
        handleResponse(res);
      });
    }

    function onKeyDown(e) {
      if (e.key === "Escape") cleanup();
    }

    function cleanup() {
      overlay.removeEventListener("mousedown", onMouseDown);
      overlay.removeEventListener("mousemove", onMouseMove);
      overlay.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("keydown", onKeyDown);
      overlay.remove();
    }

    overlay.addEventListener("mousedown", onMouseDown);
    overlay.addEventListener("mousemove", onMouseMove);
    overlay.addEventListener("mouseup", onMouseUp);
    document.addEventListener("keydown", onKeyDown);

    document.documentElement.appendChild(overlay);
  }

  function sendFollowup(e) {
    if (e && !e.isTrusted) return; // Prevent malicious host-page script clickjacking
    if (isRequestInFlight) return;
    const q = followupInput.value.trim();
    if (!q) return;
    isRequestInFlight = true;
    appendUserBubble(q);
    followupInput.value = "";
    appendLoading("Thinking...");
    chrome.runtime.sendMessage({ type: "FOLLOWUP_WITH_AI", question: q }, (res) => {
      isRequestInFlight = false;
      handleResponse(res);
    });
  }

  function onEndSessionClick(e) {
    if (e && !e.isTrusted) return;
    const endBtn = document.getElementById("ph-end-btn");
    if (!endBtn) return;
    endBtn.disabled = true;
    const original = endBtn.textContent;
    endBtn.textContent = "⏳ Generating PDF...";
    chrome.runtime.sendMessage({ type: "OPEN_SESSION_EXPORT" }, () => {
      endBtn.disabled = false;
      endBtn.textContent = original;
    });
  }

  // ---------- Self-healing injection ----------
  // Some sites (SPAs, frameworks that re-render the DOM) can remove elements
  // they don't recognize. We watch for that and silently re-inject.

  injectUI();

  const observer = new MutationObserver(() => {
    if (!isInjected()) injectUI();
  });
  observer.observe(document.documentElement, { childList: true, subtree: false });

  // Low-cost fallback in case a mutation is missed (e.g. very rapid DOM rewrites).
  setInterval(() => {
    if (!isInjected()) injectUI();
  }, 4000);

  // Re-check after full load, in case document_idle fired before <html> existed
  // on an unusually slow-loading page.
  window.addEventListener("load", () => {
    if (!isInjected()) injectUI();
  });
})();
