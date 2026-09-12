import { describe, it, expect, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";
import { initDb, searchHymns, searchConferenceTalks, getComeFollowMe } from "../src/db";
import { createServer } from "../src/server";

describe("Church Content Database & API (Hymns, Talks, Come Follow Me)", () => {
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

      INSERT INTO hymns (book, number, title, url) VALUES
      ('Hymns (1985)', 1, 'The Morning Breaks', 'https://churchofjesuschrist.org/hymns/1'),
      ('Hymns (1985)', 2, 'The Spirit of God', 'https://churchofjesuschrist.org/hymns/2'),
      ('Children''s Songbook', 2, 'I Am a Child of God', 'https://churchofjesuschrist.org/cs/2'),
      ('Hymns for Home and Church', 1001, 'Come, Thou Fount of Every Blessing', 'https://churchofjesuschrist.org/new/1001');

      INSERT INTO conference_talks (year, month, conference_name, session, title, speaker, url) VALUES
      (2024, 10, 'October 2024', 'Saturday Morning Session', 'The Triumph of Hope', 'Neil L. Andersen', 'https://churchofjesuschrist.org/gc/2024/10/andersen'),
      (2024, 10, 'October 2024', 'Sunday Afternoon Session', 'The Lord Jesus Christ Will Come Again', 'Russell M. Nelson', 'https://churchofjesuschrist.org/gc/2024/10/nelson');

      INSERT INTO come_follow_me (year, book_title, week_number, date_range, title, scriptures, url) VALUES
      (2026, 'Old Testament 2026', 37, 'September 7–13', 'Proverbs 1–4', 'Proverbs 1–4', 'https://churchofjesuschrist.org/cfm/2026/37');
    `);
  });

  it("searches hymns by title and number", () => {
    const byNum = searchHymns(db, "2");
    expect(byNum.length).toBe(2); // Hymns #2 and CS #2

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
});
