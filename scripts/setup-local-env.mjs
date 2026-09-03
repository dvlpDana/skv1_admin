import { randomBytes } from "node:crypto";
import {
  chmodSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const envPath = join(process.cwd(), ".env.local");
const current = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
let nextContent = current;
const values = new Map(
  current
    .split(/\r?\n/)
    .filter((line) => line && !line.trimStart().startsWith("#"))
    .map((line) => {
      const separator = line.indexOf("=");
      return separator < 0
        ? [line, ""]
        : [line.slice(0, separator), line.slice(separator + 1)];
    }),
);

const additions = [];
if (!values.has("NEXT_PUBLIC_API_URL")) {
  additions.push(
    "NEXT_PUBLIC_API_URL=https://api-skv1-dev.madeinlemon.com/",
  );
}
const placeholderSecret = "replace-with-at-least-32-random-characters";
if (!values.has("SESSION_SECRET")) {
  additions.push(`SESSION_SECRET=${randomBytes(48).toString("base64url")}`);
} else if (values.get("SESSION_SECRET") === placeholderSecret) {
  nextContent = nextContent.replace(
    /^SESSION_SECRET=.*$/m,
    `SESSION_SECRET=${randomBytes(48).toString("base64url")}`,
  );
}
if (!values.has("ADMIN_ALLOWED_ORIGINS")) {
  additions.push("ADMIN_ALLOWED_ORIGINS=http://localhost:3001");
}

if (additions.length > 0 || nextContent !== current) {
  const separator =
    nextContent.length > 0 && !nextContent.endsWith("\n") ? "\n" : "";
  writeFileSync(
    envPath,
    `${nextContent}${separator}${additions.join("\n")}${additions.length > 0 ? "\n" : ""}`,
    { mode: 0o600 },
  );
  chmodSync(envPath, 0o600);
  console.info("Created missing local environment settings in .env.local.");
}
