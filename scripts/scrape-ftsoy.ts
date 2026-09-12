import { chromium } from "playwright";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("Launching browser for FTSOY scraping...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.route("**/*.{png,jpg,jpeg,svg,webp,woff,woff2,gif,css}", route => route.abort());

  const rootUrl = "https://www.churchofjesuschrist.org/study/youth/for-the-strength-of-youth-magazine?lang=eng";
  console.log(`Navigating to ${rootUrl}...`);
  await page.goto(rootUrl, { waitUntil: "domcontentloaded", timeout: 45000 });

  const rawLinks = await page.$$eval("a", els =>
    els.map(e => ({ href: e.getAttribute("href") || "", text: e.textContent?.trim() || "" }))
  );

  console.log(`Found ${rawLinks.length} total links on root page.`);
  
  // Filter for month issues, e.g. /ftsoy/2026/09, /study/ftsoy/2026/...
  const monthIssues = rawLinks.filter(l => l.href.includes("ftsoy") && (l.href.includes("2026") || l.href.includes("2025") || l.href.includes("2024")));
  console.log("Month issues found:", monthIssues.length);
  console.log("Sample issues:", monthIssues.slice(0, 10));

  // Let's specifically visit September 2026 and surrounding months
  const targetIssues = [
    { year: 2026, month: 9, url: "https://www.churchofjesuschrist.org/study/ftsoy/2026/09?lang=eng" },
    { year: 2026, month: 10, url: "https://www.churchofjesuschrist.org/study/ftsoy/2026/10?lang=eng" },
    { year: 2026, month: 11, url: "https://www.churchofjesuschrist.org/study/ftsoy/2026/11?lang=eng" },
    { year: 2026, month: 12, url: "https://www.churchofjesuschrist.org/study/ftsoy/2026/12?lang=eng" },
  ];

  const allLessons: any[] = [];

  for (const issue of targetIssues) {
    console.log(`Checking issue: ${issue.year}/${issue.month} -> ${issue.url}`);
    try {
      await page.goto(issue.url, { waitUntil: "domcontentloaded", timeout: 25000 });
      const issueLinks = await page.$$eval("a", els =>
        els.map(e => ({ href: e.getAttribute("href") || "", text: e.textContent?.replace(/\s+/g, " ")?.trim() || "" }))
      );

      // Find links pointing to fsy-lessons or youth lessons
      const fsyLinks = issueLinks.filter(l => l.href.includes("fsy-lessons") || l.href.includes("sunday-lessons") || l.text.toLowerCase().includes("sunday"));
      console.log(`Found ${fsyLinks.length} candidate lesson links in ${issue.year}/${issue.month}`);

      for (const l of fsyLinks) {
        let cleanUrl = l.href;
        if (cleanUrl.startsWith("/")) cleanUrl = `https://www.churchofjesuschrist.org${cleanUrl}`;
        if (!cleanUrl.includes("?lang=eng")) cleanUrl += "?lang=eng";
        
        allLessons.push({
          year: issue.year,
          month: issue.month,
          text: l.text,
          url: cleanUrl,
        });
      }
    } catch (e: any) {
      console.warn(`Could not load issue ${issue.year}/${issue.month}:`, e?.message);
    }
  }

  console.log(`Total lessons collected: ${allLessons.length}`);
  console.log(JSON.stringify(allLessons, null, 2));

  await browser.close();
}

main().catch(err => {
  console.error("FTSOY scrape error:", err);
  process.exit(1);
});
