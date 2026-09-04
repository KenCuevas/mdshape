import { fileURLToPath, URL } from 'node:url'

import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'

/**
 * With `base: './'` the built index.html references `./assets/...`. When the
 * preview server serves a nested history-mode route (e.g. `/epics/auth-login`)
 * the browser resolves that to `/epics/assets/...`. This middleware maps such
 * requests back to the real files so reloading any route works in `npm run preview`.
 */
function nestedRouteAssets(): Plugin {
  return {
    name: 'mdshape:nested-route-assets',
    configurePreviewServer(server) {
      server.middlewares.use((req, _res, next) => {
        const url = req.url ?? ''
        const match = /^\/(?:[^?]*\/)?(assets\/[^?]+|favicon\.svg)(\?.*)?$/.exec(url)
        if (match?.[1] && !url.startsWith(`/${match[1]}`)) {
          req.url = `/${match[1]}${match[2] ?? ''}`
        }
        next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  // Relative base so the built bundle can be opened from any folder or static server path.
  base: './',
  plugins: [vue(), nestedRouteAssets()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
