# Ultra-Fast Church Agenda Web App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first, ultra-fast, responsive church agenda web application with Bun, SQLite, instant auto-saving, and 1-tap WhatsApp quick-share curation based on the weekly meeting assignment sheet.

**Architecture:** Single Bun server (`server.ts`) with built-in `bun:sqlite` handling sub-millisecond REST queries and serving a lightweight, zero-dependency modern frontend (`index.html`, `style.css`, `app.js`). Edits are optimistic with zero keystroke latency and 400ms debounced auto-save.

**Tech Stack:** Bun, TypeScript, Native `bun:sqlite`, Vanilla HTML5/CSS3/ES6 JavaScript (zero runtime bloat), Web Share API & WhatsApp deep links.

**Spec:** [docs/superpowers/specs/2026-09-12-agenda-app-design.md](file:///c:/Users/arnol/OneDrive/Documents/Github/assignmentschurch/docs/superpowers/specs/2026-09-12-agenda-app-design.md)

## Global Constraints
- Minimal dependencies: Rely on Bun built-ins (`bun:sqlite`, `Bun.serve()`, `bun:test`). Zero external ORM or heavy server frameworks.
- Zero perceived latency: Keystroke changes mutate local state immediately (0ms) and debounce network saves by 400ms.
- Full layout fidelity to original spreadsheet: Date & Sunday rotation, Sacrament meeting talks/prayers/hymns, Sunday School CFM lesson, and Quorums/Auxiliary classes (Elders Quorum, Relief Society, Young Men, Young Women, Primary).
- Mobile-first responsiveness: Thumb-friendly touch targets (>= 44px), works on iOS Safari and Android Chrome, as well as desktop browsers.
- Formatted WhatsApp export: Bold headers (`*...*`), clean bullet points, emojis, and clickable talk/scripture URLs.

---

### Task 1: Project Setup & Core Agenda Utilities

**Files:**
- Create: `package.json`
- Create: `src/agenda-utils.ts`
- Test: `tests/agenda-utils.test.ts`

**Interfaces:**
- Consumes: Standard date calculations.
- Produces:
  - `getSundayOfMonth(date: string): { weekNumber: number, label: string, talkOrder: string }`
  - `createDefaultAgenda(date: string): AgendaRecord`
  - `getNextSunday(dateStr: string): string`
  - `getPrevSunday(dateStr: string): string`

- [ ] **Step 1: Write the failing tests for agenda utilities**
Write unit tests checking Sunday-of-month calculation (1st through 5th Sunday), talks order assignment, and default template generation.

- [ ] **Step 2: Run test to verify it fails**
Run: `bun test tests/agenda-utils.test.ts`
Expected: FAIL (missing module / functions).

- [ ] **Step 3: Implement minimal agenda utilities & package.json**
Create `package.json` with scripts (`dev`, `test`, `start`) and implement `src/agenda-utils.ts` with date parsing, Sunday calculation (1st = Testimonies, 2nd = Elders Quorum, 3rd = Relief Society, 4th = Elders Quorum, 5th = Bishopric), and default agenda generator.

- [ ] **Step 4: Run test to verify it passes**
Run: `bun test tests/agenda-utils.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
Commit changes with descriptive message.

---

### Task 2: Database Layer with Native SQLite (`bun:sqlite`)

**Files:**
- Create: `src/db.ts`
- Test: `tests/db.test.ts`

**Interfaces:**
- Consumes: `createDefaultAgenda` from `src/agenda-utils.ts`.
- Produces:
  - `initDb(dbPath?: string): Database`
  - `getAgendaByDate(db: Database, date: string): AgendaRecord`
  - `saveAgenda(db: Database, agenda: AgendaRecord): void`
  - `getAllSavedSundays(db: Database): string[]`
  - `getAutocompleteSuggestions(db: Database, category: string, query: string): string[]`
  - `exportAllData(db: Database): object`
  - `importAllData(db: Database, data: object): void`

- [ ] **Step 1: Write failing tests for SQLite database operations**
Write unit tests for table creation, upserting an agenda, retrieving default for non-existent Sunday, searching autocomplete suggestions, and JSON export/import.

- [ ] **Step 2: Run test to verify it fails**
Run: `bun test tests/db.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement SQLite database schema and operations**
Implement `src/db.ts` using `bun:sqlite`: create `agendas` and `autocomplete_history` tables with prepared statements for atomic upserts, queries, and seed data matching the 13 September 2026 agenda from the user's image.

- [ ] **Step 4: Run test to verify it passes**
Run: `bun test tests/db.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
Commit changes.

---

### Task 3: WhatsApp Formatter Engine

**Files:**
- Create: `src/whatsapp-formatter.ts`
- Test: `tests/whatsapp-formatter.test.ts`

**Interfaces:**
- Consumes: `AgendaRecord` type from `src/agenda-utils.ts`.
- Produces:
  - `formatFullAgendaWhatsApp(agenda: AgendaRecord): string`
  - `formatSacramentWhatsApp(agenda: AgendaRecord): string`
  - `formatClassesWhatsApp(agenda: AgendaRecord): string`
  - `formatIndividualReminderWhatsApp(roleOrClass: string, name: string, topic: string, date: string): string`
  - `getWhatsAppShareUrl(text: string): string`

- [ ] **Step 1: Write failing tests for WhatsApp formatting**
Test generation of properly structured text with `*bold*`, emojis (⛪, 🎵, 📖, 🙏, 🗣️), URLs, and WhatsApp URI encoding.

- [ ] **Step 2: Run test to verify it fails**
Run: `bun test tests/whatsapp-formatter.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement WhatsApp formatting functions**
Implement all 4 presets and URL builder in `src/whatsapp-formatter.ts`.

- [ ] **Step 4: Run test to verify it passes**
Run: `bun test tests/whatsapp-formatter.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
Commit changes.

---

### Task 4: Bun REST API & Static File Server

**Files:**
- Create: `src/server.ts`
- Test: `tests/server.test.ts`

**Interfaces:**
- Consumes: `initDb`, `getAgendaByDate`, `saveAgenda`, `getAllSavedSundays`, `getAutocompleteSuggestions` from `src/db.ts` and `src/whatsapp-formatter.ts`.
- Produces:
  - HTTP Server running on `http://localhost:3000` (or `PORT` env var).
  - Endpoints: `GET /api/agenda/:date`, `PUT /api/agenda/:date`, `GET /api/sundays`, `GET /api/autocomplete`, `GET /api/share/whatsapp`, `GET /api/export`, `POST /api/import`, and static file serving for `public/`.

- [ ] **Step 1: Write failing integration tests for the API routes**
Write HTTP request tests using `fetch()` against a test instance of `Bun.serve()`.

- [ ] **Step 2: Run test to verify it fails**
Run: `bun test tests/server.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement Bun HTTP server**
Implement `src/server.ts` handling all REST endpoints and serving files from `public/`.

- [ ] **Step 4: Run test to verify it passes**
Run: `bun test tests/server.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
Commit changes.

---

### Task 5: Mobile-First Frontend UI & Design System

**Files:**
- Create: `public/index.html`
- Create: `public/style.css`
- Create: `public/app.js`

**Interfaces:**
- Consumes: REST endpoints `/api/agenda/:date`, `/api/sundays`, `/api/autocomplete`.
- Produces:
  - Responsive, beautiful user interface.
  - Desktop: Dual-card grid mirroring original spreadsheet (Sacrament Meeting, Hymns, Talks Order card, Sunday School, Quorums table).
  - Mobile: Segmented tabs, large touch inputs, sticky WhatsApp button.
  - Optimistic keystroke editing with instant local feedback and debounced server synchronization.
  - WhatsApp Quick-Share modal with 4 presets, live text preview, 1-tap WhatsApp share, and 1-tap copy to clipboard.
  - Print / Bulletin view mode formatted for clean single-page printing.

- [ ] **Step 1: Build semantic HTML structure (`public/index.html`)**
Include header with date picker and navigation buttons, Sacrament section, Hymns card, Talks order banner, 2nd hour classes section, and WhatsApp quick-share modal.

- [ ] **Step 2: Build CSS design system (`public/style.css`)**
Implement variables, responsive grid, card components, dark/light themes, mobile-friendly touch inputs, animation for sync badge, and `@media print` rules for clean paper bulletin printing.

- [ ] **Step 3: Implement reactive client app (`public/app.js`)**
Implement state management, debounced auto-saving (400ms), optimistic UI, Sunday date navigation, autocomplete suggestions, WhatsApp text generator with live preview and clipboard copy, and print handler.

- [ ] **Step 4: Verify in browser**
Run the server and verify all interactions: editing fields, switching dates, generating WhatsApp text, switching themes, and mobile layout.

- [ ] **Step 5: Commit**
Commit changes.

---

### Task 6: End-to-End Verification & Initial Seed Data

**Files:**
- Modify: `src/db.ts` (Ensure seed data from 13 September 2026 is loaded on first start)
- Test: Full end-to-end verification via automated tests and manual inspection.

- [ ] **Step 1: Seed data from image**
Seed initial values: "13 September 2026", "1st Sunday", Talks ("A New Normal", "Sacrifice (Gospel Principles)"), Sunday School topic ("Proverbs 1-4; Ecclesiastes 1-3"), Quorum topic ("Watch Ye Therefore, and Pray Always", Teacher: "Sahitya").

- [ ] **Step 2: Run complete test suite**
Run: `bun test`
Verify all unit, database, and integration tests pass.

- [ ] **Step 3: Test WhatsApp share flow & mobile responsiveness**
Verify WhatsApp message curation and deep-link generation for all 4 presets.

- [ ] **Step 4: Final commit**
Commit final touches.
