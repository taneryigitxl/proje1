import type { NextFunction, Request, Response } from "express";
import { databaseReady } from "../db.js";
import { sendError } from "../http/errors.js";
import { verifyToken } from "./tokens.js";

export function requireAccount(req: Request, res: Response, next: NextFunction): void {
  if (!databaseReady) {
    sendError(res, 503, "The world server cannot reach its database. Try again shortly.");
    return;
  }

  const header = req.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
  if (!token) {
    sendError(res, 401, "You need to log in.");
    return;
  }

  try {
    res.locals.accountId = verifyToken(token);
    next();
  } catch {
    sendError(res, 401, "Your session expired. Please log in again.");
  }
}

export function accountId(res: Response): string {
  const id = res.locals.accountId;
  if (typeof id !== "string" || !id) throw new Error("Missing account on request");
  return id;
}
