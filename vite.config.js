// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";           // ← you must have this
import tailwindPostcss from "@tailwindcss/postcss";
import autoprefixer from "autoprefixer";

export default defineConfig({
  plugins: [
    react(),                                       // ← and use it here
  ],
  css: {
    postcss: {
      plugins: [
        tailwindPostcss(),                         // your Tailwind CDN fallback
        autoprefixer(),
      ],
    },
  },
});
