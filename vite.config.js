import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import { nodePolyfills } from 'vite-plugin-node-polyfills'; // Correct import for vite-plugin-node-polyfills

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // To exclude specific polyfills, add them to this list.
      exclude: [
        'fs', // Exclude 'fs' polyfill
      ],
      // Whether to enable polyfills for Node.js globals.
      globals: true,
      // Whether to enable polyfills for Node.js built-ins.
      protocolImports: true,
    }),
  ],
  css: {
    postcss: {
      plugins: [tailwindcss(), autoprefixer()],
    },
  },
})
