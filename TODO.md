# TODO — DezignSnap

## Completed Tasks ✅
- [x] **Color Hunt Palette Overhaul**: Re-skinned every page, popup, modal, and HUD using the warm slate and cream palette (`#222831`, `#393E46`, `#948979`, `#DFD0B8`).
- [x] **Snip Selection Blur Removal**: Eliminated `backdrop-filter: blur(2px)` on `#ph-select-overlay` so webpage content stays sharp during `Alt+S` / Snip Area.
- [x] **Multi-Engine Support**: Added support for 5 major AI providers:
  - **Groq** (`llama-3.2-11b-vision-preview` - ultra fast vision)
  - **Google Gemini** (`gemini-3.6-flash` / `gemini-2.0-flash`)
  - **OpenAI** (`gpt-4o` multi-modal)
  - **OpenRouter** (unified API access)
  - **Ollama** (Local AI, 100% private, free offline vision via `llama3.2-vision`)
- [x] **Quick Text Ask (Context Menu)**: Added `"contextMenus"` right-click handler: *"⚡ Ask AI about selection"* on any highlighted webpage text.
- [x] **Global Keyboard Shortcuts**: Registered Chrome commands for:
  - `Alt+S`: Instant Area Snip & Ask
  - `Alt+A`: Full visible page capture and analyze
- [x] **Pre-configured Personas & Modes**:
  - General Page Helper
  - Explain Like I'm 5 (ELI5)
  - Roast My UI / Code
  - Target Option Finder
  - Translate & Summarize
  - Bug & Edge Case Hunter
- [x] **Operations Manual & Setup Guide**: Built comprehensive 4-step quick setup and Ollama CORS manual into `welcome.html` and `options.html`.
- [x] **Branded Session PDF Reports**: Client-side A4 report generator with executive slate and taupe typography and embedded thumbnails.
- [x] **Security Hardening**: Enforced `e.isTrusted` checks, attribute escaping, URL scheme validation, and in-flight request debouncing.

## In Progress / Next Up 🔄
- [ ] **Shadow DOM Migration**: Encapsulate injected floating HUD elements into a closed Shadow Root to avoid host page CSS pollution.
- [ ] **Streaming Responses (SSE)**: Stream token-by-token output in the floating panel for perceived zero-latency.

## Suggested Next Steps
1. Test in browser (`chrome://extensions`) in Developer Mode and reload.
2. Verify `Alt+S` shortcut triggers area selection on active tab.
3. Test right-click context menu on highlighted text.
