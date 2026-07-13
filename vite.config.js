import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Build timestamp — stale open tabs compare against /meta/buildId and show a refresh banner.
  define: {
    __BUILD_ID__: JSON.stringify(Date.now()),
  },
});
