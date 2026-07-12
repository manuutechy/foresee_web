import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.png'],
      manifest: {
        name: 'Foresee',
        short_name: 'Foresee',
        description: 'Peer-to-peer prediction markets for Kenya',
        theme_color: '#E8E9ED',
        background_color: '#E8E9ED',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/logo.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
})
