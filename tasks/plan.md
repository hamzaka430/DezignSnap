# Implementation Plan: Repository Architecture & Directory Reorganization

## Overview
Organize the DezignSnap repository into a modular, industry-standard structure (Option A: Full Clean Separation). 
Currently, 26 loose files and 8 directories sit flat in the repository root, mixing extension runtime files, documentation, release archives, build scripts, web files, and duplicate asset folders. This refactor cleanly isolates each subsystem into its own dedicated directory while ensuring 100% runtime integrity for the Chrome Extension and the GitHub Pages deployment.

---

## Target Architecture

```
page-helper-extension/
├── extension/             # Standalone Chrome Extension Manifest V3 (Load this in chrome://extensions)
│   ├── manifest.json      # Extension manifest
│   ├── background.js      # Background service worker
│   ├── content.js         # Content script
│   ├── content.css        # Injected HUD & modal styling
│   ├── popup.html / .js   # Action toolbar popup
│   ├── styles.css         # Popup stylesheet
│   ├── options.html / .js # Options & API settings page
│   ├── options.css        # Options stylesheet
│   ├── session.html / .js # Session transcript & export preview
│   ├── welcome.html       # Onboarding manual & operations guide
│   ├── privacy-policy.html# Extension privacy policy
│   ├── icons/             # 16, 32, 48, 128px PNGs + logo
│   ├── assests/           # Vector branding SVGs used by UI
│   └── lib/               # Standalone jsPDF library
├── web/                   # Standalone Web Showcase & Landing Portal (GitHub Pages)
│   ├── index.html
│   ├── styles.css
│   ├── app.js
│   ├── privacy-policy.html
│   ├── google06dbbd3fb24702e7.html
│   ├── CNAME
│   ├── icons/
│   └── assests/
├── docs/                  # Documentation Hub
│   ├── PROJECT_CONTEXT.md # Master context & architecture
│   ├── STORE_LISTING.md   # Chrome Web Store submission copy
│   ├── design.md          # Aubergine & cream design tokens
│   └── TODO.md            # Feature history & publish checklist
├── dist/                  # Packaged Release Archives
│   └── dezignsnap-v2.1.1.zip
├── scripts/               # Automation & Build Tooling
│   └── build-zip.ps1      # 1-click extension packager (outputs to dist/)
├── tasks/                 # Task Planning & Workflows
│   ├── plan.md
│   └── todo.md
├── .github/workflows/     # CI/CD Workflows
│   └── deploy-pages.yml
├── .gitignore
├── CNAME
├── index.html             # Root redirect to web/
└── README.md              # Repository overview & setup guide
```

---

## User Review Required

> [!IMPORTANT]
> Once reorganized, when loading the extension in Chrome via `chrome://extensions` &rarr; **"Load unpacked"**, select the **`extension/`** folder instead of the repository root.

---

## Task List

### Phase 1: Directory Setup & Extension Migration
- [ ] Task 1: Create `extension/`, `docs/`, `dist/`, and `scripts/` directories
- [ ] Task 2: Move Chrome extension runtime files (`manifest.json`, `background.js`, `content.*`, `popup.*`, `options.*`, `session.*`, `welcome.html`, `privacy-policy.html`, `icons/`, `assests/`, `lib/`) into `extension/` via `git mv`
- [ ] Task 3: Verify extension internal relative path references and syntax with `node -c`

### Phase 2: Documentation, Scripts & Dist Migration
- [ ] Task 4: Move non-root documentation (`STORE_LISTING.md`, `PROJECT_CONTEXT.md`, `design.md`, `TODO.md`) into `docs/` via `git mv`
- [ ] Task 5: Move `build-zip.ps1` into `scripts/` and update it to package `extension/` into `dist/`
- [ ] Task 6: Move `dezignsnap-v2.1.1.zip` into `dist/` via `git mv`
- [ ] Task 7: Remove redundant `brand_assests/` (exact duplicate of `icons/`)

### Phase 3: Build Verification & Documentation Update
- [ ] Task 8: Test `scripts/build-zip.ps1` to ensure new zip generation into `dist/` succeeds
- [ ] Task 9: Update root `README.md` and `GEMINI.md` to document the new structure and "Load unpacked" instructions
- [ ] Task 10: Commit changes following `git-workflow-and-versioning` conventions
