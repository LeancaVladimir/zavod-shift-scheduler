import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "/",

  server: {
    port: 3000,
    host: true,
  },
  build: {
    outDir: "dist",
    chunkSizeWarningLimit: 500,
    cssCodeSplit: true,
    commonjsOptions: {
      strictRequires: true,
      transformMixedEsModules: true,
    },
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            return id.split("node_modules/")[1].split("/")[0].toString();
          }
        },
      },
      jsx: {
        factory: "React.createElement",
        fragment: "React.Fragment",
      },
    },
  },
});
