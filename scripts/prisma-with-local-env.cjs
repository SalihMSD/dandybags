/**
 * Runs a Prisma CLI command with variables from .env.local.
 * Does not print secret values.
 */
const { spawnSync } = require("child_process");
const { readFileSync, existsSync } = require("fs");
const { resolve } = require("path");

const envPath = resolve(__dirname, "..", ".env.local");
if (!existsSync(envPath)) {
  console.error("Missing .env.local. Add DATABASE_URL there (see .env.example).");
  process.exit(1);
}

const env = { ...process.env };
for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq <= 0) continue;
  const key = trimmed.slice(0, eq).trim();
  let value = trimmed.slice(eq + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  env[key] = value;
}

if (!env.DATABASE_URL) {
  console.error("DATABASE_URL is not set in .env.local.");
  process.exit(1);
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: node scripts/prisma-with-local-env.cjs <prisma args>");
  process.exit(1);
}

const result = spawnSync("npx", ["prisma", ...args], {
  stdio: "inherit",
  env,
  shell: true,
});

process.exit(result.status === null ? 1 : result.status);
