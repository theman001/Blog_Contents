import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { Client } from "pg";
import { validateContentPath } from "./lib/slug.js";
import { parseCategoryMeta, buildCategoryChain } from "./lib/category.js";
import { normalizeRelated, checkRelated } from "./lib/related.js";
import { toDateString } from "./lib/date.js";
import { validatePostFrontMatter } from "./lib/frontmatter.js";

const BASE_DIR = "contents";
const CATEGORY_FILE = "_category.md";

/**
 * R2 Public Asset Domain
 * 예: https://asset.taeuk.site/posts/{slug}/{filename}
 */
const R2_ASSET_BASE = "https://asset.taeuk.site/posts";

const DRY_RUN = process.argv.includes("--dry-run");
const MASS_DELETE_COUNT_LIMIT = 10;
const MASS_DELETE_RATIO_LIMIT = 0.5;

/* ---------- utils ---------- */

// 재귀적으로 md 파일 수집 ({ categoryFiles, postFiles }, 둘 다 contents/ 기준 상대경로)
function walk(dir) {
  const categoryFiles = [];
  const postFiles = [];

  function visit(current) {
    for (const file of fs.readdirSync(current)) {
      const full = path.join(current, file);
      if (fs.statSync(full).isDirectory()) {
        visit(full);
      } else if (file === CATEGORY_FILE) {
        categoryFiles.push(full);
      } else if (file.endsWith(".md")) {
        postFiles.push(full);
      }
    }
  }

  visit(dir);
  return { categoryFiles, postFiles };
}

function toPosixRelative(file) {
  return path.relative(BASE_DIR, file).split(path.sep).join("/");
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

/* ---------- plan building (pure w.r.t. the filesystem; no DB) ---------- */

function buildPlan() {
  const { categoryFiles, postFiles } = walk(BASE_DIR);

  if (postFiles.length === 0) {
    throw new Error("No markdown files found. Abort sync.");
  }

  const errors = [];

  // pass 1: _category.md -> name map, keyed by folder slug
  const categoryMetaByPath = new Map();
  for (const file of categoryFiles) {
    const relative = toPosixRelative(file);
    const folderParts = relative.split("/").slice(0, -1);
    errors.push(...validateContentPath(folderParts, null).map(e => `${relative}: ${e}`));

    const raw = fs.readFileSync(file, "utf-8");
    const name = parseCategoryMeta(raw);
    if (name) categoryMetaByPath.set(folderParts.join("/"), name);
  }

  // pass 2: posts
  const posts = [];
  const fileReportSlugs = new Set();
  for (const file of postFiles) {
    const relative = toPosixRelative(file);
    const folderParts = relative.split("/").slice(0, -1);
    const basename = path.basename(relative, ".md");
    errors.push(...validateContentPath(folderParts, basename).map(e => `${relative}: ${e}`));

    const slug = relative.replace(/\.md$/, "");
    fileReportSlugs.add(slug);

    const raw = fs.readFileSync(file, "utf-8");
    const { data, content } = matter(raw);
    errors.push(...validatePostFrontMatter(data).map(e => `${relative}: ${e}`));

    posts.push({ slug, relative, folderParts, data, content });
  }

  if (errors.length > 0) {
    throw new Error(`Content validation failed:\n${errors.map(e => `  - ${e}`).join("\n")}`);
  }

  // categories referenced by any post, plus every folder that has its own _category.md
  const categoryChain = new Map(); // slug -> {slug, name, depth}
  for (const post of posts) {
    for (const cat of buildCategoryChain(post.folderParts, categoryMetaByPath)) {
      categoryChain.set(cat.slug, cat);
    }
  }
  for (const file of categoryFiles) {
    const folderParts = toPosixRelative(file).split("/").slice(0, -1);
    for (const cat of buildCategoryChain(folderParts, categoryMetaByPath)) {
      categoryChain.set(cat.slug, cat);
    }
  }

  const relatedWarnings = [];
  const reports = posts.map(post => {
    let assetSlug = path.posix.dirname(post.slug);
    if (assetSlug === ".") assetSlug = "";

    let relatedSlug = null;
    if (post.data.related) {
      const normalized = normalizeRelated(String(post.data.related));
      const { selfRef, dangling } = checkRelated(normalized, post.slug, fileReportSlugs);
      if (selfRef) {
        throw new Error(`${post.relative}: related cannot reference itself ("${normalized}")`);
      }
      if (dangling) {
        relatedWarnings.push(`${post.relative}: related target "${normalized}" does not exist (saved anyway)`);
      }
      relatedSlug = normalized;
    }

    return {
      slug: post.slug,
      title: post.data.title,
      description: post.data.description,
      content: rewriteMediaLinks(post.content, assetSlug),
      categorySlug: post.folderParts.join("/") || null,
      authorType: post.data.author_type ?? "admin",
      tags: Array.isArray(post.data.tags) ? post.data.tags : [],
      createdAt: toDateString(post.data.date),
      relatedSlug
    };
  });

  return {
    categories: [...categoryChain.values()],
    reports,
    fileReportSlugs,
    relatedWarnings
  };
}

/* ---------- DB-dependent helpers ---------- */

async function upsertCategory(client, slug, name, parentId, depth) {
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

async function fetchDbState(client) {
  const dbReports = await client.query("SELECT slug FROM reports");
  const dbCategories = await client.query("SELECT slug, depth FROM categories");
  return {
    dbReportSlugs: dbReports.rows.map(r => r.slug),
    dbCategorySlugs: dbCategories.rows.map(r => ({ slug: r.slug, depth: r.depth }))
  };
}

function computeReportDeletions(dbReportSlugs, fileReportSlugs) {
  return dbReportSlugs.filter(slug => !fileReportSlugs.has(slug));
}

function checkMassDeleteGuard(deletions, dbReportCount) {
  if (dbReportCount === 0) return null;
  const ratio = deletions.length / dbReportCount;
  const tripped = deletions.length > MASS_DELETE_COUNT_LIMIT || ratio > MASS_DELETE_RATIO_LIMIT;
  if (!tripped || process.env.ALLOW_MASS_DELETE === "1") return null;
  return (
    `Refusing to delete ${deletions.length}/${dbReportCount} reports ` +
    `(> ${MASS_DELETE_COUNT_LIMIT} or > ${Math.round(MASS_DELETE_RATIO_LIMIT * 100)}%). ` +
    `Set ALLOW_MASS_DELETE=1 to proceed intentionally.`
  );
}

/* ---------- dry run ---------- */

async function runDryRun(plan) {
  console.log(`[dry-run] ${plan.reports.length} report(s), ${plan.categories.length} categor(y/ies) from files:`);
  for (const r of plan.reports) console.log(`  upsert report: ${r.slug}`);
  for (const c of plan.categories) console.log(`  upsert category: ${c.slug} (${c.name})`);

  if (!process.env.DATABASE_URL) {
    console.log("[dry-run] DATABASE_URL not set; skipping DB diff (deletions unknown).");
    return;
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  try {
    const { dbReportSlugs, dbCategorySlugs } = await fetchDbState(client);
    const reportDeletions = computeReportDeletions(dbReportSlugs, plan.fileReportSlugs);
    const fileCategorySlugs = new Set(plan.categories.map(c => c.slug));
    const categoryDeletions = dbCategorySlugs
      .filter(c => !fileCategorySlugs.has(c.slug))
      .map(c => c.slug);

    console.log(`[dry-run] would delete ${reportDeletions.length} report(s):`);
    for (const slug of reportDeletions) console.log(`  delete report: ${slug}`);
    console.log(`[dry-run] would delete ${categoryDeletions.length} categor(y/ies):`);
    for (const slug of categoryDeletions) console.log(`  delete category: ${slug}`);

    const guardMessage = checkMassDeleteGuard(reportDeletions, dbReportSlugs.length);
    if (guardMessage) console.log(`[dry-run] mass-delete guard WOULD BLOCK a real run: ${guardMessage}`);
  } finally {
    await client.end();
  }
}

/* ---------- real sync ---------- */

async function runSync(plan) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  try {
    const { dbReportSlugs, dbCategorySlugs } = await fetchDbState(client);
    const reportDeletions = computeReportDeletions(dbReportSlugs, plan.fileReportSlugs);

    const guardMessage = checkMassDeleteGuard(reportDeletions, dbReportSlugs.length);
    if (guardMessage) throw new Error(guardMessage);

    await client.query("BEGIN");

    // categories: parents before children, since children reference parent_id
    const sortedCategories = [...plan.categories].sort((a, b) => a.depth - b.depth);
    const categoryIdBySlug = new Map();
    for (const cat of sortedCategories) {
      const parentSlug = cat.slug.includes("/") ? cat.slug.slice(0, cat.slug.lastIndexOf("/")) : null;
      const parentId = parentSlug ? categoryIdBySlug.get(parentSlug) : null;
      const id = await upsertCategory(client, cat.slug, cat.name, parentId, cat.depth);
      categoryIdBySlug.set(cat.slug, id);
    }

    for (const r of plan.reports) {
      const categoryId = r.categorySlug ? categoryIdBySlug.get(r.categorySlug) : null;
      await client.query(
        `
        INSERT INTO reports (
          slug, title, description, content_md, category_id,
          author_type, tags, created_at, related_slug
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (slug) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          content_md = EXCLUDED.content_md,
          category_id = EXCLUDED.category_id,
          author_type = EXCLUDED.author_type,
          tags = EXCLUDED.tags,
          created_at = EXCLUDED.created_at,
          related_slug = EXCLUDED.related_slug
        WHERE
          reports.content_md IS DISTINCT FROM EXCLUDED.content_md
          OR reports.description IS DISTINCT FROM EXCLUDED.description
          OR reports.title IS DISTINCT FROM EXCLUDED.title
          OR reports.author_type IS DISTINCT FROM EXCLUDED.author_type
          OR reports.tags IS DISTINCT FROM EXCLUDED.tags
          OR reports.category_id IS DISTINCT FROM EXCLUDED.category_id
          OR reports.created_at IS DISTINCT FROM EXCLUDED.created_at
          OR reports.related_slug IS DISTINCT FROM EXCLUDED.related_slug
        `,
        [r.slug, r.title, r.description, r.content, categoryId, r.authorType, r.tags, r.createdAt, r.relatedSlug]
      );
    }

    for (const slug of reportDeletions) {
      await client.query("DELETE FROM reports WHERE slug = $1", [slug]);
    }

    const fileCategorySlugs = new Set(plan.categories.map(c => c.slug));
    const categoryDeletions = dbCategorySlugs
      .filter(c => !fileCategorySlugs.has(c.slug))
      .sort((a, b) => b.depth - a.depth); // children before parents
    for (const cat of categoryDeletions) {
      await client.query("DELETE FROM categories WHERE slug = $1", [cat.slug]);
    }

    await client.query("COMMIT");
    console.log(
      `sync_to_db completed: ${plan.reports.length} report(s) upserted, ${reportDeletions.length} deleted; ` +
      `${plan.categories.length} categor(y/ies) upserted, ${categoryDeletions.length} deleted.`
    );
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    await client.end();
  }
}

/* ---------- main ---------- */

try {
  const plan = buildPlan();
  for (const warning of plan.relatedWarnings) console.warn(`warning: ${warning}`);

  if (DRY_RUN) {
    await runDryRun(plan);
  } else {
    await runSync(plan);
  }
} catch (err) {
  console.error("sync_to_db failed.", err.message ?? err);
  process.exit(1);
}
