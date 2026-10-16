/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/-byte-harvest/',
  plugins: [
    preact({ prefreshEnabled: !process.env.VITEST }),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeManifestIcons: false, // the png glob below already precaches them
      manifest: {
        name: 'Byte Harvest — FE Farm',
        short_name: 'Byte Harvest',
        description: 'A cozy farm game for PhilNITS FE review',
        theme_color: '#3a9a5b',
        background_color: '#fdf8ec',
        display: 'standalone',
        orientation: 'any',
        start_url: '/-byte-harvest/',
        scope: '/-byte-harvest/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg}', '**/nunito-latin-wght-normal-*.woff2'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/papers/'),
            handler: 'CacheFirst',
            options: { cacheName: 'papers', expiration: { maxEntries: 400 } },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
  },
});
