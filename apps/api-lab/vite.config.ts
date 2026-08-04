import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Proxy all API traffic to the local FastAPI so CORS is a non-issue.
const apiTarget = process.env.VITE_PROXY_TARGET ?? "http://localhost:8000";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      "^/(auth|users|friends|me|intra|api-keys|events|api|conversations|messages|blocks|presence|analytics|notifications|health|ws)":
        {
          target: apiTarget,
          changeOrigin: true,
          ws: true,
        },
    },
  },
});
