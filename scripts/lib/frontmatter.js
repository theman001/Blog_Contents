import { toDateString } from "./date.js";

// data: the parsed front matter object (gray-matter's `data`) for a post file.
// Returns an array of error strings; empty means valid.
export function validatePostFrontMatter(data) {
  const errors = [];

  if (typeof data.title !== "string" || data.title.trim() === "") {
    errors.push("title is required");
  }
  if (typeof data.description !== "string" || data.description.trim() === "") {
    errors.push("description is required");
  }
  try {
    toDateString(data.date);
  } catch {
    errors.push(`date is required and must be YYYY-MM-DD: got ${JSON.stringify(data.date)}`);
  }
  if (data.tags !== undefined && !Array.isArray(data.tags)) {
    errors.push("tags must be an array");
  }

  return errors;
}
