# Meja

Mesin audit trading crypto. Situs: https://triasnugra.github.io/grok2/

## Deploy ke GitHub Pages
1. Repo harus bernama `grok2` di akun `triasnugra`. Push semua isi folder ini ke branch `main`.
2. Settings → Pages → Build and deployment → Source: **GitHub Actions**.
3. Workflow `Deploy ke GitHub Pages` berjalan otomatis setiap push ke `main`.

## Lokal
    npm install
    npm run dev      # http://localhost:5173/grok2/
    npm test         # uji mesin (engine.test.ts)
    npm run build    # hasil di dist/

Jika repo diberi nama lain, ubah `base` di `vite.config.ts`.
