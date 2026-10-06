# Task List: Design System Transformation, Ultra-Stealth Edge Dock & Web Portal

## Phase 1: Ultra-Stealth Edge Dock & Auto-Collapse
- [x] Task 1.1: Implement ultra-stealth vertical edge tab and hover expansion in `content.js` and `content.css`.
  - Acceptance: When collapsed, HUD docks flush against screen boundary as a slim vertical line; hovering reveals the expand button.
  - Files: `content.js`, `content.css`
- [x] Task 1.2: Add 1-minute auto-collapse inactivity timer with hover/action reset in `content.js`.
  - Acceptance: If expanded HUD is unused for 60s, it automatically transitions to the sleek edge tab; user activity resets the timer.
  - Files: `content.js`

## Checkpoint: Stealth Dock & Timer
- [x] Collapsed HUD is an ultra-slim vertical line flush with the edge.
- [x] Hover reveals the expand button.
- [x] 1-minute timer auto-collapses unused HUD.

## Phase 2: Extension UI Design System Overhaul
- [x] Task 2.1: Restyle injected HUD and Chat Panel in `content.css` using `design.md` Aubergine and Cream palette.
  - Acceptance: Aubergine `#4a154b` primary, canvas cream `#f4ede4`, canvas lavender `#f9f0ff`, 90px pill buttons, and Inter typography.
  - Files: `content.css`
- [x] Task 2.2: Restyle Extension Action Popup (`styles.css`, `popup.html`).
  - Acceptance: Clean Aubergine header, pill action buttons, and pastel-mesh accents.
  - Files: `styles.css`, `popup.html`
- [x] Task 2.3: Restyle Settings/Options Page (`options.css`, `options.html`, `options.js`).
  - Acceptance: Warm cream cards, Aubergine hero, and pill CTA controls.
  - Files: `options.css`, `options.html`, `options.js`
- [x] Task 2.4: Restyle Session Exporter (`session.html`, `session.js`), Welcome guide (`welcome.html`), and Privacy Policy (`privacy-policy.html`).
  - Acceptance: Unified Aubergine design system across all remaining extension surfaces.
  - Files: `session.html`, `session.js`, `welcome.html`, `privacy-policy.html`

## Checkpoint: Unified Extension Design
- [x] Injected HUD and Chat panel styled in Slack/Aubergine theme.
- [x] Popup, Options, Session report, and Privacy policy share consistent typography, colors, and pill buttons.

## Phase 3: Web Portal Creation (`web/`)
- [x] Task 3.1: Build `web/index.html` structure with Hero, Pastel-Mesh background, features, and install guide.
  - Acceptance: Full marketing page with features, 1-click Chrome Web Store link, installation guide, and FAQ.
  - Files: `web/index.html`
- [x] Task 3.2: Build `web/styles.css` adhering strictly to `design.md` tokens.
  - Acceptance: Inter font, pastel-mesh radial gradient stack, aubergine pill buttons, 16px cards, responsive layout.
  - Files: `web/styles.css`
- [x] Task 3.3: Build `web/app.js` with interactive feature simulator and copy helpers.
  - Acceptance: Interactive tab switcher, quick copy for installation steps, smooth scrolling.
  - Files: `web/app.js`

## Phase 4: Verification & Publish Readiness
- [x] Task 4.1: Run syntax checks across all JS files and test responsiveness.
  - Acceptance: 0 syntax errors, 100% clean CSS and JS.
  - Files: `background.js`, `content.js`, `options.js`, `popup.js`, `session.js`, `web/app.js`
- [x] Task 4.2: Update `PROJECT_CONTEXT.md` and `GEMINI.md`.
  - Acceptance: Documentation updated with design system and web portal details.
  - Files: `PROJECT_CONTEXT.md`, `GEMINI.md`

## Phase 5: Screen-Share Proof Side Panel & Anti-Capture Stealth
- [x] Task 5.1: Implement native Chrome Side Panel (`sidepanel.html`, `sidepanel.js`) for 100% capture-immune tab sharing (`Alt+P`).
- [x] Task 5.2: Implement Screen Share Stealth mode (`Alt+H`) and 0ms panic dismiss (`Escape`).
- [x] Task 5.3: Eliminate CSP violations by removing inline script injection.
- [x] Task 5.4: Package production zip `dezignsnap-v2.1.1.zip` (217 KB) for Chrome Web Store Developer Dashboard.
