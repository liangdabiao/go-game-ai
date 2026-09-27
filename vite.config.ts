import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { onRequest } from "./functions/api/ai-move";

/**
 * Dev-only shim for the production Edge Function `functions/api/ai-move.ts`.
 * That route only exists on EdgeOne / Cloudflare Pages, so without this the
 * browser 404s on /api/ai-move and the AI silently degrades to the local
 * greedy AI. This middleware runs the SAME onRequest logic locally (Node 18+
 * provides global fetch/Request/Response), so the MiMo LLM decides the AI's
 * move during development. API key comes from `.env.local` / `.env`
 * (DEEPSEEK_API_KEY).
 */
function aiMoveDevPlugin(): Plugin {
    return {
        name: "ai-move-dev-middleware",
        configureServer(server: ViteDevServer) {
            const env = loadEnv(server.config.mode, server.config.envDir ?? process.cwd(), "");
            if (!env.DEEPSEEK_API_KEY) {
                server.config.logger.warn(
                    "[ai-move] DEEPSEEK_API_KEY 未设置（请复制 .env.example 为 .env.local 并填入）。" +
                        " /api/ai-move 将返回 503，AI 走子降级为本地贪心 AI。",
                );
            } else {
                server.config.logger.info(
                    `[ai-move] DeepSeek AI 已启用（key 来自 ${server.config.mode} 环境，model=${env.DEEPSEEK_MODEL ?? "default"}）`,
                );
            }

            server.middlewares.use("/api/ai-move", (req, res) => {
                if (req.method === "OPTIONS") {
                    res.writeHead(204, {
                        "access-control-allow-origin": "*",
                        "access-control-allow-methods": "POST, OPTIONS",
                        "access-control-allow-headers": "content-type",
                    });
                    res.end();
                    return;
                }
                if (req.method !== "POST") {
                    res.statusCode = 405;
                    res.setHeader("content-type", "application/json");
                    res.end(JSON.stringify({ error: "method not allowed" }));
                    return;
                }
                void (async () => {
                    const chunks: Buffer[] = [];
                    for await (const chunk of req) chunks.push(chunk as Buffer);
                    const bodyText = Buffer.concat(chunks).toString("utf-8");
                    const request = new Request("http://localhost/api/ai-move", {
                        method: "POST",
                        headers: { "content-type": "application/json" },
                        body: bodyText || undefined,
                    });
                    const response = await onRequest({ request, env });
                    res.statusCode = response.status;
                    for (const [k, v] of response.headers.entries()) {
                        try {
                            res.setHeader(k, v);
                        } catch {
                            // skip headers the server refuses (e.g. restricted)
                        }
                    }
                    res.end(await response.text());
                })().catch((err) => {
                    server.config.logger.error(`[ai-move] ${String(err)}`);
                    res.statusCode = 500;
                    res.setHeader("content-type", "application/json");
                    res.end(JSON.stringify({ move: null, error: String(err) }));
                });
            });
        },
    };
}

export default defineConfig({
    plugins: [react(), aiMoveDevPlugin()],
    resolve: {
        alias: [
            { find: "@", replacement: path.resolve(__dirname, "./src") },
            {
                find: "goban",
                replacement: path.resolve(__dirname, "./src/vendor/goban/index.ts"),
            },
            {
                find: /^goban\/(.*)$/,
                replacement: path.resolve(__dirname, "./src/vendor/goban/$1"),
            },
            {
                find: "goscorer",
                replacement: path.resolve(
                    __dirname,
                    "./src/vendor/goban/third_party/goscorer/goscorer.mjs",
                ),
            },
        ],
    },
    server: {
        port: 5173,
        open: true,
    },
    build: {
        outDir: "dist",
        sourcemap: true,
    },
});
