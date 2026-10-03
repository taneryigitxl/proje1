import { config as loadEnv } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
loadEnv({ path: path.join(root, ".env") });

function origins(value: string | undefined): string[] {
  const list = (value ?? "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return list.length > 0 ? list : ["http://localhost:5173"];
}

const jwtSecret = process.env.JWT_SECRET ?? "";
if (jwtSecret.length < 24) {
  throw new Error("JWT_SECRET must be set in tora/.env and be at least 24 characters.");
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set in tora/.env.");
}

export const config = {
  port: Number(process.env.PORT ?? 2567),
  nodeEnv: process.env.NODE_ENV ?? "development",
  clientOrigins: origins(process.env.CLIENT_URL),
  jwtSecret,
  isProd: process.env.NODE_ENV === "production",
};
