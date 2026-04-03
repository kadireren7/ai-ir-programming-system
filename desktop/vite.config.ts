import path from "node:path";
import react from "@vitejs/plugin-react";
import electron from "vite-plugin-electron/simple";
import renderer from "vite-plugin-electron-renderer";
import { defineConfig } from "vite";

export default defineConfig({
  server: {
    open: false,
  },
  plugins: [
    react(),
    electron({
      main: { entry: "electron/main.ts" },
      preload: {
        input: path.join(__dirname, "electron/preload.ts"),
        vite: {
          build: {
            rollupOptions: {
              output: {
                // package "type":"module" yoksa .mjs olsa bile CJS bundle → require() .mjs içinde patlar; .cjs zorunlu.
                entryFileNames: "preload.cjs",
              },
            },
          },
        },
      },
      renderer: {},
    }),
    renderer(),
  ],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
