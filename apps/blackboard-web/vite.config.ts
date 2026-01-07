import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  build: {
    outDir: "dist"
  },
  server: {
  allowedHosts: ["universal-life-protocol.com"]
} 
});
