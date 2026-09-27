# AGENT INSTRUCTIONS — Page Helper AI

## Personality & Communication
- Be concise and direct, no unnecessary explanations.
- Before any major change, briefly state your plan in 1-2 lines.
- After completing a task, update `TODO.md` automatically.

## Project Context (Detected from Code)
- **Project Type**: Client-Side Chrome Extension (Manifest V3) with Vision AI integration.
- **Main Purpose**: Visual AI on-page assistant capturing webpage screenshots or cropped regions and delivering grounded explanations or UI navigation guidance.
- **Integrations in Use**:
  - OpenAI REST API (`api.openai.com/v1/chat/completions` with `gpt-4o`)
  - Google Gemini REST API (`generativelanguage.googleapis.com` with `gemini-3.6-flash`)
  - jsPDF (`lib/jspdf.umd.min.js`) for client-side offline PDF creation
- **Multi-Tenant Pattern**: Client-side single-user isolation via browser extension storage (`chrome.storage.local`). No shared multi-tenant database exists.

## My Tech Preferences (Always Follow These)
- Pure, clean, robust Vanilla JavaScript (ES2022+) and standard HTML5/CSS3.
- When working on fullstack/SaaS extensions or microservices:
  - TypeScript strict mode always
  - Backend: Hono.js on Cloudflare Workers preferred
  - Database: Neon PostgreSQL + Prisma ORM
  - Auth: Clerk
  - Frontend: Next.js + Tailwind + shadcn/ui
  - API responses always: `{ success: boolean, data: any, error: string | null }`
- Always `async`/`await`, never callbacks or `.then()` chains.
- No `console.log` in production code.

## Workflow Rules
- Always read `GEMINI.md` and `TODO.md` before starting any task.
- Never install a new package without telling me first.
- Never modify `.env` or `.env.local` files without confirmation.
- Never touch database migrations without my confirmation.
- If you find a bug while working, note it in `GEMINI.md` under Known Issues.

## Extension & Cloudflare / API Rules
- Always return JSON structures across extension messaging: `{ success: boolean, ... }`.
- Manifest V3 rules: No remote code execution, no `eval()`, no inline event handlers (`onclick="..."`).
- In content scripts, always verify `e.isTrusted === true` on interactive events to prevent host page script clickjacking.
- Encapsulate injected DOM elements cleanly (using Shadow DOM or strict CSS prefixes `ph-`) to prevent host page collisions.
- Keep all API keys in `chrome.storage.local` within the background service worker or options page; never leak API keys to content scripts.

## When Stuck
- Try 2 different approaches yourself first.
- If still stuck, ask with a specific question — not a vague one.
- Never make assumptions about business logic; always ask.

## What NEVER to do
- Don't delete any file without confirming first.
- Don't refactor working code unless asked.
- Don't change folder structure without asking.
- Don't use heavy frameworks when vanilla JS / CSS fulfills the requirement.
- Don't use callbacks or `.then()` chains.
