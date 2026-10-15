# AI Engineering Workflow Note 🤖⚡

This document outlines the AI-assisted engineering methodology, decision-making framework, and tooling pipeline used to design, build, test, and prepare **Ajaia Docs** for production in **under 4 hours**.

---

## 1. Executive Summary & Context

- **Assessment Goal**: Build a production-quality, collaborative rich-text document engine featuring role-based access control (RBAC), persona simulation, auto-saving, file ingestion, and automated testing.
- **Time Constraint**: Senior engineering take-home assignment strictly scoped to **< 4 hours**.
- **AI Toolchain**:
  - **Strategic Reasoning & Scoping**: Google Gemini **Argon** (via Gemini Pro subscription).
  - **Full-Stack Autonomous Execution**: **Google Antigravity** powered by **Gemini 3.8 Flash (High)**.
  - **Refinement & Testing**: Interactive pair programming with Antigravity for bug fixes, edge cases, and Vitest suite verification.

---

## 2. Phase 1: High-Level Scoping & Strategic Tradeoffs with Gemini Argon

To deliver a production-ready application within 4 hours, scoping discipline was paramount. The newly released **Gemini Argon** model (accessible in the Gemini Pro web app) was leveraged as the strategic architect to analyze requirements and determine what to prioritize and what to consciously defer.

### Strategic Decisions Reached with Argon:

```
┌────────────────────────────────────────────────────────┐
│                   Scoping Filter                       │
│        (Target: <4 Hours Total Execution Time)         │
├────────────────────────────┬───────────────────────────┤
│    ✅ MUST BUILD (P0)      │   ⛔ EXPLICITLY DROP (P2) │
├────────────────────────────┼───────────────────────────┤
│ • Production Next.js 14    │ • Complex WebSocket/CRDT  │
│   App Router architecture  │   multiplayer sync        │
│ • Tiptap / ProseMirror     │   (Risk: race conditions, │
│   rich-text editor         │    debugging overhead)    │
│ • SQLite (`better-sqlite3`)│ • Heavy external database │
│   with WAL mode            │   (Postgres/Docker/RDS)   │
│ • Granular RBAC            │ • 3rd-party Auth providers│
│   (Owner, Editor, Viewer)  │   (Clerk/Auth0 - reduces  │
│ • Instant Persona Switcher │    reviewer eval friction)│
│ • 800ms Debounced Save     │ • Complex media storage   │
│ • 2MB MD/TXT Ingestion     │   (Direct S3 uploads)     │
│ • 100% Vitest coverage     │                           │
└────────────────────────────┴───────────────────────────┘
```

#### Key Architectural Rationales:
1. **Embedded SQLite over External DB**: By choosing `better-sqlite3` with WAL mode, the application delivers zero-latency synchronous execution, requires zero external services or Docker setup, and initializes/seeds itself automatically on first launch.
2. **Deterministic Persona Switching over 3rd-Party Auth**: Third-party auth (e.g. Clerk, Auth0) introduces external dependencies, API keys, and credential hurdles for reviewers. A simulated session system passing `x-user-id` with a persistent topbar switcher enables reviewers to test RBAC transitions in seconds without logging in and out.
3. **Debounced HTTP Mutation over CRDTs**: Building a robust CRDT sync engine (Yjs/WebSocket) in under 4 hours introduces significant fragility and edge-case debt. A resilient 800ms debounced save pipeline with clear visual state indicators (`Saving...`, `Saved at HH:MM:SS`, `Unsaved changes`) delivers an identical UX feel with 100% reliability.

---

## 3. Phase 2: Master Prompt Synthesis

Following the Argon strategy session, a high-density, structured master prompt was authored to command the agentic workflow in **Google Antigravity**:

```markdown
### Master Prompt Structure:
1. Tech Stack Definition: Next.js 14 App Router, TypeScript, Tailwind CSS, Tiptap, SQLite (better-sqlite3), Vitest.
2. Schema & DB Initialization: Auto-migrating tables for users, documents, and document_shares with foreign keys and seed data.
3. RBAC Policy Enforcement: Detailed permission rules for Owners (full control), Editors (read/write content/title), Viewers (read-only, 403 on mutations).
4. Persona Switcher Contract: Persistent topbar selector sending `x-user-id` header on all API calls.
5. Ingestion Engine: 2MB limit validation, Markdown to semantic HTML parser, and raw text chunking.
6. Modern UI Aesthetics: Professional slate/indigo palette, clean typography, responsive layout, toast feedback.
7. Automated Tests: Vitest suite covering permissions, mutations, sharing, and validation against isolated temp DBs.
```

---

## 4. Phase 3: Autonomous Generation with Gemini 3.8 Flash (High)

The master prompt was executed in **Google Antigravity** using **Gemini 3.8 Flash (High)**. 

### Generation Capabilities Observed:
- **Single-Prompt Scaffold**: The entire full-stack application (frontend components, API routes, database layer, utility parsers, styling, and test runner) was scaffolded in a single coordinated run.
- **Strict Type Safety**: TypeScript interfaces (`DocumentWithRole`, `User`, `SharePermission`) were maintained across both the client and server boundaries.
- **Zero Hallucinated Dependencies**: Clean selection of standard packages (`@tiptap/react`, `@tiptap/starter-kit`, `better-sqlite3`, `lucide-react`).

---

## 5. Phase 4: Agentic Refinement & Bug Fixing

Once the core foundation was generated, an interactive refinement cycle was conducted to verify edge cases and resolve any minor bugs:

1. **Auto-Save Debounce Tuning**: Refined the debouncing hook to ensure that typing rapidly did not trigger intermediate saves, while ensuring that clicking "Save" immediately flushes the buffer.
2. **Viewer Mode Lockdown**: Ensured Tiptap editor is set to `editable: false` for viewers, with an amber banner informing the user of their read-only status and disabling the editing toolbar.
3. **File Ingestion Error Handling**: Added explicit client-side and server-side checks for file size (>2MB) and file extension (`.txt`, `.md`), rendering dismissible error banners rather than silent failures.
4. **Vitest Isolation**: Updated the test runner to spin up isolated SQLite instances per test run, guaranteeing test idempotency and zero database lock contention. All 19 tests pass in <700ms.
5. **Next.js Production Build Validation**: Ran `npm run build` to confirm zero lint errors, proper static route optimization, and clean bundle generation.

---

## 6. Phase 5: Production Deployment Strategy

- **Target Domain**: `https://ajaia-assesment.owaisiqbal.dev`
- **Reverse Proxy**: Caddy reverse proxy on a Linux virtual machine configured with automatic Let's Encrypt TLS/SSL.
- **Process Management**: Systemd or PM2 managing the Node.js Next.js server on port 3000.
- **Git Repository**: Initialized clean git tracking, excluded junk data and runtime SQLite databases, and linked to remote:
  `https://github.com/owais-star/ajaia-assesment`

---

## 7. Productivity Impact & Takeaways

| Metric | Traditional Manual Development | AI-Assisted (Argon + Gemini 3.8 Flash) |
| :--- | :--- | :--- |
| **Architectural Scoping** | 1 – 2 hours | ~15 minutes |
| **Boilerplate & Foundation** | 2 – 3 hours | ~10 minutes |
| **RBAC & API Handlers** | 2 – 3 hours | ~20 minutes |
| **Editor Integration** | 2 – 3 hours | ~25 minutes |
| **Test Suite Development** | 1 – 2 hours | ~15 minutes |
| **Total Wall-Clock Time** | **8 – 13 hours (2 days)** | **< 2.5 hours total** |

### Core Takeaway
Pairing a high-capacity reasoning model (**Gemini Argon**) for architectural strategy with a rapid, context-aware execution model (**Gemini 3.8 Flash High** in Google Antigravity) produces a compounding multiplier: the reasoning model prevents over-engineering and scope creep, while the agentic model eliminates mechanical coding overhead. The result is a clean, well-tested, production-ready codebase delivered well within assessment time limits.
