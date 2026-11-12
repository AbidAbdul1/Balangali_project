/**
 * Persistent SQLite Database Layer (using Node.js built-in node:sqlite)
 *
 * Stores users, sessions, password resets, saved trips, group trip members,
 * expenses, settlements, travel documents, and reminders.
 */
import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(process.cwd(), '.data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = process.env.TRAVELMATE_DB_PATH || path.join(DATA_DIR, 'travelmate.db');

export const db = new DatabaseSync(DB_PATH);

export function initDatabase(): void {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      preferences_json TEXT DEFAULT '{}',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS trips (
      id TEXT PRIMARY KEY,
      owner_id TEXT,
      title TEXT NOT NULL,
      is_shared INTEGER DEFAULT 0,
      share_code TEXT UNIQUE,
      trip_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS trip_members (
      id TEXT PRIMARY KEY,
      trip_id TEXT NOT NULL,
      user_id TEXT,
      email TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('owner', 'editor', 'viewer')),
      invited_at TEXT NOT NULL,
      UNIQUE(trip_id, email)
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      trip_id TEXT NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'INR',
      paid_by_name TEXT NOT NULL,
      split_type TEXT NOT NULL CHECK(split_type IN ('equal', 'custom', 'percentage')),
      splits_json TEXT NOT NULL,
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settlements (
      id TEXT PRIMARY KEY,
      trip_id TEXT NOT NULL,
      from_name TEXT NOT NULL,
      to_name TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'INR',
      settled_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      trip_id TEXT,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      doc_type TEXT NOT NULL,
      reference_number TEXT DEFAULT '',
      file_name TEXT DEFAULT '',
      mime_type TEXT DEFAULT 'text/plain',
      size_bytes INTEGER DEFAULT 0,
      content_base64 TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY,
      trip_id TEXT,
      user_id TEXT,
      title TEXT NOT NULL,
      due_date TEXT DEFAULT '',
      completed INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `);
}

initDatabase();

