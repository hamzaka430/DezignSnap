/**
 * Page Helper AI / DezignSnap — Content Script
 *
 * Injects the floating collapsible HUD (Snip Area, Full Page, Direct Chat, Session Report)
 * and the AI chat panel with Thinking & Explanation support, horizontal positioning (left/center/right),
 * and viewport-constrained scrolling.
 */
(function () {
  let hudContainer, hudBar, hudCollapsedBadge;
  let panel, panelBody, panelTitle, modeToggleBtn, posToggleBtn, followupRow, followupInput, followupSend;

  let currentPosition = "right"; // "right" | "center" | "left"
  let isCollapsed = false;
  let currentAiMode = "direct"; // "direct" | "thinking"
  let hasActiveTurn = false;
  let isRequestInFlight = false;

  function isInjected() {
    return !!document.getElementById("ph-hud-container");
  }

  async function loadInitialPreferences() {
    try {
      const {
        hudPosition = "right",
        hudCollapsed = false,
        aiMode = "direct",
      } = await chrome.storage.local.get(["hudPosition", "hudCollapsed", "aiMode"]);

      currentPosition = hudPosition;
      isCollapsed = !!hudCollapsed;
      currentAiMode = aiMode;

      applyPositionClass(currentPosition);
      applyCollapseState(isCollapsed);
      updateAiModeUI(currentAiMode);
    } catch (_) {}
  }

  function applyPositionClass(pos) {
    currentPosition = pos;
    const targets = [hudContainer, panel].filter(Boolean);
    targets.forEach((el) => {
      el.classList.remove("ph-pos-right", "ph-pos-center", "ph-pos-left");
      el.classList.add("ph-pos-" + pos);
    });
  }

  function applyCollapseState(collapsed) {
    isCollapsed = collapsed;
    if (hudContainer) {
      if (collapsed) {
        hudContainer.classList.add("ph-collapsed");
      } else {
        hudContainer.classList.remove("ph-collapsed");
      }
    }
  }

  function updateAiModeUI(mode) {
    currentAiMode = mode;
    if (modeToggleBtn) {
      if (mode === "thinking") {
        modeToggleBtn.textContent = "🧠 Thinking";
        modeToggleBtn.title = "Current: Thinking & Explanation Mode. Click to switch to Direct Answer.";
        modeToggleBtn.classList.add("ph-active-mode");
      } else {
        modeToggleBtn.textContent = "⚡ Direct";
        modeToggleBtn.title = "Current: Fast Direct Mode. Click to switch to Thinking & Explanation.";
        modeToggleBtn.classList.remove("ph-active-mode");
      }
    }
  }

  function cyclePosition() {
    const order = ["right", "center", "left"];
    const nextIdx = (order.indexOf(currentPosition) + 1) % order.length;
    const nextPos = order[nextIdx];
    applyPositionClass(nextPos);
    chrome.storage.local.set({ hudPosition: nextPos });
  }

  function injectUI() {
    if (isInjected()) return;

    // --- HUD Container ---
    hudContainer = document.createElement("div");
    hudContainer.id = "ph-hud-container";
    hudContainer.className = "ph-pos-" + currentPosition;
    if (isCollapsed) hudContainer.classList.add("ph-collapsed");

    // Expanded HUD Bar
    hudBar = document.createElement("div");
    hudBar.id = "ph-hud-bar";
    hudBar.innerHTML =
      '<div class="ph-hud-brand">' +
      '<span class="ph-brand-dot"></span>' +
      '<span>DezignSnap</span>' +
      '</div>' +
      '<button id="ph-action-snip" type="button" class="ph-hud-btn ph-hud-btn-primary" title="Select area to analyze (Alt+S)">' +
      '🎯 Snip Area' +
      '</button>' +
      '<button id="ph-action-full" type="button" class="ph-hud-btn" title="Capture & analyze visible screen (Alt+A)">' +
      '📸 Full Page' +
      '</button>' +
      '<button id="ph-action-chat" type="button" class="ph-hud-btn" title="Chat directly with AI without any screenshot">' +
      '💬 Direct Chat' +
      '</button>' +
      '<button id="ph-action-export" type="button" class="ph-hud-btn" title="Export session transcript & PDF report">' +
      '📄 Report' +
      '</button>' +
      '<button id="ph-action-pos" type="button" class="ph-hud-icon-btn" title="Cycle position: Right / Center / Left">⇋</button>' +
      '<button id="ph-action-collapse" type="button" class="ph-hud-icon-btn" title="Collapse HUD">✕</button>';

    // Collapsed Mini Badge
    hudCollapsedBadge = document.createElement("div");
    hudCollapsedBadge.id = "ph-hud-collapsed-badge";
    hudCollapsedBadge.innerHTML =
      '<button id="ph-hud-expand-btn" type="button" class="ph-hud-badge-btn" title="Expand DezignSnap Toolbar">' +
      '<span class="ph-brand-dot"></span>' +
      '<span>⚡ DezignSnap</span>' +
      '<span class="ph-expand-icon">＋</span>' +
      '</button>';

    hudContainer.appendChild(hudBar);
    hudContainer.appendChild(hudCollapsedBadge);

    // --- Response / Chat Panel ---
    panel = document.createElement("div");
    panel.id = "ph-ai-panel";
    panel.className = "ph-hidden ph-pos-" + currentPosition;
    panel.innerHTML =
      '<div class="ph-panel-header">' +
      '  <div class="ph-panel-title-wrap">' +
      '    <span class="ph-brand-dot"></span>' +
      '    <span id="ph-panel-title">⚡ DezignSnap AI</span>' +
      '  </div>' +
      '  <div class="ph-panel-header-controls">' +
      '    <button id="ph-mode-toggle" type="button" class="ph-header-btn" title="Toggle AI Mode">⚡ Direct</button>' +
      '    <button id="ph-pos-toggle" type="button" class="ph-header-btn" title="Cycle Position (L / C / R)">⇋</button>' +
      '    <button id="ph-panel-close" type="button" class="ph-header-btn ph-close-btn" aria-label="Close">✕</button>' +
      '  </div>' +
      '</div>' +
      '<div id="ph-panel-body"></div>' +
      '<div id="ph-followup-row" class="ph-hidden">' +
      '  <input type="text" id="ph-followup-input" placeholder="Ask a question or follow-up..." />' +
      '  <button id="ph-followup-send" type="button" aria-label="Send">➤</button>' +
      '</div>';

    document.documentElement.appendChild(hudContainer);
    document.documentElement.appendChild(panel);

    panelBody = panel.querySelector("#ph-panel-body");
    panelTitle = panel.querySelector("#ph-panel-title");
    modeToggleBtn = panel.querySelector("#ph-mode-toggle");
    posToggleBtn = panel.querySelector("#ph-pos-toggle");
    followupRow = panel.querySelector("#ph-followup-row");
    followupInput = panel.querySelector("#ph-followup-input");
    followupSend = panel.querySelector("#ph-followup-send");

    // Hook HUD Bar Events
    hudBar.querySelector("#ph-action-snip").addEventListener("click", startRegionSelection);
    hudBar.querySelector("#ph-action-full").addEventListener("click", onSolveClick);
    hudBar.querySelector("#ph-action-chat").addEventListener("click", openDirectChat);
    hudBar.querySelector("#ph-action-export").addEventListener("click", onEndSessionClick);
    hudBar.querySelector("#ph-action-pos").addEventListener("click", cyclePosition);
    hudBar.querySelector("#ph-action-collapse").addEventListener("click", () => {
      applyCollapseState(true);
      chrome.storage.local.set({ hudCollapsed: true });
    });

    // Hook Collapsed Badge Events
    hudCollapsedBadge.querySelector("#ph-hud-expand-btn").addEventListener("click", () => {
      applyCollapseState(false);
      chrome.storage.local.set({ hudCollapsed: false });
    });

    // Hook Panel Events
    panel.querySelector("#ph-panel-close").addEventListener("click", () => {
      panel.classList.add("ph-hidden");
    });

    posToggleBtn.addEventListener("click", cyclePosition);

    modeToggleBtn.addEventListener("click", () => {
      const nextMode = currentAiMode === "direct" ? "thinking" : "direct";
      updateAiModeUI(nextMode);
      chrome.storage.local.set({ aiMode: nextMode });
    });

    followupSend.addEventListener("click", sendFollowup);
    followupInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") sendFollowup(e);
    });

    loadInitialPreferences();

    // Listen for extension commands & updates
    chrome.runtime.onMessage.addListener((message) => {
      if (!message) return;
      if (message.type === "TRIGGER_SNIP") {
        startRegionSelection({ isTrusted: true });
      } else if (message.type === "OPEN_DIRECT_CHAT") {
        openDirectChat({ isTrusted: true });
      } else if (message.type === "START_TEXT_QUERY") {
        resetPanel("Text Intelligence");
        appendUserBubble(`Selected: "${message.text}"`);
        appendLoading("🧠 Analyzing selected text...");
      } else if (message.type === "SHOW_RESULT") {
        handleResponse(message.result);
      }
    });

    // Listen for storage changes across tabs
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local") return;
      if (changes.hudPosition) applyPositionClass(changes.hudPosition.newValue);
      if (changes.hudCollapsed !== undefined) applyCollapseState(changes.hudCollapsed.newValue);
      if (changes.aiMode) updateAiModeUI(changes.aiMode.newValue);
    });
  }

  function resetPanel(titleText = "⚡ DezignSnap AI") {
    if (!panel) return;
    if (panelTitle) panelTitle.textContent = titleText;
    panelBody.innerHTML = "";
    followupRow.classList.add("ph-hidden");
    panel.classList.remove("ph-hidden");
    hasActiveTurn = false;
  }

  function openDirectChat(e) {
    if (e && !e.isTrusted) return;
    resetPanel("💬 Direct AI Chat");

    const welcome = document.createElement("div");
    welcome.className = "ph-welcome-bubble";
    welcome.innerHTML =
      '<strong>💬 Direct AI Chat</strong><br />' +
      'Ask any question, debug code, or brainstorm ideas without capturing any screenshot. Type below and hit Enter!';
    panelBody.appendChild(welcome);

    followupRow.classList.remove("ph-hidden");
    followupInput.placeholder = "Type your question here...";
    panel.classList.remove("ph-hidden");
    followupInput.focus();
  }

  function appendUserBubble(text) {
    const div = document.createElement("div");
    div.className = "ph-bubble ph-bubble-user";
    div.textContent = text;
    panelBody.appendChild(div);
    scrollToBottom();
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function appendAssistantBubble(rawText, confidence) {
    const wrap = document.createElement("div");
    wrap.className = "ph-bubble ph-bubble-ai";

    if (confidence) {
      const badge = document.createElement("span");
      badge.className = "ph-badge ph-badge-" + confidence.toLowerCase();
      badge.textContent = confidence + " confidence";
      wrap.appendChild(badge);
    }

    // Check for <thinking>...</thinking> block (Gemini / Reasoner format)
    const thinkingMatch = rawText.match(/<thinking>([\s\S]*?)<\/thinking>/i);
    let cleanText = rawText;

    if (thinkingMatch) {
      const thinkingText = thinkingMatch[1].trim();
      cleanText = rawText.replace(/<thinking>[\s\S]*?<\/thinking>/i, "").trim();

      const details = document.createElement("details");
      details.className = "ph-thinking-box";
      details.open = true; // Open by default for clarity

      const summary = document.createElement("summary");
      summary.className = "ph-thinking-summary";
      summary.innerHTML =
        '<span class="ph-thinking-icon">💭</span>' +
        '<span>Thinking Process (click to collapse)</span>' +
        '<span class="ph-thinking-badge">Reasoning</span>';

      const content = document.createElement("div");
      content.className = "ph-thinking-content";
      content.textContent = thinkingText;

      details.appendChild(summary);
      details.appendChild(content);
      wrap.appendChild(details);
    }

    const textDiv = document.createElement("div");
    textDiv.className = "ph-bubble-text";
    textDiv.textContent = cleanText || rawText;
    wrap.appendChild(textDiv);

    panelBody.appendChild(wrap);

    if (confidence === "Low") {
      const tip = document.createElement("div");
      tip.className = "ph-tip";
      tip.textContent = "💡 This answer has low confidence — try 🎯 Select Area to zoom into the specific region for a more reliable answer.";
      panelBody.appendChild(tip);
    }

    hasActiveTurn = true;
    scrollToBottom();
  }

  function appendLoading(text) {
    const div = document.createElement("div");
    div.className = "ph-bubble ph-bubble-loading";
    div.id = "ph-loading-bubble";
    div.textContent = text;
    panelBody.appendChild(div);
    scrollToBottom();
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
    scrollToBottom();
  }

  function scrollToBottom() {
    if (panelBody) {
      panelBody.scrollTop = panelBody.scrollHeight;
    }
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
      followupInput.placeholder = "Ask a follow-up question...";
    } else {
      appendError(response?.error || "Something went wrong.");
    }
  }

  function onSolveClick(e) {
    if (e && !e.isTrusted) return;
    if (isRequestInFlight) return;
    isRequestInFlight = true;
    resetPanel("📸 Full Page Solve");
    appendLoading("📸 Capturing screenshot and preparing your answer...");

    chrome.runtime.sendMessage({ type: "SOLVE_WITH_AI", aiMode: currentAiMode }, (response) => {
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
    if (e && !e.isTrusted) return;
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

      if (width < 12 || height < 12) return;

      const region = { x, y, width, height, dpr: window.devicePixelRatio || 1 };

      isRequestInFlight = true;
      resetPanel("🎯 Focused Region Solve");
      appendUserBubble("[Selected Area] 🎯");
      appendLoading("🔍 Analyzing the selected area...");

      chrome.runtime.sendMessage({ type: "SOLVE_WITH_AI_REGION", region, aiMode: currentAiMode }, (res) => {
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
    if (e && !e.isTrusted) return;
    if (isRequestInFlight) return;
    const q = followupInput.value.trim();
    if (!q) return;

    isRequestInFlight = true;
    appendUserBubble(q);
    followupInput.value = "";
    appendLoading(currentAiMode === "thinking" ? "🧠 Thinking deeply & formulating response..." : "⚡ Answering...");

    // If there is already an active conversation turn, use FOLLOWUP_WITH_AI.
    // If starting a fresh direct conversation without previous turn, use DIRECT_CHAT_WITH_AI.
    const msgType = hasActiveTurn ? "FOLLOWUP_WITH_AI" : "DIRECT_CHAT_WITH_AI";

    chrome.runtime.sendMessage({ type: msgType, question: q, aiMode: currentAiMode }, (res) => {
      isRequestInFlight = false;
      handleResponse(res);
    });
  }

  function onEndSessionClick(e) {
    if (e && !e.isTrusted) return;
    const exportBtn = hudBar.querySelector("#ph-action-export");
    if (!exportBtn) return;
    exportBtn.disabled = true;
    const original = exportBtn.textContent;
    exportBtn.textContent = "⏳ Generating...";

    chrome.runtime.sendMessage({ type: "OPEN_SESSION_EXPORT" }, () => {
      exportBtn.disabled = false;
      exportBtn.textContent = original;
    });
  }

  // ---------- Self-healing injection ----------
  injectUI();

  const observer = new MutationObserver(() => {
    if (!isInjected()) injectUI();
  });
  observer.observe(document.documentElement, { childList: true, subtree: false });

  setInterval(() => {
    if (!isInjected()) injectUI();
  }, 4000);

  window.addEventListener("load", () => {
    if (!isInjected()) injectUI();
  });
})();
