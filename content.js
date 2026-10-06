/**
 * Page Helper AI / DezignSnap — Content Script
 *
 * Injects the floating collapsible HUD (Snip Area, Full Page, Direct Chat, Session Report)
 * and the AI chat panel with Thinking & Explanation support, horizontal positioning (left/center/right),
 * and viewport-constrained scrolling.
 */
(function () {
  let hostElement = null;
  let shadowRoot = null;
  let hudContainer, hudBar, hudCollapsedBadge;
  let panel, panelBody, panelTitle, modeToggleBtn, posToggleBtn, followupRow, followupInput, followupSend;

  let currentPosition = "right"; // "right" | "center" | "left"
  let isCollapsed = false;
  let currentAiMode = "direct"; // "direct" | "thinking"
  let isStealthMode = false;
  let hasActiveTurn = false;
  let isRequestInFlight = false;

  function isInjected() {
    return !!document.getElementById("dezignsnap-root");
  }

  function savePreference(key, value) {
    try {
      chrome.runtime.sendMessage({
        type: "SET_UI_PREFERENCES",
        preferences: { [key]: value },
      });
    } catch (_) {}
  }

  function loadInitialPreferences() {
    try {
      chrome.runtime.sendMessage({ type: "GET_UI_PREFERENCES" }, (res) => {
        if (chrome.runtime.lastError || !res) return;
        currentPosition = res.hudPosition || "right";
        isCollapsed = !!res.hudCollapsed;
        currentAiMode = res.aiMode || "direct";
        isStealthMode = !!res.stealthMode;

        applyPositionClass(currentPosition);
        applyCollapseState(isCollapsed);
        updateAiModeUI(currentAiMode);
        applyStealthState(isStealthMode);
      });
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

  let autoCollapseTimer = null;
  const AUTO_COLLAPSE_DELAY_MS = 60000; // 1 minute auto-collapse on inactivity

  function clearAutoCollapseTimer() {
    if (autoCollapseTimer) {
      clearTimeout(autoCollapseTimer);
      autoCollapseTimer = null;
    }
  }

  function resetAutoCollapseTimer() {
    clearAutoCollapseTimer();
    if (!isCollapsed) {
      autoCollapseTimer = setTimeout(() => {
        const isInputFocused = followupInput && shadowRoot?.activeElement === followupInput;
        if (!isRequestInFlight && !isInputFocused) {
          applyCollapseState(true);
          savePreference("hudCollapsed", true);
        } else {
          resetAutoCollapseTimer();
        }
      }, AUTO_COLLAPSE_DELAY_MS);
    }
  }

  function applyCollapseState(collapsed) {
    isCollapsed = collapsed;
    if (hudContainer) {
      if (collapsed) {
        hudContainer.classList.add("ph-collapsed");
        clearAutoCollapseTimer();
      } else {
        hudContainer.classList.remove("ph-collapsed");
        resetAutoCollapseTimer();
      }
    }
  }

  function updateAiModeUI(mode) {
    currentAiMode = mode;
    if (modeToggleBtn) {
      if (mode === "thinking") {
        modeToggleBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="vertical-align:-1px;margin-right:4px;"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>Thinking';
        modeToggleBtn.title = "Current: Thinking & Explanation Mode. Click to switch to Direct Answer.";
        modeToggleBtn.classList.add("ph-active-mode");
      } else {
        modeToggleBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="vertical-align:-1px;margin-right:4px;"><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>Direct';
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
    savePreference("hudPosition", nextPos);
  }

  function applyStealthState(stealth) {
    isStealthMode = !!stealth;
    if (hudContainer) {
      if (isStealthMode) {
        hudContainer.style.setProperty("display", "none", "important");
      } else {
        hudContainer.style.display = "";
      }
    }
    if (hostElement) {
      if (isStealthMode && (!panel || panel.classList.contains("ph-hidden"))) {
        hostElement.style.setProperty("display", "none", "important");
      } else {
        hostElement.style.display = "";
      }
    }
  }

  function toggleStealthMode() {
    isStealthMode = !isStealthMode;
    applyStealthState(isStealthMode);
    savePreference("stealthMode", isStealthMode);
  }

  function injectUI() {
    if (isInjected()) return;

    // --- Host Element & Isolated Shadow Root ---
    hostElement = document.createElement("div");
    hostElement.id = "dezignsnap-root";
    hostElement.style.all = "initial";
    hostElement.style.position = "fixed";
    hostElement.style.zIndex = "2147483646";
    hostElement.style.pointerEvents = "none";
    if (isStealthMode) {
      hostElement.style.setProperty("display", "none", "important");
    }

    shadowRoot = hostElement.attachShadow({ mode: "open" });

    // Link extension styles into Shadow Root for complete bidirectional CSS isolation
    const styleLink = document.createElement("link");
    styleLink.rel = "stylesheet";
    styleLink.href = chrome.runtime.getURL("content.css");
    shadowRoot.appendChild(styleLink);

    // --- HUD Container ---
    hudContainer = document.createElement("div");
    hudContainer.id = "ph-hud-container";
    hudContainer.className = "ph-pos-" + currentPosition;
    if (isCollapsed) hudContainer.classList.add("ph-collapsed");
    if (isStealthMode) {
      hudContainer.style.setProperty("display", "none", "important");
    }

    const brandIconUrl = chrome.runtime.getURL("assests/03-pictorial-mark.svg");

    // Expanded HUD Bar
    hudBar = document.createElement("div");
    hudBar.id = "ph-hud-bar";
    hudBar.innerHTML =
      '<div class="ph-hud-brand">' +
      '<img src="' + brandIconUrl + '" width="18" height="18" alt="DezignSnap" style="border-radius:4px;display:inline-block;vertical-align:middle;box-shadow:0 1px 4px rgba(0,0,0,0.3);flex-shrink:0;" />' +
      '<span>DezignSnap</span>' +
      '</div>' +
      '<button id="ph-action-snip" type="button" class="ph-hud-btn ph-hud-btn-primary" title="Select area to analyze (Alt+S)">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="1" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="1" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="23" y2="12"/></svg>' +
      '<span>Snip Area</span>' +
      '</button>' +
      '<button id="ph-action-full" type="button" class="ph-hud-btn" title="Capture & analyze visible screen (Alt+A)">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>' +
      '<span>Full Page</span>' +
      '</button>' +
      '<button id="ph-action-chat" type="button" class="ph-hud-btn" title="Chat directly with AI without any screenshot">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
      '<span>Chat</span>' +
      '</button>' +
      '<button id="ph-action-export" type="button" class="ph-hud-btn" title="Export session transcript & PDF report">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>' +
      '<span>Report</span>' +
      '</button>' +
      '<button id="ph-action-pos" type="button" class="ph-hud-icon-btn" title="Cycle position: Right / Center / Left" aria-label="Cycle position">' +
      '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>' +
      '</button>' +
      '<button id="ph-action-collapse" type="button" class="ph-hud-icon-btn ph-collapse-btn" title="Dock to screen edge (Side Toggle)" aria-label="Dock toolbar to screen edge">' +
      '<svg class="ph-side-icon ph-side-outline" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="3.5" width="19" height="17" rx="3.5"/><line x1="8.5" y1="3.5" x2="8.5" y2="20.5"/><polyline points="15.5 8.5 11.5 12 15.5 15.5"/></svg>' +
      '<svg class="ph-side-icon ph-side-solid" width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="2.5" y="3.5" width="4.5" height="17" rx="2" fill="currentColor"/><rect x="8.5" y="3.5" width="13" height="17" rx="2.5" fill="currentColor"/><polyline points="15.5 8.5 11.5 12 15.5 15.5" stroke="#4a154b" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>' +
      '</button>';

    // Collapsed Side Toggle Dock Tab with Sidebar Expand Icon
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
      '    <svg class="ph-side-icon ph-side-outline" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '      <rect x="2.5" y="3.5" width="19" height="17" rx="3.5" />' +
      '      <line x1="8.5" y1="3.5" x2="8.5" y2="20.5" />' +
      '      <polyline points="15.5 8.5 11.5 12 15.5 15.5" />' +
      '    </svg>' +
      '    <svg class="ph-side-icon ph-side-solid" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
      '      <rect x="2.5" y="3.5" width="4.5" height="17" rx="2" fill="currentColor" />' +
      '      <rect x="8.5" y="3.5" width="13" height="17" rx="2.5" fill="currentColor" />' +
      '      <polyline points="15.5 8.5 11.5 12 15.5 15.5" stroke="#4a154b" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" fill="none" />' +
      '    </svg>' +
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
      '    <img src="' + brandIconUrl + '" width="18" height="18" alt="DezignSnap" style="border-radius:4px;display:inline-block;vertical-align:middle;box-shadow:0 1px 4px rgba(0,0,0,0.2);flex-shrink:0;" />' +
      '    <span id="ph-panel-title">DezignSnap AI</span>' +
      '  </div>' +
      '  <div class="ph-panel-header-controls">' +
      '    <button id="ph-new-chat" type="button" class="ph-header-btn" title="Start a fresh chat (clears memory)"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align:-1px;margin-right:3px;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>New</button>' +
      '    <button id="ph-mode-toggle" type="button" class="ph-header-btn" title="Toggle AI Mode"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="vertical-align:-1px;margin-right:3px;"><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>Direct</button>' +
      '    <button id="ph-pos-toggle" type="button" class="ph-header-btn" title="Cycle Position" aria-label="Cycle position"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg></button>' +
      '    <button id="ph-panel-close" type="button" class="ph-header-btn ph-close-btn" aria-label="Close"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>' +
      '  </div>' +
      '</div>' +
      '<div id="ph-panel-body"></div>' +
      '<div id="ph-followup-row" class="ph-hidden">' +
      '  <input type="text" id="ph-followup-input" placeholder="Ask a question or follow-up..." />' +
      '  <button id="ph-followup-send" type="button" aria-label="Send"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button>' +
      '</div>';

    shadowRoot.appendChild(hudContainer);
    shadowRoot.appendChild(panel);
    (document.documentElement || document.body).appendChild(hostElement);

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
      savePreference("hudCollapsed", true);
    });

    // Hook Collapsed Badge Events (Clicking or pressing Enter/Space on side toggle expands toolbar)
    hudCollapsedBadge.addEventListener("click", () => {
      applyCollapseState(false);
      savePreference("hudCollapsed", false);
    });
    hudCollapsedBadge.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        applyCollapseState(false);
        savePreference("hudCollapsed", false);
      }
    });

    // Reset 1-minute auto-collapse timer on user activity
    hudContainer.addEventListener("mousemove", resetAutoCollapseTimer);
    hudContainer.addEventListener("click", resetAutoCollapseTimer);
    panel.addEventListener("mousemove", resetAutoCollapseTimer);
    panel.addEventListener("click", resetAutoCollapseTimer);

    // Hook Panel Events
    panel.querySelector("#ph-panel-close").addEventListener("click", () => {
      panel.classList.add("ph-hidden");
      if (isStealthMode) {
        if (hostElement) hostElement.style.setProperty("display", "none", "important");
      }
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (panel && !panel.classList.contains("ph-hidden")) {
          panel.classList.add("ph-hidden");
          if (isStealthMode) {
            if (hostElement) hostElement.style.setProperty("display", "none", "important");
          }
        }
      }
    });

    panel.querySelector("#ph-new-chat").addEventListener("click", startNewChat);

    posToggleBtn.addEventListener("click", cyclePosition);

    modeToggleBtn.addEventListener("click", () => {
      const nextMode = currentAiMode === "direct" ? "thinking" : "direct";
      updateAiModeUI(nextMode);
      savePreference("aiMode", nextMode);
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
      } else if (message.type === "TRIGGER_FULL_SOLVE") {
        onSolveClick({ isTrusted: true });
      } else if (message.type === "OPEN_DIRECT_CHAT") {
        openDirectChat({ isTrusted: true });
      } else if (message.type === "TOGGLE_STEALTH") {
        toggleStealthMode();
      } else if (message.type === "START_TEXT_QUERY") {
        ensurePanelOpen("Text Intelligence");
        appendUserBubble(`Selected: "${message.text}"`);
        appendLoading("Analyzing selected text...");
      } else if (message.type === "SHOW_RESULT") {
        handleResponse(message.result);
      } else if (message.type === "PREFERENCES_CHANGED" && message.preferences) {
        if (message.preferences.hudPosition) applyPositionClass(message.preferences.hudPosition);
        if (message.preferences.hudCollapsed !== undefined) applyCollapseState(message.preferences.hudCollapsed);
        if (message.preferences.aiMode) updateAiModeUI(message.preferences.aiMode);
        if (message.preferences.stealthMode !== undefined) applyStealthState(message.preferences.stealthMode);
      }
    });
  }

  function ensurePanelOpen(titleText = "DezignSnap AI") {
    if (!panel) return;
    if (panelTitle) panelTitle.textContent = titleText;
    if (hostElement) hostElement.style.display = "";
    panel.classList.remove("ph-hidden");
  }

  function startNewChat(e) {
    if (e && !e.isTrusted) return;
    if (panelTitle) panelTitle.textContent = "DezignSnap AI";
    panelBody.innerHTML = "";
    hasActiveTurn = false;
    followupRow.classList.remove("ph-hidden");
    followupInput.placeholder = "Ask anything or take a snip...";

    chrome.runtime.sendMessage({ type: "CLEAR_ACTIVE_CHAT" });

    const banner = document.createElement("div");
    banner.className = "ph-welcome-bubble";
    banner.innerHTML =
      '<strong>New Chat Session</strong><br />' +
      'Conversation memory cleared. Take a snip, capture full page, or ask a question below!';
    panelBody.appendChild(banner);
    followupInput.focus({ preventScroll: true });
  }

  function openDirectChat(e) {
    if (e && !e.isTrusted) return;
    ensurePanelOpen("Direct AI Chat");
    followupRow.classList.remove("ph-hidden");
    followupInput.placeholder = "Type your question here...";

    if (!panelBody.children.length) {
      const welcome = document.createElement("div");
      welcome.className = "ph-welcome-bubble";
      welcome.innerHTML =
        '<strong>Direct AI Chat</strong><br />' +
        'Ask any question, debug code, or brainstorm ideas without capturing any screenshot. Type below and hit Enter!';
      panelBody.appendChild(welcome);
    }
    followupInput.focus({ preventScroll: true });
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
        '<span class="ph-thinking-badge">Reasoning Process</span>' +
        '<span>(click to expand/collapse)</span>';

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

    // Copy answer button
    const copyBtn = document.createElement("button");
    copyBtn.className = "ph-copy-btn";
    copyBtn.setAttribute("type", "button");
    copyBtn.setAttribute("aria-label", "Copy AI response to clipboard");
    copyBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-1px;margin-right:4px;"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>Copy';
    copyBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(cleanText || rawText);
        copyBtn.textContent = "Copied!";
        copyBtn.classList.add("ph-copied");
        setTimeout(() => {
          copyBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-1px;margin-right:4px;"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>Copy';
          copyBtn.classList.remove("ph-copied");
        }, 2000);
      } catch (_) {
        copyBtn.textContent = "Copy Failed";
        setTimeout(() => {
          copyBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-1px;margin-right:4px;"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>Copy';
        }, 2000);
      }
    });
    wrap.appendChild(copyBtn);

    panelBody.appendChild(wrap);

    if (confidence === "Low") {
      const tip = document.createElement("div");
      tip.className = "ph-tip";
      tip.textContent = "Low confidence: try Select Area (Alt+S) to zoom into the specific region for higher accuracy.";
      panelBody.appendChild(tip);
    }

    hasActiveTurn = true;
    scrollToResponseStart(wrap);
  }

  function appendLoading(text) {
    clearLoading();
    const div = document.createElement("div");
    div.className = "ph-bubble ph-bubble-loading";
    div.id = "ph-loading-bubble";
    div.textContent = text;
    panelBody.appendChild(div);
    scrollToBottom();

    const startTime = Date.now();
    const timerId = setInterval(() => {
      const el = panelBody?.querySelector("#ph-loading-bubble");
      if (!el) {
        clearInterval(timerId);
        return;
      }
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      if (elapsed > 1) {
        el.dataset.elapsed = `${elapsed}s`;
      }
    }, 1000);
    div.dataset.timerId = String(timerId);
  }

  function clearLoading() {
    const el = panelBody?.querySelector("#ph-loading-bubble");
    if (el) {
      const timerId = el.dataset.timerId;
      if (timerId) clearInterval(Number(timerId));
      el.remove();
    }
  }

  function appendError(text) {
    clearLoading();
    const div = document.createElement("div");
    div.className = "ph-bubble ph-bubble-error";
    div.textContent = "Error: " + text;
    panelBody.appendChild(div);
    scrollToBottom();
  }

  function scrollToBottom() {
    if (panelBody) {
      panelBody.scrollTop = panelBody.scrollHeight;
    }
  }

  function scrollToResponseStart(wrapEl) {
    if (!panelBody || !wrapEl) return;

    // Anchor to short user prompt immediately before this answer if present,
    // so user can see both the question and the start of the answer.
    const prevEl = wrapEl.previousElementSibling;
    const anchorEl =
      prevEl && prevEl.classList.contains("ph-bubble-user") && prevEl.offsetHeight < 140
        ? prevEl
        : wrapEl;

    const doScroll = () => {
      try {
        const bodyRect = panelBody.getBoundingClientRect();
        const targetRect = anchorEl.getBoundingClientRect();
        const relativeTop = targetRect.top - bodyRect.top + panelBody.scrollTop;

        panelBody.scrollTo({
          top: Math.max(0, Math.floor(relativeTop - 8)),
          behavior: "smooth",
        });
      } catch (_) {
        panelBody.scrollTop = Math.max(0, anchorEl.offsetTop - 8);
      }
    };

    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(doScroll);
    } else {
      setTimeout(doScroll, 30);
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

  function runStreamingTurn(payload, onBeforeConnect) {
    if (typeof onBeforeConnect === "function") {
      onBeforeConnect();
    }

    let port = null;
    let fallbackUsed = false;

    function fallbackToOneShot() {
      if (fallbackUsed) return;
      fallbackUsed = true;
      let msgType = "SOLVE_WITH_AI";
      if (payload.action === "snip") {
        msgType = "SOLVE_WITH_AI_REGION";
      } else if (payload.action === "direct") {
        msgType = hasActiveTurn ? "FOLLOWUP_WITH_AI" : "DIRECT_CHAT_WITH_AI";
      }
      chrome.runtime.sendMessage(
        {
          type: msgType,
          region: payload.region,
          question: payload.question,
          aiMode: currentAiMode,
        },
        (res) => {
          isRequestInFlight = false;
          handleResponse(res);
        }
      );
    }

    try {
      port = chrome.runtime.connect({ name: "ph_streaming" });
    } catch (_) {
      fallbackToOneShot();
      return;
    }

    if (!port) {
      fallbackToOneShot();
      return;
    }

    let streamWrap = null;
    let streamThinkingDetails = null;
    let streamThinkingContent = null;
    let streamTextDiv = null;
    let streamCursor = null;
    let accumulatedContent = "";
    let accumulatedReasoning = "";

    function ensureStreamWrap() {
      if (!streamWrap) {
        clearLoading();
        streamWrap = document.createElement("div");
        streamWrap.className = "ph-bubble ph-bubble-streaming";
        streamWrap.id = "ph-streaming-bubble";

        streamTextDiv = document.createElement("div");
        streamTextDiv.className = "ph-bubble-text";

        streamCursor = document.createElement("span");
        streamCursor.className = "ph-streaming-cursor";

        streamWrap.appendChild(streamTextDiv);
        streamWrap.appendChild(streamCursor);
        panelBody.appendChild(streamWrap);

        scrollToResponseStart(streamWrap);
      }
    }

    function ensureThinkingBox() {
      ensureStreamWrap();
      if (!streamThinkingDetails) {
        streamThinkingDetails = document.createElement("details");
        streamThinkingDetails.className = "ph-thinking-box";
        streamThinkingDetails.open = true;

        const summary = document.createElement("summary");
        summary.className = "ph-thinking-summary";
        summary.innerHTML =
          '<span class="ph-thinking-icon">💭</span>' +
          '<span>Thinking Process (live)...</span>' +
          '<span class="ph-thinking-badge">Streaming</span>';

        streamThinkingContent = document.createElement("div");
        streamThinkingContent.className = "ph-thinking-content";

        streamThinkingDetails.appendChild(summary);
        streamThinkingDetails.appendChild(streamThinkingContent);

        streamWrap.insertBefore(streamThinkingDetails, streamTextDiv);
      }
    }

    port.onMessage.addListener((msg) => {
      if (!msg) return;

      if (msg.type === "STREAM_CHUNK") {
        if (msg.isThinking) {
          ensureThinkingBox();
          accumulatedReasoning += msg.chunk || "";
          streamThinkingContent.textContent = accumulatedReasoning;
          streamThinkingContent.scrollTop = streamThinkingContent.scrollHeight;
        } else {
          ensureStreamWrap();
          accumulatedContent += msg.chunk || "";

          // Parse inline reasoning tags if present
          const thinkingMatch = accumulatedContent.match(/<thinking>([\s\S]*?)<\/thinking>/i);
          if (thinkingMatch) {
            ensureThinkingBox();
            streamThinkingContent.textContent = thinkingMatch[1].trim();
            const clean = accumulatedContent.replace(/<thinking>[\s\S]*?<\/thinking>/i, "").trim();
            streamTextDiv.textContent = clean;
          } else {
            const openTagMatch = accumulatedContent.match(/<thinking>([\s\S]*)$/i);
            if (openTagMatch) {
              ensureThinkingBox();
              streamThinkingContent.textContent = openTagMatch[1];
              streamTextDiv.textContent = "";
            } else {
              streamTextDiv.textContent = accumulatedContent;
            }
          }
        }

        // Smooth scroll if viewing near the bottom
        if (panelBody) {
          const dist = panelBody.scrollHeight - panelBody.scrollTop - panelBody.clientHeight;
          if (dist < 120) {
            panelBody.scrollTop = panelBody.scrollHeight;
          }
        }
      } else if (msg.type === "STREAM_DONE") {
        isRequestInFlight = false;
        if (streamWrap) {
          streamWrap.remove();
          streamWrap = null;
        }
        clearLoading();
        appendAssistantBubble(msg.answer || accumulatedContent, msg.confidence);
        followupRow.classList.remove("ph-hidden");
        followupInput.placeholder = "Ask a follow-up question...";
        try {
          port.disconnect();
        } catch (_) {}
      } else if (msg.type === "STREAM_ERROR") {
        isRequestInFlight = false;
        if (streamWrap) {
          streamWrap.remove();
          streamWrap = null;
        }
        clearLoading();
        appendError(msg.error || "Streaming failed.");
        try {
          port.disconnect();
        } catch (_) {}
      }
    });

    port.onDisconnect.addListener(() => {
      if (isRequestInFlight) {
        isRequestInFlight = false;
        if (streamWrap) {
          streamWrap.remove();
          streamWrap = null;
        }
        clearLoading();
        if (chrome.runtime.lastError) {
          appendError(chrome.runtime.lastError.message);
        } else if (accumulatedContent.trim()) {
          appendAssistantBubble(accumulatedContent, "Medium");
          followupRow.classList.remove("ph-hidden");
          followupInput.placeholder = "Ask a follow-up question...";
        }
      }
    });

    try {
      port.postMessage({
        type: "START_STREAM",
        payload,
        aiMode: currentAiMode,
      });
    } catch (_) {
      fallbackToOneShot();
    }
  }

  function onSolveClick(e) {
    if (e && !e.isTrusted) return;
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isRequestInFlight) return;
    isRequestInFlight = true;

    // Preserve exact page scroll position so capturing full screen does not affect viewport
    const savedScrollX = window.scrollX || window.pageXOffset || document.documentElement.scrollLeft || 0;
    const savedScrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;

    // Temporarily hide HUD and chat panel so the captured screen is pristine & clean
    const prevHudDisplay = hudContainer ? hudContainer.style.display : "";
    if (hudContainer) hudContainer.style.display = "none";
    if (panel) panel.classList.add("ph-hidden");

    let restored = false;
    function restoreUIAndShowLoading() {
      if (restored) return;
      restored = true;
      if (hudContainer && !isStealthMode) {
        hudContainer.style.display = prevHudDisplay;
      }
      ensurePanelOpen("Full Page Solve");
      appendUserBubble("Full Page Screenshot");
      appendLoading("Capturing screenshot and preparing answer...");
      window.scrollTo({ left: savedScrollX, top: savedScrollY, behavior: "instant" });
    }

    // Wait 50ms for browser to render without HUD/panel, then send streaming capture request
    setTimeout(() => {
      runStreamingTurn({ action: "solve" }, restoreUIAndShowLoading);

      // Show loading in panel once capture has completed in background (~110ms)
      setTimeout(restoreUIAndShowLoading, 110);
    }, 50);
  }

  function startRegionSelection(e) {
    if (e && !e.isTrusted) return;
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isRequestInFlight) return;

    // Preserve page scroll position so selecting area does not shift/scroll the page
    const savedScrollX = window.scrollX || window.pageXOffset || document.documentElement.scrollLeft || 0;
    const savedScrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;

    const lockScroll = () => {
      const curX = window.scrollX || window.pageXOffset || document.documentElement.scrollLeft || 0;
      const curY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
      if (curX !== savedScrollX || curY !== savedScrollY) {
        window.scrollTo({ left: savedScrollX, top: savedScrollY, behavior: "instant" });
      }
    };
    window.addEventListener("scroll", lockScroll, { passive: false });

    // Temporarily hide HUD and panel so the user has an unobstructed view of the page
    const prevHudDisplay = hudContainer ? hudContainer.style.display : "";
    const wasPanelOpen = panel && !panel.classList.contains("ph-hidden");
    if (hudContainer) hudContainer.style.display = "none";
    if (panel) panel.classList.add("ph-hidden");

    const overlay = document.createElement("div");
    overlay.id = "ph-select-overlay";

    const box = document.createElement("div");
    box.id = "ph-select-box";
    box.className = "ph-hidden";
    overlay.appendChild(box);

    let startX = 0, startY = 0, dragging = false;

    function onMouseDown(e) {
      if (e && !e.isTrusted) return;
      if (e && typeof e.preventDefault === "function") {
        e.preventDefault();
        e.stopPropagation();
      }
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
      if (e && typeof e.preventDefault === "function") {
        e.preventDefault();
        e.stopPropagation();
      }
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
      if (e && typeof e.preventDefault === "function") {
        e.preventDefault();
        e.stopPropagation();
      }
      if (e && !e.isTrusted) {
        cleanup(true);
        return;
      }
      dragging = false;
      const x = Math.min(startX, e.clientX);
      const y = Math.min(startY, e.clientY);
      const width = Math.abs(e.clientX - startX);
      const height = Math.abs(e.clientY - startY);
      cleanup(false);

      if (width < 12 || height < 12) {
        // Selection too small or accidental click, restore previous state
        if (hudContainer && !isStealthMode) {
          hudContainer.style.display = prevHudDisplay;
        }
        if (wasPanelOpen && panel) panel.classList.remove("ph-hidden");
        return;
      }

      const region = { x, y, width, height, dpr: window.devicePixelRatio || 1 };

      isRequestInFlight = true;

      // Keep HUD and Panel hidden for capture so they aren't included in the fullShot
      let restored = false;
      function restoreUIAndShowLoading() {
        if (restored) return;
        restored = true;
        if (hudContainer && !isStealthMode) {
          hudContainer.style.display = prevHudDisplay;
        }
        ensurePanelOpen("Focused Region Solve");
        appendUserBubble("[Selected Area Snip]");
        appendLoading("Analyzing selected area...");
        window.scrollTo({ left: savedScrollX, top: savedScrollY, behavior: "instant" });
      }

      // Small delay for DOM cleanup to settle before background captures tab
      setTimeout(() => {
        chrome.runtime.sendMessage({ type: "SOLVE_WITH_AI_REGION", region, aiMode: currentAiMode }, (res) => {
          isRequestInFlight = false;
          restoreUIAndShowLoading();
          handleResponse(res);
          try {
            chrome.runtime.sendMessage({ type: "SIDEPANEL_RESULT", result: res });
          } catch (_) {}
        });

        // Restore UI right after background captures tab (~100ms)
        setTimeout(restoreUIAndShowLoading, 100);
      }, 30);
    }

    function onKeyDown(e) {
      if (e.key === "Escape") {
        cleanup(true);
      }
    }

    function cleanup(isCancelled = true) {
      window.removeEventListener("scroll", lockScroll);
      overlay.removeEventListener("mousedown", onMouseDown);
      overlay.removeEventListener("mousemove", onMouseMove);
      overlay.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("keydown", onKeyDown);
      overlay.remove();

      // Ensure exact scroll position remains untouched
      window.scrollTo({ left: savedScrollX, top: savedScrollY, behavior: "instant" });

      if (isCancelled) {
        if (hudContainer && !isStealthMode) {
          hudContainer.style.display = prevHudDisplay;
        }
        if (wasPanelOpen && panel) panel.classList.remove("ph-hidden");
      }
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
    appendLoading(currentAiMode === "thinking" ? "Thinking deeply..." : "Formulating answer...");

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
    const original = exportBtn.innerHTML;
    exportBtn.textContent = "Exporting...";

    chrome.runtime.sendMessage({ type: "OPEN_SESSION_EXPORT" }, () => {
      exportBtn.disabled = false;
      exportBtn.innerHTML = original;
    });
  }

  // ---------- Self-healing injection ----------
  injectUI();

  const observer = new MutationObserver(() => {
    if (!isInjected()) injectUI();
  });
  observer.observe(document.documentElement, { childList: true, subtree: false });

  const selfHealInterval = setInterval(() => {
    if (!isInjected()) injectUI();
  }, 4000);

  // Clean up observers and intervals if extension context becomes invalidated (e.g. extension reload/update)
  const contextCheckInterval = setInterval(() => {
    try {
      if (!chrome.runtime?.id) {
        clearInterval(selfHealInterval);
        clearInterval(contextCheckInterval);
        observer.disconnect();
      }
    } catch (_) {
      clearInterval(selfHealInterval);
      clearInterval(contextCheckInterval);
      observer.disconnect();
    }
  }, 10000);

  window.addEventListener("load", () => {
    if (!isInjected()) injectUI();
  });
})();
