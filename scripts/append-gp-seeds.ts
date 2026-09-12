import * as fs from "fs";
import * as path from "path";

const gpPath = path.join(process.cwd(), "data", "gospel-principles.json");
const data = JSON.parse(fs.readFileSync(gpPath, "utf-8"));

let sql = "\n-- Gospel Principles Seed Data (Youth Talks)\nCREATE TABLE IF NOT EXISTS gospel_principles (id INTEGER PRIMARY KEY AUTOINCREMENT, chapter_number INTEGER NOT NULL, title TEXT NOT NULL, url TEXT NOT NULL, UNIQUE(chapter_number));\n";

for (const item of data) {
  const title = item.title.replace(/'/g, "''");
  const url = item.url.replace(/'/g, "''");
  sql += `INSERT OR REPLACE INTO gospel_principles (chapter_number, title, url) VALUES (${item.chapter_number}, '${title}', '${url}');\n`;
}

const seedPath = path.join(process.cwd(), "seeds", "church_seeds.sql");
fs.appendFileSync(seedPath, sql, "utf-8");
console.log(`Appended ${data.length} Gospel Principles statements to ${seedPath}`);
