/**
 * E12-C staging deploy helper. Pipes secrets to Vercel; does not print values.
 */
const { spawnSync } = require("child_process");
const { readFileSync, existsSync } = require("fs");
const { resolve } = require("path");

const ROOT = resolve(__dirname, "..");
const LOCAL_KEYS = [
  "AUTH_SECRET",
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD",
  "RAZORPAY_KEY_ID",
  "RAZORPAY_KEY_SECRET",
  "RAZORPAY_WEBHOOK_SECRET",
];

function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, { shell: true, cwd: ROOT, encoding: "utf8", ...opts });
}

function neonUrl(pooled) {
  const args = ["neonctl", "connection-string", "staging", "--no-color"];
  if (pooled) args.push("--pooled");
  const res = run("npx", args);
  if (res.status !== 0) {
    console.error("Neon connection-string failed (exit " + res.status + ")");
    process.exit(1);
  }
  const line = res.stdout
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.startsWith("postgresql://"));
  if (!line) {
    console.error("Neon connection-string: expected postgresql URL line");
    process.exit(1);
  }
  return line;
}

function loadLocalEnv() {
  const envPath = resolve(ROOT, ".env.local");
  if (!existsSync(envPath)) throw new Error("Missing .env.local");
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
  return env;
}

function vercelEnvAdd(key, value) {
  const res = run("npx", ["vercel", "env", "add", key, "preview", "--force"], {
    input: value,
    stdio: ["pipe", "pipe", "pipe"],
  });
  if (res.status !== 0) {
    console.error(`Failed vercel env add ${key}`);
    process.exit(1);
  }
  console.log(`OK ${key}`);
}

function main() {
  const local = loadLocalEnv();
  for (const key of LOCAL_KEYS) {
    if (!local[key]) {
      console.error(`Missing ${key} in .env.local`);
      process.exit(1);
    }
  }

  console.log("Fetching Neon staging URLs (not printed)...");
  vercelEnvAdd("DATABASE_URL", neonUrl(true));
  vercelEnvAdd("DIRECT_URL", neonUrl(false));

  for (const key of LOCAL_KEYS) {
    vercelEnvAdd(key, local[key]);
  }

  // Placeholder APP_URL; updated after first deploy URL is known.
  if (local.APP_URL && !local.APP_URL.includes("localhost")) {
    vercelEnvAdd("APP_URL", local.APP_URL);
  } else {
    vercelEnvAdd("APP_URL", "https://dandy-bags-staging.vercel.app");
  }

  console.log("Deploying preview...");
  const deploy = run("npx", ["vercel", "--yes"], { stdio: ["inherit", "pipe", "pipe"] });
  const out = (deploy.stdout || "") + (deploy.stderr || "");
  if (deploy.status !== 0) {
    console.error("Deploy failed (exit " + deploy.status + ")");
    process.exit(1);
  }

  const urlMatch = out.match(/https:\/\/[^\s]+\.vercel\.app/);
  const previewUrl = urlMatch ? urlMatch[0].replace(/[\]$]+$/, "") : "";
  if (previewUrl) {
    console.log("PREVIEW_URL=" + previewUrl);
    vercelEnvAdd("APP_URL", previewUrl);
    console.log("Redeploying with APP_URL...");
    const redeploy = run("npx", ["vercel", "--yes"], { stdio: ["inherit", "pipe", "pipe"] });
    const out2 = (redeploy.stdout || "") + (redeploy.stderr || "");
    const url2 = out2.match(/https:\/\/[^\s]+\.vercel\.app/);
    const finalUrl = url2 ? url2[0].replace(/[\]$]+$/, "") : previewUrl;
    console.log("FINAL_URL=" + finalUrl);
    if (finalUrl && finalUrl !== previewUrl) {
      vercelEnvAdd("APP_URL", finalUrl);
      console.log("Redeploying with final APP_URL...");
      run("npx", ["vercel", "--yes"], { stdio: ["inherit", "pipe", "pipe"] });
    }
  } else {
    console.log("Deploy complete (URL not parsed from output)");
  }
}

main();
