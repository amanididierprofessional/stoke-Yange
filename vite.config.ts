// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  // Expose Supabase keys already set on Vercel (without requiring VITE_ prefix rename)
  vite: {
    envPrefix: ["VITE_", "NEXT_PUBLIC_"],
    plugins: [VitePWA({
      strategies: "generateSW",
      filename: "sw.js",
      injectRegister: null,
      registerType: "autoUpdate",
      manifest: false,
      devOptions: { enabled: false },
      workbox: {
        cacheId: "stoke-yange",
        cleanupOutdatedCaches: true,
        globPatterns: ["**/*.{js,css,woff,woff2,png,svg,ico}"],
        navigateFallback: null,
        runtimeCaching: [{
          urlPattern: ({ request, url }) => request.mode === "navigate" &&
            url.origin === self.location.origin && !url.pathname.startsWith("/~oauth") &&
            !url.pathname.startsWith("/api/"),
          handler: "NetworkFirst",
          options: { cacheName: "stoke-yange-pages", networkTimeoutSeconds: 4 },
        }, {
          urlPattern: ({ url }) => url.origin === self.location.origin &&
            /\/assets\/.*-[A-Za-z0-9_-]{8,}\./.test(url.pathname),
          handler: "CacheFirst",
          options: { cacheName: "stoke-yange-assets" },
        }],
      },
    })],
  },
});
