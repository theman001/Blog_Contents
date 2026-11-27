import matter from "gray-matter";

// raw: contents of a _category.md file. Returns the display name, or null if
// the file has no `name` front matter field (folder name is used as fallback).
export function parseCategoryMeta(raw) {
  const { data } = matter(raw);
  return typeof data.name === "string" && data.name.length > 0 ? data.name : null;
}

// folderParts: directory segments for one post, e.g. ["tech","security","reversing"].
// metaByPath: Map of category slug ("tech/security") -> display name, built from
// every _category.md found while walking contents/.
// Returns the ordered chain of categories (root first) that must exist for this post.
export function buildCategoryChain(folderParts, metaByPath) {
  const chain = [];
  let slug = "";
  for (let i = 0; i < folderParts.length; i++) {
    slug = slug ? `${slug}/${folderParts[i]}` : folderParts[i];
    chain.push({
      slug,
      name: metaByPath.get(slug) ?? folderParts[i],
      depth: i + 1
    });
  }
  return chain;
}
