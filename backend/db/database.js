const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Vercel functions can write only to /tmp, and that storage is ephemeral.
const dataDir = process.env.DATA_DIR || (process.env.VERCEL ? '/tmp' : path.join(__dirname, '..', 'data'));
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'advisor.db'));
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  register_no TEXT UNIQUE NOT NULL,
  leetcode_username TEXT NOT NULL,
  section TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL UNIQUE,
  rating REAL,
  ranking INTEGER,
  total_solved INTEGER,
  easy_solved INTEGER,
  medium_solved INTEGER,
  hard_solved INTEGER,
  acceptance_rate REAL,
  contribution_points INTEGER,
  reputation INTEGER,
  avatar TEXT,
  country TEXT,
  school TEXT,
  fetch_status TEXT DEFAULT 'pending',
  fetch_error TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS contest_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  contest_title TEXT NOT NULL,
  start_time INTEGER,
  attended INTEGER DEFAULT 0,
  ranking INTEGER,
  problems_solved INTEGER,
  total_problems INTEGER,
  rating REAL,
  rating_change REAL,
  finish_time_seconds INTEGER,
  fetched_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, contest_title)
);

CREATE TABLE IF NOT EXISTS refresh_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at TEXT DEFAULT CURRENT_TIMESTAMP,
  finished_at TEXT,
  total_students INTEGER,
  success_count INTEGER,
  fail_count INTEGER,
  triggered_by TEXT
);
`);

// Migration for DBs created before this column existed.
const contestCols = db.prepare("PRAGMA table_info(contest_history)").all().map((c) => c.name);
if (!contestCols.includes('finish_time_seconds')) {
  db.exec('ALTER TABLE contest_history ADD COLUMN finish_time_seconds INTEGER');
}

module.exports = db;
