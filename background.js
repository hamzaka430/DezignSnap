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
    defaultModel: "gemini-2.5-flash",
    type: "gemini",
  },
  groq: {
    label: "Groq (Ultra-Fast)",
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    defaultModel: "qwen/qwen3.8-27b",
    textModel: "qwen/qwen3.8-27b",
    type: "openai_compat",
  },
  openrouter: {
    label: "OpenRouter",
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
    defaultModel: "google/gemini-2.5-flash",
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
  "You are DezignSnap, an elite visual intelligence and reasoning assistant. " +
  "You analyze webpages, screenshots, UI, code, and user questions with uncompromising accuracy and first-principles reasoning.\n\n" +
  "CORE RULES:\n" +
  "1) INDEPENDENT PROBLEM SOLVING & ZERO SYCOPHANCY:\n" +
  "   - When analyzing quizzes, tests, exams, multiple-choice questions (MCQs), math, or code problems:\n" +
  "     * NEVER assume that an option, radio button, or checkbox clicked, highlighted, or selected on the screen is correct. Users often take tests or test your capabilities; on-screen selections are frequently incorrect or distractors!\n" +
  "     * NEVER say 'I cannot check', 'I cannot verify', or refuse to solve. You have full reasoning capability to compute, calculate, analyze, and verify answers directly.\n" +
  "     * Solve every problem independently from first principles from scratch.\n" +
  "     * Evaluate all available options (A, B, C, D, etc.), state the single objectively correct choice and letter, provide rigorous proof/explanation, and explain why the other options are wrong.\n" +
  "2) OBJECTIVE VERIFICATION & CHALLENGE HANDLING:\n" +
  "   - If the user asks for the correct answer ('sahi answer do', 'verify again', 'wrong answer', 'check karo', 're-evaluate'), never be defensive and never blindly repeat earlier answers.\n" +
  "   - Discard previous assumptions, re-examine the question and visual evidence fresh from scratch, and output the rigorously verified ground truth.\n" +
  "3) VISUAL ACCURACY & UI LOCALIZATION:\n" +
  "   - When answering visual questions (UI elements, buttons, layout), state exact visual positions (e.g., 'top-right corner', 'below navigation bar') and colors.\n" +
  "   - Only state what is confirmed by the visual evidence or factual knowledge; do not hallucinate details that do not exist.\n" +
  "4) CONTEXT MEMORY AWARENESS WITHOUT BIAS:\n" +
  "   - Previous conversation turns are provided solely for background context and reference. Do not let prior turns or previous mistakes bias or distort your reasoning on the current question.\n" +
  "5) LANGUAGE & TONE:\n" +
  "   - Respond naturally in the same language the user asks in (Urdu, English, Roman Urdu, Hindi, etc.).\n" +
  "   - Be direct, professional, authoritative, and helpful.\n" +
  "6) CONFIDENCE RATING:\n" +
  "   - On the very final line of your response, output ONLY: CONFIDENCE: High or CONFIDENCE: Medium or CONFIDENCE: Low.\n" +
  "   - High = fully verified, certain. Medium = slight ambiguity. Low = blurry/insufficient information.";

function getSystemPrompt(aiMode = "direct") {
  let prompt = SYSTEM_PROMPT;
  if (aiMode === "thinking") {
    prompt +=
      "\n\nMODE: DEEP THINKING & FIRST-PRINCIPLES VERIFICATION (like Gemini/DeepSeek).\n" +
      "Step 1: Inside <thinking>...</thinking> tags, write your deep step-by-step reasoning: analyze the question, independently derive/calculate the solution, test all multiple-choice options, inspect any code/visual details, and verify correctness.\n" +
      "Step 2: Immediately following </thinking>, provide your clean, definitive, user-friendly final answer with clear structure.\n" +
      "Step 3: Conclude on the final line with CONFIDENCE: High or Medium or Low.";
  } else {
    prompt +=
      "\n\nMODE: LIGHTNING-FAST DIRECT & VERIFIED ANSWER.\n" +
      "Provide an immediate, definitive, verified answer directly from first principles. State the correct answer/option first, followed by clear concise reasoning. No fluff preamble.\n" +
      "Conclude on the final line with CONFIDENCE: High or Medium or Low.";
  }
  return prompt;
}

async function getActiveAiMode() {
  const { aiMode = "direct" } = await chrome.storage.local.get(["aiMode"]);
  return aiMode;
}

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

// In-memory cache backed by chrome.storage.session to survive MV3 Service Worker restarts
const activeConversations = new Map();
const inFlightTabs = new Set();
const CONV_SESSION_KEY = "activeConversations_v1";

async function getConversation(tabId) {
  if (!tabId) return null;
  if (activeConversations.has(tabId)) {
    return activeConversations.get(tabId);
  }
  try {
    const result = await chrome.storage.session.get([CONV_SESSION_KEY]);
    const all = result[CONV_SESSION_KEY] || {};
    const conv = all[String(tabId)] || null;
    if (conv) {
      activeConversations.set(tabId, conv);
    }
    return conv;
  } catch (_) {
    return null;
  }
}

async function setConversation(tabId, conv) {
  if (!tabId || !conv) return;
  activeConversations.set(tabId, conv);
  try {
    const result = await chrome.storage.session.get([CONV_SESSION_KEY]);
    const all = result[CONV_SESSION_KEY] || {};
    // Keep session storage payload compact: cap image size & prune older images
    const persistedTurns = (conv.turns || []).map((t, idx, arr) => {
      const isRecentImage = idx >= arr.length - 2;
      return {
        role: t.role,
        text: t.text,
        confidence: t.confidence,
        screenshotDataUrl: isRecentImage && t.screenshotDataUrl && t.screenshotDataUrl.length < 1500000 ? t.screenshotDataUrl : null,
      };
    });
    all[String(tabId)] = {
      ...conv,
      screenshotDataUrl: conv.screenshotDataUrl && conv.screenshotDataUrl.length < 1500000 ? conv.screenshotDataUrl : null,
      turns: persistedTurns,
    };
    await chrome.storage.session.set({ [CONV_SESSION_KEY]: all });
  } catch (err) {
    console.warn("[DezignSnap] Failed to sync conversation to session storage:", err);
  }
}

async function deleteConversation(tabId) {
  if (!tabId) return;
  activeConversations.delete(tabId);
  try {
    const result = await chrome.storage.session.get([CONV_SESSION_KEY]);
    const all = result[CONV_SESSION_KEY] || {};
    if (all[String(tabId)]) {
      delete all[String(tabId)];
      await chrome.storage.session.set({ [CONV_SESSION_KEY]: all });
    }
  } catch (_) {}
}

chrome.runtime.onInstalled.addListener((details) => {
  // Context menu for quick right-click text queries
  chrome.contextMenus.create({
    id: "ph_ask_text",
    title: "Ask AI about '%s'",
    contexts: ["selection"],
  });

  // Ensure stored presets match refined names, no legacy emojis, and include task_copilot
  chrome.storage.local.get(["instructionPresets"], (result) => {
    if (result.instructionPresets && Array.isArray(result.instructionPresets)) {
      let changed = false;
      const presets = result.instructionPresets;
      const def = presets.find((p) => p.id === "default");
      if (def && (def.name === "General page & problem solver" || def.text.includes("If this contains a question, quiz, or problem, solve it accurately from first principles"))) {
        def.name = "General Page Helper & Assistant";
        def.text = DEFAULT_PRESETS[0].text;
        changed = true;
      }
      if (!presets.some((p) => p.id === "task_copilot")) {
        const copilot = DEFAULT_PRESETS.find((p) => p.id === "task_copilot");
        if (copilot) {
          presets.splice(1, 0, copilot);
          changed = true;
        }
      }
      const quiz = presets.find((p) => p.id === "quiz_solver");
      if (quiz && (!quiz.name.includes("First-Principles") || quiz.name.includes("🎯"))) {
        quiz.name = "Verified Quiz & MCQ Solver (First-Principles)";
        quiz.text = DEFAULT_PRESETS.find((p) => p.id === "quiz_solver").text;
        changed = true;
      }
      if (!presets.some((p) => p.id === "data_extractor")) {
        const de = DEFAULT_PRESETS.find((p) => p.id === "data_extractor");
        if (de) presets.push(de);
        changed = true;
      }
      if (!presets.some((p) => p.id === "summarizer")) {
        const sm = DEFAULT_PRESETS.find((p) => p.id === "summarizer");
        if (sm) presets.push(sm);
        changed = true;
      }
      if (!presets.some((p) => p.id === "ui_critique")) {
        const ui = DEFAULT_PRESETS.find((p) => p.id === "ui_critique");
        if (ui) presets.push(ui);
        changed = true;
      }
      if (changed) {
        chrome.storage.local.set({ instructionPresets: presets });
      }
    }
  });

  if (details.reason === "install") {
    chrome.storage.local.get(
      ["instructionPresets", "activeProvider", "hudPosition", "hudCollapsed", "aiMode", "sessionHistory"],
      (result) => {
        const defaults = {};
        if (!result.instructionPresets || result.instructionPresets.length === 0) {
          defaults.instructionPresets = DEFAULT_PRESETS;
          defaults.activePresetId = DEFAULT_PRESETS[0].id;
        }
        if (!result.activeProvider) {
          defaults.activeProvider = "openai";
        }
        if (!result.hudPosition) {
          defaults.hudPosition = "right";
        }
        if (result.hudCollapsed === undefined) {
          defaults.hudCollapsed = false;
        }
        if (!result.aiMode) {
          defaults.aiMode = "direct";
        }
        if (!result.sessionHistory) {
          defaults.sessionHistory = [];
        }
        if (Object.keys(defaults).length > 0) {
          chrome.storage.local.set(defaults);
        }
      }
    );
    chrome.tabs.create({ url: chrome.runtime.getURL("welcome.html") });
  }
});

// Handle right click context menu selection
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "ph_ask_text" && info.selectionText) {
    handleTextQuery(tab, info.selectionText);
  }
});

// Handle keyboard shortcuts (Alt+S for snip, Alt+A for full page, Alt+H for stealth)
chrome.commands.onCommand.addListener((command) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs && tabs[0];
    if (!tab || !tab.id) return;
    if (command === "snip_screen") {
      chrome.tabs.sendMessage(tab.id, { type: "TRIGGER_SNIP" }, () => void chrome.runtime.lastError);
    } else if (command === "solve_full_page") {
      chrome.tabs.sendMessage(tab.id, { type: "TRIGGER_FULL_SOLVE" }, () => void chrome.runtime.lastError);
    } else if (command === "toggle_stealth") {
      chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_STEALTH" }, () => void chrome.runtime.lastError);
    }
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === "SOLVE_WITH_AI") {
    handleSolve(sender.tab, message.aiMode, sendResponse);
    return true;
  }
  if (message && message.type === "SOLVE_WITH_AI_ACTIVE_TAB") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      handleSolve(tabs && tabs[0], message?.aiMode, sendResponse);
    });
    return true;
  }
  if (message && message.type === "SOLVE_WITH_AI_REGION") {
    handleSolveRegion(sender.tab, message.region, message.aiMode, sendResponse);
    return true;
  }
  if (message && message.type === "FOLLOWUP_WITH_AI") {
    handleFollowup(sender.tab, message.question, message.aiMode, sendResponse);
    return true;
  }
  if (message && message.type === "DIRECT_CHAT_WITH_AI") {
    handleDirectChat(sender.tab, message.question, message.aiMode, sendResponse);
    return true;
  }
  if (message && message.type === "TRIGGER_DIRECT_CHAT") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: "OPEN_DIRECT_CHAT" });
      }
    });
    return true;
  }
  if (message && message.type === "CLEAR_ACTIVE_CHAT") {
    const tabId = sender.tab?.id || message.tabId;
    if (tabId) {
      deleteConversation(tabId);
      inFlightTabs.delete(tabId);
    }
    if (sendResponse) sendResponse({ success: true });
    return true;
  }
  if (message && message.type === "OPEN_SESSION_EXPORT") {
    chrome.tabs.create({ url: chrome.runtime.getURL("session.html") });
    return true;
  }
  if (message && message.type === "GET_UI_PREFERENCES") {
    chrome.storage.local.get(["hudPosition", "hudCollapsed", "aiMode", "stealthMode"], (res) => {
      sendResponse({
        hudPosition: res.hudPosition || "right",
        hudCollapsed: !!res.hudCollapsed,
        aiMode: res.aiMode || "direct",
        stealthMode: !!res.stealthMode,
      });
    });
    return true;
  }
  if (message && message.type === "SET_UI_PREFERENCES") {
    const allowed = ["hudPosition", "hudCollapsed", "aiMode", "stealthMode"];
    const toUpdate = {};
    if (message.preferences && typeof message.preferences === "object") {
      for (const key of allowed) {
        if (key in message.preferences) {
          toUpdate[key] = message.preferences[key];
        }
      }
    }
    if (Object.keys(toUpdate).length > 0) {
      chrome.storage.local.set(toUpdate, () => {
        if (sendResponse) sendResponse({ success: true });
      });
    } else {
      if (sendResponse) sendResponse({ success: false });
    }
    return true;
  }
});

// Broadcast UI preference changes to all open tabs so content scripts stay in sync without reading storage directly
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  const changedPrefs = {};
  if (changes.hudPosition) changedPrefs.hudPosition = changes.hudPosition.newValue;
  if (changes.hudCollapsed !== undefined) changedPrefs.hudCollapsed = changes.hudCollapsed.newValue;
  if (changes.aiMode) changedPrefs.aiMode = changes.aiMode.newValue;
  if (changes.stealthMode !== undefined) changedPrefs.stealthMode = changes.stealthMode.newValue;

  if (Object.keys(changedPrefs).length > 0) {
    chrome.tabs.query({}, (tabs) => {
      if (!tabs) return;
      for (const tab of tabs) {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            type: "PREFERENCES_CHANGED",
            preferences: changedPrefs,
          }).catch(() => {});
        }
      }
    });
  }
});

// Long-lived Port connection for real-time token streaming to content script
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "ph_streaming") return;

  port.onMessage.addListener(async (msg) => {
    if (!msg || msg.type !== "START_STREAM") return;
    const tab = port.sender?.tab;
    const { action, question, region } = msg.payload || {};

    if (tab && tab.id && inFlightTabs.has(tab.id)) {
      port.postMessage({ type: "STREAM_ERROR", error: "An AI request is already in progress for this tab." });
      return;
    }
    if (tab && tab.id) inFlightTabs.add(tab.id);

    try {
      let providerInfo, aiInstruction;
      if (action === "direct") {
        providerInfo = await getActiveProviderAndKey();
        if (providerInfo.provider !== "ollama" && !providerInfo.apiKey) {
          port.postMessage({
            type: "STREAM_ERROR",
            error: `Please set your ${providerInfo.providerLabel} API key in Settings first.`,
          });
          return;
        }
        aiInstruction = (question || "").trim();
        if (!aiInstruction) {
          port.postMessage({ type: "STREAM_ERROR", error: "Please enter a question or message." });
          return;
        }
      } else {
        const check = await validateBasics(tab);
        if (!check.ok) {
          port.postMessage({ type: "STREAM_ERROR", error: check.response.error });
          return;
        }
        providerInfo = check.providerInfo;
        aiInstruction = check.aiInstruction;
      }

      let screenshotDataUrl = null;
      let instruction = aiInstruction;
      let displayInstruction = aiInstruction;

      if (action === "solve") {
        screenshotDataUrl = await captureTab(tab.windowId);
        displayInstruction = "[Full Page Screenshot] " + aiInstruction;
      } else if (action === "snip" && region) {
        const fullShot = await captureTab(tab.windowId);
        screenshotDataUrl = await cropAndUpscale(fullShot, region);
        instruction = `${aiInstruction}\n\n(Note: this screenshot is ONLY the specific area the user selected and zoomed into.)`;
        displayInstruction = "[Selected Area Snip] " + aiInstruction;
      } else if (action === "direct") {
        screenshotDataUrl = null;
        instruction = (question || "").trim();
        displayInstruction = instruction;
      }

      await executeConversationTurn({
        tab,
        providerInfo,
        screenshotDataUrl,
        instruction,
        displayInstruction,
        aiMode: msg.aiMode,
        onChunk: (chunk, isThinking) => {
          try {
            port.postMessage({ type: "STREAM_CHUNK", chunk, isThinking: !!isThinking });
          } catch (_) {}
        },
        sendResponse: (finalRes) => {
          try {
            if (finalRes && finalRes.success) {
              port.postMessage({
                type: "STREAM_DONE",
                answer: finalRes.answer,
                confidence: finalRes.confidence,
                instructionUsed: finalRes.instructionUsed,
                conversationId: finalRes.conversationId,
              });
            } else {
              port.postMessage({ type: "STREAM_ERROR", error: finalRes?.error || "Analysis failed." });
            }
          } catch (_) {}
        },
      });
    } catch (err) {
      try {
        port.postMessage({ type: "STREAM_ERROR", error: err.message || String(err) });
      } catch (_) {}
    } finally {
      if (tab && tab.id) inFlightTabs.delete(tab.id);
    }
  });
});

// Free the conversation when its tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  deleteConversation(tabId);
  inFlightTabs.delete(tabId);
});

async function withInFlightLock(tab, sendResponse, fn) {
  if (tab && tab.id && inFlightTabs.has(tab.id)) {
    if (sendResponse) sendResponse({ success: false, error: "An AI request is already in progress for this tab. Please wait a moment." });
    return;
  }
  if (tab && tab.id) inFlightTabs.add(tab.id);
  try {
    await fn();
  } catch (err) {
    if (sendResponse) sendResponse({ success: false, error: err.message || String(err) });
  } finally {
    if (tab && tab.id) inFlightTabs.delete(tab.id);
  }
}

async function handleSolve(tab, aiMode, sendResponse) {
  return withInFlightLock(tab, sendResponse, async () => {
    const check = await validateBasics(tab);
    if (!check.ok) return sendResponse(check.response);
    const dataUrl = await captureTab(tab.windowId);
    await executeConversationTurn({
      tab,
      providerInfo: check.providerInfo,
      screenshotDataUrl: dataUrl,
      instruction: check.aiInstruction,
      displayInstruction: "[Full Page Screenshot] " + check.aiInstruction,
      aiMode,
      sendResponse,
    });
  });
}

async function handleSolveRegion(tab, region, aiMode, sendResponse) {
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

  return withInFlightLock(tab, sendResponse, async () => {
    const check = await validateBasics(tab);
    if (!check.ok) return sendResponse(check.response);
    const fullShot = await captureTab(tab.windowId);
    const croppedDataUrl = await cropAndUpscale(fullShot, region);
    const focusedInstruction = `${check.aiInstruction}\n\n(Note: this screenshot is ONLY the specific area the user selected and zoomed into.)`;

    await executeConversationTurn({
      tab,
      providerInfo: check.providerInfo,
      screenshotDataUrl: croppedDataUrl,
      instruction: focusedInstruction,
      displayInstruction: "[Selected Area Snip] " + check.aiInstruction,
      aiMode,
      sendResponse,
    });
  });
}

async function handleDirectChat(tab, question, aiMode, sendResponse) {
  const trimmed = (question || "").trim();
  if (!trimmed) {
    sendResponse({ success: false, error: "Please enter a question or message." });
    return;
  }

  const providerInfo = await getActiveProviderAndKey();
  if (providerInfo.provider !== "ollama" && !providerInfo.apiKey) {
    sendResponse({ success: false, error: `Please set your ${providerInfo.providerLabel} API key in Settings first.` });
    return;
  }

  return withInFlightLock(tab, sendResponse, async () => {
    await executeConversationTurn({
      tab,
      providerInfo,
      screenshotDataUrl: null,
      instruction: trimmed,
      displayInstruction: trimmed,
      aiMode,
      sendResponse,
    });
  });
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

    const MAX_SELECTED_TEXT = 1000;
    const rawText = String(selectedText || "");
    const sanitizedText = rawText.slice(0, MAX_SELECTED_TEXT);
    const prompt = [
      "The user selected the following text from a webpage. Analyze it as requested.",
      "---BEGIN SELECTED TEXT---",
      sanitizedText,
      "---END SELECTED TEXT---",
      "",
      "Please explain what this means, define any unfamiliar terms, or answer any question it raises concisely.",
    ].join("\n");
    const mode = await getActiveAiMode();

    await executeConversationTurn({
      tab,
      providerInfo,
      screenshotDataUrl: null,
      instruction: prompt,
      displayInstruction: `Selected: "${sanitizedText.length < rawText.length ? sanitizedText + "..." : sanitizedText}"`,
      aiMode: mode,
      sendResponse: (res) => {
        chrome.tabs.sendMessage(tab.id, { type: "SHOW_RESULT", result: res });
      },
    });
  } catch (err) {
    chrome.tabs.sendMessage(tab.id, {
      type: "SHOW_RESULT",
      result: { success: false, error: err.message || String(err) },
    });
  }
}

async function handleFollowup(tab, question, aiMode, sendResponse) {
  if (!tab || !tab.id) {
    sendResponse({ success: false, error: "Could not identify the tab." });
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

  const providerInfo = await getActiveProviderAndKey();
  if (providerInfo.provider !== "ollama" && !providerInfo.apiKey) {
    sendResponse({ success: false, error: `Please set your ${providerInfo.providerLabel} API key in Settings first.` });
    return;
  }

  return withInFlightLock(tab, sendResponse, async () => {
    await executeConversationTurn({
      tab,
      providerInfo,
      screenshotDataUrl: null,
      instruction: trimmedQuestion,
      displayInstruction: trimmedQuestion,
      aiMode,
      sendResponse,
    });
  });
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

const REQUEST_WINDOW_MS = 60000;
const MAX_REQUESTS_PER_WINDOW = 20;
const requestTimestamps = [];

function checkRateLimit() {
  const now = Date.now();
  while (requestTimestamps.length && requestTimestamps[0] < now - REQUEST_WINDOW_MS) {
    requestTimestamps.shift();
  }
  if (requestTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    const oldestMs = requestTimestamps[0];
    const waitSec = Math.ceil((oldestMs + REQUEST_WINDOW_MS - now) / 1000);
    throw new Error(
      `Rate limit reached (${MAX_REQUESTS_PER_WINDOW} requests/min). Please wait ${waitSec}s before sending another request.`
    );
  }
  requestTimestamps.push(now);
}

const MAX_CONVERSATION_TURNS = 50;

async function executeConversationTurn({
  tab,
  providerInfo,
  screenshotDataUrl = null,
  instruction,
  displayInstruction,
  aiMode,
  sendResponse,
  onChunk = null,
}) {
  checkRateLimit();
  const blankCheck = screenshotDataUrl ? await detectBlankOrBlackCapture(screenshotDataUrl) : { suspicious: false };
  const mode = aiMode || (await getActiveAiMode());

  let conv = tab && tab.id ? await getConversation(tab.id) : null;
  if (!conv) {
    conv = {
      id: "conv_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
      providerInfo,
      screenshotDataUrl,
      thumbnail: screenshotDataUrl ? await makeThumbnail(screenshotDataUrl) : null,
      pageTitle: tab?.title || "DezignSnap Session",
      pageUrl: tab?.url || "",
      startedAt: Date.now(),
      lastUpdated: Date.now(),
      turns: [],
    };
  } else {
    conv.providerInfo = providerInfo;
    if (screenshotDataUrl) {
      conv.screenshotDataUrl = screenshotDataUrl;
      conv.thumbnail = await makeThumbnail(screenshotDataUrl);
    }
  }

  const userTurn = {
    role: "user",
    text: displayInstruction || instruction,
    screenshotDataUrl: screenshotDataUrl || null,
  };
  conv.turns.push(userTurn);

  if (conv.turns.length > MAX_CONVERSATION_TURNS) {
    conv.turns = conv.turns.slice(-MAX_CONVERSATION_TURNS);
  }

  let raw;
  try {
    let modelToUse = providerInfo.model;
    if (providerInfo.provider === "groq" && !screenshotDataUrl) {
      if (providerInfo.textModel && providerInfo.textModel !== "llama-3.3-70b-versatile") {
        modelToUse = providerInfo.textModel;
      } else {
        modelToUse = providerInfo.model || "qwen/qwen3.8-27b";
      }
    }

    if (providerInfo.type === "gemini") {
      raw = await askGeminiMultiTurn(providerInfo.apiKey, conv.screenshotDataUrl, conv.turns, modelToUse, 1, mode, onChunk);
    } else {
      raw = await askOpenAICompatibleMultiTurn({
        endpoint: providerInfo.endpoint,
        model: modelToUse,
        apiKey: providerInfo.apiKey,
        screenshotDataUrl: conv.screenshotDataUrl,
        turns: conv.turns,
        isOllama: providerInfo.provider === "ollama",
        aiMode: mode,
        onChunk,
      });
    }
  } catch (err) {
    conv.turns.pop(); // roll back failed turn
    throw err;
  }

  const { text, confidence } = parseConfidence(raw);

  const finalAnswer = blankCheck.suspicious
    ? `⚠️ Warning: ${blankCheck.percent}% of this screenshot is a single (${blankCheck.reason}) color — this may be DRM-protected video or otherwise "screenshot-proof" content that couldn't be captured. The answer below was generated by the AI but may be inaccurate since it didn't receive the real content:\n\n${text}`
    : text;

  conv.turns.push({
    role: "assistant",
    text: finalAnswer,
    confidence: confidence || "High",
  });

  if (conv.turns.length > MAX_CONVERSATION_TURNS) {
    conv.turns = conv.turns.slice(-MAX_CONVERSATION_TURNS);
  }
  conv.lastUpdated = Date.now();

  if (tab && tab.id) await setConversation(tab.id, conv);
  await upsertSessionHistoryFromConv(conv, tab || {});

  sendResponse({
    success: true,
    answer: finalAnswer,
    confidence: confidence || "High",
    instructionUsed: displayInstruction || instruction,
    conversationId: conv.id,
  });
}

const MAX_SESSION_HISTORY = 50;

async function upsertSessionHistoryFromConv(conv, tab) {
  const { sessionHistory = [] } = await chrome.storage.local.get(["sessionHistory"]);
  const idx = sessionHistory.findIndex((e) => e.id === conv.id);
  const lastAssistant = [...conv.turns].reverse().find((t) => t.role === "assistant");

  // Preserve high-definition screenshots for session report preview & PDF export.
  const highResShot = conv.screenshotDataUrl || conv.thumbnail || null;
  const entry = {
    id: conv.id,
    timestamp: conv.startedAt,
    lastUpdated: conv.lastUpdated || conv.startedAt,
    pageTitle: tab?.title || conv.pageTitle || "",
    pageUrl: tab?.url || conv.pageUrl || "",
    provider: conv.providerInfo ? conv.providerInfo.providerLabel : "AI",
    turns: (conv.turns || []).map((t) => ({
      role: t.role,
      text: t.text,
      confidence: t.confidence || undefined,
    })),
    instruction: conv.turns[0]?.text || "",
    answer: lastAssistant?.text || "",
    screenshot: highResShot,
    thumbnail: conv.thumbnail || highResShot,
  };

  if (idx >= 0) {
    sessionHistory[idx] = entry;
  } else {
    sessionHistory.push(entry);
    if (sessionHistory.length > MAX_SESSION_HISTORY) {
      sessionHistory.splice(0, sessionHistory.length - MAX_SESSION_HISTORY);
    }
  }
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
    geminiModel = "",
    groqApiKey = "",
    openrouterApiKey = "",
    ollamaEndpoint = "http://localhost:11434",
    ollamaModel = "llama3.2-vision",
    customModel = "",
  } = await chrome.storage.local.get([
    "activeProvider",
    "openaiApiKey",
    "geminiApiKey",
    "geminiModel",
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
  else if (activeProvider === "gemini") {
    apiKey = geminiApiKey.trim();
    if (geminiModel && geminiModel.trim()) {
      model = geminiModel.trim();
    }
    // Sanitize old deprecated Gemini models from saved storage
    if (model === "gemini-1.5-flash" || model === "gemini-2.0-flash") {
      model = "gemini-2.5-flash";
    }
  }
  else if (activeProvider === "groq") {
    apiKey = groqApiKey.trim();
    if (model === "llama-3.3-70b-versatile" || model === "llama-3.2-11b-vision-preview" || model === "llama-3.2-90b-vision-preview") {
      model = "qwen/qwen3.8-27b";
    }
  }
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
    textModel: cfg.textModel || model,
  };
}

async function getActiveInstruction() {
  let { instructionPresets = [], activePresetId, aiInstruction } = await chrome.storage.local.get([
    "instructionPresets",
    "activePresetId",
    "aiInstruction",
  ]);

  let updated = false;
  if (!instructionPresets || instructionPresets.length === 0) {
    instructionPresets = DEFAULT_PRESETS;
    activePresetId = DEFAULT_PRESETS[0].id;
    updated = true;
  } else {
    // If old default text is present, upgrade to aligned General Page Helper
    const defPreset = instructionPresets.find((p) => p.id === "default");
    if (defPreset && (defPreset.name === "General page & problem solver" || defPreset.text.includes("If this contains a question, quiz, or problem, solve it accurately from first principles"))) {
      defPreset.name = "General Page Helper & Assistant";
      defPreset.text = DEFAULT_PRESETS[0].text;
      updated = true;
    }
    // Add task_copilot if missing from presets
    if (!instructionPresets.some((p) => p.id === "task_copilot")) {
      const copilot = DEFAULT_PRESETS.find((p) => p.id === "task_copilot");
      if (copilot) {
        instructionPresets.splice(1, 0, copilot);
        updated = true;
      }
    }
    // Update quiz_solver if outdated
    const quiz = instructionPresets.find((p) => p.id === "quiz_solver");
    if (quiz && (!quiz.name.includes("First-Principles") || quiz.name.includes("🎯"))) {
      quiz.name = "Verified Quiz & MCQ Solver (First-Principles)";
      quiz.text = DEFAULT_PRESETS.find((p) => p.id === "quiz_solver").text;
      updated = true;
    }
  }

  if (updated) {
    await chrome.storage.local.set({ instructionPresets, activePresetId: activePresetId || instructionPresets[0].id });
  }

  const preset = instructionPresets.find((p) => p.id === activePresetId) || instructionPresets[0];
  return preset ? preset.text : (aiInstruction || null);
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
    // Use JPEG at 85% quality: visually lossless, ~8-10x smaller payload than raw PNG
    chrome.tabs.captureVisibleTab(windowId, { format: "jpeg", quality: 85 }, (dataUrl) => {
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
  const rawOutW = Math.round(sw * upscale);
  const rawOutH = Math.round(sh * upscale);

  // Cap output resolution — max dimension 1920px for optimal speed & AI token efficiency
  const MAX_DIM = 1920;
  const scale = Math.min(1, MAX_DIM / Math.max(rawOutW, rawOutH));
  const outW = Math.max(1, Math.round(rawOutW * scale));
  const outH = Math.max(1, Math.round(rawOutH * scale));

  const canvas = new OffscreenCanvas(outW, outH);
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, outW, outH);

  const outBlob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.88 });
  return await blobToDataURL(outBlob);
}

async function blobToDataURL(blob) {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const CHUNK = 8192;
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return `data:${blob.type};base64,${btoa(binary)}`;
}

async function makeThumbnail(dataUrl, maxWidth = 1600, quality = 0.92) {
  if (!dataUrl) return null;
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const bitmap = await createImageBitmap(blob);
    // If the image is already within maxWidth, preserve native resolution
    const scale = bitmap.width > maxWidth ? maxWidth / bitmap.width : 1;
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, w, h);
    const outBlob = await canvas.convertToBlob({ type: "image/jpeg", quality });
    return await blobToDataURL(outBlob);
  } catch (e) {
    return dataUrl;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------- OpenAI Compatible (OpenAI, Groq, OpenRouter, Ollama) ----------

const MAX_INFERENCE_TURNS = 8;

function getActiveScreenshotTurnIndex(turns, fallbackScreenshotUrl) {
  // Locate the latest user turn in the inference window that carries a screenshot
  for (let i = turns.length - 1; i >= 0; i--) {
    if (turns[i].role === "user" && turns[i].screenshotDataUrl) {
      return i;
    }
  }
  return fallbackScreenshotUrl && turns.length > 0 && turns[0].role === "user" ? 0 : -1;
}

function isVerificationOrChallenge(text) {
  return /(sahi|correct|right|wrong|galat|ghalat|check|verify|recheck|sure\?|dobara|wapas|pakka|answer do|explain again)/i.test(text || "");
}

function buildOpenAIMessages(fallbackScreenshotUrl, turns, aiMode = "direct") {
  const messages = [{ role: "system", content: getSystemPrompt(aiMode) }];

  // Cap inference history to most recent turns to maintain sharp reasoning and prevent compounding old errors
  const inferenceTurns = turns.slice(-MAX_INFERENCE_TURNS);
  const activeImageIdx = getActiveScreenshotTurnIndex(inferenceTurns, fallbackScreenshotUrl);

  inferenceTurns.forEach((turn, i) => {
    let contentText = turn.text || "";

    if (i === inferenceTurns.length - 1 && turn.role === "user" && isVerificationOrChallenge(contentText)) {
      contentText +=
        "\n\n[DIRECTIVE: Perform an independent, rigorous first-principles verification. Do NOT repeat or defend any past assistant mistakes. Solve directly, test every option, and provide the proven correct answer.]";
    }

    if (turn.role === "user") {
      const isTargetImageTurn = i === activeImageIdx;
      const img = turn.screenshotDataUrl || (i === 0 ? fallbackScreenshotUrl : null);

      if (isTargetImageTurn && img) {
        messages.push({
          role: "user",
          content: [
            { type: "text", text: contentText },
            { type: "image_url", image_url: { url: img, detail: "high" } },
          ],
        });
      } else {
        messages.push({ role: "user", content: contentText });
      }
    } else {
      messages.push({ role: "assistant", content: contentText });
    }
  });

  return messages;
}

let cachedDiscoveredGroqVisionModel = null;
let cachedDiscoveredGroqTextModel = null;

async function discoverActiveGroqModel(apiKey, requiresVision = false) {
  if (requiresVision && cachedDiscoveredGroqVisionModel) return cachedDiscoveredGroqVisionModel;
  if (!requiresVision && cachedDiscoveredGroqTextModel) return cachedDiscoveredGroqTextModel;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const ids = (data.data || []).map((m) => m.id);

    if (requiresVision) {
      if (ids.includes("qwen/qwen3.8-27b")) {
        cachedDiscoveredGroqVisionModel = "qwen/qwen3.8-27b";
        return "qwen/qwen3.8-27b";
      }
      const match = ids.find((id) => id.includes("qwen") || id.includes("vision"));
      if (match) {
        cachedDiscoveredGroqVisionModel = match;
        return match;
      }
    } else {
      if (ids.includes("qwen/qwen3.8-27b")) {
        cachedDiscoveredGroqTextModel = "qwen/qwen3.8-27b";
        return "qwen/qwen3.8-27b";
      }
      if (ids.includes("llama-3.1-8b-instant")) {
        cachedDiscoveredGroqTextModel = "llama-3.1-8b-instant";
        return "llama-3.1-8b-instant";
      }
      if (ids.includes("openai/gpt-oss-120b")) {
        cachedDiscoveredGroqTextModel = "openai/gpt-oss-120b";
        return "openai/gpt-oss-120b";
      }
      if (ids.includes("openai/gpt-oss-20b")) {
        cachedDiscoveredGroqTextModel = "openai/gpt-oss-20b";
        return "openai/gpt-oss-20b";
      }
      const anyChat = ids.find((id) => !id.includes("whisper") && !id.includes("guard"));
      if (anyChat) {
        cachedDiscoveredGroqTextModel = anyChat;
        return anyChat;
      }
    }
  } catch (_) {}
  return requiresVision ? "qwen/qwen3.8-27b" : "llama-3.1-8b-instant";
}

async function askOpenAICompatibleMultiTurn(
  { endpoint, model, apiKey, screenshotDataUrl, turns, isOllama = false, aiMode = "direct", onChunk = null },
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
        max_tokens: 1536,
        temperature: 0,
        messages: buildOpenAIMessages(screenshotDataUrl, turns, aiMode),
        stream: !!onChunk,
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
      if (attempt < 3) return askOpenAICompatibleMultiTurn({ endpoint, model, apiKey, screenshotDataUrl, turns, isOllama, aiMode, onChunk }, attempt + 1);
      throw new Error("The request timed out. Please check your network connection and try again.");
    }
    if (attempt < 3) {
      await sleep(500 * attempt);
      return askOpenAICompatibleMultiTurn({ endpoint, model, apiKey, screenshotDataUrl, turns, isOllama, aiMode, onChunk }, attempt + 1);
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
    if (response.status === 404) {
      if (endpoint && endpoint.includes("groq.com")) {
        // Step 1: If custom or deprecated model was used on Groq, fallback to qwen/qwen3.8-27b
        if (attempt === 1 && model !== "qwen/qwen3.8-27b") {
          console.warn(`[DezignSnap] Groq model "${model}" not found (404). Falling back to "qwen/qwen3.8-27b"...`);
          return askOpenAICompatibleMultiTurn(
            { endpoint, model: "qwen/qwen3.8-27b", apiKey, screenshotDataUrl, turns, isOllama, aiMode, onChunk },
            attempt + 1
          );
        }
        // Step 2: Auto-discover active models on user's Groq account
        if (attempt <= 2) {
          const discovered = await discoverActiveGroqModel(apiKey, !!screenshotDataUrl);
          if (discovered && discovered !== model) {
            console.warn(`[DezignSnap] Auto-discovered active Groq model "${discovered}". Retrying...`);
            return askOpenAICompatibleMultiTurn(
              { endpoint, model: discovered, apiKey, screenshotDataUrl, turns, isOllama, aiMode, onChunk },
              attempt + 1
            );
          }
        }
      }
      let msg = "";
      try {
        const parsed = JSON.parse(errBody);
        msg = parsed?.error?.message;
      } catch (_) {}
      throw new Error(`Model not found (404): ${msg || "The requested model is not available for your account. Please check Settings."}`);
    }
    if (response.status === 429) {
      if (attempt < 3) {
        await sleep(1000 * attempt);
        return askOpenAICompatibleMultiTurn({ endpoint, model, apiKey, screenshotDataUrl, turns, isOllama, aiMode, onChunk }, attempt + 1);
      }
      throw new Error("API rate limit or quota exceeded. Please try again shortly or check your billing.");
    }
    if (response.status >= 500 && attempt < 3) {
      await sleep(700 * attempt);
      return askOpenAICompatibleMultiTurn({ endpoint, model, apiKey, screenshotDataUrl, turns, isOllama, aiMode, onChunk }, attempt + 1);
    }
    throw new Error(`API error (${response.status}): ${errBody.slice(0, 200)}`);
  }

  // Handle streaming SSE chunks when onChunk is provided
  if (onChunk && response.body && typeof response.body.getReader === "function") {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let accumulated = "";
    let buffer = "";

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop(); // save incomplete line

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (payload === "[DONE]") break;
          try {
            const parsed = JSON.parse(payload);
            const delta = parsed.choices?.[0]?.delta;
            if (delta) {
              const reasoning = delta.reasoning_content || "";
              const content = delta.content || "";
              if (reasoning) {
                onChunk(reasoning, true);
              }
              if (content) {
                accumulated += content;
                onChunk(content, false);
              }
            }
          } catch (_) {}
        }
      }
    } catch (_) {}

    if (accumulated.trim()) {
      return accumulated;
    }
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text || !text.trim()) throw new Error("Received an empty response from the AI. Please try again.");
  return text;
}

// ---------- Google Gemini (multi-turn) ----------

function buildGeminiContents(fallbackScreenshotUrl, turns) {
  const inferenceTurns = turns.slice(-MAX_INFERENCE_TURNS);
  const activeImageIdx = getActiveScreenshotTurnIndex(inferenceTurns, fallbackScreenshotUrl);

  const contents = [];
  inferenceTurns.forEach((turn, i) => {
    const role = turn.role === "assistant" ? "model" : "user";
    let contentText = turn.text || "";

    if (i === inferenceTurns.length - 1 && role === "user" && isVerificationOrChallenge(contentText)) {
      contentText +=
        "\n\n[DIRECTIVE: Perform an independent, rigorous first-principles verification. Do NOT repeat or defend any past assistant mistakes. Solve directly, test every option, and provide the proven correct answer.]";
    }

    const parts = [{ text: contentText }];

    if (role === "user" && i === activeImageIdx) {
      const img = turn.screenshotDataUrl || (i === 0 ? fallbackScreenshotUrl : null);
      if (img) {
        const base64Data = img.split(",")[1];
        const mimeMatch = img.match(/^data:([^;]+);base64,/);
        const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
        if (base64Data) {
          parts.push({ inline_data: { mime_type: mimeType, data: base64Data } });
        }
      }
    }

    if (contents.length > 0 && contents[contents.length - 1].role === role) {
      // Merge into previous turn to guarantee alternating user/model roles for Gemini API
      contents[contents.length - 1].parts.push(...parts);
    } else {
      contents.push({ role, parts });
    }
  });

  return contents;
}

let cachedDiscoveredGeminiModel = null;

async function discoverActiveGeminiModel(apiKey) {
  if (cachedDiscoveredGeminiModel) return cachedDiscoveredGeminiModel;
  try {
    const sessionRes = await chrome.storage.session.get(["cachedDiscoveredGeminiModel"]);
    if (sessionRes && sessionRes.cachedDiscoveredGeminiModel) {
      cachedDiscoveredGeminiModel = sessionRes.cachedDiscoveredGeminiModel;
      return cachedDiscoveredGeminiModel;
    }
  } catch (_) {}

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data.models)) return null;

    // Filter models supporting generateContent
    const candidates = data.models
      .filter((m) => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes("generateContent"))
      .map((m) => (m.name || "").replace(/^models\//, ""))
      .filter(Boolean);

    // Prefer modern flash models
    const flashModel = candidates.find((id) => id.includes("2.5-flash") || id.includes("3.5-flash") || id.includes("flash"));
    const selected = flashModel || candidates[0];
    if (selected) {
      cachedDiscoveredGeminiModel = selected;
      try {
        await chrome.storage.session.set({ cachedDiscoveredGeminiModel: selected });
      } catch (_) {}
      return selected;
    }
  } catch (_) {}
  return null;
}

async function askGeminiMultiTurn(apiKey, screenshotDataUrl, turns, model = "gemini-2.5-flash", attempt = 1, aiMode = "direct", onChunk = null) {
  // Normalize deprecated model names
  let effectiveModel = model;
  if (!effectiveModel || effectiveModel === "gemini-1.5-flash" || effectiveModel === "gemini-2.0-flash") {
    effectiveModel = "gemini-2.5-flash";
  }

  // Pre-check payload size against Gemini's 20MB inline base64 ceiling
  const contents = buildGeminiContents(screenshotDataUrl, turns);
  let totalInlineBytes = 0;
  for (const c of contents) {
    for (const p of c.parts || []) {
      if (p.inline_data && p.inline_data.data) {
        totalInlineBytes += Math.round(p.inline_data.data.length * 0.75);
      }
    }
  }
  const MAX_GEMINI_INLINE_BYTES = 18 * 1024 * 1024; // 18MB safety margin
  if (totalInlineBytes > MAX_GEMINI_INLINE_BYTES) {
    throw new Error(
      "Screenshot payload exceeds Gemini's 18MB inline limit. Please use Select Area to capture a smaller region instead."
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 55000);
  const streamEndpoint = onChunk ? "streamGenerateContent?alt=sse&" : "generateContent?";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${effectiveModel}:${streamEndpoint}key=${encodeURIComponent(apiKey)}`;

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: getSystemPrompt(aiMode) }] },
        contents,
        generationConfig: { temperature: 0, maxOutputTokens: 2048 },
      }),
    });
  } catch (networkErr) {
    clearTimeout(timeoutId);
    if (networkErr.name === "AbortError") {
      throw new Error(
        "The request timed out (55s). If you are sending large screenshots, try using Select Area to send a smaller region instead."
      );
    }
    if (attempt < 3) {
      await sleep(500 * attempt);
      return askGeminiMultiTurn(apiKey, screenshotDataUrl, turns, effectiveModel, attempt + 1, aiMode, onChunk);
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
      // Step 1 fallback: if custom or old model failed, try gemini-2.5-flash
      if (attempt === 1 && effectiveModel !== "gemini-2.5-flash") {
        return askGeminiMultiTurn(apiKey, screenshotDataUrl, turns, "gemini-2.5-flash", attempt + 1, aiMode);
      }
      // Step 2 fallback: try gemini-3.5-flash
      if (attempt <= 2 && effectiveModel !== "gemini-3.5-flash") {
        return askGeminiMultiTurn(apiKey, screenshotDataUrl, turns, "gemini-3.5-flash", attempt + 1, aiMode);
      }
      // Step 3 fallback: dynamically query ModelService.ListModels for active supported models
      if (attempt <= 3) {
        const discovered = await discoverActiveGeminiModel(apiKey);
        if (discovered && discovered !== effectiveModel) {
          return askGeminiMultiTurn(apiKey, screenshotDataUrl, turns, discovered, 4, aiMode);
        }
      }

      let msg = "";
      try {
        const parsed = JSON.parse(errBody);
        msg = parsed?.error?.message;
      } catch (_) {}
      throw new Error(`Gemini model not found (404): ${msg || "The requested model is not available for this API version. Please select a supported model in Settings."}`);
    }
    if (response.status === 429) {
      if (attempt < 3) {
        await sleep(1000 * attempt);
        return askGeminiMultiTurn(apiKey, screenshotDataUrl, turns, effectiveModel, attempt + 1, aiMode);
      }
      throw new Error("Gemini rate limit or quota exceeded. Please try again shortly.");
    }
    if (response.status >= 500 && attempt < 3) {
      await sleep(700 * attempt);
      return askGeminiMultiTurn(apiKey, screenshotDataUrl, turns, effectiveModel, attempt + 1, aiMode);
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
