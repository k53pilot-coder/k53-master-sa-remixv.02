// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";
import artwork from "./src/data/sign-artwork.json";
import references from "./src/data/reference-images.json";
import questions from "./src/data/questions.json";
import { isCacheableNavigation, offlineNavigationFallback } from "./src/lib/offline-navigation";
import { isLegacyAssetProxyUrl, signArtworkUrl } from "./src/lib/sign-artwork-url";

export default defineConfig({
  plugins: [
    VitePWA({
      outDir: ".output/public",
      strategies: "generateSW",
      filename: "sw.js",
      registerType: "autoUpdate",
      injectRegister: null,
      devOptions: { enabled: false },
      manifest: {
        name: "K53 Master SA",
        short_name: "K53 Master",
        start_url: "/",
        scope: "/",
        display: "standalone",
        theme_color: "#087956",
        background_color: "#f8fbf9",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,png,jpg,webp,woff2}"],
        maximumFileSizeToCacheInBytes: 5000000,
        additionalManifestEntries: [
          ...new Set([
            ...artwork.map((a) => signArtworkUrl(a.url)),
            ...references.manual,
            ...Object.values(references.vehicle).flat(),
            ...questions.flatMap((q) => q.images?.map((i) => i.url) ?? []),
          ]),
        ].map((url) => ({ url, revision: null })),
        navigateFallback: null,
        runtimeCaching: [
          {
            urlPattern: isCacheableNavigation,
            handler: "NetworkFirst",
            options: {
              cacheName: "k53-pages",
              networkTimeoutSeconds: 5,
              plugins: [{ handlerDidError: offlineNavigationFallback }],
              expiration: { maxEntries: 30 },
            },
          },
          {
            urlPattern: ({ url, sameOrigin }) =>
              sameOrigin && /^\/assets\/.*-[\w-]+\.(js|css|jpg|png|webp)$/.test(url.pathname),
            handler: "CacheFirst",
            options: {
              cacheName: "k53-assets",
              expiration: { maxEntries: 150, maxAgeSeconds: 31536000 },
            },
          },
        ],
      },
    }),
  ],
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
