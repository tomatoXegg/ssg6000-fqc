import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { ITEM_KEYS, SECTIONS, TOTAL_ITEMS } from '../src/checklist.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = 3799;
const BASE = `http://127.0.0.1:${PORT}`;
const DB_PATH = join(tmpdir(), `ssg6000-smoke-${process.pid}-${randomBytes(4).toString('hex')}.db`);

const jar = new Map();
let failures = 0;

function check(label, ok, detail = '') {
  if (ok) {
    console.log(`PASS ${label}`);
    return;
  }
  failures += 1;
  console.log(`FAIL ${label}${detail ? ` (${detail})` : ''}`);
}

async function filterCheck(label, query, shows, hides = []) {
  const params = new URLSearchParams(query);
  const { response, text } = await request(`/records?${params}`);
  const missing = shows.filter((value) => !text.includes(value));
  const leaked = hides.filter((value) => text.includes(value));
  check(
    label,
    response.status === 200 && missing.length === 0 && leaked.length === 0,
    `status=${response.status} missing=${missing.join(',')} leaked=${leaked.join(',')}`,
  );
}

function storeCookies(response) {
  for (const line of response.headers.getSetCookie()) {
    const [pair, ...attributes] = line.split(';');
    const index = pair.indexOf('=');
    if (index < 0) continue;

    const name = pair.slice(0, index).trim();
    const value = pair.slice(index + 1).trim();
    const maxAge = attributes
      .map((attribute) => attribute.trim().toLowerCase())
      .find((attribute) => attribute.startsWith('max-age='));

    if (maxAge && Number(maxAge.slice('max-age='.length)) <= 0) jar.delete(name);
    else jar.set(name, value);
  }
}

function cookieHeader() {
  return [...jar].map(([name, value]) => `${name}=${value}`).join('; ');
}

async function request(path, { method = 'GET', form, cookie } = {}) {
  const headers = {};
  const cookieValue = cookie ?? cookieHeader();
  if (cookieValue) headers.cookie = cookieValue;

  let body;
  if (form) {
    headers['content-type'] = 'application/x-www-form-urlencoded';
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(form)) {
      if (Array.isArray(value)) {
        for (const entry of value) params.append(key, entry);
      } else {
        params.append(key, value);
      }
    }
    body = params.toString();
  }

  const response = await fetch(`${BASE}${path}`, { method, headers, body, redirect: 'manual' });
  const text = await response.text();
  storeCookies(response);
  return { response, text };
}

function withDb(read) {
  const db = new Database(DB_PATH, { readonly: true, fileMustExist: true });
  try {
    return read(db);
  } finally {
    db.close();
  }
}

function inspectionCount() {
  return withDb((db) => db.prepare('SELECT COUNT(*) AS count FROM inspections').get().count);
}

async function startServer() {
  const child = spawn(process.execPath, ['server.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(PORT), DB_PATH },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let log = '';
  child.stdout.on('data', (chunk) => { log += chunk; });
  child.stderr.on('data', (chunk) => { log += chunk; });

  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`服务器提前退出\n${log}`);
    try {
      const response = await fetch(`${BASE}/login`, { redirect: 'manual' });
      if (response.status === 200) return child;
    } catch {
    }
    await sleep(150);
  }
  throw new Error(`服务器 10 秒内未就绪\n${log}`);
}

let child;
try {
  child = await startServer();

  const root = await request('/');
  check(
    '1. GET / 未登录 -> 302 /login',
    root.response.status === 302 && root.response.headers.get('location') === '/login',
    `status=${root.response.status} location=${root.response.headers.get('location')}`,
  );

  const login = await request('/login');
  check(
    '2. GET /login -> 200 且包含 登录',
    login.response.status === 200 && login.text.includes('登录'),
    `status=${login.response.status}`,
  );

  const bad = await request('/login', {
    method: 'POST',
    form: { username: 'admin', password: 'wrong-password' },
  });
  check(
    '3. POST /login 错误密码 -> 401',
    bad.response.status === 401 && bad.text.includes('用户名或密码错误'),
    `status=${bad.response.status}`,
  );

  const adminLogin = await request('/login', {
    method: 'POST',
    form: { username: 'admin', password: 'admin123' },
  });
  check(
    '4. POST /login admin/admin123 -> 302 /',
    adminLogin.response.status === 302 && adminLogin.response.headers.get('location') === '/',
    `status=${adminLogin.response.status} location=${adminLogin.response.headers.get('location')}`,
  );

  const setCookie = adminLogin.response.headers.getSetCookie().join('; ');
  check(
    '5. Set-Cookie 含 ssg_sid 与 HttpOnly',
    setCookie.includes('ssg_sid=') && setCookie.includes('HttpOnly'),
    setCookie,
  );

  const adminCookie = cookieHeader();
  const home = await request('/');
  const missingHome = ['管理员', '开始质检', '质检记录'].filter((text) => !home.text.includes(text));
  check(
    '6. GET / 已登录 -> 200 含 管理员、开始质检、质检记录',
    home.response.status === 200 && missingHome.length === 0,
    `status=${home.response.status} missing=${missingHome.join(',')}`,
  );

  const inspectPage1 = await request('/inspect');
  check(
    '7. GET /inspect 已登录 -> 200 含 待测机 SN',
    inspectPage1.response.status === 200 && inspectPage1.text.includes('待测机 SN'),
    `status=${inspectPage1.response.status}`,
  );

  const recordsEmpty = await request('/records');
  check(
    '8. GET /records 空库 -> 200 含 暂无质检记录',
    recordsEmpty.response.status === 200 && recordsEmpty.text.includes('暂无质检记录'),
    `status=${recordsEmpty.response.status}`,
  );

  const logout = await request('/logout', { method: 'POST', cookie: adminCookie });
  check(
    '9. POST /logout -> 302 /login',
    logout.response.status === 302 && logout.response.headers.get('location') === '/login',
    `status=${logout.response.status} location=${logout.response.headers.get('location')}`,
  );

  const afterLogout = await request('/', { cookie: adminCookie });
  check(
    '10. 旧 cookie GET / -> 302 /login',
    afterLogout.response.status === 302 && afterLogout.response.headers.get('location') === '/login',
    `status=${afterLogout.response.status} location=${afterLogout.response.headers.get('location')}`,
  );

  const operatorLogin = await request('/login', {
    method: 'POST',
    form: { username: 'operator', password: 'op123' },
  });
  check(
    '11. POST /login operator/op123 -> 302 /',
    operatorLogin.response.status === 302 && operatorLogin.response.headers.get('location') === '/',
    `status=${operatorLogin.response.status} location=${operatorLogin.response.headers.get('location')}`,
  );

  const operatorHome = await request('/');
  check(
    '12. GET / operator -> 200 含 检验员',
    operatorHome.response.status === 200 && operatorHome.text.includes('检验员'),
    `status=${operatorHome.response.status}`,
  );

  await request('/login', {
    method: 'POST',
    form: { username: 'admin', password: 'admin123' },
  });

  const inspectForm = await request('/inspect');
  const missingSections = SECTIONS.filter((section) => !inspectForm.text.includes(section.title));
  const itemInputCount = inspectForm.text.match(/name="items"/g)?.length ?? 0;
  check(
    '13. GET /inspect 含 7 个章节标题、30 个 items 输入与 待测机 SN',
    inspectForm.response.status === 200
      && missingSections.length === 0
      && itemInputCount === TOTAL_ITEMS
      && inspectForm.text.includes('待测机 SN'),
    `status=${inspectForm.response.status} sections=${SECTIONS.length - missingSections.length} items=${itemInputCount}`,
  );

  const pass = await request('/inspect', {
    method: 'POST',
    form: {
      sn: 'SMOKE-SN-001',
      work_order: 'WO-2026-001',
      model: 'SSG6082A-V',
      started_at: new Date().toISOString(),
      intent: 'pass',
      fail_reason: '',
      items: ITEM_KEYS,
    },
  });
  const passLocation = pass.response.headers.get('location') || '';
  const passMatch = /^\/inspections\/(\d+)$/.exec(passLocation);
  const passId = passMatch ? Number(passMatch[1]) : null;
  check(
    '14. POST /inspect 合格 30/30 -> 302 /inspections/<id>',
    pass.response.status === 302 && passId !== null,
    `status=${pass.response.status} location=${passLocation}`,
  );

  const passDetail = await request(`/inspections/${passId ?? 0}`);
  check(
    '15. GET 合格详情 -> 200 含 检验合格、SMOKE-SN-001、合格卡',
    passDetail.response.status === 200
      && passDetail.text.includes('检验合格')
      && passDetail.text.includes('SMOKE-SN-001')
      && passDetail.text.includes('合格卡'),
    `status=${passDetail.response.status}`,
  );

  const passRows = withDb((db) => ({
    inspection: db.prepare('SELECT * FROM inspections WHERE id = ?').get(passId),
    items: db.prepare('SELECT checked FROM inspection_items WHERE inspection_id = ?').all(passId),
    count: db.prepare('SELECT COUNT(*) AS count FROM inspections').get().count,
  }));
  const passIssues = [];
  if (passRows.count !== 1) passIssues.push(`记录数 ${passRows.count}`);
  if (!passRows.inspection) {
    passIssues.push('记录不存在');
  } else {
    if (passRows.inspection.sn !== 'SMOKE-SN-001') passIssues.push(`sn=${passRows.inspection.sn}`);
    if (passRows.inspection.inspector_name !== '管理员') passIssues.push(`检验员=${passRows.inspection.inspector_name}`);
    if (passRows.inspection.result !== 'pass') passIssues.push(`结果=${passRows.inspection.result}`);
    if (passRows.inspection.total_items !== 30) passIssues.push(`总数=${passRows.inspection.total_items}`);
    if (passRows.inspection.checked_items !== 30) passIssues.push(`勾选=${passRows.inspection.checked_items}`);
    if (!passRows.inspection.started_at) passIssues.push('开始时间为空');
    if (!passRows.inspection.finished_at) passIssues.push('完成时间为空');
  }
  if (passRows.items.length !== 30) passIssues.push(`检查项行数 ${passRows.items.length}`);
  if (passRows.items.some((item) => item.checked !== 1)) passIssues.push('存在未勾选检查项');
  check(
    '16. 数据库断言 合格记录 1 条、30 个检查项全部为 1',
    passIssues.length === 0,
    passIssues.join('；'),
  );

  const missingStartedAt = new Date().toISOString();
  const passMissing = await request('/inspect', {
    method: 'POST',
    form: {
      sn: 'SMOKE-SN-029',
      started_at: missingStartedAt,
      intent: 'pass',
      items: ITEM_KEYS.slice(0, -1),
    },
  });
  const missingCheckedCount = passMissing.text.match(/name="items"[^>]*checked/g)?.length ?? 0;
  check(
    '17. POST /inspect 合格 29/30 -> 422、保留原值 29 项且不新增记录',
    passMissing.response.status === 422
      && passMissing.text.includes('合格需 30/30 项全部勾选，请补检后提交')
      && passMissing.text.includes('value="SMOKE-SN-029"')
      && passMissing.text.includes(`value="${missingStartedAt}"`)
      && missingCheckedCount === 29
      && inspectionCount() === 1,
    `status=${passMissing.response.status} checked=${missingCheckedCount} count=${inspectionCount()}`,
  );

  const failReason = '外调制时序异常，已按 SOP 复核';
  const fail = await request('/inspect', {
    method: 'POST',
    form: {
      sn: 'SMOKE-SN-002',
      work_order: 'WO-2026-002',
      model: 'SSG6082A',
      started_at: new Date().toISOString(),
      intent: 'fail',
      fail_reason: failReason,
      items: ITEM_KEYS,
    },
  });
  const failLocation = fail.response.headers.get('location') || '';
  const failMatch = /^\/inspections\/(\d+)$/.exec(failLocation);
  const failId = failMatch ? Number(failMatch[1]) : null;
  const failDetail = await request(`/inspections/${failId ?? 0}`);
  const failRow = failId
    ? withDb((db) => db.prepare('SELECT * FROM inspections WHERE id = ?').get(failId))
    : null;
  check(
    '18. POST /inspect 不合格 302，详情与数据库含原因',
    fail.response.status === 302
      && failId !== null
      && failDetail.text.includes('检验不合格')
      && failDetail.text.includes(failReason)
      && failRow?.result === 'fail'
      && failRow?.fail_reason === failReason,
    `status=${fail.response.status} location=${failLocation} result=${failRow?.result}`,
  );

  const failNoReason = await request('/inspect', {
    method: 'POST',
    form: {
      sn: 'SMOKE-SN-003',
      started_at: new Date().toISOString(),
      intent: 'fail',
      fail_reason: '',
      items: ITEM_KEYS,
    },
  });
  check(
    '19. POST /inspect 不合格无原因 -> 422 且不新增记录',
    failNoReason.response.status === 422 && inspectionCount() === 2,
    `status=${failNoReason.response.status} count=${inspectionCount()}`,
  );

  const records = await request('/records');
  check(
    '20. GET /records 含 SMOKE-SN-001 与 SMOKE-SN-002',
    records.response.status === 200
      && records.text.includes('SMOKE-SN-001')
      && records.text.includes('SMOKE-SN-002'),
    `status=${records.response.status}`,
  );

  const loggedOutPost = await request('/inspect', {
    method: 'POST',
    cookie: '',
    form: {
      sn: 'SMOKE-SN-004',
      started_at: new Date().toISOString(),
      intent: 'pass',
      items: ITEM_KEYS,
    },
  });
  check(
    '21. 未登录 POST /inspect -> 302 /login 且不新增记录',
    loggedOutPost.response.status === 302
      && loggedOutPost.response.headers.get('location') === '/login'
      && inspectionCount() === 2,
    `status=${loggedOutPost.response.status} count=${inspectionCount()}`,
  );

  const missing = await request('/inspections/999999');
  check(
    '22. GET /inspections/999999 -> 404',
    missing.response.status === 404 && missing.text.includes('页面不存在'),
    `status=${missing.response.status}`,
  );

  await filterCheck(
    '23. GET /records?sn=001 只显示 001',
    { sn: '001' },
    ['SMOKE-SN-001'],
    ['SMOKE-SN-002'],
  );

  await filterCheck(
    '24. GET /records?sn=smoke-sn-002 不区分大小写',
    { sn: 'smoke-sn-002' },
    ['SMOKE-SN-002'],
    ['SMOKE-SN-001'],
  );

  await filterCheck(
    '25. GET /records?work_order=wo-2026-001 只显示 001',
    { work_order: 'wo-2026-001' },
    ['SMOKE-SN-001'],
    ['SMOKE-SN-002'],
  );

  await filterCheck(
    '26. GET /records?model=6082a-v 只显示 001',
    { model: '6082a-v' },
    ['SMOKE-SN-001'],
    ['SMOKE-SN-002'],
  );

  await filterCheck(
    '27. GET /records?result=pass 只显示 001',
    { result: 'pass' },
    ['SMOKE-SN-001'],
    ['SMOKE-SN-002'],
  );

  await filterCheck(
    '28. GET /records?result=fail&sn=SMOKE 只显示 002',
    { result: 'fail', sn: 'SMOKE' },
    ['SMOKE-SN-002'],
    ['SMOKE-SN-001'],
  );

  await filterCheck(
    '29. GET /records?result=bogus 按全部结果处理',
    { result: 'bogus' },
    ['SMOKE-SN-001', 'SMOKE-SN-002'],
  );

  const today = new Date().toISOString().slice(0, 10);
  await filterCheck(
    '30. GET /records 今日 UTC 起止日期显示两条',
    { from: today, to: today },
    ['SMOKE-SN-001', 'SMOKE-SN-002'],
  );

  const noRows = await request(`/records?${new URLSearchParams({ sn: 'NOPE-404' })}`);
  check(
    '31. GET /records?sn=NOPE-404 -> 200 空结果提示',
    noRows.response.status === 200
      && noRows.text.includes('没有符合条件的记录')
      && noRows.text.includes('href="/records">清除筛选'),
    `status=${noRows.response.status}`,
  );

  const injected = await request(`/records?${new URLSearchParams({ sn: "' OR 1=1 --" })}`);
  check(
    '32. GET /records?sn=注入串 -> 200 且不泄漏记录',
    injected.response.status === 200
      && injected.text.includes('没有符合条件的记录')
      && !injected.text.includes('SMOKE-SN-001')
      && !injected.text.includes('SMOKE-SN-002'),
    `status=${injected.response.status}`,
  );

  const echoed = await request(`/records?${new URLSearchParams({ sn: 'SMOKE', result: 'pass' })}`);
  check(
    '33. GET /records 回显筛选条件并只显示 001',
    echoed.response.status === 200
      && echoed.text.includes('value="SMOKE"')
      && /<option value="pass"[^>]*selected/.test(echoed.text)
      && echoed.text.includes('SMOKE-SN-001')
      && !echoed.text.includes('SMOKE-SN-002'),
    `status=${echoed.response.status}`,
  );
} catch (error) {
  failures += 1;
  console.error(`FAIL 运行错误 (${error.message})`);
} finally {
  if (child && child.exitCode === null) {
    child.kill('SIGKILL');
    await Promise.race([once(child, 'exit'), sleep(2000)]);
  }
  for (const suffix of ['', '-wal', '-shm']) {
    await rm(`${DB_PATH}${suffix}`, { force: true });
  }
}

if (failures > 0) {
  console.log(`SMOKE FAIL (${failures})`);
  process.exit(1);
}
console.log('SMOKE PASS');
