const providerOpenAI = document.getElementById("providerOpenAI");
const providerGemini = document.getElementById("providerGemini");
const openaiKeyInput = document.getElementById("openaiKeyInput");
const geminiKeyInput = document.getElementById("geminiKeyInput");
const saveOpenAIKeyBtn = document.getElementById("saveOpenAIKeyBtn");
const saveGeminiKeyBtn = document.getElementById("saveGeminiKeyBtn");
const keyStatus = document.getElementById("keyStatus");
const presetList = document.getElementById("presetList");
const newPresetName = document.getElementById("newPresetName");
const newPresetText = document.getElementById("newPresetText");
const addPresetBtn = document.getElementById("addPresetBtn");
const historyCount = document.getElementById("historyCount");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");

init();

async function init() {
  const {
    openaiApiKey = "",
    geminiApiKey = "",
    activeProvider = "openai",
    instructionPresets = [],
    activePresetId,
    sessionHistory = [],
  } = await chrome.storage.local.get([
    "openaiApiKey",
    "geminiApiKey",
    "activeProvider",
    "instructionPresets",
    "activePresetId",
    "sessionHistory",
  ]);

  openaiKeyInput.value = openaiApiKey;
  geminiKeyInput.value = geminiApiKey;
  if (activeProvider === "gemini") {
    providerGemini.checked = true;
  } else {
    providerOpenAI.checked = true;
  }

  renderPresets(instructionPresets, activePresetId);
  historyCount.textContent = sessionHistory.length;
}

providerOpenAI.addEventListener("change", () => {
  if (providerOpenAI.checked) chrome.storage.local.set({ activeProvider: "openai" });
});
providerGemini.addEventListener("change", () => {
  if (providerGemini.checked) chrome.storage.local.set({ activeProvider: "gemini" });
});

saveOpenAIKeyBtn.addEventListener("click", async () => {
  const key = openaiKeyInput.value.trim();
  if (!key) {
    showStatus("The OpenAI key cannot be empty.", false);
    return;
  }
  if (!key.startsWith("sk-")) {
    showStatus("This doesn't look like a valid OpenAI key (should start with 'sk-').", false);
    return;
  }
  await chrome.storage.local.set({ openaiApiKey: key });
  showStatus("OpenAI API key saved ✅", true);
});

saveGeminiKeyBtn.addEventListener("click", async () => {
  const key = geminiKeyInput.value.trim();
  if (!key) {
    showStatus("The Gemini key cannot be empty.", false);
    return;
  }
  await chrome.storage.local.set({ geminiApiKey: key });
  showStatus("Gemini API key saved ✅", true);
});

function showStatus(text, ok) {
  keyStatus.textContent = text;
  keyStatus.style.color = ok ? "#4a7a4a" : "#b0524f";
  keyStatus.classList.remove("hidden");
  setTimeout(() => keyStatus.classList.add("hidden"), 3500);
}

function renderPresets(presets, activeId) {
  presetList.innerHTML = "";
  if (presets.length === 0) {
    presetList.innerHTML = '<p class="desc">No presets yet. Add one below.</p>';
    return;
  }

  presets.forEach((preset) => {
    const isActive = preset.id === activeId;
    const div = document.createElement("div");
    div.className = "preset" + (isActive ? " active" : "");
    div.innerHTML = `
      <input type="radio" name="activePreset" ${isActive ? "checked" : ""} data-id="${preset.id}" />
      <div class="preset-body">
        <div class="preset-name">${escapeHtml(preset.name)}</div>
        <div class="preset-text">${escapeHtml(preset.text)}</div>
        <div class="preset-actions">
          <button class="ghost edit-btn" data-id="${preset.id}">Edit</button>
          <button class="ghost delete-btn" data-id="${preset.id}">Delete</button>
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
      const newName = prompt("Preset name:", preset.name);
      if (newName === null) return;
      const newText = prompt("Instruction:", preset.text);
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
        alert("At least one preset is required — create a new one first, then delete this one.");
        return;
      }
      if (!confirm("Delete this preset?")) return;
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
    alert("Please enter both a name and an instruction.");
    return;
  }
  const { instructionPresets = [] } = await chrome.storage.local.get(["instructionPresets"]);
  const id = "preset_" + Date.now();
  instructionPresets.push({ id, name, text });
  await chrome.storage.local.set({ instructionPresets, activePresetId: id });
  newPresetName.value = "";
  newPresetText.value = "";
  renderPresets(instructionPresets, id);
});

clearHistoryBtn.addEventListener("click", async () => {
  if (!confirm("This will permanently delete your entire session history. Continue?")) return;
  await chrome.storage.local.set({ sessionHistory: [] });
  historyCount.textContent = "0";
});

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str || "";
  return d.innerHTML;
}
