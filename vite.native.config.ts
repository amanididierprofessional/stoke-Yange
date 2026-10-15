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
    // Only explicitly public configuration may enter the installed app bundle.
    envPrefix: ["VITE_", "NEXT_PUBLIC_"],
    // offline.ts registers the PWA service worker only in browser builds. Vite still
    // resolves its virtual module during native bundling, though, where VitePWA is
    // intentionally absent. Supply a native-only no-op so the offline native app
    // bundles cleanly without adding a service worker to the Android WebView.
    plugins: [{
      name: "stoke-yange-native-pwa-register-stub",
      enforce: "pre",
      resolveId(source) {
        if (source === "virtual:pwa-register") return "\0stoke-yange-native-pwa-register-stub";
        return null;
      },
      load(id) {
        if (id === "\0stoke-yange-native-pwa-register-stub") {
          return "export function registerSW() { return () => {}; }";
        }
        return null;
      },
    }],
  },
});
