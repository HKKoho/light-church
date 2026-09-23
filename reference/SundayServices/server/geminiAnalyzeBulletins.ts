import { GoogleGenAI, Type } from '@google/genai';

export interface BulletinFileInput {
  name: string;
  mimeType: string;
  base64: string;
}

export interface BulletinAnalysis {
  formatSummary: string;
  sections: string[];
  suggestions: string[];
}

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    formatSummary: {
      type: Type.STRING,
      description: '簡述這教會主日崇拜週刊之間固定重複的格式與內容規律',
    },
    sections: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '偵測到的程序項目，依原本在週刊中出現的順序列出',
    },
    suggestions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '協助幹事編輯本主日程序表、保持格式一致的具體建議',
    },
  },
  required: ['formatSummary', 'sections', 'suggestions'],
};

// Server-side only: the Gemini call needs GEMINI_API_KEY, which must never be
// shipped to the browser bundle (see metadata.json's
// MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API declaration).
export async function analyzeBulletins(
  churchName: string,
  files: BulletinFileInput[]
): Promise<BulletinAnalysis> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('伺服器尚未設定 GEMINI_API_KEY，無法分析週刊。');
  }
  if (files.length === 0) {
    throw new Error('沒有收到任何週刊檔案。');
  }

  const ai = new GoogleGenAI({ apiKey });

  const promptText = `你是「${churchName}」的主日崇拜週刊編輯助理。以下附上該教會過去幾期的主日崇拜週刊 PDF。
請分析這些週刊之間固定重複的格式與內容規律（例如程序項目的順序與名稱、詩歌編排方式、讀經／證道的呈現方式、報告事項的分類等），
並整理成可用於編輯本主日程序表的具體建議，方便幹事在「主日崇拜內容智能編輯系統」中依循同一格式編輯內容。
請以指定的 JSON 結構回覆，全部使用繁體中文。`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          ...files.map((file) => ({
            inlineData: {
              data: file.base64,
              mimeType: file.mimeType || 'application/pdf',
            },
          })),
          { text: promptText },
        ],
      },
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  const raw = response.text;
  if (!raw) {
    throw new Error('Gemini 未有回覆內容。');
  }

  const parsed = JSON.parse(raw) as Partial<BulletinAnalysis>;
  return {
    formatSummary: parsed.formatSummary ?? '',
    sections: Array.isArray(parsed.sections) ? parsed.sections : [],
    suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
  };
}
