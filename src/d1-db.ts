import { AgendaRecord, createDefaultAgenda, MeetingType } from "./agenda-utils";
import { mergeAgendas, IncomingAgendaPayload } from "./merge-engine";

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

    await db.prepare(`
      CREATE TABLE IF NOT EXISTS gospel_principles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chapter_number INTEGER NOT NULL UNIQUE,
        title TEXT NOT NULL,
        url TEXT NOT NULL
      )
    `).run();

    await db.prepare(`
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
      )
    `).run();

    await db.prepare(`
      CREATE TABLE IF NOT EXISTS auth_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        passkey TEXT NOT NULL DEFAULT 'dowleswaram',
        role TEXT NOT NULL DEFAULT 'Leader',
        is_active INTEGER NOT NULL DEFAULT 1,
        last_login TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
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

export async function saveAgendaD1(
  db: D1Database,
  data: IncomingAgendaPayload
): Promise<AgendaRecord & { _isConcurrentMerge?: boolean; _conflicts?: string[] }> {
  await ensureD1Schema(db);

  const current = await getAgendaByDateD1(db, data.date);
  const { merged, isConcurrentMerge, conflicts } = mergeAgendas(current, data);

  await db
    .prepare(`
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
    `)
    .bind(
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

export async function searchHymnsD1(db: D1Database, query?: string, book?: string, limit = 700) {
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

  sql += ` ORDER BY 
    CASE 
      WHEN book LIKE '%1985%' THEN 1 
      WHEN book LIKE '%Home%' THEN 2 
      ELSE 3 
    END ASC, 
    number ASC 
    LIMIT ?`;
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

export async function seedChurchDataD1(
  db: D1Database,
  hymns: any[],
  talks: any[],
  cfm: any[],
  gp?: any[],
  fsy?: any[]
): Promise<{ hymnsCount: number; talksCount: number; cfmCount: number; gpCount: number; fsyCount: number }> {
  await ensureD1Schema(db);

  // Batch insert hymns in chunks of 50
  for (let i = 0; i < hymns.length; i += 50) {
    const chunk = hymns.slice(i, i + 50);
    const stmts = chunk.map((h) =>
      db.prepare("INSERT OR REPLACE INTO hymns (book, number, title, url) VALUES (?, ?, ?, ?)")
        .bind(h.book, h.number, h.title, h.url)
    );
    await db.batch(stmts);
  }

  // Batch insert talks in chunks of 50
  for (let i = 0; i < talks.length; i += 50) {
    const chunk = talks.slice(i, i + 50);
    const stmts = chunk.map((t) =>
      db.prepare("INSERT OR REPLACE INTO conference_talks (year, month, conference_name, session, title, speaker, url) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .bind(t.year, t.month, t.conference_name, t.session, t.title, t.speaker, t.url)
    );
    await db.batch(stmts);
  }

  // Batch insert CFM in chunks of 50
  for (let i = 0; i < cfm.length; i += 50) {
    const chunk = cfm.slice(i, i + 50);
    const stmts = chunk.map((c) =>
      db.prepare("INSERT OR REPLACE INTO come_follow_me (year, book_title, week_number, date_range, title, scriptures, url) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .bind(c.year, c.book_title, c.week_number, c.date_range, c.title, c.scriptures, c.url)
    );
    await db.batch(stmts);
  }

  // Batch insert GP
  if (gp && gp.length > 0) {
    for (let i = 0; i < gp.length; i += 50) {
      const chunk = gp.slice(i, i + 50);
      const stmts = chunk.map((g) =>
        db.prepare("INSERT OR REPLACE INTO gospel_principles (chapter_number, title, url) VALUES (?, ?, ?)")
          .bind(g.chapter_number, g.title, g.url)
      );
      await db.batch(stmts);
    }
  }

  // Batch insert FSY
  if (fsy && fsy.length > 0) {
    for (let i = 0; i < fsy.length; i += 50) {
      const chunk = fsy.slice(i, i + 50);
      const stmts = chunk.map((f) =>
        db.prepare("INSERT OR REPLACE INTO fsy_lessons (year, month, sunday_number, organization, title, description, url) VALUES (?, ?, ?, ?, ?, ?, ?)")
          .bind(f.year, f.month, f.sunday_number, f.organization, f.title, f.description || "", f.url)
      );
      await db.batch(stmts);
    }
  }

  return {
    hymnsCount: hymns.length,
    talksCount: talks.length,
    cfmCount: cfm.length,
    gpCount: gp ? gp.length : 0,
    fsyCount: fsy ? fsy.length : 0,
  };
}

export async function searchGospelPrinciplesD1(
  db: D1Database,
  query?: string,
  limit = 60
) {
  await ensureD1Schema(db);
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

  const { results } = await db.prepare(sql).bind(...params).all<any>();
  return results || [];
}

export async function seedGospelPrinciplesD1(db: D1Database, chapters: any[]) {
  await ensureD1Schema(db);
  for (let i = 0; i < chapters.length; i += 50) {
    const chunk = chapters.slice(i, i + 50);
    const stmts = chunk.map((c) =>
      db.prepare("INSERT OR REPLACE INTO gospel_principles (chapter_number, title, url) VALUES (?, ?, ?)")
        .bind(c.chapter_number, c.title, c.url)
    );
    await db.batch(stmts);
  }
  return { count: chapters.length };
}

export async function getFsyLessonsD1(
  db: D1Database,
  year?: number,
  month?: number,
  sundayNumber?: number,
  org?: string
) {
  await ensureD1Schema(db);
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
  const { results } = await db.prepare(sql).bind(...params).all<any>();
  return results || [];
}

export async function seedFsyLessonsD1(db: D1Database, lessons: any[]) {
  await ensureD1Schema(db);
  for (let i = 0; i < lessons.length; i += 50) {
    const chunk = lessons.slice(i, i + 50);
    const stmts = chunk.map((l) =>
      db.prepare("INSERT OR REPLACE INTO fsy_lessons (year, month, sunday_number, organization, title, description, url) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .bind(l.year, l.month, l.sunday_number, l.organization, l.title, l.description || "", l.url)
    );
    await db.batch(stmts);
  }
  return { count: lessons.length };
}
export async function getConferenceMetaD1(db: D1Database): Promise<{ years: number[]; speakers: string[] }> {
  await ensureD1Schema(db);
  const yearRes = await db.prepare("SELECT DISTINCT year FROM conference_talks ORDER BY year DESC").all<any>();
  const years = (yearRes.results || []).map((r: any) => r.year);

  const speakerRes = await db.prepare(
    "SELECT speaker, COUNT(*) as count FROM conference_talks WHERE speaker NOT LIKE '%Session%' AND speaker NOT LIKE '%Auditor%' GROUP BY speaker ORDER BY count DESC, speaker ASC"
  ).all<any>();
  const speakers = (speakerRes.results || []).map((r: any) => r.speaker);

  return { years, speakers };
}

export async function getFsyMetaD1(db: D1Database): Promise<{ months: { month: number; year: number }[] }> {
  await ensureD1Schema(db);
  const res = await db.prepare("SELECT DISTINCT year, month FROM fsy_lessons ORDER BY year DESC, month ASC").all<any>();
  return { months: res.results || [] };
}

export async function authenticateUserD1(db: D1Database, inputString: string) {
  await ensureD1Schema(db);
  const trimmed = inputString.trim();
  if (!trimmed) return { success: false, error: "Please enter your name or phone number and passkey" };

  let name = "";
  let passkey = "";

  const lower = trimmed.toLowerCase();
  if (lower.endsWith("dowleswaram")) {
    passkey = "dowleswaram";
    name = trimmed.slice(0, trimmed.length - "dowleswaram".length).trim();
  } else {
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

  const user = await db
    .prepare("SELECT * FROM auth_users WHERE LOWER(name) = LOWER(?) AND LOWER(passkey) = LOWER(?) AND is_active = 1")
    .bind(name, passkey)
    .first<any>();

  if (user) {
    await db.prepare("UPDATE auth_users SET last_login = CURRENT_TIMESTAMP WHERE id = ?").bind(user.id).run();
    return { success: true, user };
  }

  if (passkey === "dowleswaram" && name.length >= 2) {
    try {
      await db.prepare("INSERT INTO auth_users (name, passkey, role, is_active, last_login) VALUES (?, ?, 'Leader', 1, CURRENT_TIMESTAMP)")
        .bind(name, "dowleswaram").run();
      const newUser = await db.prepare("SELECT * FROM auth_users WHERE LOWER(name) = LOWER(?)").bind(name).first<any>();
      return { success: true, user: newUser };
    } catch {
      const existing = await db.prepare("SELECT * FROM auth_users WHERE LOWER(name) = LOWER(?)").bind(name).first<any>();
      if (existing && existing.passkey.toLowerCase() === passkey) {
        return { success: true, user: existing };
      }
    }
  }

  return { success: false, error: "Invalid credentials. Use your name or phone number followed by 'dowleswaram' without spaces (e.g. Bishopdowleswaram)." };
}

export async function getAllAuthUsersD1(db: D1Database) {
  await ensureD1Schema(db);
  const res = await db.prepare("SELECT id, name, passkey, role, is_active, last_login, created_at FROM auth_users ORDER BY name ASC").all<any>();
  return res.results || [];
}

export async function saveAuthUserD1(
  db: D1Database,
  data: { id?: number; name: string; passkey?: string; role?: string; is_active?: number }
) {
  await ensureD1Schema(db);
  const name = data.name.trim();
  const passkey = (data.passkey || "dowleswaram").trim();
  const role = (data.role || "Leader").trim();
  const isActive = data.is_active !== undefined ? data.is_active : 1;

  if (!name) return { success: false, error: "Name cannot be empty" };

  if (data.id) {
    await db.prepare("UPDATE auth_users SET name = ?, passkey = ?, role = ?, is_active = ? WHERE id = ?")
      .bind(name, passkey, role, isActive, data.id).run();
    const updated = await db.prepare("SELECT * FROM auth_users WHERE id = ?").bind(data.id).first<any>();
    return { success: true, user: updated };
  } else {
    try {
      await db.prepare("INSERT INTO auth_users (name, passkey, role, is_active) VALUES (?, ?, ?, ?)")
        .bind(name, passkey, role, isActive).run();
      const inserted = await db.prepare("SELECT * FROM auth_users WHERE LOWER(name) = LOWER(?)").bind(name).first<any>();
      return { success: true, user: inserted };
    } catch {
      return { success: false, error: "A leader login with this name already exists" };
    }
  }
}

export async function deleteAuthUserD1(db: D1Database, id: number) {
  await ensureD1Schema(db);
  await db.prepare("DELETE FROM auth_users WHERE id = ?").bind(id).run();
  return { success: true };
}
