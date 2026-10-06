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

  // Ensure default and quiz_solver presets are up to date
  let presetsUpdated = false;
  if (instructionPresets && instructionPresets.length > 0) {
    const defPreset = instructionPresets.find((p) => p.id === "default");
    if (defPreset && defPreset.text.includes("Explain what this page is about, or tell me the exact location")) {
      defPreset.name = "General page & problem solver";
      defPreset.text = "Analyze what is visible. If this contains a question, quiz, or problem, solve it accurately from first principles, evaluate all choices, and provide the verified correct answer. If looking for an option or UI element, state its exact position.";
      presetsUpdated = true;
    }
    const quizPreset = instructionPresets.find((p) => p.id === "quiz_solver");
    if (quizPreset && quizPreset.name && quizPreset.name.includes("")) {
      quizPreset.name = "Quiz & MCQ Solver (Verified)";
      presetsUpdated = true;
    }
    if (!instructionPresets.some((p) => p.id === "quiz_solver")) {
      instructionPresets.splice(1, 0, {
        id: "quiz_solver",
        name: "Quiz & MCQ Solver (Verified)",
        text: "Accurately solve this multiple-choice question, test, or problem. Independently evaluate every option from first principles. State the exact correct option and letter, prove why it is correct, and explain why the other options are wrong. Never assume any option selected or highlighted on screen is correct.",
      });
      presetsUpdated = true;
    }
    if (presetsUpdated) {
      await chrome.storage.local.set({ instructionPresets });
    }
  }

  setActiveProviderCard(activeProvider);
  renderPresets(instructionPresets, activePresetId);
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

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
