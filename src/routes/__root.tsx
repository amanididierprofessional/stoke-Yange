import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { registerOfflineApp } from "@/lib/offline";
import "@fontsource-variable/outfit";

import { I18nProvider } from "@/lib/i18n";
import { Toaster } from "@/components/ui/sonner";
import { AppShell } from "@/components/AppShell";
import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#EA580C" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { title: "Stoke Yange | Gucunga ububiko n'igurisha mu Rwanda" },
      { name: "description", content: "Stoke Yange ni application y'ubuntu ifasha amaduka yo mu Rwanda gucunga ububiko, kwandika igurisha no gukurikirana amadeni. Ikora no mu gihe nta murandasi." },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { name: "application-name", content: "Stoke Yange" },
      { property: "og:site_name", content: "Stoke Yange" },
      { property: "og:title", content: "Stoke Yange — Gucunga ububiko n'igurisha" },
      { property: "og:description", content: "Gucunga ububiko, kugurisha no gukurikirana amadeni. Ikora nta murandasi kandi igahuza amakuru igihe ubyemeye." },
      { property: "og:image", content: "https://stoke-yange.vercel.app/icon-512.png" },
      { property: "og:url", content: "https://stoke-yange.vercel.app/" },
      { name: "twitter:title", content: "Stoke Yange — Gucunga ububiko n'igurisha" },
      { name: "twitter:description", content: "Gucunga ububiko n'igurisha kuri telefone, no mu gihe nta murandasi." },
      { name: "twitter:image", content: "https://stoke-yange.vercel.app/icon-512.png" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="rw">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    registerOfflineApp().catch((error) => {
      console.warn("[offline] Service worker registration failed:", error);
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <I18nProvider>
        <AppShell>
          <Outlet />
        </AppShell>
        <Toaster position="top-center" />
      </I18nProvider>
    </QueryClientProvider>
  );
}
