# TODO — DezignSnap

## Completed Tasks ✅
- [x] **Color Hunt Palette Overhaul**: Re-skinned every page, popup, modal, and HUD using the warm slate and cream palette (`#222831`, `#393E46`, `#948979`, `#DFD0B8`).
- [x] **Snip Selection Blur Removal**: Eliminated `backdrop-filter: blur(2px)` on `#ph-select-overlay` so webpage content stays sharp during `Alt+S` / Snip Area.
- [x] **Multi-Engine Support & Groq Upgrade**: Added support for 5 major AI providers:
  - **Groq** (`qwen/qwen3.8-27b` multimodal vision + `llama-3.3-70b-versatile` text — fixed decommissioned 400 error)
  - **Google Gemini** (`gemini-2.5-flash` with resilient multi-tier fallback and dynamic ModelService auto-discovery)
  - **OpenAI** (`gpt-4o` multi-modal)
  - **OpenRouter** (unified API access)
  - **Ollama** (Local AI, 100% private, free offline vision via `llama3.2-vision`)
- [x] **Collapsible & Expandable Floating HUD**: Added collapse (`✕`) to sleek mini-pill and expand (`⚡ DezignSnap [+]`) toggle that syncs across web pages.
- [x] **Horizontal HUD & Panel Positioning**: Support `Left`, `Center`, and `Right` positioning modes with 1-click on-toolbar cycling (`⇋`) and settings dropdowns.
- [x] **Direct AI Chat (No Screenshot Needed)**: Launch fast text Q&A directly without taking screenshots or selecting personas.
- [x] **AI Reasoning Modes (Direct Answer vs. Deep Thinking)**: Gemini-style deep reasoning accordion (`<details>`) alongside ultra-fast direct answer mode.
- [x] **Strict Viewport Bounding & Smooth History Scroll**: Floating chat panel never spills out of the window; past messages scroll cleanly.
- [x] **Original Quality Screenshot Preservation**: Uncompressed high-res snapshots stored for crystal-clear PDF exports and session reviews.
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
- [x] **Branded Session PDF Reports**: Client-side A4 report generator with executive slate and taupe typography and embedded high-res screenshots.
- [x] **Security Hardening**: Enforced `e.isTrusted` checks, attribute escaping, URL scheme validation, and in-flight request debouncing.

## In Progress / Next Up 🔄
- [ ] **Shadow DOM Migration**: Encapsulate injected floating HUD elements into a closed Shadow Root to avoid host page CSS pollution.
- [ ] **Streaming Responses (SSE)**: Stream token-by-token output in the floating panel for perceived zero-latency.

## Suggested Next Steps
1. Test in browser (`chrome://extensions`) in Developer Mode and reload.
2. Verify `Alt+S` shortcut triggers area selection on active tab.
3. Test right-click context menu on highlighted text.
