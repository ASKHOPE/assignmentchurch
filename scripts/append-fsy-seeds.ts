import * as fs from "fs";
import * as path from "path";

const fsyPath = path.join(process.cwd(), "data", "fsy-lessons.json");
const data = JSON.parse(fs.readFileSync(fsyPath, "utf-8"));

let sql = "\n-- For the Strength of Youth (FSY) Sunday Lessons Seed Data\nCREATE TABLE IF NOT EXISTS fsy_lessons (id INTEGER PRIMARY KEY AUTOINCREMENT, year INTEGER NOT NULL, month INTEGER NOT NULL, sunday_number INTEGER NOT NULL, organization TEXT NOT NULL, title TEXT NOT NULL, description TEXT, url TEXT NOT NULL, UNIQUE(year, month, sunday_number, organization));\n";

for (const item of data) {
  const title = item.title.replace(/'/g, "''");
  const desc = (item.description || "").replace(/'/g, "''");
  const url = item.url.replace(/'/g, "''");
  sql += `INSERT OR REPLACE INTO fsy_lessons (year, month, sunday_number, organization, title, description, url) VALUES (${item.year}, ${item.month}, ${item.sunday_number}, '${item.organization}', '${title}', '${desc}', '${url}');\n`;
}

const seedPath = path.join(process.cwd(), "seeds", "church_seeds.sql");
fs.appendFileSync(seedPath, sql, "utf-8");
console.log(`Appended ${data.length} FSY lessons statements to ${seedPath}`);
