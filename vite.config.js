import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // jeep-sqlite (SQLite for the browser) lazy-loads its own chunks; let it handle that.
  optimizeDeps: { exclude: ['jeep-sqlite'] },
})
