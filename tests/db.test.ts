import { expect, test, describe, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";
import { 
  initDb, 
  getAgendaByDate, 
  saveAgenda, 
  getAllSavedSundays, 
  getAutocompleteSuggestions,
  exportAllData,
  importAllData 
} from "../src/db";

describe("Database Layer (bun:sqlite)", () => {
  let db: Database;

  beforeEach(() => {
    // In-memory sqlite for lightning fast isolated tests
    db = initDb(":memory:");
  });

  test("initializes tables and seeds initial image data", () => {
    const agenda = getAgendaByDate(db, "2026-09-13");
    expect(agenda).toBeDefined();
    expect(agenda.date).toBe("2026-09-13");
    expect(agenda.talk2_title).toBe("A New Normal");
    expect(agenda.talk3_title).toBe("Sacrifice (Gospel Principles)");
    expect(agenda.classes_json.relief_society.teacher).toBe("Sahitya");
    expect(agenda.classes_json.elders_quorum.topic).toBe("Watch Ye Therefore, and Pray Always");
  });

  test("returns default template for non-existent date", () => {
    const agenda = getAgendaByDate(db, "2026-10-18");
    expect(agenda.date).toBe("2026-10-18");
    expect(agenda.week_label).toBe("3rd Sunday");
    expect(agenda.talk2_org).toBe("Relief Society");
  });

  test("saves and updates agenda record atomically", () => {
    const updated = saveAgenda(db, {
      date: "2026-09-13",
      opening_prayer_name: "Brother Clark",
      hymn_opening: "#2 - The Spirit of God",
    });

    expect(updated.opening_prayer_name).toBe("Brother Clark");
    expect(updated.hymn_opening).toBe("#2 - The Spirit of God");

    const retrieved = getAgendaByDate(db, "2026-09-13");
    expect(retrieved.opening_prayer_name).toBe("Brother Clark");
    expect(retrieved.hymn_opening).toBe("#2 - The Spirit of God");
  });

  test("tracks autocomplete history", () => {
    saveAgenda(db, {
      date: "2026-09-20",
      opening_prayer_name: "Brother Moroni",
      closing_prayer_name: "Sister Emma",
    });

    const suggestions = getAutocompleteSuggestions(db, "name", "Mo");
    expect(suggestions).toContain("Brother Moroni");
  });

  test("lists all saved sundays", () => {
    saveAgenda(db, { date: "2026-09-20" });
    const sundays = getAllSavedSundays(db);
    expect(sundays).toContain("2026-09-13");
    expect(sundays).toContain("2026-09-20");
  });

  test("exports and imports data backup", () => {
    const backup = exportAllData(db);
    expect(backup.agendas.length).toBeGreaterThanOrEqual(1);

    const newDb = initDb(":memory:");
    // Clear initial seed in newDb to test import
    newDb.run("DELETE FROM agendas");
    expect(getAllSavedSundays(newDb).length).toBe(0);

    importAllData(newDb, backup);
    expect(getAllSavedSundays(newDb)).toContain("2026-09-13");
  });
});
