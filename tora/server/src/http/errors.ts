import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { logger } from "../logger.js";

export function sendError(res: Response, status: number, error: string): void {
  res.status(status).json({ error });
}

export function uniqueConstraint(error: unknown): string | null {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") return null;
  const target = error.meta?.target;
  return Array.isArray(target) ? target.join(",") : String(target ?? "");
}

export function errorMiddleware(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  logger.error("Request failed", error);
  if (res.headersSent) return;
  sendError(res, 500, "Something went wrong. Please try again.");
}
