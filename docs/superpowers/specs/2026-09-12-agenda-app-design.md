# Ultra-Fast Church Agenda Application Design Spec

**Date:** 2026-09-12  
**Status:** Approved  
**Target:** Church Sunday Agenda Management, Fast Editing, Mobile-First PWA, and WhatsApp Quick-Share

---

## 1. Overview & Goals

The Church Agenda Application transforms the weekly assignment and agenda spreadsheet into an ultra-fast, responsive web application. It enables ward leaders (bishopric, clerks, auxiliary presidencies) to easily manage, edit, and share weekly Sunday meeting programs on mobile phones, tablets, and desktop computers with sub-millisecond response times.

### 1.1 Goals
- **Ultra Fast Performance:** Zero keystroke lag (optimistic UI state), sub-millisecond database queries via Bun's built-in SQLite, and instantaneous cold-boot (< 10ms).
- **Exact Layout & Content Parity:** Preserves and organizes all sections from the agenda spreadsheet:
  - Header: Date and automatic Sunday of the month detection (1st to 5th Sunday).
  - Sacrament Meeting Program: Prayers, 3 Talks with organization labels and talk topic links, and 4 Hymns (Opening, Sacrament, Interlude, Closing).
  - Talks Order Reference: Dynamic tracker highlighting monthly talk rotation (1st Sunday Testimonies, 2nd Sunday Elders Quorum, 3rd Sunday Relief Society, 4th Sunday Elders Quorum, 5th Sunday Bishopric).
  - 2nd Hour Classes (25 min each): Sunday School (CFM reading & teacher) and Quorums / Auxiliaries (Elders Quorum, Relief Society, Young Men, Young Women, Primary with lesson topics, links, and teachers).
- **Mobile-First & Browser-First UX:** Fully optimized for iOS and Android devices with thumb-friendly controls (>= 44px touch targets), as well as a clean desktop dual-column grid.
- **WhatsApp Quick-Share Engine:** 1-tap generation and sharing of curated, formatted WhatsApp messages (`*bold*`, emojis, clickable URLs) for the full agenda, sacrament program, classes only, and personalized speaker/teacher reminders.
- **Printable 1-Page Bulletin:** Clean printable layout without web UI buttons.
- **Lightweight Architecture:** Minimal disk footprint and zero external database overhead using Bun.

### 1.2 Non-Goals
- Paid WhatsApp Cloud API webhooks or external bot subscriptions (replaced with frictionless 1-tap WhatsApp deep links and Web Share API).
- Complex user authentication and role management (optimized for single-ward simplicity and speed, with optional local network access).

---

## 2. Architecture & Technology Stack

```
+-------------------------------------------------------------+
|                      Client Browser                         |
|  (Mobile Safari / Chrome Android / Desktop Web Browser)     |
|                                                             |
|  - Optimistic Local UI State (0ms perceived lag)            |
|  - Debounced Auto-Saver (400ms delay)                       |
|  - WhatsApp Quick-Share & Clipboard Formatter               |
|  - Printable Program Mode                                   |
|  - LocalStorage Offline Cache                               |
+------------------------------+------------------------------+
                               | REST (JSON)
                               v
+-------------------------------------------------------------+
|                 Bun HTTP Server (server.ts)                 |
|                                                             |
|  - Native Bun.serve() (Sub-5ms startup, low memory)         |
|  - Static Asset Delivery (HTML, CSS, Vanilla JS / Bundle)   |
|  - REST Endpoints (/api/agenda/:date, /api/sundays, etc.)   |
+------------------------------+------------------------------+
                               | Direct C++ binding (< 0.2ms)
                               v
+-------------------------------------------------------------+
|               Native SQLite Engine (bun:sqlite)             |
|                         agenda.db                           |
+-------------------------------------------------------------+
```

### 2.1 Technology Choices
* **Runtime:** **Bun** (fastest JavaScript runtime, built-in SQLite, native TypeScript support, < 30MB RAM footprint).
* **Backend:** Single-file `server.ts` utilizing `Bun.serve()` with zero heavy framework bloat.
* **Database:** Native `bun:sqlite` with `agenda.db` stored in project root.
* **Frontend:** Ultra-responsive modern web application with pure CSS design system (custom variables, responsive grid/flexbox, dark & light themes, zero CSS-in-JS runtime overhead).

---

## 3. Data Model & Database Schema

### 3.1 `agendas` Table
Stores Sunday agendas indexed by ISO date string (`YYYY-MM-DD`).

```sql
CREATE TABLE IF NOT EXISTS agendas (
  date TEXT PRIMARY KEY,
  week_label TEXT,
  opening_prayer_role TEXT DEFAULT 'Brother',
  opening_prayer_name TEXT DEFAULT '',
  talk1_title TEXT DEFAULT '',
  talk1_speaker TEXT DEFAULT '',
  talk2_org TEXT DEFAULT 'Elders Quorum',
  talk2_title TEXT DEFAULT '',
  talk2_url TEXT DEFAULT '',
  talk2_speaker TEXT DEFAULT '',
  talk3_title TEXT DEFAULT '',
  talk3_url TEXT DEFAULT '',
  talk3_speaker TEXT DEFAULT '',
  closing_prayer_role TEXT DEFAULT 'Sister',
  closing_prayer_name TEXT DEFAULT '',
  hymn_opening TEXT DEFAULT '',
  hymn_sacrament TEXT DEFAULT '',
  hymn_interlude TEXT DEFAULT '',
  hymn_closing TEXT DEFAULT '',
  classes_json TEXT DEFAULT '{}',
  notes TEXT DEFAULT '',
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

#### `classes_json` Structure:
```json
{
  "sunday_school": { "topic": "Proverbs 1-4; Ecclesiastes 1-3", "url": "", "teacher": "Brother Smith" },
  "elders_quorum": { "topic": "Watch Ye Therefore, and Pray Always", "url": "https://churchofjesuschrist.org/...", "teacher": "President Taylor" },
  "relief_society": { "topic": "Watch Ye Therefore, and Pray Always", "url": "https://churchofjesuschrist.org/...", "teacher": "Sister Sahitya" },
  "young_men": { "topic": "Watch Ye Therefore, and Pray Always", "url": "", "teacher": "Brother Lee" },
  "young_women": { "topic": "Watch Ye Therefore, and Pray Always", "url": "", "teacher": "Sister Brown" },
  "primary": { "topic": "He Shall Direct Thy Paths", "url": "", "teacher": "Sister Davis" }
}
```

### 3.2 `autocomplete_history` Table
Populated automatically when saving agendas to enable instant 0ms suggestions as users type:
```sql
CREATE TABLE IF NOT EXISTS autocomplete_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT, -- 'name', 'topic', 'hymn'
  value TEXT UNIQUE,
  last_used TEXT DEFAULT CURRENT_TIMESTAMP
);
```

---

## 4. REST API Specification

All endpoints communicate using standard JSON and return appropriate HTTP status codes (200, 400, 404, 500).

### 4.1 `GET /api/agenda/:date`
- **Params:** `date` (`YYYY-MM-DD`).
- **Behavior:** Returns saved agenda. If no record exists for that Sunday, computes the Sunday of the month (e.g. "1st Sunday", "2nd Sunday") and returns a clean default template populated with standard talk order and starter roles.
- **Response:** `{ success: true, data: AgendaObject }`

### 4.2 `PUT /api/agenda/:date`
- **Params:** `date` (`YYYY-MM-DD`).
- **Body:** Partial or full `AgendaObject`.
- **Behavior:** Upserts the agenda record into SQLite, updates `autocomplete_history`, sets `updated_at`.
- **Response:** `{ success: true, date: "2026-09-13", updated_at: "..." }`

### 4.3 `GET /api/sundays`
- **Behavior:** Returns list of all existing saved dates and helper metadata (previous Sunday, current Sunday, next 4 upcoming Sundays).
- **Response:** `{ success: true, saved: ["2026-09-06", "2026-09-13"], next: "2026-09-20", prev: "2026-09-06" }`

### 4.4 `GET /api/autocomplete?q=term&category=name`
- **Behavior:** Fast prefix search across past entries for speaker/teacher names, topics, or hymns.
- **Response:** `{ suggestions: ["Sahitya", "Brother Anderson", ...] }`

### 4.5 `GET /api/export` & `POST /api/import`
- **Behavior:** Full backup and restore of all database records as a single JSON file.

---

## 5. User Interface & User Experience Design

### 5.1 Color System & Aesthetic
Inspired by the warm amber, celestial blue, and terracotta color coding of the original sheet:
- **Primary / Amber Accent:** `#D97706` / `#F59E0B` (Sacrament / Sacrament meeting cards)
- **Celestial Blue Accent:** `#2563EB` / `#3B82F6` (Hymns card & links)
- **Terracotta / Rust Accent:** `#C2410C` / `#EA580C` (Quorums & Relief Society)
- **Deep Purple Accent:** `#7C3AED` (Primary & Sunday School)
- **WhatsApp Green:** `#22C55E` / `#16A34A` (Action buttons)
- **Backgrounds:** Polished card surfaces with light (`#F8FAFC`) and dark (`#0F172A`) mode support.

### 5.2 Responsive Layouts

#### A. Desktop View (>= 900px)
- **Top Navigation Bar:**
  - App Logo & Title (`Ward Agenda`)
  - Sunday Selector: `[ ‹ Previous ]` `[ Date Input ]` `[ Next › ]`
  - Dynamic Week Badge: `1st Sunday (Testimonies)`
  - Sync Indicator: `● Saved`
  - Action Cluster: `[ 💬 Share to WhatsApp ]` `[ 🖨️ Print Bulletin ]` `[ 🌓 Theme ]`
- **Top Dual Card Grid:**
  - **Left Card:** Sacrament Meeting Agenda (Opening Prayer, Talk 1, Talk 2, Talk 3, Closing Prayer).
  - **Center Card:** Hymns (Opening, Sacrament, Interlude, Closing) with instant hymn title lookup.
  - **Right Card:** Talks Order Quick-Guide (highlights current week's organization in bold gold).
- **Bottom Section:**
  - **Sunday School Banner/Card:** Topic, CFM scripture reference, and teacher.
  - **Quorums & Auxiliaries Grid:** Tables for Elders Quorum, Relief Society, Young Men, Young Women, and Primary.

#### B. Mobile View (< 900px)
- **Header:** Sticky compact header with date navigation and 1-tap WhatsApp button.
- **Tab Navigation / Segmented Control:**
  - `[ ⛪ Sacrament ]` `[ 🎵 Hymns ]` `[ 📖 Classes ]` `[ 📋 Talks Order ]`
- **Thumb-Friendly Forms:**
  - Full-width touch cards.
  - Single-tap editing with inline input focus.
  - Floating bottom drawer for quick action shortcuts.

---

## 6. WhatsApp Quick-Share Engine

### 6.1 Preset Formats

#### Preset 1: Full Sunday Agenda
```
⛪ *WARD SUNDAY AGENDA*
📅 *Sunday, 13 September 2026* (1st Sunday)

*SACRAMENT MEETING*
🙏 Opening Prayer: Brother John Doe
🎵 Opening Hymn: #2 - The Spirit of God
🎵 Sacrament Hymn: #193 - I Stand All Amazed
🗣️ 1st Talk: Seminary and Institute Graduations (Bishopric)
🗣️ 2nd Talk (Elders Quorum): A New Normal
🔗 https://churchofjesuschrist.org/study/...
🗣️ 3rd Talk: Sacrifice (Gospel Principles)
🎵 Closing Hymn: #243 - Let Us All Press On
🙏 Closing Prayer: Sister Jane Smith

*SECOND HOUR CLASSES (25 Min)*
📖 *Sunday School:* Proverbs 1–4; Ecclesiastes 1–3
👨‍🏫 Teacher: Brother Miller

👥 *Quorums & Organizations:*
- Elders Quorum: Watch Ye Therefore, and Pray Always
- Relief Society: Watch Ye Therefore, and Pray Always (Teacher: Sahitya)
- Young Men: Watch Ye Therefore, and Pray Always
- Young Women: Watch Ye Therefore, and Pray Always
- Primary: He Shall Direct Thy Paths
```

#### Preset 2: Sacrament Program Only
Curates exclusively the meeting program for the congregation.

#### Preset 3: Second Hour Classes & Teachers
Curates Sunday School CFM reading and Quorum assignments for teachers.

#### Preset 4: Individual Reminder
Select a member name to generate a tailored reminder:
```
Hi Sister Sahitya, friendly reminder of your assignment this Sunday (13 September 2026) to teach Relief Society on "Watch Ye Therefore, and Pray Always".
```

### 6.2 Sharing Mechanism
- **Native Share (`navigator.share`):** Uses system share dialog on iOS/Android to select WhatsApp or any messaging app.
- **Direct WhatsApp Link Fallback:** `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}` opens WhatsApp directly with the pre-filled text.
- **Copy to Clipboard:** Copies formatted markdown/text with 1 tap.

---

## 7. Performance & Reliability Principles

1. **0ms Keystroke Latency:** UI updates immediately in memory; server synchronization is debounced by 400ms.
2. **Offline Fallback:** Changes are mirrored in `localStorage` so edits are never lost if Wi-Fi drops.
3. **Database Transactions:** SQLite writes use parameterized prepared statements preventing SQL injection and corruption.
4. **Instant Startup:** Zero compilation or bundling delays when starting the server.

---

## 8. Verification & Testing Strategy

1. **Unit & API Testing:**
   - Verify SQLite schema initialization.
   - Test `GET /api/agenda/:date` for both existing and brand-new Sunday dates.
   - Test `PUT /api/agenda/:date` with payload mutations.
   - Test Sunday-of-the-month calculation algorithm (1st through 5th Sundays).
2. **UI & E2E Validation:**
   - Desktop view rendering and dual-grid layout inspection.
   - Mobile responsive layout checks (viewport < 500px).
   - Form input responsiveness and debounced auto-save verification.
   - WhatsApp share text generation and clipboard copy verification.
   - Print stylesheet verification (bulletin format).
