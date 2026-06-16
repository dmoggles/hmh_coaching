import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/hmh_coaching/player_assessment/dist/',
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash]-v2.js',
      }
    }
  }
})
