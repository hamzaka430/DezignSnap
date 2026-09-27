# GEMINI.md — DezignSnap

## Project Name & Purpose
- **Name**: DezignSnap
- **Purpose**: A privacy-focused Chrome Extension (Manifest V3) that captures screenshots (full page or user-dragged region) and highlighted text, providing instant, visually grounded AI answers using **Groq (Llama 3.2 Vision)**, **Google Gemini (3.6 Flash)**, **OpenAI (GPT-4o)**, **OpenRouter**, or **Ollama (Local AI)** with Bring-Your-Own-Key (BYOK) architecture.

## Complete Tech Stack
- **Platform**: Google Chrome Extension Manifest V3 (MV3).
- **Core Languages**: Vanilla HTML5, CSS3, ES2022+ JavaScript.
- **Client Libraries**: `jsPDF` (`lib/jspdf.umd.min.js`) for in-browser PDF compilation.
- **External AI Providers & Endpoints**:
  - **Groq**: `https://api.groq.com/openai/v1/chat/completions` (`llama-3.2-11b-vision-preview`)
  - **Google Gemini**: `https://generativelanguage.googleapis.com/v1beta/models` (`gemini-3.6-flash`)
  - **OpenAI**: `https://api.openai.com/v1/chat/completions` (`gpt-4o`)
  - **OpenRouter**: `https://openrouter.ai/api/v1/chat/completions`
  - **Ollama**: `http://localhost:11434/v1/chat/completions` (`llama3.2-vision`)
- **Storage Layer**: `chrome.storage.local` (with `unlimitedStorage` permission).

## Design System & Color Palette
- **Canvas Base / Deep Slate**: `#222831` (RGB: 34, 40, 49)
- **Elevated Surfaces / Slate Charcoal**: `#393E46` (RGB: 57, 62, 70)
- **Subdued Accent / Warm Taupe**: `#948979` (RGB: 148, 137, 121)
- **Primary Interactive / Warm Cream**: `#DFD0B8` (RGB: 223, 208, 184)

## Current Project Status
- ✅ **Color Hunt Palette Redesign**: All pages, popup, floating HUD, and session report styled with `#222831`, `#393E46`, `#948979`, `#DFD0B8`.
- ✅ **Snip Blur Removal**: Area selection overlay (`#ph-select-overlay`) rendered crystal clear with `backdrop-filter: none;`.
- ✅ **Multi-Engine AI Freedom**: Groq, Gemini, OpenAI, OpenRouter, and local Ollama fully integrated.
- ✅ **Global Hotkey Snipping**: `Alt+S` (Area Snip) and `Alt+A` (Full Page Solve) registered via Chrome commands.
- ✅ **Quick Text Ask**: Right-click context menu (*"⚡ Ask AI about selection"*) enabled for highlighted text.
- ✅ **Custom Personas & Modes**: Pre-built modes for ELI5, Roast UI, Target Finder, Translate, and Bug Hunter.
- ✅ **Select Area (Smart Zoom)**: Functional with sub-pixel cropping and 1.4x-2.5x upscale via `OffscreenCanvas`.
- ✅ **Confidence Meter & Tips**: Parses self-reported confidence from LLM responses; renders color-coded badges and tips.
- ✅ **Multi-turn Chat & Follow-ups**: In-memory tab conversation state mapped to persistent session history.
- ✅ **Session History & PDF Export**: Instant client-side generation of formatted A4 reports with embedded thumbnails.
- ✅ **Security Hardened**: Protected against synthetic clickjacking (`e.isTrusted`), attribute injection, and request floods.

## Folder & File Structure
```
page-helper-extension/
├── manifest.json         # Manifest V3 extension configuration (permissions & commands)
├── background.js        # Service worker: AI APIs, hotkeys, context menu, rate limits
├── content.js           # Content script (HUD injection, area selection, modal, hotkey listeners)
├── content.css          # Injected HUD and modal styles (Branded Crimson & Black)
├── popup.html / .js     # Action toolbar popup for rapid engine switching and quick snip
├── styles.css           # Popup styling
├── options.html / .js   # Full options page for API keys, Ollama setup, and persona presets
├── options.css          # Options page styling
├── session.html / .js   # Session transcript preview and PDF exporter
├── welcome.html         # Onboarding setup guide & operations manual
├── privacy-policy.html  # User privacy policy (GDPR/Chrome Web Store compliant)
├── index.html           # Project landing and marketing showcase
├── STORE_LISTING.md     # Web store metadata, descriptions, and permission guides
├── PROJECT_CONTEXT.md   # Master documentation single source of truth
├── AGENT.md             # Developer & agent instructions
├── TODO.md              # Active backlog & task list
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
