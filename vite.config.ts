import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf8')) as { version: string }

let gitHash = 'dev'
try {
  gitHash = execSync('git rev-parse --short HEAD', { cwd: __dirname }).toString().trim()
} catch {
  // no git / not a repo — fall back to 'dev'
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_COMMIT__: JSON.stringify(gitHash),
    __APP_BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
})
