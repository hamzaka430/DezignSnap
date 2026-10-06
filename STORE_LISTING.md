# DezignSnap — Chrome Web Store Submission Package

## 1. Store Metadata

**Title:** DezignSnap — AI Visual Assistant  
*(Character count: 32 / 45 max)*

**Short Description:**  
Capture webpage screenshots or snip areas for instant visual AI answers powered by Gemini, OpenAI, Groq, and Ollama.  
*(Character count: 117 / 132 max)*

**Category:** Productivity  
**Secondary Category:** Developer Tools  
**Language:** English (United States)  
**Tags / Keywords:** AI, screenshot, page analysis, visual assistant, GPT-4o, Gemini, Groq, Ollama, BYOK, productivity  
**Support Email:** hamzaka@dezignwise.com  
**Privacy Policy URL:** https://dezignsnap-privacy.hamzaka549.workers.dev/privacy-policy  
**Homepage URL:** https://dezignwise.com  

---

## 2. Store Dashboard Summary & Disclosures

### Privacy Policy Summary (Paste into the "Single Purpose & Data Usage" field)
DezignSnap adheres strictly to a zero-data-collection, Bring-Your-Own-Key (BYOK) architecture. The extension does not operate any intermediate proxy servers, collects no personal information, and contains no analytics, telemetry, or advertising trackers. Screenshots and text queries are sent directly from the user's browser to their chosen AI provider API (Google Gemini, OpenAI, Groq, OpenRouter) using their personal API key, or processed 100% offline when using local Ollama. All API keys, instruction presets, and session transcripts are stored strictly on the user's device in local browser storage.

---

## 3. Permission Justifications (Paste into Developer Console Justification Fields)

### `host_permissions: <all_urls>`
**Justification:** DezignSnap provides an on-page visual assistant toolbar (HUD) and an interactive region-selection overlay that allows users to select, inspect, and analyze content on any website they browse. Because users research across arbitrary domains, educational portals, documentation sites, and web applications, broad host matching (`<all_urls>`) is essential for the extension to display its selection overlay across those pages. DezignSnap operates purely on-demand: it never scans, scrapes, or logs page content in the background, and captures viewports solely when the user explicitly clicks a snip button or presses a registered hotkey. Additionally, host permissions cover direct browser-to-API communication with the user's selected AI provider endpoints (`api.openai.com`, `generativelanguage.googleapis.com`, `api.groq.com`, `openrouter.ai`, and local `localhost:11434`).

### `storage` & `unlimitedStorage`
**Justification:** DezignSnap stores user credentials (personal API keys for Gemini, OpenAI, Groq, or OpenRouter), custom instruction presets/personas, UI preferences, and session Q&A transcripts locally on the user's computer via `chrome.storage.local`. To allow users to review their research history and export clean A4 PDF reports, session records include compressed screenshot thumbnails of captured areas. These image thumbnails can accumulate over extended research sessions and exceed the standard 10MB quota of `chrome.storage.local`, making `unlimitedStorage` necessary to prevent data loss or browser storage quota crashes.

### `activeTab`
**Justification:** When a user clicks the "📸 Full Page" button or triggers a drag-to-snip action on a webpage, the extension uses `activeTab` to temporarily authorize the background service worker to capture the visible viewport (`chrome.tabs.captureVisibleTab`). This ensures screenshot capture is strictly isolated to the single active tab the user is currently viewing, and only executes upon direct user invocation.

### `contextMenus`
**Justification:** DezignSnap adds a single right-click context menu item ("⚡ Ask AI about selection") that appears when text is highlighted on a webpage. This enables users to immediately send highlighted phrases, error logs, or code snippets to the AI without needing to capture a screenshot.

### `sidePanel`
**Justification:** DezignSnap provides a Native Chrome Side Panel workspace (`Alt+P`) that allows users to view AI explanations, research questions, and manage multi-turn chat sessions without obscuring webpage content. When users share a browser tab in virtual meetings (Google Meet, Microsoft Teams, Zoom Web), Chrome's tab capture engine excludes the native Side Panel, allowing users to keep the assistant active without it being recorded or displayed in the shared stream.

### `scripting` (Note for Reviewers)
**Justification:** DezignSnap intentionally does not request the `scripting` permission in `manifest.json`. The extension strictly adheres to Chrome's Principle of Least Privilege by declaring its content scripts in `manifest.json` under `"content_scripts"`, eliminating the need for arbitrary programmatic script execution (`chrome.scripting.executeScript`).

---

## 4. Detailed Description (Long Description for Web Store Listing)

DezignSnap is an on-page AI visual assistant that helps you understand, analyze, and extract insights from anything on your screen. Whether you are debugging complex code, parsing dense data tables, translating visual graphics, or reviewing user interface designs, DezignSnap brings multi-model visual intelligence directly into your browser workflow.

By pairing direct screen-snip capture with leading multimodal AI models—including Google Gemini 2.5 Flash, OpenAI GPT-4o, Groq (Qwen 27B Vision / Llama 3.3 70B), OpenRouter, and private local Ollama—DezignSnap delivers grounded, instant answers without context switching.

---

### KEY FEATURES & WORKFLOWS

#### 1. Instant Precision Snipping (Alt+S)
Do not waste time typing out descriptions of what is on your screen. Press Alt+S or click "Snip Area" to activate the interactive selector. Drag a box over any chart, UI component, diagram, or code block. DezignSnap automatically crops the region, applies intelligent 1.4x–2.5x upscale via offscreen canvas for crisp optical clarity, and sends it directly to your selected AI engine.

#### 2. Full Page Viewport Analysis (Alt+A)
Need an evaluation of an entire webpage layout or long-form dashboard? Press Alt+A or click "Full Page" to capture the visible viewport in visually lossless JPEG format. DezignSnap automatically hides its own floating interface during capture so your snapshot is clean, unhindered, and accurate.

#### 3. Direct AI Chat (No Screenshot Required)
Want to ask a quick technical question, generate code, or brainstorm ideas without capturing your screen? Click the chat button to open Direct AI Chat. Type your query directly into the floating panel and receive rapid responses without taking a screenshot or losing your place on the page.

#### 4. Quick Right-Click Text Intelligence
Highlight any text snippet, error message, or foreign phrase on any webpage, right-click, and select "Ask AI about selection". DezignSnap opens the assistant panel with your highlighted text pre-loaded and ready for explanation.

#### 5. Dual AI Reasoning Modes
- **Direct Mode:** Delivers ultra-fast, concise answers tailored for quick lookups, terminology definitions, and rapid problem-solving.
- **Deep Thinking Mode:** Produces structured explanations featuring step-by-step reasoning accordions (`<details>`), allowing you to inspect the AI's internal thought process before reviewing the final conclusion.

#### 6. Multi-Engine AI Freedom (Bring Your Own Key)
You have complete freedom over which AI provider powers your assistant:
- **Google Gemini (2.5 Flash / Pro):** Fast, accurate multimodal understanding with resilient fallback and automatic model discovery.
- **OpenAI (GPT-4o / GPT-4o-mini):** Renowned reasoning capabilities for code analysis and complex visual problem-solving.
- **Groq (Qwen 3.8 27B Vision / Llama 3.3 70B):** Near-instant token generation with ultra-low latency.
- **OpenRouter:** Access a broad catalog of open-weights and specialized multimodal models with unified billing.
- **Ollama (100% Local & Offline):** Run models like `llama3.2-vision` completely locally on your own machine. Zero network requests, zero cloud dependencies, and complete data privacy.

#### 7. Non-Intrusive, Customizable Interface
- **Sidebar-Style Arrow Collapse:** Minimize the floating toolbar into an ultra-slim 6px vertical edge strip with a sleek chevron arrow toggle, and expand it smoothly on hover or click.
- **Auto-Collapse Protection:** If left open and inactive for 60 seconds, the toolbar gently docks back to the edge strip without interrupting your browsing.
- **Flexible Docking:** Dock the toolbar and chat panel to the Left, Center, or Right side of your screen with a single click.
- **Scroll Preservation:** The host webpage's viewport scroll coordinates are locked and preserved during capture, preventing unexpected jumping or auto-scrolling to the top.
- **Continuous Conversation Memory:** Keeps conversation context intact for up to 50 turns per active tab. Ask iterative follow-ups, request code modifications, or start fresh anytime with the "New" button.

#### 8. Client-Side PDF Session Export
Export your entire research session with one click. DezignSnap compiles all questions, answers, and high-resolution screenshot thumbnails into an elegant, formatted A4 PDF transcript generated completely client-side via embedded jsPDF.

---

### WHO IS DEZIGNSNAP FOR?

- **Developers & Engineers:** Snip stack traces, error messages, GitHub diffs, or API schemas to get instant explanations and bug fixes.
- **Designers & UX Researchers:** Capture interface components, evaluate contrast and visual hierarchy, or critique layouts using the built-in "Roast My UI" persona.
- **Students & Researchers:** Parse scientific diagrams, translate text embedded inside infographic images, and export clean study notes to PDF.
- **Data Analysts:** Extract tabular figures and trend summaries from embedded dashboard charts without manual transcription.

---

### PRIVACY & SECURITY FIRST (BYOK)

DezignSnap was engineered from day one to respect user privacy:
- **Direct Browser-to-API Communication:** The extension communicates directly with the official endpoints of OpenAI, Google, Groq, OpenRouter, or your local Ollama instance. No intermediate backend server ever touches your data.
- **No Analytics, No Tracking:** Zero analytics SDKs, zero telemetry collectors, and zero third-party cookies.
- **Local Storage Only:** API keys, presets, and session histories are stored strictly in your browser's `chrome.storage.local` sandbox.
- **Synthetic Click Defense:** Interactive handlers verify `event.isTrusted` to protect against synthetic click hijacking from hostile host pages.
- **Full Data Control:** Clear your session history or delete your API keys at any time from the Settings dashboard.

---

### QUICK START GUIDE

1. Install DezignSnap from the Chrome Web Store.
2. Pin DezignSnap to your browser toolbar.
3. Click the extension icon and open **Settings** to enter your API key for Google Gemini, OpenAI, Groq, or OpenRouter (or select Ollama for local offline mode).
4. Navigate to any webpage and press **Alt+S** to snip an area, **Alt+A** to solve the full page, or click the floating toolbar to start chatting!

---

## 5. Visual Asset Specifications

| Asset | Dimensions | Format | Requirement |
|---|---|---|---|
| Extension Icon | 128x128 px | PNG | Required for Chrome Web Store header and installation dialog |
| Store Screenshot 1 | 1280x800 px | PNG / JPEG | Overview: Floating HUD on webpage with active snip selector |
| Store Screenshot 2 | 1280x800 px | PNG / JPEG | Feature: AI Answer panel open showing visual analysis & code explanation |
| Store Screenshot 3 | 1280x800 px | PNG / JPEG | Feature: Direct AI Chat and Deep Thinking mode accordion |
| Store Screenshot 4 | 1280x800 px | PNG / JPEG | Feature: Settings page showing provider switching (Gemini, OpenAI, Groq, Ollama) |
| Store Screenshot 5 | 1280x800 px | PNG / JPEG | Feature: Client-side formatted PDF session export transcript |
| Small Promo Tile | 440x280 px | PNG | Optional (Recommended for Web Store search results tile) |
| Marquee Tile | 1400x560 px | PNG | Optional (For featured store placements) |
