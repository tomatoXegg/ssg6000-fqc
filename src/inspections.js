import { ITEM_KEYS, SECTIONS, findItem } from './checklist.js';

const ORDER = new Map(ITEM_KEYS.map((key, index) => [key, index]));

export function createInspection(db, input) {
  const checkedKeys = new Set();
  for (const key of input.checkedKeys ?? []) {
    if (findItem(key)) checkedKeys.add(key);
  }

  const insertInspection = db.prepare(`
    INSERT INTO inspections (
      sn, work_order, model, inspector_id, inspector_name,
      started_at, finished_at, result, fail_reason,
      total_items, checked_items, created_at
    ) VALUES (
      @sn, @workOrder, @model, @inspectorId, @inspectorName,
      @startedAt, @finishedAt, @result, @failReason,
      @totalItems, @checkedItems, @createdAt
    )
  `);
  const insertItem = db.prepare(`
    INSERT INTO inspection_items (inspection_id, item_key, section_key, label, checked)
    VALUES (?, ?, ?, ?, ?)
  `);

  const run = db.transaction(() => {
    const info = insertInspection.run({
      sn: input.sn,
      workOrder: input.workOrder || null,
      model: input.model || null,
      inspectorId: input.inspectorId,
      inspectorName: input.inspectorName,
      startedAt: input.startedAt,
      finishedAt: input.finishedAt,
      result: input.result,
      failReason: input.failReason || null,
      totalItems: input.totalItems,
      checkedItems: checkedKeys.size,
      createdAt: new Date().toISOString(),
    });

    const inspectionId = Number(info.lastInsertRowid);
    for (const section of SECTIONS) {
      for (const item of section.items) {
        insertItem.run(
          inspectionId,
          item.key,
          section.key,
          item.label,
          checkedKeys.has(item.key) ? 1 : 0,
        );
      }
    }
    return inspectionId;
  });

  return run();
}

const TEXT_FILTERS = [
  ['sn', 'sn'],
  ['work_order', 'work_order'],
  ['model', 'model'],
];

function likeNeedle(value) {
  return `%${value.toLowerCase().replace(/[\\%_]/g, '\\$&')}%`;
}

export function listInspections(db, filters = {}, limit = 50) {
  const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 200) : 50;
  const clauses = [];
  const params = [];

  for (const [key, column] of TEXT_FILTERS) {
    const value = filters[key];
    if (typeof value === 'string' && value) {
      clauses.push(`LOWER(${column}) LIKE ? ESCAPE '\\'`);
      params.push(likeNeedle(value));
    }
  }

  if (filters.result === 'pass' || filters.result === 'fail') {
    clauses.push('result = ?');
    params.push(filters.result);
  }
  if (typeof filters.from === 'string' && filters.from) {
    clauses.push('date(finished_at) >= ?');
    params.push(filters.from);
  }
  if (typeof filters.to === 'string' && filters.to) {
    clauses.push('date(finished_at) <= ?');
    params.push(filters.to);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  return db
    .prepare(`SELECT * FROM inspections ${where} ORDER BY finished_at DESC, id DESC LIMIT ?`)
    .all(...params, safeLimit);
}

export function getInspection(db, id) {
  const record = db
    .prepare(
      `SELECT i.*, u.username AS inspector_username
       FROM inspections i
       JOIN users u ON u.id = i.inspector_id
       WHERE i.id = ?`,
    )
    .get(id);
  if (!record) return null;

  const items = db
    .prepare(
      `SELECT item_key, section_key, label, checked
       FROM inspection_items
       WHERE inspection_id = ?`,
    )
    .all(id);

  items.sort((a, b) => (ORDER.get(a.item_key) ?? Number.MAX_SAFE_INTEGER)
    - (ORDER.get(b.item_key) ?? Number.MAX_SAFE_INTEGER));

  return { ...record, items };
}
