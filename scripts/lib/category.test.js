import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCategoryMeta, buildCategoryChain } from "./category.js";

test("parseCategoryMeta reads the name field", () => {
  const raw = '---\nname: "보안"\n---\n';
  assert.equal(parseCategoryMeta(raw), "보안");
});

test("parseCategoryMeta returns null when name is missing", () => {
  assert.equal(parseCategoryMeta("---\n---\n"), null);
  assert.equal(parseCategoryMeta(""), null);
});

test("buildCategoryChain falls back to the folder name when no meta exists", () => {
  const chain = buildCategoryChain(["tech", "security", "reversing"], new Map());
  assert.deepEqual(chain, [
    { slug: "tech", name: "tech", depth: 1 },
    { slug: "tech/security", name: "security", depth: 2 },
    { slug: "tech/security/reversing", name: "reversing", depth: 3 }
  ]);
});

test("buildCategoryChain uses _category.md names when present", () => {
  const meta = new Map([
    ["tech", "기술"],
    ["tech/security", "보안"],
    ["tech/security/reversing", "리버싱"]
  ]);
  const chain = buildCategoryChain(["tech", "security", "reversing"], meta);
  assert.deepEqual(chain, [
    { slug: "tech", name: "기술", depth: 1 },
    { slug: "tech/security", name: "보안", depth: 2 },
    { slug: "tech/security/reversing", name: "리버싱", depth: 3 }
  ]);
});
