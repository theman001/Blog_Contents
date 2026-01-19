import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import mime from "mime-types";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand
} from "@aws-sdk/client-s3";

/* ---------- config ---------- */

const BASE_DIR = "contents";
const R2_BUCKET = process.env.R2_BUCKET; // 예: blog-assets
const R2_ENDPOINT = process.env.R2_ENDPOINT;
// 예: https://xxxx.r2.cloudflarestorage.com

const DRY_RUN = process.argv.includes("--dry-run");

/**
 * git diff 범위
 * 기본: HEAD~1..HEAD
 * CI에서 여러 커밋 반영 시:
 *   GIT_DIFF_RANGE=origin/main...HEAD
 */
const GIT_DIFF_RANGE = process.env.GIT_DIFF_RANGE || "HEAD~1 HEAD";

const r2 = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY
  }
});

/* ---------- utils ---------- */

function getGitDiff() {
  try {
    const output = execSync(
      `git diff --name-status ${GIT_DIFF_RANGE}`,
      { encoding: "utf-8" }
    ).trim();

    if (!output) return [];

    return output.split("\n").map(line => {
      const parts = line.split(/\s+/);

      // Rename: R100 old new
      if (parts[0].startsWith("R")) {
        return {
          status: "R",
          from: parts[1],
          to: parts[2]
        };
      }

      return {
        status: parts[0],
        file: parts[1]
      };
    });
  } catch (e) {
    console.warn("⚠️ git diff failed, skip media sync");
    return [];
  }
}

function isAssetFile(file) {
  return (
    typeof file === "string" &&
    file.startsWith(`${BASE_DIR}/`) &&
    file.includes("/assets/")
  );
}

function extractSlugAndFilename(file) {
  // contents/Security/Reversing/post-slug/assets/image.png
  const relative = file.replace(`${BASE_DIR}/`, "");
  const [slugPart, assetPart] = relative.split("/assets/");
  return {
    slug: slugPart,
    filename: path.basename(assetPart)
  };
}

async function uploadToR2(fullPath, key) {
  const contentType =
    mime.lookup(fullPath) || "application/octet-stream";

  if (DRY_RUN) {
    console.log(`[DRY] ⬆ Upload: ${key}`);
    return;
  }

  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: fs.readFileSync(fullPath),
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable"
    })
  );

  console.log(`⬆ Uploaded: ${key}`);
}

async function deleteFromR2(key) {
  if (DRY_RUN) {
    console.log(`[DRY] 🗑 Delete: ${key}`);
    return;
  }

  await r2.send(
    new DeleteObjectCommand({
      Bucket: R2_BUCKET,
      Key: key
    })
  );

  console.log(`🗑 Deleted: ${key}`);
}

/* ---------- main ---------- */

async function main() {
  const changes = getGitDiff();

  for (const change of changes) {
    /* ---------- rename ---------- */
    if (change.status === "R") {
      if (isAssetFile(change.from)) {
        const { slug, filename } = extractSlugAndFilename(change.from);
        const oldKey = `posts/${slug}/${filename}`;
        await deleteFromR2(oldKey);
      }

      if (isAssetFile(change.to)) {
        const { slug, filename } = extractSlugAndFilename(change.to);
        const newKey = `posts/${slug}/${filename}`;
        const fullPath = path.resolve(change.to);

        if (fs.existsSync(fullPath)) {
          await uploadToR2(fullPath, newKey);
        }
      }

      continue;
    }

    const { status, file } = change;

    if (!isAssetFile(file)) continue;

    const { slug, filename } = extractSlugAndFilename(file);
    const r2Key = `posts/${slug}/${filename}`;

    /* ---------- delete ---------- */
    if (status === "D") {
      await deleteFromR2(r2Key);
      continue;
    }

    /* ---------- add / modify ---------- */
    if (status === "A" || status === "M") {
      const fullPath = path.resolve(file);

      if (!fs.existsSync(fullPath)) {
        console.warn(`⚠️ File missing locally, skip upload: ${file}`);
        continue;
      }

      await uploadToR2(fullPath, r2Key);
    }
  }

  console.log("✅ sync_media_to_r2 completed.");
}

main().catch(err => {
  console.error("❌ sync_media_to_r2 failed.", err);
  process.exit(1);
});
