import { defineConfig } from "vite-plus";

export default defineConfig({
  fmt: {
    ignorePatterns: ["dist/**"],
  },
  lint: {
    ignorePatterns: ["dist/**"],
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  staged: {
    "*": "vp check --fix",
  },
  pack: {
    entry: "src/index.ts",
    format: "iife",
    platform: "browser",
    minify: true,
    outputOptions: { entryFileNames: "[name].js" },
  },
});
