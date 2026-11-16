import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { imagetools } from 'vite-imagetools'

// imagetools makes small, medium, and large WebP copies of photos at build time,
// so phones download a small photo and big screens a sharper one.
export default defineConfig({
  plugins: [react(), imagetools()],
})
