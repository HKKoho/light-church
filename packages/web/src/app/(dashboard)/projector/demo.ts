import type { Lang } from '@/lib/i18n';

/** Sentinel name used to distinguish the built-in demo from API-loaded tools. */
export const DEMO_KEY = '__clawix_demo__';

interface DemoCopy {
  docTitle: string;
  heading: string;
  intro: string;
  loopHeading: string;
  loopLede: string;
  cards: { icon: string; title: string; body: string }[];
  flowHeading: string;
  steps: string[];
  builderHeading: string;
  builderLede: string;
  ideaLabel: string;
  ideaPlaceholder: string;
  generate: string;
  previewHeading: string;
  previewLede: string;
  raisedLabel: string;
  goalLabel: string;
  progress: (pct: number) => string;
  skillHeading: string;
  save: string;
  saveHint: string;
  savedOk: string;
  savedErr: string;
  // Injected into the generated SKILL.md body
  mdWhen: string;
  mdHow: string;
  mdOut: string;
}

const COPY: Record<Lang, DemoCopy> = {
  en: {
    docTitle: 'How it works — Clawix Projector',
    heading: 'How an agent builds a tool',
    intro:
      'The Projector shows <b>micro-tools</b> — self-contained HTML apps your agent writes into <code>/Output/Projector</code>. This demo explains the autonomous loop behind them, then lets you generate and save a real skill — using the very same save channel a real tool uses.',
    loopHeading: 'The autonomous loop',
    loopLede:
      'Every agent run is a reasoning loop. The model thinks, calls a tool, reads the result, and repeats — until the job is done. Four building blocks make it autonomous:',
    cards: [
      {
        icon: '🤖',
        title: 'Agent',
        body: 'Runs in its own isolated container. Each turn it can call tools (shell, file I/O, web, memory, spawn) and feed results back into its own reasoning.',
      },
      {
        icon: '📚',
        title: 'Skills',
        body: 'Filesystem knowledge packages — a folder with a <code>SKILL.md</code>. The agent sees a one-line summary at boot and loads the full content only when a task needs it.',
      },
      {
        icon: '🧠',
        title: 'Memory',
        body: 'Durable notes the agent reads and writes itself. When a session grows large it is summarised automatically, so context survives across runs.',
      },
      {
        icon: '🕸️',
        title: 'Sub-agents & Workflow',
        body: 'The agent spawns ephemeral helpers for parallel work and orchestrates multi-step jobs — fan out, verify, then synthesise the result.',
      },
    ],
    flowHeading: 'Building a skill via the Projector',
    steps: [
      'You ask the agent for a tool (e.g. “a donation progress tracker”).',
      'The agent loads any relevant <b>skill</b> and recalls related <b>memory</b>.',
      'It writes a self-contained HTML tool into <code>/Output/Projector</code>.',
      'It captures the recipe as a reusable <code>SKILL.md</code> so next time is instant.',
      'The tool appears here as a card — and the skill is saved to your workspace.',
    ],
    builderHeading: 'Try it: generate a skill',
    builderLede:
      'Describe a tool. We will scaffold a SKILL.md the way an agent would, show a live preview of the kind of micro-tool it produces, then save the skill into your workspace.',
    ideaLabel: 'Tool idea',
    ideaPlaceholder: 'Donation progress tracker',
    generate: 'Generate skill',
    previewHeading: 'Live preview — what a Projector tool looks like',
    previewLede: 'A real micro-tool is just HTML + a little JS. Drag the numbers:',
    raisedLabel: 'Raised (USD)',
    goalLabel: 'Goal (USD)',
    progress: (pct) => `${pct}% of goal reached`,
    skillHeading: 'Generated SKILL.md',
    save: 'Save SKILL.md to workspace',
    saveHint: 'Saving…',
    savedOk: '✓ Saved. Open the Workspace → Output/Projector/demo-skill to see it.',
    savedErr: '✗ Could not save: ',
    mdWhen: 'Use when the user wants a quick visual progress widget for a fundraising goal.',
    mdHow:
      'Render a self-contained HTML page with two inputs (raised, goal) and a progress bar; recompute on input.',
    mdOut: 'A single Projector micro-tool saved under /Output/Projector.',
  },
  'zh-TW': {
    docTitle: '運作原理 — Clawix 投影台',
    heading: '代理如何打造工具',
    intro:
      '投影台會顯示<b>微型工具</b> — 由代理寫入 <code>/Output/Projector</code> 的獨立 HTML 應用程式。本示範說明其背後的自主迴圈，並讓您實際產生並儲存一個技能 — 而且使用的正是真實工具所用的同一個儲存通道。',
    loopHeading: '自主迴圈',
    loopLede:
      '每次代理執行都是一個推理迴圈：模型思考、呼叫工具、讀取結果，再重複 — 直到任務完成。四個基本元件讓它得以自主運作：',
    cards: [
      {
        icon: '🤖',
        title: '代理',
        body: '在獨立的容器中執行。每一回合都能呼叫工具（shell、檔案讀寫、網路、記憶、spawn），並將結果回饋到自身的推理中。',
      },
      {
        icon: '📚',
        title: '技能',
        body: '檔案系統的知識套件 — 一個包含 <code>SKILL.md</code> 的資料夾。代理啟動時先看到一行摘要，僅在任務需要時才載入完整內容。',
      },
      {
        icon: '🧠',
        title: '記憶',
        body: '代理自行讀寫的持久筆記。當工作階段變大時會自動摘要，讓脈絡得以跨次執行保留。',
      },
      {
        icon: '🕸️',
        title: '子代理與工作流程',
        body: '代理會派生臨時的協助者進行平行作業，並協調多步驟工作 — 展開、驗證，再整合結果。',
      },
    ],
    flowHeading: '透過投影台打造技能',
    steps: [
      '您向代理要一個工具（例如「捐款進度追蹤器」）。',
      '代理載入相關的<b>技能</b>並回想相關的<b>記憶</b>。',
      '它將一個獨立的 HTML 工具寫入 <code>/Output/Projector</code>。',
      '它把作法記錄成可重複使用的 <code>SKILL.md</code>，讓下次瞬間完成。',
      '工具會以卡片形式出現在此 — 技能也已儲存到您的工作區。',
    ],
    builderHeading: '動手試試：產生一個技能',
    builderLede:
      '描述一個工具。我們會像代理一樣搭建出 SKILL.md，即時預覽它會產出的微型工具樣貌，然後把技能儲存到您的工作區。',
    ideaLabel: '工具構想',
    ideaPlaceholder: '捐款進度追蹤器',
    generate: '產生技能',
    previewHeading: '即時預覽 — 投影台工具的樣貌',
    previewLede: '真實的微型工具其實就是 HTML 加一點 JS。拖動數字看看：',
    raisedLabel: '已募得（美元）',
    goalLabel: '目標（美元）',
    progress: (pct) => `已達成目標的 ${pct}%`,
    skillHeading: '產生的 SKILL.md',
    save: '將 SKILL.md 儲存至工作區',
    saveHint: '儲存中…',
    savedOk: '✓ 已儲存。開啟「工作區 → Output/Projector/demo-skill」即可查看。',
    savedErr: '✗ 無法儲存：',
    mdWhen: '當使用者想要一個快速、視覺化的募款目標進度小工具時使用。',
    mdHow:
      '渲染一個獨立的 HTML 頁面，包含兩個輸入欄位（已募得、目標）與一條進度條；輸入時即時重算。',
    mdOut: '一個儲存於 /Output/Projector 下的投影台微型工具。',
  },
};

/**
 * Builds a fully self-contained HTML document for the in-app demo. It runs inside
 * the Projector's sandboxed iframe and talks to the parent via the real
 * `projector:save` postMessage protocol — so "Save" writes a genuine SKILL.md.
 */
export function buildDemoHtml(lang: Lang): string {
  const c = COPY[lang] ?? COPY.en;
  const cards = c.cards
    .map(
      (card) => `
      <div class="card">
        <div class="ic">${card.icon}</div>
        <h3>${card.title}</h3>
        <p>${card.body}</p>
      </div>`,
    )
    .join('');
  const steps = c.steps.map((s) => `<li>${s}</li>`).join('');

  // Strings used inside the iframe script — JSON-encoded so quotes/newlines are safe.
  const js = {
    placeholder: JSON.stringify(c.ideaPlaceholder),
    mdWhen: JSON.stringify(c.mdWhen),
    mdHow: JSON.stringify(c.mdHow),
    mdOut: JSON.stringify(c.mdOut),
    saveHint: JSON.stringify(c.saveHint),
    savedOk: JSON.stringify(c.savedOk),
    savedErr: JSON.stringify(c.savedErr),
    progressTpl: JSON.stringify(c.progress(0).replace('0', '{PCT}')),
  };

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${c.docTitle}</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 28px 32px 56px;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", "PingFang TC", "Microsoft JhengHei", sans-serif;
    background: #0b0d12; color: #e6e8ef; line-height: 1.6;
  }
  .wrap { max-width: 860px; margin: 0 auto; }
  h1 { font-size: 26px; margin: 0 0 8px; letter-spacing: -0.02em; }
  h2 { font-size: 18px; margin: 36px 0 6px; }
  h3 { font-size: 15px; margin: 0 0 6px; }
  p { margin: 6px 0; color: #b9becb; }
  code { background: #1b1f2a; padding: 1px 6px; border-radius: 5px; font-size: 12.5px; color: #c8d2ff; }
  b { color: #e6e8ef; }
  .lede { font-size: 14px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; }
  .card { background: #11141c; border: 1px solid #222838; border-radius: 12px; padding: 14px 16px; }
  .card .ic { font-size: 22px; }
  .card p { font-size: 13px; margin: 4px 0 0; }
  ol { padding-left: 20px; } ol li { margin: 4px 0; color: #b9becb; }
  .panel { background: #11141c; border: 1px solid #222838; border-radius: 12px; padding: 18px 20px; margin-top: 12px; }
  label { display: block; font-size: 12px; text-transform: uppercase; letter-spacing: .08em; color: #8b93a7; margin-bottom: 6px; }
  input[type=text], input[type=number] {
    width: 100%; background: #0b0d12; border: 1px solid #2a3142; border-radius: 8px;
    padding: 9px 11px; color: #e6e8ef; font-size: 14px;
  }
  .btn {
    margin-top: 12px; appearance: none; cursor: pointer; border: 0; border-radius: 8px;
    padding: 9px 16px; font-size: 13.5px; font-weight: 600; color: #0b0d12;
    background: linear-gradient(180deg,#9db4ff,#6b8cff);
  }
  .btn.ghost { background: transparent; color: #9db4ff; border: 1px solid #3a4256; }
  pre { background: #0b0d12; border: 1px solid #222838; border-radius: 8px; padding: 14px; overflow:auto;
        font-size: 12.5px; color: #cdd5e6; white-space: pre-wrap; }
  .bar { height: 14px; background: #0b0d12; border: 1px solid #2a3142; border-radius: 999px; overflow: hidden; margin-top: 10px; }
  .bar > i { display: block; height: 100%; width: 0%; background: linear-gradient(90deg,#5bd6a5,#6b8cff); transition: width .25s; }
  .two { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .muted { color: #8b93a7; font-size: 12.5px; }
  .saverow { display: none; align-items: center; gap: 12px; margin-top: 12px; flex-wrap: wrap; }
  #savemsg { font-size: 12.5px; color: #9be6c2; }
</style>
</head>
<body>
<div class="wrap">
  <h1>${c.heading}</h1>
  <p class="lede">${c.intro}</p>

  <h2>${c.loopHeading}</h2>
  <p class="lede">${c.loopLede}</p>
  <div class="grid">${cards}</div>

  <h2>${c.flowHeading}</h2>
  <ol>${steps}</ol>

  <h2>${c.builderHeading}</h2>
  <p class="lede">${c.builderLede}</p>
  <div class="panel">
    <label for="idea">${c.ideaLabel}</label>
    <input id="idea" type="text" placeholder="${c.ideaPlaceholder}" />
    <button class="btn" id="gen">${c.generate}</button>
  </div>

  <h2>${c.previewHeading}</h2>
  <p class="lede">${c.previewLede}</p>
  <div class="panel">
    <div class="two">
      <div><label for="raised">${c.raisedLabel}</label><input id="raised" type="number" value="6500" /></div>
      <div><label for="goal">${c.goalLabel}</label><input id="goal" type="number" value="10000" /></div>
    </div>
    <div class="bar"><i id="fill"></i></div>
    <p class="muted" id="pct"></p>
  </div>

  <h2 id="skillHeading" style="display:none">${c.skillHeading}</h2>
  <pre id="out" style="display:none"></pre>
  <div class="saverow" id="saverow">
    <button class="btn" id="save">${c.save}</button>
    <span id="savemsg"></span>
  </div>
</div>

<script>
  var L = {
    placeholder: ${js.placeholder},
    when: ${js.mdWhen},
    how: ${js.mdHow},
    out: ${js.mdOut},
    saveHint: ${js.saveHint},
    savedOk: ${js.savedOk},
    savedErr: ${js.savedErr},
    progressTpl: ${js.progressTpl}
  };

  function slugify(s) {
    return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'my-skill';
  }

  function generate() {
    var raw = document.getElementById('idea').value.trim() || L.placeholder;
    var slug = slugify(raw);
    var md = '';
    md += '---\\n';
    md += 'name: ' + slug + '\\n';
    md += 'description: ' + raw + '\\n';
    md += '---\\n\\n';
    md += '# ' + raw + '\\n\\n';
    md += '## When to use\\n' + L.when + '\\n\\n';
    md += '## How it works\\n' + L.how + '\\n\\n';
    md += '## Output\\n' + L.out + '\\n';
    var out = document.getElementById('out');
    out.textContent = md;
    out.style.display = 'block';
    document.getElementById('skillHeading').style.display = 'block';
    document.getElementById('saverow').style.display = 'flex';
    document.getElementById('savemsg').textContent = '';
  }

  function recompute() {
    var raised = parseFloat(document.getElementById('raised').value) || 0;
    var goal = parseFloat(document.getElementById('goal').value) || 0;
    var pct = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;
    document.getElementById('fill').style.width = pct + '%';
    document.getElementById('pct').textContent = L.progressTpl.replace('{PCT}', pct);
  }

  function save() {
    var md = document.getElementById('out').textContent;
    if (!md) { return; }
    document.getElementById('savemsg').textContent = L.saveHint;
    parent.postMessage({ type: 'projector:save', filename: 'demo-skill/SKILL.md', content: md, encoding: 'text' }, '*');
  }

  document.getElementById('gen').addEventListener('click', generate);
  document.getElementById('save').addEventListener('click', save);
  document.getElementById('raised').addEventListener('input', recompute);
  document.getElementById('goal').addEventListener('input', recompute);

  window.addEventListener('message', function (e) {
    if (e.data && e.data.type === 'projector:save-result') {
      document.getElementById('savemsg').textContent = e.data.success
        ? L.savedOk
        : (L.savedErr + (e.data.error || ''));
    }
  });

  recompute();
</script>
</body>
</html>`;
}
