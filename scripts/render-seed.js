// Render's free tier has no persistent disk: the container filesystem resets
// on every cold start. This restores the SQLite DB from the seed committed in
// prisma/seed.db so the app always boots with question data available.
// Only runs when RENDER is set (i.e. never touches a local dev.db).
const fs = require("fs");
const path = require("path");

if (!process.env.RENDER) {
  process.exit(0);
}

const seedPath = path.join(__dirname, "..", "prisma", "seed.db");
const rawUrl = process.env.DATABASE_URL || "file:./dev.db";
const targetPath = path.join(__dirname, "..", rawUrl.replace(/^file:/, ""));

fs.copyFileSync(seedPath, targetPath);
console.log(`[render-seed] restored ${targetPath} from prisma/seed.db`);
