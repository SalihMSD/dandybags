const fs = require("fs");
for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  if (!line.startsWith("APP_URL=")) continue;
  let v = line.slice("APP_URL=".length).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  try {
    console.log("APP_URL host:", new URL(v).host);
  } catch {
    console.log("APP_URL: invalid URL");
  }
  break;
}
