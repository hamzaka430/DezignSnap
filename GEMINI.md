# GEMINI.md — DezignSnap

## Project Name & Purpose
- **Name**: DezignSnap
- **Purpose**: A privacy-focused Chrome Extension (Manifest V3) that captures screenshots (full page or user-dragged region), highlighted text, or direct text queries, providing instant, visually grounded AI answers using **Groq (Qwen 3.8 27B Vision & Text with auto-discovery)**, **Google Gemini (2.5 Flash)**, **OpenAI (GPT-4o)**, **OpenRouter**, or **Ollama (Local AI)** with Bring-Your-Own-Key (BYOK) architecture.

## Complete Tech Stack
- **Platform**: Google Chrome Extension Manifest V3 (MV3).
- **Core Languages**: Vanilla HTML5, CSS3, ES2022+ JavaScript.
- **Client Libraries**: `jsPDF` (`lib/jspdf.umd.min.js`) for in-browser PDF compilation.
- **External AI Providers & Endpoints**:
  - **Groq**: `https://api.groq.com/openai/v1/chat/completions` (`qwen/qwen3.8-27b` multimodal vision + text with resilient fallback & auto-discovery)
  - **Google Gemini**: `https://generativelanguage.googleapis.com/v1beta/models` (`gemini-2.5-flash` with resilient fallback & auto-discovery via ModelService)
  - **OpenAI**: `https://api.openai.com/v1/chat/completions` (`gpt-4o`)
  - **OpenRouter**: `https://openrouter.ai/api/v1/chat/completions`
  - **Ollama**: `http://localhost:11434/v1/chat/completions` (`llama3.2-vision`)
- **Storage Layer**: `chrome.storage.local` (with `unlimitedStorage` permission).

## Design System & Color Palette (design.md)
- **Primary / Slack Aubergine**: `#4a154b` (RGB: 74, 21, 75)
- **Primary Hover / Deep Aubergine**: `#611f69`
- **Border Tint / Accent**: `#592466`
- **Canvas Cream**: `#f4ede4` (RGB: 244, 237, 228)
- **Canvas Lavender**: `#f9f0ff` (RGB: 249, 240, 255)
- **Canvas White**: `#ffffff`
- **Text Ink**: `#1d1d1d` | **Text Mute**: `#696969` | **Mauve**: `#d9bdde`
- **Atmospheric Mesh Gradient**: `#fff0e6` (peach) + `#e9d8ff` (lavender) + `#e6f4ea` (dusty green) + `#f4ede4` (cream)
- **Buttons**: Strictly pill-shaped at `border-radius: 90px;`

## Current Project Status
- ✅ **Official Brand Assets & Logo**: Custom high-resolution brand icons (`16px`, `32px`, `48px`, `128px`) and horizontal brand logo banner integrated across extension and UI surfaces.
- ✅ **Balanced Slack Aubergine Palette (design.md & WCAG AA)**: Refined, restrained color distribution across all extension pages. Aubergine (`#4a154b`) is strictly reserved for primary CTA buttons, brand badges, and subtle focus rings; backgrounds use crisp neutral white/canvas (`#ffffff` / `#f8f9fa`); typography uses high-contrast ink (`#111827`); and borders use clean neutral hairlines (`#e5e7eb`), eliminating over-saturation and muddy multi-color gradients.
- ✅ **Sidebar-Style Corner Dock Toggle & Crisp Vector Icons**: Collapse button and edge dock tab use modern sidebar panel icons (outline in idle, solid on hover) pinned flush to the viewport corner (`bottom: 30px; right: 0`) for zero page disruption; 100% free of raw emojis.
- ✅ **Standalone Web Showcase & Installer Portal (`web/`)**: Complete responsive website in `web/` with interactive zero-sycophancy MCQ simulator, feature deep-dives, exclusive 1-click Chrome Web Store installation, keyboard shortcut guide, and FAQ.
- ✅ **Distribution & Commercial Model**: Proprietary freemium extension distributed exclusively through Chrome Web Store with Bring-Your-Own-Key (BYOK) privacy; planned optional premium convenience tiers as user base scales.
- ✅ **Horizontal Positioning Modes**: HUD and chat can be placed at `Right`, `Center`, or `Left` with a 1-click cycle button (`⇋`) or options dropdown.
- ✅ **Direct AI Chat (No Screenshot Required)**: Instant text-only chat mode with zero preamble, bypassing screenshot capture when desired.
- ✅ **AI Reasoning Modes (Direct Answer vs. Deep Thinking)**: Gemini/DeepSeek-style thinking mode with collapsible `<details>` thought process accordion, or ultra-fast direct answer mode.
- ✅ **Strict Chat Viewport Bounding**: Chat UI is strictly constrained (`min(600px, 80vh)`) with smooth internal scrolling for long conversation history.
- ✅ **Original Screenshot Quality in Export**: High-resolution snapshots preserved without compression artifacts in both PDF export and session preview.
- ✅ **Snip Blur Removal**: Area selection overlay (`#ph-select-overlay`) rendered crystal clear with `backdrop-filter: none;`.
- ✅ **Multi-Engine AI Freedom**: Groq, Gemini, OpenAI, OpenRouter, and local Ollama fully integrated.
- ✅ **Global Hotkey Snipping**: `Alt+S` (Area Snip) and `Alt+A` (Full Page Solve) registered via Chrome commands.
- ✅ **Quick Text Ask**: Right-click context menu (*"⚡ Ask AI about selection"*) enabled for highlighted text.
- ✅ **Custom Personas & Modes**: Pre-built modes for Verified Quiz & MCQ Solver, ELI5, Roast UI, Target Finder, Translate, and Bug Hunter.
- ✅ **Select Area (Smart Zoom)**: Functional with sub-pixel cropping and 1.4x-2.5x upscale via `OffscreenCanvas`.
- ✅ **Confidence Meter & Tips**: Parses self-reported confidence from LLM responses; renders color-coded badges and tips.
- ✅ **Multi-turn Chat & Follow-ups**: In-memory tab conversation state mapped to persistent session history.
- ✅ **Continuous Chat History & 50-Message Memory**: Screenshots and questions append seamlessly to ongoing chat without wiping history. In-memory context preserves up to 50 messages per active tab with a dedicated "➕ New" button for starting fresh.
- ✅ **Auto-Scroll to Answer Start**: Automatically positions the top of newly arrived AI responses in full view instead of jumping to the bottom.
- ✅ **Session History & PDF Export**: Instant client-side generation of formatted A4 reports with embedded high-res thumbnails.
- ✅ **Zero-Intrusion Snip & Scroll Preservation**: Floating HUD and AI chat panel auto-hide during region drag and full-page capture to prevent covering webpage content or appearing in screenshots. Host page viewport scroll coordinates are locked and preserved so the webpage never jumps or scrolls to the top.
- ✅ **First-Principles Problem & MCQ Solver (Zero Sycophancy)**: Independent evaluation of all options from scratch; never assumes marked/checked buttons on screen are correct; strictly prohibits "cannot check" refusals.
- ✅ **Decoupled Memory & Active Vision Isolation**: Keeps full 50-turn chat history for user display and PDF export while feeding a clean, rolling 8-turn context window with single active screenshot to the AI, preventing vision conflation and multi-turn error compounding.
- ✅ **Challenge & Correction Protocol**: Detects verification requests ("sahi answer do", "verify again", etc.) and forces an objective first-principles re-examination without anchoring to past errors.
- ✅ **Screen Share Stealth & Anti-Capture Shield**: Real-time WebRTC `getDisplayMedia` interception auto-hides HUD/toggles during active screen share in Google Meet/Teams/Zoom Web. Global `Alt+H` panic shortcut and "Screen Share Stealth" toggle completely hide on-screen docks and HUD for 100% capture immunity during desktop or tab sharing; `Escape` key dismisses answer panel in 0ms.
- ✅ **Security Hardened**: Protected against synthetic clickjacking (`e.isTrusted`), attribute injection, and request floods.
- ✅ **Extension Context Invalidation Resilience**: Gracefully handles extension reloads in developer mode or silent updates without console exceptions; automatically stops orphaned DOM observers and polling loops, and warns users to refresh (F5).
- ✅ **Aligned Personas & Interactive Task Co-Pilot**: Flagship step-by-step workflow guide ("Action Navigator") visually inspects any page and instructs the user on the exact next physical click/input with precise locations and colors, plus Verified MCQ Solver, Visual Bug Hunter, UI/UX Critique, Data Extractor, and Executive Summarizer, with 1-click default restoration.
- ✅ **Original High-Definition Screenshot Fidelity**: Preserves full-resolution snapshots (up to 1600px width @ 0.92 quality) across Session History preview and PDF reports, eliminating legacy 360px downsampling blurriness.
- ✅ **Direct Developer Support & Ticket Desk**: Integrated support ticket form delivering directly to `hamzaka@dezignwise.com` with pre-filled extension diagnostics and automatic mailto fallback.

## Folder & File Structure
```
page-helper-extension/
├── manifest.json         # Manifest V3 extension configuration (permissions & commands)
├── background.js        # Service worker: AI APIs, hotkeys, context menu, rate limits
├── content.js           # Content script (HUD injection, area selection, modal, hotkey listeners)
├── content.css          # Injected HUD and modal styles (Aubergine & Cream palette)
├── popup.html / .js     # Action toolbar popup for rapid engine switching and quick snip
├── styles.css           # Popup styling
├── options.html / .js   # Full options page for API keys, Ollama setup, and persona presets
├── options.css          # Options page styling
├── session.html / .js   # Session transcript preview and PDF exporter
├── welcome.html         # Onboarding setup guide & operations manual
├── privacy-policy.html  # User privacy policy (GDPR/Chrome Web Store compliant)
├── index.html           # Project landing showcase
├── STORE_LISTING.md     # Web store metadata, descriptions, and permission guides
├── PROJECT_CONTEXT.md   # Master documentation single source of truth
├── AGENT.md             # Developer & agent instructions
├── TODO.md              # Active backlog & task list
├── web/                 # Standalone marketing & installation portal
│   ├── index.html       # Web showcase, interactive demo & install guide
│   ├── styles.css       # Complete design.md responsive stylesheet
│   └── app.js           # Zero-sycophancy simulator & copy helpers
├── lib/
│   └── jspdf.umd.min.js # Standalone jsPDF library for offline PDF generation
└── icons/               # 16, 32, 48, 128px PNG application icons
```

## Environment & Storage Variables
Stored securely in `chrome.storage.local`:
- `activeProvider`: `"groq"` | `"gemini"` | `"openai"` | `"openrouter"` | `"ollama"`
- `groqApiKey`: string (Groq key starting with `gsk_`)
- `geminiApiKey`: string (Google Gemini AI Studio key)
- `openaiApiKey`: string (OpenAI secret key starting with `sk-`)
- `openrouterApiKey`: string (OpenRouter secret key)
- `ollamaEndpoint`: string (default: `"http://localhost:11434"`)
- `ollamaModel`: string (default: `"llama3.2-vision"`)
- `instructionPresets`: array of `{ id, name, text }`
- `activePresetId`: string
- `sessionHistory`: array of session Q&A entries

## Testing & Packaging
1. Open `chrome://extensions` in Developer Mode.
2. Click "Load unpacked" or click the reload icon on "Page Helper AI / Snip & Ask".
3. Test `Alt+S` on any webpage to trigger instant drag-selection snip.
4. Highlight any text and right-click to test *"⚡ Ask AI about selection"*.
