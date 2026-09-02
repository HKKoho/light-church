'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Bot,
  ChevronDown,
  ChevronRight,
  Clock,
  GitBranch,
  Loader2,
  MoreHorizontal,
  Plus,
  Square,
  Wand2,
  Wrench,
  BookOpen,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { authFetch } from '@/lib/auth';
import { SuccessDialog } from '@/components/ui/success-dialog';
import { useAuth } from '@/components/auth-provider';
import { useT, type Messages } from '@/lib/i18n';

// ------------------------------------------------------------------ //
//  i18n dictionary                                                    //
// ------------------------------------------------------------------ //

const messages = {
  en: {
    page: {
      title: 'Agents',
      subtitleAdmin: "Manage official agents and monitor all users' sub-agents.",
      subtitleUser: 'View official agents and manage your sub-agents.',
      flowCaption: 'How an agent is defined, tested, and tuned',
      flowAlt: 'How an agent is defined, tested, and tuned in Clawix',
      publicAgents: 'Public Agents',
      createAgent: 'Create Agent',
      mySubAgents: 'My Sub-Agents',
      createSubAgent: 'Create Sub-Agent',
      otherUsersSubAgents: "Other Users' Sub-Agents",
      recentRuns: 'Recent Agent Runs',
      stopAll: 'Stop All',
      errorLoadAgents: 'Failed to load agents',
      errorCreateAgent: 'Failed to create agent',
      errorCreateSub: 'Failed to create sub-agent',
      errorUpdateAgent: 'Failed to update agent',
      createdToast: (name: string) => `${name} has been created.`,
      successTitle: 'Success',
    },
    providerModel: {
      provider: 'Provider',
      model: 'Model',
      modelPlaceholder: 'model-name',
      modelHelp: 'Type any model name. Predefined models appear as suggestions.',
    },
    form: {
      name: 'Name',
      namePlaceholder: 'Research Assistant',
      description: 'Description',
      descriptionPlaceholder: 'Optional description of this agent',
      systemPrompt: 'System Prompt',
      useTemplate: 'Use template',
      or: 'or',
      loadExample: 'Load example…',
      systemPromptHelpPrefix: 'A good system prompt covers: ',
      systemPromptHelpSuffix:
        '. Use the template for a blank scaffold, or load an example to see a working sample you can edit.',
      facetRole: 'role',
      facetGoal: 'goal',
      facetTone: 'tone',
      facetTools: 'tools',
      facetConstraints: 'constraints',
      facetOutput: 'output format',
      apiBaseUrl: 'API Base URL',
      apiBaseUrlHelp: 'Optional. Override the default API endpoint for this provider.',
      maxTokensPerRun: 'Max Tokens per Run',
      skills: 'Skills',
      skillsHelp: 'Select which skills this agent can use. Leave empty to allow all skills.',
      streaming: 'Streaming',
      streamingHelp:
        'Send each reasoning step as a separate message. When off, the user receives one combined reply at the end of the run.',
      role: 'Role',
      rolePrimary: 'Primary (system)',
      roleWorker: 'Worker (Sub-Agent)',
      cancel: 'Cancel',
      create: 'Create',
      save: 'Save',
    },
    skills: {
      none: 'No skills available.',
    },
    templates: {
      labels: {
        'Financial Analysis Agent': 'Financial Analysis Agent',
        'Event Organizer Agent': 'Event Organizer Agent',
        'Research & Intelligence Agent': 'Research & Intelligence Agent',
        'DevOps & Automation Agent': 'DevOps & Automation Agent',
        'Project Coordinator Agent (with sub-agents)':
          'Project Coordinator Agent (with sub-agents)',
        'Personal Memory & Knowledge Agent': 'Personal Memory & Knowledge Agent',
        'NGO Communications Agent (gospel-mission skill)':
          'NGO Communications Agent (gospel-mission skill)',
        'Skill Builder Agent (skill-creator skill)': 'Skill Builder Agent (skill-creator skill)',
      },
    },
    dialog: {
      createTitle: 'Create Agent',
      createDescription: 'Define a new AI agent with its model, prompt, and skills.',
      createPublicTitle: 'Create Public Agent',
      createPublicDescription: 'Create a new public agent available to all users.',
      createSubTitle: 'Create Sub-Agent',
      createSubDescription: 'Create a custom sub-agent for specialized tasks.',
      editTitle: 'Edit Agent',
      editDescription: (name: string) => `Update settings for ${name}.`,
      viewTitle: 'View Agent Details',
      viewDescription: (name: string) => `Details for ${name} (read-only)`,
    },
    tools: {
      summary: 'Available tools — click any tool to understand it',
      intro:
        'These are the capabilities your agent can invoke. Reference them by name in the system prompt to guide when and how the agent uses each one.',
      misconception: 'Common misconception: ',
      tip: 'System prompt tip: ',
      groupShell: 'Shell',
      groupFileSystem: 'File system',
      groupWeb: 'Web',
      groupMemory: 'Memory',
      groupAgents: 'Agents',
      groupScheduling: 'Scheduling',
      entries: {
        shell: {
          what: "Runs a command or script inside the agent's own isolated Docker container.",
          clarify:
            'Does NOT run on your server or host machine. The container is sandboxed — no network, capped CPU/memory. The agent can install packages and run scripts, all inside its own box.',
          tip: 'Tell the agent when to prefer shell vs file-io: "use shell for data processing, file-io for plain text edits".',
        },
        read_file: {
          what: "Reads a file from inside the container's /workspace or /skills directory.",
          clarify:
            "Can only read files within /workspace and /skills — not arbitrary host paths or other users' workspaces.",
          tip: '"Always read a file before editing it" prevents blind overwrites.',
        },
        write_file: {
          what: 'Creates or completely overwrites a file at the given path inside /workspace.',
          clarify:
            'Replaces the entire file. For small changes prefer edit_file — write_file is for new files or full rewrites.',
          tip: '"Use write_file to create new files, edit_file for targeted changes."',
        },
        edit_file: {
          what: 'Replaces one exact string inside a file with new text.',
          clarify:
            'The old string must appear exactly once. Zero or multiple matches → edit is rejected. This prevents accidental mass-replacement.',
          tip: 'Safer than write_file for modifying existing documents.',
        },
        list_directory: {
          what: 'Lists the files and subdirectories under a given path (defaults to /workspace).',
          clarify:
            'Read-only — never creates or modifies files. The agent uses it to orient itself before reading or writing.',
          tip: '"First list the directory to understand what exists before acting."',
        },
        web_search: {
          what: 'Queries a search engine and returns a ranked list of results (title, URL, snippet).',
          clarify:
            'The agent does NOT browse the web automatically — only calls this when it decides to, as guided by your system prompt.',
          tip: '"Use web_search for current events or information that may have changed since your training."',
        },
        web_fetch: {
          what: 'Fetches a specific URL and returns the readable text content of that page.',
          clarify:
            'For a known URL. Blocked for private/internal IPs (SSRF protection) — public web only.',
          tip: 'Pair with web_search: search first to discover the URL, then fetch to read the full content.',
        },
        save_memory: {
          what: 'Stores a labelled note or fact that persists across all future sessions for this user.',
          clarify:
            'Memory is scoped to the individual user — NOT shared with others by default, and does not carry over between different agents unless explicitly shared.',
          tip: '"Save the user\'s preferences, decisions, and key facts when asked."',
        },
        search_memory: {
          what: 'Searches saved memories by keyword or tag and returns matching items.',
          clarify:
            'The agent does NOT recall memories automatically — it must call search_memory to look them up. Without this call it has no access to past sessions.',
          tip: '"Always search memory at the start of a new task to check for relevant context."',
        },
        share_memory: {
          what: 'Shares a saved memory item with a group or the entire organisation.',
          clarify:
            "Sharing is explicit and one-way — shared memory is visible to the target group, but the agent cannot read other users' private memories.",
          tip: '"When the user says \'share this with the team\', use share_memory to publish it org-wide."',
        },
        spawn: {
          what: 'Creates a sub-agent container, sends it a task prompt, waits for it to finish, and returns its output.',
          clarify:
            'Sub-agents are NOT created automatically. The agent only spawns one when it decides to call this tool. Each spawned agent is ephemeral — no memory after the task ends.',
          tip: '"Use spawn to delegate research tasks to the Research agent while you draft the outline."',
        },
        cron: {
          what: 'Creates, lists, or deletes a recurring scheduled task that triggers the agent at set intervals.',
          clarify:
            'Does not make the agent run continuously. It registers a schedule; the agent is invoked fresh each time the schedule fires, with only the cron prompt as input.',
          tip: '"Use cron only when the user asks to schedule a recurring task — always confirm the schedule before creating it."',
        },
      },
    },
    tables: {
      colAgent: 'Agent',
      colModel: 'Model',
      colRole: 'Role',
      colType: 'Type',
      colEnabled: 'Enabled',
      colInput: 'Input',
      colStatus: 'Status',
      colDuration: 'Duration',
      colTime: 'Time',
      typePublic: 'Public',
      typePrivate: 'Private',
      alwaysOn: 'Always on',
      edit: 'Edit',
      viewDetails: 'View Details',
      viewRuns: 'View Runs',
      emptyPublic: 'No public agents configured.',
      emptySub: 'No sub-agents created.',
      emptyRuns: 'No agent runs yet.',
      subAgentCount: (n: number) => `${n} sub-agent${n !== 1 ? 's' : ''}`,
      subAgentBadge: 'sub-agent',
    },
    run: {
      loading: 'Loading...',
      error: 'Error',
      loadFailed: 'Failed to load run details',
      startedAt: (time: string) => `Run started ${time}`,
      duration: (d: string) => ` • Duration: ${d}`,
      input: 'Input',
      output: 'Output',
      errorLabel: 'Error',
      toolCalls: 'Tool Calls',
      toolResult: 'Tool Result',
      tokenUsage: 'Token Usage',
    },
    view: {
      name: 'Name',
      description: 'Description',
      systemPrompt: 'System Prompt',
      role: 'Role',
      status: 'Status',
      provider: 'Provider',
      model: 'Model',
      maxTokensPerRun: 'Max Tokens per Run',
      statusAlwaysOn: 'Always on',
      statusActive: 'Active',
      statusInactive: 'Inactive',
      close: 'Close',
      empty: '—',
    },
  },
  'zh-TW': {
    page: {
      title: '代理',
      subtitleAdmin: '管理官方代理並監看所有使用者的子代理。',
      subtitleUser: '檢視官方代理並管理你的子代理。',
      flowCaption: '代理如何被定義、測試與調校',
      flowAlt: '在 Clawix 中代理如何被定義、測試與調校',
      publicAgents: '公開代理',
      createAgent: '建立代理',
      mySubAgents: '我的子代理',
      createSubAgent: '建立子代理',
      otherUsersSubAgents: '其他使用者的子代理',
      recentRuns: '近期代理執行',
      stopAll: '全部停止',
      errorLoadAgents: '載入代理失敗',
      errorCreateAgent: '建立代理失敗',
      errorCreateSub: '建立子代理失敗',
      errorUpdateAgent: '更新代理失敗',
      createdToast: (name: string) => `${name} 已建立。`,
      successTitle: '成功',
    },
    providerModel: {
      provider: '供應商',
      model: '模型',
      modelPlaceholder: '模型名稱',
      modelHelp: '輸入任何模型名稱。預設模型會以建議形式出現。',
    },
    form: {
      name: '名稱',
      namePlaceholder: '研究助理',
      description: '描述',
      descriptionPlaceholder: '此代理的選填描述',
      systemPrompt: '系統提示',
      useTemplate: '使用範本',
      or: '或',
      loadExample: '載入範例…',
      systemPromptHelpPrefix: '一個好的系統提示應涵蓋：',
      systemPromptHelpSuffix: '。可使用範本取得空白骨架，或載入範例查看可編輯的實際樣本。',
      facetRole: '角色',
      facetGoal: '目標',
      facetTone: '語氣',
      facetTools: '工具',
      facetConstraints: '限制',
      facetOutput: '輸出格式',
      apiBaseUrl: 'API 基礎網址',
      apiBaseUrlHelp: '選填。覆寫此供應商的預設 API 端點。',
      maxTokensPerRun: '每次執行最大 Token 數',
      skills: '技能',
      skillsHelp: '選擇此代理可使用的技能。留空則允許所有技能。',
      streaming: '串流',
      streamingHelp: '將每個推理步驟以獨立訊息傳送。關閉時，使用者會在執行結束時收到一則合併回覆。',
      role: '角色',
      rolePrimary: '主要 (系統)',
      roleWorker: 'Worker (子代理)',
      cancel: '取消',
      create: '建立',
      save: '儲存',
    },
    skills: {
      none: '沒有可用的技能。',
    },
    templates: {
      labels: {
        'Financial Analysis Agent': '財務分析代理',
        'Event Organizer Agent': '活動籌辦代理',
        'Research & Intelligence Agent': '研究與情報代理',
        'DevOps & Automation Agent': 'DevOps 與自動化代理',
        'Project Coordinator Agent (with sub-agents)': '專案協調代理 (含子代理)',
        'Personal Memory & Knowledge Agent': '個人記憶與知識代理',
        'NGO Communications Agent (gospel-mission skill)': 'NGO 傳播代理 (gospel-mission 技能)',
        'Skill Builder Agent (skill-creator skill)': '技能建構代理 (skill-creator 技能)',
      },
    },
    dialog: {
      createTitle: '建立代理',
      createDescription: '定義一個新的 AI 代理，包含其模型、提示與技能。',
      createPublicTitle: '建立公開代理',
      createPublicDescription: '建立一個提供給所有使用者的新公開代理。',
      createSubTitle: '建立子代理',
      createSubDescription: '為專門任務建立自訂子代理。',
      editTitle: '編輯代理',
      editDescription: (name: string) => `更新 ${name} 的設定。`,
      viewTitle: '檢視代理詳細資料',
      viewDescription: (name: string) => `${name} 的詳細資料 (唯讀)`,
    },
    tools: {
      summary: '可用工具 — 點擊任一工具以了解它',
      intro:
        '這些是你的代理可呼叫的能力。在系統提示中以名稱引用它們，以引導代理何時及如何使用每一項。',
      misconception: '常見誤解：',
      tip: '系統提示提示：',
      groupShell: 'Shell',
      groupFileSystem: '檔案系統',
      groupWeb: '網路',
      groupMemory: '記憶',
      groupAgents: '代理',
      groupScheduling: '排程',
      entries: {
        shell: {
          what: '在代理自有的隔離 Docker 容器內執行命令或腳本。',
          clarify:
            '不會在你的伺服器或主機上執行。容器是沙箱化的 — 無網路、CPU/記憶體受限。代理可安裝套件並執行腳本，全部都在它自己的盒子內。',
          tip: '告訴代理何時偏好 shell 或 file-io：「資料處理用 shell，純文字編輯用 file-io」。',
        },
        read_file: {
          what: '從容器內的 /workspace 或 /skills 目錄讀取檔案。',
          clarify:
            '只能讀取 /workspace 與 /skills 內的檔案 — 不能讀取任意主機路徑或其他使用者的工作區。',
          tip: '「編輯檔案前一律先讀取」可避免盲目覆寫。',
        },
        write_file: {
          what: '在 /workspace 內指定路徑建立或完全覆寫檔案。',
          clarify:
            '會取代整個檔案。小幅變更請優先使用 edit_file — write_file 適用於新檔案或完整重寫。',
          tip: '「用 write_file 建立新檔案，用 edit_file 做針對性變更。」',
        },
        edit_file: {
          what: '將檔案內某段確切字串替換為新文字。',
          clarify: '舊字串必須恰好出現一次。零次或多次符合 → 編輯被拒絕。這可避免意外的大量取代。',
          tip: '修改既有文件時比 write_file 更安全。',
        },
        list_directory: {
          what: '列出指定路徑下的檔案與子目錄 (預設為 /workspace)。',
          clarify: '唯讀 — 絕不建立或修改檔案。代理用它在讀寫前先掌握環境。',
          tip: '「先列出目錄以了解現況再採取行動。」',
        },
        web_search: {
          what: '查詢搜尋引擎並回傳排序後的結果清單 (標題、網址、摘要)。',
          clarify: '代理不會自動瀏覽網路 — 只在它決定時呼叫，並依你的系統提示引導。',
          tip: '「對於時事或自訓練以來可能已變動的資訊，使用 web_search。」',
        },
        web_fetch: {
          what: '擷取特定網址並回傳該頁面的可讀文字內容。',
          clarify: '適用於已知網址。對私有/內部 IP 封鎖 (SSRF 防護) — 僅限公開網路。',
          tip: '與 web_search 搭配：先搜尋以找出網址，再擷取以讀取完整內容。',
        },
        save_memory: {
          what: '儲存一則帶標籤的筆記或事實，於此使用者未來所有工作階段中持續保留。',
          clarify:
            '記憶範圍限於個別使用者 — 預設不與他人共用，除非明確分享，否則也不會在不同代理間延續。',
          tip: '「在被要求時，儲存使用者的偏好、決策與關鍵事實。」',
        },
        search_memory: {
          what: '依關鍵字或標籤搜尋已儲存的記憶並回傳符合項目。',
          clarify:
            '代理不會自動回想記憶 — 必須呼叫 search_memory 查找。沒有此呼叫，它無法存取過往工作階段。',
          tip: '「在新任務開始時一律搜尋記憶，以檢查相關脈絡。」',
        },
        share_memory: {
          what: '將已儲存的記憶項目分享給某個群組或整個組織。',
          clarify:
            '分享是明確且單向的 — 共用記憶對目標群組可見，但代理無法讀取其他使用者的私人記憶。',
          tip: '「當使用者說『把這個分享給團隊』時，使用 share_memory 將其發布至全組織。」',
        },
        spawn: {
          what: '建立子代理容器，傳送任務提示給它，等待其完成並回傳輸出。',
          clarify:
            '子代理不會自動建立。代理只在決定呼叫此工具時才產生。每個產生的代理都是短暫的 — 任務結束後即無記憶。',
          tip: '「使用 spawn 將研究任務委派給 Research 代理，同時你撰寫大綱。」',
        },
        cron: {
          what: '建立、列出或刪除一個會以設定間隔觸發代理的循環排程任務。',
          clarify:
            '不會讓代理持續執行。它登錄一個排程；每次排程觸發時代理會重新被喚起，僅以 cron 提示作為輸入。',
          tip: '「只在使用者要求排程循環任務時使用 cron — 建立前一律確認排程。」',
        },
      },
    },
    tables: {
      colAgent: '代理',
      colModel: '模型',
      colRole: '角色',
      colType: '類型',
      colEnabled: '已啟用',
      colInput: '輸入',
      colStatus: '狀態',
      colDuration: '耗時',
      colTime: '時間',
      typePublic: '公開',
      typePrivate: '私人',
      alwaysOn: '永遠啟用',
      edit: '編輯',
      viewDetails: '檢視詳細資料',
      viewRuns: '檢視執行',
      emptyPublic: '尚未設定公開代理。',
      emptySub: '尚未建立子代理。',
      emptyRuns: '尚無代理執行。',
      subAgentCount: (n: number) => `${n} 個子代理`,
      subAgentBadge: '子代理',
    },
    run: {
      loading: '載入中...',
      error: '錯誤',
      loadFailed: '無法載入執行詳細資料',
      startedAt: (time: string) => `執行開始於 ${time}`,
      duration: (d: string) => ` • 耗時：${d}`,
      input: '輸入',
      output: '輸出',
      errorLabel: '錯誤',
      toolCalls: '工具呼叫',
      toolResult: '工具結果',
      tokenUsage: 'Token 用量',
    },
    view: {
      name: '名稱',
      description: '描述',
      systemPrompt: '系統提示',
      role: '角色',
      status: '狀態',
      provider: '供應商',
      model: '模型',
      maxTokensPerRun: '每次執行最大 Token 數',
      statusAlwaysOn: '永遠啟用',
      statusActive: '啟用中',
      statusInactive: '未啟用',
      close: '關閉',
      empty: '—',
    },
  },
} satisfies Messages<{
  page: {
    title: string;
    subtitleAdmin: string;
    subtitleUser: string;
    flowCaption: string;
    flowAlt: string;
    publicAgents: string;
    createAgent: string;
    mySubAgents: string;
    createSubAgent: string;
    otherUsersSubAgents: string;
    recentRuns: string;
    stopAll: string;
    errorLoadAgents: string;
    errorCreateAgent: string;
    errorCreateSub: string;
    errorUpdateAgent: string;
    createdToast: (name: string) => string;
    successTitle: string;
  };
  providerModel: {
    provider: string;
    model: string;
    modelPlaceholder: string;
    modelHelp: string;
  };
  form: {
    name: string;
    namePlaceholder: string;
    description: string;
    descriptionPlaceholder: string;
    systemPrompt: string;
    useTemplate: string;
    or: string;
    loadExample: string;
    systemPromptHelpPrefix: string;
    systemPromptHelpSuffix: string;
    facetRole: string;
    facetGoal: string;
    facetTone: string;
    facetTools: string;
    facetConstraints: string;
    facetOutput: string;
    apiBaseUrl: string;
    apiBaseUrlHelp: string;
    maxTokensPerRun: string;
    skills: string;
    skillsHelp: string;
    streaming: string;
    streamingHelp: string;
    role: string;
    rolePrimary: string;
    roleWorker: string;
    cancel: string;
    create: string;
    save: string;
  };
  skills: {
    none: string;
  };
  templates: {
    labels: Record<string, string>;
  };
  dialog: {
    createTitle: string;
    createDescription: string;
    createPublicTitle: string;
    createPublicDescription: string;
    createSubTitle: string;
    createSubDescription: string;
    editTitle: string;
    editDescription: (name: string) => string;
    viewTitle: string;
    viewDescription: (name: string) => string;
  };
  tools: {
    summary: string;
    intro: string;
    misconception: string;
    tip: string;
    groupShell: string;
    groupFileSystem: string;
    groupWeb: string;
    groupMemory: string;
    groupAgents: string;
    groupScheduling: string;
    entries: Record<string, { what: string; clarify: string; tip: string }>;
  };
  tables: {
    colAgent: string;
    colModel: string;
    colRole: string;
    colType: string;
    colEnabled: string;
    colInput: string;
    colStatus: string;
    colDuration: string;
    colTime: string;
    typePublic: string;
    typePrivate: string;
    alwaysOn: string;
    edit: string;
    viewDetails: string;
    viewRuns: string;
    emptyPublic: string;
    emptySub: string;
    emptyRuns: string;
    subAgentCount: (n: number) => string;
    subAgentBadge: string;
  };
  run: {
    loading: string;
    error: string;
    loadFailed: string;
    startedAt: (time: string) => string;
    duration: (d: string) => string;
    input: string;
    output: string;
    errorLabel: string;
    toolCalls: string;
    toolResult: string;
    tokenUsage: string;
  };
  view: {
    name: string;
    description: string;
    systemPrompt: string;
    role: string;
    status: string;
    provider: string;
    model: string;
    maxTokensPerRun: string;
    statusAlwaysOn: string;
    statusActive: string;
    statusInactive: string;
    close: string;
    empty: string;
  };
}>;

// ------------------------------------------------------------------ //
//  Types                                                              //
// ------------------------------------------------------------------ //

interface AgentDefinition {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  role: string;
  provider: string;
  model: string;
  apiBaseUrl: string | null;
  skillIds: string[];
  maxTokensPerRun: number;
  containerConfig: Record<string, unknown>;
  isActive: boolean;
  streamingEnabled: boolean;
  isOfficial: boolean;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: { id: string; name: string; email: string } | null;
}

interface ProviderInfo {
  name: string;
  displayName: string;
  defaultModel: string;
  models: string[];
}

interface PaginatedAgents {
  data: AgentDefinition[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

// ------------------------------------------------------------------ //
//  Skill types + helpers                                              //
// ------------------------------------------------------------------ //

interface SkillEntry {
  name: string;
  description: string;
  path: string;
  source: 'builtin' | 'custom';
}

function skillDirName(skillPath: string): string {
  const parts = skillPath.split('/').filter(Boolean);
  return parts[parts.length - 2] ?? '';
}

// ------------------------------------------------------------------ //
//  Skills hook                                                        //
// ------------------------------------------------------------------ //

function useSkills() {
  const [skills, setSkills] = useState<SkillEntry[]>([]);

  useEffect(() => {
    void authFetch<{ data: SkillEntry[] }>('/api/v1/skills')
      .then((res) => {
        setSkills(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {});
  }, []);

  return skills;
}

// ------------------------------------------------------------------ //
//  Skill picker                                                       //
// ------------------------------------------------------------------ //

function SkillPicker({
  skills,
  selected,
  onChange,
}: {
  skills: SkillEntry[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const t = useT(messages);
  if (skills.length === 0) {
    return <p className="text-xs text-muted-foreground">{t.skills.none}</p>;
  }

  return (
    <div className="max-h-44 overflow-y-auto rounded-md border divide-y">
      {skills.map((skill) => {
        const dirName = skillDirName(skill.path);
        const checked = selected.includes(dirName);
        return (
          <label
            key={skill.path}
            className="flex cursor-pointer items-start gap-3 px-3 py-2 hover:bg-muted/50"
          >
            <input
              type="checkbox"
              className="mt-0.5 shrink-0"
              checked={checked}
              onChange={() => {
                onChange(checked ? selected.filter((d) => d !== dirName) : [...selected, dirName]);
              }}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <BookOpen className="size-3 shrink-0 text-muted-foreground" />
                <span className="text-sm font-medium">{skill.name}</span>
                <span className="text-xs text-muted-foreground">({skill.source})</span>
              </div>
              <p className="line-clamp-1 text-xs text-muted-foreground">{skill.description}</p>
            </div>
          </label>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------------ //
//  Provider hook                                                      //
// ------------------------------------------------------------------ //

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
//  Provider + Model select fields                                     //
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

  useEffect(() => {
    if (!selectedProvider && providers.length > 0) {
      setSelectedProvider(defaultProvider ?? providers[0]!.name);
    }
  }, [providers, defaultProvider, selectedProvider]);

  return (
    <>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-provider`}>{t.providerModel.provider}</Label>
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
        <Label htmlFor={`${idPrefix}-model`}>{t.providerModel.model}</Label>
        <Input
          id={`${idPrefix}-model`}
          name="model"
          list={`${idPrefix}-model-suggestions`}
          placeholder={currentProvider?.defaultModel || t.providerModel.modelPlaceholder}
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
        <p className="text-xs text-muted-foreground">{t.providerModel.modelHelp}</p>
      </div>
    </>
  );
}

// ------------------------------------------------------------------ //
//  System prompt template + tools reference                          //
// ------------------------------------------------------------------ //

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
- For multi-step answers, use numbered steps; for reference lists, use bullets`.trimEnd();

const SAMPLE_PROMPTS: { label: string; prompt: string }[] = [
  {
    label: 'Financial Analysis Agent',
    prompt:
      `Role: You are an AI Assistant for the organization, specialized in supporting financial analysis and reporting.

## Capabilities
- Generate financial reports based on provided data.
- Analyze financial metrics and generate insights.
- Answer questions related to financial data interpretation.

## Constraints
- Do not execute any transactions.
- Do not access personal financial data without consent.

## Domain Knowledge
- Familiarity with financial terminology and basic accounting principles.
- Understanding of reporting formats used by the organization.

## Interaction Style
- Provide clear and concise responses.
- Present information in a professional and courteous manner.

## Example Scenarios
- Help summarize the quarterly financial results.
- Offer insights on monthly financial trends based on the data.
- Assist in preparing a budget proposal using provided figures.

## Safeguards & Ethical Guidelines
- Maintain confidentiality and integrity of financial data.
- Ensure compliance with the organization's data protection policies.

## Tools
- Use \`read_file\` to load financial data files from the workspace.
- Use \`write_file\` to save generated reports.
- Use \`web_search\` only when the user explicitly asks for current market data.
- Do not use \`shell\` to execute scripts that touch external systems or APIs.`.trimEnd(),
  },
  {
    label: 'Event Organizer Agent',
    prompt:
      `Role: You are an AI Event Organizer Assistant, specialized in planning and executing events with attention to detail and coordination.

## Capabilities
- Develop comprehensive event plans and schedules.
- Coordinate logistics, including venue selection, catering, and accommodation.
- Manage invitations and RSVPs, and communicate with attendees.
- Provide reminders and updates before and during the event.

## Constraints
- Do not commit to financial expenditures or make any external bookings.
- Not responsible for real-time decision-making on event day without human oversight.

## Domain Knowledge
- Knowledge of event planning best practices, including timeline management and vendor coordination.
- Familiarity with standard contract terms for event services.

## Interaction Style
- Communicate clearly, with a friendly and helpful tone.
- Provide organized information and summaries for easy decision-making.

## Example Scenarios
- Assist in drafting a timeline for an upcoming corporate conference.
- Suggest venue options based on event size and type.
- Prepare a list of potential vendors for catering services.

## Safeguards & Ethical Guidelines
- Ensure all communication with attendees adheres to privacy and consent standards.
- Avoid sharing any personal attendee information beyond necessary event-related use.

## Tools
- Use \`write_file\` to save event plans, timelines, and vendor lists to the workspace.
- Use \`read_file\` to load guest lists or briefing documents provided by the user.
- Use \`web_search\` to look up venue options, vendors, or event industry best practices.
- Use \`save_memory\` to remember event preferences and decisions across sessions.`.trimEnd(),
  },
  {
    label: 'Research & Intelligence Agent',
    prompt:
      `Role: You are a Research and Intelligence Agent, specialized in gathering, synthesizing, and presenting information from the web and the workspace.

## Goal
Help the user discover, verify, and summarize information. Produce well-structured research briefs, literature reviews, and competitive analyses on demand.

## Tone & style
- Neutral and objective; present evidence, not opinions unless asked.
- Cite sources inline so the user can verify each claim.
- Summarize first, then offer to go deeper on any section.

## Tools
- Use \`web_search\` to find current information, news, and sources on a topic.
- Use \`web_fetch\` to read the full text of a specific article or page once you have its URL.
- Use \`write_file\` to save the final research brief to /workspace so the user can revisit it.
- Use \`save_memory\` to store recurring research topics or preferences the user mentions.
- Use \`search_memory\` at the start of each session to check if the user has prior research context saved.

## Constraints
- Always attribute claims to a source; never present unverified content as fact.
- Do not fetch URLs that appear to be internal network addresses.
- If a topic requires real-time data (prices, live feeds), state the limitation clearly.

## Output format
- Open with a 2–3 sentence executive summary.
- Use ## headers to separate sections (Background, Key Findings, Sources).
- End with a "Next steps" section suggesting what to research further.

## Safeguards & Ethical Guidelines
- Do not reproduce full copyrighted articles; summarize and link instead.
- Flag if a source appears biased, sponsored, or low-credibility.`.trimEnd(),
  },
  {
    label: 'DevOps & Automation Agent',
    prompt:
      `Role: You are a DevOps and Automation Agent, specialized in running scripts, managing files, and automating repetitive workspace tasks.

## Goal
Execute technical tasks inside the workspace: run builds, process data files, manage directory structures, and set up scheduled jobs — always confirming before any destructive action.

## Tone & style
- Terse and technical; the user is a developer.
- Confirm the exact command before running anything destructive.
- Report stdout/stderr verbatim so the user can debug.

## Tools
- Use \`shell\` to run bash commands, Python scripts, package managers, and build tools inside the container.
- Use \`read_file\` to inspect config files, logs, or scripts before modifying them.
- Use \`edit_file\` for targeted changes to config files (safer than full overwrite).
- Use \`write_file\` to create new scripts or fully replace a file when needed.
- Use \`list_directory\` to understand the workspace layout before acting.
- Use \`cron\` to schedule a recurring task only when the user explicitly requests automation on a schedule — always confirm the cron expression before creating it.

## Constraints
- Never run \`rm -rf\`, \`DROP\`, or any irreversible command without explicit user confirmation in the same message.
- Do not install packages globally; use virtual environments or --user flags.
- Do not expose secrets; never print environment variables or credential files.

## Output format
- Show the exact command run in a fenced \`bash\` block before the output.
- If a command fails, show the error and suggest the most likely fix.
- For multi-step tasks, number each step and confirm completion before moving to the next.

## Safeguards & Ethical Guidelines
- All operations are scoped to /workspace inside the container — no host filesystem access.
- Ask for confirmation before any action that cannot be undone.`.trimEnd(),
  },
  {
    label: 'Project Coordinator Agent (with sub-agents)',
    prompt:
      `Role: You are a Project Coordinator Agent, specialized in breaking down complex projects into parallel workstreams and delegating them to specialist sub-agents.

## Goal
Help the user plan, track, and execute multi-part projects. Decompose large requests into focused sub-tasks, delegate each to the right specialist agent using spawn, and synthesize results into a coherent output.

## Tone & style
- Structured and proactive; always show the user the plan before executing.
- Summarize sub-agent outputs in plain language — the user should not need to read raw agent output.
- Ask one clarifying question if the scope is ambiguous before starting.

## Tools
- Use \`spawn\` to delegate focused sub-tasks to specialist agents by name (e.g. spawn a Research Agent to gather background, spawn a Writing Agent to draft a section).
- Use \`write_file\` to save the consolidated project plan and final deliverables to /workspace.
- Use \`read_file\` to load project briefs or reference documents the user provides.
- Use \`save_memory\` to remember project goals, decisions, and stakeholder preferences across sessions.
- Use \`search_memory\` at session start to recall any prior project context.
- Use \`cron\` to set up a recurring check-in only when the user asks for automated progress reminders.

## Constraints
- Always show the decomposition plan and get user approval before spawning sub-agents.
- Do not spawn more than 3 sub-agents in parallel without confirming with the user first.
- If a sub-agent returns an error or empty result, report it and ask the user how to proceed.

## Output format
- Present the project plan as a numbered task list with the assigned agent for each step.
- After all sub-agents complete, produce a consolidated summary with a ## section per workstream.
- Flag any gaps or unresolved items in a "Open questions" section at the end.

## Safeguards & Ethical Guidelines
- Do not spawn agents for tasks the user has not approved.
- Clearly label which content was produced by a sub-agent vs. synthesized by this agent.`.trimEnd(),
  },
  {
    label: 'Personal Memory & Knowledge Agent',
    prompt:
      `Role: You are a Personal Memory and Knowledge Agent, specialized in capturing, organizing, and recalling information across sessions so nothing important is ever forgotten.

## Goal
Act as the user's persistent second brain. Remember preferences, decisions, meeting notes, and key facts. Surface the right memory at the right moment without being asked.

## Tone & style
- Friendly and conversational; this agent is a trusted personal assistant.
- Be proactive: if the user mentions something worth remembering, offer to save it without waiting to be asked.
- When recalling a memory, state when it was saved and its source so the user can judge its relevance.

## Tools
- Use \`search_memory\` at the start of every session to retrieve any context relevant to the user's opening message.
- Use \`save_memory\` whenever the user shares a preference, decision, fact, or anything they might want to recall later — always tag memories with relevant keywords.
- Use \`share_memory\` when the user explicitly asks to share a note with the team or organisation.
- Use \`write_file\` to export a formatted summary of memories to /workspace when the user asks for a knowledge export.
- Use \`web_search\` only when the user asks a factual question that memory cannot answer.

## Constraints
- Never save sensitive personal data (passwords, financial credentials) to memory.
- Always confirm before sharing a memory with a group or organisation-wide.
- If no relevant memory exists, say so clearly — do not fabricate a recollection.

## Output format
- When surfacing a memory, format as: **[Topic]** — *saved [date if known]* — [content].
- For knowledge exports, use ## headers per topic and bullet points for individual items.

## Safeguards & Ethical Guidelines
- Memory is private to the user by default; sharing requires explicit instruction.
- Regularly offer to clean up outdated memories when the user's context changes.`.trimEnd(),
  },
  {
    label: 'NGO Communications Agent (gospel-mission skill)',
    prompt:
      `Role: You are an NGO Communications Agent, specialized in drafting supporter-facing documents, community communications, and partner materials for a non-profit organisation.

## Goal
Produce ethically grounded, audience-calibrated communications that represent the organisation with integrity. Help the team tell real impact stories without overpromising, poverty-porn framing, or jargon.

## Tone & style
- Warm and evidence-grounded for institutional supporters; specific and human for individual supporters; intellectually honest for academic partners.
- Always use plain language first; technical depth only when the audience profile calls for it.
- Avoid: "leverage", "synergy", "unlock potential", "game-changer", "transformative". Use concrete words that describe what actually happened.

## Skills
- Load the \`gospel-mission\` skill whenever drafting any external-facing document — it provides stakeholder audience profiles, impact framing guidance, and ethical communication standards.

## Tools
- Use \`read_file\` to load programme data, beneficiary reports, or existing drafts from /workspace.
- Use \`write_file\` to save the final communication document to /workspace.
- Use \`edit_file\` for targeted revisions to an existing document.
- Use \`web_search\` only when the user asks for external benchmarks, sector data, or funder research.
- Use \`save_memory\` to store the organisation's key messages, tone preferences, and past communications decisions.

## Constraints
- Never include personal beneficiary data without explicit consent noted in the source file.
- Do not overstate impact; clearly distinguish outputs, outcomes, and long-term impact.
- Always flag if an AI system contributed to a draft that will be shared externally.

## Output format
- Open with the intended audience and purpose before the draft.
- Use ## headers for each section of the document.
- End with a "Review checklist" reminding the human approver of key ethical gates.

## Safeguards & Ethical Guidelines
- Beneficiaries are protagonists of their own stories — no rescuer framing, no anonymous-suffering imagery.
- Nothing is submitted, published, or sent without a named human acting as final approver.`.trimEnd(),
  },
  {
    label: 'Skill Builder Agent (skill-creator skill)',
    prompt:
      `Role: You are a Skill Builder Agent, specialized in designing, writing, validating, and packaging new skills for the Clawix platform.

## Goal
Help the user create high-quality, context-efficient skills. Guide them through understanding the use case, planning skill contents, writing SKILL.md, bundling resources, and validating the result.

## Tone & style
- Collaborative and methodical; work through the skill creation process one step at a time.
- Challenge unnecessary verbosity — every line in a skill competes for context window space.
- Ask for concrete usage examples before designing anything.

## Skills
- Load the \`skill-creator\` skill at the start of every skill creation task — it contains the canonical process, anatomy, naming rules, and validation scripts.

## Tools
- Use \`shell\` to run skill scaffolding and validation scripts:
  - \`python3 /skills/builtin/skill-creator/scripts/init_skill.py <name>\` to scaffold a new skill.
  - \`python3 /skills/builtin/skill-creator/scripts/quick_validate.py /workspace/skills/<name>\` to validate.
  - \`python3 /skills/builtin/skill-creator/scripts/package_skill.py /workspace/skills/<name>\` to package.
- Use \`write_file\` to create SKILL.md and bundled resource files under /workspace/skills/<name>/.
- Use \`edit_file\` to make targeted fixes after validation errors.
- Use \`read_file\` to inspect the current state of a skill before editing.
- Use \`list_directory\` to see the skill's directory structure at any point.

## Constraints
- Custom skills must live under /workspace/skills/ — never write to /skills/builtin/ (read-only).
- Skill names: lowercase letters, digits, hyphens only, max 64 characters.
- SKILL.md body must stay under 500 lines; split large content into reference files.
- Do not create README, CHANGELOG, or other auxiliary files — only files that directly support the skill.

## Output format
- Confirm the skill name and purpose before writing any files.
- After each step, show what was created/changed and what comes next.
- After validation, show the validator output verbatim so the user can see any errors.

## Safeguards & Ethical Guidelines
- Validate every skill before declaring it complete.
- If the validator reports errors, fix them before moving on — never skip validation.`.trimEnd(),
  },
];

// Structural list only — group label keys + tool names; the human-readable
// descriptions live in the i18n dictionary under `tools.entries` / `tools.group*`.
const TOOL_GROUPS: { groupKey: keyof (typeof messages)['en']['tools']; tools: string[] }[] = [
  { groupKey: 'groupShell', tools: ['shell'] },
  {
    groupKey: 'groupFileSystem',
    tools: ['read_file', 'write_file', 'edit_file', 'list_directory'],
  },
  { groupKey: 'groupWeb', tools: ['web_search', 'web_fetch'] },
  { groupKey: 'groupMemory', tools: ['save_memory', 'search_memory', 'share_memory'] },
  { groupKey: 'groupAgents', tools: ['spawn'] },
  { groupKey: 'groupScheduling', tools: ['cron'] },
];

function ToolsReference() {
  const t = useT(messages);
  const [panelOpen, setPanelOpen] = useState(false);
  const [expandedTool, setExpandedTool] = useState<string | null>(null);

  return (
    <div className="rounded-md border text-xs">
      <button
        type="button"
        onClick={() => setPanelOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-muted-foreground hover:text-foreground"
      >
        <span className="font-medium">{t.tools.summary}</span>
        <ChevronDown className={`size-3.5 transition-transform ${panelOpen ? 'rotate-180' : ''}`} />
      </button>

      {panelOpen && (
        <div className="border-t px-3 pb-3 pt-2">
          <p className="mb-3 text-muted-foreground">{t.tools.intro}</p>
          <div className="flex flex-col gap-1">
            {TOOL_GROUPS.map(({ groupKey, tools }) => (
              <div key={groupKey} className="mb-1">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t.tools[groupKey] as string}
                </p>
                {tools.map((toolName) => {
                  const entry = t.tools.entries[toolName as keyof typeof t.tools.entries];
                  const isOpen = expandedTool === toolName;
                  return (
                    <div key={toolName} className="mb-1 overflow-hidden rounded-md border">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedTool((prev) => (prev === toolName ? null : toolName))
                        }
                        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted/50"
                      >
                        <code className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                          {toolName}
                        </code>
                        <span className="flex-1 text-muted-foreground">
                          {entry.what.slice(0, 72)}
                          {entry.what.length > 72 ? '…' : ''}
                        </span>
                        <ChevronDown
                          className={`size-3 shrink-0 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        />
                      </button>
                      {isOpen && (
                        <div className="flex flex-col gap-2 border-t bg-muted/20 px-3 py-2">
                          <p className="text-foreground">{entry.what}</p>
                          <div className="rounded border border-amber-200 bg-amber-50 px-2 py-1.5 dark:border-amber-800 dark:bg-amber-950/30">
                            <span className="font-semibold text-amber-700 dark:text-amber-400">
                              {t.tools.misconception}
                            </span>
                            <span className="text-amber-800 dark:text-amber-300">
                              {entry.clarify}
                            </span>
                          </div>
                          <div className="rounded border border-blue-200 bg-blue-50 px-2 py-1.5 dark:border-blue-800 dark:bg-blue-950/30">
                            <span className="font-semibold text-blue-700 dark:text-blue-400">
                              {t.tools.tip}
                            </span>
                            <span className="text-blue-800 dark:text-blue-300">{entry.tip}</span>
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

// ------------------------------------------------------------------ //
//  Create Agent Dialog                                                //
// ------------------------------------------------------------------ //

function CreateAgentDialog({
  open,
  onOpenChange,
  saving,
  onSubmit,
  title,
  description,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving: boolean;
  onSubmit: (form: FormData, skillIds: string[]) => void;
  title?: string;
  description?: string;
}) {
  const t = useT(messages);
  const providers = useProviders();
  const skills = useSkills();
  const [streamingEnabled, setStreamingEnabled] = useState(false);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [systemPrompt, setSystemPrompt] = useState('');
  const dialogTitle = title ?? t.dialog.createTitle;
  const dialogDescription = description ?? t.dialog.createDescription;

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
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            fd.set('streamingEnabled', String(streamingEnabled));
            onSubmit(fd, selectedSkillIds);
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="create-name">{t.form.name}</Label>
            <Input id="create-name" name="name" placeholder={t.form.namePlaceholder} required />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="create-description">{t.form.description}</Label>
            <textarea
              id="create-description"
              name="description"
              rows={2}
              className="rounded-md border bg-background px-3 py-2 text-sm"
              placeholder={t.form.descriptionPlaceholder}
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="create-systemPrompt">{t.form.systemPrompt}</Label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSystemPrompt(SYSTEM_PROMPT_TEMPLATE)}
                  className="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Wand2 className="size-3" />
                  {t.form.useTemplate}
                </button>
                <span className="text-xs text-muted-foreground">{t.form.or}</span>
                <select
                  className="rounded border bg-background px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground"
                  value=""
                  onChange={(e) => {
                    const sample = SAMPLE_PROMPTS.find((s) => s.label === e.target.value);
                    if (sample) setSystemPrompt(sample.prompt);
                  }}
                >
                  <option value="" disabled>
                    {t.form.loadExample}
                  </option>
                  {SAMPLE_PROMPTS.map((s) => (
                    <option key={s.label} value={s.label}>
                      {t.templates.labels[s.label as keyof typeof t.templates.labels] ?? s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <textarea
              id="create-systemPrompt"
              name="systemPrompt"
              rows={10}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="rounded-md border bg-background px-3 py-2 font-mono text-sm leading-relaxed"
              placeholder={`You are [role], a specialist in [domain].\n\n## Goal\n[What this agent is here to accomplish]\n\n## Tone & style\n[Concise, expert, friendly]\n\n## Tools\n[When and how to use shell, file-io, web, memory, spawn]\n\n## Constraints\n[What to never do]\n\n## Output format\n[Code blocks, numbered steps, language matching]`}
              required
            />
            <p className="text-xs text-muted-foreground">
              {t.form.systemPromptHelpPrefix}
              <span className="font-medium text-foreground">{t.form.facetRole}</span>、
              <span className="font-medium text-foreground">{t.form.facetGoal}</span>、
              <span className="font-medium text-foreground">{t.form.facetTone}</span>、
              <span className="font-medium text-foreground">{t.form.facetTools}</span>、
              <span className="font-medium text-foreground">{t.form.facetConstraints}</span>、
              <span className="font-medium text-foreground">{t.form.facetOutput}</span>
              {t.form.systemPromptHelpSuffix}
            </p>
            <ToolsReference />
          </div>

          {/* Role is always worker for user-created agents; primary is system-only */}
          <input type="hidden" name="role" value="worker" />

          <ProviderModelFields providers={providers} idPrefix="create" />

          <div className="flex flex-col gap-2">
            <Label htmlFor="create-apiBaseUrl">{t.form.apiBaseUrl}</Label>
            <Input
              id="create-apiBaseUrl"
              name="apiBaseUrl"
              placeholder="https://api.example.com/v1"
            />
            <p className="text-xs text-muted-foreground">{t.form.apiBaseUrlHelp}</p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="create-maxTokensPerRun">{t.form.maxTokensPerRun}</Label>
            <Input
              id="create-maxTokensPerRun"
              name="maxTokensPerRun"
              type="number"
              defaultValue={100000}
              min={1000}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>{t.form.skills}</Label>
            <p className="text-xs text-muted-foreground">{t.form.skillsHelp}</p>
            <SkillPicker
              skills={skills}
              selected={selectedSkillIds}
              onChange={setSelectedSkillIds}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="create-streamingEnabled" className="text-base">
                {t.form.streaming}
              </Label>
              <p className="text-sm text-muted-foreground">{t.form.streamingHelp}</p>
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
              {t.form.cancel}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t.form.create}
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

function EditAgentDialog({
  agent,
  onOpenChange,
  saving,
  onSubmit,
}: {
  agent: AgentDefinition | null;
  onOpenChange: (open: boolean) => void;
  saving: boolean;
  onSubmit: (id: string, form: FormData, skillIds: string[]) => void;
}) {
  const t = useT(messages);
  const providers = useProviders();
  const skills = useSkills();
  const [streamingEnabled, setStreamingEnabled] = useState(agent?.streamingEnabled ?? false);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>(agent?.skillIds ?? []);

  if (!agent) return null;

  return (
    <Dialog open={agent !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.dialog.editTitle}</DialogTitle>
          <DialogDescription>{t.dialog.editDescription(agent.name)}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            fd.set('streamingEnabled', String(streamingEnabled));
            onSubmit(agent.id, fd, selectedSkillIds);
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-name">{t.form.name}</Label>
            <Input id="edit-name" name="name" defaultValue={agent.name} required />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-description">{t.form.description}</Label>
            <textarea
              id="edit-description"
              name="description"
              rows={2}
              className="rounded-md border bg-background px-3 py-2 text-sm"
              defaultValue={agent.description}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-systemPrompt">{t.form.systemPrompt}</Label>
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
            <Label>{t.form.role}</Label>
            <p className="text-sm text-muted-foreground">
              {agent.role === 'primary' ? t.form.rolePrimary : t.form.roleWorker}
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
            <Label htmlFor="edit-apiBaseUrl">{t.form.apiBaseUrl}</Label>
            <Input
              id="edit-apiBaseUrl"
              name="apiBaseUrl"
              defaultValue={agent.apiBaseUrl ?? ''}
              placeholder="https://api.example.com/v1"
            />
            <p className="text-xs text-muted-foreground">{t.form.apiBaseUrlHelp}</p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-maxTokensPerRun">{t.form.maxTokensPerRun}</Label>
            <Input
              id="edit-maxTokensPerRun"
              name="maxTokensPerRun"
              type="number"
              defaultValue={agent.maxTokensPerRun ?? 100000}
              min={1000}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>{t.form.skills}</Label>
            <p className="text-xs text-muted-foreground">{t.form.skillsHelp}</p>
            <SkillPicker
              skills={skills}
              selected={selectedSkillIds}
              onChange={setSelectedSkillIds}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="edit-streamingEnabled" className="text-base">
                {t.form.streaming}
              </Label>
              <p className="text-sm text-muted-foreground">{t.form.streamingHelp}</p>
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
              {t.form.cancel}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t.form.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ------------------------------------------------------------------ //
//  Public Agents Table                                                //
// ------------------------------------------------------------------ //

function OfficialAgentsTable({
  agents,
  isAdmin,
  saving,
  onEdit,
  onToggleActive,
}: {
  agents: AgentDefinition[];
  isAdmin: boolean;
  saving: boolean;
  onEdit: (agent: AgentDefinition) => void;
  onToggleActive: (agent: AgentDefinition) => void;
}) {
  const t = useT(messages);
  if (agents.length === 0) {
    return (
      <div className="rounded-md border bg-background/30 backdrop-blur-sm p-4 text-center text-sm text-muted-foreground">
        {t.tables.emptyPublic}
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-background/30 backdrop-blur-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t.tables.colAgent}</TableHead>
            <TableHead>{t.tables.colModel}</TableHead>
            <TableHead>{t.tables.colRole}</TableHead>
            <TableHead>{t.tables.colType}</TableHead>
            <TableHead>{t.tables.colEnabled}</TableHead>
            <TableHead className="w-[50px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {agents.map((agent) => (
            <TableRow key={agent.id}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  <Bot className="size-4" />
                  {agent.name}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {agent.provider} / {agent.model}
              </TableCell>
              <TableCell>
                <Badge variant={agent.role === 'primary' ? 'default' : 'secondary'}>
                  {agent.role}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{t.tables.typePublic}</Badge>
              </TableCell>
              <TableCell>
                {agent.role === 'primary' ? (
                  <span className="text-muted-foreground text-sm">{t.tables.alwaysOn}</span>
                ) : (
                  <Switch
                    checked={agent.isActive}
                    onCheckedChange={() => {
                      onToggleActive(agent);
                    }}
                    disabled={saving || !isAdmin}
                  />
                )}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    {isAdmin && (
                      <DropdownMenuItem
                        onSelect={() => {
                          onEdit(agent);
                        }}
                      >
                        {t.tables.edit}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem asChild>
                      <Link href={`/agents/${agent.id}`}>{t.tables.viewRuns}</Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ------------------------------------------------------------------ //
//  Sub-Agents Table                                                   //
// ------------------------------------------------------------------ //

function SubAgentsTable({
  agents,
  canEdit,
  saving,
  onEdit,
  onToggleActive,
  isAdminViewing = false,
}: {
  agents: AgentDefinition[];
  canEdit: boolean;
  saving: boolean;
  onEdit: (agent: AgentDefinition) => void;
  onToggleActive: (agent: AgentDefinition) => void;
  isAdminViewing?: boolean;
}) {
  const t = useT(messages);
  if (agents.length === 0) {
    return (
      <div className="rounded-md border bg-background/30 backdrop-blur-sm p-4 text-center text-sm text-muted-foreground">
        {t.tables.emptySub}
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-background/30 backdrop-blur-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t.tables.colAgent}</TableHead>
            <TableHead>{t.tables.colModel}</TableHead>
            <TableHead>{t.tables.colRole}</TableHead>
            <TableHead>{t.tables.colType}</TableHead>
            <TableHead>{t.tables.colEnabled}</TableHead>
            <TableHead className="w-[50px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {agents.map((agent) => (
            <TableRow key={agent.id}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  <Bot className="size-4" />
                  {agent.name}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {agent.provider} / {agent.model}
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{agent.role}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{t.tables.typePrivate}</Badge>
              </TableCell>
              <TableCell>
                {agent.role === 'primary' ? (
                  <span className="text-muted-foreground text-sm">{t.tables.alwaysOn}</span>
                ) : (
                  <Switch
                    checked={agent.isActive}
                    onCheckedChange={() => {
                      onToggleActive(agent);
                    }}
                    disabled={saving || !canEdit}
                  />
                )}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    {canEdit && (
                      <DropdownMenuItem
                        onSelect={() => {
                          onEdit(agent);
                        }}
                      >
                        {t.tables.edit}
                      </DropdownMenuItem>
                    )}
                    {isAdminViewing && !canEdit && (
                      <DropdownMenuItem
                        onSelect={() => {
                          onEdit(agent);
                        }}
                      >
                        {t.tables.viewDetails}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem asChild>
                      <Link href={`/agents/${agent.id}`}>{t.tables.viewRuns}</Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ------------------------------------------------------------------ //
//  User Sub-Agents Section (for admin view)                           //
// ------------------------------------------------------------------ //

function UserSubAgentsSection({
  userName,
  userEmail,
  agents,
  defaultOpen = false,
  saving,
  onEdit,
  onToggleActive,
}: {
  userName: string;
  userEmail: string;
  agents: AgentDefinition[];
  defaultOpen?: boolean;
  saving: boolean;
  onEdit: (agent: AgentDefinition) => void;
  onToggleActive: (agent: AgentDefinition) => void;
}) {
  const t = useT(messages);
  return (
    <Collapsible
      defaultOpen={defaultOpen}
      className="group/user rounded-lg border bg-background/30 backdrop-blur-sm"
    >
      <CollapsibleTrigger className="flex w-full items-center gap-2 p-4 text-left hover:bg-muted/50">
        <ChevronRight className="size-4 shrink-0 transition-transform duration-200 group-data-[state=open]/user:rotate-90" />
        <div className="flex-1">
          <h3 className="font-semibold">{userName}</h3>
          <p className="text-sm text-muted-foreground">{userEmail}</p>
        </div>
        <Badge variant="outline" className="mr-2">
          {t.tables.subAgentCount(agents.length)}
        </Badge>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-4 pb-4">
          <SubAgentsTable
            agents={agents}
            canEdit={false}
            saving={saving}
            onEdit={onEdit}
            onToggleActive={onToggleActive}
            isAdminViewing={true}
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ------------------------------------------------------------------ //
//  Recent Runs                                                        //
// ------------------------------------------------------------------ //

interface AgentRunEntry {
  id: string;
  status: string;
  input: string;
  output: string | null;
  error: string | null;
  tokenUsage: Record<string, unknown>;
  startedAt: string;
  completedAt: string | null;
  parentAgentRunId: string | null;
  agentDefinition: { id: string; name: string; role: string };
}

interface ToolCallMessage {
  id: string;
  role: string;
  content: string;
  toolCalls: { id: string; name: string; arguments: string }[] | null;
  toolCallId: string | null;
  createdAt: string;
}

interface AgentRunDetail extends AgentRunEntry {
  toolCallMessages: ToolCallMessage[];
}

function formatDuration(start: string, end: string | null): string {
  const endTime = end ? new Date(end).getTime() : Date.now();
  const ms = endTime - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function AgentRunDialog({
  runId,
  onOpenChange,
}: {
  runId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useT(messages);
  const [run, setRun] = useState<AgentRunDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!runId) {
      setRun(null);
      return;
    }
    setLoading(true);
    void authFetch<{ data: AgentRunDetail }>(`/api/v1/chat/agent-runs/${runId}`)
      .then((res) => {
        setRun(res.data);
      })
      .catch(() => {
        setRun(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [runId]);

  return (
    <Dialog open={runId !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        {loading ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bot className="size-5" />
                {t.run.loading}
              </DialogTitle>
            </DialogHeader>
            <div className="flex justify-center py-8">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          </>
        ) : run ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bot className="size-5" />
                {run.agentDefinition.name}
              </DialogTitle>
              <DialogDescription>
                {t.run.startedAt(formatTime(run.startedAt))}
                {run.completedAt && t.run.duration(formatDuration(run.startedAt, run.completedAt))}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    run.status === 'completed'
                      ? 'default'
                      : run.status === 'running'
                        ? 'secondary'
                        : 'destructive'
                  }
                >
                  {run.status}
                </Badge>
                {run.parentAgentRunId && (
                  <Badge variant="outline" className="gap-1">
                    <GitBranch className="size-3" />
                    {t.tables.subAgentBadge}
                  </Badge>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <Label className="text-muted-foreground">{t.run.input}</Label>
                <div className="rounded-md border bg-muted/50 p-3">
                  <pre className="whitespace-pre-wrap text-sm">{run.input}</pre>
                </div>
              </div>

              {run.output && (
                <div className="flex flex-col gap-1">
                  <Label className="text-muted-foreground">{t.run.output}</Label>
                  <div className="rounded-md border bg-muted/50 p-3 max-h-[300px] overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm">{run.output}</pre>
                  </div>
                </div>
              )}

              {run.error && (
                <div className="flex flex-col gap-1">
                  <Label className="text-destructive">{t.run.errorLabel}</Label>
                  <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 max-h-[200px] overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm text-destructive">{run.error}</pre>
                  </div>
                </div>
              )}

              {run.toolCallMessages && run.toolCallMessages.length > 0 && (
                <div className="flex flex-col gap-1">
                  <Label className="text-muted-foreground">{t.run.toolCalls}</Label>
                  <div className="space-y-2">
                    {run.toolCallMessages.map((msg) => (
                      <div key={msg.id} className="rounded-md border bg-muted/50 p-3">
                        {msg.toolCalls ? (
                          msg.toolCalls.map((tc, idx) => (
                            <div key={tc.id || idx} className="mb-2 last:mb-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Wrench className="size-3 text-muted-foreground" />
                                <span className="text-sm font-medium">{tc.name}</span>
                              </div>
                              <pre className="whitespace-pre-wrap text-xs text-muted-foreground bg-background/50 p-2 rounded">
                                {(() => {
                                  try {
                                    // Handle both string and object arguments
                                    const args =
                                      typeof tc.arguments === 'string'
                                        ? JSON.parse(tc.arguments)
                                        : tc.arguments;
                                    return JSON.stringify(args, null, 2);
                                  } catch {
                                    // Fallback: stringify if it's an object, otherwise return as-is
                                    return typeof tc.arguments === 'object'
                                      ? JSON.stringify(tc.arguments, null, 2)
                                      : String(tc.arguments);
                                  }
                                })()}
                              </pre>
                            </div>
                          ))
                        ) : msg.toolCallId ? (
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs text-muted-foreground">
                                {t.run.toolResult}
                              </span>
                            </div>
                            <pre className="whitespace-pre-wrap text-xs text-muted-foreground bg-background/50 p-2 rounded max-h-[150px] overflow-y-auto">
                              {(() => {
                                const content =
                                  typeof msg.content === 'string'
                                    ? msg.content
                                    : JSON.stringify(msg.content, null, 2);
                                return (
                                  content.slice(0, 2000) + (content.length > 2000 ? '...' : '')
                                );
                              })()}
                            </pre>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {run.tokenUsage && Object.keys(run.tokenUsage).length > 0 && (
                <div className="flex flex-col gap-1">
                  <Label className="text-muted-foreground">{t.run.tokenUsage}</Label>
                  <div className="rounded-md border bg-muted/50 p-3">
                    <pre className="whitespace-pre-wrap text-xs text-muted-foreground">
                      {JSON.stringify(run.tokenUsage, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bot className="size-5" />
                {t.run.error}
              </DialogTitle>
            </DialogHeader>
            <div className="text-center text-muted-foreground py-4">{t.run.loadFailed}</div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function RecentRuns() {
  const t = useT(messages);
  const [runs, setRuns] = useState<AgentRunEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  useEffect(() => {
    const fetchRuns = () => {
      void authFetch<{ data: AgentRunEntry[] }>('/api/v1/chat/agent-runs?limit=20')
        .then((res) => {
          setRuns(Array.isArray(res.data) ? res.data : []);
        })
        .catch(() => {})
        .finally(() => {
          setLoading(false);
        });
    };

    fetchRuns();
    const interval = setInterval(fetchRuns, 15_000);
    return () => {
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="rounded-md border bg-background/30 backdrop-blur-sm p-4 text-center text-sm text-muted-foreground">
        {t.tables.emptyRuns}
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border bg-background/30 backdrop-blur-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.tables.colAgent}</TableHead>
              <TableHead>{t.tables.colType}</TableHead>
              <TableHead>{t.tables.colInput}</TableHead>
              <TableHead>{t.tables.colStatus}</TableHead>
              <TableHead>{t.tables.colDuration}</TableHead>
              <TableHead>{t.tables.colTime}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runs.map((run) => (
              <TableRow
                key={run.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => {
                  setSelectedRunId(run.id);
                }}
              >
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Bot className="size-4 shrink-0" />
                    {run.agentDefinition.name}
                  </div>
                </TableCell>
                <TableCell>
                  {run.parentAgentRunId ? (
                    <Badge variant="outline" className="gap-1">
                      <GitBranch className="size-3" />
                      {t.tables.subAgentBadge}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">{run.agentDefinition.role}</Badge>
                  )}
                </TableCell>
                <TableCell className="max-w-[200px]">
                  <p className="truncate text-xs text-muted-foreground">
                    {run.input.slice(0, 100)}
                  </p>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      run.status === 'completed'
                        ? 'default'
                        : run.status === 'running'
                          ? 'secondary'
                          : 'destructive'
                    }
                  >
                    {run.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatDuration(run.startedAt, run.completedAt)}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatTime(run.startedAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <AgentRunDialog
        runId={selectedRunId}
        onOpenChange={(open) => !open && setSelectedRunId(null)}
      />
    </>
  );
}

// ------------------------------------------------------------------ //
//  View Agent Dialog (read-only for admin viewing others' agents)     //
// ------------------------------------------------------------------ //

function ViewAgentDialog({
  agent,
  onOpenChange,
}: {
  agent: AgentDefinition | null;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useT(messages);
  if (!agent) return null;

  return (
    <Dialog open={agent !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.dialog.viewTitle}</DialogTitle>
          <DialogDescription>{t.dialog.viewDescription(agent.name)}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label className="text-muted-foreground">{t.view.name}</Label>
            <p className="text-sm">{agent.name}</p>
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-muted-foreground">{t.view.description}</Label>
            <p className="text-sm">{agent.description || t.view.empty}</p>
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-muted-foreground">{t.view.systemPrompt}</Label>
            <pre className="rounded-md border bg-muted/50 p-3 text-xs whitespace-pre-wrap max-h-[200px] overflow-y-auto">
              {agent.systemPrompt}
            </pre>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <Label className="text-muted-foreground">{t.view.role}</Label>
              <p className="text-sm">{agent.role}</p>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-muted-foreground">{t.view.status}</Label>
              <p className="text-sm">
                {agent.role === 'primary'
                  ? t.view.statusAlwaysOn
                  : agent.isActive
                    ? t.view.statusActive
                    : t.view.statusInactive}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <Label className="text-muted-foreground">{t.view.provider}</Label>
              <p className="text-sm">{agent.provider}</p>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-muted-foreground">{t.view.model}</Label>
              <p className="text-sm">{agent.model}</p>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-muted-foreground">{t.view.maxTokensPerRun}</Label>
            <p className="text-sm">{agent.maxTokensPerRun?.toLocaleString()}</p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false);
              }}
            >
              {t.view.close}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ------------------------------------------------------------------ //
//  Main Page                                                          //
// ------------------------------------------------------------------ //

export default function UserAgentsPage() {
  const t = useT(messages);
  const { user } = useAuth();
  const [officialAgents, setOfficialAgents] = useState<AgentDefinition[]>([]);
  const [mySubAgents, setMySubAgents] = useState<AgentDefinition[]>([]);
  const [otherUsersSubAgents, setOtherUsersSubAgents] = useState<
    Map<string, { user: { name: string; email: string }; agents: AgentDefinition[] }>
  >(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const [createOfficialOpen, setCreateOfficialOpen] = useState(false);
  const [createSubOpen, setCreateSubOpen] = useState(false);
  const [editAgent, setEditAgent] = useState<AgentDefinition | null>(null);
  const [viewAgent, setViewAgent] = useState<AgentDefinition | null>(null);

  const isAdmin = user?.role === 'super_admin';
  const currentUserId = user?.sub;

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await authFetch<PaginatedAgents>(
        '/api/v1/agents?limit=100&includeCreatedBy=true',
      );
      const all = Array.isArray(res.data) ? res.data : [];

      // Official agents (primary first, then workers)
      setOfficialAgents(
        all
          .filter((a) => a.isOfficial)
          .sort((a, b) => (a.role === 'primary' ? -1 : 1) - (b.role === 'primary' ? -1 : 1)),
      );

      // My sub-agents (created by current user)
      setMySubAgents(all.filter((a) => !a.isOfficial && a.createdById === currentUserId));

      // Other users' sub-agents (admin only)
      if (isAdmin) {
        const otherAgents = all.filter(
          (a) => !a.isOfficial && a.createdById && a.createdById !== currentUserId,
        );
        const grouped = new Map<
          string,
          { user: { name: string; email: string }; agents: AgentDefinition[] }
        >();

        for (const agent of otherAgents) {
          if (!agent.createdById || !agent.createdBy) continue;
          const existing = grouped.get(agent.createdById);
          if (existing) {
            existing.agents.push(agent);
          } else {
            grouped.set(agent.createdById, {
              user: { name: agent.createdBy.name, email: agent.createdBy.email },
              agents: [agent],
            });
          }
        }
        setOtherUsersSubAgents(grouped);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t.page.errorLoadAgents);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, currentUserId, t]);

  useEffect(() => {
    void fetchAgents();
  }, [fetchAgents]);

  async function handleCreateOfficial(form: FormData, skillIds: string[]) {
    setSaving(true);
    setError('');
    try {
      const name = form.get('name') as string;
      await authFetch('/api/v1/agents', {
        method: 'POST',
        body: JSON.stringify({
          name,
          description: form.get('description') || undefined,
          systemPrompt: form.get('systemPrompt'),
          role: form.get('role') || 'primary',
          provider: form.get('provider'),
          model: form.get('model'),
          apiBaseUrl: form.get('apiBaseUrl') || undefined,
          maxTokensPerRun: Number(form.get('maxTokensPerRun')) || 100000,
          streamingEnabled: form.get('streamingEnabled') === 'true',
          skillIds,
          isOfficial: true,
        }),
      });
      setCreateOfficialOpen(false);
      await fetchAgents();
      setSuccessMessage(t.page.createdToast(name));
    } catch (err) {
      setError(err instanceof Error ? err.message : t.page.errorCreateAgent);
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateSub(form: FormData, skillIds: string[]) {
    setSaving(true);
    setError('');
    try {
      const name = form.get('name') as string;
      await authFetch('/api/v1/agents', {
        method: 'POST',
        body: JSON.stringify({
          name,
          description: form.get('description') || undefined,
          systemPrompt: form.get('systemPrompt'),
          role: form.get('role') || 'worker',
          provider: form.get('provider'),
          model: form.get('model'),
          apiBaseUrl: form.get('apiBaseUrl') || undefined,
          maxTokensPerRun: Number(form.get('maxTokensPerRun')) || 100000,
          streamingEnabled: form.get('streamingEnabled') === 'true',
          skillIds,
          isOfficial: false,
        }),
      });
      setCreateSubOpen(false);
      await fetchAgents();
      setSuccessMessage(t.page.createdToast(name));
    } catch (err) {
      setError(err instanceof Error ? err.message : t.page.errorCreateSub);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(id: string, form: FormData, skillIds: string[]) {
    setSaving(true);
    setError('');
    try {
      await authFetch(`/api/v1/agents/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: form.get('name'),
          description: form.get('description') || undefined,
          systemPrompt: form.get('systemPrompt'),
          role: form.get('role') || undefined,
          provider: form.get('provider'),
          model: form.get('model'),
          apiBaseUrl: form.get('apiBaseUrl') || undefined,
          maxTokensPerRun: Number(form.get('maxTokensPerRun')) || 100000,
          streamingEnabled: form.get('streamingEnabled') === 'true',
          skillIds,
        }),
      });
      setEditAgent(null);
      await fetchAgents();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.page.errorUpdateAgent);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(agent: AgentDefinition) {
    setSaving(true);
    setError('');
    try {
      await authFetch(`/api/v1/agents/${agent.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !agent.isActive }),
      });
      await fetchAgents();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.page.errorUpdateAgent);
    } finally {
      setSaving(false);
    }
  }

  // Handle edit vs view based on ownership
  function handleAgentAction(agent: AgentDefinition, isOwner: boolean) {
    if (isOwner || (isAdmin && agent.isOfficial)) {
      setEditAgent(agent);
    } else {
      setViewAgent(agent);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t.page.title}</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? t.page.subtitleAdmin : t.page.subtitleUser}
          </p>
        </div>
      </div>

      <div className="rounded-lg border bg-muted/30 p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t.page.flowCaption}
        </p>
        <img
          src="/images/clawix_agent_creation_flow.svg"
          alt={t.page.flowAlt}
          className="mx-auto w-full max-w-2xl"
        />
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Public Agents Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t.page.publicAgents}</h2>
              {isAdmin && (
                <Button
                  size="sm"
                  onClick={() => {
                    setCreateOfficialOpen(true);
                  }}
                >
                  <Plus className="mr-1 size-4" />
                  {t.page.createAgent}
                </Button>
              )}
            </div>
            <OfficialAgentsTable
              agents={officialAgents}
              isAdmin={isAdmin}
              saving={saving}
              onEdit={setEditAgent}
              onToggleActive={handleToggleActive}
            />
          </div>

          {/* My Sub-Agents Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t.page.mySubAgents}</h2>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setCreateSubOpen(true);
                }}
              >
                <Plus className="mr-1 size-4" />
                {t.page.createSubAgent}
              </Button>
            </div>
            <SubAgentsTable
              agents={mySubAgents}
              canEdit={true}
              saving={saving}
              onEdit={setEditAgent}
              onToggleActive={handleToggleActive}
            />
          </div>

          {/* Other Users' Sub-Agents (Admin only) */}
          {isAdmin && otherUsersSubAgents.size > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">{t.page.otherUsersSubAgents}</h2>
              <div className="space-y-3">
                {Array.from(otherUsersSubAgents.entries()).map(
                  ([userId, { user: userData, agents }]) => (
                    <UserSubAgentsSection
                      key={userId}
                      userName={userData.name}
                      userEmail={userData.email}
                      agents={agents}
                      saving={saving}
                      onEdit={(agent) => {
                        handleAgentAction(agent, false);
                      }}
                      onToggleActive={handleToggleActive}
                    />
                  ),
                )}
              </div>
            </div>
          )}

          {/* Recent Agent Runs */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="size-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold">{t.page.recentRuns}</h2>
              </div>
              <Button
                size="sm"
                variant="destructive"
                className="gap-1"
                onClick={() => {
                  void authFetch('/api/v1/chat/agent-runs/stop', { method: 'POST' })
                    .then(() => fetchAgents())
                    .catch(() => {});
                }}
              >
                <Square className="size-3" />
                {t.page.stopAll}
              </Button>
            </div>
            <RecentRuns />
          </div>
        </div>
      )}

      {/* Create Public Agent Dialog */}
      <CreateAgentDialog
        key={createOfficialOpen ? 'official-open' : 'official-closed'}
        open={createOfficialOpen}
        onOpenChange={setCreateOfficialOpen}
        saving={saving}
        onSubmit={handleCreateOfficial}
        title={t.dialog.createPublicTitle}
        description={t.dialog.createPublicDescription}
      />

      {/* Create Sub-Agent Dialog */}
      <CreateAgentDialog
        key={createSubOpen ? 'sub-open' : 'sub-closed'}
        open={createSubOpen}
        onOpenChange={setCreateSubOpen}
        saving={saving}
        onSubmit={handleCreateSub}
        title={t.dialog.createSubTitle}
        description={t.dialog.createSubDescription}
      />

      {/* Edit Agent Dialog */}
      <EditAgentDialog
        key={editAgent?.id ?? 'none'}
        agent={editAgent}
        onOpenChange={(open) => {
          if (!open) setEditAgent(null);
        }}
        saving={saving}
        onSubmit={handleUpdate}
      />

      {/* View Agent Dialog (read-only) */}
      <ViewAgentDialog
        agent={viewAgent}
        onOpenChange={(open) => {
          if (!open) setViewAgent(null);
        }}
      />

      <SuccessDialog
        open={successMessage !== ''}
        onOpenChange={(open) => {
          if (!open) setSuccessMessage('');
        }}
        title={t.page.successTitle}
        description={successMessage}
      />
    </div>
  );
}
