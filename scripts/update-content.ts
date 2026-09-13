import fs from "fs";
import path from "path";
import { Database } from "bun:sqlite";
import { scrapeConferenceTalks } from "./scrape-conference";

export async function updateAllContent(dbPath = "agenda.db") {
  console.log("=== Checking for new Church Content (FSY & General Conference) ===");

  // 1. Scrape latest conference talks
  const currentYear = new Date().getFullYear();
  const talkResults = await scrapeConferenceTalks(currentYear - 1, currentYear + 1);

  // 2. Scrape FSY Lessons for upcoming months
  const fsyPath = path.join(process.cwd(), "data", "fsy-lessons.json");
  let fsyLessons: any[] = [];
  if (fsyExists(fsyPath)) {
    fsyLessons = JSON.parse(fs.readFileSync(fsyPath, "utf-8"));
  }

  function fsyExists(p: string) { return fs.existsSync(p); }

  console.log(`Current FSY lessons: ${fsyLessons.length}`);

  // 3. Reseed database if agenda.db exists
  if (fs.existsSync(dbPath)) {
    const db = new Database(dbPath);
    try {
      const allTalks = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "conference-talks.json"), "utf-8"));
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO conference_talks (year, month, conference_name, session, title, speaker, url)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      const tx = db.transaction((rows: any[]) => {
        for (const t of rows) {
          stmt.run(t.year, t.month, t.conference_name, t.session || "General Session", t.title, t.speaker, t.url);
        }
      });
      tx(allTalks);
      console.log(`Database ${dbPath} synced with ${allTalks.length} conference talks.`);
    } catch (e: any) {
      console.error("DB sync error:", e.message);
    } finally {
      db.close();
    }
  }

  return {
    success: true,
    talksAdded: talkResults.added,
    totalTalks: talkResults.total,
    fsyCount: fsyLessons.length,
    timestamp: new Date().toISOString()
  };
}

if (import.meta.main) {
  updateAllContent().then(r => console.log("Result:", r)).catch(console.error);
}
