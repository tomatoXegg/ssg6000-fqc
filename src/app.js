import { fileURLToPath } from 'node:url';
import express from 'express';
import {
  authenticate,
  clearSessionCookie,
  createSession,
  destroySession,
  loadUser,
  requireAuth,
  sessionCookie,
} from './auth.js';
import { TOTAL_ITEMS, findItem } from './checklist.js';
import { parseFilters } from './filters.js';
import { createInspection, getInspection, listInspections } from './inspections.js';
import {
  errorPage,
  homePage,
  inspectPage,
  inspectionDetailPage,
  loginPage,
  notFoundPage,
  recordsPage,
} from './views.js';

const PUBLIC_DIR = fileURLToPath(new URL('../public', import.meta.url));
const DAY_MS = 24 * 60 * 60 * 1000;
const FUTURE_TOLERANCE_MS = 60 * 1000;

function trimmedString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeItems(value) {
  const raw = Array.isArray(value) ? value : value === undefined ? [] : [value];
  const keys = new Set();

  for (const entry of raw) {
    if (typeof entry !== 'string') continue;
    const key = entry.trim();
    if (findItem(key)) keys.add(key);
  }
  return keys;
}

function resolveStartedAt(value, now) {
  if (typeof value !== 'string' || value.trim() === '') return new Date(now).toISOString();

  const parsed = Date.parse(value.trim());
  if (!Number.isFinite(parsed)) return new Date(now).toISOString();
  if (parsed < now - DAY_MS || parsed > now + FUTURE_TOLERANCE_MS) return new Date(now).toISOString();
  return new Date(parsed).toISOString();
}

export function createApp(db) {
  const app = express();
  app.disable('x-powered-by');

  app.use(express.urlencoded({ extended: false, limit: '10kb' }));
  app.use(express.static(PUBLIC_DIR));
  app.use(loadUser(db));

  app.get('/login', (req, res) => {
    if (req.user) return res.redirect('/');
    res.send(loginPage({}));
  });

  app.post('/login', (req, res) => {
    const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const valid =
      username.length > 0 &&
      username.length <= 64 &&
      password.length > 0 &&
      password.length <= 64;

    const user = valid ? authenticate(db, username, password) : null;
    if (!user) {
      return res.status(401).send(loginPage({ error: '用户名或密码错误' }));
    }

    const session = createSession(db, user.id);
    res.setHeader('Set-Cookie', sessionCookie(session.id, session.expiresAt));
    res.redirect('/');
  });

  app.post('/logout', (req, res) => {
    if (req.sessionId) destroySession(db, req.sessionId);
    res.setHeader('Set-Cookie', clearSessionCookie());
    res.redirect('/login');
  });

  app.get('/', requireAuth, (req, res) => {
    res.send(homePage({ user: req.user }));
  });

  app.get('/inspect', requireAuth, (req, res) => {
    res.send(inspectPage({
      user: req.user,
      startedAt: new Date().toISOString(),
      values: {},
      checkedKeys: [],
    }));
  });

  app.post('/inspect', requireAuth, (req, res) => {
    const now = Date.now();
    const body = req.body ?? {};
    const sn = trimmedString(body.sn);
    const workOrder = trimmedString(body.work_order);
    const model = trimmedString(body.model);
    const intent = trimmedString(body.intent);
    const failReason = trimmedString(body.fail_reason);
    const rawStartedAt = trimmedString(body.started_at);
    const startedAt = resolveStartedAt(rawStartedAt, now);
    const checkedKeys = normalizeItems(body.items);

    const values = {
      sn,
      work_order: workOrder,
      model,
      fail_reason: failReason,
    };

    const redisplay = (error) => res.status(422).send(inspectPage({
      user: req.user,
      startedAt: rawStartedAt || startedAt,
      error,
      values,
      checkedKeys,
    }));

    if (sn.length < 1 || sn.length > 64) {
      return redisplay('请填写待测机 SN，长度 1 到 64 个字符。');
    }
    if (workOrder.length > 64) {
      return redisplay('工单号不能超过 64 个字符。');
    }
    if (model.length > 64) {
      return redisplay('机型不能超过 64 个字符。');
    }
    if (intent !== 'pass' && intent !== 'fail') {
      return redisplay('请选择提交合格或提交不合格。');
    }

    let result;
    let storedReason = null;

    if (intent === 'pass') {
      if (checkedKeys.size < TOTAL_ITEMS) {
        return redisplay('合格需 30/30 项全部勾选，请补检后提交');
      }
      result = 'pass';
    } else {
      if (failReason.length < 2 || failReason.length > 200) {
        return redisplay('提交不合格时必须填写 2 到 200 字的原因。');
      }
      result = 'fail';
      storedReason = failReason;
    }

    const inspectionId = createInspection(db, {
      sn,
      workOrder,
      model,
      inspectorId: req.user.id,
      inspectorName: req.user.display_name,
      startedAt,
      finishedAt: new Date().toISOString(),
      result,
      failReason: storedReason,
      totalItems: TOTAL_ITEMS,
      checkedKeys,
    });

    res.redirect(`/inspections/${inspectionId}`);
  });

  app.get('/inspections/:id', requireAuth, (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(404).send(notFoundPage({ user: req.user }));
    }

    const inspection = getInspection(db, id);
    if (!inspection) {
      return res.status(404).send(notFoundPage({ user: req.user }));
    }

    res.send(inspectionDetailPage({ user: req.user, inspection }));
  });

  app.get('/records', requireAuth, (req, res) => {
    const filters = parseFilters(req.query);
    res.send(recordsPage({
      user: req.user,
      inspections: listInspections(db, filters, 50),
      filters,
    }));
  });

  app.use((req, res) => {
    res.status(404).send(notFoundPage({ user: req.user }));
  });

  app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    console.error(err);
    res.status(500).send(errorPage({ user: req.user }));
  });

  return app;
}
