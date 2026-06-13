import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  const configPath = path.resolve(__dirname, 'firebase-applet-config.json');
  if (!fs.existsSync(configPath)) {
    try {
      fs.writeFileSync(
        configPath,
        JSON.stringify({
          projectId: "",
          appId: "",
          apiKey: "",
          authDomain: "",
          firestoreDatabaseId: "",
          storageBucket: "",
          messagingSenderId: "",
          measurementId: ""
        }, null, 2)
      );
    } catch (e) {
      console.warn("Could not auto-create firebase-applet-config.json:", e);
    }
  }

  return {
    base: './',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
