import { createReadStream, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin, type ViteDevServer } from "vite";
import type { Connect } from "vite";
import type { PreviewServer } from "vite";

const root = path.dirname(fileURLToPath(import.meta.url));
const assetsRoot = path.resolve(root, "../assets");

function serveToraAssets(): Plugin {
  const mount = (middlewares: Connect.Server) => {
    middlewares.use("/tora/assets", (req, res, next) => {
      const requestUrl = decodeURIComponent((req.url ?? "/").split("?")[0] ?? "/");
      const relative = requestUrl.startsWith("/tora/assets/") ? requestUrl.slice("/tora/assets".length) : requestUrl;
      const filePath = path.resolve(assetsRoot, `.${relative}`);
      if (filePath !== assetsRoot && !filePath.startsWith(`${assetsRoot}${path.sep}`)) {
        res.statusCode = 403;
        res.end("Forbidden");
        return;
      }
      try {
        if (!statSync(filePath).isFile()) {
          next();
          return;
        }
      } catch {
        next();
        return;
      }
      const types: Record<string, string> = {
        ".png": "image/png",
        ".json": "application/json",
        ".svg": "image/svg+xml",
      };
      res.setHeader("Content-Type", types[path.extname(filePath).toLowerCase()] ?? "application/octet-stream");
      createReadStream(filePath).pipe(res);
    });
  };

  return {
    name: "tora-assets",
    configureServer(server: ViteDevServer) {
      mount(server.middlewares);
    },
    configurePreviewServer(server: PreviewServer) {
      mount(server.middlewares);
    },
  };
}

export default defineConfig({
  base: "/tora/",
  plugins: [serveToraAssets()],
  resolve: {
    alias: {
      "@tora/shared": path.resolve(root, "../shared/src/index.ts"),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
  build: {
    outDir: "dist",
    assetsDir: "static",
    emptyOutDir: true,
    sourcemap: true,
  },
});
