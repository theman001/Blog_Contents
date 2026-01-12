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

// md 파일 재귀 탐색
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

const files = walk(BASE_DIR);

// 기존 slug 목록
const dbRes = await client.query("SELECT slug FROM reports");
const dbSlugs = dbRes.rows.map(r => r.slug);

const fileSlugs = [];

for (const file of files) {
  const relative = file.replace(`${BASE_DIR}/`, "");
  const slug = relative.replace(".md", "");
  fileSlugs.push(slug);

  const raw = fs.readFileSync(file, "utf-8");
  const { data, content } = matter(raw);

  await client.query(`
    INSERT INTO reports (slug, title, content_md, created_at, updated_at)
    VALUES ($1, $2, $3, NOW(), NOW())
    ON CONFLICT (slug) DO UPDATE SET
      title = EXCLUDED.title,
      content_md = EXCLUDED.content_md,
      updated_at = NOW()
  `, [
    slug,
    data.title ?? slug.split("/").pop(),
    content
  ]);
}

// repo에 없는 글 → DB에서 삭제
for (const slug of dbSlugs) {
  if (!fileSlugs.includes(slug)) {
    await client.query("DELETE FROM reports WHERE slug = $1", [slug]);
  }
}

await client.end();
