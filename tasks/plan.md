# Implementation Plan: Color Hunt Palette Migration & Snip Area Blur Fix

Implement the warm slate and cream color palette (`#222831`, `#393E46`, `#948979`, `#DFD0B8`) across all extension UI touchpoints and remove the backdrop blur from the snip selection overlay so the webpage tab stays crystal clear when selecting areas.

## Proposed Architecture & Design Decisions
- **Color Token Mapping**:
  - Base Background / Obsidian: `#222831` (RGB: 34, 40, 49)
  - Card, Container & Elevated Surface: `#393E46` (RGB: 57, 62, 70)
  - Muted Borders, Secondary Accents, Neutral Icons: `#948979` (RGB: 148, 137, 121)
  - Primary Highlight, High-Contrast Text & Primary CTAs: `#DFD0B8` (RGB: 223, 208, 184)
- **Overlay Blur Fix**:
  - Remove `backdrop-filter: blur(2px)` from `#ph-select-overlay` in `content.css`.
  - Use clean `background: rgba(34, 40, 49, 0.42);` and `backdrop-filter: none;` so host webpage content stays crisp and unblurred during area selection.
  - Update `#ph-select-box` to dashed `#DFD0B8` border and subtle `#DFD0B8` warm tint for high visibility.

## Files Touched
1. `content.css` (Overlay blur fix, HUD buttons, modal panel, chat bubbles, follow-up row)
2. `styles.css` (Popup palette update)
3. `options.css` (Settings page, provider grid, code-box, cards)
4. `session.html` & `session.js` (Session preview page styling & PDF report branding colors)
5. `welcome.html` (Onboarding guide styling)
6. `index.html` (Showcase landing page variables & styling)
7. `privacy-policy.html` (Headings & link colors)
8. `options.js` (Status notification styling)
9. `GEMINI.md`, `PROJECT_CONTEXT.md`, `TODO.md` (Update color scheme documentation)

## Verification Plan
- Verify `#ph-select-overlay` has no backdrop blur.
- Inspect all styled elements for color consistency, high contrast (WCAG AA/AAA), and visual polish.
- Verify PDF generation colors in `session.js`.
