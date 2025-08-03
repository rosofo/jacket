/// <reference types="vitest/config" />
/// <reference types="@vitest/browser/providers/playwright" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      jsxImportSource: "@welldone-software/why-did-you-render",
      jsxRuntime: "automatic",
    }),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: { enabled: true },
      manifest: false,
    }),
  ],
  test: {
    projects: [
      {
        test: {
          // an example of file based convention,
          // you don't have to follow it
          include: ["**/*.{test,spec}.ts", "**/*.unit.{test,spec}.ts"],
          name: "unit",
          environment: "node",
        },
      },
      {
        test: {
          // an example of file based convention,
          // you don't have to follow it
          include: ["**/*.{test,spec}.ts", "**/*.{test,spec}.browser.ts"],
          name: "browser",
          browser: {
            enabled: true,

            instances: [
              {
                browser: "chromium",
                launch: {
                  args: ["--remote-debugging-port=9222"],
                },
              },
            ],
          },
        },
      },
    ],
  },
});
