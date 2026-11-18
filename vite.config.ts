import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import artwork from "./src/data/sign-artwork.json";
import references from "./src/data/reference-images.json";
import { isCacheableNavigation, offlineNavigationFallback } from "./src/lib/offline-navigation";
import { filterLegacyAssetProxyUrls, signArtworkUrl } from "./src/lib/sign-artwork-url";

export default defineConfig({
  resolve: {
    dedupe: ["react", "react-dom", "@tanstack/react-router", "@tanstack/react-start"],
  },
  plugins: [
    tanstackStart({
      // Keep the custom SSR wrapper used by the application.
      server: { entry: "server" },
    }),
    viteReact(),
    tailwindcss(),
    tsconfigPaths(),
    // Preserve the production Worker identity and allow Cloudflare preview builds.
    nitro({
      preset: "cloudflare_module",
      cloudflare: {
        wrangler: {
          name: "k53-master-sa-remixv-02",
          previews: {},
        },
      },
    }),
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
        additionalManifestEntries: filterLegacyAssetProxyUrls([
          ...new Set([
            ...artwork.map((a) => signArtworkUrl(a.url)),
            ...references.manual,
            ...Object.values(references.vehicle).flat(),
          ]),
        ]).map((url) => ({ url, revision: null })),
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
              sameOrigin && /^\\/assets\\/.*-[\\w-]+\\.(js|css|jpg|png|webp)$/.test(url.pathname),
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
});
