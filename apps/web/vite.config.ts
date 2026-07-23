import tailwindcss from "@tailwindcss/vite";
import babel from "@rolldown/plugin-babel";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "tanstack-router",
              test: /node_modules[\\/]@tanstack[\\/](?:history|react-router|router-core)/,
            },
          ],
        },
      },
    },
  },
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
  ],
  resolve: {
    alias: { "@": new URL("./src", import.meta.url).pathname },
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    proxy: { "/api": "http://127.0.0.1:3100" },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
  },
});
