import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { execSync } from 'child_process';

const gitHash = (() => {
  try { return execSync('git rev-parse --short HEAD').toString().trim(); }
  catch { return 'local'; }
})();

const buildDate = new Date().toLocaleDateString('pt-BR', {
  day: '2-digit', month: '2-digit', year: 'numeric',
});

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __APP_BUILD__: JSON.stringify(`${buildDate} #${gitHash}`),
  },
});
