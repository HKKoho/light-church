'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  Bot,
  CheckCircle2,
  ClipboardList,
  FileText,
  Gamepad2,
  Globe,
  Heart,
  Mic,
  MicOff,
  Network,
  Search,
  Send,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { authFetch } from '@/lib/auth';
import { useT, type Messages } from '@/lib/i18n';
import { useSpeechInput } from './use-speech-input';

/* ------------------------------------------------------------------ */
/*  Slash commands & skills                                            */
/* ------------------------------------------------------------------ */

interface SlashItem {
  name: string;
  description: string;
  type: 'command' | 'skill';
}

const messages = {
  en: {
    cmdReset: 'Start a fresh conversation (current session is archived)',
    cmdCompact: 'Summarize conversation context to free up space',
    cmdHelp: 'Show available commands',
    emptyPrompt: 'How can I serve the mission today?',
    placeholder: 'Type / for commands or send a message...',
    connected: 'Connected',
    disconnected: 'Disconnected',
    disclaimer: 'Light Church agents can make errors — always apply prayerful discernment.',
    scenarios: {
      campaign: {
        title: 'Gospel Outreach',
        subtitle: 'evangelism · communities · Great Commission',
        description:
          'Plan a gospel outreach campaign — articulate the mission calling, identify unreached communities, define outreach activities, and build a phased timeline rooted in prayer and Scripture.',
        prompt:
          'Help me plan a gospel outreach campaign. Define the biblical mission statement, target unreached communities, key evangelism activities (crusades, door-to-door, digital), and a 12-week delivery timeline aligned with the Great Commission (Matthew 28:19–20).',
      },
      funding: {
        title: 'Stewardship Search',
        subtitle: 'Christian supporters · grants · faith foundations',
        description:
          'Identify Christian foundations, faith-based grants, and church-giving programmes whose priorities align with your gospel mission and ministry goals.',
        prompt:
          'Research funding and stewardship opportunities for our gospel mission. Identify matching Christian foundations, faith-based grant programmes, and individual supporter strategies — including eligibility requirements and upcoming deadlines.',
      },
      application: {
        title: 'Ministry Proposal',
        subtitle: 'grant · theory of change · budget narrative',
        description:
          'Draft a compelling ministry grant proposal with a biblically grounded theory of change, log-frame indicators, transparent budget narrative, and a risk matrix for submission to Christian supporters.',
        prompt:
          'Help me write a ministry funding proposal. I need a biblically grounded theory of change, a logical framework with measurable discipleship and outreach indicators, a detailed budget narrative, and a risk matrix for submission to a Christian foundation.',
      },
      cooperation: {
        title: 'Church Partnership',
        subtitle: 'churches · MoU · joint mission',
        description:
          'Build gospel-centred partnerships with churches and mission organisations — framing shared objectives, structuring collaboration agreements, and coordinating joint ministry delivery.',
        prompt:
          'Draft a partnership proposal for a church or mission organisation. Outline shared gospel objectives, a collaboration model (joint evangelism, shared resources, cross-referral), an MoU structure, and a joint reporting framework.',
      },
      mne: {
        title: 'Kingdom Impact',
        subtitle: 'discipleship · transformation · evaluation',
        description:
          'Design a monitoring and evaluation framework tracking gospel impact — from salvations and baptisms to discipleship depth and community transformation — grounded in faithful stewardship of evidence.',
        prompt:
          'Design a Kingdom Impact monitoring and evaluation framework for our ministry. Create SMART indicators covering evangelism, discipleship, and community transformation; design data collection tools; outline a baseline methodology; and propose an impact evaluation approach aligned to our gospel mission.',
      },
      gameBuilder: {
        title: 'Game Builder',
        subtitle: 'spawn game-studio · storyboard · build',
        description:
          'Spawn the game-studio agent to design a short Scripture-rooted game for VBS or youth ministry — it drafts a storyboard for your approval, then builds it on your Projector page.',
        prompt:
          'Use the spawn tool to invoke the agent named game-studio: build a short (~5 minute) narrative game about the Good Samaritan (Luke 10:25–37) for a youth-group audience, ages 10–14. Start with the storyboard.',
      },
    },
  },
  'zh-TW': {
    cmdReset: '開始全新對話（目前的工作階段將被封存）',
    cmdCompact: '摘要對話脈絡以釋出空間',
    cmdHelp: '顯示可用指令',
    emptyPrompt: '今天我能如何服事使命？',
    placeholder: '輸入 / 使用指令，或傳送訊息…',
    connected: '已連線',
    disconnected: '已斷線',
    disclaimer: '光教會代理可能出錯 — 請以禱告與辨別恩賜查驗輸出。',
    scenarios: {
      campaign: {
        title: '福音外展',
        subtitle: '佈道 · 社群 · 大使命',
        description:
          '規劃福音外展活動 — 闡明宣教呼召、辨識未得之民社群、界定外展活動，並建立以禱告與聖經為基礎的分階段時程。',
        prompt:
          '協助我規劃福音外展活動。界定聖經使命宣言、目標未得之民社群、關鍵佈道活動（佈道會、挨家挨戶、數位傳播），以及符合大使命（馬太福音 28:19–20）的 12 週執行時程。',
      },
      funding: {
        title: '財務管理搜尋',
        subtitle: '基督徒支持者 · 補助金 · 信仰基金會',
        description:
          '辨識優先事項與您的福音使命及事工目標相符的基督徒基金會、信仰補助計畫與教會奉獻方案。',
        prompt:
          '研究我們福音使命的資助與財務管理機會。辨識相符的基督徒基金會、信仰補助計畫及個人支持者策略，包含申請資格要求與即將到來的截止日期。',
      },
      application: {
        title: '事工提案',
        subtitle: '補助金 · 變革理論 · 預算說明',
        description:
          '草擬以聖經為基礎、具說服力的事工補助提案，包含變革理論、含指標的邏輯架構、透明的預算說明，以及供基督徒支持者審閱的風險矩陣。',
        prompt:
          '協助我撰寫事工資金提案。我需要以聖經為基礎的變革理論、含可衡量門徒訓練與外展指標的邏輯架構、詳細預算說明，以及供基督徒基金會提交用的風險矩陣。',
      },
      cooperation: {
        title: '教會夥伴關係',
        subtitle: '教會 · 合作備忘錄 · 聯合宣教',
        description:
          '建立以福音為中心的教會與宣教機構夥伴關係 — 建構共同目標、規劃合作協議，並協調聯合事工執行。',
        prompt:
          '為教會或宣教機構草擬夥伴關係提案。概述共同福音目標、合作模式（聯合佈道、資源共享、交叉轉介）、合作備忘錄架構，以及聯合報告框架。',
      },
      mne: {
        title: '國度成效',
        subtitle: '門徒訓練 · 生命改變 · 評估',
        description:
          '設計追蹤福音成效的監測評估框架 — 從信主人數、受洗到門徒訓練深度與社群改變 — 以忠誠的證據管理為基礎。',
        prompt:
          '為我們的事工設計國度成效監測評估框架。建立涵蓋佈道、門徒訓練與社群改變的 SMART 指標；設計資料蒐集工具；概述基線方法論；並提出符合福音使命的成效評估方式。',
      },
      gameBuilder: {
        title: '遊戲工坊',
        subtitle: '啟動 game-studio · 故事板 · 製作',
        description:
          '啟動 game-studio 代理，為暑期聖經班或青少年事工設計短篇聖經主題遊戲——先產出故事板供您核准，核准後才於投影台製作完成。',
        prompt:
          '使用 spawn 工具呼叫名為 game-studio 的代理：製作一款約 5 分鐘的敘事遊戲，主題是好撒馬利亞人的比喻（路加福音 10:25–37），對象為 10–14 歲的青少年小組。請先從故事板開始。',
      },
    },
  },
} satisfies Messages<{
  cmdReset: string;
  cmdCompact: string;
  cmdHelp: string;
  emptyPrompt: string;
  placeholder: string;
  connected: string;
  disconnected: string;
  disclaimer: string;
  scenarios: Record<
    'campaign' | 'funding' | 'application' | 'cooperation' | 'mne' | 'gameBuilder',
    { title: string; subtitle: string; description: string; prompt: string }
  >;
}>;

type ScenarioKey =
  | 'campaign'
  | 'funding'
  | 'application'
  | 'cooperation'
  | 'mne'
  | 'gameBuilder';

/* ------------------------------------------------------------------ */
/*  NGO scenario cards                                                 */
/* ------------------------------------------------------------------ */

interface NgoScenario {
  readonly step: string;
  readonly key: ScenarioKey;
  readonly title: string;
  readonly subtitle: string;
  readonly description: string;
  readonly icons: readonly React.ElementType[];
  readonly accentBorder: string;
  readonly accentBg: string;
  readonly accentText: string;
  readonly shadow: string;
  readonly prompt: string;
  readonly span: 'col-span-1' | 'col-span-2' | 'col-span-3';
  readonly action: 'send' | 'prefill';
}

// Static (non-text) presentation metadata. Visible text is pulled from i18n by key.
// Ordered for the 3-col grid:
//   Row 1 → [01 Campaign (×2)]  [02 Funding Search (×1)]
//   Row 2 → [03 Application (×1)]  [05 Cooperation (×2)]
//   Row 3 → [04 M&E (×3 full)]
//   Row 4 → [06 Game Builder (×3 full, prefill-only)]
interface NgoScenarioMeta {
  readonly step: string;
  readonly key: ScenarioKey;
  readonly icons: readonly React.ElementType[];
  readonly accentBorder: string;
  readonly accentBg: string;
  readonly accentText: string;
  readonly shadow: string;
  readonly span: 'col-span-1' | 'col-span-2' | 'col-span-3';
  // 'prefill' loads the prompt into the input for review instead of sending it immediately —
  // spawning an agent by name is consequential enough that the user should see the exact
  // text before it goes out.
  readonly action: 'send' | 'prefill';
}

const NGO_SCENARIO_META: readonly NgoScenarioMeta[] = [
  {
    // Gospel Outreach — evangelism planning, wide card
    step: '01',
    key: 'campaign',
    icons: [Globe, Heart, Users],
    accentBorder: 'border-l-emerald-500/70',
    accentBg: 'hover:bg-emerald-500/10',
    accentText: 'text-emerald-500',
    shadow: 'hover:shadow-[0_8px_32px_-8px_rgba(16,185,129,0.45)]',
    span: 'col-span-2',
    action: 'send',
  },
  {
    // Stewardship Search — Christian donors & grants
    step: '02',
    key: 'funding',
    icons: [Search, Target],
    accentBorder: 'border-l-sky-500/70',
    accentBg: 'hover:bg-sky-500/10',
    accentText: 'text-sky-500',
    shadow: 'hover:shadow-[0_8px_32px_-8px_rgba(56,189,248,0.45)]',
    span: 'col-span-1',
    action: 'send',
  },
  {
    // Ministry Proposal — grant writing & theory of change
    step: '03',
    key: 'application',
    icons: [FileText, CheckCircle2],
    accentBorder: 'border-l-amber-500/70',
    accentBg: 'hover:bg-amber-500/10',
    accentText: 'text-amber-500',
    shadow: 'hover:shadow-[0_8px_32px_-8px_rgba(245,158,11,0.45)]',
    span: 'col-span-1',
    action: 'send',
  },
  {
    // Church Partnership — inter-church MoU & joint mission
    step: '04',
    key: 'cooperation',
    icons: [Network, BookOpen],
    accentBorder: 'border-l-rose-500/70',
    accentBg: 'hover:bg-rose-500/10',
    accentText: 'text-rose-500',
    shadow: 'hover:shadow-[0_8px_32px_-8px_rgba(244,63,94,0.45)]',
    span: 'col-span-2',
    action: 'send',
  },
  {
    // Kingdom Impact — M&E for discipleship & transformation
    step: '05',
    key: 'mne',
    icons: [BarChart3, TrendingUp, ClipboardList],
    accentBorder: 'border-l-violet-500/70',
    accentBg: 'hover:bg-violet-500/10',
    accentText: 'text-violet-500',
    shadow: 'hover:shadow-[0_8px_32px_-8px_rgba(139,92,246,0.45)]',
    span: 'col-span-3',
    action: 'send',
  },
  {
    // Game Builder — spawns the game-studio agent; prompt is prefilled, not auto-sent,
    // since it names a specific agent to invoke and is worth a glance before sending.
    step: '06',
    key: 'gameBuilder',
    icons: [Gamepad2, Sparkles],
    accentBorder: 'border-l-indigo-500/70',
    accentBg: 'hover:bg-indigo-500/10',
    accentText: 'text-indigo-500',
    shadow: 'hover:shadow-[0_8px_32px_-8px_rgba(99,102,241,0.45)]',
    span: 'col-span-3',
    action: 'prefill',
  },
];

function NgoScenarioCard({
  scenario,
  onClick,
}: {
  scenario: NgoScenario;
  onClick: () => void;
}) {
  const isFull = scenario.span === 'col-span-3';

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group cursor-pointer rounded-lg border border-l-[3px] bg-muted/40 p-4 text-left',
        'transition-all duration-200 hover:-translate-y-0.5',
        scenario.accentBorder,
        scenario.accentBg,
        scenario.shadow,
        scenario.span,
        isFull ? 'flex flex-row items-center gap-6' : 'flex flex-col gap-3',
      )}
    >
      {/* Icon cluster */}
      <div className={cn('flex shrink-0 items-center gap-2', isFull && 'flex-col')}>
        {scenario.icons.map((Icon, i) => (
          <Icon
            key={i}
            className={cn(
              'transition-transform duration-200 group-hover:scale-110',
              i === 0
                ? cn('size-6', scenario.accentText)
                : 'size-4 text-muted-foreground/50',
            )}
          />
        ))}
      </div>

      {/* Text block */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-baseline gap-2">
          <span className={cn('font-mono text-[10px] font-semibold', scenario.accentText)}>
            {scenario.step}
          </span>
          <span className="text-sm font-semibold leading-tight">{scenario.title}</span>
          {scenario.action === 'prefill' && (
            <span className="font-mono text-[9px] uppercase tracking-wide text-muted-foreground/50">
              edit &amp; send
            </span>
          )}
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground/60">
          {scenario.subtitle}
        </span>
        <p className="line-clamp-2 text-xs text-muted-foreground">{scenario.description}</p>
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  EmptyState                                                         */
/* ------------------------------------------------------------------ */

export function EmptyState({
  onSelectSuggestion,
  onPrefillSuggestion,
}: {
  onSelectSuggestion: (text: string) => void;
  onPrefillSuggestion: (text: string) => void;
}) {
  const t = useT(messages);
  const scenarios: NgoScenario[] = NGO_SCENARIO_META.map((meta) => ({
    ...meta,
    title: t.scenarios[meta.key].title,
    subtitle: t.scenarios[meta.key].subtitle,
    description: t.scenarios[meta.key].description,
    prompt: t.scenarios[meta.key].prompt,
  }));

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-6">
      <div className="flex flex-col items-center gap-2">
        <div className="flex size-12 items-center justify-center rounded-full border border-foreground/20 bg-muted">
          <Bot className="size-6" />
        </div>
        <p className="text-sm text-muted-foreground">{t.emptyPrompt}</p>
      </div>

      <div className="grid w-full max-w-[768px] grid-cols-3 gap-2.5">
        {scenarios.map((s) => (
          <NgoScenarioCard
            key={s.step}
            scenario={s}
            onClick={() =>
              s.action === 'prefill' ? onPrefillSuggestion(s.prompt) : onSelectSuggestion(s.prompt)
            }
          />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ChatInput                                                          */
/* ------------------------------------------------------------------ */

export function ChatInput({
  onSend,
  disabled,
  isConnected,
  userMessages = [],
  prefillRequest = null,
}: {
  onSend: (content: string) => boolean | void;
  disabled: boolean;
  isConnected: boolean;
  userMessages?: string[];
  // Loads `text` into the input without sending it. `id` should change on every
  // request (e.g. Date.now()) so the same text can be re-prefilled more than once.
  prefillRequest?: { text: string; id: number } | null;
}) {
  const t = useT(messages);
  const builtinCommands: SlashItem[] = useMemo(
    () => [
      { name: '/reset', description: t.cmdReset, type: 'command' },
      { name: '/compact', description: t.cmdCompact, type: 'command' },
      { name: '/help', description: t.cmdHelp, type: 'command' },
    ],
    [t],
  );
  const [value, setValue] = useState('');
  const handleSpeechResult = useCallback((text: string) => {
    setValue(text);
  }, []);
  const speechInput = useSpeechInput(handleSpeechResult);
  const [mounted, setMounted] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  // Skills fetched from the API; builtin commands are localized and merged below.
  const [skillItems, setSkillItems] = useState<SlashItem[]>([]);
  const slashItems = useMemo(
    () => [...skillItems, ...builtinCommands],
    [skillItems, builtinCommands],
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const historyIndexRef = useRef(-1);
  const savedInputRef = useRef('');
  const lastPrefillIdRef = useRef<number | null>(null);
  // User messages in reverse order (most recent first) for history navigation
  const inputHistory = userMessages;
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load a prefill request into the input without sending it.
  useEffect(() => {
    if (!prefillRequest || prefillRequest.id === lastPrefillIdRef.current) return;
    lastPrefillIdRef.current = prefillRequest.id;
    setValue(prefillRequest.text);
    setShowCommands(false);
    textareaRef.current?.focus();
  }, [prefillRequest]);

  // Fetch skills and merge with builtin commands
  useEffect(() => {
    void authFetch<{ data: { name: string; description: string }[] }>('/api/v1/skills')
      .then((res) => {
        const skills: SlashItem[] = (Array.isArray(res.data) ? res.data : []).map((s) => ({
          name: `/${s.name}`,
          description: s.description,
          type: 'skill' as const,
        }));
        setSkillItems(skills);
      })
      .catch(() => {
        /* keep builtin commands only */
      });
  }, []);

  // Filter commands based on current input
  const filteredCommands = value.startsWith('/')
    ? slashItems.filter((cmd) => cmd.name.toLowerCase().startsWith(value.toLowerCase()))
    : [];

  // Show/hide command menu based on input
  useEffect(() => {
    if (value.startsWith('/') && !value.includes(' ') && filteredCommands.length > 0) {
      setShowCommands(true);
      setSelectedCommandIndex(0);
    } else {
      setShowCommands(false);
    }
  }, [value, filteredCommands.length]);

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, []);

  // Resize whenever content changes programmatically (prefill, history nav, slash select)
  // rather than via direct keystrokes, which already resize inline in onChange.
  useEffect(() => {
    autoResize();
  }, [value, autoResize]);

  function selectCommand(command: string) {
    setValue(command);
    setShowCommands(false);
    textareaRef.current?.focus();
  }

  function handleSend() {
    const trimmed = value.trim();
    if (!trimmed || disabled || !isConnected) return;

    // Check if this is a skill invocation (not a builtin command)
    const matchedSkill = slashItems.find(
      (item) => item.type === 'skill' && trimmed.toLowerCase().startsWith(item.name.toLowerCase()),
    );
    let sent: boolean | void;
    if (matchedSkill) {
      const skillName = matchedSkill.name.slice(1); // remove leading /
      const args = trimmed.slice(matchedSkill.name.length).trim();
      const prompt = args
        ? `Use the ${skillName} skill to help me: ${args}`
        : `Use the ${skillName} skill to help me. Guide me step by step.`;
      sent = onSend(prompt);
    } else {
      sent = onSend(trimmed);
    }

    // Keep input text if send failed (e.g. disconnected)
    if (sent === false) return;

    historyIndexRef.current = -1;
    savedInputRef.current = '';

    setValue('');
    setShowCommands(false);
    // Reset textarea height after send
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }

  return (
    <div className="px-6 pb-2">
      <div className="relative mx-auto max-w-[768px]">
        {/* Slash command menu */}
        {showCommands && filteredCommands.length > 0 && (
          <div className="absolute bottom-full left-0 z-50 mb-2 w-full rounded-xl border bg-popover p-1 shadow-lg">
            {filteredCommands.map((cmd, i) => (
              <button
                key={cmd.name}
                className={cn(
                  'flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                  i === selectedCommandIndex
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-muted',
                )}
                onMouseEnter={() => {
                  setSelectedCommandIndex(i);
                }}
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevent textarea blur
                  selectCommand(cmd.name);
                }}
              >
                {cmd.type === 'skill' && (
                  <Wrench className="size-3.5 shrink-0 text-muted-foreground" />
                )}
                <span className="shrink-0 font-mono font-medium">{cmd.name}</span>
                <span className="truncate text-muted-foreground">{cmd.description}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2 rounded-3xl bg-muted p-2">
          <textarea
            ref={textareaRef}
            rows={1}
            placeholder={t.placeholder}
            className="flex-1 resize-none bg-transparent px-2 py-1 text-sm outline-none placeholder:text-muted-foreground"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
            }}
            onKeyDown={(e) => {
              if (showCommands && filteredCommands.length > 0) {
                if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setSelectedCommandIndex((prev) =>
                    prev > 0 ? prev - 1 : filteredCommands.length - 1,
                  );
                  return;
                }
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setSelectedCommandIndex((prev) =>
                    prev < filteredCommands.length - 1 ? prev + 1 : 0,
                  );
                  return;
                }
                if (e.key === 'Tab') {
                  e.preventDefault();
                  selectCommand(filteredCommands[selectedCommandIndex]!.name);
                  return;
                }
                if (e.key === 'Escape') {
                  e.preventDefault();
                  setShowCommands(false);
                  return;
                }
              }
              // Input history: ArrowUp/Down when not in slash menu
              if (e.key === 'ArrowUp' && !showCommands && inputHistory.length > 0) {
                if (historyIndexRef.current === -1) {
                  savedInputRef.current = value;
                }
                const nextIndex = Math.min(historyIndexRef.current + 1, inputHistory.length - 1);
                if (nextIndex !== historyIndexRef.current || historyIndexRef.current === -1) {
                  historyIndexRef.current = nextIndex;
                  setValue(inputHistory[nextIndex]!);
                  e.preventDefault();
                }
                return;
              }
              if (e.key === 'ArrowDown' && !showCommands && historyIndexRef.current >= 0) {
                e.preventDefault();
                const nextIndex = historyIndexRef.current - 1;
                historyIndexRef.current = nextIndex;
                if (nextIndex < 0) {
                  setValue(savedInputRef.current);
                } else {
                  setValue(inputHistory[nextIndex]!);
                }
                return;
              }
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (showCommands && filteredCommands.length > 0) {
                  selectCommand(filteredCommands[selectedCommandIndex]!.name);
                  return;
                }
                handleSend();
              }
            }}
          />
          {speechInput.supported && (
            <Button
              type="button"
              variant={speechInput.listening ? 'default' : 'secondary'}
              size="icon"
              className="size-8 shrink-0 rounded-full"
              disabled={disabled || !isConnected}
              onClick={() => {
                if (speechInput.listening) {
                  speechInput.stop();
                } else {
                  speechInput.start();
                }
              }}
            >
              {speechInput.listening ? (
                <MicOff className="size-4 animate-pulse" />
              ) : (
                <Mic className="size-4" />
              )}
            </Button>
          )}
          <Button
            size="icon"
            className="size-8 shrink-0 rounded-full"
            disabled={!value.trim() || disabled || !isConnected}
            onClick={handleSend}
          >
            <Send className="size-4" />
          </Button>
        </div>
        {mounted && (
          <p className="py-2 text-center text-xs text-muted-foreground">
            <span
              className={cn(
                'mr-1 inline-block size-2 rounded-full',
                isConnected ? 'animate-pulse bg-green-500' : 'bg-red-500',
              )}
            />
            {isConnected ? t.connected : t.disconnected} &mdash; {t.disclaimer}
          </p>
        )}
      </div>
    </div>
  );
}
