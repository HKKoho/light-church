// Local, offline keyword classifier for the officer's voice/text input.
// No network call and no API key: it scores the transcribed Chinese text
// against known church-bulletin vocabulary and suggests where it belongs.

export type VoiceCategory =
  | 'service_item'
  | 'announcement'
  | 'sermon_title'
  | 'sermon_scripture'
  | 'ministry_update'
  | 'weekly_prayer';

export interface VoiceClassification {
  category: VoiceCategory;
  label: string; // for service_item: the order-of-service label to use
  text: string; // cleaned text with the matched keyword/prefix stripped
  reason: string; // short Chinese explanation shown to the officer
}

interface ItemRule {
  label: string;
  keywords: string[];
}

// Ordered roughly by how distinctive the keyword is (more specific first)
// so e.g. "回應詩歌" matches before the generic "詩歌".
const ITEM_RULES: ItemRule[] = [
  { label: '宣召', keywords: ['宣召'] },
  { label: '回應詩歌', keywords: ['回應詩歌', '回應詩'] },
  { label: '讚美', keywords: ['讚美詩歌', '讚美', '詩班獻詩', '獻詩', '詩歌'] },
  { label: '牧禱', keywords: ['牧禱'] },
  { label: '祈禱', keywords: ['祈禱'] },
  { label: '奉獻祈禱', keywords: ['奉獻祈禱'] },
  { label: '奉獻', keywords: ['奉獻'] },
  { label: '主餐', keywords: ['主餐'] },
  { label: '襄禮', keywords: ['襄禮'] },
  { label: '祝禱', keywords: ['祝禱', '祝福', '差遣'] },
  { label: '殿樂', keywords: ['殿樂'] },
];

const SERMON_SCRIPTURE_KEYWORDS = ['經文', '讀經'];
const SERMON_TITLE_KEYWORDS = ['信息題目', '講題', '題目'];
const WEEKLY_PRAYER_KEYWORDS = ['代禱', '記念禱告', '祈禱記念'];
const MINISTRY_UPDATE_KEYWORDS = ['家事分享'];
const ANNOUNCEMENT_KEYWORDS = ['報告', '通告', '通知', '活動預告', '聚會預告', '歡迎', '查詢', '報名'];

function stripLeadingKeyword(text: string, keyword: string): string {
  const idx = text.indexOf(keyword);
  if (idx === -1) return text.trim();
  const rest = text.slice(idx + keyword.length).replace(/^[：:，,、\s]+/, '').trim();
  return rest || text.trim();
}

export function classifyVoiceInput(rawText: string): VoiceClassification {
  const text = rawText.trim();

  for (const kw of SERMON_SCRIPTURE_KEYWORDS) {
    if (text.includes(kw)) {
      return {
        category: 'sermon_scripture',
        label: '信息經文',
        text: stripLeadingKeyword(text, kw),
        reason: `偵測到「${kw}」關鍵字，建議更新信息經文`,
      };
    }
  }

  for (const kw of SERMON_TITLE_KEYWORDS) {
    if (text.includes(kw)) {
      return {
        category: 'sermon_title',
        label: '信息題目',
        text: stripLeadingKeyword(text, kw),
        reason: `偵測到「${kw}」關鍵字，建議更新信息題目`,
      };
    }
  }

  for (const kw of WEEKLY_PRAYER_KEYWORDS) {
    if (text.includes(kw)) {
      return {
        category: 'weekly_prayer',
        label: '本週代禱',
        text: stripLeadingKeyword(text, kw),
        reason: `偵測到「${kw}」關鍵字，建議加入本週代禱事項`,
      };
    }
  }
  if (text.startsWith('為') && text.includes('禱告')) {
    return {
      category: 'weekly_prayer',
      label: '本週代禱',
      text,
      reason: '句子以「為⋯禱告」開首，建議加入本週代禱事項',
    };
  }

  for (const kw of MINISTRY_UPDATE_KEYWORDS) {
    if (text.includes(kw)) {
      return {
        category: 'ministry_update',
        label: '家事分享',
        text: stripLeadingKeyword(text, kw),
        reason: `偵測到「${kw}」關鍵字，建議加入家事分享詳情頁`,
      };
    }
  }

  for (const rule of ITEM_RULES) {
    for (const kw of rule.keywords) {
      if (text.includes(kw)) {
        return {
          category: 'service_item',
          label: rule.label,
          text: stripLeadingKeyword(text, kw),
          reason: `偵測到「${kw}」關鍵字，建議加入程序項目「${rule.label}」`,
        };
      }
    }
  }

  for (const kw of ANNOUNCEMENT_KEYWORDS) {
    if (text.includes(kw)) {
      return {
        category: 'announcement',
        label: '家事分享／報告事項',
        text,
        reason: `偵測到「${kw}」關鍵字，建議加入家事分享／報告事項`,
      };
    }
  }

  return {
    category: 'announcement',
    label: '家事分享／報告事項',
    text,
    reason: '未偵測到明確類別關鍵字，預設歸類為家事分享／報告事項，請確認或修改',
  };
}
