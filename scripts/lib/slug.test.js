import { test } from "node:test";
import assert from "node:assert/strict";
import { isValidSegment, pathToSlug, validateContentPath } from "./slug.js";

test("isValidSegment accepts lowercase-hyphen names", () => {
  assert.equal(isValidSegment("security"), true);
  assert.equal(isValidSegment("sample-android-auth"), true);
  assert.equal(isValidSegment("ai"), true);
});

test("isValidSegment rejects uppercase, spaces, underscores, punctuation", () => {
  assert.equal(isValidSegment("Security"), false);
  assert.equal(isValidSegment("infra ops"), false);
  assert.equal(isValidSegment("_category"), false);
  assert.equal(isValidSegment("re:invent"), false);
  assert.equal(isValidSegment(""), false);
});

test("pathToSlug strips the .md extension", () => {
  assert.equal(pathToSlug("tech/security/reversing/sample-android-auth.md"), "tech/security/reversing/sample-android-auth");
});

test("validateContentPath accepts a valid tech post", () => {
  const errors = validateContentPath(["tech", "security", "reversing"], "sample-android-auth");
  assert.deepEqual(errors, []);
});

test("validateContentPath rejects a disallowed top-level folder", () => {
  const errors = validateContentPath(["infra", "aws"], "cost-strategy");
  assert.ok(errors.some(e => e.includes("top-level folder")));
});

test("validateContentPath rejects invalid segment names", () => {
  const errors = validateContentPath(["tech", "Security"], "My-Post");
  assert.ok(errors.some(e => e.includes('"Security"')));
  assert.ok(errors.some(e => e.includes('"My-Post"')));
});

test("validateContentPath with basename=null only checks folders (category dirs)", () => {
  const errors = validateContentPath(["trends", "ai"], null);
  assert.deepEqual(errors, []);
});
