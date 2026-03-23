import { defineConfig } from 'vite';

export default defineConfig({
  // Vercel uses this file to automatically detect the Vite framework preset.
  build: {
    outDir: 'dist', // Ensures Vercel knows where the build output goes
  }
});
