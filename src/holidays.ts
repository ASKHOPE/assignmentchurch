/**
 * Holidays & Church Celebrations Service
 * Computes LDS Church commemorations and fetches Indian / Hindu holidays live from public iCal feeds.
 */

export type HolidayCategory = "lds" | "indian";

export interface HolidayEvent {
  date: string; // YYYY-MM-DD
  name: string;
  category: HolidayCategory;
  icon: string;
  description?: string;
  isMajor?: boolean;
}

// In-memory cache keyed by year
const holidaysCache: Record<string, { timestamp: number; data: HolidayEvent[] }> = {};
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

/**
 * Computes Easter Sunday for a given year using the Anonymous Gregorian algorithm (Meeus/Jones/Butcher).
 */
export function calculateEasterSunday(year: number): { month: number; day: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

function formatDate(year: number, month: number, day: number): string {
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

/**
 * Finds the Nth occurrence of a specific day of week in a month.
 * DayOfWeek: 0 = Sunday, 1 = Monday, ... 6 = Saturday
 */
function findNthDayOfWeek(year: number, month: number, dayOfWeek: number, occurrence: number): number {
  let count = 0;
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const testDate = new Date(year, month - 1, d);
    if (testDate.getDay() === dayOfWeek) {
      count++;
      if (count === occurrence) return d;
    }
  }
  return 1;
}

/**
 * Calculates LDS Church holidays, anniversaries, and worldwide broadcasts for a given year.
 */
export function getLdsHolidays(year: number): HolidayEvent[] {
  const events: HolidayEvent[] = [];

  // 1. New Year's Day
  events.push({
    date: formatDate(year, 1, 1),
    name: "New Year's Day",
    category: "lds",
    icon: "🎉",
    description: "Beginning of the new year.",
    isMajor: false,
  });

  // 2. Relief Society Organization Day (March 17, 1842)
  events.push({
    date: formatDate(year, 3, 17),
    name: "Relief Society Organization Day",
    category: "lds",
    icon: "🕊️",
    description: "Organized March 17, 1842 by the Prophet Joseph Smith in Nauvoo, Illinois.",
    isMajor: true,
  });

  // 3. Easter Season (Easter Sunday, Good Friday, Palm Sunday)
  const easter = calculateEasterSunday(year);
  const easterDate = new Date(year, easter.month - 1, easter.day);

  // Palm Sunday (7 days before Easter)
  const palmSunday = new Date(easterDate);
  palmSunday.setDate(palmSunday.getDate() - 7);
  events.push({
    date: formatDate(palmSunday.getFullYear(), palmSunday.getMonth() + 1, palmSunday.getDate()),
    name: "Palm Sunday",
    category: "lds",
    icon: "🌿",
    description: "Commemorating Jesus Christ's triumphal entry into Jerusalem.",
    isMajor: false,
  });

  // Good Friday (2 days before Easter)
  const goodFriday = new Date(easterDate);
  goodFriday.setDate(goodFriday.getDate() - 2);
  events.push({
    date: formatDate(goodFriday.getFullYear(), goodFriday.getMonth() + 1, goodFriday.getDate()),
    name: "Good Friday",
    category: "lds",
    icon: "✝️",
    description: "Commemorating the Crucifixion and Atonement of Jesus Christ.",
    isMajor: true,
  });

  // Easter Sunday
  events.push({
    date: formatDate(year, easter.month, easter.day),
    name: "Easter Sunday",
    category: "lds",
    icon: "🌅",
    description: "Celebration of the glorious Resurrection of our Lord and Savior Jesus Christ.",
    isMajor: true,
  });

  // 4. Church Organization Day (April 6, 1830)
  events.push({
    date: formatDate(year, 4, 6),
    name: "Church Organization Day",
    category: "lds",
    icon: "⛪",
    description: "The Church of Jesus Christ of Latter-day Saints was officially organized April 6, 1830 in Fayette, New York.",
    isMajor: true,
  });

  // 5. April General Conference (First Saturday & Sunday of April)
  const aprSat = findNthDayOfWeek(year, 4, 6, 1);
  const aprSun = aprSat + 1;
  const firstSunApr = findNthDayOfWeek(year, 4, 0, 1);
  const gcSatApr = firstSunApr === 1 ? 7 : firstSunApr - 1;
  events.push({
    date: formatDate(year, 4, gcSatApr),
    name: "April General Conference (Saturday)",
    category: "lds",
    icon: "📡",
    description: "Annual General Conference worldwide broadcast sessions.",
    isMajor: true,
  });
  events.push({
    date: formatDate(year, 4, firstSunApr),
    name: "April General Conference (Sunday)",
    category: "lds",
    icon: "📡",
    description: "Annual General Conference worldwide broadcast sessions. Ward meetings recessed.",
    isMajor: true,
  });

  // 6. Aaronic Priesthood Restoration Day (May 15, 1829)
  events.push({
    date: formatDate(year, 5, 15),
    name: "Aaronic Priesthood Restoration",
    category: "lds",
    icon: "📜",
    description: "Restored May 15, 1829 by John the Baptist to Joseph Smith and Oliver Cowdery on the banks of the Susquehanna River.",
    isMajor: true,
  });

  // 7. Young Women Organization Day (May 27, 1870)
  events.push({
    date: formatDate(year, 5, 27),
    name: "Young Women Organization Day",
    category: "lds",
    icon: "🌸",
    description: "First organized as the First Young Ladies' Department of the Ladies' Cooperative Retrenchment Association on May 27, 1870.",
    isMajor: false,
  });

  // 8. Pioneer Day (July 24, 1847)
  events.push({
    date: formatDate(year, 7, 24),
    name: "Pioneer Day",
    category: "lds",
    icon: "⭐",
    description: "Commemorates the entry of Brigham Young and the first group of Mormon pioneers into the Salt Lake Valley on July 24, 1847.",
    isMajor: true,
  });

  // 9. Primary Organization Day (August 25, 1878)
  events.push({
    date: formatDate(year, 8, 25),
    name: "Primary Organization Day",
    category: "lds",
    icon: "🎈",
    description: "Aurelia Spencer Rogers organized the first Primary association on August 25, 1878 in Farmington, Utah.",
    isMajor: true,
  });

  // 10. October General Conference (First Saturday & Sunday of October)
  const firstSunOct = findNthDayOfWeek(year, 10, 0, 1);
  const gcSatOct = firstSunOct === 1 ? 7 : firstSunOct - 1;
  events.push({
    date: formatDate(year, 10, gcSatOct),
    name: "October General Conference (Saturday)",
    category: "lds",
    icon: "📡",
    description: "Semiannual General Conference worldwide broadcast sessions.",
    isMajor: true,
  });
  events.push({
    date: formatDate(year, 10, firstSunOct),
    name: "October General Conference (Sunday)",
    category: "lds",
    icon: "📡",
    description: "Semiannual General Conference worldwide broadcast sessions. Ward meetings recessed.",
    isMajor: true,
  });

  // 11. First Presidency Christmas Devotional (First Sunday of December)
  const firstSunDec = findNthDayOfWeek(year, 12, 0, 1);
  events.push({
    date: formatDate(year, 12, firstSunDec),
    name: "First Presidency Christmas Devotional",
    category: "lds",
    icon: "🎶",
    description: "Annual worldwide Christmas message and music from the Tabernacle Choir at Temple Square.",
    isMajor: true,
  });

  // 12. Christmas Eve & Christmas Day
  events.push({
    date: formatDate(year, 12, 24),
    name: "Christmas Eve",
    category: "lds",
    icon: "🕯️",
    description: "Christmas Eve celebration.",
    isMajor: false,
  });
  events.push({
    date: formatDate(year, 12, 25),
    name: "Christmas Day",
    category: "lds",
    icon: "🎄",
    description: "Commemorating the sacred birth of our Savior Jesus Christ.",
    isMajor: true,
  });

  return events;
}

/**
 * Parses iCalendar (.ics) text into an array of events for the given year.
 */
export function parseICalendar(icsText: string, targetYear: number): HolidayEvent[] {
  const events: HolidayEvent[] = [];
  const yearPrefix = String(targetYear);

  const eventBlocks = icsText.split("BEGIN:VEVENT");
  for (let i = 1; i < eventBlocks.length; i++) {
    const block = eventBlocks[i].split("END:VEVENT")[0];
    
    // Extract DTSTART;VALUE=DATE:YYYYMMDD or DTSTART:YYYYMMDD
    const dtMatch = block.match(/DTSTART(?:;VALUE=DATE)?:(\d{8})/);
    // Extract SUMMARY:...
    const summaryMatch = block.match(/SUMMARY:([^\r\n]+)/);

    if (dtMatch && summaryMatch) {
      const rawDate = dtMatch[1];
      if (rawDate.startsWith(yearPrefix)) {
        const y = rawDate.slice(0, 4);
        const m = rawDate.slice(4, 6);
        const d = rawDate.slice(6, 8);
        const dateStr = `${y}-${m}-${d}`;
        let name = summaryMatch[1].replace(/\\,/g, ",").replace(/\\;/g, ";").trim();

        // Assign a festive icon based on event name
        let icon = "🪔";
        const lower = name.toLowerCase();
        if (lower.includes("diwali") || lower.includes("deepavali")) icon = "🪔";
        else if (lower.includes("holi")) icon = "🎨";
        else if (lower.includes("pongal") || lower.includes("sankranti") || lower.includes("lohri")) icon = "🌾";
        else if (lower.includes("rama") || lower.includes("krishna") || lower.includes("janmashtami")) icon = "✨";
        else if (lower.includes("dussehra") || lower.includes("durga") || lower.includes("navratri")) icon = "🔱";
        else if (lower.includes("ganesh")) icon = "🐘";
        else if (lower.includes("shiva") || lower.includes("shivaratri")) icon = "🕉️";
        else if (lower.includes("raksha")) icon = "🧵";
        else if (lower.includes("independence") || lower.includes("republic") || lower.includes("gandhi")) icon = "🇮🇳";
        else if (lower.includes("onam") || lower.includes("bihu") || lower.includes("vishu") || lower.includes("gudi")) icon = "🌺";
        else if (lower.includes("new year")) icon = "🎊";

        events.push({
          date: dateStr,
          name,
          category: "indian",
          icon,
          description: `Indian celebration / holiday: ${name}`,
          isMajor: lower.includes("diwali") || lower.includes("holi") || lower.includes("pongal") || lower.includes("dussehra"),
        });
      }
    }
  }

  // Deduplicate by date and name
  const seen = new Set<string>();
  const uniqueEvents: HolidayEvent[] = [];
  for (const ev of events) {
    const key = `${ev.date}_${ev.name}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueEvents.push(ev);
    }
  }

  return uniqueEvents;
}

/**
 * Built-in fallback Indian/Hindu holidays in case the machine is offline or internet is unreachable.
 */
function getOfflineIndianHolidaysFallback(year: number): HolidayEvent[] {
  if (year === 2026) {
    return [
      { date: "2026-01-14", name: "Makar Sankranti / Pongal", category: "indian", icon: "🌾", isMajor: true },
      { date: "2026-01-26", name: "Republic Day", category: "indian", icon: "🇮🇳", isMajor: true },
      { date: "2026-02-15", name: "Maha Shivaratri", category: "indian", icon: "🕉️", isMajor: true },
      { date: "2026-03-04", name: "Holi", category: "indian", icon: "🎨", isMajor: true },
      { date: "2026-03-19", name: "Gudi Padwa / Ugadi", category: "indian", icon: "🌺", isMajor: false },
      { date: "2026-03-26", name: "Rama Navami", category: "indian", icon: "✨", isMajor: true },
      { date: "2026-04-14", name: "Ambedkar Jayanti / Tamil New Year", category: "indian", icon: "🇮🇳", isMajor: false },
      { date: "2026-08-15", name: "Independence Day", category: "indian", icon: "🇮🇳", isMajor: true },
      { date: "2026-08-26", name: "Onam", category: "indian", icon: "🌺", isMajor: false },
      { date: "2026-08-28", name: "Raksha Bandhan", category: "indian", icon: "🧵", isMajor: true },
      { date: "2026-09-04", name: "Krishna Janmashtami", category: "indian", icon: "✨", isMajor: true },
      { date: "2026-09-14", name: "Ganesh Chaturthi", category: "indian", icon: "🐘", isMajor: true },
      { date: "2026-10-02", name: "Mahatma Gandhi Jayanti", category: "indian", icon: "🇮🇳", isMajor: true },
      { date: "2026-10-20", name: "Dussehra / Vijayadashami", category: "indian", icon: "🔱", isMajor: true },
      { date: "2026-11-08", name: "Diwali / Deepavali", category: "indian", icon: "🪔", isMajor: true },
      { date: "2026-11-11", name: "Bhai Duj", category: "indian", icon: "🪔", isMajor: false },
      { date: "2026-11-24", name: "Guru Nanak Jayanti", category: "indian", icon: "✨", isMajor: true },
    ];
  }

  return [
    { date: `${year}-01-14`, name: "Makar Sankranti / Pongal", category: "indian", icon: "🌾", isMajor: true },
    { date: `${year}-01-26`, name: "Republic Day", category: "indian", icon: "🇮🇳", isMajor: true },
    { date: `${year}-08-15`, name: "Independence Day", category: "indian", icon: "🇮🇳", isMajor: true },
    { date: `${year}-10-02`, name: "Mahatma Gandhi Jayanti", category: "indian", icon: "🇮🇳", isMajor: true },
  ];
}

/**
 * Fetches Indian / Hindu holidays live from Google Calendar public holidays feed.
 * Includes in-memory caching and offline fallback.
 */
export async function fetchIndianHolidays(year: number): Promise<HolidayEvent[]> {
  const cacheKey = `indian_${year}`;
  const now = Date.now();

  if (holidaysCache[cacheKey] && now - holidaysCache[cacheKey].timestamp < CACHE_TTL_MS) {
    return holidaysCache[cacheKey].data;
  }

  try {
    const GOOGLE_CALENDAR_ICS_URL =
      "https://calendar.google.com/calendar/ical/en.indian%23holiday%40group.v.calendar.google.com/public/basic.ics";

    const response = await fetch(GOOGLE_CALENDAR_ICS_URL, {
      signal: AbortSignal.timeout(6000),
      headers: {
        "User-Agent": "ChurchAgendaApp/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch iCal: status ${response.status}`);
    }

    const icsText = await response.text();
    const parsed = parseICalendar(icsText, year);

    if (parsed.length > 0) {
      holidaysCache[cacheKey] = {
        timestamp: now,
        data: parsed,
      };
      return parsed;
    }
  } catch (err) {
    console.warn(`Could not fetch live Indian holidays from Google Calendar (${(err as Error).message}), using verified fallback data.`);
  }

  const fallback = getOfflineIndianHolidaysFallback(year);
  holidaysCache[cacheKey] = {
    timestamp: now,
    data: fallback,
  };
  return fallback;
}

/**
 * Returns all holidays for a year, combining LDS celebrations and optionally Indian/Hindu holidays.
 */
export async function getHolidaysForYear(
  year: number,
  includeIndian: boolean = true
): Promise<HolidayEvent[]> {
  const ldsHolidays = getLdsHolidays(year);

  if (!includeIndian) {
    return ldsHolidays.sort((a, b) => a.date.localeCompare(b.date));
  }

  const indianHolidays = await fetchIndianHolidays(year);
  const combined = [...ldsHolidays, ...indianHolidays];
  return combined.sort((a, b) => a.date.localeCompare(b.date));
}
