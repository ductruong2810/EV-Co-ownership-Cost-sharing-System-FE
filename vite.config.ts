import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import autoprefixer from 'autoprefixer'
import tailwindcss from 'tailwindcss'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000
  },
  define: {
    global: 'globalThis'
  },
  css: {
    devSourcemap: true,
    postcss: {
      plugins: [tailwindcss(), autoprefixer()]
    }
  },
  resolve: {
    alias: {
      '~': path.resolve(__dirname, './src')
    },
    extensions: ['.tsx', '.ts', '.jsx', '.js', '.json']
  },
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const file = id.toString()
          if (file.includes('node_modules')) {
            const segments = file.split('node_modules/')[1].split('/')
            let pkg = segments[0]
            if (pkg.startsWith('@') && segments.length > 1) {
              pkg = `${pkg}/${segments[1]}`
            }

            if (['react', 'react-dom', 'react-router-dom', 'react-router'].includes(pkg)) {
              return 'react'
            }
            if (pkg.startsWith('antd') || pkg.startsWith('@ant-design')) {
              return 'antd'
            }
            if (pkg.startsWith('@tanstack')) {
              return 'tanstack'
            }
            if (pkg.startsWith('three') || pkg.startsWith('@react-three')) {
              return 'three'
            }
            if (['framer-motion', 'react-hook-form', 'yup', 'react-toastify', 'axios', 'sockjs-client', '@stomp/stompjs', 'jwt-decode', 'jsqr', 'react-scroll-parallax'].includes(pkg)) {
              return pkg.replace(/[@]/g, '').replace(/\//g, '-')
            }
            return `vendor-${pkg.replace(/[@]/g, '').replace(/\//g, '-')}`
          }

          if (file.includes('src/pages/AdminDashboard')) {
            return 'admin-dashboard'
          }
          if (file.includes('src/pages/GroupPage')) {
            return 'group-page'
          }
          if (file.includes('src/pages/Dashboard')) {
            return 'dashboard'
          }
          if (file.includes('src/pages/Home')) {
            return 'home'
          }
          return undefined
        }
      }
    }
  }
})
