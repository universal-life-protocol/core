import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/chat": "http://localhost:3000",
      "/explain": "http://localhost:3000",
      "/views": "http://localhost:3000",
      "/redact": "http://localhost:3000"
    }
  }
});
