const openOptionsBtn = document.getElementById("openOptionsBtn");
const keyWarning = document.getElementById("keyWarning");
const setupLink = document.getElementById("setupLink");
const providerSelect = document.getElementById("providerSelect");
const presetSelect = document.getElementById("presetSelect");
const fallbackAskBtn = document.getElementById("fallbackAskBtn");
const fallbackAnswer = document.getElementById("fallbackAnswer");
const statusMsg = document.getElementById("statusMsg");

init();

async function init() {
  const {
    openaiApiKey,
    geminiApiKey,
    activeProvider = "openai",
    instructionPresets = [],
    activePresetId,
  } = await chrome.storage.local.get([
    "openaiApiKey",
    "geminiApiKey",
    "activeProvider",
    "instructionPresets",
    "activePresetId",
  ]);

  providerSelect.value = activeProvider === "gemini" ? "gemini" : "openai";
  updateKeyWarning(activeProvider, openaiApiKey, geminiApiKey);

  presetSelect.innerHTML = "";
  if (instructionPresets.length === 0) {
    const opt = document.createElement("option");
    opt.textContent = "No presets yet — create one in Settings";
    presetSelect.appendChild(opt);
    presetSelect.disabled = true;
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

function updateKeyWarning(provider, openaiApiKey, geminiApiKey) {
  const key = provider === "gemini" ? geminiApiKey : openaiApiKey;
  keyWarning.classList.toggle("hidden", !!(key && key.trim()));
}

providerSelect.addEventListener("change", async () => {
  await chrome.storage.local.set({ activeProvider: providerSelect.value });
  const { openaiApiKey, geminiApiKey } = await chrome.storage.local.get(["openaiApiKey", "geminiApiKey"]);
  updateKeyWarning(providerSelect.value, openaiApiKey, geminiApiKey);
  showStatus("Provider switched ✅");
});

presetSelect.addEventListener("change", async () => {
  await chrome.storage.local.set({ activePresetId: presetSelect.value });
  showStatus("Active instruction updated ✅");
});

openOptionsBtn.addEventListener("click", () => chrome.runtime.openOptionsPage());
setupLink.addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

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
