// Accepts a bare path ("tech/security/reversing/foo") or a full URL
// ("https://example.com/posts/tech/security/reversing/foo") and returns the
// normalized slug (no leading/trailing slashes, no /posts/ prefix).
export function normalizeRelated(raw) {
  const marker = "/posts/";
  const idx = raw.indexOf(marker);
  const path = idx === -1 ? raw : raw.slice(idx + marker.length);
  return path.replace(/^\/+/, "").replace(/\/+$/, "");
}

// Returns { selfRef, dangling } for a normalized related slug.
// selfRef (pointing at its own post) is a content error; dangling (pointing at
// a slug nothing on disk defines) is a warning only - the slug is still saved.
export function checkRelated(normalizedSlug, ownSlug, knownSlugs) {
  return {
    selfRef: normalizedSlug === ownSlug,
    dangling: !knownSlugs.has(normalizedSlug)
  };
}
