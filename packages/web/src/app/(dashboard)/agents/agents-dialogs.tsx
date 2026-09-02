'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, Loader2, Wand2 } from 'lucide-react';

const SYSTEM_PROMPT_TEMPLATE = `You are [role name], a specialist in [domain / expertise].

## Goal
[Primary objective — what you are here to accomplish for the user]

## Tone & style
- Be concise and direct; get to the point in the first sentence
- Match the user's level of expertise — explain jargon when unsure
- Ask one clarifying question at a time when the request is ambiguous

## Tools
- Use \`shell\` to run commands, scripts, and CLI utilities inside the workspace
- Use \`read_file\` / \`write_file\` / \`edit_file\` to work with workspace files
- Use \`web_search\` when you need current information not in context; use \`web_fetch\` to retrieve a specific URL
- Use \`save_memory\` / \`search_memory\` to persist and recall facts across sessions
- Use \`spawn\` to delegate a sub-task to another agent by name
- Use \`cron\` only when the user explicitly asks to schedule a recurring task

## Constraints
- Never delete files or run destructive commands without explicit confirmation
- Do not guess or fabricate facts; say "I'm not sure" and offer to search instead
- Stay focused on the current task; do not volunteer unrelated changes

## Output format
- Reply in the same language the user writes in
- Wrap all code in fenced code blocks with the language identifier
- For multi-step answers, use numbered steps; for reference lists, use bullets
`.trimEnd();

// ------------------------------------------------------------------ //
//  Available tools reference (shown below the system prompt field)   //
// ------------------------------------------------------------------ //

// Static structure: group keys map into `messages.groups`; tool names are code
// identifiers and map into `messages.tools`. All human-readable copy lives in the
// dictionary above.
const TOOL_GROUPS: { group: string; tools: string[] }[] = [
  { group: 'Shell', tools: ['shell'] },
  { group: 'File system', tools: ['read_file', 'write_file', 'edit_file', 'list_directory'] },
  { group: 'Web', tools: ['web_search', 'web_fetch'] },
  { group: 'Memory', tools: ['save_memory', 'search_memory', 'share_memory'] },
  { group: 'Agents', tools: ['spawn'] },
  { group: 'Scheduling', tools: ['cron'] },
];

function ToolsReference() {
  const t = useT(messages);
  const [panelOpen, setPanelOpen] = useState(false);
  const [expandedTool, setExpandedTool] = useState<string | null>(null);

  const toggleTool = (name: string) => setExpandedTool((prev) => (prev === name ? null : name));

  return (
    <div className="rounded-md border text-xs">
      <button
        type="button"
        onClick={() => setPanelOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-muted-foreground hover:text-foreground"
      >
        <span className="font-medium">{t.toolsPanelToggle}</span>
        <ChevronDown className={`size-3.5 transition-transform ${panelOpen ? 'rotate-180' : ''}`} />
      </button>

      {panelOpen && (
        <div className="border-t px-3 pb-3 pt-2">
          <p className="mb-3 text-muted-foreground">{t.toolsPanelIntro}</p>
          <div className="flex flex-col gap-1">
            {TOOL_GROUPS.map(({ group, tools }) => (
              <div key={group} className="mb-1">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t.groups[group as keyof typeof t.groups] ?? group}
                </p>
                {tools.map((name) => {
                  const copy = t.tools[name as keyof typeof t.tools];
                  if (!copy) return null;
                  const isOpen = expandedTool === name;
                  const summary = copy.what.split(' — ')[0] ?? copy.what;
                  return (
                    <div key={name} className="rounded-md border mb-1 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => toggleTool(name)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted/50"
                      >
                        <code className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                          {name}
                        </code>
                        <span className="flex-1 text-muted-foreground">
                          {summary.slice(0, 72)}
                          {summary.length > 72 ? '…' : ''}
                        </span>
                        <ChevronDown
                          className={`size-3 shrink-0 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        />
                      </button>

                      {isOpen && (
                        <div className="border-t bg-muted/20 px-3 py-2 flex flex-col gap-2">
                          <p className="text-foreground">{copy.what}</p>
                          <div className="rounded bg-amber-50 border border-amber-200 px-2 py-1.5 dark:bg-amber-950/30 dark:border-amber-800">
                            <span className="font-semibold text-amber-700 dark:text-amber-400">
                              {t.misconception}
                            </span>
                            <span className="text-amber-800 dark:text-amber-300">
                              {copy.clarify}
                            </span>
                          </div>
                          <div className="rounded bg-blue-50 border border-blue-200 px-2 py-1.5 dark:bg-blue-950/30 dark:border-blue-800">
                            <span className="font-semibold text-blue-700 dark:text-blue-400">
                              {t.promptTip}
                            </span>
                            <span className="text-blue-800 dark:text-blue-300">{copy.tip}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { authFetch } from '@/lib/auth';
import type { ApiAgent } from './agents-list';
import { useT, type Messages } from '@/lib/i18n';

// ------------------------------------------------------------------ //
//  Messages                                                          //
// ------------------------------------------------------------------ //

interface ToolCopy {
  what: string;
  clarify: string;
  tip: string;
}

const messages = {
  en: {
    toolsPanelToggle: 'Available tools — click any tool to understand it',
    toolsPanelIntro:
      'These are the capabilities your agent can invoke. Reference them by name in the system prompt to guide when and how the agent uses each one.',
    misconception: 'Common misconception: ',
    promptTip: 'System prompt tip: ',
    groups: {
      Shell: 'Shell',
      'File system': 'File system',
      Web: 'Web',
      Memory: 'Memory',
      Agents: 'Agents',
      Scheduling: 'Scheduling',
    },
    tools: {
      shell: {
        what: "Runs a command or script inside the agent's own isolated Docker container — think of it as a private terminal the agent controls.",
        clarify:
          'This does NOT run on your server or host machine. The container is sandboxed (no network, capped CPU/memory, UID 1000). The agent can install packages, compile code, and run scripts — all inside its own box.',
        tip: 'Use shell to run scripts, process data, or call CLI tools. Tell the agent when it should prefer shell over file-io (e.g. "use shell for data processing, file-io for plain text edits").',
      },
      read_file: {
        what: "Reads the contents of a file from inside the container's /workspace or /skills directory.",
        clarify:
          "The agent can only read files within /workspace and /skills — it cannot access arbitrary paths on the host or other users' workspaces.",
        tip: 'Useful when the agent needs to inspect an existing document before editing. Say "always read a file before editing it" to prevent blind overwrites.',
      },
      write_file: {
        what: 'Creates or completely overwrites a file at the given path inside /workspace.',
        clarify:
          'This replaces the entire file. If you only want a small change, prefer edit_file — write_file is for creating new files or full rewrites.',
        tip: 'Tell the agent "use write_file to create new files, edit_file for targeted changes" to keep partial edits safe.',
      },
      edit_file: {
        what: 'Replaces one exact string inside a file with new text — like a precise find-and-replace.',
        clarify:
          'The old_string must appear exactly once in the file. If it appears zero or multiple times the edit is rejected. This is intentional — it prevents accidental mass-replacement.',
        tip: 'Safer than write_file for modifying existing documents. Instruct the agent to "prefer edit_file for modifications to existing files".',
      },
      list_directory: {
        what: 'Lists the files and subdirectories under a given path (defaults to /workspace).',
        clarify:
          'This is read-only — it never creates or modifies files. The agent uses it to orient itself before reading or writing.',
        tip: 'Helpful at the start of a task ("first list the directory to understand what exists").',
      },
      web_search: {
        what: 'Queries a search engine and returns a ranked list of results (title, URL, snippet).',
        clarify:
          'The agent does NOT browse the web automatically. It only calls web_search when it decides to — controlled by your system prompt. Results are snippets, not full page content.',
        tip: 'Tell the agent when it should and shouldn\'t search: "use web_search for current events or information that may have changed since your training".',
      },
      web_fetch: {
        what: 'Fetches a specific URL and returns the readable text content of that page.',
        clarify:
          'web_fetch is for a known URL; web_search is for discovering URLs. Fetching is blocked for private/internal IPs (SSRF protection) — it is for public web pages only.',
        tip: 'Pair with web_search: search first to find the right URL, then fetch to read the full content.',
      },
      save_memory: {
        what: 'Stores a labelled note or fact that persists across all future sessions for this user.',
        clarify:
          'Memory is scoped to the individual user — it is NOT shared with other users by default, and it does NOT carry over between different agents unless you explicitly share it.',
        tip: 'Tell the agent what kinds of things to remember: "save the user\'s preferences, decisions, and key facts when asked".',
      },
      search_memory: {
        what: 'Searches saved memories by keyword or tag and returns matching items.',
        clarify:
          "The agent doesn't recall memories automatically — it must call search_memory to look them up. Without this call, it has no access to past sessions.",
        tip: 'Instruct the agent to "always search memory at the start of a new task to check for relevant context".',
      },
      share_memory: {
        what: 'Shares a saved memory item with a group or the entire organisation so other users can access it.',
        clarify:
          "Sharing is explicit and one-way — a shared memory is visible to the target group but the agent cannot read other users' private memories.",
        tip: 'Use for team knowledge: "when the user says \'share this with the team\', use share_memory to publish it org-wide".',
      },
      spawn: {
        what: 'Creates a new sub-agent container, sends it a task prompt, waits for it to finish, and returns its output.',
        clarify:
          'Sub-agents are NOT created automatically. The agent only spawns one when it decides to call this tool. Each spawned agent is ephemeral — it does not retain memory after the task ends.',
        tip: 'Use for parallelisable or specialised work: "use spawn to delegate research tasks to the Research agent while you draft the outline".',
      },
      cron: {
        what: 'Creates, lists, or deletes a recurring scheduled task that will trigger the agent at set intervals.',
        clarify:
          'cron does not make the agent run continuously in the background. It registers a schedule; the agent is invoked fresh each time the schedule fires, with only the cron prompt as input.',
        tip: 'Only wire this up when the user explicitly asks for automation: "use cron only when the user asks to schedule a recurring task — always confirm the schedule before creating it".',
      },
    },
    // Provider/model fields
    provider: 'Provider',
    model: 'Model',
    modelPlaceholder: 'model-name',
    modelHint: 'Type any model name. Predefined models appear as suggestions.',
    // Create dialog
    createTitle: 'Create Agent',
    createDescription: 'Define a new AI agent with its model, prompt, and skills.',
    name: 'Name',
    namePlaceholder: 'Research Assistant',
    description: 'Description',
    descriptionPlaceholder: 'Optional description of this agent',
    systemPrompt: 'System Prompt',
    useTemplate: 'Use template',
    systemPromptPlaceholder:
      'You are [role], a specialist in [domain].\n\n## Goal\n[What this agent is here to accomplish]\n\n## Tone & style\n[Concise, expert, friendly — pick what fits]\n\n## Tools\n[When and how to use shell, file-io, web search]\n\n## Constraints\n[What to never do]\n\n## Output format\n[Code blocks, numbered steps, language matching]',
    promptGuidePrefix: 'A good system prompt covers: ',
    promptGuideRole: 'role',
    promptGuideGoal: 'goal',
    promptGuideTone: 'tone',
    promptGuideTools: 'tools',
    promptGuideConstraints: 'constraints',
    promptGuideFormat: 'output format',
    promptGuideSep: ', ',
    promptGuideAnd: ', and ',
    promptGuideSuffix: '. Click “Use template” to start from a scaffold.',
    apiBaseUrl: 'API Base URL',
    apiBaseUrlHint: 'Optional. Override the default API endpoint for this provider.',
    maxTokensPerRun: 'Max Tokens per Run',
    skillIds: 'Skill IDs',
    skillIdsPlaceholder: 'Comma-separated skill IDs',
    streaming: 'Streaming',
    streamingHint:
      'Send each reasoning step as a separate message. When off, the user receives one combined reply at the end of the run.',
    cancel: 'Cancel',
    // Edit dialog
    editTitle: 'Edit Agent',
    editDescription: (name: string) => `Update settings for ${name}.`,
    role: 'Role',
    rolePrimary: 'Primary (system)',
    roleWorker: 'Worker (Sub-Agent)',
    status: 'Status',
    active: 'Active',
    inactive: 'Inactive',
    save: 'Save',
  },
  'zh-TW': {
    toolsPanelToggle: '可用工具 — 點選任一工具以了解詳情',
    toolsPanelIntro:
      '這些是您的代理可呼叫的能力。在系統提示中以名稱引用它們，以引導代理何時及如何使用每項工具。',
    misconception: '常見誤解： ',
    promptTip: '系統提示建議： ',
    groups: {
      Shell: 'Shell',
      'File system': '檔案系統',
      Web: '網路',
      Memory: '記憶',
      Agents: '代理',
      Scheduling: '排程',
    },
    tools: {
      shell: {
        what: '在代理自己獨立的 Docker 容器內執行指令或腳本 — 可視為代理掌控的私人終端機。',
        clarify:
          '這「不會」在您的伺服器或主機上執行。容器是沙箱化的（無網路、限制 CPU/記憶體、UID 1000）。代理可以安裝套件、編譯程式碼並執行腳本 — 全部都在自己的容器內。',
        tip: '使用 shell 來執行腳本、處理資料或呼叫 CLI 工具。告訴代理何時應優先使用 shell 而非 file-io（例如「資料處理用 shell，純文字編輯用 file-io」）。',
      },
      read_file: {
        what: '從容器內的 /workspace 或 /skills 目錄讀取檔案內容。',
        clarify:
          '代理只能讀取 /workspace 與 /skills 內的檔案 — 無法存取主機上的任意路徑或其他使用者的工作區。',
        tip: '當代理需要在編輯前檢視既有文件時很有用。說「編輯前一律先讀取檔案」可避免盲目覆寫。',
      },
      write_file: {
        what: '在 /workspace 內的指定路徑建立或完全覆寫檔案。',
        clarify:
          '這會取代整個檔案。若您只想做小幅變更，請優先使用 edit_file — write_file 適用於建立新檔案或完整改寫。',
        tip: '告訴代理「用 write_file 建立新檔案，用 edit_file 做針對性變更」，以確保部分編輯的安全。',
      },
      edit_file: {
        what: '將檔案內某個完全相符的字串替換為新文字 — 類似精準的尋找與取代。',
        clarify:
          'old_string 在檔案中必須剛好出現一次。若出現零次或多次，編輯會被拒絕。這是刻意設計 — 可避免意外的大量替換。',
        tip: '修改既有文件時比 write_file 更安全。請指示代理「修改既有檔案時優先使用 edit_file」。',
      },
      list_directory: {
        what: '列出指定路徑下的檔案與子目錄（預設為 /workspace）。',
        clarify: '這是唯讀的 — 絕不會建立或修改檔案。代理用它在讀寫前先了解環境。',
        tip: '在任務開始時很有幫助（「先列出目錄以了解現有內容」）。',
      },
      web_search: {
        what: '查詢搜尋引擎並回傳排序後的結果清單（標題、網址、摘要）。',
        clarify:
          '代理「不會」自動瀏覽網路。它只會在自行決定時呼叫 web_search — 由您的系統提示控制。結果為摘要，而非完整頁面內容。',
        tip: '告訴代理何時該與不該搜尋：「對於時事或訓練後可能已變動的資訊，使用 web_search」。',
      },
      web_fetch: {
        what: '擷取特定網址並回傳該頁面的可讀文字內容。',
        clarify:
          'web_fetch 用於已知網址；web_search 用於探索網址。擷取會封鎖私有/內部 IP（SSRF 防護）— 僅適用於公開網頁。',
        tip: '搭配 web_search 使用：先搜尋找到正確網址，再擷取以讀取完整內容。',
      },
      save_memory: {
        what: '儲存一則帶標籤的筆記或事實，並在此使用者未來所有工作階段中保留。',
        clarify:
          '記憶以個別使用者為範圍 — 預設「不會」與其他使用者共用，也不會在不同代理間延續，除非您明確共用。',
        tip: '告訴代理該記住哪些內容：「在被要求時，儲存使用者的偏好、決策與關鍵事實」。',
      },
      search_memory: {
        what: '依關鍵字或標籤搜尋已儲存的記憶並回傳相符項目。',
        clarify:
          '代理不會自動回想記憶 — 它必須呼叫 search_memory 才能查找。若未呼叫，它便無法存取過往工作階段。',
        tip: '指示代理「在新任務開始時一律搜尋記憶，以檢查相關脈絡」。',
      },
      share_memory: {
        what: '將已儲存的記憶項目與群組或整個組織共用，讓其他使用者可存取。',
        clarify:
          '共用是明確且單向的 — 已共用的記憶對目標群組可見，但代理無法讀取其他使用者的私人記憶。',
        tip: '用於團隊知識：「當使用者說『把這個分享給團隊』時，使用 share_memory 將其發布至全組織」。',
      },
      spawn: {
        what: '建立新的子代理容器，傳送任務提示，等待其完成，並回傳其輸出。',
        clarify:
          '子代理「不會」自動建立。代理只會在自行決定呼叫此工具時才產生一個。每個產生的代理都是短暫的 — 任務結束後不會保留記憶。',
        tip: '用於可平行或專門的工作：「在你草擬大綱時，用 spawn 將研究任務委派給研究代理」。',
      },
      cron: {
        what: '建立、列出或刪除一項會依設定間隔觸發代理的週期性排程任務。',
        clarify:
          'cron 不會讓代理在背景持續執行。它註冊一個排程；每次排程觸發時，代理會以全新狀態被呼叫，僅以 cron 提示作為輸入。',
        tip: '僅在使用者明確要求自動化時才設定：「只有在使用者要求排程週期性任務時才使用 cron — 建立前務必確認排程」。',
      },
    },
    provider: '供應商',
    model: '模型',
    modelPlaceholder: '模型名稱',
    modelHint: '可輸入任何模型名稱。預先定義的模型會顯示為建議。',
    createTitle: '建立代理',
    createDescription: '定義新的 AI 代理，包含其模型、提示與技能。',
    name: '名稱',
    namePlaceholder: 'Research Assistant',
    description: '描述',
    descriptionPlaceholder: '此代理的選填描述',
    systemPrompt: '系統提示',
    useTemplate: '使用範本',
    systemPromptPlaceholder:
      '你是 [角色]，[領域] 的專家。\n\n## 目標\n[此代理要達成的目的]\n\n## 語氣與風格\n[簡潔、專業、友善 — 選擇合適者]\n\n## 工具\n[何時及如何使用 shell、file-io、網路搜尋]\n\n## 限制\n[絕不可做的事]\n\n## 輸出格式\n[程式碼區塊、編號步驟、語言一致]',
    promptGuidePrefix: '一份好的系統提示應涵蓋：',
    promptGuideRole: '角色',
    promptGuideGoal: '目標',
    promptGuideTone: '語氣',
    promptGuideTools: '工具',
    promptGuideConstraints: '限制',
    promptGuideFormat: '輸出格式',
    promptGuideSep: '、',
    promptGuideAnd: '、',
    promptGuideSuffix: '。點選「使用範本」即可從骨架開始。',
    apiBaseUrl: 'API 基礎網址',
    apiBaseUrlHint: '選填。覆寫此供應商的預設 API 端點。',
    maxTokensPerRun: '每次執行最大 Token 數',
    skillIds: '技能 ID',
    skillIdsPlaceholder: '以逗號分隔的技能 ID',
    streaming: '串流',
    streamingHint: '將每個推理步驟以獨立訊息傳送。關閉時，使用者會在執行結束時收到一則合併回覆。',
    cancel: '取消',
    editTitle: '編輯代理',
    editDescription: (name: string) => `更新 ${name} 的設定。`,
    role: '角色',
    rolePrimary: '主要（系統）',
    roleWorker: 'Worker（子代理）',
    status: '狀態',
    active: '啟用中',
    inactive: '未啟用',
    save: '儲存',
  },
} satisfies Messages<{
  toolsPanelToggle: string;
  toolsPanelIntro: string;
  misconception: string;
  promptTip: string;
  groups: Record<string, string>;
  tools: Record<string, ToolCopy>;
  provider: string;
  model: string;
  modelPlaceholder: string;
  modelHint: string;
  createTitle: string;
  createDescription: string;
  name: string;
  namePlaceholder: string;
  description: string;
  descriptionPlaceholder: string;
  systemPrompt: string;
  useTemplate: string;
  systemPromptPlaceholder: string;
  promptGuidePrefix: string;
  promptGuideRole: string;
  promptGuideGoal: string;
  promptGuideTone: string;
  promptGuideTools: string;
  promptGuideConstraints: string;
  promptGuideFormat: string;
  promptGuideSep: string;
  promptGuideAnd: string;
  promptGuideSuffix: string;
  apiBaseUrl: string;
  apiBaseUrlHint: string;
  maxTokensPerRun: string;
  skillIds: string;
  skillIdsPlaceholder: string;
  streaming: string;
  streamingHint: string;
  cancel: string;
  editTitle: string;
  editDescription: (name: string) => string;
  role: string;
  rolePrimary: string;
  roleWorker: string;
  status: string;
  active: string;
  inactive: string;
  save: string;
}>;

// ------------------------------------------------------------------ //
//  Provider data                                                      //
// ------------------------------------------------------------------ //

interface ProviderInfo {
  name: string;
  displayName: string;
  defaultModel: string;
  models: string[];
}

function useProviders() {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);

  useEffect(() => {
    void authFetch<{ data: ProviderInfo[] }>('/api/v1/agents/providers')
      .then((res) => {
        setProviders(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {});
  }, []);

  return providers;
}

// ------------------------------------------------------------------ //
//  Provider + Model selects (linked)                                  //
// ------------------------------------------------------------------ //

function ProviderModelFields({
  providers,
  defaultProvider,
  defaultModel,
  idPrefix,
}: {
  providers: ProviderInfo[];
  defaultProvider?: string;
  defaultModel?: string;
  idPrefix: string;
}) {
  const t = useT(messages);
  const [selectedProvider, setSelectedProvider] = useState(
    defaultProvider ?? providers[0]?.name ?? '',
  );
  const currentProvider = providers.find((p) => p.name === selectedProvider);
  const models = currentProvider?.models ?? [];

  // Set default provider when providers load
  useEffect(() => {
    if (!selectedProvider && providers.length > 0) {
      setSelectedProvider(defaultProvider ?? providers[0]!.name);
    }
  }, [providers, defaultProvider, selectedProvider]);

  return (
    <>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-provider`}>{t.provider}</Label>
        <select
          name="provider"
          id={`${idPrefix}-provider`}
          className="rounded-md border bg-background px-3 py-2 text-sm"
          value={selectedProvider}
          onChange={(e) => {
            setSelectedProvider(e.target.value);
          }}
        >
          {providers.map((p) => (
            <option key={p.name} value={p.name}>
              {p.displayName}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-model`}>{t.model}</Label>
        <Input
          id={`${idPrefix}-model`}
          name="model"
          list={`${idPrefix}-model-suggestions`}
          placeholder={currentProvider?.defaultModel || t.modelPlaceholder}
          defaultValue={defaultModel ?? currentProvider?.defaultModel ?? ''}
          required
        />
        {models.length > 0 && (
          <datalist id={`${idPrefix}-model-suggestions`}>
            {models.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        )}
        <p className="text-xs text-muted-foreground">{t.modelHint}</p>
      </div>
    </>
  );
}

// ------------------------------------------------------------------ //
//  Create Agent Dialog                                                //
// ------------------------------------------------------------------ //

export function CreateAgentDialog({
  open,
  onOpenChange,
  saving,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving: boolean;
  onSubmit: (form: FormData) => void;
}) {
  const t = useT(messages);
  const providers = useProviders();
  const [streamingEnabled, setStreamingEnabled] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('');

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setSystemPrompt('');
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.createTitle}</DialogTitle>
          <DialogDescription>{t.createDescription}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            fd.set('streamingEnabled', String(streamingEnabled));
            onSubmit(fd);
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="create-name">{t.name}</Label>
            <Input id="create-name" name="name" placeholder={t.namePlaceholder} required />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="create-description">{t.description}</Label>
            <textarea
              id="create-description"
              name="description"
              rows={2}
              className="rounded-md border bg-background px-3 py-2 text-sm"
              placeholder={t.descriptionPlaceholder}
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="create-systemPrompt">{t.systemPrompt}</Label>
              <button
                type="button"
                onClick={() => setSystemPrompt(SYSTEM_PROMPT_TEMPLATE)}
                className="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Wand2 className="size-3" />
                {t.useTemplate}
              </button>
            </div>
            <textarea
              id="create-systemPrompt"
              name="systemPrompt"
              rows={10}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="rounded-md border bg-background px-3 py-2 font-mono text-sm leading-relaxed"
              placeholder={t.systemPromptPlaceholder}
              required
            />
            <p className="text-xs text-muted-foreground">
              {t.promptGuidePrefix}
              <span className="font-medium text-foreground">{t.promptGuideRole}</span>
              {t.promptGuideSep}
              <span className="font-medium text-foreground">{t.promptGuideGoal}</span>
              {t.promptGuideSep}
              <span className="font-medium text-foreground">{t.promptGuideTone}</span>
              {t.promptGuideSep}
              <span className="font-medium text-foreground">{t.promptGuideTools}</span>
              {t.promptGuideSep}
              <span className="font-medium text-foreground">{t.promptGuideConstraints}</span>
              {t.promptGuideAnd}
              <span className="font-medium text-foreground">{t.promptGuideFormat}</span>
              {t.promptGuideSuffix}
            </p>

            <ToolsReference />
          </div>

          {/* Role is always worker for user-created agents; primary is system-only */}
          <input type="hidden" name="role" value="worker" />

          <ProviderModelFields providers={providers} idPrefix="create" />

          <div className="flex flex-col gap-2">
            <Label htmlFor="create-apiBaseUrl">{t.apiBaseUrl}</Label>
            <Input
              id="create-apiBaseUrl"
              name="apiBaseUrl"
              placeholder="https://api.example.com/v1"
            />
            <p className="text-xs text-muted-foreground">{t.apiBaseUrlHint}</p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="create-maxTokensPerRun">{t.maxTokensPerRun}</Label>
            <Input
              id="create-maxTokensPerRun"
              name="maxTokensPerRun"
              type="number"
              defaultValue={100000}
              min={1000}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="create-skillIds">{t.skillIds}</Label>
            <Input id="create-skillIds" name="skillIds" placeholder={t.skillIdsPlaceholder} />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="create-streamingEnabled" className="text-base">
                {t.streaming}
              </Label>
              <p className="text-sm text-muted-foreground">{t.streamingHint}</p>
            </div>
            <Switch
              id="create-streamingEnabled"
              checked={streamingEnabled}
              onCheckedChange={setStreamingEnabled}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
              }}
            >
              {t.cancel}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t.createTitle}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ------------------------------------------------------------------ //
//  Edit Agent Dialog                                                  //
// ------------------------------------------------------------------ //

export function EditAgentDialog({
  agent,
  onOpenChange,
  saving,
  onSubmit,
}: {
  agent: ApiAgent | null;
  onOpenChange: (open: boolean) => void;
  saving: boolean;
  onSubmit: (id: string, form: FormData) => void;
}) {
  const t = useT(messages);
  const providers = useProviders();
  const [streamingEnabled, setStreamingEnabled] = useState(agent?.streamingEnabled ?? false);

  if (!agent) return null;

  return (
    <Dialog open={agent !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.editTitle}</DialogTitle>
          <DialogDescription>{t.editDescription(agent.name)}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            fd.set('streamingEnabled', String(streamingEnabled));
            onSubmit(agent.id, fd);
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-name">{t.name}</Label>
            <Input id="edit-name" name="name" defaultValue={agent.name} required />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-description">{t.description}</Label>
            <textarea
              id="edit-description"
              name="description"
              rows={2}
              className="rounded-md border bg-background px-3 py-2 text-sm"
              defaultValue={agent.description}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-systemPrompt">{t.systemPrompt}</Label>
            <textarea
              id="edit-systemPrompt"
              name="systemPrompt"
              rows={6}
              className="rounded-md border bg-background px-3 py-2 text-sm"
              defaultValue={agent.systemPrompt}
              required
            />
          </div>

          {/* Role cannot be changed; primary is system-only, workers stay workers */}
          <div className="flex flex-col gap-2">
            <Label>{t.role}</Label>
            <p className="text-sm text-muted-foreground">
              {agent.role === 'primary' ? t.rolePrimary : t.roleWorker}
            </p>
            <input type="hidden" name="role" value={agent.role} />
          </div>

          <ProviderModelFields
            providers={providers}
            defaultProvider={agent.provider}
            defaultModel={agent.model}
            idPrefix="edit"
          />

          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-apiBaseUrl">{t.apiBaseUrl}</Label>
            <Input
              id="edit-apiBaseUrl"
              name="apiBaseUrl"
              defaultValue={agent.apiBaseUrl ?? ''}
              placeholder="https://api.example.com/v1"
            />
            <p className="text-xs text-muted-foreground">{t.apiBaseUrlHint}</p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-maxTokensPerRun">{t.maxTokensPerRun}</Label>
            <Input
              id="edit-maxTokensPerRun"
              name="maxTokensPerRun"
              type="number"
              defaultValue={agent.maxTokensPerRun ?? 100000}
              min={1000}
            />
          </div>

          {agent.role !== 'primary' && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-isActive">{t.status}</Label>
              <select
                name="isActive"
                id="edit-isActive"
                className="rounded-md border bg-background px-3 py-2 text-sm"
                defaultValue={agent.isActive ? 'true' : 'false'}
              >
                <option value="true">{t.active}</option>
                <option value="false">{t.inactive}</option>
              </select>
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="edit-streamingEnabled" className="text-base">
                {t.streaming}
              </Label>
              <p className="text-sm text-muted-foreground">{t.streamingHint}</p>
            </div>
            <Switch
              id="edit-streamingEnabled"
              checked={streamingEnabled}
              onCheckedChange={setStreamingEnabled}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
              }}
            >
              {t.cancel}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
