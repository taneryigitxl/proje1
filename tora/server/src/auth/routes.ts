import { Router } from "express";
import { z } from "zod";
import { databaseReady, prisma } from "../db.js";
import { sendError, uniqueConstraint } from "../http/errors.js";
import { validateEmail, validatePassword, validateUsername } from "@tora/shared";
import { accountId, requireAccount } from "./middleware.js";
import { hashPassword, verifyPassword } from "./password.js";
import { signToken } from "./tokens.js";

const credentialsSchema = z.object({
  username: z.string(),
  password: z.string(),
});

const registerSchema = credentialsSchema.extend({
  email: z.string(),
});

export const authRouter = Router();

authRouter.post("/register", async (req, res) => {
  if (!databaseReady) {
    sendError(res, 503, "Dünya sunucusu veritabanına ulaşamıyor. Biraz sonra tekrar dene.");
    return;
  }

  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 400, "Formu kontrol edip tekrar dene.");
    return;
  }

  const username = parsed.data.username.trim();
  const email = parsed.data.email.trim().toLowerCase();
  const password = parsed.data.password;
  const usernameError = validateUsername(username);
  const emailError = validateEmail(email);
  const passwordError = validatePassword(password);
  if (usernameError || emailError || passwordError) {
    sendError(res, 400, usernameError ?? emailError ?? passwordError ?? "Formu kontrol edip tekrar dene.");
    return;
  }

  try {
    const account = await prisma.account.create({
      data: {
        username,
        usernameKey: username.toLowerCase(),
        email,
        emailKey: email,
        passwordHash: await hashPassword(password),
      },
    });
    res.status(201).json({
      token: signToken(account.id),
      account: { id: account.id, username: account.username, email: account.email },
    });
  } catch (error) {
    const target = uniqueConstraint(error);
    if (target?.includes("email")) {
      sendError(res, 409, "Bu e-posta ile bir hesap zaten var.");
      return;
    }
    if (target) {
      sendError(res, 409, "Bu kullanıcı adı alınmış.");
      return;
    }
    throw error;
  }
});

authRouter.post("/login", async (req, res) => {
  if (!databaseReady) {
    sendError(res, 503, "Dünya sunucusu veritabanına ulaşamıyor. Biraz sonra tekrar dene.");
    return;
  }

  const parsed = credentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 401, "Kullanıcı adı veya şifre hatalı.");
    return;
  }

  const username = parsed.data.username.trim().toLowerCase();
  const account = await prisma.account.findUnique({ where: { usernameKey: username } });
  const valid = await verifyPassword(parsed.data.password, account?.passwordHash ?? null);
  if (!account || !valid) {
    sendError(res, 401, "Kullanıcı adı veya şifre hatalı.");
    return;
  }

  res.json({
    token: signToken(account.id),
    account: { id: account.id, username: account.username, email: account.email },
  });
});

authRouter.post("/logout", (_req, res) => {
  res.json({ ok: true });
});

authRouter.get("/me", requireAccount, async (_req, res) => {
  const account = await prisma.account.findUnique({ where: { id: accountId(res) } });
  if (!account) {
    sendError(res, 401, "Oturumun sona erdi. Tekrar giriş yap.");
    return;
  }
  res.json({ account: { id: account.id, username: account.username, email: account.email } });
});
