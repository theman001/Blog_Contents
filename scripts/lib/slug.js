const SEGMENT_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const ALLOWED_SECTIONS = ["tech", "trends", "essays"];

export function isValidSegment(segment) {
  return SEGMENT_RE.test(segment);
}

// relativePath: posix-style path relative to contents/, e.g. "tech/security/foo.md"
export function pathToSlug(relativePath) {
  return relativePath.replace(/\.md$/, "");
}

// folderParts: directory segments only (no filename). basename: filename without
// extension, or null to validate a directory path (e.g. for a _category.md owner).
export function validateContentPath(folderParts, basename) {
  const errors = [];

  if (folderParts.length === 0 || !ALLOWED_SECTIONS.includes(folderParts[0])) {
    errors.push(
      `top-level folder must be one of ${ALLOWED_SECTIONS.join(", ")}: got "${folderParts[0] ?? ""}"`
    );
  }

  for (const part of folderParts) {
    if (!isValidSegment(part)) {
      errors.push(`invalid folder name "${part}": must match ${SEGMENT_RE}`);
    }
  }

  if (basename !== null && basename !== undefined && !isValidSegment(basename)) {
    errors.push(`invalid file name "${basename}": must match ${SEGMENT_RE}`);
  }

  return errors;
}
