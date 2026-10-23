import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'operator')),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

CREATE TABLE IF NOT EXISTS inspections (
  id INTEGER PRIMARY KEY,
  sn TEXT NOT NULL,
  work_order TEXT,
  model TEXT,
  inspector_id INTEGER NOT NULL REFERENCES users(id),
  inspector_name TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('pass', 'fail')),
  fail_reason TEXT,
  total_items INTEGER NOT NULL,
  checked_items INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS inspection_items (
  inspection_id INTEGER NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  item_key TEXT NOT NULL,
  section_key TEXT NOT NULL,
  label TEXT NOT NULL,
  checked INTEGER NOT NULL CHECK (checked IN (0, 1)),
  PRIMARY KEY (inspection_id, item_key)
);

CREATE INDEX IF NOT EXISTS idx_inspections_finished_at ON inspections(finished_at DESC);
`;

const SEED_USERS = [
  { username: 'admin', password: 'admin123', displayName: '管理员', role: 'admin' },
  { username: 'operator', password: 'op123', displayName: '检验员', role: 'operator' },
];

function seedUsers(db) {
  const find = db.prepare('SELECT id FROM users WHERE username = ?');
  const insert = db.prepare(
    'INSERT INTO users (username, password_hash, display_name, role, created_at) VALUES (?, ?, ?, ?, ?)',
  );

  db.transaction(() => {
    for (const user of SEED_USERS) {
      if (find.get(user.username)) continue;
      const hash = bcrypt.hashSync(user.password, 10);
      insert.run(user.username, hash, user.displayName, user.role, new Date().toISOString());
    }
  })();
}

export function openDb(path) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });

  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  seedUsers(db);
  return db;
}
