const OPENAI_MODEL = "gpt-4o";
const GEMINI_MODEL = "gemini-3.6-flash";

const SYSTEM_PROMPT =
  "You are a page-understanding assistant. The user has configured a fixed instruction that you must follow every time, " +
  "and you are given a screenshot of the current webpage (this may be the full visible page, or a specific region the user selected and zoomed into). " +
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

const DEFAULT_PRESET = {
  id: "default",
  name: "General page helper",
  text: "Explain what this page is about, or tell me the exact location of the option/button I'm looking for.",
};

// tabId -> { id, provider, apiKey, screenshotDataUrl, thumbnail, pageTitle, pageUrl, startedAt, turns: [{role, text, confidence}] }
const activeConversations = new Map();

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.storage.local.get(["instructionPresets", "activeProvider"], (result) => {
      if (!result.instructionPresets || result.instructionPresets.length === 0) {
        chrome.storage.local.set({
          instructionPresets: [DEFAULT_PRESET],
          activePresetId: DEFAULT_PRESET.id,
        });
      }
      if (!result.activeProvider) {
        chrome.storage.local.set({ activeProvider: "openai" });
      }
    });
    chrome.tabs.create({ url: chrome.runtime.getURL("welcome.html") });
  }
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

// Free the in-memory conversation when its tab is closed.
chrome.tabs.onRemoved.addListener((tabId) => activeConversations.delete(tabId));

async function handleSolve(tab, sendResponse) {
  try {
    const check = await validateBasics(tab);
    if (!check.ok) return sendResponse(check.response);
    const { provider, apiKey, aiInstruction } = check;

    const dataUrl = await captureTab(tab.windowId);
    await runFreshConversation({ tab, provider, apiKey, screenshotDataUrl: dataUrl, instruction: aiInstruction, sendResponse });
  } catch (err) {
    sendResponse({ success: false, error: err.message || String(err) });
  }
}

async function handleSolveRegion(tab, region, sendResponse) {
  try {
    const check = await validateBasics(tab);
    if (!check.ok) return sendResponse(check.response);
    const { provider, apiKey, aiInstruction } = check;

    if (!region || !region.width || !region.height) {
      sendResponse({ success: false, error: "Invalid selection area." });
      return;
    }

    const fullShot = await captureTab(tab.windowId);
    const croppedDataUrl = await cropAndUpscale(fullShot, region);
    const focusedInstruction = `${aiInstruction}\n\n(Note: this screenshot is ONLY the specific area the user selected and zoomed into.)`;

    await runFreshConversation({ tab, provider, apiKey, screenshotDataUrl: croppedDataUrl, instruction: focusedInstruction, displayInstruction: aiInstruction, sendResponse });
  } catch (err) {
    sendResponse({ success: false, error: err.message || String(err) });
  }
}

async function handleFollowup(tab, question, sendResponse) {
  try {
    if (!tab || !tab.id) {
      sendResponse({ success: false, error: "Could not identify the tab." });
      return;
    }
    const conv = activeConversations.get(tab.id);
    if (!conv) {
      sendResponse({ success: false, error: "Start with 'Solve with AI' or 'Select Area' first, then ask a follow-up." });
      return;
    }
    if (!question || !question.trim()) {
      sendResponse({ success: false, error: "Please enter a follow-up question." });
      return;
    }

    conv.turns.push({ role: "user", text: question.trim() });

    let raw;
    try {
      raw =
        conv.provider === "gemini"
          ? await askGeminiMultiTurn(conv.apiKey, conv.screenshotDataUrl, conv.turns)
          : await askOpenAIMultiTurn(conv.apiKey, conv.screenshotDataUrl, conv.turns);
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
  }
}

async function validateBasics(tab) {
  const providerInfo = await getActiveProviderAndKey();
  const aiInstruction = await getActiveInstruction();

  if (!providerInfo.apiKey) {
    return { ok: false, response: { success: false, error: `Please set your ${providerInfo.providerLabel} API key in Settings first.` } };
  }
  if (providerInfo.provider === "openai" && !providerInfo.apiKey.startsWith("sk-")) {
    return { ok: false, response: { success: false, error: "This doesn't look like a valid OpenAI API key (should start with 'sk-'). Please check Settings." } };
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
  return { ok: true, provider: providerInfo.provider, apiKey: providerInfo.apiKey, aiInstruction };
}

async function runFreshConversation({ tab, provider, apiKey, screenshotDataUrl, instruction, displayInstruction, sendResponse }) {
  const blankCheck = await detectBlankOrBlackCapture(screenshotDataUrl);
  const turns = [{ role: "user", text: instruction }];

  const raw =
    provider === "gemini"
      ? await askGeminiMultiTurn(apiKey, screenshotDataUrl, turns)
      : await askOpenAIMultiTurn(apiKey, screenshotDataUrl, turns);

  const { text, confidence } = parseConfidence(raw);

  const finalAnswer = blankCheck.suspicious
    ? `⚠️ Warning: ${blankCheck.percent}% of this screenshot is a single (${blankCheck.reason}) color — this may be DRM-protected video or otherwise "screenshot-proof" content that couldn't be captured. The answer below was generated by the AI but may be inaccurate since it didn't receive the real content:\n\n${text}`
    : text;

  const conv = {
    id: "conv_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
    provider,
    apiKey,
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
    provider: conv.provider,
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
  const { activeProvider = "openai", openaiApiKey = "", geminiApiKey = "" } = await chrome.storage.local.get([
    "activeProvider",
    "openaiApiKey",
    "geminiApiKey",
  ]);
  const provider = activeProvider === "gemini" ? "gemini" : "openai";
  const apiKey = (provider === "gemini" ? geminiApiKey : openaiApiKey).trim();
  return { provider, providerLabel: provider === "gemini" ? "Gemini" : "OpenAI", apiKey };
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

    // Only flag near-black (the common signature of DRM output protection).
    // A plain white/blank page can be legitimate, so we don't warn on that.
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
  return /^(chrome|chrome-extension|edge|about|devtools|view-source):/i.test(url);
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

  const upscale = sw < 400 ? 2.5 : 1.4; // upscale small selections more aggressively
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

// ---------- OpenAI (multi-turn) ----------

function buildOpenAIMessages(screenshotDataUrl, turns) {
  const messages = [{ role: "system", content: SYSTEM_PROMPT }];
  turns.forEach((turn, i) => {
    if (turn.role === "user" && i === 0) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: turn.text },
          { type: "image_url", image_url: { url: screenshotDataUrl } },
        ],
      });
    } else {
      messages.push({ role: turn.role === "assistant" ? "assistant" : "user", content: turn.text });
    }
  });
  return messages;
}

async function askOpenAIMultiTurn(apiKey, screenshotDataUrl, turns, attempt = 1) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  let response;
  try {
    response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        max_tokens: 1024,
        temperature: 0,
        messages: buildOpenAIMessages(screenshotDataUrl, turns),
      }),
    });
  } catch (networkErr) {
    clearTimeout(timeoutId);
    if (networkErr.name === "AbortError") {
      if (attempt < 3) return askOpenAIMultiTurn(apiKey, screenshotDataUrl, turns, attempt + 1);
      throw new Error("The request timed out. Check your connection and try again.");
    }
    if (attempt < 3) {
      await sleep(500 * attempt);
      return askOpenAIMultiTurn(apiKey, screenshotDataUrl, turns, attempt + 1);
    }
    throw new Error("Network error: " + networkErr.message);
  }
  clearTimeout(timeoutId);

  if (!response.ok) {
    let errBody = "";
    try { errBody = await response.text(); } catch (_) {}

    if (response.status === 401) throw new Error("Your OpenAI API key is invalid or has expired. Please check it in Settings.");
    if (response.status === 429) {
      if (attempt < 3) { await sleep(1000 * attempt); return askOpenAIMultiTurn(apiKey, screenshotDataUrl, turns, attempt + 1); }
      throw new Error("OpenAI rate limit or quota exceeded. Please try again shortly or check your billing.");
    }
    if (response.status >= 500 && attempt < 3) {
      await sleep(700 * attempt);
      return askOpenAIMultiTurn(apiKey, screenshotDataUrl, turns, attempt + 1);
    }
    throw new Error(`OpenAI API error (${response.status}): ${errBody.slice(0, 200)}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text || !text.trim()) throw new Error("Received an empty response from the AI. Please try again.");
  return text;
}

// ---------- Gemini (multi-turn) ----------

function buildGeminiContents(screenshotDataUrl, turns) {
  const base64Data = screenshotDataUrl.split(",")[1];
  return turns.map((turn, i) => {
    if (turn.role === "user" && i === 0) {
      return { role: "user", parts: [{ text: turn.text }, { inline_data: { mime_type: "image/png", data: base64Data } }] };
    }
    return { role: turn.role === "assistant" ? "model" : "user", parts: [{ text: turn.text }] };
  });
}

async function askGeminiMultiTurn(apiKey, screenshotDataUrl, turns, attempt = 1) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;

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
      if (attempt < 3) return askGeminiMultiTurn(apiKey, screenshotDataUrl, turns, attempt + 1);
      throw new Error("The request timed out. Check your connection and try again.");
    }
    if (attempt < 3) {
      await sleep(500 * attempt);
      return askGeminiMultiTurn(apiKey, screenshotDataUrl, turns, attempt + 1);
    }
    throw new Error("Network error: " + networkErr.message);
  }
  clearTimeout(timeoutId);

  if (!response.ok) {
    let errBody = "";
    try { errBody = await response.text(); } catch (_) {}

    if (response.status === 400 || response.status === 403) throw new Error("Your Gemini API key is invalid or lacks permission for this model. Please check it in Settings.");
    if (response.status === 404) {
      let msg = "";
      try {
        const parsed = JSON.parse(errBody);
        msg = parsed?.error?.message;
      } catch (_) {}
      throw new Error(`Gemini model not found (404): ${msg || "The requested model is not available or has been retired. Please update to a supported model."}`);
    }
    if (response.status === 429) {
      if (attempt < 3) { await sleep(1000 * attempt); return askGeminiMultiTurn(apiKey, screenshotDataUrl, turns, attempt + 1); }
      throw new Error("Gemini rate limit or quota exceeded. Please try again shortly.");
    }
    if (response.status >= 500 && attempt < 3) {
      await sleep(700 * attempt);
      return askGeminiMultiTurn(apiKey, screenshotDataUrl, turns, attempt + 1);
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
