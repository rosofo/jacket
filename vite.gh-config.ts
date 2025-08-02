import { defineConfig, mergeConfig } from "vite";
import baseConfig from "./vite.config";

// https://vite.dev/config/
export default mergeConfig(
  baseConfig,
  defineConfig({
    base: "/jacket/",
  })
);
