import { Database } from "bun:sqlite";
import { 
  AgendaRecord, 
  createDefaultAgenda, 
  MeetingType, 
  TALK_ORDER_RULES 
} from "./agenda-utils";
import { mergeAgendas, IncomingAgendaPayload } from "./merge-engine";
import hymnsSeed from "../data/hymns.json";
import talksSeed from "../data/conference-talks.json";
import cfmSeed from "../data/come-follow-me.json";
import gpSeed from "../data/gospel-principles.json";
import fsySeed from "../data/fsy-lessons.json";

export interface BackupData {
  version: number;
  timestamp: string;
  agendas: AgendaRecord[];
  autocomplete_history: Array<{ category: string; value: string }>;
}

export function initDb(dbPath: string = "agenda.db"): Database {
  const db = new Database(dbPath);
  db.run("PRAGMA journal_mode = WAL;");
  db.run("PRAGMA synchronous = NORMAL;");
  db.run("PRAGMA busy_timeout = 5000;");

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS agendas (
      date TEXT PRIMARY KEY,
      week_label TEXT,
      meeting_type TEXT DEFAULT 'standard',
      opening_prayer_role TEXT DEFAULT 'Brother',
      opening_prayer_name TEXT DEFAULT '',
      talk1_org TEXT DEFAULT 'Bishopric',
      talk1_title TEXT DEFAULT '',
      talk1_speaker_role TEXT DEFAULT 'Brother',
      talk1_speaker TEXT DEFAULT '',
      talk2_org TEXT DEFAULT 'Elders Quorum',
      talk2_title TEXT DEFAULT '',
      talk2_url TEXT DEFAULT '',
      talk2_speaker_role TEXT DEFAULT 'Brother',
      talk2_speaker TEXT DEFAULT '',
      talk3_org TEXT DEFAULT 'Member',
      talk3_title TEXT DEFAULT '',
      talk3_url TEXT DEFAULT '',
      talk3_speaker_role TEXT DEFAULT 'Brother',
      talk3_speaker TEXT DEFAULT '',
      closing_prayer_role TEXT DEFAULT 'Sister',
      closing_prayer_name TEXT DEFAULT '',
      hymn_opening TEXT DEFAULT '',
      hymn_sacrament TEXT DEFAULT '',
      hymn_interlude TEXT DEFAULT '',
      hymn_closing TEXT DEFAULT '',
      classes_json TEXT DEFAULT '{}',
      conference_title TEXT DEFAULT '',
      conference_details TEXT DEFAULT '',
      conference_url TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Ensure new columns exist for existing database files (schema migration)
  const columnsToAdd = [
    "meeting_type TEXT DEFAULT 'standard'",
    "talk1_org TEXT DEFAULT 'Bishopric'",
    "talk1_speaker_role TEXT DEFAULT 'Brother'",
    "talk2_speaker_role TEXT DEFAULT 'Brother'",
    "talk3_org TEXT DEFAULT 'Member'",
    "talk3_speaker_role TEXT DEFAULT 'Brother'",
    "conference_title TEXT DEFAULT ''",
    "conference_details TEXT DEFAULT ''",
    "conference_url TEXT DEFAULT ''"
  ];

  for (const col of columnsToAdd) {
    try {
      db.run(`ALTER TABLE agendas ADD COLUMN ${col}`);
    } catch (e) {
      // Column already exists
    }
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS autocomplete_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      value TEXT NOT NULL UNIQUE,
      last_used TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS hymns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book TEXT NOT NULL,
      number INTEGER NOT NULL,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      UNIQUE(book, number)
    );
    CREATE INDEX IF NOT EXISTS idx_hymns_search ON hymns(book, number, title);

    CREATE TABLE IF NOT EXISTS conference_talks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      conference_name TEXT NOT NULL,
      session TEXT NOT NULL,
      title TEXT NOT NULL,
      speaker TEXT NOT NULL,
      url TEXT NOT NULL,
      UNIQUE(year, month, url)
    );
    CREATE INDEX IF NOT EXISTS idx_talks_speaker ON conference_talks(speaker);
    CREATE INDEX IF NOT EXISTS idx_talks_year ON conference_talks(year, month);

    CREATE TABLE IF NOT EXISTS come_follow_me (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year INTEGER NOT NULL,
      book_title TEXT NOT NULL,
      week_number INTEGER,
      date_range TEXT,
      title TEXT NOT NULL,
      scriptures TEXT,
      url TEXT NOT NULL,
      UNIQUE(year, url)
    );
    CREATE INDEX IF NOT EXISTS idx_cfm_year ON come_follow_me(year);

    CREATE TABLE IF NOT EXISTS gospel_principles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chapter_number INTEGER NOT NULL UNIQUE,
      title TEXT NOT NULL,
      url TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_gp_chapter ON gospel_principles(chapter_number);

    CREATE TABLE IF NOT EXISTS fsy_lessons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      sunday_number INTEGER NOT NULL,
      organization TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      url TEXT NOT NULL,
      UNIQUE(year, month, sunday_number, organization)
    );
    CREATE INDEX IF NOT EXISTS idx_fsy_date ON fsy_lessons(year, month, sunday_number);

    CREATE TABLE IF NOT EXISTS auth_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      passkey TEXT NOT NULL DEFAULT 'dowleswaram',
      role TEXT NOT NULL DEFAULT 'Leader',
      is_active INTEGER NOT NULL DEFAULT 1,
      last_login TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed initial data from image if empty
  const countRow = db.query("SELECT COUNT(*) as count FROM agendas").get() as { count: number };
  if (countRow.count === 0) {
    seedInitialAgenda(db);
  }

  // Seed gospel principles if empty
  try {
    const gpCount = db.query("SELECT COUNT(*) as count FROM gospel_principles").get() as { count: number };
    if (gpCount.count === 0) {
      seedGospelPrinciples(db);
    }
  } catch (e) {
    // ignore if seeding fails in test env
  }

  // Seed FSY Sunday lessons if empty
  try {
    const fsyCount = db.query("SELECT COUNT(*) as count FROM fsy_lessons").get() as { count: number };
    if (fsyCount.count === 0) {
      seedFsyLessons(db);
    }
  } catch (e) {
    // ignore if seeding fails in test env
  }

  // Seed auth users if empty
  try {
    const authCount = db.query("SELECT COUNT(*) as count FROM auth_users").get() as { count: number };
    if (authCount.count === 0) {
      seedDefaultAuthUsers(db);
    }
  } catch (e) {
    // ignore in test env
  }

  return db;
}

function seedInitialAgenda(db: Database) {
  const initialDate = "2026-09-13";
  const defaultItem = createDefaultAgenda(initialDate);

  const initialAgenda: AgendaRecord = {
    ...defaultItem,
    date: initialDate,
    week_label: "1st Sunday", // As listed on image header
    meeting_type: "standard",
    opening_prayer_role: "Brother",
    opening_prayer_name: "",
    talk1_org: "Bishopric",
    talk1_title: "(Seminary and Institute Graduations)",
    talk1_speaker: "Bishopric",
    talk2_org: "Elders Quorum",
    talk2_title: "A New Normal",
    talk2_url: "https://www.churchofjesuschrist.org/study/general-conference/2020/10/46nelson",
    talk2_speaker: "",
    talk3_org: "Member",
    talk3_title: "Sacrifice (Gospel Principles)",
    talk3_url: "https://www.churchofjesuschrist.org/study/manual/gospel-principles/chapter-26-sacrifice",
    talk3_speaker: "",
    closing_prayer_role: "Sister",
    closing_prayer_name: "",
    hymn_opening: "",
    hymn_sacrament: "",
    hymn_interlude: "",
    hymn_closing: "",
    classes_json: {
      sunday_school: {
        topic: "September 7–13: “He Shall Direct Thy Paths” Proverbs 1–4; 15–16; 22; 31; Ecclesiastes 1–3; 11–12",
        url: "https://www.churchofjesuschrist.org/study/come-follow-me",
        teacher: "",
      },
      elders_quorum: {
        topic: "Watch Ye Therefore, and Pray Always",
        url: "https://www.churchofjesuschrist.org/study/general-conference",
        teacher: "",
      },
      relief_society: {
        topic: "Watch Ye Therefore, and Pray Always",
        url: "https://www.churchofjesuschrist.org/study/general-conference",
        teacher: "Sahitya",
      },
      young_men: {
        topic: "Watch Ye Therefore, and Pray Always",
        url: "",
        teacher: "",
      },
      young_women: {
        topic: "Watch Ye Therefore, and Pray Always",
        url: "",
        teacher: "",
      },
      primary: {
        topic: "September 7–13: “He Shall Direct Thy Paths” Proverbs 1–4; 15–16; 22; 31; Ecclesiastes 1–3; 11–12",
        url: "",
        teacher: "",
      },
    },
    notes: "",
    updated_at: new Date().toISOString(),
  };

  saveAgenda(db, initialAgenda);

  // Seed some common autocomplete
  const seedSuggestions = [
    { category: "name", value: "Sahitya" },
    { category: "name", value: "Bishopric" },
    { category: "org", value: "Elders Quorum" },
    { category: "org", value: "Relief Society" },
    { category: "org", value: "Youth - Young Men" },
    { category: "org", value: "Youth - Young Women" },
    { category: "org", value: "Stake High Councilor" },
    { category: "topic", value: "Watch Ye Therefore, and Pray Always" },
    { category: "topic", value: "A New Normal" },
    { category: "topic", value: "Sacrifice (Gospel Principles)" },
  ];

  const insertHistory = db.prepare(`
    INSERT OR IGNORE INTO autocomplete_history (category, value) VALUES (?, ?)
  `);
  for (const item of seedSuggestions) {
    insertHistory.run(item.category, item.value);
  }
}

export function getAgendaByDate(db: Database, date: string): AgendaRecord {
  const row = db.query("SELECT * FROM agendas WHERE date = ?").get(date) as any;
  if (!row) {
    return createDefaultAgenda(date);
  }

  let classesJson = {};
  try {
    classesJson = JSON.parse(row.classes_json || "{}");
  } catch (e) {
    classesJson = {};
  }

  const defaultAgenda = createDefaultAgenda(date);

  return {
    date: row.date,
    week_label: row.week_label || defaultAgenda.week_label,
    meeting_type: (row.meeting_type as MeetingType) || defaultAgenda.meeting_type,
    opening_prayer_role: row.opening_prayer_role || "Brother",
    opening_prayer_name: row.opening_prayer_name || "",
    talk1_org: row.talk1_org || defaultAgenda.talk1_org,
    talk1_title: row.talk1_title || "",
    talk1_speaker_role: row.talk1_speaker_role || defaultAgenda.talk1_speaker_role || "Brother",
    talk1_speaker: row.talk1_speaker || "",
    talk2_org: row.talk2_org || defaultAgenda.talk2_org,
    talk2_title: row.talk2_title || "",
    talk2_url: row.talk2_url || "",
    talk2_speaker_role: row.talk2_speaker_role || defaultAgenda.talk2_speaker_role || "Brother",
    talk2_speaker: row.talk2_speaker || "",
    talk3_org: row.talk3_org || defaultAgenda.talk3_org || "Member",
    talk3_title: row.talk3_title || "",
    talk3_url: row.talk3_url || "",
    talk3_speaker_role: row.talk3_speaker_role || defaultAgenda.talk3_speaker_role || "Brother",
    talk3_speaker: row.talk3_speaker || "",
    closing_prayer_role: row.closing_prayer_role || "Sister",
    closing_prayer_name: row.closing_prayer_name || "",
    hymn_opening: row.hymn_opening || "",
    hymn_sacrament: row.hymn_sacrament || "",
    hymn_interlude: row.hymn_interlude || "",
    hymn_closing: row.hymn_closing || "",
    classes_json: {
      ...defaultAgenda.classes_json,
      ...classesJson,
    },
    conference_title: row.conference_title || defaultAgenda.conference_title || "",
    conference_details: row.conference_details || defaultAgenda.conference_details || "",
    conference_url: row.conference_url || defaultAgenda.conference_url || "",
    notes: row.notes || "",
    updated_at: row.updated_at,
  };
}

export function saveAgenda(
  db: Database,
  data: IncomingAgendaPayload
): AgendaRecord & { _isConcurrentMerge?: boolean; _conflicts?: string[] } {
  const current = getAgendaByDate(db, data.date);
  const { merged, isConcurrentMerge, conflicts } = mergeAgendas(current, data);

  const stmt = db.prepare(`
    INSERT INTO agendas (
      date, week_label, meeting_type, opening_prayer_role, opening_prayer_name,
      talk1_org, talk1_title, talk1_speaker_role, talk1_speaker,
      talk2_org, talk2_title, talk2_url, talk2_speaker_role, talk2_speaker,
      talk3_org, talk3_title, talk3_url, talk3_speaker_role, talk3_speaker,
      closing_prayer_role, closing_prayer_name,
      hymn_opening, hymn_sacrament, hymn_interlude, hymn_closing,
      classes_json, conference_title, conference_details, conference_url,
      notes, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?
    )
    ON CONFLICT(date) DO UPDATE SET
      week_label = excluded.week_label,
      meeting_type = excluded.meeting_type,
      opening_prayer_role = excluded.opening_prayer_role,
      opening_prayer_name = excluded.opening_prayer_name,
      talk1_org = excluded.talk1_org,
      talk1_title = excluded.talk1_title,
      talk1_speaker_role = excluded.talk1_speaker_role,
      talk1_speaker = excluded.talk1_speaker,
      talk2_org = excluded.talk2_org,
      talk2_title = excluded.talk2_title,
      talk2_url = excluded.talk2_url,
      talk2_speaker_role = excluded.talk2_speaker_role,
      talk2_speaker = excluded.talk2_speaker,
      talk3_org = excluded.talk3_org,
      talk3_title = excluded.talk3_title,
      talk3_url = excluded.talk3_url,
      talk3_speaker_role = excluded.talk3_speaker_role,
      talk3_speaker = excluded.talk3_speaker,
      closing_prayer_role = excluded.closing_prayer_role,
      closing_prayer_name = excluded.closing_prayer_name,
      hymn_opening = excluded.hymn_opening,
      hymn_sacrament = excluded.hymn_sacrament,
      hymn_interlude = excluded.hymn_interlude,
      hymn_closing = excluded.hymn_closing,
      classes_json = excluded.classes_json,
      conference_title = excluded.conference_title,
      conference_details = excluded.conference_details,
      conference_url = excluded.conference_url,
      notes = excluded.notes,
      updated_at = excluded.updated_at
  `);

  const executeTransaction = db.transaction(() => {
    stmt.run(
      merged.date,
      merged.week_label,
      merged.meeting_type || "standard",
      merged.opening_prayer_role,
      merged.opening_prayer_name,
      merged.talk1_org || "Bishopric",
      merged.talk1_title,
      merged.talk1_speaker_role || "Brother",
      merged.talk1_speaker,
      merged.talk2_org,
      merged.talk2_title,
      merged.talk2_url || "",
      merged.talk2_speaker_role || "Brother",
      merged.talk2_speaker,
      merged.talk3_org || "Member",
      merged.talk3_title,
      merged.talk3_url || "",
      merged.talk3_speaker_role || "Brother",
      merged.talk3_speaker,
      merged.closing_prayer_role,
      merged.closing_prayer_name,
      merged.hymn_opening,
      merged.hymn_sacrament,
      merged.hymn_interlude,
      merged.hymn_closing,
      JSON.stringify(merged.classes_json),
      merged.conference_title || "",
      merged.conference_details || "",
      merged.conference_url || "",
      merged.notes || "",
      merged.updated_at || new Date().toISOString()
    );

    // Track autocomplete history for names and topics
    recordAutocomplete(db, "name", merged.opening_prayer_name);
    recordAutocomplete(db, "name", merged.talk1_speaker);
    recordAutocomplete(db, "name", merged.talk2_speaker);
    recordAutocomplete(db, "name", merged.talk3_speaker);
    recordAutocomplete(db, "name", merged.closing_prayer_name);

    if (merged.talk1_org) recordAutocomplete(db, "org", merged.talk1_org);
    if (merged.talk2_org) recordAutocomplete(db, "org", merged.talk2_org);

    if (merged.classes_json) {
      for (const org of Object.values(merged.classes_json)) {
        if (org.teacher) recordAutocomplete(db, "name", org.teacher);
        if (org.topic) recordAutocomplete(db, "topic", org.topic);
      }
    }

    if (merged.hymn_opening) recordAutocomplete(db, "hymn", merged.hymn_opening);
    if (merged.hymn_sacrament) recordAutocomplete(db, "hymn", merged.hymn_sacrament);
    if (merged.hymn_closing) recordAutocomplete(db, "hymn", merged.hymn_closing);
  });

  executeTransaction();

  return {
    ...merged,
    _isConcurrentMerge: isConcurrentMerge,
    _conflicts: conflicts,
  };
}

function recordAutocomplete(db: Database, category: string, value?: string) {
  if (!value || value.trim().length < 2) return;
  const trimmed = value.trim();
  db.run(`
    INSERT INTO autocomplete_history (category, value, last_used)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(value) DO UPDATE SET last_used = CURRENT_TIMESTAMP
  `, [category, trimmed]);
}

export function getAllSavedSundays(db: Database): string[] {
  const rows = db.query("SELECT date FROM agendas ORDER BY date DESC").all() as Array<{ date: string }>;
  return rows.map((r) => r.date);
}

export function getAutocompleteSuggestions(
  db: Database,
  category?: string,
  query?: string
): string[] {
  let sql = "SELECT value FROM autocomplete_history";
  const params: any[] = [];

  const conditions: string[] = [];
  if (category) {
    conditions.push("category = ?");
    params.push(category);
  }
  if (query && query.trim().length > 0) {
    conditions.push("value LIKE ?");
    params.push(`%${query.trim()}%`);
  }

  if (conditions.length > 0) {
    sql += " WHERE " + conditions.join(" AND ");
  }

  sql += " ORDER BY last_used DESC LIMIT 15";

  const rows = db.query(sql).all(...params) as Array<{ value: string }>;
  return rows.map((r) => r.value);
}

export function exportAllData(db: Database): BackupData {
  const dates = getAllSavedSundays(db);
  const agendas = dates.map((date) => getAgendaByDate(db, date));
  const history = db.query("SELECT category, value FROM autocomplete_history").all() as Array<{
    category: string;
    value: string;
  }>;

  return {
    version: 1,
    timestamp: new Date().toISOString(),
    agendas,
    autocomplete_history: history,
  };
}

export function importAllData(db: Database, data: any): void {
  if (!data || !Array.isArray(data.agendas)) {
    throw new Error("Invalid backup format");
  }

  const insertAgenda = db.transaction((agendas: AgendaRecord[]) => {
    for (const item of agendas) {
      saveAgenda(db, item);
    }
  });

  insertAgenda(data.agendas);

  if (Array.isArray(data.autocomplete_history)) {
    const insertHistory = db.prepare(`
      INSERT OR IGNORE INTO autocomplete_history (category, value) VALUES (?, ?)
    `);
    for (const item of data.autocomplete_history) {
      if (item.category && item.value) {
        insertHistory.run(item.category, item.value);
      }
    }
  }
}

export interface HymnRecord {
  id?: number;
  book: string;
  number: number;
  title: string;
  url: string;
}

export interface ConferenceTalkRecord {
  id?: number;
  year: number;
  month: number;
  conference_name: string;
  session: string;
  speaker: string;
  title: string;
  url: string;
}

export interface ComeFollowMeRecord {
  id?: number;
  year: number;
  book_title: string;
  week_number: number;
  date_range: string;
  title: string;
  scriptures: string;
  url: string;
}

export function searchHymns(db: Database, query?: string, book?: string, limit = 700): HymnRecord[] {
  let sql = "SELECT id, book, number, title, url FROM hymns WHERE 1=1";
  const params: any[] = [];

  if (book && book !== "all") {
    sql += " AND book = ?";
    params.push(book);
  }

  if (query && query.trim()) {
    const q = query.trim();
    // Check if query is a number
    if (/^\d+$/.test(q)) {
      sql += " AND number = ?";
      params.push(parseInt(q, 10));
    } else {
      sql += " AND (title LIKE ? OR CAST(number AS TEXT) LIKE ?)";
      params.push(`%${q}%`, `%${q}%`);
    }
  }

  sql += ` ORDER BY 
    CASE 
      WHEN book LIKE '%1985%' THEN 1 
      WHEN book LIKE '%Home%' THEN 2 
      ELSE 3 
    END ASC, 
    number ASC 
    LIMIT ?`;
  params.push(limit);

  return db.query(sql).all(...params) as HymnRecord[];
}

export function searchConferenceTalks(
  db: Database,
  query?: string,
  speaker?: string,
  year?: number,
  limit = 50
): ConferenceTalkRecord[] {
  let sql = "SELECT id, year, month, conference_name, session, speaker, title, url FROM conference_talks WHERE 1=1";
  const params: any[] = [];

  if (year) {
    sql += " AND year = ?";
    params.push(year);
  }

  if (speaker && speaker.trim()) {
    sql += " AND (speaker LIKE ? OR title LIKE ?)";
    params.push(`%${speaker.trim()}%`, `%${speaker.trim()}%`);
  }

  if (query && query.trim()) {
    sql += " AND (title LIKE ? OR speaker LIKE ?)";
    params.push(`%${query.trim()}%`, `%${query.trim()}%`);
  }

  sql += " ORDER BY year DESC, month DESC, id ASC LIMIT ?";
  params.push(limit);

  return db.query(sql).all(...params) as ConferenceTalkRecord[];
}

export function getComeFollowMe(db: Database, year?: number, query?: string): ComeFollowMeRecord[] {
  let sql = "SELECT id, year, book_title, week_number, date_range, title, scriptures, url FROM come_follow_me WHERE 1=1";
  const params: any[] = [];

  if (year) {
    sql += " AND year = ?";
    params.push(year);
  }

  if (query && query.trim()) {
    sql += " AND (title LIKE ? OR scriptures LIKE ? OR date_range LIKE ?)";
    params.push(`%${query.trim()}%`, `%${query.trim()}%`, `%${query.trim()}%`);
  }

  sql += " ORDER BY year DESC, week_number ASC";
  return db.query(sql).all(...params) as ComeFollowMeRecord[];
}

export interface GospelPrincipleRecord {
  id?: number;
  chapter_number: number;
  title: string;
  url: string;
}

export function seedGospelPrinciples(db: Database) {
  try {
    const fs = require("fs");
    const path = require("path");
    const jsonPath = path.join(process.cwd(), "data", "gospel-principles.json");
    if (!fs.existsSync(jsonPath)) return;
    const chapters = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO gospel_principles (chapter_number, title, url)
      VALUES (?, ?, ?)
    `);
    const tx = db.transaction((rows: any[]) => {
      for (const r of rows) {
        stmt.run(r.chapter_number, r.title, r.url);
      }
    });
    tx(chapters);
  } catch (err) {
    console.error("Error seeding gospel principles:", err);
  }
}

export function searchGospelPrinciples(
  db: Database,
  query?: string,
  limit = 60
): GospelPrincipleRecord[] {
  let sql = "SELECT id, chapter_number, title, url FROM gospel_principles WHERE 1=1";
  const params: any[] = [];

  if (query && query.trim()) {
    const q = query.trim();
    if (/^\d+$/.test(q)) {
      sql += " AND chapter_number = ?";
      params.push(parseInt(q, 10));
    } else {
      sql += " AND (title LIKE ? OR CAST(chapter_number AS TEXT) LIKE ?)";
      params.push(`%${q}%`, `%${q}%`);
    }
  }

  sql += " ORDER BY chapter_number ASC LIMIT ?";
  params.push(limit);

  return db.query(sql).all(...params) as GospelPrincipleRecord[];
}

export interface FsyLessonRecord {
  id?: number;
  year: number;
  month: number;
  sunday_number: number;
  organization: string; // 'both' | 'young_men' | 'young_women'
  title: string;
  description?: string;
  url: string;
}

export function seedFsyLessons(db: Database) {
  try {
    const fs = require("fs");
    const path = require("path");
    const jsonPath = path.join(process.cwd(), "data", "fsy-lessons.json");
    if (!fs.existsSync(jsonPath)) return;
    const lessons = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO fsy_lessons (year, month, sunday_number, organization, title, description, url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const tx = db.transaction((rows: any[]) => {
      for (const r of rows) {
        stmt.run(r.year, r.month, r.sunday_number, r.organization, r.title, r.description || "", r.url);
      }
    });
    tx(lessons);
  } catch (err) {
    console.error("Error seeding FSY lessons:", err);
  }
}

export function getFsyLessons(
  db: Database,
  year?: number,
  month?: number,
  sundayNumber?: number,
  org?: string
): FsyLessonRecord[] {
  let sql = "SELECT id, year, month, sunday_number, organization, title, description, url FROM fsy_lessons WHERE 1=1";
  const params: any[] = [];

  if (year) {
    sql += " AND year = ?";
    params.push(year);
  }
  if (month) {
    sql += " AND month = ?";
    params.push(month);
  }
  if (sundayNumber) {
    sql += " AND sunday_number = ?";
    params.push(sundayNumber);
  }
  if (org && org !== "all") {
    sql += " AND (organization = ? OR organization = 'both')";
    params.push(org);
  }

  sql += " ORDER BY year ASC, month ASC, sunday_number ASC, organization ASC";
  return db.query(sql).all(...params) as FsyLessonRecord[];
}

export function getConferenceMeta(db: Database): { years: number[]; speakers: string[] } {
  const yearRows = db.query("SELECT DISTINCT year FROM conference_talks ORDER BY year DESC").all() as { year: number }[];
  const years = yearRows.map((r) => r.year);

  const speakerRows = db.query(
    "SELECT speaker, COUNT(*) as count FROM conference_talks WHERE speaker NOT LIKE '%Session%' AND speaker NOT LIKE '%Auditor%' GROUP BY speaker ORDER BY count DESC, speaker ASC"
  ).all() as { speaker: string; count: number }[];
  const speakers = speakerRows.map((r) => r.speaker);

  return { years, speakers };
}

export function getFsyMeta(db: Database): { months: { month: number; year: number }[] } {
  const rows = db.query("SELECT DISTINCT year, month FROM fsy_lessons ORDER BY year DESC, month ASC").all() as { year: number; month: number }[];
  return { months: rows };
}

export interface AuthUserRecord {
  id: number;
  name: string;
  passkey: string;
  role: string;
  is_active: number;
  last_login: string | null;
  created_at: string;
}

export function seedDefaultAuthUsers(db: Database) {
  const defaults = [
    { name: "Bishop", passkey: "dowleswaram", role: "Bishopric" },
    { name: "Counselor", passkey: "dowleswaram", role: "Bishopric" },
    { name: "Elders Quorum", passkey: "dowleswaram", role: "Quorum Presidency" },
    { name: "Relief Society", passkey: "dowleswaram", role: "RS Presidency" },
    { name: "Sunday School", passkey: "dowleswaram", role: "SS Presidency" },
    { name: "Young Men", passkey: "dowleswaram", role: "YM Presidency" },
    { name: "Young Women", passkey: "dowleswaram", role: "YW Presidency" },
    { name: "Primary", passkey: "dowleswaram", role: "Primary Presidency" },
    { name: "Admin", passkey: "dowleswaram", role: "Administrator" },
  ];

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO auth_users (name, passkey, role, is_active)
    VALUES (?, ?, ?, 1)
  `);

  for (const u of defaults) {
    stmt.run(u.name, u.passkey, u.role);
  }
}

export function authenticateUser(db: Database, inputString: string): { success: boolean; user?: AuthUserRecord; error?: string } {
  const trimmed = inputString.trim();
  if (!trimmed) return { success: false, error: "Please enter your name or phone number and passkey" };

  // Allow formats:
  // 1. No spaces: e.g. "Bishopdowleswaram", "9876543210dowleswaram"
  // 2. With space: e.g. "Bishop dowleswaram", "9876543210 dowleswaram"
  // 3. User in auth_users with custom passkey

  let name = "";
  let passkey = "";

  const lower = trimmed.toLowerCase();
  if (lower.endsWith("dowleswaram")) {
    passkey = "dowleswaram";
    const prefix = trimmed.slice(0, trimmed.length - "dowleswaram".length).trim();
    name = prefix;
  } else {
    // Check if space separated custom passkey
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) {
      passkey = parts[parts.length - 1].toLowerCase();
      name = parts.slice(0, -1).join(" ").trim();
    } else {
      name = trimmed;
      passkey = "";
    }
  }

  if (!name) {
    return { success: false, error: 'Password should be your name or phone number + dowleswaram (e.g. "Bishopdowleswaram" or "9876543210dowleswaram")' };
  }

  // Find user in DB (case-insensitive name match)
  const user = db.query(
    "SELECT * FROM auth_users WHERE LOWER(name) = LOWER(?) AND LOWER(passkey) = LOWER(?) AND is_active = 1"
  ).get(name, passkey) as AuthUserRecord | undefined;

  if (user) {
    db.run("UPDATE auth_users SET last_login = CURRENT_TIMESTAMP WHERE id = ?", [user.id]);
    return { success: true, user };
  }

  // If passkey is "dowleswaram", auto-register new leader if valid name or phone number
  if (passkey === "dowleswaram" && name.length >= 2) {
    try {
      const ins = db.prepare(
        "INSERT INTO auth_users (name, passkey, role, is_active, last_login) VALUES (?, ?, 'Leader', 1, CURRENT_TIMESTAMP)"
      );
      ins.run(name, "dowleswaram");
      const newUser = db.query("SELECT * FROM auth_users WHERE LOWER(name) = LOWER(?)").get(name) as AuthUserRecord;
      return { success: true, user: newUser };
    } catch {
      // Name might exist with different passkey
      const existing = db.query("SELECT * FROM auth_users WHERE LOWER(name) = LOWER(?)").get(name) as AuthUserRecord | undefined;
      if (existing && existing.passkey.toLowerCase() === passkey) {
        return { success: true, user: existing };
      }
    }
  }

  return { success: false, error: "Invalid credentials. Use your name or phone number followed by 'dowleswaram' without spaces (e.g. Bishopdowleswaram)." };
}

export function getAllAuthUsers(db: Database): AuthUserRecord[] {
  return db.query("SELECT id, name, passkey, role, is_active, last_login, created_at FROM auth_users ORDER BY name ASC").all() as AuthUserRecord[];
}

export function saveAuthUser(
  db: Database,
  data: { id?: number; name: string; passkey?: string; role?: string; is_active?: number }
): { success: boolean; user?: AuthUserRecord; error?: string } {
  const name = data.name.trim();
  const passkey = (data.passkey || "dowleswaram").trim();
  const role = (data.role || "Leader").trim();
  const isActive = data.is_active !== undefined ? data.is_active : 1;

  if (!name) return { success: false, error: "Name cannot be empty" };

  if (data.id) {
    db.run(
      "UPDATE auth_users SET name = ?, passkey = ?, role = ?, is_active = ? WHERE id = ?",
      [name, passkey, role, isActive, data.id]
    );
    const updated = db.query("SELECT * FROM auth_users WHERE id = ?").get(data.id) as AuthUserRecord;
    return { success: true, user: updated };
  } else {
    try {
      db.run(
        "INSERT INTO auth_users (name, passkey, role, is_active) VALUES (?, ?, ?, ?)",
        [name, passkey, role, isActive]
      );
      const inserted = db.query("SELECT * FROM auth_users WHERE LOWER(name) = LOWER(?)").get(name) as AuthUserRecord;
      return { success: true, user: inserted };
    } catch (e: any) {
      return { success: false, error: "A leader login with this name already exists" };
    }
  }
}

export function deleteAuthUser(db: Database, id: number): { success: boolean } {
  db.run("DELETE FROM auth_users WHERE id = ?", [id]);
  return { success: true };
}


