const openOptionsBtn = document.getElementById("openOptionsBtn");
const keyWarning = document.getElementById("keyWarning");
const warningText = document.getElementById("warningText");
const setupLink = document.getElementById("setupLink");
const providerSelect = document.getElementById("providerSelect");
const providerStatusText = document.getElementById("providerStatusText");
const presetSelect = document.getElementById("presetSelect");
const quickSnipBtn = document.getElementById("quickSnipBtn");
const fallbackAskBtn = document.getElementById("fallbackAskBtn");
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
    instructionPresets = [],
    activePresetId,
  } = await chrome.storage.local.get([
    "openaiApiKey",
    "geminiApiKey",
    "groqApiKey",
    "openrouterApiKey",
    "activeProvider",
    "instructionPresets",
    "activePresetId",
  ]);

  providerSelect.value = activeProvider;
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
    // Local AI requires no API key
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
  showStatus(`Engine switched to ${selectedProvider.toUpperCase()} ✅`);
});

presetSelect.addEventListener("change", async () => {
  await chrome.storage.local.set({ activePresetId: presetSelect.value });
  showStatus("Persona updated ✅");
});

openOptionsBtn.addEventListener("click", () => chrome.runtime.openOptionsPage());
setupLink.addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

// Quick Snip Area (Alt+S equivalent)
quickSnipBtn.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.id) {
    chrome.tabs.sendMessage(tab.id, { type: "TRIGGER_SNIP" });
    window.close(); // Close popup so user can immediately drag
  }
});

// Full page analyze
fallbackAskBtn.addEventListener("click", () => {
  fallbackAskBtn.disabled = true;
  const original = fallbackAskBtn.textContent;
  fallbackAskBtn.textContent = "⏳ Thinking...";
  fallbackAnswer.classList.add("hidden");

  chrome.runtime.sendMessage({ type: "SOLVE_WITH_AI_ACTIVE_TAB" }, (response) => {
    fallbackAskBtn.disabled = false;
    fallbackAskBtn.textContent = original;
    fallbackAnswer.classList.remove("hidden");

    if (chrome.runtime.lastError) {
      fallbackAnswer.textContent = "Error: " + chrome.runtime.lastError.message;
      return;
    }
    if (response && response.success) {
      const confidenceLabel = response.confidence ? ` [${response.confidence} confidence]` : "";
      fallbackAnswer.textContent = response.answer + confidenceLabel;
    } else {
      fallbackAnswer.textContent = "Error: " + (response?.error || "Something went wrong.");
    }
  });
});

function showStatus(text) {
  statusMsg.textContent = text;
  statusMsg.classList.remove("hidden");
  setTimeout(() => statusMsg.classList.add("hidden"), 2500);
}
