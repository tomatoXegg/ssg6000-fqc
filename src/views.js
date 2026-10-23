import { SECTIONS, TOTAL_ITEMS, findItem } from './checklist.js';
import { hasActiveFilters } from './filters.js';

const ROLE_LABELS = {
  admin: '管理员',
  operator: '检验员',
};

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`,
  ].join(' ');
}

function formatDuration(startedAt, finishedAt) {
  const start = Date.parse(startedAt);
  const end = Date.parse(finishedAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return '-';

  const totalSeconds = Math.max(0, Math.round((end - start) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours} 小时 ${minutes} 分`;
  if (minutes > 0) return `${minutes} 分 ${seconds} 秒`;
  return `${seconds} 秒`;
}

function navbar(user) {
  const account = user
    ? `<span class="nav-user">${escapeHtml(user.display_name)}</span>
        <form class="nav-actions" method="post" action="/logout">
          <button class="btn-nav" type="submit">退出登录</button>
        </form>`
    : '';

  return `<header class="top-navbar">
    <div class="nav-left">
      <span class="brand-mark">SIGLENT</span>
      <span class="brand-divider" aria-hidden="true"></span>
      <div class="brand-title-group">
        <h2>质量保证部 · FQC 质检中心</h2>
        <p>鼎阳科技 · 出厂质量检验系统</p>
      </div>
    </div>
    <div class="nav-right">${account}</div>
  </header>`;
}

export function layout({ title, user, body, script }) {
  const scriptTag = script ? `<script src="${escapeHtml(script)}" defer></script>` : '';

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <title>${escapeHtml(title)} · SSG6000 FQC</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  ${navbar(user)}
  <main class="page">
    ${body}
  </main>
  <footer class="page-footer">SSG6000 FQC 演示系统 · 仅限内部演示</footer>
  ${scriptTag}
</body>
</html>`;
}

export function loginPage({ error }) {
  const alert = error ? `<div class="alert" role="alert">${escapeHtml(error)}</div>` : '';

  const body = `<section class="login-wrap">
    <div class="login-card">
      <span class="login-brand">SIGLENT</span>
      <h1>SSG6000 FQC 质检系统</h1>
      <p class="login-sub">射频信号源出厂质量检验</p>
      ${alert}
      <form class="login-form" method="post" action="/login">
        <label for="username">用户名</label>
        <input id="username" name="username" type="text" autocomplete="username" maxlength="64" required autofocus>
        <label for="password">密码</label>
        <input id="password" name="password" type="password" autocomplete="current-password" maxlength="64" required>
        <button class="btn-primary" type="submit">登录</button>
      </form>
      <p class="login-foot">演示账号：admin / admin123 · operator / op123</p>
    </div>
  </section>`;

  return layout({ title: '登录', user: null, body });
}

export function homePage({ user }) {
  const role = ROLE_LABELS[user.role] || user.role;

  const body = `<section class="hero-card">
    <div class="badge-group">
      <span class="badge badge-sop">FQC 出厂检验</span>
      <span class="badge badge-code">里程碑 4 · 质检与记录</span>
    </div>
    <h1>SSG6000 质检工作台</h1>
    <p class="muted">当前登录：${escapeHtml(user.display_name)}（${escapeHtml(user.username)} · ${escapeHtml(role)}）</p>
  </section>

  <section class="card-grid">
    <a class="link-card" href="/inspect">
      <span class="link-card-index">01</span>
      <h2>开始质检</h2>
      <p>按 SOP 逐项检查待测机，完成后提交质检结果。</p>
      <span class="link-card-go">进入 →</span>
    </a>
    <a class="link-card" href="/records">
      <span class="link-card-index">02</span>
      <h2>质检记录</h2>
      <p>按 SN、工单号、机型与结果筛选历史质检记录，查看整机结果与不合格原因。</p>
      <span class="link-card-go">查看 →</span>
    </a>
  </section>

  <section class="home-actions">
    <form method="post" action="/logout">
      <button class="btn-secondary" type="submit">退出登录</button>
    </form>
  </section>`;

  return layout({ title: '工作台', user, body });
}

function checkboxRow(item, checked) {
  return `<label class="check-item${checked ? ' is-checked' : ''}">
    <input class="check-input" type="checkbox" name="items" value="${escapeHtml(item.key)}"${checked ? ' checked' : ''}>
    <span class="check-box" aria-hidden="true">
      <svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
    </span>
    <span class="check-text">${escapeHtml(item.label)}</span>
  </label>`;
}

function sectionCard(section, checkedKeys) {
  const rows = section.items.map((item) => checkboxRow(item, checkedKeys.has(item.key))).join('');

  return `<section class="section-card" id="section-${escapeHtml(section.key)}" data-section="${escapeHtml(section.key)}">
    <div class="section-header">
      <div class="section-header-left">
        <span class="section-index">${escapeHtml(section.index)}</span>
        <h2 class="section-title">${escapeHtml(section.title)}</h2>
      </div>
      <button class="btn-section-pass" type="button" data-section-pass="${escapeHtml(section.key)}">本节全检通过</button>
    </div>
    <div class="callout callout-spec">
      <div class="callout-tag"><span class="callout-dot" aria-hidden="true"></span>本节要点</div>
      <p>${escapeHtml(section.note)}</p>
    </div>
    <div class="check-list">${rows}</div>
  </section>`;
}

export function inspectPage({ user, startedAt, error, values = {}, checkedKeys = [] }) {
  const checked = new Set([...checkedKeys].filter((key) => findItem(key)));
  const done = checked.size;
  const percent = TOTAL_ITEMS ? Math.round((done / TOTAL_ITEMS) * 100) : 0;
  const sn = escapeHtml(values.sn ?? '');
  const workOrder = escapeHtml(values.work_order ?? '');
  const model = escapeHtml(values.model ?? '');
  const failReason = escapeHtml(values.fail_reason ?? '');
  const startedValue = escapeHtml(startedAt ?? new Date().toISOString());
  const alert = error ? `<div class="alert" role="alert">${escapeHtml(error)}</div>` : '';

  const sections = SECTIONS.map((section) => sectionCard(section, checked)).join('');

  const body = `<form class="inspect-form" id="inspect-form" method="post" action="/inspect">
    <input type="hidden" name="started_at" value="${startedValue}">

    <div class="inspect-progress">
      <div class="sn-quick">
        <label for="sn-quick">待测机 SN</label>
        <input id="sn-quick" class="sn-quick-input" type="text" value="${sn}" placeholder="扫码枪录入或手动输入" autocomplete="off">
      </div>
      <div class="progress-info">
        <span class="progress-tag" id="progress-tag">${done === TOTAL_ITEMS ? '已全检' : '检验中'}</span>
        <span>完成度 <strong id="progress-text">${done} / ${TOTAL_ITEMS} 项 (${percent}%)</strong></span>
      </div>
      <div class="progress-bar-bg" role="progressbar" aria-label="检验完成度" aria-valuemin="0" aria-valuemax="${TOTAL_ITEMS}" aria-valuenow="${done}">
        <div class="progress-bar-fill" id="progress-bar" style="width: ${percent}%"></div>
      </div>
    </div>

    ${alert}

    <section class="form-card">
      <h1>整机 FQC 检验</h1>
      <p class="muted">SGL-QC-SOP-6080A · 共 ${TOTAL_ITEMS} 项，合格需全部勾选。</p>
      <div class="field-grid">
        <div class="field">
          <label for="sn">SN<span class="req">必填</span></label>
          <input id="sn" name="sn" type="text" maxlength="64" required autofocus value="${sn}" autocomplete="off" placeholder="扫描或输入待测机 SN">
        </div>
        <div class="field">
          <label for="work_order">工单号</label>
          <input id="work_order" name="work_order" type="text" maxlength="64" value="${workOrder}" autocomplete="off" placeholder="选填">
        </div>
        <div class="field">
          <label for="model">机型</label>
          <input id="model" name="model" type="text" maxlength="64" value="${model}" autocomplete="off" placeholder="选填">
        </div>
      </div>
    </section>

    ${sections}

    <section class="submit-panel">
      <div class="fail-field">
        <label for="fail_reason">不合格原因</label>
        <textarea id="fail_reason" name="fail_reason" maxlength="200" rows="3" placeholder="提交不合格时必填，2 到 200 字">${failReason}</textarea>
      </div>
      <p class="submit-hint">合格需全部勾选；不合格必须填写原因</p>
      <div class="submit-actions">
        <button class="btn-primary" type="submit" name="intent" value="pass">提交合格</button>
        <button class="btn-danger" type="submit" name="intent" value="fail">提交不合格</button>
      </div>
    </section>
  </form>`;

  return layout({ title: '开始质检', user, body, script: '/app.js' });
}

function passCardText(inspection) {
  return [
    '【鼎阳科技 SSG6000 FQC 检验电子凭证】',
    `机台 SN: ${inspection.sn}`,
    `工单号: ${inspection.work_order || '-'}`,
    `机型: ${inspection.model || '-'}`,
    '检验工序: FQC 出厂品质检验',
    `检验结果: 【检验合格 PASS】(${inspection.checked_items}/${inspection.total_items} 项通过)`,
    '检验标准: SGL-QC-SOP-6080A',
    `检验员: ${inspection.inspector_name} (${inspection.inspector_username || ''})`,
    `开始时间: ${formatDateTime(inspection.started_at)}`,
    `完成时间: ${formatDateTime(inspection.finished_at)}`,
  ].join('\n');
}

function breakdown(inspection) {
  const stored = new Map(inspection.items.map((item) => [item.item_key, item]));

  return SECTIONS.map((section) => {
    const sectionItems = section.items.map((item) => {
      const row = stored.get(item.key);
      const checked = row ? row.checked === 1 : false;
      const label = row?.label || item.label;

      return `<div class="breakdown-item${checked ? ' is-checked' : ''}">
        <span class="breakdown-mark ${checked ? 'mark-ok' : 'mark-miss'}" aria-hidden="true">${checked ? '✓' : '✗'}</span>
        <span class="breakdown-label">${escapeHtml(label)}</span>
      </div>`;
    }).join('');

    const sectionChecked = section.items.filter((item) => stored.get(item.key)?.checked === 1).length;

    return `<section class="breakdown-section">
      <div class="breakdown-head">
        <span class="section-index">${escapeHtml(section.index)}</span>
        <h3>${escapeHtml(section.title)}</h3>
        <span class="breakdown-count">${sectionChecked} / ${section.items.length}</span>
      </div>
      ${sectionItems}
    </section>`;
  }).join('');
}

export function inspectionDetailPage({ user, inspection }) {
  const pass = inspection.result === 'pass';
  const createdAt = formatDateTime(inspection.finished_at);

  const meta = [
    ['SN', inspection.sn],
    ['工单号', inspection.work_order || '-'],
    ['机型', inspection.model || '-'],
    ['检验员', `${inspection.inspector_name} (${inspection.inspector_username || ''})`],
    ['开始时间', formatDateTime(inspection.started_at)],
    ['完成时间', createdAt],
    ['用时', formatDuration(inspection.started_at, inspection.finished_at)],
  ].map(([label, value]) => `<div class="meta-item">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>`).join('');

  const reason = pass
    ? ''
    : `<div class="result-reason">
        <span>不合格原因</span>
        <p>${escapeHtml(inspection.fail_reason || '-')}</p>
      </div>`;

  const card = pass
    ? `<section class="pass-card-wrap">
        <div class="pass-card-head">
          <h2>检验合格卡</h2>
          <button class="btn-secondary" type="button" id="copy-card">复制合格卡</button>
        </div>
        <pre class="pass-card-text" id="pass-card-text">${escapeHtml(passCardText(inspection))}</pre>
        <p class="muted">复制后可直接粘贴到工单、群聊或电子检查单。</p>
      </section>`
    : '';

  const body = `<div class="page-heading">
    <div class="badge-group">
      <span class="badge badge-sop">FQC 检验记录</span>
      <span class="badge badge-code">记录 #${escapeHtml(inspection.id)}</span>
    </div>
    <h1>检验详情</h1>
  </div>

  <section class="meta-grid">${meta}</section>

  <section class="result-banner ${pass ? 'result-pass' : 'result-fail'}">
    <div class="result-main">
      <p class="result-title">${pass ? '检验合格 PASS' : '检验不合格 FAIL'}</p>
      <p class="result-count">${inspection.checked_items} / ${inspection.total_items} 项已勾选</p>
    </div>
    ${reason}
  </section>

  ${card}

  <section class="detail-section">
    <h2 class="detail-title">逐项检查结果</h2>
    <div class="breakdown">${breakdown(inspection)}</div>
  </section>

  <div class="detail-actions">
    <a class="btn-secondary" href="/records">返回质检记录</a>
    <a class="btn-secondary" href="/inspect">继续质检</a>
  </div>

  <div class="toast-container" id="toast-container" aria-live="polite"></div>`;

  return layout({ title: '检验详情', user, body, script: '/app.js' });
}

function recordsTableRows(inspections) {
  return inspections.map((row) => {
    const pass = row.result === 'pass';

    return `<tr>
      <td class="mono">${escapeHtml(row.sn)}</td>
      <td>${escapeHtml(row.model || '-')}</td>
      <td>${escapeHtml(row.work_order || '-')}</td>
      <td><span class="result-badge ${pass ? 'result-badge-pass' : 'result-badge-fail'}">${pass ? '合格' : '不合格'}</span></td>
      <td>${escapeHtml(row.inspector_name)}</td>
      <td>${escapeHtml(formatDateTime(row.finished_at))}</td>
      <td>${escapeHtml(formatDuration(row.started_at, row.finished_at))}</td>
      <td><a class="detail-link" href="/inspections/${escapeHtml(row.id)}">详情</a></td>
    </tr>`;
  }).join('');
}

function textFilterField(id, name, label, value) {
  return `<div class="filter-field">
          <label for="${id}">${label}</label>
          <input id="${id}" name="${name}" type="text" maxlength="64" value="${escapeHtml(value)}" autocomplete="off">
        </div>`;
}

function dateFilterField(id, name, label, value) {
  return `<div class="filter-date-field">
            <label for="${id}">${label}</label>
            <input id="${id}" name="${name}" type="date" value="${escapeHtml(value)}">
          </div>`;
}

function recordsFilterForm(filters) {
  const resultOptions = [
    ['', '全部'],
    ['pass', '合格'],
    ['fail', '不合格'],
  ].map(([value, label]) => `<option value="${value}"${filters.result === value ? ' selected' : ''}>${label}</option>`).join('');

  return `<form class="filter-card" method="get" action="/records">
      <div class="filter-grid">
        ${textFilterField('filter-sn', 'sn', 'SN', filters.sn)}
        ${textFilterField('filter-work-order', 'work_order', '工单号', filters.work_order)}
        ${textFilterField('filter-model', 'model', '机型', filters.model)}
        <div class="filter-field">
          <label for="filter-result">结果</label>
          <select id="filter-result" name="result">${resultOptions}</select>
        </div>
        <div class="filter-field filter-field-dates">
          <span class="filter-label">完成日期</span>
          ${dateFilterField('filter-from', 'from', '完成日期起', filters.from)}
          ${dateFilterField('filter-to', 'to', '完成日期止', filters.to)}
        </div>
      </div>
      <div class="filter-actions">
        <button class="btn-primary" type="submit">筛选</button>
        <a class="btn-secondary" href="/records">清除筛选</a>
      </div>
    </form>`;
}

export function recordsPage({ user, inspections, filters = {} }) {
  const filtered = hasActiveFilters(filters);

  const table = `<div class="table-container">
      <table class="records-table">
        <thead>
          <tr>
            <th>SN</th>
            <th>机型</th>
            <th>工单号</th>
            <th>结果</th>
            <th>检验员</th>
            <th>完成时间</th>
            <th>用时</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>${recordsTableRows(inspections)}</tbody>
      </table>
    </div>`;

  const empty = filtered
    ? `<div class="empty-state">
        <h2>没有符合条件的记录</h2>
        <p>请放宽或调整筛选条件后重试，也可以清除筛选查看全部记录。</p>
        <a class="btn-secondary" href="/records">清除筛选</a>
      </div>`
    : `<div class="empty-state">
        <h2>暂无质检记录</h2>
        <p>完成第一台整机检验后，记录会显示在这里。</p>
        <a class="btn-primary" href="/inspect">开始质检</a>
      </div>`;

  const content = inspections.length
    ? `<p class="records-note muted">当前显示 ${inspections.length} 条记录</p>
    ${table}`
    : empty;

  const body = `<div class="page-heading">
    <div class="badge-group">
      <span class="badge badge-sop">FQC 出厂检验</span>
      <span class="badge badge-code">筛选 · 最多 50 条</span>
    </div>
    <h1>质检记录</h1>
    <p class="muted">可按 SN、工单号、机型、结果与完成日期筛选，最多显示最近 50 条匹配记录；日期按 UTC 日计算。</p>
  </div>

  ${recordsFilterForm(filters)}

  ${content}`;

  return layout({ title: '质检记录', user, body });
}

export function notFoundPage({ user }) {
  const href = user ? '/' : '/login';
  const label = user ? '返回首页' : '前往登录';

  const body = `<section class="stub-card">
    <div class="badge-group">
      <span class="badge badge-warn">404</span>
    </div>
    <h1>页面不存在</h1>
    <p>你访问的页面不存在，或已被移动。</p>
    <a class="btn-secondary" href="${href}">${label}</a>
  </section>`;

  return layout({ title: '页面不存在', user, body });
}

export function errorPage({ user }) {
  const body = `<section class="stub-card">
    <div class="badge-group">
      <span class="badge badge-warn">500</span>
    </div>
    <h1>服务器错误</h1>
    <p>系统暂时无法处理该请求，请稍后重试。</p>
    <a class="btn-secondary" href="/">返回首页</a>
  </section>`;

  return layout({ title: '服务器错误', user, body });
}
