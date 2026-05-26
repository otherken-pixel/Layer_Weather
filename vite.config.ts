import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { SVG_WARMUP_STORAGE_PATHS } from "./src/lib/svgWarmupPaths";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const supabaseUrl = env.VITE_SUPABASE_URL?.replace(/\/$/, "");

  const svgPrecacheEntries = supabaseUrl
    ? SVG_WARMUP_STORAGE_PATHS.map((storagePath) => ({
        url: `${supabaseUrl}/storage/v1/object/public/svg_clothes_files/${storagePath}`,
        revision: null,
      }))
    : [];

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["icons/*.png"],
        manifest: {
          name: "Layer Weather",
          short_name: "Layer",
          description: "Weather-smart outfit recommendations",
          theme_color: "#6C63FF",
          background_color: "#1a1a2e",
          display: "standalone",
          orientation: "portrait",
          start_url: "/",
          icons: [
            { src: "/icons/icon.png", sizes: "1024x1024", type: "image/png" },
            {
              src: "/icons/adaptive-icon.png",
              sizes: "1024x1024",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
          additionalManifestEntries: svgPrecacheEntries,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/api\.open-meteo\.com\/.*/,
              handler: "NetworkFirst",
              options: { cacheName: "weather-api", expiration: { maxAgeSeconds: 900 } },
            },
            {
              urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/object\/public\/svg_clothes_files\/.*/,
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: "svg-clothes",
                expiration: {
                  maxEntries: 120,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                  purgeOnQuotaError: true,
                },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
