import { readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";

const tempPath = resolve(".api-types.tmp.ts");
const committedPath = resolve("lib/generated/api-types.ts");

try {
  const [generated, committed] = await Promise.all([
    readFile(tempPath, "utf8"),
    readFile(committedPath, "utf8"),
  ]);
  if (generated !== committed) {
    throw new Error("Generated API types differ from lib/generated/api-types.ts. Run npm run api:types.");
  }
  console.log("API types match contract/openapi.yaml");
} finally {
  await rm(tempPath, { force: true });
}
