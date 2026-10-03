import { cpSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "client", "dist");
const staticDir = path.join(root, "static");

rmSync(staticDir, { recursive: true, force: true });
mkdirSync(staticDir, { recursive: true });
cpSync(path.join(dist, "index.html"), path.join(root, "index.html"));
cpSync(path.join(dist, "static"), staticDir, { recursive: true });
console.log("Published the client to /tora/ (index.html + static/).");
