import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Situs: https://triasnugra.github.io/grok2/  -> semua aset harus relatif ke /grok2/
export default defineConfig({
  base: "/grok2/",
  plugins: [tailwindcss(), react()],
  build: { outDir: "dist", sourcemap: false },
});
