/**
 * One-off: sync .env.local keys to Vercel Preview. Does not print secret values.
 * Usage: node scripts/_vercel-staging-env-sync.cjs
 */
const { spawnSync } = require("child_process");
const { readFileSync, existsSync } = require("fs");
const { resolve } = require("path");

const KEYS = [
  "DATABASE_URL",
  "DIRECT_URL",
  "AUTH_SECRET",
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD",
  "APP_URL",
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "RAZORPAY_WEBHOOK_SECRET",
];

const envPath = resolve(__dirname, "..", ".env.local");
if (!existsSync(envPath)) {
  console.error("Missing .env.local");
  process.exit(1);
}

const env = {};
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

for (const key of KEYS) {
  if (!env[key]) {
    console.error(`Missing ${key} in .env.local — add staging value before sync.`);
    process.exit(1);
  }
}

for (const key of KEYS) {
  const add = spawnSync(
    "npx",
    ["vercel", "env", "add", key, "preview", "--force"],
    {
      input: env[key],
      encoding: "utf8",
      shell: true,
      cwd: resolve(__dirname, ".."),
      stdio: ["pipe", "pipe", "pipe"],
    },
  );
  if (add.status !== 0) {
    console.error(`Failed to set ${key} (exit ${add.status})`);
    if (add.stderr) console.error(add.stderr.slice(0, 200));
    process.exit(1);
  }
  console.log(`OK ${key}`);
}
