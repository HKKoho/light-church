
import { GoogleGenAI, Modality } from "@google/genai";
import { Module } from "../types";

export const getWisdomAssistantResponse = async (
  module: Module,
  userQuestion: string,
  userInput: string
) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.error('Missing VITE_GEMINI_API_KEY environment variable');
    return "智慧的言語如同金蘋果落在銀網子裡。讓我們在安靜中繼續思考。";
  }
  const ai = new GoogleGenAI({ apiKey });
  
  const systemInstruction = `
    你是一位資深的聖經智慧文學導師。這是一門關於《箴言》、《傳道書》與《約伯記》的互動課程。
    目前的課程主題是：${module.title} (${module.subtitle})。
    你的任務是針對使用者的生活提問回饋或進一步的聖經疑問，提供具備「交錯互補」視角的洞察。
    請記住：
    - 《箴言》強調秩序與邏輯。
    - 《傳道書》強調無常與限制。
    - 《約伯記》強調苦難與上帝的沈默。
    請用溫暖、睿智、不過度教條化的傳統中文回答，長度約 150-200 字。
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `課程提問：${userQuestion}\n學習者的回應：${userInput}\n請給予啟發性的反思回饋。`,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "智慧的言語如同金蘋果落在銀網子裡。讓我們在安靜中繼續思考。";
  }
};

/**
 * Generates audio narration for a given text using gemini-2.5-flash-preview-tts
 * Returns base64 encoded PCM data.
 */
export const generateSpeech = async (text: string): Promise<string | undefined> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.error('Missing VITE_GEMINI_API_KEY environment variable');
    return undefined;
  }
  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `請用廣東話（粵語）以溫暖且具啟發性的語氣朗讀以下內容：${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' }, // Kore is suitable for clear narration
          },
        },
      },
    });

    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch (error) {
    console.error("TTS Generation Error:", error);
    return undefined;
  }
};

/**
 * Generate a Bible book overview within 300 words using Gemini
 * @param bookTitle - The title of the Bible book (e.g., "創世記", "箴言")
 * @returns Generated overview text
 */
export const generateBibleBookOverview = async (bookTitle: string): Promise<string> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini service is not configured. Please add VITE_GEMINI_API_KEY to your environment.');
  }

  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `你是一位專精於聖經研究的學者。請為指定的聖經書卷撰寫一份概要。

【要求】
1. 內容必須在300字以內
2. 使用繁體中文
3. 包含以下重點：
   - 書卷的主題與核心信息
   - 作者與寫作背景（如有已知）
   - 主要內容結構
   - 對現代讀者的意義
4. 語氣應該學術且易於理解
5. 避免過度神學術語`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `請為《${bookTitle}》撰寫經卷概要。`,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    if (!response.text) {
      throw new Error('No response from Gemini');
    }

    return response.text.trim();
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error('生成經卷概要失敗，請稍後再試。');
  }
};

/**
 * Check if Gemini service is available
 */
export const isGeminiAvailable = (): boolean => {
  return !!import.meta.env.VITE_GEMINI_API_KEY;
};

// ============================================================================
// EDUCATIONAL CONTENT ANALYSIS
// ============================================================================

export interface EducationalContentAnalysisResult {
  summary: string;
  educationalPurpose: string;
  coreTopics: string[];
  biblicalConnections: string[];
  practicalApplications: string[];
  fullAnalysisMarkdown: string;
  tokenCount?: number;
}

/**
 * Analyze educational content for biblical/spiritual insights
 * Supports text, YouTube URLs, images, documents, audio, and web search
 */
export async function analyzeEducationalContent(
  contentType: 'youtube' | 'document' | 'image' | 'audio' | 'transcript' | 'websearch',
  content: string,
  title: string,
  base64Data?: string,
  mimeType?: string,
  wordLimit?: number
): Promise<EducationalContentAnalysisResult> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini service is not configured. Please add VITE_GEMINI_API_KEY to your environment.');
  }

  const ai = new GoogleGenAI({ apiKey });

  // Calculate lengths based on word limit
  const limit = wordLimit || 300;
  const includeSummary = limit > 600; // Only include executive summary for reports > 600 words
  const biblicalVerses = limit <= 150 ? '1-2' : limit <= 300 ? '2-3' : limit <= 500 ? '3-4' : '4-5';

  const systemInstruction = includeSummary
    ? `你是一位專業的聖經教育內容分析師。

請用繁體中文回答，提供以下2個部分，總字數約${limit}字：

## 1. 執行摘要 (Executive Summary)
用約${Math.round(limit * 0.3)}字總結這個內容的核心要點和教育價值。

## 2. 與聖經的連結 (Biblical Connections)
用約${Math.round(limit * 0.7)}字，引用${biblicalVerses}節相關經文，並說明如何應用到生活中。`
    : `你是一位專業的聖經教育內容分析師。

請用繁體中文回答，直接提供與聖經的連結分析，總字數約${limit}字：

引用${biblicalVerses}節相關經文，說明內容的核心要點，並解釋如何應用到生活中。

不需要執行摘要，直接進入分析內容。`;

  try {
    let contents: Parameters<typeof ai.models.generateContent>[0]['contents'];

    if (base64Data && mimeType) {
      // Multimodal content (image, audio, document)
      contents = [
        {
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
            {
              text: `請分析以下${getContentTypeLabel(contentType)}的教育內容：\n標題：${title}\n\n請提供聖經教育分析（約${limit}字）。`,
            },
          ],
        },
      ];
    } else {
      // Text-based content (transcript, YouTube URL)
      contents = `請分析以下${getContentTypeLabel(contentType)}的教育內容：

標題：${title}

內容：
${content}

請提供聖經教育分析（約${limit}字）。`;
    }

    // Adjust max tokens based on word limit (Chinese needs ~2-3 tokens per character, plus buffer)
    const maxTokens = Math.max(3000, limit * 5);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: {
        systemInstruction,
        temperature: 0.5,
        maxOutputTokens: maxTokens,
      },
    });

    const responseText = response.text || '';

    // Parse the structured response
    const parsed = parseAnalysisResponse(responseText);

    return {
      summary: parsed.summary,
      educationalPurpose: parsed.educationalPurpose,
      coreTopics: parsed.coreTopics,
      biblicalConnections: parsed.biblicalConnections,
      practicalApplications: parsed.practicalApplications,
      fullAnalysisMarkdown: responseText,
      tokenCount: response.usageMetadata?.totalTokenCount,
    };
  } catch (error) {
    console.error('Gemini Content Analysis Error:', error);
    throw new Error('內容分析失敗，請稍後再試。');
  }
}

function getContentTypeLabel(contentType: string): string {
  const labels: Record<string, string> = {
    youtube: 'YouTube 影片',
    document: '文件',
    image: '圖片',
    audio: '音頻',
    transcript: '文字內容',
    websearch: '網頁搜尋結果',
  };
  return labels[contentType] || '內容';
}

function parseAnalysisResponse(response: string): {
  summary: string;
  educationalPurpose: string;
  coreTopics: string[];
  biblicalConnections: string[];
  practicalApplications: string[];
} {
  // Extract sections from markdown response (2-section format)
  // Try multiple patterns for flexibility
  const summaryMatch = response.match(/##\s*1\.\s*執行摘要[^\n]*\n([\s\S]*?)(?=##\s*2|$)/i) ||
                       response.match(/執行摘要[^\n]*\n([\s\S]*?)(?=與聖經|聖經連結|Biblical|$)/i);
  const biblicalMatch = response.match(/##\s*2\.\s*與聖經的連結[^\n]*\n([\s\S]*?)$/i) ||
                        response.match(/與聖經的連結[^\n]*\n([\s\S]*?)$/i) ||
                        response.match(/聖經連結[^\n]*\n([\s\S]*?)$/i);

  const extractList = (text: string): string[] => {
    if (!text) return [];
    const lines = text.split('\n').filter(line => line.trim());
    return lines
      .filter(line => line.match(/^[-*•]\s/) || line.match(/^\d+\.\s/))
      .map(line => line.replace(/^[-*•]\s*/, '').replace(/^\d+\.\s*/, '').trim())
      .filter(Boolean);
  };

  // If no sections found, use the full response as summary
  const summary = summaryMatch?.[1]?.trim() || response.replace(/^#+.*\n?/gm, '').trim();

  return {
    summary,
    educationalPurpose: '', // Not used in 2-section format
    coreTopics: [], // Not used in 2-section format
    biblicalConnections: extractList(biblicalMatch?.[1] || ''),
    practicalApplications: [], // Not used in 2-section format
  };
}

// ============================================================================
// WEB SEARCH WITH GOOGLE GROUNDING
// ============================================================================

export interface WebSearchResult {
  content: string;
  sources: string[];
  tokenCount?: number;
}

/**
 * Search the web using Gemini with Google Search grounding
 * Returns synthesized content from search results
 */
export async function searchWebContent(query: string): Promise<WebSearchResult> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini service is not configured. Please add VITE_GEMINI_API_KEY to your environment.');
  }

  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `你是一個專業的研究助手。請根據用戶的搜尋查詢，從網路搜尋結果中整理出最相關、最有價值的內容。

【要求】
1. 使用繁體中文回答
2. 綜合多個搜尋結果，提供全面的資訊
3. 如果搜尋結果涉及聖經或基督教相關內容，請特別標注
4. 保持客觀，引用可靠來源
5. 整理成清晰易讀的格式`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `請搜尋並整理以下主題的相關資訊：${query}`,
      config: {
        systemInstruction,
        temperature: 0.3,
        tools: [{ googleSearch: {} }],
      },
    });

    const responseText = response.text || '';

    // Extract sources from grounding metadata if available
    const sources: string[] = [];
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    if (groundingMetadata?.groundingChunks) {
      for (const chunk of groundingMetadata.groundingChunks) {
        if (chunk.web?.uri) {
          sources.push(chunk.web.uri);
        }
      }
    }

    return {
      content: responseText,
      sources: [...new Set(sources)], // Remove duplicates
      tokenCount: response.usageMetadata?.totalTokenCount,
    };
  } catch (error) {
    console.error('Web Search Error:', error);
    throw new Error('網頁搜尋失敗，請稍後再試。');
  }
}
