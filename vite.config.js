import { defineConfig } from 'vite'
import { execSync } from 'child_process'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    {
      name: 'generate-manifest',
      buildStart() {
        execSync('node scripts/generate-manifest.js', { stdio: 'inherit' })
      }
    }
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        projects: resolve(__dirname, 'projects.html')
      }
    }
  }
})
