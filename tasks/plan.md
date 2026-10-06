# Implementation Plan: Design System Transformation, Ultra-Stealth Edge Dock & Web Portal

## Overview
Implement the complete Slack/Aubergine design language specified in `design.md` across all extension UI surfaces, engineer an ultra-stealth vertical edge-tab dock with auto-collapse after 1 minute, and build a full-featured marketing & installation web portal in `web/`.

## Architecture Decisions
1. **Design System Tokens (`design.md`)**:
   - **Primary Palette**: Aubergine (`#4a154b`), Aubergine Press (`#611f69`), Aubergine Tint (`#592466`).
   - **Canvas & Surfaces**: Canvas White (`#ffffff`), Canvas Cream (`#f4ede4`), Canvas Lavender (`#f9f0ff`), Hairline (`#e6e6e6`).
   - **Text**: Ink (`#1d1d1d`), Ink Mute (`#696969`), On Primary (`#ffffff`), On Aubergine Mute (`#d9bdde`), Link Blue (`#1264a3`).
   - **Atmospheric Backgrounds**: Pastel-mesh gradient stack (peach `#fff0e6` + lavender `#e9d8ff` + dusty green `#e6f4ea` radial gradients).
   - **Components**: Pill buttons (`border-radius: 90px`), cards (`16px` radius with `1px #e6e6e6` border), Inter font stack with tight display tracking (`-0.768px`).

2. **Ultra-Stealth Vertical Edge-Tab & 1-Minute Auto-Collapse (`content.js` & `content.css`)**:
   - When collapsed, replace floating badge with a slim vertical edge sliver (`#ph-hud-edge-tab`) docked flush against the screen boundary (`right: 0` or `left: 0`).
   - On hover over the sliver, smoothly slide out the pill trigger button.
   - **Auto-Collapse Inactivity Timer**: If the expanded toolbar is open on the page with no user interaction for 60 seconds (1 minute), automatically transition it into the sleek edge tab. Any mouse movement over the HUD resets the 60s timer.

3. **Extension UI Surfaces Overhaul**:
   - `content.css`: Floating HUD, Edge Dock, and AI Chat panel in Aubergine, Canvas Lavender, and Cream.
   - `styles.css` & `popup.html`: Quick popup toolbar restyled in Aubergine & Cream.
   - `options.css` & `options.html`: Settings page transformed with Aubergine hero, Cream cards, and pastel-mesh header.
   - `session.html` & `welcome.html`: Session transcript, PDF viewer, and onboarding onboarding guide restyled.
   - `privacy-policy.html`: Clean editorial Aubergine & Cream styling.

4. **Product Marketing & Installation Web Portal (`web/`)**:
   - Create `web/index.html`, `web/styles.css`, and `web/app.js`.
   - Include Hero with pastel-mesh gradient and floating 3:2 product UI mockup.
   - Interactive feature showcase (MCQ First-Principles Solver, Smart Snip, Direct Chat).
   - Step-by-step Installation Guide for official Chrome Web Store.
   - Direct action links, keyboard shortcut cheat-sheet (`Alt+S`, `Alt+A`), FAQ, and Aubergine closing band.

## Task List

### Phase 1: Ultra-Stealth Edge Dock & Auto-Collapse in Content Script
- [ ] Task 1.1: Implement ultra-stealth vertical edge strip and hover expansion in `content.js` and `content.css`.
- [ ] Task 1.2: Add 1-minute auto-collapse timer with activity reset to `content.js`.

### Phase 2: Extension UI Design System Overhaul
- [ ] Task 2.1: Restyle injected HUD and Chat Panel in `content.css` using `design.md` Aubergine and Cream palette.
- [ ] Task 2.2: Restyle Extension Action Popup (`styles.css`, `popup.html`).
- [ ] Task 2.3: Restyle Settings/Options Page (`options.css`, `options.html`).
- [ ] Task 2.4: Restyle Session Exporter, Welcome page, and Privacy Policy.

### Phase 3: Web Portal Creation (`web/`)
- [ ] Task 3.1: Build `web/index.html` structure with Hero, Pastel-Mesh background, features, and install guide.
- [ ] Task 3.2: Build `web/styles.css` adhering strictly to `design.md` tokens.
- [ ] Task 3.3: Build `web/app.js` with interactive feature tabs and copy-command helpers.

### Phase 4: Verification & Publish Readiness
- [ ] Task 4.1: Run syntax validation across all JS files and test responsiveness.
- [ ] Task 4.2: Update `PROJECT_CONTEXT.md` and `GEMINI.md`.
