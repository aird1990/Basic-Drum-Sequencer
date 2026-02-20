import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // ← ①これを追加

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // ← ②これを追加
  ],
})
