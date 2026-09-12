import * as fs from "fs";
import * as path from "path";

// 1. Clean Conference Talks
console.log("Cleaning Conference Talks...");
const talksPath = path.join(process.cwd(), "data", "conference-talks.json");
const rawTalks = JSON.parse(fs.readFileSync(talksPath, "utf-8"));

const cleanedTalks: any[] = [];
const nonTalkSlugs = ["contents", "/session", "report", "auditing"];

for (const t of rawTalks) {
  // Skip TOC or contents
  if (t.title.toLowerCase() === "contents" || t.speaker.toLowerCase() === "contents") continue;
  if (!t.url.match(/\/\d{2,}[a-z]/i) && !t.url.match(/\/general-conference\/\d{4}\/\d{2}\/[a-z0-9-]+/)) continue;

  let realSpeaker = t.title;
  let realTitle = t.speaker;

  // If title was "Church Leader" and speaker was title
  if (t.speaker === "Church Leader") {
    realSpeaker = "Church Leader";
    realTitle = t.title;
  }

  // Clean any leading numbers in title
  realTitle = realTitle.replace(/^(\d+\.?\s*)/, "").trim();

  cleanedTalks.push({
    year: t.year,
    month: t.month,
    conference_name: t.conference_name,
    session: t.session || "General Session",
    speaker: realSpeaker.trim(),
    title: realTitle.trim(),
    url: t.url,
  });
}

console.log(`Cleaned ${cleanedTalks.length} conference talks.`);
fs.writeFileSync(talksPath, JSON.stringify(cleanedTalks, null, 2), "utf-8");

// 2. Clean Hymns
console.log("Cleaning Hymns...");
const hymnsPath = path.join(process.cwd(), "data", "hymns.json");
const rawHymns = JSON.parse(fs.readFileSync(hymnsPath, "utf-8"));

const cleanedHymns = rawHymns.map((h: any) => {
  let title = h.title.trim();
  // Fix Children Songbook prefix 'aA ', 'aFor ', etc.
  if (h.book.includes("Children")) {
    title = title.replace(/^a([A-Z])/, "$1");
  }
  return {
    ...h,
    title,
  };
});

// Sort hymns: Hymns (1985) first (1-341), then Hymns for Home and Church (1001-1082), then Children's Songbook
cleanedHymns.sort((a: any, b: any) => {
  const getBookPriority = (book: string) => {
    if (book.includes("1985")) return 1;
    if (book.includes("Home")) return 2;
    return 3;
  };
  const pA = getBookPriority(a.book);
  const pB = getBookPriority(b.book);
  if (pA !== pB) return pA - pB;
  return a.number - b.number;
});

fs.writeFileSync(hymnsPath, JSON.stringify(cleanedHymns, null, 2), "utf-8");
console.log(`Cleaned and prioritized ${cleanedHymns.length} hymns.`);
