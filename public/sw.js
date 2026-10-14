/* Offline-first shell cache for Stoke Yange. Never cache Supabase/API responses. */
const CACHE_PREFIX = "stoke-yange-shell-";
const CACHE_NAME = CACHE_PREFIX + "v1";
const SHELL_URLS = ["/", "/manifest.webmanifest", "/favicon.png", "/apple-touch-icon.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Cache the app document and the same-origin JS/CSS assets it references.
    const response = await fetch("/", { cache: "reload" });
    if (response.ok) {
      await cache.put("/", response.clone());
      const html = await response.clone().text();
      const referenced = [...html.matchAll(/(?:src|href)=["']([^"'#]+)["']/g)]
        .map((match) => match[1])
        .filter((path) => {
          try {
            const url = new URL(path, self.location.origin);
            return url.origin === self.location.origin &&
              (url.pathname.startsWith("/assets/") || /\.(?:js|css|woff2?|ttf|svg|png|webp|ico)$/i.test(url.pathname));
          } catch {
            return false;
          }
        });
      await Promise.all([...new Set([...SHELL_URLS, ...referenced])].map(async (path) => {
        try {
          const url = new URL(path, self.location.origin);
          if (url.origin === self.location.origin) await cache.add(url.href);
        } catch {
          // A non-essential asset must not prevent the offline shell from installing.
        }
      }));
    } else {
      await cache.addAll(SHELL_URLS.slice(1));
    }
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request);
        if (response.ok) {
          await cache.put(request, response.clone());
          if (url.pathname === "/") await cache.put("/", response.clone());
        }
        return response;
      } catch {
        const exactPage = (await cache.match(request)) || (await cache.match(url.pathname + url.search));
        if (exactPage) return exactPage;
        // Avoid hydrating HTML for the wrong route: fall back to the cached app home.
        if (url.pathname !== "/") return Response.redirect(new URL("/", self.location.origin).href, 302);
        return (await cache.match("/")) ||
          new Response("Stoke Yange has not been cached yet. Open it once while connected to the internet, then try again.", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
      }
    })());
    return;
  }

  // Cache versioned app assets and icons; keep APIs and other dynamic responses network-only.
  if (url.pathname.startsWith("/assets/") || /\.(?:js|css|woff2?|ttf|svg|png|webp|ico|webmanifest)$/i.test(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      } catch {
        return new Response("", { status: 504, statusText: "Offline asset unavailable" });
      }
    })());
  }
});
