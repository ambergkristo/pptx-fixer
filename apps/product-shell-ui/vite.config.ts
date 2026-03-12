import path from "node:path";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: __dirname,
  plugins: [react(), tailwindcss()],
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
