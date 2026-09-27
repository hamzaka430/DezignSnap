# Chrome Web Store — Submission Checklist

## 1. Before you submit

- [x] Publish date (September 2026) and contact email (`hamzaka@dezignwise.com`) configured in `privacy-policy.html`.
- [ ] Host `privacy-policy.html` on a public URL (e.g., `https://dezignwise.com/privacy-policy` or GitHub Pages) — Chrome Web Store requires a public URL.
- [x] Updated `manifest.json` → added `"author": "Muhammad Hamza / Dezignwise"` and `"homepage_url": "https://dezignwise.com"`.
- [ ] Take real screenshots (1280x800 or 640x400) showing: the floating buttons on a real page, the answer panel open, the Settings page, and the session PDF export. (You can use the mockup style shown earlier as a visual reference.)
- [ ] Test the packed extension (zip the folder, or use "Pack extension" in `chrome://extensions`) before upload.
- [ ] Create a Chrome Web Store developer account (one-time $5 registration fee) at https://chrome.google.com/webstore/devconsole.

## 2. Suggested listing copy

**Name** (max 45 chars): `DezignSnap — AI Screen Assistant`

**Short description** (max 132 chars):
`Snip any webpage area or screen for instant, grounded AI visual answers. Powered by Groq, Gemini, OpenAI, & local Ollama.`

**Category:** Productivity

**Detailed description** (draft — edit freely):

> DezignSnap adds an intelligent visual copilot to your browser. Snip any webpage region (Alt+S) or capture the full screen to get instant, grounded AI answers powered by Groq (Llama 3.2 Vision), Google Gemini (3.6 Flash), OpenAI (GPT-4o), OpenRouter, or private local Ollama.
>
> Features:
> - Global hotkey: Alt+S for instant drag-selection snip & zoom
> - One-click "⚡ Snip & Ask" button on any page
> - Right-click context menu ("⚡ Ask AI about selection") for quick text queries
> - Choose from 5 engines: Groq, Gemini, OpenAI, OpenRouter, or local Ollama
> - Smart Zoom upscale (1.4x–2.5x) for crystal-clear small text and icon recognition
> - Custom personas (ELI5, Roast My UI, Target Finder, Translate)
> - Complete session transcript export to clean A4 PDF with thumbnails
> - Bring Your Own Key (BYOK) — zero middleman servers; direct browser-to-AI privacy
> - "End Session" button exports your whole Q&A history as a PDF, including screenshot thumbnails
> - Works even on sites that block content scripts, via the toolbar popup fallback
> - Built-in detection for DRM-protected/black screenshots so you know when an answer might be unreliable
> - You bring your own OpenAI or Gemini API key — no data passes through any server we operate
>
> **Note:** this tool is intended for understanding page content and finding UI options — not for use in
> exams, quizzes, or other assessments where independent work is expected.

## 3. Permission justifications (paste into the "Permission justification" fields in the developer dashboard)

| Permission | Justification |
|---|---|
| `storage` | Save the user's API key, instruction presets, and local session history. |
| `activeTab` | Let the toolbar popup capture a screenshot of the tab the user is currently viewing, only when they interact with the popup. |
| `unlimitedStorage` | Screenshot thumbnails stored in session history can exceed the default storage quota over a long session. |
| `host_permissions: <all_urls>` | The on-page "Solve with AI" / "End Session" buttons must be injected on any site the user visits, and the screenshot capture triggered from that button is not a toolbar-initiated action, so `activeTab` alone cannot authorize it. |
| `host_permissions: https://api.openai.com/*` and `https://generativelanguage.googleapis.com/*` | Required to call OpenAI's and Google Gemini's APIs directly from the browser using the user's own key for whichever provider they select. |

Chrome's review team scrutinizes `<all_urls>` requests closely — being ready to explain this (as above) speeds up review.

## 4. Known review risks to be aware of

- Extensions that use a **remote AI API with a user-supplied key** are generally fine, but reviewers may ask
  you to clarify data flow — the Privacy Policy page in this repo is written to answer that directly.
- `<all_urls>` + content scripts on every page is a "broad host permission" — if review pushes back, consider
  offering an **optional permissions** flow (user grants per-site access via a button) as a v2 improvement.
- Make sure the extension **does absolutely nothing** without the user's explicit action (no auto screenshots)
  — this build already satisfies that (screenshots only happen on button click).
