# Implementation Plan: DezignSnap Brand Assets & Gemini Model 404 Fix

## Overview
1. Integrate the new brand assets from `brand_assests/` (`icon16.png`, `icon32.png`, `icon48.png`, `icon128.png`, and `dezignsnap-logo.png`) into `icons/` and UI surfaces (`manifest.json`, `popup.html`, `options.html`, `welcome.html`, `session.html`, `index.html`).
2. Fix the Gemini 404 error (`models/gemini-1.5-flash is not found for API version v1beta`) by upgrading default models to `gemini-2.5-flash` and implementing an intelligent auto-discovery fallback mechanism that queries `v1beta/models` if a 404 occurs, ensuring future-proof reliability.
3. Update documentation and UI labels across the extension.

## Architecture Decisions
1. **Brand Assets Integration**:
   - Replace old low-resolution placeholder icons in `icons/` with the high-resolution branded icons from `brand_assests/`:
     - `icon16.png` (16x16)
     - `icon32.png` (32x32)
     - `icon48.png` (48x48)
     - `icon128.png` (128x128)
     - `dezignsnap-logo.png` (brand logo banner)
   - Add `dezignsnap-logo.png` to `icons/` and display it in `session.html` header, `options.html` header, and `welcome.html`.
2. **Gemini Model 404 Fix**:
   - Update default Gemini model in `background.js` from `gemini-2.0-flash` (shut down in 2026) to `gemini-2.5-flash`.
   - Remove obsolete fallback to `gemini-1.5-flash` (also deprecated/shut down).
   - Implement an intelligent auto-fallback:
     - Primary model: configured model or `gemini-2.5-flash`.
     - Secondary fallback: `gemini-3.5-flash`.
     - If both return 404, call `https://generativelanguage.googleapis.com/v1beta/models?key=...` via `fetch` to retrieve the current active list of models supporting `generateContent` and pick the best available Flash model automatically.
   - Add a Gemini model selection / override field in `options.html` and `options.js` so users can easily select or type newer models (e.g. `gemini-2.5-flash`, `gemini-3.5-flash`, `gemini-3.8-flash`).
3. **UI and Documentation Sync**:
   - Update `popup.html` and `options.html` engine labels to reflect the current Gemini models.
   - Update `GEMINI.md`, `PROJECT_CONTEXT.md`, `README.md`, `STORE_LISTING.md`, and `TODO.md`.

## Task List

### Phase 1: Brand Assets Integration
- [ ] Task 1.1: Copy new icons and logo from `brand_assests/` into `icons/`.
- [ ] Task 1.2: Update UI pages (`options.html`, `welcome.html`, `session.html`, `popup.html`, `index.html`) to display the new brand icons and logo banner.

### Checkpoint: Brand Assets
- [ ] All icon files in `icons/` updated and verified.
- [ ] UI headers and logos render sharply with correct aspect ratio.

### Phase 2: Gemini 404 Model Resolution & Resilient Fallback
- [ ] Task 2.1: Update Gemini configuration in `background.js` with `gemini-2.5-flash` default model and dynamic model discovery fallback.
- [ ] Task 2.2: Add Gemini model configuration support in `options.html` and `options.js`.
- [ ] Task 2.3: Update engine badges and labels in `popup.html` and `options.html`.

### Checkpoint: Gemini Integration
- [ ] Gemini API call targets active supported models.
- [ ] Fallback logic gracefully resolves valid models on 404 instead of crashing on `gemini-1.5-flash`.

### Phase 3: Documentation & Verification
- [ ] Task 3.1: Update documentation files (`GEMINI.md`, `PROJECT_CONTEXT.md`, `README.md`, `STORE_LISTING.md`, `TODO.md`).
- [ ] Task 3.2: Run git status, file verification, and end-to-end check.
