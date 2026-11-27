const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

// Accepts either a YYYY-MM-DD string, or a Date (gray-matter/js-yaml parses an
// unquoted "date: 2026-11-20" front matter value into a UTC-midnight Date).
// Always returns a plain "YYYY-MM-DD" string so callers never hit local-timezone
// off-by-one shifts.
export function toDateString(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "string" && DATE_ONLY_RE.test(value)) {
    return value;
  }
  throw new Error(`invalid date: ${JSON.stringify(value)}`);
}
