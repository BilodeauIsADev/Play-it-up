import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import electron from "vite-plugin-electron/simple";
import path from "node:path";

export default defineConfig({
  // Relative asset URLs work with Electron `loadFile(dist/index.html)`.
  base: "./",
  // Serve/copy favicon et al. from ./Assets to site root in dev & dist/.
  publicDir: path.resolve(__dirname, "Assets"),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
  plugins: [
    react(),
    electron({
      main: {
        entry: "electron/main.ts",
        vite: {
          resolve: {
            alias: {
              "@shared": path.resolve(__dirname, "shared"),
            },
          },
          build: {
            outDir: "dist-electron",
            sourcemap: true,
            rollupOptions: {
              external: ["electron"],
              output: {
                entryFileNames: "main.js",
                format: "es",
              },
            },
          },
        },
      },
      preload: {
        input: path.join(__dirname, "electron/preload.ts"),
        vite: {
          resolve: {
            alias: {
              "@shared": path.resolve(__dirname, "shared"),
            },
          },
          build: {
            outDir: "dist-electron",
            sourcemap: true,
            rollupOptions: {
              external: ["electron"],
              output: {
                // Electron requires .mjs extension for ESM preload scripts
                // when the package.json has `"type": "module"`. Without it
                // the preload silently fails to load, leaving `window.playitup`
                // undefined in the renderer.
                entryFileNames: "preload.mjs",
                format: "es",
              },
            },
          },
        },
      },
    }),
  ],
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
