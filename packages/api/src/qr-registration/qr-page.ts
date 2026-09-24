// packages/api/src/qr-registration/qr-page.ts
//
// The public event page QR Registration deploys: event details, a large QR
// code for the registration link, and a button for people already on a phone.
// Self-contained (inline SVG + CSS, no scripts) so it works as one static file.
import QRCode from 'qrcode';
import type { QrRegistrationInput } from '@clawix/shared';

const LABELS = {
  en: {
    date: 'Date',
    time: 'Time',
    location: 'Location',
    scan: 'Scan to register',
    register: 'Register now',
  },
  'zh-TW': {
    date: '日期',
    time: '時間',
    location: '地點',
    scan: '掃描 QR 碼報名',
    register: '立即報名',
  },
} as const;

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function qrSvg(url: string): Promise<string> {
  return QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' });
}

export async function buildQrPage(input: QrRegistrationInput): Promise<string> {
  const t = LABELS[input.language];
  const svg = await qrSvg(input.registrationUrl);
  const url = escapeHtml(input.registrationUrl);
  const rows = (
    [
      [t.date, input.date],
      [t.time, input.time],
      [t.location, input.location],
    ] as const
  )
    .filter(([, value]) => value)
    .map(([label, value]) => `<div><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`)
    .join('');
  const description = input.description
    ? `<p class="desc">${escapeHtml(input.description).replace(/\n/g, '<br>')}</p>`
    : '';

  return `<!doctype html>
<html lang="${input.language}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(input.eventName)}</title>
<style>
:root{--bg:#f6f4ef;--card:#fff;--ink:#1d1b16;--muted:#6b665c;--accent:#8a5a00;--line:#e4dfd3}
@media (prefers-color-scheme:dark){:root{--bg:#15130f;--card:#1f1c17;--ink:#f3efe6;--muted:#a8a294;--accent:#e0a93a;--line:#36312a}}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px 16px;background:var(--bg);color:var(--ink);font:16px/1.5 system-ui,-apple-system,"Noto Sans TC","PingFang TC",sans-serif}
main{width:100%;max-width:440px;background:var(--card);border:1px solid var(--line);border-radius:20px;padding:28px 24px;text-align:center}
h1{margin:0 0 8px;font-size:1.6rem;line-height:1.25}
.desc{margin:0 0 16px;color:var(--muted)}
dl{margin:0 0 20px;display:grid;gap:6px;text-align:left}
dl div{display:flex;gap:12px;border-top:1px solid var(--line);padding-top:6px}
dt{min-width:5.5em;color:var(--muted)}
dd{margin:0;font-weight:600}
.qr{background:#fff;border-radius:12px;padding:12px;width:min(260px,100%);margin:0 auto}
.qr svg{display:block;width:100%;height:auto}
.scan{margin:10px 0 18px;color:var(--muted);font-size:.9rem}
a.btn{display:inline-block;background:var(--accent);color:#fff;text-decoration:none;font-weight:600;padding:12px 28px;border-radius:999px}
@media (prefers-color-scheme:dark){a.btn{color:#15130f}}
.link{margin-top:14px;font-size:.75rem;color:var(--muted);word-break:break-all}
</style>
</head>
<body>
<main>
<h1>${escapeHtml(input.eventName)}</h1>
${description}
${rows ? `<dl>${rows}</dl>` : ''}
<div class="qr" role="img" aria-label="${t.scan}">${svg}</div>
<p class="scan">${t.scan}</p>
<a class="btn" href="${url}" rel="noopener">${t.register}</a>
<p class="link">${url}</p>
</main>
</body>
</html>
`;
}
