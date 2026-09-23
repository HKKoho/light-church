import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { analyzeBulletins } from './server/geminiAnalyzeBulletins.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json({ limit: '30mb' }));

app.post('/api/analyze-bulletins', async (req, res) => {
  const { churchName, files } = req.body ?? {};
  if (typeof churchName !== 'string' || !Array.isArray(files)) {
    res.status(400).json({ error: '請求格式錯誤：缺少 churchName 或 files。' });
    return;
  }

  try {
    const analysis = await analyzeBulletins(churchName, files);
    res.json(analysis);
  } catch (err) {
    console.error('analyze-bulletins failed:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : '分析週刊時發生未知錯誤。' });
  }
});

const distDir = path.join(__dirname, 'dist');
app.use(express.static(distDir));
app.get('*', (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

const port = Number(process.env.PORT) || 8080;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
