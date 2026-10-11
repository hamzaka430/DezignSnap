const groqKeyInput = document.getElementById("groqKeyInput");
const geminiKeyInput = document.getElementById("geminiKeyInput");
const geminiModelSelect = document.getElementById("geminiModelSelect");
const geminiCustomModelWrap = document.getElementById("geminiCustomModelWrap");
const geminiCustomModelInput = document.getElementById("geminiCustomModelInput");
const openaiKeyInput = document.getElementById("openaiKeyInput");
const openrouterKeyInput = document.getElementById("openrouterKeyInput");
const ollamaEndpointInput = document.getElementById("ollamaEndpointInput");
const ollamaModelInput = document.getElementById("ollamaModelInput");

const saveGroqKeyBtn = document.getElementById("saveGroqKeyBtn");
const saveGeminiKeyBtn = document.getElementById("saveGeminiKeyBtn");
const saveOpenAIKeyBtn = document.getElementById("saveOpenAIKeyBtn");
const saveOpenRouterKeyBtn = document.getElementById("saveOpenRouterKeyBtn");
const saveOllamaBtn = document.getElementById("saveOllamaBtn");

const keyStatus = document.getElementById("keyStatus");
const presetList = document.getElementById("presetList");
const newPresetName = document.getElementById("newPresetName");
const newPresetText = document.getElementById("newPresetText");
const addPresetBtn = document.getElementById("addPresetBtn");
const historyCount = document.getElementById("historyCount");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");
const exportPdfBtn = document.getElementById("exportPdfBtn");

const hudPositionSelect = document.getElementById("hudPositionSelect");
const aiModeSelect = document.getElementById("aiModeSelect");
const stealthModeToggle = document.getElementById("stealthModeToggle");
const prefStatus = document.getElementById("prefStatus");

const radioCards = document.querySelectorAll(".radio-card");
const resetPresetsBtn = document.getElementById("resetPresetsBtn");

const DEFAULT_PRESETS = [
  {
    id: "default",
    name: "General Page Helper & Assistant",
    text: "Visually analyze this page or screenshot. Explain what is visible, summarize the key information, answer any question I have asked, and highlight important buttons or next steps. Be direct, clear, and helpful.",
  },
  {
    id: "task_copilot",
    name: "Interactive Task Co-Pilot (Step-by-Step Guide)",
    text: "Act as my interactive task co-pilot. I am trying to complete a specific task on this website or app. Based on what is currently visible on my screen:\n1. Identify what screen/step I am currently on.\n2. Give me the EXACT next physical action to take (e.g., \"Click the blue 'Continue' button at the bottom right\", \"Fill out the email field in the center\"). State precise button names, visual locations, and colors.\n3. Mention any critical tips or things to avoid before I click.\nKeep your instructions concise, numbered, and action-oriented so I can get the task done quickly.",
  },
  {
    id: "quiz_solver",
    name: "Verified Quiz & MCQ Solver (First-Principles)",
    text: "Accurately solve this multiple-choice question, exam, or problem. Independently evaluate every option from first principles. State the exact verified correct answer and letter first, prove why it is correct with evidence, and explain why each incorrect choice is wrong. Never assume any option already selected or highlighted on screen is correct.",
  },
  {
    id: "bug_hunter",
    name: "Visual Bug Hunter & Code Fixer",
    text: "Audit this screen for visual defects, layout bugs, responsive misalignment, contrast issues, or visible errors. Point out the exact buggy elements and provide the concrete CSS, HTML, or JavaScript code fix.",
  },
  {
    id: "data_extractor",
    name: "Table & Structured Data Extractor",
    text: "Extract all visible tabular data, lists, pricing tiers, or structured key-value information from this screen. Format the output into clean, beautifully structured markdown tables or formatted JSON. Do not omit rows or hallucinate missing data.",
  },
  {
    id: "summarizer",
    name: "Executive Summarizer & Key Takeaways",
    text: "Provide a high-impact executive summary of the content shown on this screen. Extract the top 3-5 key takeaways, important numbers/metrics, dates, and actionable decisions in crisp bullet points.",
  },
  {
    id: "ui_critique",
    name: "UI/UX Design Critique & Usability Review",
    text: "Review this interface from a Senior Product Designer's perspective. Evaluate visual hierarchy, whitespace, typography, accessibility, and conversion flow. Provide actionable, constructive redesign advice to elevate the UI to top-tier quality.",
  },
  {
    id: "translate",
    name: "Translate & Localize to English",
    text: "Translate all visible text, UI labels, and instructions on this screen into fluent, natural English (or specified language), preserving the original meaning, tone, and visual context.",
  },
  {
    id: "eli5",
    name: "Explain Like I'm 5 (ELI5)",
    text: "Explain what is happening on this screen in super simple, beginner-friendly terms that a 5-year-old or non-technical person would instantly understand. Use relatable analogies and simple bullet points.",
  },
];

init();

async function init() {
  const {
    openaiApiKey = "",
    geminiApiKey = "",
    geminiModel = "gemini-2.5-flash",
    groqApiKey = "",
    openrouterApiKey = "",
    ollamaEndpoint = "http://localhost:11434",
    ollamaModel = "llama3.2-vision",
    activeProvider = "groq",
    hudPosition = "right",
    aiMode = "direct",
    stealthMode = false,
    instructionPresets = [],
    activePresetId,
    sessionHistory = [],
  } = await chrome.storage.local.get([
    "openaiApiKey",
    "geminiApiKey",
    "geminiModel",
    "groqApiKey",
    "openrouterApiKey",
    "ollamaEndpoint",
    "ollamaModel",
    "activeProvider",
    "hudPosition",
    "aiMode",
    "stealthMode",
    "instructionPresets",
    "activePresetId",
    "sessionHistory",
  ]);

  if (stealthModeToggle) stealthModeToggle.checked = !!stealthMode;

  groqKeyInput.value = groqApiKey;
  geminiKeyInput.value = geminiApiKey;

  let cleanGeminiModel = geminiModel;
  if (!cleanGeminiModel || cleanGeminiModel === "gemini-1.5-flash" || cleanGeminiModel === "gemini-2.0-flash") {
    cleanGeminiModel = "gemini-2.5-flash";
    await chrome.storage.local.set({ geminiModel: cleanGeminiModel });
  }

  if (geminiModelSelect) {
    if (["gemini-2.5-flash", "gemini-3.5-flash", "gemini-2.5-pro"].includes(cleanGeminiModel)) {
      geminiModelSelect.value = cleanGeminiModel;
      if (geminiCustomModelWrap) geminiCustomModelWrap.style.display = "none";
    } else {
      geminiModelSelect.value = "custom";
      if (geminiCustomModelWrap) geminiCustomModelWrap.style.display = "block";
      if (geminiCustomModelInput) geminiCustomModelInput.value = cleanGeminiModel;
    }

    geminiModelSelect.addEventListener("change", async () => {
      const selected = geminiModelSelect.value;
      if (selected === "custom") {
        if (geminiCustomModelWrap) geminiCustomModelWrap.style.display = "block";
        const customVal = geminiCustomModelInput ? geminiCustomModelInput.value.trim() : "";
        if (customVal) await chrome.storage.local.set({ geminiModel: customVal });
      } else {
        if (geminiCustomModelWrap) geminiCustomModelWrap.style.display = "none";
        await chrome.storage.local.set({ geminiModel: selected });
        showStatus(`Gemini model set to ${selected}.`, true);
      }
    });

    if (geminiCustomModelInput) {
      geminiCustomModelInput.addEventListener("input", async () => {
        const customVal = geminiCustomModelInput.value.trim();
        if (customVal && geminiModelSelect.value === "custom") {
          await chrome.storage.local.set({ geminiModel: customVal });
        }
      });
    }
  }

  openaiKeyInput.value = openaiApiKey;
  openrouterKeyInput.value = openrouterApiKey;
  ollamaEndpointInput.value = ollamaEndpoint;
  ollamaModelInput.value = ollamaModel;

  if (hudPositionSelect) hudPositionSelect.value = hudPosition;
  if (aiModeSelect) aiModeSelect.value = aiMode;

  // Synchronize and align stored presets with latest verified names & prompts
  let presetsUpdated = false;
  let activeList = instructionPresets;
  if (!activeList || activeList.length === 0) {
    activeList = [...DEFAULT_PRESETS];
    presetsUpdated = true;
  } else {
    // Check if default preset has old name or mismatched text
    const defPreset = activeList.find((p) => p.id === "default");
    if (defPreset && (defPreset.name === "General page & problem solver" || defPreset.text.includes("If this contains a question, quiz, or problem, solve it accurately from first principles"))) {
      defPreset.name = "General Page Helper & Assistant";
      defPreset.text = DEFAULT_PRESETS[0].text;
      presetsUpdated = true;
    }
    // Ensure task_copilot exists
    if (!activeList.some((p) => p.id === "task_copilot")) {
      const copilot = DEFAULT_PRESETS.find((p) => p.id === "task_copilot");
      if (copilot) {
        activeList.splice(1, 0, copilot);
        presetsUpdated = true;
      }
    }
    // Ensure quiz_solver has verified name and text
    const quizPreset = activeList.find((p) => p.id === "quiz_solver");
    if (quizPreset && (!quizPreset.name.includes("First-Principles") || quizPreset.name.includes("🎯"))) {
      quizPreset.name = "Verified Quiz & MCQ Solver (First-Principles)";
      quizPreset.text = DEFAULT_PRESETS.find((p) => p.id === "quiz_solver").text;
      presetsUpdated = true;
    }
    // Add other standard presets if missing
    for (const std of ["data_extractor", "summarizer", "ui_critique"]) {
      if (!activeList.some((p) => p.id === std)) {
        const item = DEFAULT_PRESETS.find((p) => p.id === std);
        if (item) {
          activeList.push(item);
          presetsUpdated = true;
        }
      }
    }
  }

  if (presetsUpdated) {
    await chrome.storage.local.set({ instructionPresets: activeList, activePresetId: activePresetId || activeList[0].id });
  }

  setActiveProviderCard(activeProvider);
  renderPresets(activeList, activePresetId || activeList[0].id);
  historyCount.textContent = sessionHistory.length;
}

if (hudPositionSelect) {
  hudPositionSelect.addEventListener("change", async () => {
    const val = hudPositionSelect.value;
    await chrome.storage.local.set({ hudPosition: val });
    showPrefStatus(`Floating toolbar position saved to ${val.toUpperCase()}`, true);
  });
}

if (aiModeSelect) {
  aiModeSelect.addEventListener("change", async () => {
    const val = aiModeSelect.value;
    await chrome.storage.local.set({ aiMode: val });
    showPrefStatus(`AI mode set to ${val === "thinking" ? "Deep Thinking & Explanation" : "Direct Answer"}`, true);
  });
}

if (stealthModeToggle) {
  stealthModeToggle.addEventListener("change", async () => {
    const val = stealthModeToggle.checked;
    await chrome.storage.local.set({ stealthMode: val });
    showPrefStatus(`Screen Sharing Stealth Mode ${val ? "ENABLED (Dock hidden)" : "DISABLED"}`, true);
  });
}

function showPrefStatus(text, ok) {
  if (!prefStatus) return;
  prefStatus.textContent = text;
  prefStatus.className = `status ${ok ? "status-success" : "status-error"}`;
  prefStatus.style.background = "";
  prefStatus.style.color = "";
  prefStatus.style.border = "";
  prefStatus.classList.remove("hidden");
  setTimeout(() => prefStatus.classList.add("hidden"), 3000);
}

function setActiveProviderCard(provider) {
  radioCards.forEach((card) => {
    const radio = card.querySelector('input[type="radio"]');
    if (radio.value === provider) {
      card.classList.add("active");
      radio.checked = true;
    } else {
      card.classList.remove("active");
    }
  });
}

radioCards.forEach((card) => {
  card.addEventListener("click", async () => {
    const radio = card.querySelector('input[type="radio"]');
    const val = radio.value;
    setActiveProviderCard(val);
    await chrome.storage.local.set({ activeProvider: val });
    showStatus(`Active engine switched to ${val.toUpperCase()}`, true);
  });
});

saveGroqKeyBtn.addEventListener("click", async () => {
  const key = groqKeyInput.value.trim();
  if (!key) return showStatus("Groq API key cannot be empty.", false);
  if (!key.startsWith("gsk_")) {
    return showStatus("Warning: Groq keys typically start with 'gsk_'.", false);
  }
  await chrome.storage.local.set({ groqApiKey: key });
  showStatus("Groq API key saved successfully.", true);
});

saveGeminiKeyBtn.addEventListener("click", async () => {
  const key = geminiKeyInput.value.trim();
  if (!key) return showStatus("Gemini API key cannot be empty.", false);
  let model = geminiModelSelect ? geminiModelSelect.value : "gemini-2.5-flash";
  if (model === "custom" && geminiCustomModelInput) {
    model = geminiCustomModelInput.value.trim() || "gemini-2.5-flash";
  }
  await chrome.storage.local.set({ geminiApiKey: key, geminiModel: model });
  showStatus("Gemini configuration saved successfully.", true);
});

saveOpenAIKeyBtn.addEventListener("click", async () => {
  const key = openaiKeyInput.value.trim();
  if (!key) return showStatus("OpenAI API key cannot be empty.", false);
  if (!key.startsWith("sk-")) {
    return showStatus("Warning: OpenAI keys typically start with 'sk-'.", false);
  }
  await chrome.storage.local.set({ openaiApiKey: key });
  showStatus("OpenAI API key saved successfully.", true);
});

saveOpenRouterKeyBtn.addEventListener("click", async () => {
  const key = openrouterKeyInput.value.trim();
  if (!key) return showStatus("OpenRouter key cannot be empty.", false);
  await chrome.storage.local.set({ openrouterApiKey: key });
  showStatus("OpenRouter API key saved successfully.", true);
});

saveOllamaBtn.addEventListener("click", async () => {
  const endpoint = ollamaEndpointInput.value.trim() || "http://localhost:11434";
  const model = ollamaModelInput.value.trim() || "llama3.2-vision";
  await chrome.storage.local.set({ ollamaEndpoint: endpoint, ollamaModel: model });
  showStatus(`Ollama configuration saved (${model}).`, true);
});

function showStatus(text, ok) {
  keyStatus.textContent = text;
  keyStatus.className = `status ${ok ? "status-success" : "status-error"}`;
  keyStatus.style.background = "";
  keyStatus.style.color = "";
  keyStatus.style.border = "";
  keyStatus.classList.remove("hidden");
  setTimeout(() => keyStatus.classList.add("hidden"), 3500);
}

function renderPresets(presets, activeId) {
  presetList.innerHTML = "";
  if (!presets || presets.length === 0) {
    presetList.innerHTML = '<p class="desc">No modes configured yet. Add one below.</p>';
    return;
  }

  presets.forEach((preset) => {
    const isActive = preset.id === activeId;
    const safeId = escapeHtml(preset.id);
    const div = document.createElement("div");
    div.className = "preset" + (isActive ? " active" : "");
    div.innerHTML = `
      <input type="radio" name="activePreset" ${isActive ? "checked" : ""} data-id="${safeId}" />
      <div class="preset-body">
        <div class="preset-name">${escapeHtml(preset.name)}</div>
        <div class="preset-text">${escapeHtml(preset.text)}</div>
        <div class="preset-actions">
          <button class="ghost edit-btn" data-id="${safeId}">Edit</button>
          <button class="ghost delete-btn" data-id="${safeId}">Delete</button>
        </div>
      </div>
    `;
    presetList.appendChild(div);
  });

  presetList.querySelectorAll('input[type="radio"]').forEach((radio) => {
    radio.addEventListener("change", async (e) => {
      const id = e.target.dataset.id;
      await chrome.storage.local.set({ activePresetId: id });
      const { instructionPresets = [] } = await chrome.storage.local.get(["instructionPresets"]);
      renderPresets(instructionPresets, id);
    });
  });

  presetList.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const id = e.target.dataset.id;
      const { instructionPresets = [] } = await chrome.storage.local.get(["instructionPresets"]);
      const preset = instructionPresets.find((p) => p.id === id);
      if (!preset) return;

      const presetEl = e.target.closest(".preset");
      const bodyEl = presetEl ? presetEl.querySelector(".preset-body") : null;
      if (!bodyEl) return;

      bodyEl.innerHTML = `
        <div class="preset-edit-form">
          <input type="text" class="edit-name-input" value="${escapeHtml(preset.name)}" placeholder="Mode name" />
          <textarea class="edit-text-input" placeholder="Instruction prompt">${escapeHtml(preset.text)}</textarea>
          <div class="preset-edit-actions">
            <button class="save-edit-btn" style="padding: 4px 12px; font-size: 12px;">Save</button>
            <button class="cancel-edit-btn ghost" style="padding: 4px 12px; font-size: 12px;">Cancel</button>
          </div>
        </div>
      `;

      bodyEl.querySelector(".save-edit-btn").addEventListener("click", async () => {
        const name = bodyEl.querySelector(".edit-name-input").value.trim();
        const text = bodyEl.querySelector(".edit-text-input").value.trim();
        if (!name || !text) {
          showStatus("Mode name and instruction cannot be empty.", false);
          return;
        }
        preset.name = name;
        preset.text = text;
        await chrome.storage.local.set({ instructionPresets });
        const { activePresetId } = await chrome.storage.local.get(["activePresetId"]);
        renderPresets(instructionPresets, activePresetId);
        showStatus(`Mode "${name}" updated.`, true);
      });

      bodyEl.querySelector(".cancel-edit-btn").addEventListener("click", async () => {
        const { activePresetId } = await chrome.storage.local.get(["activePresetId"]);
        renderPresets(instructionPresets, activePresetId);
      });
    });
  });

  presetList.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const id = e.target.dataset.id;
      const { instructionPresets = [], activePresetId } = await chrome.storage.local.get([
        "instructionPresets",
        "activePresetId",
      ]);
      if (instructionPresets.length <= 1) {
        showStatus("At least one mode is required.", false);
        return;
      }

      const actionsDiv = e.target.closest(".preset-actions");
      if (!actionsDiv) return;
      actionsDiv.innerHTML = `
        <div class="inline-confirm">
          <span>Delete mode?</span>
          <button class="confirm-del-btn danger" style="padding: 2px 8px; font-size: 11px;">Yes</button>
          <button class="cancel-del-btn ghost" style="padding: 2px 8px; font-size: 11px;">No</button>
        </div>
      `;

      actionsDiv.querySelector(".confirm-del-btn").addEventListener("click", async () => {
        const updated = instructionPresets.filter((p) => p.id !== id);
        let newActiveId = activePresetId;
        if (activePresetId === id) newActiveId = updated[0].id;
        await chrome.storage.local.set({ instructionPresets: updated, activePresetId: newActiveId });
        renderPresets(updated, newActiveId);
        showStatus("Mode deleted.", true);
      });

      actionsDiv.querySelector(".cancel-del-btn").addEventListener("click", async () => {
        const { activePresetId: curActive } = await chrome.storage.local.get(["activePresetId"]);
        renderPresets(instructionPresets, curActive);
      });
    });
  });
}

addPresetBtn.addEventListener("click", async () => {
  const name = newPresetName.value.trim();
  const text = newPresetText.value.trim();
  if (!name || !text) {
    showStatus("Please enter both a mode name and instruction text.", false);
    return;
  }
  const { instructionPresets = [] } = await chrome.storage.local.get(["instructionPresets"]);
  const id = "preset_" + Date.now();
  instructionPresets.push({ id, name, text });
  await chrome.storage.local.set({ instructionPresets, activePresetId: id });
  newPresetName.value = "";
  newPresetText.value = "";
  renderPresets(instructionPresets, id);
  showStatus(`Mode "${name}" created.`, true);
});

let clearHistoryPending = false;
clearHistoryBtn.addEventListener("click", async () => {
  if (!clearHistoryPending) {
    clearHistoryPending = true;
    const origText = clearHistoryBtn.textContent;
    clearHistoryBtn.textContent = "Click again to confirm";
    clearHistoryBtn.classList.add("danger");
    setTimeout(() => {
      clearHistoryPending = false;
      clearHistoryBtn.textContent = origText;
      clearHistoryBtn.classList.remove("danger");
    }, 4000);
    return;
  }

  clearHistoryPending = false;
  await chrome.storage.local.set({ sessionHistory: [] });
  historyCount.textContent = "0";
  clearHistoryBtn.textContent = "Clear Session History";
  clearHistoryBtn.classList.remove("danger");
  showStatus("Session history cleared.", true);
});

exportPdfBtn.addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("session.html") });
});

if (resetPresetsBtn) {
  resetPresetsBtn.addEventListener("click", async () => {
    if (!confirm("Restore all built-in personas and prompts to the latest default versions? Any custom modes you created will be kept.")) return;
    const { instructionPresets = [] } = await chrome.storage.local.get(["instructionPresets"]);
    const customOnly = instructionPresets.filter((p) => p.id && p.id.startsWith("preset_"));
    const restored = [...DEFAULT_PRESETS, ...customOnly];
    await chrome.storage.local.set({ instructionPresets: restored, activePresetId: DEFAULT_PRESETS[0].id });
    renderPresets(restored, DEFAULT_PRESETS[0].id);
    showStatus("Default personas restored successfully.", true);
  });
}

// ---------- Help & Support Ticket System ----------
const supportTicketForm = document.getElementById("supportTicketForm");
const ticketUserName = document.getElementById("ticketUserName");
const ticketUserEmail = document.getElementById("ticketUserEmail");
const ticketCategory = document.getElementById("ticketCategory");
const ticketSubject = document.getElementById("ticketSubject");
const ticketMessage = document.getElementById("ticketMessage");
const ticketIncludeDiag = document.getElementById("ticketIncludeDiag");
const ticketSubmitBtn = document.getElementById("ticketSubmitBtn");
const ticketMailtoBtn = document.getElementById("ticketMailtoBtn");
const ticketStatus = document.getElementById("ticketStatus");

function getDiagnosticsText() {
  const manifest = chrome.runtime?.getManifest ? chrome.runtime.getManifest() : { version: "2.1.1" };
  const activeCard = document.querySelector(".radio-card.active");
  const provider = activeCard ? activeCard.dataset.provider : "unknown";
  return [
    "--- System & Extension Diagnostics ---",
    `Extension: DezignSnap v${manifest.version || "2.1.1"} (Manifest V3)`,
    `Active AI Provider: ${provider}`,
    `Platform: ${navigator.platform || "Windows"}`,
    `User Agent: ${navigator.userAgent}`,
    `Screen: ${window.screen.width}x${window.screen.height}`,
    `Timestamp: ${new Date().toISOString()}`,
    "---------------------------------------",
  ].join("\n");
}

function showTicketStatus(msg, isSuccess) {
  if (!ticketStatus) return;
  ticketStatus.textContent = msg;
  ticketStatus.className = "status " + (isSuccess ? "success" : "error");
  ticketStatus.classList.remove("hidden");
  if (isSuccess) {
    setTimeout(() => {
      ticketStatus.classList.add("hidden");
    }, 10000);
  }
}

function composeMailtoUrl() {
  const email = (ticketUserEmail?.value || "").trim();
  const name = (ticketUserName?.value || "").trim();
  const cat = ticketCategory?.value || "General Support";
  const subj = (ticketSubject?.value || "").trim() || "DezignSnap Support Ticket";
  const desc = (ticketMessage?.value || "").trim();
  const diag = ticketIncludeDiag?.checked ? "\n\n" + getDiagnosticsText() : "";

  const fullSubject = `[DezignSnap Ticket - ${cat}] ${subj}`;
  const fullBody = [
    `Sender Name: ${name || "Not provided"}`,
    `Sender Email: ${email || "Not provided"}`,
    `Category: ${cat}`,
    `Subject: ${subj}`,
    "",
    "Description:",
    desc || "(No description entered)",
    diag,
  ].join("\n");

  return `mailto:hamzaka@dezignwise.com?subject=${encodeURIComponent(fullSubject)}&body=${encodeURIComponent(fullBody)}`;
}

if (ticketMailtoBtn) {
  ticketMailtoBtn.addEventListener("click", () => {
    window.location.href = composeMailtoUrl();
  });
}

if (supportTicketForm) {
  supportTicketForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = ticketUserName.value.trim();
    const email = ticketUserEmail.value.trim();
    const category = ticketCategory.value;
    const subject = ticketSubject.value.trim();
    const message = ticketMessage.value.trim();
    const includeDiag = ticketIncludeDiag.checked;

    if (!email || !subject || !message) {
      showTicketStatus("Please fill in your email, subject, and description.", false);
      return;
    }

    ticketSubmitBtn.disabled = true;
    const originalBtnText = ticketSubmitBtn.innerHTML;
    ticketSubmitBtn.textContent = "Sending Ticket...";

    const diagnostics = includeDiag ? getDiagnosticsText() : "Diagnostics omitted by user";
    const ticketId = "DS-" + Date.now().toString(36).toUpperCase();

    const payload = {
      _subject: `[DezignSnap Ticket ${ticketId} - ${category}] ${subject}`,
      ticketId,
      name: name || "Anonymous User",
      email,
      category,
      subject,
      message,
      diagnostics,
      _template: "table",
      _captcha: "false",
    };

    try {
      const response = await fetch("https://formsubmit.co/ajax/hamzaka@dezignwise.com", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.success !== "false") {
        showTicketStatus(`Ticket #${ticketId} submitted successfully! Delivered directly to hamzaka@dezignwise.com. We'll reply to ${email} shortly.`, true);
        ticketSubject.value = "";
        ticketMessage.value = "";
      } else {
        // Fallback to mailto
        window.location.href = composeMailtoUrl();
        showTicketStatus(`Opening your email client to send ticket #${ticketId} to hamzaka@dezignwise.com...`, true);
      }
    } catch (err) {
      // Offline or network block fallback
      window.location.href = composeMailtoUrl();
      showTicketStatus(`Opening your default email app to send ticket directly to hamzaka@dezignwise.com...`, true);
    } finally {
      ticketSubmitBtn.disabled = false;
      ticketSubmitBtn.innerHTML = originalBtnText;
    }
  });
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
