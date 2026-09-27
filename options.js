const groqKeyInput = document.getElementById("groqKeyInput");
const geminiKeyInput = document.getElementById("geminiKeyInput");
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

const radioCards = document.querySelectorAll(".radio-card");

init();

async function init() {
  const {
    openaiApiKey = "",
    geminiApiKey = "",
    groqApiKey = "",
    openrouterApiKey = "",
    ollamaEndpoint = "http://localhost:11434",
    ollamaModel = "llama3.2-vision",
    activeProvider = "groq",
    instructionPresets = [],
    activePresetId,
    sessionHistory = [],
  } = await chrome.storage.local.get([
    "openaiApiKey",
    "geminiApiKey",
    "groqApiKey",
    "openrouterApiKey",
    "ollamaEndpoint",
    "ollamaModel",
    "activeProvider",
    "instructionPresets",
    "activePresetId",
    "sessionHistory",
  ]);

  groqKeyInput.value = groqApiKey;
  geminiKeyInput.value = geminiApiKey;
  openaiKeyInput.value = openaiApiKey;
  openrouterKeyInput.value = openrouterApiKey;
  ollamaEndpointInput.value = ollamaEndpoint;
  ollamaModelInput.value = ollamaModel;

  setActiveProviderCard(activeProvider);
  renderPresets(instructionPresets, activePresetId);
  historyCount.textContent = sessionHistory.length;
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
    showStatus(`Active engine switched to ${val.toUpperCase()} ⚡`, true);
  });
});

saveGroqKeyBtn.addEventListener("click", async () => {
  const key = groqKeyInput.value.trim();
  if (!key) return showStatus("Groq API key cannot be empty.", false);
  if (!key.startsWith("gsk_")) {
    return showStatus("Warning: Groq keys typically start with 'gsk_'.", false);
  }
  await chrome.storage.local.set({ groqApiKey: key });
  showStatus("Groq API key saved successfully ✅", true);
});

saveGeminiKeyBtn.addEventListener("click", async () => {
  const key = geminiKeyInput.value.trim();
  if (!key) return showStatus("Gemini API key cannot be empty.", false);
  await chrome.storage.local.set({ geminiApiKey: key });
  showStatus("Gemini API key saved successfully ✅", true);
});

saveOpenAIKeyBtn.addEventListener("click", async () => {
  const key = openaiKeyInput.value.trim();
  if (!key) return showStatus("OpenAI API key cannot be empty.", false);
  if (!key.startsWith("sk-")) {
    return showStatus("Warning: OpenAI keys typically start with 'sk-'.", false);
  }
  await chrome.storage.local.set({ openaiApiKey: key });
  showStatus("OpenAI API key saved successfully ✅", true);
});

saveOpenRouterKeyBtn.addEventListener("click", async () => {
  const key = openrouterKeyInput.value.trim();
  if (!key) return showStatus("OpenRouter key cannot be empty.", false);
  await chrome.storage.local.set({ openrouterApiKey: key });
  showStatus("OpenRouter API key saved successfully ✅", true);
});

saveOllamaBtn.addEventListener("click", async () => {
  const endpoint = ollamaEndpointInput.value.trim() || "http://localhost:11434";
  const model = ollamaModelInput.value.trim() || "llama3.2-vision";
  await chrome.storage.local.set({ ollamaEndpoint: endpoint, ollamaModel: model });
  showStatus(`Ollama configuration saved (${model}) ✅`, true);
});

function showStatus(text, ok) {
  keyStatus.textContent = text;
  keyStatus.style.background = ok ? "rgba(57, 62, 70, 0.95)" : "rgba(57, 62, 70, 0.95)";
  keyStatus.style.color = ok ? "#DFD0B8" : "#ff8585";
  keyStatus.style.border = ok ? "1px solid #948979" : "1px solid #e06c75";
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
      const newName = prompt("Mode name:", preset.name);
      if (newName === null) return;
      const newText = prompt("Instruction prompt:", preset.text);
      if (newText === null) return;
      preset.name = newName.trim() || preset.name;
      preset.text = newText.trim() || preset.text;
      await chrome.storage.local.set({ instructionPresets });
      const { activePresetId } = await chrome.storage.local.get(["activePresetId"]);
      renderPresets(instructionPresets, activePresetId);
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
        alert("At least one mode is required.");
        return;
      }
      if (!confirm("Delete this mode?")) return;
      const updated = instructionPresets.filter((p) => p.id !== id);
      let newActiveId = activePresetId;
      if (activePresetId === id) newActiveId = updated[0].id;
      await chrome.storage.local.set({ instructionPresets: updated, activePresetId: newActiveId });
      renderPresets(updated, newActiveId);
    });
  });
}

addPresetBtn.addEventListener("click", async () => {
  const name = newPresetName.value.trim();
  const text = newPresetText.value.trim();
  if (!name || !text) {
    alert("Please enter both a mode name and instruction text.");
    return;
  }
  const { instructionPresets = [] } = await chrome.storage.local.get(["instructionPresets"]);
  const id = "preset_" + Date.now();
  instructionPresets.push({ id, name, text });
  await chrome.storage.local.set({ instructionPresets, activePresetId: id });
  newPresetName.value = "";
  newPresetText.value = "";
  renderPresets(instructionPresets, id);
  showStatus(`Mode "${name}" created ✅`, true);
});

clearHistoryBtn.addEventListener("click", async () => {
  if (!confirm("This will permanently clear your session history. Continue?")) return;
  await chrome.storage.local.set({ sessionHistory: [] });
  historyCount.textContent = "0";
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
