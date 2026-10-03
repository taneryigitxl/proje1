import jwt from "jsonwebtoken";
import { config } from "../config.js";

export function signToken(accountId: string): string {
  return jwt.sign({ sub: accountId }, config.jwtSecret, { expiresIn: "7d" });
}

export function verifyToken(token: string): string {
  const payload = jwt.verify(token, config.jwtSecret);
  if (typeof payload === "string" || typeof payload.sub !== "string" || !payload.sub) {
    throw new Error("Invalid token");
  }
  return payload.sub;
}
