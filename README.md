# DezignSnap — AI Visual Screen Assistant

A high-performance Chrome extension that captures screenshots or drag-selected regions of any webpage and delivers instant, grounded AI answers — to understand interface elements, debug layouts, locate buttons, or translate text. Powered by **Groq (Llama 3.2 Vision)**, **Google Gemini (3.6 Flash)**, **OpenAI (GPT-4o)**, **OpenRouter**, or private local **Ollama** using your own API keys.

## 🚀 Standout Features

- **🎯 Select Area [Alt+S] (Smart Zoom)** — Instead of capturing the whole page, drag-select just the region you care about. The extension crops and upscales it (1.4x–2.5x) before sending it to the AI, dramatically improving accuracy on small text and icons.
- **⚡ Multi-Engine Freedom** — Switch on the fly between Groq, Gemini, OpenAI, OpenRouter, or 100% free local Ollama.
- **🖱️ Quick Text Ask** — Right-click any highlighted text on a webpage and select *"⚡ Ask AI about selection"* for instant explanation without snipping.
- **🚦 Confidence Meter** — Every answer comes with a self-reported confidence level (High / Medium / Low). When confidence is Low, the panel automatically suggests using Select Area for a more reliable answer.
- **💬 Follow-up Conversations** — Answers aren't one-shot. Ask follow-up questions in the same context as your original screenshot, just like a real chat thread. Full threads are included in the PDF export.

## ✨ Core Features

- **Set an instruction once, it's remembered** — create multiple presets (ELI5, Roast UI, Target Finder, Translate) and switch between them anytime.
- **On-page floating button** — click "⚡ Snip & Ask" or "🎯 Snip Area" on any page.
- **Global Hotkey** — press `Alt+S` anywhere to instantly trigger region selection.
- **Toolbar fallback** — if a site blocks content scripts, the popup's "Ask for this page now" button always works.
- **"📄 End Session" PDF export** — your entire conversation history (instructions, answers, screenshot thumbnails, confidence levels) exports to a PDF in one click.
- **Accuracy-focused**: `temperature: 0`, lossless PNG screenshots, a strict "only state what's clearly visible" system prompt, and automatic detection of black/DRM-protected screenshots.
- **Reliable**: automatic timeout and retry on network/rate-limit errors, self-healing UI injection (see below), clear error messages throughout.
- **Bring your own API key** — no third-party server in the middle; requests go directly from your browser to your chosen provider.

## 🛠️ Reliability Fix: Buttons Not Always Appearing

Earlier versions occasionally failed to show the floating buttons on certain pages — typically single-page applications (SPAs) or sites that aggressively re-render their DOM, which can remove elements they don't recognize (including ones this extension injects).

This is now fixed with a **self-healing injection system** in `content.js`:
- A `MutationObserver` watches the page and instantly re-injects the UI if it's ever removed.
- A lightweight fallback check runs every few seconds as a safety net.
- An additional check runs on full page load, covering unusually slow-loading pages.

The buttons should now reliably persist regardless of how a site manages its DOM.

## 📦 Install (Developer / Unpacked)

1. Go to `chrome://extensions`
2. Enable **Developer mode** (top-right)
3. Click **Load unpacked** and select this folder
4. On first install, a **Welcome page** opens to guide you through setup

> Want to publish to the Chrome Web Store? See `STORE_LISTING.md` for the full checklist, listing copy, and permission justifications.

## ⚙️ Setup

1. Click the extension icon → **⚙️ (Settings)**, or go to `chrome://extensions` → Details → Extension options.
2. Choose your **AI Provider** (OpenAI or Gemini) and enter the corresponding API key:
   - OpenAI: https://platform.openai.com/api-keys
   - Gemini: https://aistudio.google.com/app/apikey
   You can save both keys and switch providers anytime (including from the popup dropdown).
3. A default "General page helper" instruction is ready to use — add your own presets as needed (e.g. "Summarize this page", "Find a button", "Translate this").
4. Select which preset is active via the radio button in Settings, or switch quickly from the popup dropdown.

## 🚀 Usage

1. Visit any webpage.
2. Three floating buttons appear in the bottom-right corner:
   - **🧠 Solve with AI** — captures a screenshot and answers based on your active instruction.
   - **🎯 Select Area** — drag-select a specific region for a zoomed, more precise answer.
   - **📄 End Session** — instantly generates and downloads a PDF of your entire session (opens in a new tab).
3. After the first answer, a follow-up input appears — keep asking questions in the same context.
4. If the buttons aren't visible on a particular site (rare, and now largely resolved — see above), use the popup's **"Ask for this page now"** fallback, which always works.

## 🔒 Reliability & Accuracy

- Every request uses `temperature: 0` for deterministic, low-randomness output.
- Screenshots are captured as **lossless PNG** (no compression artifacts that could cause misreadings).
- The system prompt strictly instructs the model to state only what is clearly visible — no guessing.
- **Confidence self-reporting**: every answer includes a High/Medium/Low confidence rating.
- **DRM/black-screenshot detection**: if 85%+ of a screenshot is solid black (a common DRM output-protection signature), a warning is attached to the answer.
- **Network resilience**: 30-second timeout, automatic retry (up to 3 attempts) on transient errors (5xx, 429, timeouts).
- Restricted pages (`chrome://`, extension pages) return a clear error instead of failing silently.

## 📁 File Structure

```
manifest.json          Extension configuration (Manifest V3)
background.js           Service worker: screenshots, AI calls, retries, session history, multi-turn conversations
content.js/.css         On-page floating buttons, region selection, chat-style answer panel
popup.html/.js          Toolbar quick-launcher (provider/preset switch, fallback ask)
options.html/.css/.js   Full settings page (API keys, presets, history)
welcome.html             First-install onboarding
session.html/.js         PDF export page (uses bundled jsPDF)
privacy-policy.html      Privacy policy (bundled, and hostable for a Web Store listing)
STORE_LISTING.md         Chrome Web Store submission checklist
icons/                   Extension icons (16/32/48/128px)
lib/jspdf.umd.min.js     Bundled locally — no CDN dependency, MV3-CSP safe
```

## ⚠️ Important Notes

- This extension uses your own OpenAI and/or Gemini API key(s) — API usage is billed to your own account with that provider.
- The `<all_urls>` permission is required because the on-page button click isn't a toolbar action, so the narrower `activeTab` permission alone isn't sufficient. Full reasoning is documented in `STORE_LISTING.md` and `privacy-policy.html`.
- No website can block screenshot capture via JavaScript (it's a browser-level API) — only DRM-protected content renders as black, which the extension detects automatically.
- **This tool is not designed for use in exams, quizzes, or other assessments where independent work is expected, and should not be used for that purpose.** Its intended use is understanding page content and navigation assistance.
