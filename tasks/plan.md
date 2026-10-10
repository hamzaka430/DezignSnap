# Implementation Plan: Custom Prompts Re-alignment, High-Res Screenshots & Direct Email Support Tickets

## Overview
Address three core enhancements requested by the user:
1. **Custom Prompts & Personas Re-alignment**: Fix misaligned mode names and prompt instructions, and add high-value presets including a Page-by-Page Interactive Task Co-Pilot ("btata jae dekh ke aur kaam krwa de"), Verified MCQ Solver, Visual Bug Hunter, UI/UX Critique, Data Extractor, and Executive Summarizer, plus a 1-click "Restore Presets" action.
2. **Session History & PDF Screenshot Quality**: Eliminate blurriness and pixelation caused by legacy 360px @ 55% JPEG downscaling. Store and render original high-definition screenshots (up to 1600px width @ 92% quality) in both Session History preview and client-side jsPDF exports.
3. **Direct Email Support & Ticket System**: Implement an integrated Support Ticket modal/card in Settings and Popup sending directly to `hamzaka@dezignwise.com` via background API with pre-filled diagnostics and 1-click mailto fallback.

---

## User Review Required

> [!IMPORTANT]
> The default support email configured is **`hamzaka@dezignwise.com`** (the official author and support address declared in `manifest.json`, `STORE_LISTING.md`, and `privacy-policy.html`).
> The ticket form will deliver directly to this inbox.

---

## Architecture & Implementation Decisions

### 1. Personas & Custom Prompts
- **Mismatches Fixed**:
  - `default`: Renamed to *"General Page Helper & Explainer"*. Prompt now cleanly focuses on explaining what is visible, answering the user's specific questions, and pointing out interactive options without mixing in MCQ-specific rules.
  - `task_copilot`: New flagship preset *"Interactive Task Co-Pilot & Workflow Guide"*. Designed specifically for the user's workflow: user states their goal, and on each page/screenshot the AI inspects the UI, confirms current stage, and gives the exact next physical steps (which button to click, field to fill, with exact visual location & color) to get the work done.
  - `quiz_solver`: Dedicated *"Verified Quiz & MCQ Solver (First-Principles)"* with strict zero-sycophancy rules and independent choice verification.
  - `bug_hunter`: *"Visual Bug Hunter & Code Fixer"*.
  - `ui_critique`: *"UI/UX Design Critique & Usability Reviewer"*.
  - `data_extractor`: *"Table & Structured Data Extractor"*.
  - `summarizer`: *"Executive Summarizer & Action Items"*.
  - `eli5`: *"Explain Like I'm 5 (ELI5)"*.
- **Storage Migration**:
  - In `background.js` and `options.js`, detect old/mismatched default presets and update them automatically.
  - Add a "Reset to Defaults" button with confirmation dialog in `options.html` so users can restore all polished presets at any time.

### 2. High-Resolution Screenshot Pipeline for Session History & PDF
- **Root Cause of Degradation**:
  - `makeThumbnail(screenshotDataUrl, maxWidth = 360, quality = 0.55)` in `background.js` previously crushed screenshots down to 360px at 55% JPEG compression.
  - `upsertSessionHistoryFromConv` stripped `conv.screenshotDataUrl` entirely, saving only the tiny 360px thumbnail.
  - When jsPDF stretched that 360px thumbnail to 480pt wide on an A4 page, text became unreadable.
- **Resolution**:
  - Upgrade `makeThumbnail`: Set `maxWidth = 1600` and `quality = 0.92`. If an image is smaller than 1600px (e.g. a cropped snip), maintain 100% of its native dimensions.
  - In `upsertSessionHistoryFromConv`: Store `screenshot: conv.screenshotDataUrl || conv.thumbnail` and `thumbnail: conv.thumbnail`.
  - In `session.js`: Render high-res image directly in the preview and pass to jsPDF with optimal DPI scaling so text and numbers in tables/diagrams are crisp and legible.

### 3. Direct Email Support & Ticket System
- **Integration Points**:
  - A prominent, elegant "Help & Support / Submit Ticket" card in `options.html`.
  - A quick "Support & Help" link in `popup.html` and HUD actions.
- **Form Fields**:
  - Name (optional)
  - Your Email Address (required for reply)
  - Issue Category: *Bug Report*, *Feature Request*, *AI Answer Quality*, *Custom Prompt Help*, *General Inquiry*
  - Subject (required)
  - Description / Message (required)
  - Include System Diagnostics checkbox (includes extension version, active AI engine, platform, screen size)
- **Direct Delivery to `hamzaka@dezignwise.com`**:
  - Asynchronous submission to FormSubmit endpoint (`https://formsubmit.co/ajax/hamzaka@dezignwise.com`).
  - Seamless fallback to formatted `mailto:hamzaka@dezignwise.com?subject=...&body=...` with full details if offline or on network error.
  - 1-click "Copy Ticket Details" button so user has full control.

---

## Task Breakdown

- [ ] **Task 1: Re-align & Expand Custom Prompts & Presets**
  - Update `DEFAULT_PRESETS` in `background.js` and `options.js` with matching names and high-quality prompts.
  - Implement the Task Co-Pilot workflow preset.
  - Add "Reset to Defaults" button and storage sync in `options.html` and `options.js`.
- [ ] **Task 2: Fix Screenshot Quality in Session History & PDF Reports**
  - Update `makeThumbnail` in `background.js` to 1600px @ 0.92 quality.
  - Preserve high-resolution screenshots in `upsertSessionHistoryFromConv`.
  - Verify and optimize rendering in `session.js` and `session.html`.
- [ ] **Task 3: Build Direct Support & Ticket System**
  - Add Support Ticket card and form in `options.html` and `options.css`.
  - Implement ticket submission, system diagnostics generation, FormSubmit AJAX, and mailto fallback in `options.js`.
  - Add Support launcher link in `popup.html`.
- [ ] **Task 4: Comprehensive Verification**
  - Verify JS syntax on all modified files (`content.js`, `background.js`, `options.js`, `popup.js`, `session.js`).
  - Verify preset matching, image resolution in PDF export, and ticket dispatch flow.
