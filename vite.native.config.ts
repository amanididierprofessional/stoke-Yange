// Native bundle configuration. Keep the normal web/Vercel build in vite.config.ts unchanged.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
    // The native WebView loads a bundled SPA shell, not the remote website or an SSR server.
    spa: {
      enabled: true,
      prerender: {
        outputPath: "/index.html",
        crawlLinks: false,
        retryCount: 1,
      },
    },
  },
  vite: {
    envPrefix: ["VITE_", "SUPABASE_", "NEXT_PUBLIC_"],
  },
});
