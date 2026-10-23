const MAX_TEXT_LENGTH = 64;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function trimmed(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function parseDay(value) {
  const text = trimmed(value);
  if (!DATE_PATTERN.test(text)) return '';

  const [year, month, day] = text.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const valid = date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;

  return valid ? text : '';
}

export function parseFilters(query = {}) {
  const result = trimmed(query.result);

  return {
    sn: trimmed(query.sn).slice(0, MAX_TEXT_LENGTH),
    work_order: trimmed(query.work_order).slice(0, MAX_TEXT_LENGTH),
    model: trimmed(query.model).slice(0, MAX_TEXT_LENGTH),
    result: result === 'pass' || result === 'fail' ? result : '',
    from: parseDay(query.from),
    to: parseDay(query.to),
  };
}

export function hasActiveFilters(filters = {}) {
  return Boolean(
    filters.sn
    || filters.work_order
    || filters.model
    || filters.result
    || filters.from
    || filters.to,
  );
}
