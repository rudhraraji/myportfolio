import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' keeps asset paths relative so the build works on GitHub Pages
// (https://<user>.github.io/<repo>/) or any static host.
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    // Forward contact form requests to the Node server during development.
    proxy: { '/api': 'http://localhost:3001' },
  },
});
