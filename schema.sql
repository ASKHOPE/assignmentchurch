-- Cloudflare D1 Schema for Ward Sunday Agenda & Assignment Planner
-- Run with: npx wrangler d1 execute assignmentchurch-db --file=./schema.sql (or --local)

CREATE TABLE IF NOT EXISTS agendas (
  date TEXT PRIMARY KEY,
  week_label TEXT,
  meeting_type TEXT DEFAULT 'standard',
  opening_prayer_role TEXT DEFAULT 'Brother',
  opening_prayer_name TEXT DEFAULT '',
  talk1_org TEXT DEFAULT 'Bishopric',
  talk1_title TEXT DEFAULT '',
  talk1_speaker TEXT DEFAULT '',
  talk2_org TEXT DEFAULT 'Elders Quorum',
  talk2_title TEXT DEFAULT '',
  talk2_url TEXT DEFAULT '',
  talk2_speaker TEXT DEFAULT '',
  talk3_org TEXT DEFAULT 'Member',
  talk3_title TEXT DEFAULT '',
  talk3_url TEXT DEFAULT '',
  talk3_speaker TEXT DEFAULT '',
  closing_prayer_role TEXT DEFAULT 'Sister',
  closing_prayer_name TEXT DEFAULT '',
  hymn_opening TEXT DEFAULT '',
  hymn_sacrament TEXT DEFAULT '',
  hymn_interlude TEXT DEFAULT '',
  hymn_closing TEXT DEFAULT '',
  classes_json TEXT DEFAULT '{}',
  conference_title TEXT DEFAULT '',
  conference_details TEXT DEFAULT '',
  conference_url TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS autocomplete_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  value TEXT NOT NULL UNIQUE,
  last_used TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hymns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book TEXT NOT NULL,
  number INTEGER NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  UNIQUE(book, number)
);
CREATE INDEX IF NOT EXISTS idx_hymns_search ON hymns(book, number, title);

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
CREATE INDEX IF NOT EXISTS idx_talks_speaker ON conference_talks(speaker);
CREATE INDEX IF NOT EXISTS idx_talks_year ON conference_talks(year, month);

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
CREATE INDEX IF NOT EXISTS idx_cfm_year ON come_follow_me(year);

-- Seed initial agenda for September 13, 2026 if not exists
INSERT OR IGNORE INTO agendas (
  date, week_label, meeting_type, opening_prayer_role, opening_prayer_name,
  talk1_org, talk1_title, talk1_speaker,
  talk2_org, talk2_title, talk2_url, talk2_speaker,
  talk3_org, talk3_title, talk3_url, talk3_speaker,
  closing_prayer_role, closing_prayer_name,
  hymn_opening, hymn_sacrament, hymn_interlude, hymn_closing,
  classes_json, conference_title, conference_details, conference_url,
  notes, updated_at
) VALUES (
  '2026-09-13',
  '2nd Sunday',
  'standard',
  'Brother',
  '',
  'Youth - Young Men',
  '(Seminary and Institute Graduations)',
  'Bishopric',
  'Relief Society',
  'A New Normal',
  'https://www.churchofjesuschrist.org/study/general-conference/2020/10/46nelson',
  '',
  'Member',
  'Sacrifice (Gospel Principles)',
  'https://www.churchofjesuschrist.org/study/manual/gospel-principles/chapter-26-sacrifice',
  '',
  'Sister',
  '',
  '',
  '',
  '',
  '',
  '{"sunday_school":{"topic":"September 7–13: “He Shall Direct Thy Paths” Proverbs 1–4; 15–16; 22; 31; Ecclesiastes 1–3; 11–12","url":"https://www.churchofjesuschrist.org/study/come-follow-me","teacher":""},"elders_quorum":{"topic":"Watch Ye Therefore, and Pray Always","url":"https://www.churchofjesuschrist.org/study/general-conference","teacher":""},"relief_society":{"topic":"Watch Ye Therefore, and Pray Always","url":"https://www.churchofjesuschrist.org/study/general-conference","teacher":"Sahitya"},"young_men":{"topic":"Watch Ye Therefore, and Pray Always","url":"","teacher":""},"young_women":{"topic":"Watch Ye Therefore, and Pray Always","url":"","teacher":""},"primary":{"topic":"September 7–13: “He Shall Direct Thy Paths” Proverbs 1–4; 15–16; 22; 31; Ecclesiastes 1–3; 11–12","url":"","teacher":""}}',
  'General Conference Worldwide Broadcast',
  '',
  'https://www.churchofjesuschrist.org/general-conference',
  '',
  CURRENT_TIMESTAMP
);

-- Seed initial autocomplete values
INSERT OR IGNORE INTO autocomplete_history (category, value) VALUES ('name', 'Sahitya');
INSERT OR IGNORE INTO autocomplete_history (category, value) VALUES ('name', 'Bishopric');
INSERT OR IGNORE INTO autocomplete_history (category, value) VALUES ('org', 'Elders Quorum');
INSERT OR IGNORE INTO autocomplete_history (category, value) VALUES ('org', 'Relief Society');
INSERT OR IGNORE INTO autocomplete_history (category, value) VALUES ('org', 'Youth - Young Men');
INSERT OR IGNORE INTO autocomplete_history (category, value) VALUES ('org', 'Youth - Young Women');
INSERT OR IGNORE INTO autocomplete_history (category, value) VALUES ('org', 'Stake High Councilor');
INSERT OR IGNORE INTO autocomplete_history (category, value) VALUES ('topic', 'Watch Ye Therefore, and Pray Always');
INSERT OR IGNORE INTO autocomplete_history (category, value) VALUES ('topic', 'A New Normal');
INSERT OR IGNORE INTO autocomplete_history (category, value) VALUES ('topic', 'Sacrifice (Gospel Principles)');
