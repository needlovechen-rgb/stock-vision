import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/stock-vision/',
  plugins: [react()],
  server: {
    proxy: {
      '/yahoo-api': {
        target: 'https://query2.finance.yahoo.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/yahoo-api/, ''),
        secure: false,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
          'Origin': 'https://finance.yahoo.com',
          'Referer': 'https://finance.yahoo.com/'
        }
      },
      '/finmind-api': {
        target: 'https://api.finmindtrade.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/finmind-api/, ''),
        secure: false,
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      }
    }
  }
})
