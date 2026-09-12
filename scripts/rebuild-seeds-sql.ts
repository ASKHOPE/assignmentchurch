import * as fs from "fs";
import * as path from "path";

const hymns = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "hymns.json"), "utf-8"));
const talks = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "conference-talks.json"), "utf-8"));
const cfm = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "come-follow-me.json"), "utf-8"));
const gp = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "gospel-principles.json"), "utf-8"));
const fsy = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "fsy-lessons.json"), "utf-8"));

let sql = `-- Cleaned and Verified Church Content Seed Data
CREATE TABLE IF NOT EXISTS hymns (id INTEGER PRIMARY KEY AUTOINCREMENT, book TEXT NOT NULL, number INTEGER NOT NULL, title TEXT NOT NULL, url TEXT NOT NULL, UNIQUE(book, number));
CREATE TABLE IF NOT EXISTS conference_talks (id INTEGER PRIMARY KEY AUTOINCREMENT, year INTEGER NOT NULL, month INTEGER NOT NULL, conference_name TEXT NOT NULL, session TEXT NOT NULL, title TEXT NOT NULL, speaker TEXT NOT NULL, url TEXT NOT NULL, UNIQUE(year, month, url));
CREATE TABLE IF NOT EXISTS come_follow_me (id INTEGER PRIMARY KEY AUTOINCREMENT, year INTEGER NOT NULL, book_title TEXT NOT NULL, week_number INTEGER, date_range TEXT, title TEXT NOT NULL, scriptures TEXT, url TEXT NOT NULL, UNIQUE(year, url));
CREATE TABLE IF NOT EXISTS gospel_principles (id INTEGER PRIMARY KEY AUTOINCREMENT, chapter_number INTEGER NOT NULL UNIQUE, title TEXT NOT NULL, url TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS fsy_lessons (id INTEGER PRIMARY KEY AUTOINCREMENT, year INTEGER NOT NULL, month INTEGER NOT NULL, sunday_number INTEGER NOT NULL, organization TEXT NOT NULL, title TEXT NOT NULL, description TEXT, url TEXT NOT NULL, UNIQUE(year, month, sunday_number, organization));

-- Clear existing data before re-seeding
DELETE FROM hymns;
DELETE FROM conference_talks;
DELETE FROM come_follow_me;
DELETE FROM gospel_principles;
DELETE FROM fsy_lessons;
`;

// Hymns
for (const h of hymns) {
  const b = h.book.replace(/'/g, "''");
  const t = h.title.replace(/'/g, "''");
  const u = h.url.replace(/'/g, "''");
  sql += `INSERT INTO hymns (book, number, title, url) VALUES ('${b}', ${h.number}, '${t}', '${u}');\n`;
}

// Talks
for (const t of talks) {
  const cname = t.conference_name.replace(/'/g, "''");
  const sess = (t.session || "").replace(/'/g, "''");
  const tit = t.title.replace(/'/g, "''");
  const spk = t.speaker.replace(/'/g, "''");
  const u = t.url.replace(/'/g, "''");
  sql += `INSERT INTO conference_talks (year, month, conference_name, session, title, speaker, url) VALUES (${t.year}, ${t.month}, '${cname}', '${sess}', '${tit}', '${spk}', '${u}');\n`;
}

// CFM
for (const c of cfm) {
  const bt = c.book_title.replace(/'/g, "''");
  const dr = (c.date_range || "").replace(/'/g, "''");
  const tit = c.title.replace(/'/g, "''");
  const scr = (c.scriptures || "").replace(/'/g, "''");
  const u = c.url.replace(/'/g, "''");
  sql += `INSERT INTO come_follow_me (year, book_title, week_number, date_range, title, scriptures, url) VALUES (${c.year}, '${bt}', ${c.week_number || 0}, '${dr}', '${tit}', '${scr}', '${u}');\n`;
}

// Gospel Principles
for (const g of gp) {
  const tit = g.title.replace(/'/g, "''");
  const u = g.url.replace(/'/g, "''");
  sql += `INSERT INTO gospel_principles (chapter_number, title, url) VALUES (${g.chapter_number}, '${tit}', '${u}');\n`;
}

// FSY
for (const f of fsy) {
  const tit = f.title.replace(/'/g, "''");
  const desc = (f.description || "").replace(/'/g, "''");
  const u = f.url.replace(/'/g, "''");
  sql += `INSERT INTO fsy_lessons (year, month, sunday_number, organization, title, description, url) VALUES (${f.year}, ${f.month}, ${f.sunday_number}, '${f.organization}', '${tit}', '${desc}', '${u}');\n`;
}

const seedPath = path.join(process.cwd(), "seeds", "church_seeds.sql");
fs.writeFileSync(seedPath, sql, "utf-8");
console.log(`Successfully generated ${seedPath}`);
