import * as fs from "fs";
import * as path from "path";
import { Database } from "bun:sqlite";

/**
 * Script to clean, deduplicate and optimize conference talks in data/conference-talks.json
 * and the SQLite database.
 */
export function deduplicateAndCleanTalks() {
  const talksPath = path.join(process.cwd(), "data", "conference-talks.json");
  if (!fs.existsSync(talksPath)) return;

  const rawTalks: any[] = JSON.parse(fs.readFileSync(talksPath, "utf-8"));
  console.log(`Original conference talks: ${rawTalks.length}`);

  const proceduralTitles = [
    "Church Auditing Department Report",
    "Statistical Report",
    "The Sustaining of Church Officers",
    "Sustaining of General Authorities, Area Seventies, and General Officers"
  ];

  function isProcedural(t: any) {
    if (t.speaker && t.speaker.includes("Session") && t.title && t.title.includes("Session")) return true;
    for (const pt of proceduralTitles) {
      if (t.title.toLowerCase().includes(pt.toLowerCase())) return true;
    }
    return false;
  }

  const byKey = new Map<string, any>();

  for (const t of rawTalks) {
    if (isProcedural(t)) continue;

    const key = `${t.year}-${t.month}-${t.speaker.toLowerCase().trim()}-${t.title.toLowerCase().trim()}`;
    if (byKey.has(key)) {
      const existing = byKey.get(key);
      const existingIsSession = existing.url.includes("-session") || existing.url.includes("priesthood-session") || existing.url.includes("womens-session");
      const currentIsSession = t.url.includes("-session") || t.url.includes("priesthood-session") || t.url.includes("womens-session");

      // Prefer the specific individual talk URL over a whole-session URL
      if (existingIsSession && !currentIsSession) {
        byKey.set(key, t);
      }
    } else {
      byKey.set(key, t);
    }
  }

  const cleaned = Array.from(byKey.values());
  cleaned.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    if (a.month !== b.month) return b.month - a.month;
    return a.title.localeCompare(b.title);
  });

  fs.writeFileSync(talksPath, JSON.stringify(cleaned, null, 2), "utf-8");
  console.log(`Deduplicated and clean conference talks: ${cleaned.length}`);

  // Also update agenda.db if present
  const dbPath = path.join(process.cwd(), "agenda.db");
  if (fs.existsSync(dbPath)) {
    const db = new Database(dbPath);
    try {
      db.run("DELETE FROM conference_talks;");
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO conference_talks (year, month, conference_name, session, title, speaker, url)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      const tx = db.transaction((rows: any[]) => {
        for (const r of rows) {
          stmt.run(r.year, r.month, r.conference_name, r.session || "General Session", r.title, r.speaker, r.url);
        }
      });
      tx(cleaned);
      console.log(`Updated agenda.db conference_talks table with ${cleaned.length} rows.`);
    } catch (e: any) {
      console.error("Error updating agenda.db:", e.message);
    } finally {
      db.close();
    }
  }
}

if (import.meta.main) {
  deduplicateAndCleanTalks();
}
