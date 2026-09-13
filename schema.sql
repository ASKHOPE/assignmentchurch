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
CREATE INDEX IF NOT EXISTS idx_talks_title ON conference_talks(title);
CREATE INDEX IF NOT EXISTS idx_talks_year_speaker ON conference_talks(year, speaker);

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

CREATE TABLE IF NOT EXISTS gospel_principles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chapter_number INTEGER NOT NULL UNIQUE,
  title TEXT NOT NULL,
  url TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_gp_chapter ON gospel_principles(chapter_number);

CREATE TABLE IF NOT EXISTS fsy_lessons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  sunday_number INTEGER NOT NULL,
  organization TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  UNIQUE(year, month, sunday_number, organization)
);
CREATE INDEX IF NOT EXISTS idx_fsy_date ON fsy_lessons(year, month, sunday_number);

CREATE TABLE IF NOT EXISTS auth_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  passkey TEXT NOT NULL DEFAULT 'dowleswaram',
  role TEXT NOT NULL DEFAULT 'Leader',
  is_active INTEGER NOT NULL DEFAULT 1,
  last_login TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Seed default auth users
INSERT OR IGNORE INTO auth_users (name, passkey, role, is_active) VALUES ('Bishop', 'dowleswaram', 'Bishopric', 1);
INSERT OR IGNORE INTO auth_users (name, passkey, role, is_active) VALUES ('Counselor', 'dowleswaram', 'Bishopric', 1);
INSERT OR IGNORE INTO auth_users (name, passkey, role, is_active) VALUES ('Elders Quorum', 'dowleswaram', 'Quorum Presidency', 1);
INSERT OR IGNORE INTO auth_users (name, passkey, role, is_active) VALUES ('Relief Society', 'dowleswaram', 'RS Presidency', 1);
INSERT OR IGNORE INTO auth_users (name, passkey, role, is_active) VALUES ('Sunday School', 'dowleswaram', 'SS Presidency', 1);
INSERT OR IGNORE INTO auth_users (name, passkey, role, is_active) VALUES ('Young Men', 'dowleswaram', 'YM Presidency', 1);
INSERT OR IGNORE INTO auth_users (name, passkey, role, is_active) VALUES ('Young Women', 'dowleswaram', 'YW Presidency', 1);
INSERT OR IGNORE INTO auth_users (name, passkey, role, is_active) VALUES ('Primary', 'dowleswaram', 'Primary Presidency', 1);
INSERT OR IGNORE INTO auth_users (name, passkey, role, is_active) VALUES ('Admin', 'dowleswaram', 'Administrator', 1);

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
