import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeRelated, checkRelated } from "./related.js";

test("normalizeRelated passes through a bare path", () => {
  assert.equal(
    normalizeRelated("tech/security/reversing/sample-android-auth"),
    "tech/security/reversing/sample-android-auth"
  );
});

test("normalizeRelated strips a full URL down to the /posts/ path", () => {
  assert.equal(
    normalizeRelated("https://it-security-blog.pages.dev/posts/tech/security/reversing/sample-android-auth"),
    "tech/security/reversing/sample-android-auth"
  );
});

test("normalizeRelated trims leading/trailing slashes", () => {
  assert.equal(normalizeRelated("/tech/security/foo/"), "tech/security/foo");
});

test("checkRelated flags self-reference", () => {
  const result = checkRelated("essays/foo", "essays/foo", new Set(["essays/foo"]));
  assert.equal(result.selfRef, true);
  assert.equal(result.dangling, false);
});

test("checkRelated flags a dangling target without self-reference", () => {
  const result = checkRelated("tech/security/does-not-exist", "essays/foo", new Set(["essays/foo"]));
  assert.equal(result.selfRef, false);
  assert.equal(result.dangling, true);
});

test("checkRelated is clean when target exists and isn't self", () => {
  const known = new Set(["essays/foo", "tech/security/reversing/sample-android-auth"]);
  const result = checkRelated("tech/security/reversing/sample-android-auth", "essays/foo", known);
  assert.equal(result.selfRef, false);
  assert.equal(result.dangling, false);
});
