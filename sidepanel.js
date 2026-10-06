/**
 * Page Helper AI / DezignSnap — Side Panel Script
 * Provides a 100% capture-proof AI workflow outside the webpage viewport.
 */
(function () {
  const spChatBody = document.getElementById("spChatBody");
  const spInput = document.getElementById("spInput");
  const spSendBtn = document.getElementById("spSendBtn");
  const spSnipBtn = document.getElementById("spSnipBtn");
  const spFullBtn = document.getElementById("spFullBtn");
  const spNewChatBtn = document.getElementById("spNewChatBtn");
  const spPopoutBtn = document.getElementById("spPopoutBtn");
  const spAiModeSelect = document.getElementById("spAiModeSelect");

  let currentAiMode = "direct";
  let hasTurn = false;
  let isSending = false;

  init();

  async function init() {
    const prefs = await chrome.storage.local.get(["aiMode"]);
    if (prefs.aiMode) {
      currentAiMode = prefs.aiMode;
      if (spAiModeSelect) spAiModeSelect.value = currentAiMode;
    }

    // Auto-enable stealth mode on page so floating docks don't appear in shared viewport
    chrome.storage.local.set({ stealthMode: true });

    // Handle detached window view
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("detached") === "true") {
      document.title = "DezignSnap — Companion Window";
      if (spPopoutBtn) spPopoutBtn.style.display = "none";
    }
  }

  if (spAiModeSelect) {
    spAiModeSelect.addEventListener("change", () => {
      currentAiMode = spAiModeSelect.value;
      chrome.storage.local.set({ aiMode: currentAiMode });
    });
  }

  if (spPopoutBtn) {
    spPopoutBtn.addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "OPEN_COMPANION_WINDOW" });
    });
  }

  if (spNewChatBtn) {
    spNewChatBtn.addEventListener("click", () => {
      spChatBody.innerHTML = `
        <div class="sp-welcome">
          <strong>New Chat Started</strong><br />
          Memory cleared. Click <strong>Snip Area</strong>, <strong>Full Page</strong>, or ask any question below!
        </div>
      `;
      hasTurn = false;
      chrome.runtime.sendMessage({ type: "CLEAR_ACTIVE_CHAT" });
    });
  }

  // Snip Area
  if (spSnipBtn) {
    spSnipBtn.addEventListener("click", async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) return;
      appendUser("[Triggered Area Snip]");
      appendLoading("Selecting region on page...");
      chrome.tabs.sendMessage(tab.id, { type: "TRIGGER_SNIP" });
    });
  }

  // Full Page Solve
  if (spFullBtn) {
    spFullBtn.addEventListener("click", async () => {
      if (isSending) return;
      isSending = true;
      appendUser("[Full Page Screenshot]");
      appendLoading("Analyzing visible screen...");

      chrome.runtime.sendMessage({ type: "SOLVE_WITH_AI_ACTIVE_TAB", aiMode: currentAiMode }, (res) => {
        isSending = false;
        clearLoading();
        if (chrome.runtime.lastError || !res || !res.success) {
          appendError(res?.error || chrome.runtime.lastError?.message || "Solve failed.");
          return;
        }
        hasTurn = true;
        appendAssistant(res.answer, res.confidence);
      });
    });
  }

  // Send follow-up or direct query
  function sendQuestion() {
    if (isSending) return;
    const q = spInput.value.trim();
    if (!q) return;

    isSending = true;
    appendUser(q);
    spInput.value = "";
    appendLoading(currentAiMode === "thinking" ? "Thinking deeply..." : "Formulating answer...");

    const type = hasTurn ? "FOLLOWUP_WITH_AI" : "DIRECT_CHAT_WITH_AI";
    chrome.runtime.sendMessage({ type, question: q, aiMode: currentAiMode }, (res) => {
      isSending = false;
      clearLoading();
      if (chrome.runtime.lastError || !res || !res.success) {
        appendError(res?.error || chrome.runtime.lastError?.message || "Failed to get answer.");
        return;
      }
      hasTurn = true;
      appendAssistant(res.answer, res.confidence);
    });
  }

  if (spSendBtn) spSendBtn.addEventListener("click", sendQuestion);
  if (spInput) {
    spInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") sendQuestion();
    });
  }

  // Listen for broadcasted results from content script snips
  chrome.runtime.onMessage.addListener((message) => {
    if (!message) return;
    if (message.type === "SHOW_RESULT" || message.type === "SIDEPANEL_RESULT") {
      clearLoading();
      hasTurn = true;
      if (message.result && message.result.success) {
        appendAssistant(message.result.answer, message.result.confidence);
      } else {
        appendError(message.result?.error || "Analysis failed.");
      }
    }
  });

  function appendUser(text) {
    const bubble = document.createElement("div");
    bubble.className = "sp-bubble sp-bubble-user";
    bubble.textContent = text;
    spChatBody.appendChild(bubble);
    spChatBody.scrollTop = spChatBody.scrollHeight;
  }

  function appendLoading(text) {
    clearLoading();
    const l = document.createElement("div");
    l.id = "sp-loading";
    l.className = "sp-bubble sp-bubble-ai";
    l.style.fontStyle = "italic";
    l.style.color = "#696969";
    l.textContent = text;
    spChatBody.appendChild(l);
    spChatBody.scrollTop = spChatBody.scrollHeight;
  }

  function clearLoading() {
    const el = document.getElementById("sp-loading");
    if (el) el.remove();
  }

  function appendError(text) {
    clearLoading();
    const b = document.createElement("div");
    b.className = "sp-bubble sp-bubble-ai";
    b.style.borderColor = "#c5221f";
    b.style.background = "#fff5f5";
    b.style.color = "#c5221f";
    b.textContent = "Error: " + text;
    spChatBody.appendChild(b);
    spChatBody.scrollTop = spChatBody.scrollHeight;
  }

  function appendAssistant(rawText, confidence) {
    clearLoading();
    const b = document.createElement("div");
    b.className = "sp-bubble sp-bubble-ai";

    if (confidence) {
      const badge = document.createElement("span");
      const c = confidence.toLowerCase();
      badge.className = "sp-conf-badge sp-conf-" + (c === "high" ? "high" : c === "medium" ? "medium" : "low");
      badge.textContent = confidence + " confidence";
      b.appendChild(badge);
    }

    const thinkingMatch = rawText.match(/<thinking>([\s\S]*?)<\/thinking>/i);
    let cleanText = rawText;

    if (thinkingMatch) {
      const thinkingText = thinkingMatch[1].trim();
      cleanText = rawText.replace(/<thinking>[\s\S]*?<\/thinking>/i, "").trim();

      const details = document.createElement("details");
      details.className = "sp-thinking-box";
      details.open = true;

      const summary = document.createElement("summary");
      summary.textContent = "Reasoning Process (click to collapse)";

      const content = document.createElement("div");
      content.className = "sp-thinking-content";
      content.textContent = thinkingText;

      details.appendChild(summary);
      details.appendChild(content);
      b.appendChild(details);
    }

    const contentDiv = document.createElement("div");
    contentDiv.style.whiteSpace = "pre-wrap";
    contentDiv.textContent = cleanText;
    b.appendChild(contentDiv);

    spChatBody.appendChild(b);
    spChatBody.scrollTop = spChatBody.scrollHeight;
  }
})();
