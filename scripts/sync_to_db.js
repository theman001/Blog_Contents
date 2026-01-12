import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { Client } from "pg";

const BASE_DIR = "./contents";

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

await client.connect();

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

const files = walk(BASE_DIR);

// 기존 reports slug 목록 (삭제 감지용)
const dbRes = await client.query("SELECT slug FROM reports");
const dbSlugs = dbRes.rows.map(r => r.slug);

const fileSlugs = [];

for (const file of files) {
  const relative = file.replace(`${BASE_DIR}/`, ""); // TEST/test.md
  const slug = relative.replace(".md", "");          // TEST/test
  fileSlugs.push(slug);

  const raw = fs.readFileSync(file, "utf-8");
  const { data, content } = matter(raw);

  // ---------- categories 처리 ----------
  const parts = relative.split("/");
  const folderParts = parts.slice(0, -1); // md 제외

  let parentId = null;
  let currentSlug = "";

  for (let i = 0; i < folderParts.length; i++) {
    const name = folderParts[i];
    currentSlug = currentSlug ? `${currentSlug}/${name}` : name;

    parentId = await upsertCategory(
      currentSlug,
      name,
      parentId,
      i + 1
    );
  }

  // ---------- reports 처리 ----------
  await client.query(
    `
    INSERT INTO reports (slug, title, content_md, category_id, created_at, updated_at)
    VALUES ($1, $2, $3, $4, NOW(), NOW())
    ON CONFLICT (slug) DO UPDATE SET
      title = EXCLUDED.title,
      content_md = EXCLUDED.content_md,
      category_id = EXCLUDED.category_id,
      updated_at = NOW()
    `,
    [
      slug,
      data.title ?? slug.split("/").pop(),
      content,
      parentId
    ]
  );
}

// ---------- 삭제 동기화 ----------
for (const slug of dbSlugs) {
  if (!fileSlugs.includes(slug)) {
    await client.query("DELETE FROM reports WHERE slug = $1", [slug]);
  }
}

await client.end();
