import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  server: {
    // localhost resolves to ::1 first. Binding only 0.0.0.0 makes that
    // connection fail and the port forward reports ERR_CONNECTION_RESET.
    host: "::",
    port: 5173,
    strictPort: true,
    allowedHosts: true,
  },
  preview: {
    host: "::",
    port: 4173,
    allowedHosts: true,
  },
});
