import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
    plugins: [react()],
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
