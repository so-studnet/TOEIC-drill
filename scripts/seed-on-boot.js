// Serverless/container hosts (Render, Firebase App Hosting/Cloud Run, etc.)
// have no persistent disk: the filesystem resets on every cold start. This
// restores the SQLite DB from the seed committed in prisma/seed.db so the
// app always boots with question data available.
// Only runs when SEED_ON_BOOT=true, set explicitly per-platform (i.e. never
// touches a local dev.db).
const fs = require("fs");
const path = require("path");

if (process.env.SEED_ON_BOOT !== "true") {
  process.exit(0);
}

const seedPath = path.join(__dirname, "..", "prisma", "seed.db");
const rawUrl = process.env.DATABASE_URL || "file:./dev.db";
const targetPath = path.join(__dirname, "..", rawUrl.replace(/^file:/, ""));

fs.copyFileSync(seedPath, targetPath);
console.log(`[seed-on-boot] restored ${targetPath} from prisma/seed.db`);
