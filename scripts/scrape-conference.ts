import fs from "fs";
import path from "path";

export async function scrapeConferenceTalks(startYear = 2000, endYear = 2026) {
  const jsonPath = path.join(process.cwd(), "data", "conference-talks.json");
  let existingTalks: any[] = [];
  if (fs.existsSync(jsonPath)) {
    existingTalks = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  }
  const existingUrls = new Set(existingTalks.map(t => t.url));
  const months = [4, 10];
  const newTalks: any[] = [];

  console.log(`Scraping General Conference talks from ${startYear} to ${endYear}...`);

  for (let year = startYear; year <= endYear; year++) {
    for (const month of months) {
      const monthStr = month < 10 ? "0" + month : "" + month;
      const confName = `${month === 4 ? "April" : "October"} ${year}`;
      const url = `https://www.churchofjesuschrist.org/study/general-conference/${year}/${monthStr}?lang=eng`;
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const html = await res.text();
        const regex = /href="(\/study\/general-conference\/[0-9]{4}\/[0-9]{2}\/[^"?]+)\?[^"]*"[^>]*>[\s\S]*?<p><span>([^<]+)<\/span><\/p><p class="[^"]*">([^<]+)<\/p>/gi;
        let m;
        let count = 0;
        while ((m = regex.exec(html)) !== null) {
          const p = m[1];
          const title = m[2].trim().replace(/&amp;/g, "&").replace(/&#39;/g, String.fromCharCode(39));
          let speaker = m[3].trim().replace(/&amp;/g, "&").replace(/&#39;/g, String.fromCharCode(39));
          if (speaker.startsWith("By ")) speaker = speaker.replace(/^By\s+/, "");
          const fullUrl = `https://www.churchofjesuschrist.org${p}?lang=eng`;
          if (!existingUrls.has(fullUrl)) {
            existingUrls.add(fullUrl);
            newTalks.push({
              year,
              month,
              conference_name: confName,
              session: "General Session",
              speaker,
              title,
              url: fullUrl
            });
            count++;
          }
        }
        console.log(`[${confName}] Found ${count} talks`);
      } catch (e: any) {
        console.error(`Error on ${confName}:`, e.message);
      }
    }
  }

  const combined = [...existingTalks, ...newTalks].sort((a,b) => b.year - a.year || b.month - a.month);
  fs.writeFileSync(jsonPath, JSON.stringify(combined, null, 2));
  console.log(`Done! Total conference talks stored: ${combined.length} (added ${newTalks.length} new)`);
  return { total: combined.length, added: newTalks.length };
}

if (import.meta.main) {
  scrapeConferenceTalks().catch(console.error);
}
