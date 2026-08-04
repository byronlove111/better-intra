import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const apiTarget = process.env.VITE_PROXY_TARGET ?? "http://localhost:8000";

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
