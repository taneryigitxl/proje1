import path from "node:path";
import { fileURLToPath } from "node:url";
import EmbeddedPostgres from "embedded-postgres";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const postgres = new EmbeddedPostgres({
  databaseDir: path.join(root, "data", "postgres"),
  user: "tora",
  password: "tora",
  port: 5432,
  persistent: true,
  initdbFlags: ["--locale=C", "--encoding=UTF8"],
});

try {
  await postgres.initialise();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (!/already|exist/i.test(message)) throw error;
}

await postgres.start();
try {
  await postgres.createDatabase("tora");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (!/already|exist/i.test(message)) throw error;
}

console.log("PostgreSQL is ready on localhost:5432 (database tora).");
await new Promise(() => {});
