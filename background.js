/**
 * Page Helper AI / Snip & Ask — Background Service Worker
 * Supports: OpenAI (GPT-4o), Google Gemini, Groq, OpenRouter, and Ollama (Local AI)
 */

const PROVIDER_CONFIGS = {
  openai: {
    label: "OpenAI",
    endpoint: "https://api.openai.com/v1/chat/completions",
    defaultModel: "gpt-4o",
    type: "openai_compat",
  },
  gemini: {
    label: "Google Gemini",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models",
    defaultModel: "gemini-3.6-flash",
    type: "gemini",
  },
  groq: {
    label: "Groq (Ultra-Fast)",
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    defaultModel: "llama-3.2-11b-vision-preview",
    type: "openai_compat",
  },
  openrouter: {
    label: "OpenRouter",
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
    defaultModel: "google/gemini-2.0-flash-001",
    type: "openai_compat",
  },
  ollama: {
    label: "Ollama (Local AI)",
    endpoint: "http://localhost:11434/v1/chat/completions",
    defaultModel: "llama3.2-vision",
    type: "ollama",
  },
};

const SYSTEM_PROMPT =
  "You are a page-understanding assistant. The user has configured a fixed instruction that you must follow every time, " +
  "and you are given a screenshot of the current webpage (this may be the full visible page, or a specific region the user selected and zoomed into) or highlighted text. " +
  "RULES: " +
  "1) Only state what is CLEARLY visible in the screenshot — if something is blurry, cut off, or not visible, do not guess; state plainly that it is not visible. " +
  "2) Do not fill in facts from your training knowledge when the screenshot itself shows that content — what is on screen is the source of truth. " +
  "3) Keep answers direct, short, and to the point — no lengthy preamble; give the actual answer in the first line. " +
  "4) If the instruction asks you to locate a button/option/link, state its exact location (e.g. 'top-right corner', 'below the sidebar'). " +
  "5) Before answering, verify that what you're about to say matches the screenshot — speed matters, but a correct answer that takes one extra second beats a fast wrong one. " +
  "6) At the very end of your answer, on a new line, output ONLY this (nothing else on that line): CONFIDENCE: High or CONFIDENCE: Medium or CONFIDENCE: Low. " +
  "Use High when what you stated was 100% clearly visible. Medium when it was somewhat ambiguous or partially visible. Low when you had to guess or the content wasn't clearly visible. " +
  "If the user asks a follow-up question, remember the prior conversation and answer with reference to the same screenshot. " +
  "Respond in the same language the user's instruction is written in.";

const DEFAULT_PRESETS = [
  {
    id: "default",
    name: "General page helper",
    text: "Explain what this page is about, or tell me the exact location of the option/button I'm looking for.",
  },
  {
    id: "eli5",
    name: "Explain Like I'm 5 (ELI5)",
    text: "Explain what is on this screen in super simple terms that a 5-year-old or non-technical beginner would understand. Use bullet points.",
  },
  {
    id: "roast",
    name: "Roast My UI / Code",
    text: "Give a witty, humorous, but constructive roast and design critique of the UI, layout, typography, or code visible on this screen.",
  },
  {
    id: "finder",
    name: "Target Option Finder",
    text: "Locate the specific button, setting, or navigation link on this screen. State its exact visual position (e.g. top-right, under header) and color.",
  },
  {
    id: "translate",
    name: "Translate & Summarize",
    text: "Translate any text on this screen to clear English and provide a short executive summary.",
  },
  {
    id: "bug_hunter",
    name: "Bug & Edge Case Hunter",
    text: "Audit this UI for design bugs, alignment errors, contrast issues, or UX anti-patterns.",
  },
];

// tabId -> { id, provider, apiKey, screenshotDataUrl, thumbnail, pageTitle, pageUrl, startedAt, turns: [{role, text, confidence}] }
const activeConversations = new Map();
const inFlightTabs = new Set();

chrome.runtime.onInstalled.addListener((details) => {
  // Context menu for quick right-click text queries
  chrome.contextMenus.create({
    id: "ph_ask_text",
    title: "⚡ Ask AI about '%s'",
    contexts: ["selection"],
  });

  if (details.reason === "install") {
    chrome.storage.local.get(["instructionPresets", "activeProvider"], (result) => {
      if (!result.instructionPresets || result.instructionPresets.length === 0) {
        chrome.storage.local.set({
          instructionPresets: DEFAULT_PRESETS,
          activePresetId: DEFAULT_PRESETS[0].id,
        });
      }
      if (!result.activeProvider) {
        chrome.storage.local.set({ activeProvider: "openai" });
      }
    });
    chrome.tabs.create({ url: chrome.runtime.getURL("welcome.html") });
  }
});

// Handle right click context menu selection
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "ph_ask_text" && info.selectionText) {
    handleTextQuery(tab, info.selectionText);
  }
});

// Handle keyboard shortcuts (Alt+S for snip, Alt+A for full page)
chrome.commands.onCommand.addListener((command) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs && tabs[0];
    if (!tab || !tab.id) return;
    if (command === "snip_screen") {
      chrome.tabs.sendMessage(tab.id, { type: "TRIGGER_SNIP" });
    } else if (command === "solve_full_page") {
      handleSolve(tab, (res) => {
        chrome.tabs.sendMessage(tab.id, { type: "SHOW_RESULT", result: res });
      });
    }
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === "SOLVE_WITH_AI") {
    handleSolve(sender.tab, sendResponse);
    return true;
  }
  if (message && message.type === "SOLVE_WITH_AI_ACTIVE_TAB") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      handleSolve(tabs && tabs[0], sendResponse);
    });
    return true;
  }
  if (message && message.type === "SOLVE_WITH_AI_REGION") {
    handleSolveRegion(sender.tab, message.region, sendResponse);
    return true;
  }
  if (message && message.type === "FOLLOWUP_WITH_AI") {
    handleFollowup(sender.tab, message.question, sendResponse);
    return true;
  }
  if (message && message.type === "OPEN_SESSION_EXPORT") {
    chrome.tabs.create({ url: chrome.runtime.getURL("session.html") });
  }
});

// Free the in-memory conversation when its tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  activeConversations.delete(tabId);
  inFlightTabs.delete(tabId);
});

async function handleSolve(tab, sendResponse) {
  if (tab && tab.id && inFlightTabs.has(tab.id)) {
    sendResponse({ success: false, error: "An AI analysis is already running for this tab. Please wait a moment." });
    return;
  }
  if (tab && tab.id) inFlightTabs.add(tab.id);

  try {
    const check = await validateBasics(tab);
    if (!check.ok) return sendResponse(check.response);
    const { providerInfo, aiInstruction } = check;

    const dataUrl = await captureTab(tab.windowId);
    await runFreshConversation({
      tab,
      providerInfo,
      screenshotDataUrl: dataUrl,
      instruction: aiInstruction,
      sendResponse,
    });
  } catch (err) {
    sendResponse({ success: false, error: err.message || String(err) });
  } finally {
    if (tab && tab.id) inFlightTabs.delete(tab.id);
  }
}

async function handleSolveRegion(tab, region, sendResponse) {
  if (tab && tab.id && inFlightTabs.has(tab.id)) {
    sendResponse({ success: false, error: "An AI analysis is already running for this tab. Please wait a moment." });
    return;
  }

  // Strict region validation against malformed or malicious payloads
  if (
    !region ||
    typeof region.x !== "number" ||
    typeof region.y !== "number" ||
    typeof region.width !== "number" ||
    typeof region.height !== "number" ||
    !Number.isFinite(region.x) ||
    !Number.isFinite(region.y) ||
    !Number.isFinite(region.width) ||
    !Number.isFinite(region.height) ||
    region.width < 10 ||
    region.height < 10
  ) {
    sendResponse({ success: false, error: "Invalid selection area dimensions. Please select a larger region." });
    return;
  }

  if (tab && tab.id) inFlightTabs.add(tab.id);

  try {
    const check = await validateBasics(tab);
    if (!check.ok) return sendResponse(check.response);
    const { providerInfo, aiInstruction } = check;

    const fullShot = await captureTab(tab.windowId);
    const croppedDataUrl = await cropAndUpscale(fullShot, region);
    const focusedInstruction = `${aiInstruction}\n\n(Note: this screenshot is ONLY the specific area the user selected and zoomed into.)`;

    await runFreshConversation({
      tab,
      providerInfo,
      screenshotDataUrl: croppedDataUrl,
      instruction: focusedInstruction,
      displayInstruction: aiInstruction,
      sendResponse,
    });
  } catch (err) {
    sendResponse({ success: false, error: err.message || String(err) });
  } finally {
    if (tab && tab.id) inFlightTabs.delete(tab.id);
  }
}

async function handleTextQuery(tab, selectedText) {
  if (!tab || !tab.id) return;
  chrome.tabs.sendMessage(tab.id, { type: "START_TEXT_QUERY", text: selectedText });

  try {
    const providerInfo = await getActiveProviderAndKey();
    if (!providerInfo.apiKey && providerInfo.provider !== "ollama") {
      chrome.tabs.sendMessage(tab.id, {
        type: "SHOW_RESULT",
        result: { success: false, error: `Please set your ${providerInfo.providerLabel} API key in Settings first.` },
      });
      return;
    }

    const prompt = `Selected text from the webpage:\n"${selectedText}"\n\nPlease explain what this means, define any unfamiliar terms, or answer any question it raises concisely.`;
    const turns = [{ role: "user", text: prompt }];

    let raw;
    if (providerInfo.type === "gemini") {
      raw = await askGeminiMultiTurn(providerInfo.apiKey, null, turns, providerInfo.model);
    } else {
      raw = await askOpenAICompatibleMultiTurn({
        endpoint: providerInfo.endpoint,
        model: providerInfo.model,
        apiKey: providerInfo.apiKey,
        screenshotDataUrl: null,
        turns,
        isOllama: providerInfo.provider === "ollama",
      });
    }

    const { text, confidence } = parseConfidence(raw);
    const conv = {
      id: "conv_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
      providerInfo,
      screenshotDataUrl: null,
      thumbnail: null,
      pageTitle: tab.title || "",
      pageUrl: tab.url || "",
      startedAt: Date.now(),
      lastUpdated: Date.now(),
      turns: [
        { role: "user", text: `Selected text: "${selectedText}"` },
        { role: "assistant", text, confidence: confidence || "High" },
      ],
    };

    activeConversations.set(tab.id, conv);
    await upsertSessionHistoryFromConv(conv, tab);

    chrome.tabs.sendMessage(tab.id, {
      type: "SHOW_RESULT",
      result: {
        success: true,
        answer: text,
        confidence: confidence || "High",
        instructionUsed: `Selected text: "${selectedText}"`,
        conversationId: conv.id,
      },
    });
  } catch (err) {
    chrome.tabs.sendMessage(tab.id, {
      type: "SHOW_RESULT",
      result: { success: false, error: err.message || String(err) },
    });
  }
}

async function handleFollowup(tab, question, sendResponse) {
  try {
    if (!tab || !tab.id) {
      sendResponse({ success: false, error: "Could not identify the tab." });
      return;
    }
    if (inFlightTabs.has(tab.id)) {
      sendResponse({ success: false, error: "An AI request is already in progress for this tab. Please wait." });
      return;
    }
    const conv = activeConversations.get(tab.id);
    if (!conv) {
      sendResponse({ success: false, error: "Start with 'Snip & Ask' or 'Select Area' first, then ask a follow-up." });
      return;
    }
    const trimmedQuestion = (question || "").trim();
    if (!trimmedQuestion) {
      sendResponse({ success: false, error: "Please enter a follow-up question." });
      return;
    }
    if (trimmedQuestion.length > 2000) {
      sendResponse({ success: false, error: "Follow-up question exceeds maximum allowed length (2,000 characters)." });
      return;
    }

    inFlightTabs.add(tab.id);
    conv.turns.push({ role: "user", text: trimmedQuestion });

    let raw;
    try {
      if (conv.providerInfo.type === "gemini") {
        raw = await askGeminiMultiTurn(conv.providerInfo.apiKey, conv.screenshotDataUrl, conv.turns, conv.providerInfo.model);
      } else {
        raw = await askOpenAICompatibleMultiTurn({
          endpoint: conv.providerInfo.endpoint,
          model: conv.providerInfo.model,
          apiKey: conv.providerInfo.apiKey,
          screenshotDataUrl: conv.screenshotDataUrl,
          turns: conv.turns,
          isOllama: conv.providerInfo.provider === "ollama",
        });
      }
    } catch (err) {
      conv.turns.pop(); // roll back the failed turn so the user can retry cleanly
      throw err;
    }

    const { text, confidence } = parseConfidence(raw);
    conv.turns.push({ role: "assistant", text, confidence });
    conv.lastUpdated = Date.now();

    await upsertSessionHistoryFromConv(conv, tab);
    sendResponse({ success: true, answer: text, confidence, conversationId: conv.id });
  } catch (err) {
    sendResponse({ success: false, error: err.message || String(err) });
  } finally {
    if (tab && tab.id) inFlightTabs.delete(tab.id);
  }
}

async function validateBasics(tab) {
  const providerInfo = await getActiveProviderAndKey();
  const aiInstruction = await getActiveInstruction();

  if (providerInfo.provider !== "ollama" && !providerInfo.apiKey) {
    return {
      ok: false,
      response: { success: false, error: `Please set your ${providerInfo.providerLabel} API key in Settings first.` },
    };
  }
  if (providerInfo.provider === "openai" && !providerInfo.apiKey.startsWith("sk-")) {
    return {
      ok: false,
      response: { success: false, error: "This doesn't look like a valid OpenAI API key (should start with 'sk-'). Please check Settings." },
    };
  }
  if (providerInfo.provider === "groq" && !providerInfo.apiKey.startsWith("gsk_")) {
    return {
      ok: false,
      response: { success: false, error: "This doesn't look like a valid Groq API key (should start with 'gsk_'). Please check Settings." },
    };
  }
  if (!aiInstruction || !aiInstruction.trim()) {
    return { ok: false, response: { success: false, error: "Please set or select an instruction in Settings first." } };
  }
  if (!tab || !tab.windowId) {
    return { ok: false, response: { success: false, error: "Could not read tab information. Please reload the page and try again." } };
  }
  if (isRestrictedUrl(tab.url)) {
    return {
      ok: false,
      response: { success: false, error: "This page (a browser-internal, file, or extension page) cannot be captured. Try this on a regular website." },
    };
  }
  return { ok: true, providerInfo, aiInstruction };
}

async function runFreshConversation({ tab, providerInfo, screenshotDataUrl, instruction, displayInstruction, sendResponse }) {
  const blankCheck = await detectBlankOrBlackCapture(screenshotDataUrl);
  const turns = [{ role: "user", text: instruction }];

  let raw;
  if (providerInfo.type === "gemini") {
    raw = await askGeminiMultiTurn(providerInfo.apiKey, screenshotDataUrl, turns, providerInfo.model);
  } else {
    raw = await askOpenAICompatibleMultiTurn({
      endpoint: providerInfo.endpoint,
      model: providerInfo.model,
      apiKey: providerInfo.apiKey,
      screenshotDataUrl,
      turns,
      isOllama: providerInfo.provider === "ollama",
    });
  }

  const { text, confidence } = parseConfidence(raw);

  const finalAnswer = blankCheck.suspicious
    ? `⚠️ Warning: ${blankCheck.percent}% of this screenshot is a single (${blankCheck.reason}) color — this may be DRM-protected video or otherwise "screenshot-proof" content that couldn't be captured. The answer below was generated by the AI but may be inaccurate since it didn't receive the real content:\n\n${text}`
    : text;

  const conv = {
    id: "conv_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
    providerInfo,
    screenshotDataUrl,
    thumbnail: await makeThumbnail(screenshotDataUrl),
    pageTitle: tab.title || "",
    pageUrl: tab.url || "",
    startedAt: Date.now(),
    lastUpdated: Date.now(),
    turns: [
      { role: "user", text: displayInstruction || instruction },
      { role: "assistant", text: finalAnswer, confidence },
    ],
  };

  activeConversations.set(tab.id, conv);
  await upsertSessionHistoryFromConv(conv, tab);

  sendResponse({
    success: true,
    answer: finalAnswer,
    confidence,
    instructionUsed: displayInstruction || instruction,
    conversationId: conv.id,
  });
}

async function upsertSessionHistoryFromConv(conv, tab) {
  const { sessionHistory = [] } = await chrome.storage.local.get(["sessionHistory"]);
  const idx = sessionHistory.findIndex((e) => e.id === conv.id);
  const lastAssistant = [...conv.turns].reverse().find((t) => t.role === "assistant");
  const entry = {
    id: conv.id,
    timestamp: conv.startedAt,
    lastUpdated: conv.lastUpdated || conv.startedAt,
    pageTitle: tab.title || conv.pageTitle || "",
    pageUrl: tab.url || conv.pageUrl || "",
    provider: conv.providerInfo ? conv.providerInfo.providerLabel : "AI",
    turns: conv.turns,
    instruction: conv.turns[0]?.text || "",
    answer: lastAssistant?.text || "",
    thumbnail: conv.thumbnail || null,
  };
  if (idx >= 0) sessionHistory[idx] = entry;
  else sessionHistory.push(entry);
  await chrome.storage.local.set({ sessionHistory });
}

function parseConfidence(rawText) {
  const match = rawText.match(/\n?CONFIDENCE:\s*(High|Medium|Low)\s*$/i);
  if (match) {
    const level = match[1][0].toUpperCase() + match[1].slice(1).toLowerCase();
    return { text: rawText.slice(0, match.index).trim(), confidence: level };
  }
  return { text: rawText.trim(), confidence: null };
}

async function getActiveProviderAndKey() {
  const {
    activeProvider = "openai",
    openaiApiKey = "",
    geminiApiKey = "",
    groqApiKey = "",
    openrouterApiKey = "",
    ollamaEndpoint = "http://localhost:11434",
    ollamaModel = "llama3.2-vision",
    customModel = "",
  } = await chrome.storage.local.get([
    "activeProvider",
    "openaiApiKey",
    "geminiApiKey",
    "groqApiKey",
    "openrouterApiKey",
    "ollamaEndpoint",
    "ollamaModel",
    "customModel",
  ]);

  const cfg = PROVIDER_CONFIGS[activeProvider] || PROVIDER_CONFIGS.openai;
  let apiKey = "";
  let endpoint = cfg.endpoint;
  let model = customModel || cfg.defaultModel;

  if (activeProvider === "openai") apiKey = openaiApiKey.trim();
  else if (activeProvider === "gemini") apiKey = geminiApiKey.trim();
  else if (activeProvider === "groq") apiKey = groqApiKey.trim();
  else if (activeProvider === "openrouter") apiKey = openrouterApiKey.trim();
  else if (activeProvider === "ollama") {
    apiKey = "ollama";
    endpoint = (ollamaEndpoint.trim().replace(/\/$/, "") || "http://localhost:11434") + "/v1/chat/completions";
    model = ollamaModel || "llama3.2-vision";
  }

  return {
    provider: activeProvider,
    providerLabel: cfg.label,
    type: cfg.type,
    apiKey,
    endpoint,
    model,
  };
}

async function getActiveInstruction() {
  const { instructionPresets = [], activePresetId, aiInstruction } = await chrome.storage.local.get([
    "instructionPresets",
    "activePresetId",
    "aiInstruction",
  ]);
  if (instructionPresets.length > 0) {
    const preset = instructionPresets.find((p) => p.id === activePresetId) || instructionPresets[0];
    return preset ? preset.text : null;
  }
  return aiInstruction || null;
}

async function detectBlankOrBlackCapture(dataUrl) {
  if (!dataUrl) return { suspicious: false, percent: 0 };
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const bitmap = await createImageBitmap(blob);
    const sampleW = 60;
    const sampleH = Math.max(1, Math.round((bitmap.height / bitmap.width) * sampleW));
    const canvas = new OffscreenCanvas(sampleW, sampleH);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0, sampleW, sampleH);
    const { data } = ctx.getImageData(0, 0, sampleW, sampleH);

    let blackCount = 0;
    let whiteCount = 0;
    const total = sampleW * sampleH;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      if (luminance < 12) blackCount++;
      else if (luminance > 250) whiteCount++;
    }

    const blackPercent = Math.round((blackCount / total) * 100);
    const whitePercent = Math.round((whiteCount / total) * 100);

    if (blackPercent >= 85) {
      return { suspicious: true, percent: blackPercent, reason: "black" };
    }
    return { suspicious: false, percent: Math.max(blackPercent, whitePercent) };
  } catch (e) {
    return { suspicious: false, percent: 0 };
  }
}

function isRestrictedUrl(url) {
  if (!url) return true;
  return (
    /^(chrome|chrome-extension|edge|about|devtools|view-source|data|file):/i.test(url) ||
    /https?:\/\/((chrome\.google\.com\/webstore)|(chromewebstore\.google\.com))/i.test(url)
  );
}

function captureTab(windowId) {
  return new Promise((resolve, reject) => {
    chrome.tabs.captureVisibleTab(windowId, { format: "png" }, (dataUrl) => {
      if (chrome.runtime.lastError || !dataUrl) {
        const msg = chrome.runtime.lastError?.message || "";
        reject(new Error(msg ? `Could not capture screenshot: ${msg}` : "Could not capture screenshot."));
        return;
      }
      resolve(dataUrl);
    });
  });
}

async function cropAndUpscale(dataUrl, region) {
  const blob = await (await fetch(dataUrl)).blob();
  const bitmap = await createImageBitmap(blob);
  const dpr = region.dpr || 1;

  const sx = Math.max(0, Math.round(region.x * dpr));
  const sy = Math.max(0, Math.round(region.y * dpr));
  const sw = Math.min(Math.round(region.width * dpr), bitmap.width - sx);
  const sh = Math.min(Math.round(region.height * dpr), bitmap.height - sy);

  const upscale = sw < 400 ? 2.5 : 1.4;
  const outW = Math.max(1, Math.round(sw * upscale));
  const outH = Math.max(1, Math.round(sh * upscale));

  const canvas = new OffscreenCanvas(outW, outH);
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, outW, outH);

  const outBlob = await canvas.convertToBlob({ type: "image/png" });
  return await blobToDataURL(outBlob);
}

async function blobToDataURL(blob) {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return `data:${blob.type};base64,${btoa(binary)}`;
}

async function makeThumbnail(dataUrl, maxWidth = 360, quality = 0.55) {
  if (!dataUrl) return null;
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(1, maxWidth / bitmap.width);
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0, w, h);
    const outBlob = await canvas.convertToBlob({ type: "image/jpeg", quality });
    return await blobToDataURL(outBlob);
  } catch (e) {
    return null;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------- OpenAI Compatible (OpenAI, Groq, OpenRouter, Ollama) ----------

function buildOpenAIMessages(screenshotDataUrl, turns) {
  const messages = [{ role: "system", content: SYSTEM_PROMPT }];
  turns.forEach((turn, i) => {
    if (turn.role === "user" && i === 0) {
      if (screenshotDataUrl) {
        messages.push({
          role: "user",
          content: [
            { type: "text", text: turn.text },
            { type: "image_url", image_url: { url: screenshotDataUrl } },
          ],
        });
      } else {
        messages.push({ role: "user", content: turn.text });
      }
    } else {
      messages.push({ role: turn.role === "assistant" ? "assistant" : "user", content: turn.text });
    }
  });
  return messages;
}

async function askOpenAICompatibleMultiTurn(
  { endpoint, model, apiKey, screenshotDataUrl, turns, isOllama = false },
  attempt = 1
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);
  const headers = { "Content-Type": "application/json" };
  if (!isOllama && apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

  let response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      signal: controller.signal,
      headers,
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        temperature: 0,
        messages: buildOpenAIMessages(screenshotDataUrl, turns),
      }),
    });
  } catch (networkErr) {
    clearTimeout(timeoutId);
    if (isOllama) {
      throw new Error(
        `Could not connect to local Ollama at ${endpoint}. Make sure Ollama is running and OLLAMA_ORIGINS="*" is configured.`
      );
    }
    if (networkErr.name === "AbortError") {
      if (attempt < 3) return askOpenAICompatibleMultiTurn({ endpoint, model, apiKey, screenshotDataUrl, turns, isOllama }, attempt + 1);
      throw new Error("The request timed out. Please check your network connection and try again.");
    }
    if (attempt < 3) {
      await sleep(500 * attempt);
      return askOpenAICompatibleMultiTurn({ endpoint, model, apiKey, screenshotDataUrl, turns, isOllama }, attempt + 1);
    }
    throw new Error("Network error: " + networkErr.message);
  }
  clearTimeout(timeoutId);

  if (!response.ok) {
    let errBody = "";
    try {
      errBody = await response.text();
    } catch (_) {}

    if (response.status === 401) {
      throw new Error(`Your API key for ${model} is invalid or expired. Please check Settings.`);
    }
    if (response.status === 429) {
      if (attempt < 3) {
        await sleep(1000 * attempt);
        return askOpenAICompatibleMultiTurn({ endpoint, model, apiKey, screenshotDataUrl, turns, isOllama }, attempt + 1);
      }
      throw new Error("API rate limit or quota exceeded. Please try again shortly or check your billing.");
    }
    if (response.status >= 500 && attempt < 3) {
      await sleep(700 * attempt);
      return askOpenAICompatibleMultiTurn({ endpoint, model, apiKey, screenshotDataUrl, turns, isOllama }, attempt + 1);
    }
    throw new Error(`API error (${response.status}): ${errBody.slice(0, 200)}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text || !text.trim()) throw new Error("Received an empty response from the AI. Please try again.");
  return text;
}

// ---------- Google Gemini (multi-turn) ----------

function buildGeminiContents(screenshotDataUrl, turns) {
  const base64Data = screenshotDataUrl ? screenshotDataUrl.split(",")[1] : null;
  return turns.map((turn, i) => {
    if (turn.role === "user" && i === 0) {
      const parts = [{ text: turn.text }];
      if (base64Data) {
        parts.push({ inline_data: { mime_type: "image/png", data: base64Data } });
      }
      return { role: "user", parts };
    }
    return { role: turn.role === "assistant" ? "model" : "user", parts: [{ text: turn.text }] };
  });
}

async function askGeminiMultiTurn(apiKey, screenshotDataUrl, turns, model = "gemini-3.6-flash", attempt = 1) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: buildGeminiContents(screenshotDataUrl, turns),
        generationConfig: { temperature: 0, maxOutputTokens: 1024 },
      }),
    });
  } catch (networkErr) {
    clearTimeout(timeoutId);
    if (networkErr.name === "AbortError") {
      if (attempt < 3) return askGeminiMultiTurn(apiKey, screenshotDataUrl, turns, model, attempt + 1);
      throw new Error("The request timed out. Check your connection and try again.");
    }
    if (attempt < 3) {
      await sleep(500 * attempt);
      return askGeminiMultiTurn(apiKey, screenshotDataUrl, turns, model, attempt + 1);
    }
    throw new Error("Network error: " + networkErr.message);
  }
  clearTimeout(timeoutId);

  if (!response.ok) {
    let errBody = "";
    try {
      errBody = await response.text();
    } catch (_) {}

    if (response.status === 400 || response.status === 403) {
      throw new Error("Your Gemini API key is invalid or lacks permission for this model. Please check it in Settings.");
    }
    if (response.status === 404) {
      let msg = "";
      try {
        const parsed = JSON.parse(errBody);
        msg = parsed?.error?.message;
      } catch (_) {}
      throw new Error(`Gemini model not found (404): ${msg || "The requested model is not available. Please update to a supported model."}`);
    }
    if (response.status === 429) {
      if (attempt < 3) {
        await sleep(1000 * attempt);
        return askGeminiMultiTurn(apiKey, screenshotDataUrl, turns, model, attempt + 1);
      }
      throw new Error("Gemini rate limit or quota exceeded. Please try again shortly.");
    }
    if (response.status >= 500 && attempt < 3) {
      await sleep(700 * attempt);
      return askGeminiMultiTurn(apiKey, screenshotDataUrl, turns, model, attempt + 1);
    }
    throw new Error(`Gemini API error (${response.status}): ${errBody.slice(0, 200)}`);
  }

  const data = await response.json();
  if (data.promptFeedback?.blockReason) {
    throw new Error(`Gemini blocked this content (${data.promptFeedback.blockReason}).`);
  }
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
  if (!text.trim()) throw new Error("Received an empty response from the AI. Please try again.");
  return text;
}
