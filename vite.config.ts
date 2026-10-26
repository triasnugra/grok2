import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Situs: https://triasnugra.github.io/grok2/  -> semua aset relatif ke /grok2/
export default defineConfig({
  base: "/grok2/",
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  plugins: [tailwindcss(), react()],
  build: { outDir: "dist", sourcemap: false },
});
