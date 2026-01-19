import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { Client } from "pg";

const BASE_DIR = "contents";

/**
 * R2 Public Asset Domain
 * 예: https://asset.taeuk.site/posts/{slug}/{filename}
 */
const R2_ASSET_BASE = "https://asset.taeuk.site/posts";

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

/* ---------- utils ---------- */

// 재귀적으로 md 파일 수집
function walk(dir) {
  let results = [];
  fs.readdirSync(dir).forEach(file => {
    const full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) {
      results = results.concat(walk(full));
    } else if (file.endsWith(".md")) {
      results.push(full);
    }
  });
  return results;
}

// category upsert
async function upsertCategory(slug, name, parentId, depth) {
  const res = await client.query(
    `
    INSERT INTO categories (slug, name, parent_id, depth)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (slug) DO UPDATE SET
      name = EXCLUDED.name,
      parent_id = EXCLUDED.parent_id,
      depth = EXCLUDED.depth
    RETURNING id
    `,
    [slug, name, parentId, depth]
  );
  return res.rows[0].id;
}

/**
 * markdown 내 ./assets/* 경로를
 * R2 public URL로 rewrite
 *
 * ![alt](./assets/image.png)
 * → ![alt](https://asset.taeuk.site/posts/{slug}/image.png)
 */
function rewriteMediaLinks(markdown, slug) {
  const base = slug ? `${R2_ASSET_BASE}/${slug}` : R2_ASSET_BASE;

  return markdown.replace(
    /!\[([^\]]*)\]\((\.\/assets\/[^)]+)\)/g,
    (_, alt, assetPath) => {
      const filename = path.basename(assetPath);
      return `![${alt}](${base}/${filename})`;
    }
  );
}


/* ---------- main ---------- */

await client.connect();
await client.query("BEGIN");

try {
  const files = walk(BASE_DIR);

  if (files.length === 0) {
    throw new Error("No markdown files found. Abort sync.");
  }

  /* ---------- reports 삭제 감지용 ---------- */
  const dbReports = await client.query("SELECT slug FROM reports");
  const dbReportSlugs = dbReports.rows.map(r => r.slug);
  const fileReportSlugs = [];

  /* ---------- categories 삭제 감지용 ---------- */
  const dbCategories = await client.query("SELECT slug, depth FROM categories");
  const fsCategorySlugs = new Set();

  /* ---------- 파일 처리 ---------- */
  for (const file of files) {
    const relative = path.relative(BASE_DIR, file);
    const slug = relative.replace(".md", "");
    fileReportSlugs.push(slug);

    const raw = fs.readFileSync(file, "utf-8");
    const { data, content } = matter(raw);

    // Front Matter 파싱
    const title = data.title ?? slug.split("/").pop();
    const authorType = data.author_type ?? "unknown";
    const tags = Array.isArray(data.tags) ? data.tags : [];
    const createdAt = data.date ? new Date(data.date) : new Date();
    const description = data.description ?? null;

    // ---------- markdown media rewrite ----------
    let assetSlug = path.posix.dirname(slug);
    if (assetSlug === ".") assetSlug = ""; 

    const rewrittenContent = rewriteMediaLinks(content, assetSlug);
    
    // ---------- categories 처리 ----------
    const parts = relative.split("/");
    const folderParts = parts.slice(0, -1);

    let parentId = null;
    let currentSlug = "";

    for (let i = 0; i < folderParts.length; i++) {
      const name = folderParts[i];
      currentSlug = currentSlug ? `${currentSlug}/${name}` : name;

      fsCategorySlugs.add(currentSlug);

      parentId = await upsertCategory(
        currentSlug,
        name,
        parentId,
        i + 1
      );
    }

    // ---------- reports upsert ----------
    await client.query(
      `
      INSERT INTO reports (
        slug,
        title,
        description,
        content_md,
        category_id,
        author_type,
        tags,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (slug) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        content_md = EXCLUDED.content_md,
        category_id = EXCLUDED.category_id,
        author_type = EXCLUDED.author_type,
        tags = EXCLUDED.tags
      WHERE
        reports.content_md IS DISTINCT FROM EXCLUDED.content_md
        OR reports.description IS DISTINCT FROM EXCLUDED.description
      `,
      [
        slug,
        title,
        description,
        rewrittenContent,
        parentId,
        authorType,
        tags,
        createdAt
      ]
    );
  }

  /* ---------- reports 삭제 ---------- */
  for (const slug of dbReportSlugs) {
    if (!fileReportSlugs.includes(slug)) {
      await client.query(
        "DELETE FROM reports WHERE slug = $1",
        [slug]
      );
    }
  }

  /* ---------- categories 삭제 (하위부터) ---------- */
  const categoriesToDelete = dbCategories.rows
    .filter(c => !fsCategorySlugs.has(c.slug))
    .sort((a, b) => b.depth - a.depth);

  for (const cat of categoriesToDelete) {
    await client.query(
      "DELETE FROM categories WHERE slug = $1",
      [cat.slug]
    );
  }

  await client.query("COMMIT");
  console.log("✅ sync_to_db completed successfully.");
} catch (err) {
  await client.query("ROLLBACK");
  console.error("❌ sync_to_db failed. Rolled back.", err);
  process.exit(1);
} finally {
  await client.end();
}
