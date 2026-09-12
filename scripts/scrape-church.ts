/**
 * Church Resources Scraper using Playwright
 * Scrapes Hymns (1985, Children's Songbook, Hymns for Home & Church),
 * General Conference Talks (2020-2026), and Come, Follow Me curriculum.
 * Persists into SQLite (agenda.db), seeds/church_seeds.sql, and data/*.json.
 */

import { chromium, type Page } from "playwright";
import { Database } from "bun:sqlite";
import fs from "node:fs";
import path from "node:path";

export interface ScrapedHymn {
  book: string;
  number: number;
  title: string;
  url: string;
}

export interface ScrapedTalk {
  year: number;
  month: number;
  conference_name: string;
  session: string;
  speaker: string;
  title: string;
  url: string;
}

export interface ScrapedCfm {
  year: number;
  book_title: string;
  week_number: number;
  date_range: string;
  title: string;
  scriptures: string;
  url: string;
}

async function createOptimizedPage(browser: any): Promise<Page> {
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  // Block images, fonts, media, and third-party trackers for 10x scraping speed
  await context.route("**/*", (route: any) => {
    const type = route.request().resourceType();
    const url = route.request().url();
    if (
      ["image", "font", "media"].includes(type) ||
      url.includes("analytics") ||
      url.includes("adobe") ||
      url.includes("googletagmanager") ||
      url.includes("facebook")
    ) {
      return route.abort();
    }
    return route.continue();
  });

  return await context.newPage();
}

/**
 * Scrape all Hymn Books
 */
async function scrapeAllHymns(page: Page): Promise<ScrapedHymn[]> {
  const allHymns: ScrapedHymn[] = [];
  const seen = new Set<string>();

  // 1. Hymns (1985)
  console.log("-> Scraping Hymns (1985)...");
  await page.goto("https://www.churchofjesuschrist.org/study/manual/hymns?lang=eng", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(2500);

  const rawHymns = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll("a"));
    return anchors
      .map(a => ({ text: a.innerText.trim(), href: a.href }))
      .filter(a => /\/study\/manual\/hymns\/[a-z0-9-]+/.test(a.href));
  });

  for (const item of rawHymns) {
    // text typically starts with number: e.g. "1The Morning Breaks" or "105Brightly Beams Our Father’s Mercy"
    const match = item.text.match(/^(\d+)\s*(.+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      const title = match[2].trim();
      const key = `Hymns-${num}`;
      if (!seen.has(key) && num > 0 && num <= 400) {
        seen.add(key);
        allHymns.push({
          book: "Hymns (1985)",
          number: num,
          title,
          url: item.href,
        });
      }
    }
  }
  console.log(`   Captured ${allHymns.length} hymns from Hymns (1985).`);

  // 2. Children's Songbook
  console.log("-> Scraping Children's Songbook...");
  await page.goto("https://www.churchofjesuschrist.org/study/manual/childrens-songbook?lang=eng", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(2500);

  const rawCS = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll("a"));
    return anchors
      .map(a => ({ text: a.innerText.trim(), href: a.href }))
      .filter(a => /\/study\/manual\/childrens-songbook\/[a-z0-9-]+/.test(a.href));
  });

  let csCount = 0;
  for (const item of rawCS) {
    const match = item.text.match(/^(\d+)\s*(.+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      const title = match[2].trim();
      const key = `CS-${num}`;
      if (!seen.has(key) && num > 0 && num <= 400) {
        seen.add(key);
        csCount++;
        allHymns.push({
          book: "Children's Songbook",
          number: num,
          title,
          url: item.href,
        });
      }
    }
  }
  console.log(`   Captured ${csCount} songs from Children's Songbook.`);

  // 3. Hymns for Home and Church (New releases: 1001+)
  console.log("-> Scraping Hymns for Home and Church...");
  await page.goto("https://www.churchofjesuschrist.org/study/music/hymns-for-home-and-church?lang=eng", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(2500);

  const rawNewHymns = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll("a"));
    return anchors
      .map(a => ({ text: a.innerText.trim(), href: a.href }))
      .filter(a => a.href.includes("/hymns-for-home-and-church/"));
  });

  let newCount = 0;
  for (const item of rawNewHymns) {
    const match = item.text.match(/^(\d{4})\s*(.+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      const title = match[2].trim();
      const key = `New-${num}`;
      if (!seen.has(key)) {
        seen.add(key);
        newCount++;
        allHymns.push({
          book: "Hymns for Home and Church",
          number: num,
          title,
          url: item.href,
        });
      }
    }
  }
  console.log(`   Captured ${newCount} new hymns from Hymns for Home and Church.`);

  // Sort by book then number
  allHymns.sort((a, b) => a.book.localeCompare(b.book) || a.number - b.number);
  return allHymns;
}

/**
 * Scrape General Conference Talks
 */
async function scrapeGeneralConferences(page: Page): Promise<ScrapedTalk[]> {
  const allTalks: ScrapedTalk[] = [];
  const conferences = [
    { year: 2026, month: 4, name: "April 2026" },
    { year: 2025, month: 10, name: "October 2025" },
    { year: 2025, month: 4, name: "April 2025" },
    { year: 2024, month: 10, name: "October 2024" },
    { year: 2024, month: 4, name: "April 2024" },
    { year: 2023, month: 10, name: "October 2023" },
    { year: 2023, month: 4, name: "April 2023" },
    { year: 2022, month: 10, name: "October 2022" },
    { year: 2022, month: 4, name: "April 2022" },
    { year: 2021, month: 10, name: "October 2021" },
    { year: 2021, month: 4, name: "April 2021" },
    { year: 2020, month: 10, name: "October 2020" },
    { year: 2020, month: 4, name: "April 2020" },
  ];

  const seenUrls = new Set<string>();

  for (const conf of conferences) {
    const monthPad = String(conf.month).padStart(2, "0");
    const confUrl = `https://www.churchofjesuschrist.org/study/general-conference/${conf.year}/${monthPad}?lang=eng`;
    console.log(`-> Scraping ${conf.name} (${confUrl})...`);

    try {
      await page.goto(confUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
      await page.waitForTimeout(2000);

      const items = await page.evaluate((confUrlPrefix) => {
        const anchors = Array.from(document.querySelectorAll("a"));
        return anchors
          .map(a => {
            // Find speaker / subtitle if present inside the card
            const titleElem = a.querySelector("h4, [class*='title'], span[class*='primary']");
            const authorElem = a.querySelector("p, [class*='author'], [class*='subtitle']");
            const fullText = a.innerText.replace(/\r?\n+/g, " | ").trim();
            return {
              href: a.href,
              fullText,
              title: titleElem?.textContent?.trim() || "",
              author: authorElem?.textContent?.trim() || "",
            };
          })
          .filter(a => a.href.startsWith(confUrlPrefix) && a.href !== confUrlPrefix && !a.href.endsWith("/session"));
      }, `https://www.churchofjesuschrist.org/study/general-conference/${conf.year}/${monthPad}`);

      let sessionCurrent = "General Session";

      for (const item of items) {
        if (seenUrls.has(item.href)) continue;

        // Check if item is a session heading (e.g. "Saturday Morning Session")
        if (item.fullText.toLowerCase().includes("session") && !item.fullText.includes("|")) {
          sessionCurrent = item.fullText;
          continue;
        }

        // Parse title and speaker
        let title = item.title;
        let speaker = item.author;

        if (!title || !speaker) {
          const parts = item.fullText.split("|").map(p => p.trim());
          if (parts.length >= 2) {
            title = parts[0];
            speaker = parts[1];
          } else {
            title = item.fullText;
            speaker = "Church Leader";
          }
        }

        // Clean up common title boilerplate
        title = title.replace(/^[\d\s]+/, "").trim();
        if (title.length < 3) continue;

        seenUrls.add(item.href);
        allTalks.push({
          year: conf.year,
          month: conf.month,
          conference_name: conf.name,
          session: sessionCurrent,
          title,
          speaker,
          url: item.href,
        });
      }

      console.log(`   Captured ${allTalks.filter(t => t.year === conf.year && t.month === conf.month).length} talks for ${conf.name}.`);
    } catch (err: any) {
      console.warn(`   Warning: Could not fetch ${conf.name}: ${err.message}`);
    }
  }

  return allTalks;
}

/**
 * Scrape Come, Follow Me curriculum
 */
async function scrapeComeFollowMe(page: Page): Promise<ScrapedCfm[]> {
  const allCfm: ScrapedCfm[] = [];
  const seen = new Set<string>();

  const manuals = [
    {
      year: 2026,
      book_title: "Old Testament 2026",
      url: "https://www.churchofjesuschrist.org/study/manual/come-follow-me-for-home-and-church-old-testament-2026?lang=eng",
      filterSlug: "come-follow-me-for-home-and-church-old-testament-2026",
    },
    {
      year: 2025,
      book_title: "Doctrine and Covenants 2025",
      url: "https://www.churchofjesuschrist.org/study/come-follow-me/previous-years/doctrine-and-covenants-2025?lang=eng",
      filterSlug: "doctrine-and-covenants",
    },
    {
      year: 2024,
      book_title: "Book of Mormon 2024",
      url: "https://www.churchofjesuschrist.org/study/come-follow-me/previous-years/book-of-mormon-2024?lang=eng",
      filterSlug: "book-of-mormon",
    },
  ];

  for (const man of manuals) {
    console.log(`-> Scraping CFM for ${man.book_title}...`);
    try {
      await page.goto(man.url, { waitUntil: "domcontentloaded", timeout: 20000 });
      await page.waitForTimeout(2000);

      const lessons = await page.evaluate((slug) => {
        const anchors = Array.from(document.querySelectorAll("a"));
        return anchors
          .map(a => ({
            text: a.innerText.replace(/\r?\n+/g, " | ").trim(),
            href: a.href,
          }))
          .filter(a => a.href.includes(slug) && a.text.length > 5);
      }, man.filterSlug);

      let weekNum = 1;
      for (const item of lessons) {
        if (seen.has(item.href)) continue;
        if (item.text.toLowerCase().includes("intro") || item.text.toLowerCase().includes("overview")) continue;

        // Examples:
        // "January 5–11 | Genesis 1–2; Moses 2–3; Abraham 4–5 | “In the Beginning God Created the Heaven and the Earth”"
        const parts = item.text.split("|").map(p => p.trim());
        let date_range = "";
        let scriptures = "";
        let title = item.text;

        if (parts.length >= 3) {
          date_range = parts[0];
          scriptures = parts[1];
          title = parts[2];
        } else if (parts.length === 2) {
          date_range = parts[0];
          title = parts[1];
        }

        seen.add(item.href);
        allCfm.push({
          year: man.year,
          book_title: man.book_title,
          week_number: weekNum++,
          date_range,
          title,
          scriptures,
          url: item.href,
        });
      }

      console.log(`   Captured ${allCfm.filter(c => c.year === man.year).length} lessons for ${man.book_title}.`);
    } catch (err: any) {
      console.warn(`   Warning: Could not fetch CFM ${man.book_title}: ${err.message}`);
    }
  }

  return allCfm;
}

/**
 * Persist scraped data to SQLite database
 */
function saveToDatabase(hymns: ScrapedHymn[], talks: ScrapedTalk[], cfm: ScrapedCfm[]) {
  const dbPath = path.resolve(process.cwd(), "agenda.db");
  console.log(`-> Persisting into SQLite at ${dbPath}...`);
  const db = new Database(dbPath);

  // Ensure tables exist
  db.exec(`
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

  // Insert Hymns
  const insertHymn = db.prepare(`
    INSERT INTO hymns (book, number, title, url)
    VALUES ($book, $number, $title, $url)
    ON CONFLICT(book, number) DO UPDATE SET title = excluded.title, url = excluded.url
  `);

  db.transaction(() => {
    for (const h of hymns) {
      insertHymn.run({ $book: h.book, $number: h.number, $title: h.title, $url: h.url });
    }
  })();

  // Insert Talks
  const insertTalk = db.prepare(`
    INSERT INTO conference_talks (year, month, conference_name, session, title, speaker, url)
    VALUES ($year, $month, $conference_name, $session, $title, $speaker, $url)
    ON CONFLICT(year, month, url) DO UPDATE SET title = excluded.title, speaker = excluded.speaker, session = excluded.session
  `);

  db.transaction(() => {
    for (const t of talks) {
      insertTalk.run({
        $year: t.year,
        $month: t.month,
        $conference_name: t.conference_name,
        $session: t.session,
        $title: t.title,
        $speaker: t.speaker,
        $url: t.url,
      });
    }
  })();

  // Insert CFM
  const insertCfm = db.prepare(`
    INSERT INTO come_follow_me (year, book_title, week_number, date_range, title, scriptures, url)
    VALUES ($year, $book_title, $week_number, $date_range, $title, $scriptures, $url)
    ON CONFLICT(year, url) DO UPDATE SET title = excluded.title, scriptures = excluded.scriptures, date_range = excluded.date_range
  `);

  db.transaction(() => {
    for (const c of cfm) {
      insertCfm.run({
        $year: c.year,
        $book_title: c.book_title,
        $week_number: c.week_number,
        $date_range: c.date_range,
        $title: c.title,
        $scriptures: c.scriptures,
        $url: c.url,
      });
    }
  })();

  console.log("   SQLite persistence completed successfully!");
}

/**
 * Generate D1 SQL seed file and JSON caches
 */
function exportSeedsAndJson(hymns: ScrapedHymn[], talks: ScrapedTalk[], cfm: ScrapedCfm[]) {
  const dataDir = path.resolve(process.cwd(), "data");
  const seedsDir = path.resolve(process.cwd(), "seeds");

  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(seedsDir)) fs.mkdirSync(seedsDir, { recursive: true });

  // Write JSON files
  fs.writeFileSync(path.join(dataDir, "hymns.json"), JSON.stringify(hymns, null, 2), "utf8");
  fs.writeFileSync(path.join(dataDir, "conference-talks.json"), JSON.stringify(talks, null, 2), "utf8");
  fs.writeFileSync(path.join(dataDir, "come-follow-me.json"), JSON.stringify(cfm, null, 2), "utf8");
  console.log("-> Wrote data/hymns.json, data/conference-talks.json, data/come-follow-me.json");

  // Write SQL seed file for Cloudflare D1
  const sqlStatements: string[] = [
    "-- Church Content Seed Data for Cloudflare D1",
    "CREATE TABLE IF NOT EXISTS hymns (id INTEGER PRIMARY KEY AUTOINCREMENT, book TEXT NOT NULL, number INTEGER NOT NULL, title TEXT NOT NULL, url TEXT NOT NULL, UNIQUE(book, number));",
    "CREATE TABLE IF NOT EXISTS conference_talks (id INTEGER PRIMARY KEY AUTOINCREMENT, year INTEGER NOT NULL, month INTEGER NOT NULL, conference_name TEXT NOT NULL, session TEXT NOT NULL, title TEXT NOT NULL, speaker TEXT NOT NULL, url TEXT NOT NULL, UNIQUE(year, month, url));",
    "CREATE TABLE IF NOT EXISTS come_follow_me (id INTEGER PRIMARY KEY AUTOINCREMENT, year INTEGER NOT NULL, book_title TEXT NOT NULL, week_number INTEGER, date_range TEXT, title TEXT NOT NULL, scriptures TEXT, url TEXT NOT NULL, UNIQUE(year, url));",
  ];

  for (const h of hymns) {
    const escTitle = h.title.replace(/'/g, "''");
    const escBook = h.book.replace(/'/g, "''");
    const escUrl = h.url.replace(/'/g, "''");
    sqlStatements.push(`INSERT OR REPLACE INTO hymns (book, number, title, url) VALUES ('${escBook}', ${h.number}, '${escTitle}', '${escUrl}');`);
  }

  for (const t of talks) {
    const escConf = t.conference_name.replace(/'/g, "''");
    const escSess = t.session.replace(/'/g, "''");
    const escTitle = t.title.replace(/'/g, "''");
    const escSpeaker = t.speaker.replace(/'/g, "''");
    const escUrl = t.url.replace(/'/g, "''");
    sqlStatements.push(`INSERT OR REPLACE INTO conference_talks (year, month, conference_name, session, title, speaker, url) VALUES (${t.year}, ${t.month}, '${escConf}', '${escSess}', '${escTitle}', '${escSpeaker}', '${escUrl}');`);
  }

  for (const c of cfm) {
    const escBook = c.book_title.replace(/'/g, "''");
    const escDate = c.date_range.replace(/'/g, "''");
    const escTitle = c.title.replace(/'/g, "''");
    const escScriptures = c.scriptures.replace(/'/g, "''");
    const escUrl = c.url.replace(/'/g, "''");
    sqlStatements.push(`INSERT OR REPLACE INTO come_follow_me (year, book_title, week_number, date_range, title, scriptures, url) VALUES (${c.year}, '${escBook}', ${c.week_number}, '${escDate}', '${escTitle}', '${escScriptures}', '${escUrl}');`);
  }

  const seedFilePath = path.join(seedsDir, "church_seeds.sql");
  fs.writeFileSync(seedFilePath, sqlStatements.join("\n"), "utf8");
  console.log(`-> Wrote seeds/church_seeds.sql (${sqlStatements.length} SQL statements)`);
}

async function main() {
  console.log("==================================================");
  console.log("   Church Resources Scraper (Playwright Engine)   ");
  console.log("==================================================");
  const startTime = Date.now();

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await createOptimizedPage(browser);

    const hymns = await scrapeAllHymns(page);
    const talks = await scrapeGeneralConferences(page);
    const cfm = await scrapeComeFollowMe(page);

    console.log("==================================================");
    console.log(`Summary:`);
    console.log(`- Total Hymns Scraped: ${hymns.length}`);
    console.log(`- Total Talks Scraped: ${talks.length}`);
    console.log(`- Total CFM Lessons:   ${cfm.length}`);
    console.log("==================================================");

    saveToDatabase(hymns, talks, cfm);
    exportSeedsAndJson(hymns, talks, cfm);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`All operations completed in ${elapsed}s.`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("Scraping error:", err);
  process.exit(1);
});
