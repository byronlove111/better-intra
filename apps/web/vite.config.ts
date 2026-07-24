import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitro } from 'nitro/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    // Intent: @tanstack/devtools-vite must be FIRST
    devtools(),
    tailwindcss(),
    tanstackStart(),
    // Intent deployment skill: Nitro for Node.js / Docker
    nitro(),
    viteReact(),
  ],
})

export default config
