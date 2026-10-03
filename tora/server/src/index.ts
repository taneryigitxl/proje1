import { createServer, type IncomingMessage } from "node:http";
import { Server, matchMaker } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { authRouter } from "./auth/routes.js";
import { preparePasswordHasher } from "./auth/password.js";
import { characterRouter } from "./characters/routes.js";
import { config } from "./config.js";
import { connectDatabase } from "./db.js";
import { errorMiddleware } from "./http/errors.js";
import { logger } from "./logger.js";
import { loadVillageMap } from "./map/loadMap.js";
import { VillageRoom } from "./rooms/VillageRoom.js";

export async function startServer(): Promise<void> {
  loadVillageMap();
  await preparePasswordHasher();

  const app = express();
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(cors({ origin: config.clientOrigins, credentials: false }));
  app.use(express.json({ limit: "32kb" }));
  app.use(
    "/api/auth",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 40,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: "Çok fazla deneme. Biraz bekleyip tekrar dene." },
    }),
  );
  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "tora" });
  });
  app.use("/api/auth", authRouter);
  app.use("/api/characters", characterRouter);
  app.use(errorMiddleware);

  const httpServer = createServer(app);
  matchMaker.controller.getCorsHeaders = (req: IncomingMessage) => {
    const origin = req.headers.origin;
    if (!origin || config.clientOrigins.includes(origin)) {
      return { "Access-Control-Allow-Origin": origin || "*" };
    }
    return { "Access-Control-Allow-Origin": "null" };
  };

  const gameServer = new Server({
    transport: new WebSocketTransport({ server: httpServer }),
  });
  gameServer.define("village", VillageRoom);

  try {
    await connectDatabase();
  } catch (error) {
    logger.error("Database unavailable. Login and world entry will fail until PostgreSQL is reachable.", error);
  }

  await gameServer.listen(config.port);
  logger.info(`TORA listening on :${config.port}`);
  logger.info(`Allowed client origins: ${config.clientOrigins.join(", ")}`);
}

const entryFile = process.argv[1]?.replace(/\\/g, "/");
if (entryFile?.endsWith("/src/index.ts") || entryFile?.endsWith("/dist/index.js")) {
  startServer().catch((error: unknown) => {
    logger.error("TORA failed to start", error);
    process.exitCode = 1;
  });
}
