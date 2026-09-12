import { chromium } from "playwright";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("Starting Gospel Principles scraper...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Abort media and style assets to load rapidly
  await page.route("**/*.{png,jpg,jpeg,svg,webp,woff,woff2,gif}", route => route.abort());

  const url = "https://www.churchofjesuschrist.org/study/manual/gospel-principles?lang=eng";
  console.log(`Navigating to ${url}...`);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });

  // Wait for content
  await page.waitForSelector("a[href*='chapter-']", { timeout: 15000 });

  const rawChapters = await page.$$eval("a[href*='chapter-']", elements => {
    return elements.map(el => {
      const href = el.getAttribute("href") || "";
      const text = el.textContent?.trim() || "";
      return { href, text };
    });
  });

  console.log(`Extracted ${rawChapters.length} raw links.`);

  // Parse into structured records
  const chapters: Array<{ chapter_number: number; title: string; url: string }> = [];
  const seenUrls = new Set<string>();

  for (const item of rawChapters) {
    let cleanUrl = item.href;
    if (cleanUrl.startsWith("/")) {
      cleanUrl = `https://www.churchofjesuschrist.org${cleanUrl}`;
    }
    if (!cleanUrl.includes("?lang=eng")) {
      cleanUrl += cleanUrl.includes("?") ? "&lang=eng" : "?lang=eng";
    }

    if (seenUrls.has(cleanUrl)) continue;
    seenUrls.add(cleanUrl);

    // Text is usually "Chapter 1: Our Heavenly Father" or "1. Our Heavenly Father" or "Chapter 1\nOur Heavenly Father"
    const cleanedText = item.text.replace(/\s+/g, " ").trim();
    const match = cleanedText.match(/Chapter\s+(\d+)[:.]?\s*(.*)/i) || cleanedText.match(/^(\d+)[:.]?\s*(.*)/);
    
    let chapterNum = 0;
    let title = cleanedText;

    if (match) {
      chapterNum = parseInt(match[1], 10);
      title = match[2]?.trim() || `Chapter ${chapterNum}`;
    } else {
      // Try parsing from url: /chapter-26-sacrifice
      const urlMatch = cleanUrl.match(/chapter-(\d+)-?(.*)\?/);
      if (urlMatch) {
        chapterNum = parseInt(urlMatch[1], 10);
        title = urlMatch[2]?.replace(/-/g, " ")?.trim() || `Chapter ${chapterNum}`;
        title = title.replace(/\b\w/g, l => l.toUpperCase());
      }
    }

    if (chapterNum > 0) {
      chapters.push({
        chapter_number: chapterNum,
        title,
        url: cleanUrl
      });
    }
  }

  // Sort by chapter number
  chapters.sort((a, b) => a.chapter_number - b.chapter_number);

  console.log(`Processed ${chapters.length} unique chapters.`);
  console.log("Sample chapters:", chapters.slice(0, 5));

  const outPath = path.join(process.cwd(), "data", "gospel-principles.json");
  fs.writeFileSync(outPath, JSON.stringify(chapters, null, 2), "utf-8");
  console.log(`Saved to ${outPath}`);

  await browser.close();
}

main().catch(err => {
  console.error("Scraper failed:", err);
  process.exit(1);
});
