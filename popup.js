const openOptionsBtn = document.getElementById("openOptionsBtn");
const keyWarning = document.getElementById("keyWarning");
const warningText = document.getElementById("warningText");
const setupLink = document.getElementById("setupLink");
const providerSelect = document.getElementById("providerSelect");
const providerStatusText = document.getElementById("providerStatusText");
const aiModeSelect = document.getElementById("aiModeSelect");
const aiModeStatusText = document.getElementById("aiModeStatusText");
const hudPositionSelect = document.getElementById("hudPositionSelect");
const presetSelect = document.getElementById("presetSelect");
const quickSnipBtn = document.getElementById("quickSnipBtn");
const fallbackAskBtn = document.getElementById("fallbackAskBtn");
const directChatBtn = document.getElementById("directChatBtn");
const stealthModeToggle = document.getElementById("stealthModeToggle");
const fallbackAnswer = document.getElementById("fallbackAnswer");
const statusMsg = document.getElementById("statusMsg");

init();

async function init() {
  const {
    openaiApiKey = "",
    geminiApiKey = "",
    groqApiKey = "",
    openrouterApiKey = "",
    activeProvider = "groq",
    aiMode = "direct",
    hudPosition = "right",
    stealthMode = false,
    instructionPresets = [],
    activePresetId,
  } = await chrome.storage.local.get([
    "openaiApiKey",
    "geminiApiKey",
    "groqApiKey",
    "openrouterApiKey",
    "activeProvider",
    "aiMode",
    "hudPosition",
    "stealthMode",
    "instructionPresets",
    "activePresetId",
  ]);

  providerSelect.value = activeProvider;
  if (aiModeSelect) aiModeSelect.value = aiMode;
  if (aiModeStatusText) aiModeStatusText.textContent = aiMode === "thinking" ? "Deep Thinking" : "Direct";
  if (hudPositionSelect) hudPositionSelect.value = hudPosition;
  if (stealthModeToggle) stealthModeToggle.checked = !!stealthMode;

  updateKeyWarning(activeProvider, { openaiApiKey, geminiApiKey, groqApiKey, openrouterApiKey });
  renderPresetOptions(instructionPresets, activePresetId);
}

function renderPresetOptions(instructionPresets, activePresetId) {
  presetSelect.innerHTML = "";
  if (!instructionPresets || instructionPresets.length === 0) {
    const opt = document.createElement("option");
    opt.textContent = "General Page Helper";
    presetSelect.appendChild(opt);
  } else {
    instructionPresets.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = p.name;
      if (p.id === activePresetId) opt.selected = true;
      presetSelect.appendChild(opt);
    });
  }
}

function updateKeyWarning(provider, keys) {
  if (provider === "ollama") {
    keyWarning.classList.add("hidden");
    providerStatusText.textContent = "Local AI (Ready)";
    providerStatusText.style.color = "#4ade80";
    return;
  }

  let hasKey = false;
  if (provider === "groq") hasKey = !!(keys.groqApiKey && keys.groqApiKey.trim());
  else if (provider === "gemini") hasKey = !!(keys.geminiApiKey && keys.geminiApiKey.trim());
  else if (provider === "openai") hasKey = !!(keys.openaiApiKey && keys.openaiApiKey.trim());
  else if (provider === "openrouter") hasKey = !!(keys.openrouterApiKey && keys.openrouterApiKey.trim());

  if (hasKey) {
    keyWarning.classList.add("hidden");
    providerStatusText.textContent = "Ready";
    providerStatusText.style.color = "#4ade80";
  } else {
    keyWarning.classList.remove("hidden");
    warningText.textContent = `No API key set for ${provider.toUpperCase()}.`;
    providerStatusText.textContent = "Missing Key";
    providerStatusText.style.color = "#ff4d4d";
  }
}

providerSelect.addEventListener("change", async () => {
  const selectedProvider = providerSelect.value;
  await chrome.storage.local.set({ activeProvider: selectedProvider });
  const keys = await chrome.storage.local.get([
    "openaiApiKey",
    "geminiApiKey",
    "groqApiKey",
    "openrouterApiKey",
  ]);
  updateKeyWarning(selectedProvider, keys);
  showStatus(`Engine set to ${selectedProvider.toUpperCase()}`);
});

if (aiModeSelect) {
  aiModeSelect.addEventListener("change", async () => {
    const val = aiModeSelect.value;
    await chrome.storage.local.set({ aiMode: val });
    if (aiModeStatusText) aiModeStatusText.textContent = val === "thinking" ? "Deep Thinking" : "Direct";
    showStatus(`Mode: ${val === "thinking" ? "Thinking" : "Direct"}`);
  });
}

if (hudPositionSelect) {
  hudPositionSelect.addEventListener("change", async () => {
    const val = hudPositionSelect.value;
    await chrome.storage.local.set({ hudPosition: val });
    showStatus(`Toolbar position: ${val.toUpperCase()}`);
  });
}

if (stealthModeToggle) {
  stealthModeToggle.addEventListener("change", async () => {
    const val = stealthModeToggle.checked;
    await chrome.storage.local.set({ stealthMode: val });
    showStatus(`Stealth Mode: ${val ? "ON (Hidden from screen share)" : "OFF"}`);
  });
}

presetSelect.addEventListener("change", async () => {
  await chrome.storage.local.set({ activePresetId: presetSelect.value });
  showStatus("Persona updated");
});

openOptionsBtn.addEventListener("click", () => chrome.runtime.openOptionsPage());
setupLink.addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});
const popupSupportLink = document.getElementById("popupSupportLink");
if (popupSupportLink) {
  popupSupportLink.addEventListener("click", (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
}

// Quick Snip Area (Alt+S equivalent)
quickSnipBtn.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.id) {
    chrome.tabs.sendMessage(tab.id, { type: "TRIGGER_SNIP" }, () => void chrome.runtime.lastError);
    window.close();
  }
});

// Direct AI Chat without screenshot
if (directChatBtn) {
  directChatBtn.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, { type: "OPEN_DIRECT_CHAT" }, () => void chrome.runtime.lastError);
      window.close();
    }
  });
}

// Full page analyze
fallbackAskBtn.addEventListener("click", () => {
  fallbackAskBtn.disabled = true;
  const original = fallbackAskBtn.innerHTML;
  fallbackAskBtn.textContent = "Analyzing...";
  fallbackAnswer.classList.add("hidden");

  chrome.runtime.sendMessage({ type: "SOLVE_WITH_AI_ACTIVE_TAB" }, (response) => {
    fallbackAskBtn.disabled = false;
    fallbackAskBtn.innerHTML = original;
    fallbackAnswer.classList.remove("hidden");

    if (chrome.runtime.lastError) {
      fallbackAnswer.textContent = "Error: " + chrome.runtime.lastError.message;
      fallbackAnswer.scrollTop = 0;
      return;
    }
    if (response && response.success) {
      const confidenceLabel = response.confidence ? ` [${response.confidence} confidence]` : "";
      fallbackAnswer.textContent = response.answer + confidenceLabel;
      fallbackAnswer.scrollTop = 0;
    } else {
      fallbackAnswer.textContent = "Error: " + (response?.error || "Something went wrong.");
      fallbackAnswer.scrollTop = 0;
    }
  });
});

function showStatus(text) {
  statusMsg.textContent = text;
  statusMsg.classList.remove("hidden");
  setTimeout(() => statusMsg.classList.add("hidden"), 2500);
}
