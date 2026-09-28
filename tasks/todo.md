# Task List: DezignSnap Brand Assets & Gemini Model 404 Fix

## Phase 1: Brand Assets Integration
- [x] Task 1.1: Copy new icons and logo from `brand_assests/` into `icons/`.
  - Acceptance: `icons/icon16.png`, `icon32.png`, `icon48.png`, `icon128.png`, and `dezignsnap-logo.png` exist and match the high-resolution brand assets.
  - Verify: Check file sizes and dimensions.
  - Files: `icons/*`, `brand_assests/*`
- [x] Task 1.2: Update UI pages (`options.html`, `welcome.html`, `session.html`, `popup.html`, `index.html`) to display the new brand assets.
  - Acceptance: Brand logo and icons are cleanly displayed with appropriate styling and responsive scaling.
  - Verify: Check image tags and visual rendering across pages.
  - Files: `options.html`, `welcome.html`, `session.html`, `popup.html`, `index.html`

## Checkpoint: Brand Assets
- [x] All icon files in `icons/` updated and verified.
- [x] UI headers and logos render sharply.

## Phase 2: Gemini 404 Model Resolution & Resilient Fallback
- [x] Task 2.1: Update Gemini configuration in `background.js` with `gemini-2.5-flash` default model and dynamic model discovery fallback.
  - Acceptance: Service worker defaults to `gemini-2.5-flash`. If any 404 is encountered, queries `v1beta/models` to discover active models supporting `generateContent` or falls back to `gemini-3.5-flash`.
  - Verify: Inspect request URL and error handling branches in `background.js`.
  - Files: `background.js`
- [x] Task 2.2: Add Gemini model selection / custom model configuration support in `options.html` and `options.js`.
  - Acceptance: User can view or select/customize the Gemini model from settings.
  - Verify: Test saving and loading `geminiModel` in `options.js`.
  - Files: `options.html`, `options.js`
- [x] Task 2.3: Update engine badges and labels in `popup.html` and `options.html`.
  - Acceptance: Provider cards and dropdowns display modern Gemini branding (e.g. `✨ Gemini 2.5 Flash`).
  - Verify: Check popup and options HTML markup.
  - Files: `popup.html`, `options.html`

## Checkpoint: Gemini Integration
- [x] Gemini API call targets active supported models.
- [x] Fallback logic gracefully resolves valid models on 404.

## Phase 3: Documentation & Verification
- [x] Task 3.1: Update documentation files (`GEMINI.md`, `PROJECT_CONTEXT.md`, `README.md`, `STORE_LISTING.md`, `TODO.md`, `AGENT.md`).
  - Acceptance: All docs reflect the new brand assets and updated Gemini model information.
  - Verify: Search for outdated model names across documentation.
  - Files: `GEMINI.md`, `PROJECT_CONTEXT.md`, `README.md`, `STORE_LISTING.md`, `TODO.md`, `AGENT.md`
- [x] Task 3.2: Run git status, file verification, and end-to-end check.
  - Acceptance: Clean state, all changes verified without broken links or missing assets; node --check passed.
