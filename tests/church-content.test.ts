import { describe, it, expect, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";
import {
  initDb,
  searchHymns,
  searchConferenceTalks,
  getComeFollowMe,
  searchGospelPrinciples,
  getFsyLessons
} from "../src/db";

describe("Church Content Database & API (Hymns, Talks, Come Follow Me, GP, FSY)", () => {
  let db: Database;

  beforeEach(() => {
    // In-memory test database
    db = new Database(":memory:");
    initDb(":memory:");

    // Create tables and seed test data
    db.exec(`
      CREATE TABLE IF NOT EXISTS hymns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        book TEXT NOT NULL,
        number INTEGER NOT NULL,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        UNIQUE(book, number)
      );

      CREATE TABLE IF NOT EXISTS conference_talks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        year INTEGER NOT NULL,
        month INTEGER NOT NULL,
        conference_name TEXT NOT NULL,
        session TEXT NOT NULL,
        title TEXT NOT NULL,
        speaker TEXT NOT NULL,
        url TEXT NOT NULL,
        UNIQUE(year, month, url)
      );

      CREATE TABLE IF NOT EXISTS come_follow_me (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        year INTEGER NOT NULL,
        book_title TEXT NOT NULL,
        week_number INTEGER,
        date_range TEXT,
        title TEXT NOT NULL,
        scriptures TEXT,
        url TEXT NOT NULL,
        UNIQUE(year, url)
      );

      CREATE TABLE IF NOT EXISTS gospel_principles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chapter_number INTEGER NOT NULL UNIQUE,
        title TEXT NOT NULL,
        url TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS fsy_lessons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        year INTEGER NOT NULL,
        month INTEGER NOT NULL,
        sunday_number INTEGER NOT NULL,
        organization TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        url TEXT NOT NULL,
        UNIQUE(year, month, sunday_number, organization)
      );

      INSERT INTO hymns (book, number, title, url) VALUES
      ('Children''s Songbook', 2, 'I Am a Child of God', 'https://churchofjesuschrist.org/cs/2'),
      ('Hymns (1985)', 1, 'The Morning Breaks', 'https://churchofjesuschrist.org/hymns/1'),
      ('Hymns (1985)', 2, 'The Spirit of God', 'https://churchofjesuschrist.org/hymns/2'),
      ('Hymns for Home and Church', 1001, 'Come, Thou Fount of Every Blessing', 'https://churchofjesuschrist.org/new/1001');

      INSERT INTO conference_talks (year, month, conference_name, session, title, speaker, url) VALUES
      (2024, 10, 'October 2024', 'Saturday Morning Session', 'The Triumph of Hope', 'Neil L. Andersen', 'https://churchofjesuschrist.org/gc/2024/10/andersen'),
      (2024, 10, 'October 2024', 'Sunday Afternoon Session', 'The Lord Jesus Christ Will Come Again', 'Russell M. Nelson', 'https://churchofjesuschrist.org/gc/2024/10/nelson');

      INSERT INTO come_follow_me (year, book_title, week_number, date_range, title, scriptures, url) VALUES
      (2026, 'Old Testament 2026', 37, 'September 7–13', 'Proverbs 1–4', 'Proverbs 1–4', 'https://churchofjesuschrist.org/cfm/2026/37');

      INSERT INTO gospel_principles (chapter_number, title, url) VALUES
      (1, 'Our Heavenly Family', 'https://churchofjesuschrist.org/gp/chapter-1'),
      (2, 'Our Heavenly Father', 'https://churchofjesuschrist.org/gp/chapter-2');

      INSERT INTO fsy_lessons (year, month, sunday_number, organization, title, description, url) VALUES
      (2026, 9, 1, 'both', 'Fast Sunday: Study the FSY Guide', 'Fast Sunday lesson', 'https://churchofjesuschrist.org/ftsoy/2026/09/01'),
      (2026, 9, 4, 'young_women', 'Becoming a Covenant Daughter of God', 'YW lesson', 'https://churchofjesuschrist.org/ftsoy/2026/09/04a'),
      (2026, 9, 4, 'young_men', 'Becoming a Covenant Son of God', 'YM lesson', 'https://churchofjesuschrist.org/ftsoy/2026/09/04b');
    `);
  });

  it("searches hymns by title and number and prioritizes Hymns (1985) over Children''s Songbook", () => {
    const allHymns = searchHymns(db, "");
    expect(allHymns.length).toBe(4);
    // 1st should be Hymns (1985) #1, 2nd should be Hymns (1985) #2
    expect(allHymns[0].book).toBe("Hymns (1985)");
    expect(allHymns[0].number).toBe(1);
    expect(allHymns[1].book).toBe("Hymns (1985)");
    expect(allHymns[1].number).toBe(2);
    // Next should be Home and Church #1001
    expect(allHymns[2].book).toBe("Hymns for Home and Church");
    // Lastly Children's Songbook
    expect(allHymns[3].book).toBe("Children's Songbook");

    const byNum = searchHymns(db, "2");
    expect(byNum.length).toBe(2); // Hymns #2 and CS #2
    expect(byNum[0].book).toBe("Hymns (1985)");

    const byTitle = searchHymns(db, "Morning");
    expect(byTitle.length).toBe(1);
    expect(byTitle[0].title).toBe("The Morning Breaks");

    const byBook = searchHymns(db, "", "Hymns for Home and Church");
    expect(byBook.length).toBe(1);
    expect(byBook[0].number).toBe(1001);
  });

  it("searches conference talks by title and speaker", () => {
    const talksBySpeaker = searchConferenceTalks(db, undefined, "Nelson");
    expect(talksBySpeaker.length).toBe(1);
    expect(talksBySpeaker[0].speaker).toBe("Russell M. Nelson");

    const talksByQuery = searchConferenceTalks(db, "Triumph");
    expect(talksByQuery.length).toBe(1);
    expect(talksByQuery[0].title).toBe("The Triumph of Hope");
  });

  it("retrieves Come, Follow Me lessons for a given year", () => {
    const cfm = getComeFollowMe(db, 2026);
    expect(cfm.length).toBe(1);
    expect(cfm[0].date_range).toBe("September 7–13");
  });

  it("searches Gospel Principles chapters for Youth 1st talk", () => {
    const allGp = searchGospelPrinciples(db);
    expect(allGp.length).toBe(2);
    expect(allGp[0].chapter_number).toBe(1);
    expect(allGp[0].title).toBe("Our Heavenly Family");

    const ch2 = searchGospelPrinciples(db, "2");
    expect(ch2.length).toBe(1);
    expect(ch2[0].chapter_number).toBe(2);

    const byName = searchGospelPrinciples(db, "Father");
    expect(byName.length).toBe(1);
    expect(byName[0].chapter_number).toBe(2);
  });

  it("retrieves FSY lessons filtered by year, month, sunday number, and organization", () => {
    const septFastSunday = getFsyLessons(db, 2026, 9, 1);
    expect(septFastSunday.length).toBe(1);
    expect(septFastSunday[0].organization).toBe("both");

    const ywLesson = getFsyLessons(db, 2026, 9, 4, "young_women");
    expect(ywLesson.length).toBe(1);
    expect(ywLesson[0].title).toContain("Daughter");

    const ymLesson = getFsyLessons(db, 2026, 9, 4, "young_men");
    expect(ymLesson.length).toBe(1);
    expect(ymLesson[0].title).toContain("Son");
  });
});
