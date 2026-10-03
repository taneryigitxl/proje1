import { PrismaClient } from "@prisma/client";
import { logger } from "./logger.js";

export const prisma = new PrismaClient();
export let databaseReady = false;

export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
  databaseReady = true;
  logger.info("Database connected");
}
