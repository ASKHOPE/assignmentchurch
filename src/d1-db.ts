import { AgendaRecord, createDefaultAgenda, MeetingType } from "./agenda-utils";

let schemaInitialized = false;

/**
 * Ensures D1 tables exist on the active Cloudflare D1 database.
 */
export async function ensureD1Schema(db: D1Database): Promise<void> {
  if (schemaInitialized) return;

  try {
    await db.prepare(`
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
      )
    `).run();

    await db.prepare(`
      CREATE TABLE IF NOT EXISTS autocomplete_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        value TEXT NOT NULL UNIQUE,
        last_used TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    await db.prepare(`
      CREATE TABLE IF NOT EXISTS hymns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        book TEXT NOT NULL,
        number INTEGER NOT NULL,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        UNIQUE(book, number)
      )
    `).run();

    await db.prepare(`
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
      )
    `).run();

    await db.prepare(`
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
      )
    `).run();

    schemaInitialized = true;
  } catch (err) {
    console.warn("D1 schema initialization warning:", err);
  }
}

export async function getAgendaByDateD1(db: D1Database, date: string): Promise<AgendaRecord> {
  await ensureD1Schema(db);

  const row = (await db
    .prepare("SELECT * FROM agendas WHERE date = ?")
    .bind(date)
    .first()) as any;

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

export async function saveAgendaD1(
  db: D1Database,
  data: Partial<AgendaRecord> & { date: string }
): Promise<AgendaRecord> {
  await ensureD1Schema(db);

  const current = await getAgendaByDateD1(db, data.date);
  const merged: AgendaRecord = {
    ...current,
    ...data,
    classes_json: {
      ...current.classes_json,
      ...(data.classes_json || {}),
    },
    updated_at: new Date().toISOString(),
  };

  await db
    .prepare(`
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
    `)
    .bind(
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
      merged.updated_at
    )
    .run();

  // Record autocomplete entries
  const names = [
    merged.opening_prayer_name,
    merged.talk1_speaker,
    merged.talk2_speaker,
    merged.talk3_speaker,
    merged.closing_prayer_name,
    merged.classes_json.sunday_school?.teacher,
    merged.classes_json.elders_quorum?.teacher,
    merged.classes_json.relief_society?.teacher,
    merged.classes_json.young_men?.teacher,
    merged.classes_json.young_women?.teacher,
    merged.classes_json.primary?.teacher,
  ].filter(Boolean);

  for (const n of names) {
    if (n && n.trim().length > 1) {
      await db
        .prepare("INSERT OR REPLACE INTO autocomplete_history (category, value, last_used) VALUES (?, ?, CURRENT_TIMESTAMP)")
        .bind("name", n.trim())
        .run();
    }
  }

  return merged;
}

export async function getAllSavedSundaysD1(db: D1Database): Promise<string[]> {
  await ensureD1Schema(db);
  const { results } = await db
    .prepare("SELECT date FROM agendas ORDER BY date ASC")
    .all<{ date: string }>();

  return (results || []).map((r) => r.date);
}

export async function getAutocompleteSuggestionsD1(
  db: D1Database,
  category?: string,
  query?: string
): Promise<string[]> {
  await ensureD1Schema(db);

  let sql = "SELECT value FROM autocomplete_history";
  const params: any[] = [];
  const conditions: string[] = [];

  if (category) {
    conditions.push("category = ?");
    params.push(category);
  }

  if (query) {
    conditions.push("value LIKE ?");
    params.push(`%${query}%`);
  }

  if (conditions.length > 0) {
    sql += ` WHERE ${conditions.join(" AND ")}`;
  }

  sql += " ORDER BY last_used DESC LIMIT 20";

  const { results } = await db.prepare(sql).bind(...params).all<{ value: string }>();
  return (results || []).map((r) => r.value);
}

export async function exportAllDataD1(db: D1Database) {
  await ensureD1Schema(db);
  const agendasRes = await db.prepare("SELECT * FROM agendas ORDER BY date ASC").all<any>();
  const autoRes = await db.prepare("SELECT category, value FROM autocomplete_history").all<any>();

  return {
    version: 1,
    timestamp: new Date().toISOString(),
    agendas: (agendasRes.results || []).map((r) => ({
      ...r,
      classes_json: JSON.parse(r.classes_json || "{}"),
    })),
    autocomplete_history: autoRes.results || [],
  };
}

export async function importAllDataD1(db: D1Database, data: any): Promise<void> {
  await ensureD1Schema(db);
  if (data?.agendas && Array.isArray(data.agendas)) {
    for (const agenda of data.agendas) {
      await saveAgendaD1(db, agenda);
    }
  }
}

export async function searchHymnsD1(db: D1Database, query?: string, book?: string, limit = 50) {
  await ensureD1Schema(db);
  let sql = "SELECT id, book, number, title, url FROM hymns WHERE 1=1";
  const params: any[] = [];

  if (book && book !== "all") {
    sql += " AND book = ?";
    params.push(book);
  }

  if (query && query.trim()) {
    const q = query.trim();
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

  const { results } = await db.prepare(sql).bind(...params).all<any>();
  return results || [];
}

export async function searchConferenceTalksD1(
  db: D1Database,
  query?: string,
  speaker?: string,
  year?: number,
  limit = 50
) {
  await ensureD1Schema(db);
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

  const { results } = await db.prepare(sql).bind(...params).all<any>();
  return results || [];
}

export async function getComeFollowMeD1(db: D1Database, year?: number, query?: string) {
  await ensureD1Schema(db);
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
  const { results } = await db.prepare(sql).bind(...params).all<any>();
  return results || [];
}
