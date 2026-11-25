import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { readFileSync } from "fs";

// Versão mostrada no monitoramento de erros: a do package.json mais o commit
// publicado, quando a Vercel informa.
const pacote = JSON.parse(readFileSync(path.resolve(__dirname, "package.json"), "utf-8"));
const commit = (process.env.VERCEL_GIT_COMMIT_SHA ?? "").slice(0, 7);
const versaoApp = commit ? `${pacote.version}+${commit}` : pacote.version;

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    __VERSAO_APP__: JSON.stringify(versaoApp),
  },
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
});
