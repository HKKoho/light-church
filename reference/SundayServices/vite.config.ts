import 'dotenv/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';
import {analyzeBulletins} from './server/geminiAnalyzeBulletins';

// Dev-only equivalent of the /api/analyze-bulletins route served by server.ts
// in production, so `npm run dev` can exercise the real Gemini call without
// running a second process.
function geminiAnalyzeBulletinsDevApi(): Plugin {
  return {
    name: 'gemini-analyze-bulletins-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/analyze-bulletins', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }

        try {
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk as Buffer);
          const body = JSON.parse(Buffer.concat(chunks).toString('utf-8') || '{}');
          const {churchName, files} = body;

          if (typeof churchName !== 'string' || !Array.isArray(files)) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({error: '請求格式錯誤：缺少 churchName 或 files。'}));
            return;
          }

          const analysis = await analyzeBulletins(churchName, files);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(analysis));
        } catch (err) {
          console.error('analyze-bulletins failed:', err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({error: err instanceof Error ? err.message : '分析週刊時發生未知錯誤。'})
          );
        }
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), geminiAnalyzeBulletinsDevApi()],
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
