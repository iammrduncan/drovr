import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "fxbot",
        short_name: "fxbot",
        display: "standalone",
        start_url: "/",
        background_color: "#ffffff",
        theme_color: "#ffffff",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      // The shell is precached. /api is never cached and never answered by the worker.
      workbox: { globPatterns: ["**/*.{js,css,html,woff2}"], navigateFallbackDenylist: [/^\/api\//] },
    }),
  ],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  server: {
    // IPv4 loopback, like the API server, so `tailscale serve 5173` reaches it. Tailnet names end in .ts.net.
    host: "127.0.0.1",
    allowedHosts: [".ts.net"],
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8787",
        // Vite's proxy keeps the page's stream open after the API server stops. Close it too, so the chat sees the drop.
        configure: (proxy) => proxy.on("proxyRes", (upstream, _req, res) => upstream.on("close", () => upstream.complete || res.destroy())),
      },
    },
  },
});
