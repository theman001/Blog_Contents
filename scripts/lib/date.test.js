import { test } from "node:test";
import assert from "node:assert/strict";
import { toDateString } from "./date.js";

test("toDateString passes through a valid YYYY-MM-DD string", () => {
  assert.equal(toDateString("2026-11-20"), "2026-11-20");
});

test("toDateString converts a YAML-parsed UTC-midnight Date without shifting", () => {
  // js-yaml parses an unquoted "date: 2026-11-20" as new Date(Date.UTC(2026, 10, 20))
  const parsed = new Date(Date.UTC(2026, 10, 20));
  assert.equal(toDateString(parsed), "2026-11-20");
});

test("toDateString rejects malformed strings", () => {
  assert.throws(() => toDateString("2026/11/20"));
  assert.throws(() => toDateString("Nov 20 2026"));
});

test("toDateString rejects missing/undefined date", () => {
  assert.throws(() => toDateString(undefined));
  assert.throws(() => toDateString(null));
});
