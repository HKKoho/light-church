import type { VenueApplicationInfo } from '@clawix/shared';
import { choiceLabel } from '@/components/venue-rental/choice-labels';
import type { Lang } from '@/lib/i18n';

// Starting drafts for emailing an applicant, picked by the application's
// status. Staff edit them freely before sending.

export interface ReplyDraft {
  readonly subject: string;
  readonly body: string;
}

function details(app: VenueApplicationInfo, lang: Lang): string {
  const label = (v: string) => choiceLabel(v, lang);
  const venue = `${label(app.venueType)}${app.roomCount ? ` × ${app.roomCount}` : ''}`;
  const dates = app.sessions.map((s) => `  • ${s.date} ${s.start}–${s.end}`).join('\n');
  return lang === 'zh-TW'
    ? `機構：${app.organization}\n場地：${venue}\n日期及時間：\n${dates}`
    : `Organisation: ${app.organization}\nVenue: ${venue}\nDates and times:\n${dates}`;
}

export function replyDraft(app: VenueApplicationInfo, lang: Lang, church: string): ReplyDraft {
  const info = details(app, lang);
  if (lang === 'zh-TW') {
    const greet = `${app.contactPerson}${app.contactTitle}：\n\n`;
    const sign = `\n\n如有任何查詢，請直接回覆此電郵。\n\n${church}\n敬上`;
    switch (app.status) {
      case 'approved':
        return {
          subject: `場地申請已獲批准 — ${app.organization}`,
          body:
            `${greet}感謝貴機構申請借用本教會場地。我們欣然通知，以下申請已獲批准：\n\n${info}\n\n請於活動前與我們確認佈置、物資及進場安排。` +
            sign,
        };
      case 'rejected':
        return {
          subject: `場地申請結果 — ${app.organization}`,
          body:
            `${greet}感謝貴機構申請借用本教會場地。經考慮後，很抱歉未能批准以下申請：\n\n${info}\n\n歡迎日後再次申請其他日期。` +
            sign,
        };
      default:
        return {
          subject: `已收到場地申請 — ${app.organization}`,
          body:
            `${greet}感謝貴機構申請借用本教會場地。我們已收到以下申請，正在處理中：\n\n${info}\n\n如需補充資料，我們會再與你聯絡。` +
            sign,
        };
    }
  }
  const greet = `Dear ${app.contactPerson},\n\n`;
  const sign = `\n\nIf you have any questions, just reply to this email.\n\nWith blessings,\n${church}`;
  switch (app.status) {
    case 'approved':
      return {
        subject: `Venue application approved — ${app.organization}`,
        body:
          `${greet}Thank you for applying to use our church premises. We are glad to confirm that your application has been approved:\n\n${info}\n\nPlease confirm set-up, equipment and access arrangements with us before the event.` +
          sign,
      };
    case 'rejected':
      return {
        subject: `Your venue application — ${app.organization}`,
        body:
          `${greet}Thank you for applying to use our church premises. After consideration, we are sorry that we are unable to approve this application:\n\n${info}\n\nYou are welcome to apply again for other dates.` +
          sign,
      };
    default:
      return {
        subject: `Venue application received — ${app.organization}`,
        body:
          `${greet}Thank you for applying to use our church premises. We have received your application and are reviewing it:\n\n${info}\n\nWe will contact you if we need any further details.` +
          sign,
      };
  }
}
