import { expect, test, describe } from "bun:test";
import { 
  calculateEasterSunday, 
  getLdsHolidays, 
  parseICalendar, 
  getHolidaysForYear 
} from "../src/holidays";

describe("Holidays & Church Celebrations Service", () => {
  describe("Astronomical Easter Computation (Meeus/Butcher)", () => {
    test("calculates Easter Sunday correctly across several years", () => {
      // 2024: March 31
      const e2024 = calculateEasterSunday(2024);
      expect(e2024).toEqual({ month: 3, day: 31 });

      // 2025: April 20
      const e2025 = calculateEasterSunday(2025);
      expect(e2025).toEqual({ month: 4, day: 20 });

      // 2026: April 5
      const e2026 = calculateEasterSunday(2026);
      expect(e2026).toEqual({ month: 4, day: 5 });
    });
  });

  describe("LDS Church Celebrations", () => {
    test("computes key fixed and movable LDS commemorations for 2026", () => {
      const holidays = getLdsHolidays(2026);

      // Relief Society Organization Day (March 17)
      const rsDay = holidays.find(h => h.name.includes("Relief Society"));
      expect(rsDay).toBeDefined();
      expect(rsDay?.date).toBe("2026-03-17");
      expect(rsDay?.category).toBe("lds");
      expect(rsDay?.icon).toBe("🕊️");

      // Church Organization Day (April 6)
      const churchOrgDay = holidays.find(h => h.name.includes("Church Organization Day"));
      expect(churchOrgDay).toBeDefined();
      expect(churchOrgDay?.date).toBe("2026-04-06");

      // Easter Sunday (April 5, 2026)
      const easter = holidays.find(h => h.name === "Easter Sunday");
      expect(easter).toBeDefined();
      expect(easter?.date).toBe("2026-04-05");

      // Pioneer Day (July 24)
      const pioneerDay = holidays.find(h => h.name.includes("Pioneer Day"));
      expect(pioneerDay).toBeDefined();
      expect(pioneerDay?.date).toBe("2026-07-24");

      // Primary Organization Day (August 25)
      const primaryDay = holidays.find(h => h.name.includes("Primary Organization Day"));
      expect(primaryDay).toBeDefined();
      expect(primaryDay?.date).toBe("2026-08-25");

      // Christmas Day (December 25)
      const christmas = holidays.find(h => h.name === "Christmas Day");
      expect(christmas).toBeDefined();
      expect(christmas?.date).toBe("2026-12-25");

      // General Conferences (April 1st Sun and October 1st Sun)
      const aprGC = holidays.find(h => h.name.includes("April General Conference (Sunday)"));
      expect(aprGC).toBeDefined();
      expect(aprGC?.date).toBe("2026-04-05");

      const octGC = holidays.find(h => h.name.includes("October General Conference (Sunday)"));
      expect(octGC).toBeDefined();
      expect(octGC?.date).toBe("2026-10-04");
    });
  });

  describe("iCalendar Parser & Event Parsing", () => {
    test("parses standard iCal VEVENT blocks and assigns categories and icons", () => {
      const sampleIcs = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART;VALUE=DATE:20261108
SUMMARY:Diwali/Deepavali
END:VEVENT
BEGIN:VEVENT
DTSTART;VALUE=DATE:20260304
SUMMARY:Holi
END:VEVENT
BEGIN:VEVENT
DTSTART;VALUE=DATE:20260114
SUMMARY:Pongal
END:VEVENT
BEGIN:VEVENT
DTSTART;VALUE=DATE:20251101
SUMMARY:Past Event
END:VEVENT
END:VCALENDAR`;

      const parsed = parseICalendar(sampleIcs, 2026);
      expect(parsed.length).toBe(3);

      const diwali = parsed.find(e => e.name.includes("Diwali"));
      expect(diwali).toBeDefined();
      expect(diwali?.date).toBe("2026-11-08");
      expect(diwali?.category).toBe("indian");
      expect(diwali?.icon).toBe("🪔");

      const holi = parsed.find(e => e.name === "Holi");
      expect(holi).toBeDefined();
      expect(holi?.date).toBe("2026-03-04");
      expect(holi?.icon).toBe("🎨");

      const pongal = parsed.find(e => e.name === "Pongal");
      expect(pongal).toBeDefined();
      expect(pongal?.date).toBe("2026-01-14");
    });
  });

  describe("getHolidaysForYear Combined Retrieval", () => {
    test("returns sorted combined holidays when includeIndian is true", async () => {
      const holidays = await getHolidaysForYear(2026, true);
      expect(holidays.length).toBeGreaterThan(20);

      // Verify date order
      for (let i = 1; i < holidays.length; i++) {
        expect(holidays[i].date >= holidays[i - 1].date).toBe(true);
      }

      // Check both categories exist
      const hasLds = holidays.some(h => h.category === "lds");
      const hasIndian = holidays.some(h => h.category === "indian");
      expect(hasLds).toBe(true);
      expect(hasIndian).toBe(true);
    });

    test("returns only LDS commemorations when includeIndian is false", async () => {
      const ldsOnly = await getHolidaysForYear(2026, false);
      expect(ldsOnly.length).toBeGreaterThan(10);
      expect(ldsOnly.every(h => h.category === "lds")).toBe(true);
    });
  });
});
