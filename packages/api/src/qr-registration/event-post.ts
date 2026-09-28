// packages/api/src/qr-registration/event-post.ts
//
// The Gemini prompt for Event Planning's post design: a shareable social-media
// image for a church event. Only the event details the user typed are sent.
import type { EventPostInput, EventPostStyle } from '@clawix/shared';

const STYLE_HINTS: Record<EventPostStyle, string> = {
  warm: 'warm, welcoming and hopeful — soft golden light, friendly community feel',
  modern: 'clean modern graphic design — flat shapes, confident sans-serif type, generous spacing',
  watercolor: 'gentle hand-painted watercolor illustration with soft edges and paper texture',
  bold: 'bold and energetic — strong contrast, large headline type, vivid colours for youth',
  minimal: 'minimal and calm — lots of white space, one simple symbol, understated elegant type',
};

const ASPECT_NAMES: Record<EventPostInput['aspectRatio'], string> = {
  '1:1': 'square social-media post',
  '3:4': 'portrait post / printed poster',
  '9:16': 'vertical phone story',
  '16:9': 'wide banner or projector slide',
};

export function buildEventPostPrompt(input: EventPostInput): string {
  const zh = input.language === 'zh-TW';
  const facts = [
    `Event: ${input.eventName}`,
    input.date && `Date: ${input.date}`,
    input.time && `Time: ${input.time}`,
    input.location && `Place: ${input.location}`,
    input.description && `About: ${input.description}`,
  ]
    .filter(Boolean)
    .join('\n');

  return `Design a ${ASPECT_NAMES[input.aspectRatio]} promoting a Christian church event.

${facts}

Style: ${STYLE_HINTS[input.style]}.
Write all text on the image in ${zh ? 'Traditional Chinese (Hong Kong usage)' : 'English'}. Show the event name as the headline and the date, time and place clearly; spell every word exactly as given above and add no other facts.
Keep it respectful and suitable for all ages. Do not depict real, identifiable people or copy any logo.${
    input.registrationUrl
      ? ' Leave a clear plain area in a lower corner (about one fifth of the width) where a registration QR code will be placed later.'
      : ''
  }${input.instructions ? `\nAlso: ${input.instructions}` : ''}

After the image, write one short, friendly caption (2–3 sentences, ${zh ? 'in Traditional Chinese' : 'in English'}) for sharing the post.`;
}
