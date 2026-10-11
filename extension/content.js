/**
 * Page Helper AI / DezignSnap — Content Script
 *
 * Injects the floating collapsible HUD (Snip Area, Full Page, Direct Chat, Session Report)
 * and the AI chat panel with Thinking & Explanation support, horizontal positioning (left/center/right),
 * and viewport-constrained scrolling.
 */
(function () {
  const ICONS = {
    snip:
      '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:4px;" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="1" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="1" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="23" y2="12"/></svg>',
    position:
      '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>',
    close:
      '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    expand:
      '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    send:
      '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
    sidebarOutline:
      '<svg class="ph-side-icon ph-side-outline" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="3.5" width="19" height="17" rx="3.5"/><line x1="8.5" y1="3.5" x2="8.5" y2="20.5"/><polyline points="15.5 8.5 11.5 12 15.5 15.5"/></svg>',
    sidebarSolid:
      '<svg class="ph-side-icon ph-side-solid" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="2.5" y="3.5" width="4.5" height="17" rx="2" fill="currentColor"/><rect x="8.5" y="3.5" width="13" height="17" rx="2.5" fill="currentColor"/><polyline points="15.5 8.5 11.5 12 15.5 15.5" stroke="#4a154b" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>',
  };

  let hudContainer, hudBar, hudCollapsedBadge;
  let panel, panelBody, panelTitle, modeToggleBtn, posToggleBtn, followupRow, followupInput, followupSend;

  let currentPosition = "right"; // "right" | "center" | "left"
  let isCollapsed = false;
  let currentAiMode = "direct"; // "direct" | "thinking"
  let hasActiveTurn = false;
  let isRequestInFlight = false;

  let domObserver = null;
  let injectionIntervalId = null;

  function isContextValid() {
    try {
      return Boolean(typeof chrome !== "undefined" && chrome && chrome.runtime && chrome.runtime.id);
    } catch (_) {
      return false;
    }
  }

  function teardownOrphanedScript() {
    if (domObserver) {
      try {
        domObserver.disconnect();
      } catch (_) {}
      domObserver = null;
    }
    if (injectionIntervalId) {
      try {
        clearInterval(injectionIntervalId);
      } catch (_) {}
      injectionIntervalId = null;
    }
  }

  async function safeStorageGet(keys, defaults = {}) {
    if (!isContextValid()) {
      teardownOrphanedScript();
      return defaults;
    }
    try {
      const res = await chrome.storage.local.get(keys);
      return res || defaults;
    } catch (err) {
      if (String(err?.message || "").includes("Extension context invalidated")) {
        teardownOrphanedScript();
      }
      return defaults;
    }
  }

  function safeStorageSet(data) {
    if (!isContextValid()) {
      teardownOrphanedScript();
      return;
    }
    try {
      chrome.storage.local.set(data);
    } catch (err) {
      if (String(err?.message || "").includes("Extension context invalidated")) {
        teardownOrphanedScript();
      }
    }
  }

  function safeSendMessage(message, callback) {
    if (!isContextValid()) {
      teardownOrphanedScript();
      if (typeof callback === "function") {
        callback({
          success: false,
          error: "DezignSnap was updated or reloaded. Please refresh this page (F5) to continue.",
        });
      }
      return;
    }
    try {
      chrome.runtime.sendMessage(message, (res) => {
        try {
          if (chrome.runtime.lastError) {
            const errText = chrome.runtime.lastError.message || "Runtime communication error";
            if (errText.includes("Extension context invalidated")) {
              teardownOrphanedScript();
              if (typeof callback === "function") {
                callback({
                  success: false,
                  error: "DezignSnap was updated or reloaded. Please refresh this page (F5) to continue.",
                });
              }
              return;
            }
            if (typeof callback === "function") {
              callback({ success: false, error: errText });
            }
            return;
          }
        } catch (_) {
          teardownOrphanedScript();
          if (typeof callback === "function") {
            callback({
              success: false,
              error: "DezignSnap was updated or reloaded. Please refresh this page (F5) to continue.",
            });
          }
          return;
        }
        if (typeof callback === "function") {
          callback(res);
        }
      });
    } catch (err) {
      teardownOrphanedScript();
      if (typeof callback === "function") {
        callback({
          success: false,
          error: "DezignSnap was updated or reloaded. Please refresh this page (F5) to continue.",
        });
      }
    }
  }

  function isInjected() {
    return !!document.getElementById("ph-hud-container");
  }

  async function loadInitialPreferences() {
    try {
      const {
        hudPosition = "right",
        hudCollapsed = false,
        aiMode = "direct",
      } = await safeStorageGet(["hudPosition", "hudCollapsed", "aiMode"], {
        hudPosition: "right",
        hudCollapsed: false,
        aiMode: "direct",
      });

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
        modeToggleBtn.textContent = "Thinking";
        modeToggleBtn.title = "Current: Thinking & Explanation Mode. Click to switch to Direct Answer.";
        modeToggleBtn.classList.add("ph-active-mode");
      } else {
        modeToggleBtn.textContent = "Direct";
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
    safeStorageSet({ hudPosition: nextPos });
  }

  function injectUI() {
    if (!isContextValid()) {
      teardownOrphanedScript();
      return;
    }
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
      ICONS.snip +
      'Snip Area' +
      '</button>' +
      '<button id="ph-action-full" type="button" class="ph-hud-btn" title="Capture & analyze visible screen (Alt+A)">' +
      'Full Page' +
      '</button>' +
      '<button id="ph-action-chat" type="button" class="ph-hud-btn" title="Chat directly with AI without any screenshot">' +
      'Direct Chat' +
      '</button>' +
      '<button id="ph-action-export" type="button" class="ph-hud-btn" title="Export session transcript & PDF report">' +
      'Report' +
      '</button>' +
      '<button id="ph-action-pos" type="button" class="ph-hud-icon-btn" title="Cycle position: Right / Center / Left">' +
      ICONS.position +
      '</button>' +
      '<button id="ph-action-collapse" type="button" class="ph-hud-icon-btn ph-collapse-btn" title="Minimize to corner dock" aria-label="Minimize to corner dock">' +
      ICONS.sidebarOutline +
      ICONS.sidebarSolid +
      '</button>';

    // Collapsed Side Toggle Dock Tab with Sidebar Icon
    hudCollapsedBadge = document.createElement("div");
    hudCollapsedBadge.id = "ph-hud-collapsed-badge";
    hudCollapsedBadge.className = "ph-side-toggle";
    hudCollapsedBadge.setAttribute("role", "button");
    hudCollapsedBadge.setAttribute("tabindex", "0");
    hudCollapsedBadge.setAttribute("title", "Expand DezignSnap (Click to Open)");
    hudCollapsedBadge.setAttribute("aria-label", "Expand DezignSnap Toolbar");
    hudCollapsedBadge.innerHTML =
      '<div class="ph-side-toggle-tab">' +
      '  <div class="ph-side-toggle-icon-wrap">' +
      ICONS.sidebarOutline +
      ICONS.sidebarSolid +
      '  </div>' +
      '</div>';

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
      '    <span id="ph-panel-title">DezignSnap AI</span>' +
      '  </div>' +
      '  <div class="ph-panel-header-controls">' +
      '    <button id="ph-mode-toggle" type="button" class="ph-header-btn" title="Toggle AI Mode">Direct</button>' +
      '    <button id="ph-pos-toggle" type="button" class="ph-header-btn" title="Cycle Position (L / C / R)">' +
      ICONS.position +
      '</button>' +
      '    <button id="ph-panel-close" type="button" class="ph-header-btn ph-close-btn" aria-label="Close">' +
      ICONS.close +
      '</button>' +
      '  </div>' +
      '</div>' +
      '<div id="ph-panel-body"></div>' +
      '<div id="ph-followup-row" class="ph-hidden">' +
      '  <input type="text" id="ph-followup-input" placeholder="Ask a question or follow-up..." />' +
      '  <button id="ph-followup-send" type="button" aria-label="Send">' +
      ICONS.send +
      '</button>' +
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
      safeStorageSet({ hudCollapsed: true });
    });

    // Hook Collapsed Dock Events
    function expandToolbar() {
      applyCollapseState(false);
      safeStorageSet({ hudCollapsed: false });
    }

    hudCollapsedBadge.addEventListener("click", expandToolbar);
    hudCollapsedBadge.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        expandToolbar();
      }
    });

    // Hook Panel Events
    panel.querySelector("#ph-panel-close").addEventListener("click", () => {
      panel.classList.add("ph-hidden");
    });

    posToggleBtn.addEventListener("click", cyclePosition);

    modeToggleBtn.addEventListener("click", () => {
      const nextMode = currentAiMode === "direct" ? "thinking" : "direct";
      updateAiModeUI(nextMode);
      safeStorageSet({ aiMode: nextMode });
    });

    followupSend.addEventListener("click", sendFollowup);
    followupInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") sendFollowup(e);
    });

    loadInitialPreferences();

    // Listen for extension commands & updates safely
    try {
      if (isContextValid() && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener((message) => {
          if (!isContextValid()) {
            teardownOrphanedScript();
            return;
          }
          if (!message) return;
          if (message.type === "TRIGGER_SNIP") {
            startRegionSelection({ isTrusted: true });
          } else if (message.type === "OPEN_DIRECT_CHAT") {
            openDirectChat({ isTrusted: true });
          } else if (message.type === "START_TEXT_QUERY") {
            resetPanel("Text Intelligence");
            appendUserBubble(`Selected: "${message.text}"`);
            appendLoading("Analyzing selected text...");
          } else if (message.type === "SHOW_RESULT") {
            handleResponse(message.result);
          }
        });
      }
    } catch (_) {}

    // Listen for storage changes across tabs safely
    try {
      if (isContextValid() && chrome.storage && chrome.storage.onChanged) {
        chrome.storage.onChanged.addListener((changes, area) => {
          if (!isContextValid()) {
            teardownOrphanedScript();
            return;
          }
          if (area !== "local") return;
          if (changes.hudPosition) applyPositionClass(changes.hudPosition.newValue);
          if (changes.hudCollapsed !== undefined) applyCollapseState(changes.hudCollapsed.newValue);
          if (changes.aiMode) updateAiModeUI(changes.aiMode.newValue);
        });
      }
    } catch (_) {}
  }

  function resetPanel(titleText = "DezignSnap AI") {
    if (!panel) return;
    if (panelTitle) panelTitle.textContent = titleText;
    panelBody.innerHTML = "";
    followupRow.classList.add("ph-hidden");
    panel.classList.remove("ph-hidden");
    hasActiveTurn = false;
  }

  function openDirectChat(e) {
    if (e && !e.isTrusted) return;
    resetPanel("Direct AI Chat");

    const welcome = document.createElement("div");
    welcome.className = "ph-welcome-bubble";
    welcome.innerHTML =
      '<strong>Direct AI Chat</strong><br />' +
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
      tip.textContent = "This answer has low confidence — try Snip Area to zoom into the specific region for a more reliable answer.";
      panelBody.appendChild(tip);
    }

    hasActiveTurn = true;
    scrollToAssistant(wrap);
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
    div.textContent = text;
    panelBody.appendChild(div);
    scrollToBottom();
  }

  function scrollToAssistant(wrap) {
    if (!panelBody || !wrap) return;
    const target = Math.max(0, wrap.offsetTop - 8);
    panelBody.scrollTop = target;
    requestAnimationFrame(() => {
      if (panelBody) panelBody.scrollTop = target;
    });
  }

  function scrollToBottom() {
    if (panelBody) {
      panelBody.scrollTop = panelBody.scrollHeight;
    }
  }

  function handleResponse(response) {
    clearLoading();
    if (!response) {
      appendError("No response received from background service.");
      return;
    }
    if (response.success) {
      appendAssistantBubble(response.answer, response.confidence);
      followupRow.classList.remove("ph-hidden");
      followupInput.placeholder = "Ask a follow-up question...";
    } else {
      appendError(response.error || "Something went wrong.");
    }
  }

  function onSolveClick(e) {
    if (e && !e.isTrusted) return;
    if (isRequestInFlight) return;
    isRequestInFlight = true;
    resetPanel("Full Page Solve");
    appendLoading("Capturing screenshot and preparing your answer...");

    safeSendMessage({ type: "SOLVE_WITH_AI", aiMode: currentAiMode }, (response) => {
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
      resetPanel("Focused Region Solve");
      appendUserBubble("[Selected Area]");
      appendLoading("Analyzing selected area...");

      safeSendMessage({ type: "SOLVE_WITH_AI_REGION", region, aiMode: currentAiMode }, (res) => {
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
    appendLoading(currentAiMode === "thinking" ? "Thinking deeply & formulating response..." : "Answering...");

    // If there is already an active conversation turn, use FOLLOWUP_WITH_AI.
    // If starting a fresh direct conversation without previous turn, use DIRECT_CHAT_WITH_AI.
    const msgType = hasActiveTurn ? "FOLLOWUP_WITH_AI" : "DIRECT_CHAT_WITH_AI";

    safeSendMessage({ type: msgType, question: q, aiMode: currentAiMode }, (res) => {
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
    exportBtn.textContent = "Generating...";

    safeSendMessage({ type: "OPEN_SESSION_EXPORT" }, (res) => {
      exportBtn.disabled = false;
      exportBtn.textContent = original;
      if (res && !res.success && res.error) {
        handleResponse(res);
      }
    });
  }

  // ---------- Self-healing injection ----------
  function tryInject() {
    if (!isContextValid()) {
      teardownOrphanedScript();
      return;
    }
    if (!isInjected()) {
      injectUI();
    }
  }

  tryInject();

  domObserver = new MutationObserver(() => {
    tryInject();
  });
  domObserver.observe(document.documentElement, { childList: true, subtree: false });

  injectionIntervalId = setInterval(() => {
    tryInject();
  }, 4000);

  window.addEventListener("load", () => {
    tryInject();
  }, { once: true });
})();
