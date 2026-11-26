import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base relativa: el build se puede servir desde cualquier carpeta o subruta.
// En desarrollo, /api va al backend (carpeta back/, puerto 3001).
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 5188,
    proxy: { '/api': 'http://localhost:3001' },
  },
})
