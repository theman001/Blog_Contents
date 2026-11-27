import { test } from "node:test";
import assert from "node:assert/strict";
import { validatePostFrontMatter } from "./frontmatter.js";

test("validatePostFrontMatter passes a complete post", () => {
  const errors = validatePostFrontMatter({
    title: "제목",
    description: "설명",
    tags: ["sample"],
    author_type: "admin",
    date: "2026-11-20"
  });
  assert.deepEqual(errors, []);
});

test("validatePostFrontMatter requires title and description", () => {
  const errors = validatePostFrontMatter({ date: "2026-11-20" });
  assert.ok(errors.some(e => e.includes("title")));
  assert.ok(errors.some(e => e.includes("description")));
});

test("validatePostFrontMatter rejects an empty description (CI must fail)", () => {
  const errors = validatePostFrontMatter({ title: "t", description: "", date: "2026-11-20" });
  assert.ok(errors.some(e => e.includes("description")));
});

test("validatePostFrontMatter requires a valid date", () => {
  const errors = validatePostFrontMatter({ title: "t", description: "d", date: "20-11-2026" });
  assert.ok(errors.some(e => e.includes("date")));
});

test("validatePostFrontMatter rejects a non-array tags field", () => {
  const errors = validatePostFrontMatter({ title: "t", description: "d", date: "2026-11-20", tags: "sample" });
  assert.ok(errors.some(e => e.includes("tags")));
});
