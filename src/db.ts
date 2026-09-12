import { Database } from "bun:sqlite";
import { AgendaRecord, createDefaultAgenda, MeetingType } from "./agenda-utils";

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
      talk1_speaker TEXT DEFAULT '',
      talk2_org TEXT DEFAULT 'Elders Quorum',
      talk2_title TEXT DEFAULT '',
      talk2_url TEXT DEFAULT '',
      talk2_speaker TEXT DEFAULT '',
      talk3_org TEXT DEFAULT 'Member',
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
    "talk3_org TEXT DEFAULT 'Member'",
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
  `);

  // Seed initial data from image if empty
  const countRow = db.query("SELECT COUNT(*) as count FROM agendas").get() as { count: number };
  if (countRow.count === 0) {
    seedInitialAgenda(db);
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
    talk1_speaker: row.talk1_speaker || "",
    talk2_org: row.talk2_org || defaultAgenda.talk2_org,
    talk2_title: row.talk2_title || "",
    talk2_url: row.talk2_url || "",
    talk2_speaker: row.talk2_speaker || "",
    talk3_org: row.talk3_org || defaultAgenda.talk3_org || "Member",
    talk3_title: row.talk3_title || "",
    talk3_url: row.talk3_url || "",
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
  data: Partial<AgendaRecord> & { date: string }
): AgendaRecord {
  const current = getAgendaByDate(db, data.date);
  const merged: AgendaRecord = {
    ...current,
    ...data,
    classes_json: {
      ...current.classes_json,
      ...(data.classes_json || {}),
    },
    updated_at: new Date().toISOString(),
  };

  const stmt = db.prepare(`
    INSERT INTO agendas (
      date, week_label, meeting_type, opening_prayer_role, opening_prayer_name,
      talk1_org, talk1_title, talk1_speaker,
      talk2_org, talk2_title, talk2_url, talk2_speaker,
      talk3_org, talk3_title, talk3_url, talk3_speaker,
      closing_prayer_role, closing_prayer_name,
      hymn_opening, hymn_sacrament, hymn_interlude, hymn_closing,
      classes_json, conference_title, conference_details, conference_url,
      notes, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
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
      talk1_speaker = excluded.talk1_speaker,
      talk2_org = excluded.talk2_org,
      talk2_title = excluded.talk2_title,
      talk2_url = excluded.talk2_url,
      talk2_speaker = excluded.talk2_speaker,
      talk3_org = excluded.talk3_org,
      talk3_title = excluded.talk3_title,
      talk3_url = excluded.talk3_url,
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

  stmt.run(
    merged.date,
    merged.week_label,
    merged.meeting_type || "standard",
    merged.opening_prayer_role,
    merged.opening_prayer_name,
    merged.talk1_org || "Bishopric",
    merged.talk1_title,
    merged.talk1_speaker,
    merged.talk2_org,
    merged.talk2_title,
    merged.talk2_url || "",
    merged.talk2_speaker,
    merged.talk3_org || "Member",
    merged.talk3_title,
    merged.talk3_url || "",
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

  return merged;
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

export function searchHymns(db: Database, query?: string, book?: string, limit = 50): HymnRecord[] {
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

  sql += " ORDER BY book, number ASC LIMIT ?";
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
