import { defineConfig } from "vite";

export default defineConfig({
  build: {
    target: "esnext",
    outDir: "dist",
    minify: "terser",
  },
  server: {
    port: 5173,
  },
});
