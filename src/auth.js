import { randomBytes } from 'node:crypto';
import bcrypt from 'bcrypt';

export const COOKIE_NAME = 'ssg_sid';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const SESSION_ID_PATTERN = /^[a-f0-9]{64}$/;

export function authenticate(db, username, password) {
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) return null;
  return bcrypt.compareSync(password, user.password_hash) ? user : null;
}

export function createSession(db, userId) {
  const id = randomBytes(32).toString('hex');
  const expiresAt = Date.now() + SESSION_TTL_MS;
  db.prepare('INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)').run(
    id,
    userId,
    expiresAt,
    new Date().toISOString(),
  );
  return { id, expiresAt };
}

export function getSessionUser(db, sessionId) {
  if (typeof sessionId !== 'string' || !SESSION_ID_PATTERN.test(sessionId)) return null;

  const row = db
    .prepare(
      `SELECT s.expires_at AS session_expires_at, u.*
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.id = ?`,
    )
    .get(sessionId);
  if (!row) return null;

  const { session_expires_at: expiresAt, ...user } = row;
  if (expiresAt <= Date.now()) {
    destroySession(db, sessionId);
    return null;
  }
  return user;
}

export function destroySession(db, sessionId) {
  if (typeof sessionId !== 'string') return;
  db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
}

export function parseCookies(header) {
  const cookies = {};
  if (typeof header !== 'string') return cookies;

  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    const name = part.slice(0, index).trim();
    if (!name || name in cookies) continue;
    cookies[name] = part.slice(index + 1).trim();
  }
  return cookies;
}

export function sessionCookie(sessionId, expiresAt) {
  const maxAge = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
  return [
    `${COOKIE_NAME}=${sessionId}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
    `Expires=${new Date(expiresAt).toUTCString()}`,
  ].join('; ');
}

export function clearSessionCookie() {
  return [
    `${COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
  ].join('; ');
}

export function loadUser(db) {
  return (req, res, next) => {
    const sessionId = parseCookies(req.headers.cookie)[COOKIE_NAME] || null;
    req.sessionId = sessionId;
    req.user = sessionId ? getSessionUser(db, sessionId) : null;
    next();
  };
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.redirect('/login');
  next();
}
