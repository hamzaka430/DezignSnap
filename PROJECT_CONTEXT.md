# PROJECT CONTEXT — Page Helper AI

## 1. PROJECT OVERVIEW
- **Application Name**: Page Helper AI
- **Tagline**: Instant on-page AI visual assistant powered by vision LLMs (OpenAI GPT-4o & Google Gemini 3.6 Flash).
- **Core Problem**: Users frequently encounter complex web interfaces, dense dashboards, foreign-language webpages, intricate configuration screens, or obscure buttons. Reading lengthy documentation or manually searching for an option takes significant time and creates user friction.
- **Intended Target Audience**:
  - Power web users navigating complex SaaS applications, enterprise tools, and analytics dashboards.
  - Non-technical users needing real-time visual guidance on where to click or how to understand web forms.
  - Researchers and students analyzing visual data, charts, and dense web articles.
  - International users browsing websites in languages they do not fluently speak.
- **Core Value Proposition**: "Set an instruction once, get instant visual AI answers on any webpage with zero server latency or middleman data collection." Users bring their own API keys (OpenAI / Gemini), guaranteeing complete privacy, zero subscription lock-in, and direct browser-to-AI communication.

---

## 2. TECH STACK
- **Frontend Architecture**:
  - Chrome Extension Manifest V3 (MV3).
  - Vanilla HTML5, CSS3, and modern ECMAScript (ES2022+).
  - Floating On-Page HUD Content Script with dynamic self-healing DOM injection (`MutationObserver` + fallback loop).
  - Client-side interactive canvas crop & upscale engine (`OffscreenCanvas` & `createImageBitmap`).
  - Native browser extension UI: Action Popup (`popup.html` / `popup.js`), Full-tab Settings/Options (`options.html` / `options.js`), Welcome Onboarding (`welcome.html`), Session Export & PDF Viewer (`session.html` / `session.js`), and Privacy Portal (`privacy-policy.html`).
- **Backend / Runtime Engine**:
  - Background Service Worker (`background.js`) handling lifecycle events, message routing, active tab screenshot captures (`chrome.tabs.captureVisibleTab`), image analysis, and direct REST API orchestration.
  - No custom intermediary backend servers (Serverless, Direct-to-Provider client architecture).
- **Database & Local Persistence**:
  - `chrome.storage.local` with `unlimitedStorage` permission.
  - Stores user API keys, active provider selection, customizable instruction preset arrays, active preset pointers, and multi-turn session transcript history with compressed base64 JPEG thumbnails.
- **Third-Party APIs & External Integrations**:
  - **OpenAI API**: `https://api.openai.com/v1/chat/completions` using model `gpt-4o` (multi-modal vision).
  - **Google Gemini API**: `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent` using model `gemini-3.6-flash` (multi-modal vision).
  - **jsPDF Client Library**: `lib/jspdf.umd.min.js` (v2.x UMD build) for generating client-side downloadable PDF transcripts.
- **Hosting & Deployment**:
  - Client runtime packaged as `.zip` (`page-helper-ai-v2.1.0.zip`) for Google Chrome Web Store Developer Dashboard.
  - Landing & Privacy Pages hosted at `https://dezignwise.com`.
- **Dev Tooling & Build Systems**:
  - Zero-build vanilla architecture (no bundler overhead; native browser ES execution).
  - Git version control (`main` branch).

---

## 3. PURPOSE & MOTIVATION
- **Real-World Problem**: Traditional browser AI extensions either inject heavy sidebars that obscure half the screen, require recurring monthly $15-$30 SaaS subscriptions, or route user webpage screenshots through third-party servers, posing serious corporate and personal privacy threats.
- **How It Differs From Alternatives**:
  - **Zero Middleman Server**: Requests go directly from `fetch()` in the browser extension service worker to OpenAI or Google. No third party ever sees screenshots, tokens, or browsing history.
  - **Smart Zoom (Select Area)**: Instead of sending downscaled whole-page screenshots where tiny buttons become unreadable pixels, users can drag-select a specific region. The engine crops, enhances, and upscales it before transmission, yielding near 100% optical accuracy.
  - **Confidence Meter**: The AI model assesses its own visual grounding (High / Medium / Low). Low confidence automatically suggests the user utilize "Select Area".
  - **Persistent Session & PDF Export**: Complete multi-turn Q&A threads with visual thumbnails can be exported into an executive-ready A4 PDF document at the end of a research session.
- **Business Model**:
  - Direct "Bring Your Own Key" (BYOK) utility model.
  - Free and open utility developed by Dezignwise (Muhammad Hamza) serving as a showcase of high-performance AI frontend engineering and driving consulting/enterprise client acquisition.

---

## 4. FEATURE INVENTORY
1. **Solve with AI (Full Page Capture)**:
   - Captures visible viewport via `chrome.tabs.captureVisibleTab`, applies black/blank DRM screening, and generates prompt with system vision grounding.
   - Status: Working ✅
2. **Select Area (Smart Zoom & High-Precision Crop)**:
   - Interactive mouse drag-selection overlay on host page, sub-pixel cropping, intelligent 1.4x-2.5x upscale using `OffscreenCanvas`, and targeted visual query.
   - Status: Working ✅
3. **Multi-Turn Follow-Up Conversations**:
   - Interactive follow-up input in floating panel. Maintains conversation history per active tab in memory (`activeConversations` Map) and syncs to session storage.
   - Status: Working ✅
4. **Self-Reported Confidence Meter**:
   - Vision prompt enforces structured `CONFIDENCE: High|Medium|Low` footer parsed via regex, rendering color-coded UI badges and contextual retry tips.
   - Status: Working ✅
5. **DRM & Blank Capture Detection**:
   - Scans captured image bitmap luminance distribution across 60px downsampled canvas. Detects >85% pure black captures (e.g. Widevine DRM video or canvas protection) and warns user.
   - Status: Working ✅
6. **Instruction Preset Management**:
   - Allows users to create, edit, delete, and switch between customized system prompts (e.g., General Page Explainer, Bug Finder, Data Extractor).
   - Status: Working ✅
7. **Dual AI Provider Engine (OpenAI & Gemini)**:
   - Seamless toggling between GPT-4o and Gemini 3.6 Flash with automatic payload structuring and retry handling.
   - Status: Working ✅
8. **Session Export to PDF**:
   - Client-side A4 document generation with formatted Q&A turns, timestamps, page titles, URLs, and compressed JPEG thumbnails via jsPDF.
   - Status: Working ✅
9. **Self-Healing Floating UI**:
   - Content script DOM injection resistant to SPA route changes and host framework DOM purges via `MutationObserver` and interval fallback.
   - Status: Working ✅
10. **Popup Fallback Controller**:
    - Toolbar action popup allowing trigger on sites where content script injection is restricted or disabled.
    - Status: Working ✅

---

## 5. USER JOURNEY & WORKFLOW
1. **Installation & Onboarding**:
   - User installs extension from Chrome Web Store or unpacks `manifest.json`.
   - `chrome.runtime.onInstalled` fires (`details.reason === "install"`), setting default presets and automatically launching `welcome.html`.
2. **Configuration**:
   - User navigates to Settings (`options.html`), inputs their OpenAI API key (`sk-...`) or Google Gemini API key, selects default provider, and configures instruction presets.
3. **Daily Navigation & Triggering**:
   - User browses to any web application or page.
   - Content script injects floating buttons ("🧠 Solve with AI", "🎯 Select Area", "📄 End Session") in the bottom-right corner.
4. **Analysis Execution**:
   - **Option A (Full Page)**: User clicks "Solve with AI". Message `SOLVE_WITH_AI` is sent to `background.js`. Service worker captures tab, evaluates black frame detection, formats vision message payload, and calls OpenAI/Gemini with exponential retry.
   - **Option B (Region Zoom)**: User clicks "Select Area". Crosshair overlay appears. User drags rectangle over target button or text. Content script calculates bounding box with device pixel ratio (`dpr`), sends `SOLVE_WITH_AI_REGION`. Background crops and upscales region, then sends to LLM.
5. **Review & Follow-Up**:
   - Answer appears in sleek floating panel with confidence badge.
   - If user needs clarification, they type in the follow-up bar. Background appends turn to active tab context thread and queries model referencing original screenshot.
6. **Session Termination & Export**:
   - User clicks "📄 End Session". Background opens `session.html`.
   - `session.js` loads all interactions from `chrome.storage.local`, builds formatted A4 transcript with thumbnails, and automatically triggers browser PDF download.

---

## 6. SYSTEM ARCHITECTURE
- **Component Communication Diagram**:
  ```
  [Host Webpage DOM] <---> [Content Script: content.js] (Closed UI / Events)
                                   |
                          chrome.runtime.sendMessage
                                   |
                                   v
             [Background Service Worker: background.js]
             - In-memory Active Tab Context Map
             - Screenshot Capture (captureVisibleTab)
             - Image Processing (OffscreenCanvas)
             - DRM / Black Screen Detector
             - Provider Adapters (OpenAI / Gemini)
                                   |
                     +-------------+-------------+
                     |                           |
                     v                           v
         [OpenAI api.openai.com]    [Google generativelanguage]
                     |                           |
                     +-------------+-------------+
                                   |
                                   v
             [chrome.storage.local] (Keys, Presets, History)
                                   ^
                                   |
       +---------------------------+---------------------------+
       |                           |                           |
  [Popup: popup.js]      [Options: options.js]     [Session: session.js]
  ```
- **Security Boundaries**:
  - Host Page scripts cannot access extension APIs directly (`externally_connectable` is not declared).
  - Background Service Worker runs in isolated execution context with network permissions restricted to OpenAI and Google endpoints.
  - API Keys are stored locally in Chrome extension sandboxed storage and never transmitted to any third-party analytics or intermediary server.

---

## 7. CODEBASE STRUCTURE
- `manifest.json`: Extension Manifest V3 configuration, metadata, permissions, content script rules, and icon mappings.
- `background.js`: Service worker managing tab capture, canvas manipulation, multi-turn state, LLM API calls, and session persistence.
- `content.js`: Injected script managing floating action buttons, area selection canvas overlay, response modal, and self-healing DOM observers.
- `content.css`: Scoped CSS styles for floating action buttons, answer panel, message bubbles, confidence badges, and selection overlay.
- `popup.html` / `popup.js`: Toolbar action popup providing rapid provider switching, preset selector, and fallback trigger for restricted pages.
- `options.html` / `options.js` / `options.css`: Full-page settings dashboard for entering API keys, configuring presets, testing credentials, and clearing history.
- `session.html` / `session.js`: Session report preview and automated client-side PDF export generator using jsPDF.
- `welcome.html`: Post-install onboarding guide introducing users to key setup and usage steps.
- `privacy-policy.html`: Complete, store-compliant privacy policy detailing data flows, BYOK mechanics, and zero-telemetry architecture.
- `index.html`: Marketing landing page and extension showcase with responsive dark-theme design.
- `STORE_LISTING.md`: Complete Chrome Web Store submission kit, copy, permission justifications, and store review guidance.
- `lib/jspdf.umd.min.js`: Bundled client-side PDF compilation library.
- `icons/`: Extension icon suite across 16x16, 32x32, 48x48, and 128x128 pixel dimensions.

---

## 8. KEY FILES REFERENCE
1. `manifest.json`: Defines extension identity, MV3 permissions (`storage`, `activeTab`, `unlimitedStorage`), content scripts, and host endpoints.
2. `background.js`: Core controller containing the LLM orchestration logic, prompt templates, multi-turn history, and image upscaling algorithms.
3. `content.js`: Main user touchpoint on every webpage; contains UI elements, mouse tracking for region selection, and message dispatchers.
4. `content.css`: Visual design system ensuring the floating HUD renders cleanly across diverse website stylesheets without style collision.
5. `options.js`: Controls credentials storage, preset CRUD logic, input validation, and storage cleanup.
6. `session.js`: Transforms accumulated Q&A history and visual thumbnails into structured multi-page PDF documents.
7. `popup.js`: Quick-action controller enabling execution on pages with strict CSP or framed contexts.
8. `lib/jspdf.umd.min.js`: Critical standalone dependency enabling zero-network offline PDF generation.
9. `STORE_LISTING.md`: Operational guide containing developer console metadata, permission justifications, and reviewer FAQs.
10. `privacy-policy.html`: Legal document establishing compliance with Chrome Web Store User Data Policy.

---

## 9. ENVIRONMENT & CONFIGURATION
- **Runtime Environment**: Google Chrome 116+ (or Chromium-based browsers such as Brave, Edge, Opera, Arc) supporting Manifest V3 and `OffscreenCanvas`.
- **User Environment Variables / Storage Keys**:
  - `openaiApiKey`: User's personal OpenAI secret key (`sk-...`). Stored in `chrome.storage.local`.
  - `geminiApiKey`: User's personal Google AI Studio Gemini API key. Stored in `chrome.storage.local`.
  - `activeProvider`: `"openai"` | `"gemini"`.
  - `instructionPresets`: Array of `{ id: string, name: string, text: string }`.
  - `activePresetId`: ID string referencing active preset.
  - `sessionHistory`: Array of recorded Q&A session entries with thumbnails and turn arrays.

---

## 10. KNOWN ISSUES & ACTIVE BLOCKERS
1. **Host Page Clickjacking & Programmatic Synthetic Clicks**:
   - Floating buttons in `content.js` previously did not check `e.isTrusted`. A host page script could syntactically call `.click()` on `#ph-ai-btn` to trigger unauthorized screenshot capture and billing.
2. **DOM Style Leakage & Host Page Tampering**:
   - Injected elements currently exist directly in the host DOM root rather than inside a Shadow DOM, exposing them to host page CSS cascades and script inspection.
3. **Attribute Injection in Options Preset Rendering**:
   - `options.js` concatenated `data-id="${preset.id}"` without escaping quote characters, creating a potential attribute-breakout vector.
4. **Broad Host Permissions Review Overhead**:
   - `<all_urls>` requires detailed justification during Chrome Web Store review.

---

## 11. AGENT WORKING RULES
- **No Remote Intermediaries**: Never introduce an intermediate server, proxy, or telemetry endpoint that intercepts user screenshots or credentials.
- **Manifest V3 Compliance**: Do not introduce remote script loading, `eval()`, or inline event handlers (`onclick="..."` in HTML) as they violate Chrome Extension Content Security Policies.
- **Defensive UI Injection**: Always preserve self-healing observers and ensure all injected DOM nodes use vendor prefixes (`ph-`) or Shadow DOM encapsulation to prevent collision with host page frameworks.
- **Vanilla ES Simplicity**: Retain the lightweight, zero-build architecture unless a complex build pipeline is explicitly requested by the maintainer.

---

## 12. EXECUTIVE SUMMARY
Page Helper AI is a production-grade, Manifest V3 Chrome Extension providing private, on-demand visual intelligence across any webpage. Built entirely in vanilla modern JavaScript, the extension captures visible browser tabs, enables high-precision cropped area analysis with automatic upscaling, and dispatches multi-turn visual queries directly to OpenAI (GPT-4o) or Google Gemini (3.6 Flash). The application operates on a strict "Bring Your Own Key" (BYOK) architecture with zero intermediary servers, ensuring user privacy and zero maintenance overhead. Complete with automated confidence scoring, DRM capture detection, preset management, and one-click PDF transcript export, Page Helper AI offers an elegant, self-contained AI assistant ready for the Chrome Web Store.
