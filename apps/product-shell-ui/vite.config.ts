import path from "node:path";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");

export default defineConfig({
  root: __dirname,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      react: path.join(repoRoot, "node_modules", "react"),
      "react-dom": path.join(repoRoot, "node_modules", "react-dom"),
      "react/jsx-runtime": path.join(repoRoot, "node_modules", "react", "jsx-runtime.js"),
      "react/jsx-dev-runtime": path.join(repoRoot, "node_modules", "react", "jsx-dev-runtime.js")
    }
  },
  server: {
    host: "127.0.0.1",
    port: 4173,
    proxy: {
      "/audit": "http://127.0.0.1:3000",
      "/fix": "http://127.0.0.1:3000",
      "/download": "http://127.0.0.1:3000"
    }
  },
  build: {
    outDir: path.join(__dirname, "dist"),
    emptyOutDir: true
  }
});
