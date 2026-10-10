# Task List: Custom Prompts Re-alignment, High-Res Screenshots & Direct Email Support Tickets

## Completed Tasks
- [x] Task 1: Re-align & Expand Custom Prompts & Presets
  - [x] Update `DEFAULT_PRESETS` in `background.js` and `options.js` with matching names and prompts
  - [x] Add new flagship "Interactive Task Co-Pilot & Workflow Guide" preset
  - [x] Add Verified MCQ Solver, Visual Bug Hunter, UI/UX Critique, Data Extractor, and Executive Summarizer presets
  - [x] Add automatic migration for existing stored presets to update mismatched names and prompts
  - [x] Add "Restore Defaults" button in `options.html` and `options.js`
- [x] Task 2: Fix Screenshot Quality in Session History & PDF Reports
  - [x] Update `makeThumbnail` in `background.js` to preserve high-res (up to 1600px width @ 0.92 quality)
  - [x] Update `upsertSessionHistoryFromConv` in `background.js` to store full-clarity screenshots
  - [x] Ensure `session.js` and `session.html` render the high-res screenshot, zoom capability, and scale cleanly into jsPDF
- [x] Task 3: Build Direct Support & Ticket System
  - [x] Add Help & Support Ticket section in `options.html`
  - [x] Style ticket form in `options.css` (neutral balanced design system)
  - [x] Add ticket dispatch logic in `options.js` (FormSubmit API to `hamzaka@dezignwise.com` + mailto fallback + diagnostics)
  - [x] Add Support quick link in `popup.html` and `popup.js`
- [x] Task 4: Comprehensive Verification & Quality Assurance
  - [x] Run syntax check (`node -c background.js options.js popup.js session.js content.js` — exit 0)
  - [x] Verify preset selection, editing, and default restoration
  - [x] Verify PDF image clarity and ticket dispatch mechanics
