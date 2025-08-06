import { mergeConfig } from "vite";
import base from "./vite-base.config";
import { VitePWA } from "vite-plugin-pwa";

export default mergeConfig(base, {
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      devOptions: {
        enabled: true,
      },
      manifest: false,
    }),
  ],
});
