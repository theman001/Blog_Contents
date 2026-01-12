import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { Client } from "pg";

const BASE_DIR = "./contents";

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
  const dbCategorySlugs = dbCategories.rows.map(r => r.slug);
  const fsCategorySlugs = new Set();

  /* ---------- 파일 처리 ---------- */
  for (const file of files) {
    const relative = file.replace(`${BASE_DIR}/`, "");
    const slug = relative.replace(".md", "");
    fileReportSlugs.push(slug);

    const raw = fs.readFileSync(file, "utf-8");
    const { data, content } = matter(raw);

    // Front Matter 파싱
    const title = data.title ?? slug.split("/").pop();
    const authorType = data.author_type ?? "unknown";
    const tags = Array.isArray(data.tags) ? data.tags : [];
    const createdAt = data.date ? new Date(data.date) : new Date();

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

    // ---------- reports upsert (변경 감지) ----------
    await client.query(
      `
      INSERT INTO reports (
        slug,
        title,
        content_md,
        category_id,
        author_type,
        tags,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (slug) DO UPDATE SET
        title = EXCLUDED.title,
        content_md = EXCLUDED.content_md,
        category_id = EXCLUDED.category_id,
        author_type = EXCLUDED.author_type,
        tags = EXCLUDED.tags
      WHERE reports.content_md IS DISTINCT FROM EXCLUDED.content_md
      `,
      [
        slug,
        title,
        content,
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
  console.log("✅ Sync completed successfully.");
} catch (err) {
  await client.query("ROLLBACK");
  console.error("❌ Sync failed. Rolled back.", err);
  process.exit(1);
} finally {
  await client.end();
}
