
import { BackgroundStyle } from './types';

export const COLORS = {
  background: '#FAFAF7',
  card: '#FFFFFF',
  text: '#141414',
  muted: '#5C5C5C',
  accent: '#1F3D2B', // Forest green
  border: '#E5E5E5',
};

export const LISTING_PROMPT_TEMPLATE = (context: any) => `
Return ONLY valid JSON matching this schema and NOTHING else.
Do NOT invent brand/model/material/dimensions/compatibility/authenticity/warranty if unknown.
If uncertain, add "confirm: ____" to condition_checklist.

{
  "product_summary": "string",
  "likely_category": "string",
  "key_attributes": ["string", ...],
  "do_not_invent": ["string", ...],
  "photo_style_prompt": "string",
  "platform_listing": {
    "title": "string",
    "short_description": "string",
    "bullets": ["string","string","string","string","string"],
    "tags": ["string","string","string","string","string","string","string","string","string","string"],
    "condition_checklist": ["string","string","string","string","string","string"]
  },
  "platform_variants": {
    "facebook_marketplace": {
      "title": "string",
      "short_description": "string",
      "bullets": ["string","string","string","string","string"]
    },
    "ebay": {
      "title": "string",
      "short_description": "string",
      "bullets": ["string","string","string","string","string"]
    }
  }
}

Context:
Item Name: ${context.itemName || 'unknown'}
Brand: ${context.brand || 'unknown'}
Condition: ${context.condition}
Category Hint: ${context.categoryHint || 'none'}
Platform: ${context.platform}
Reference Image URL: ${context.imageUrl}
`;

export const BASE_STYLE = (stylePrompt: string) => 
  `${stylePrompt}. clean studio lighting, realistic product photography, sharp focus, accurate colors, no extra objects, no text overlay, no watermark, no logo stamp, perfectly centered square composition.`;

export const ANGLE_PROMPTS = {
  Front: (item: string, style: string, bg: string) => 
    `Product photo of ${item} — straight-on front view. ${style}. background: ${bg}. maintain 1:1 square aspect ratio. keep the exact same item shape/color/material as the reference image. remove clutter.`,
  '3/4 Angle': (item: string, style: string, bg: string) => 
    `Product photo of ${item} — 3/4 front-left angle, slightly elevated camera, shows depth. ${style}. background: ${bg}. maintain 1:1 square aspect ratio. keep the exact same item as the reference.`,
  Side: (item: string, style: string, bg: string) => 
    `Product photo of ${item} — pure side profile view, neutral angle. ${style}. background: ${bg}. maintain 1:1 square aspect ratio. keep the exact same item as the reference.`,
  Detail: (item: string, style: string, bg: string) => 
    `Close-up detail product photo of ${item} — focus on texture and a key detail, shallow depth of field but realistic. ${style}. background: ${bg}. maintain 1:1 square aspect ratio. keep the exact same item as the reference.`
};
