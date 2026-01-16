
import { BackgroundStyle, StudioConfig } from './types';

export const COLORS = {
  background: '#FAFAF7',
  card: '#FFFFFF',
  text: '#141414',
  muted: '#5C5C5C',
  accent: '#1F3D2B', // Forest green
  border: '#E5E5E5',
};

export const LISTING_SYSTEM_PROMPT = `
You are SnapSell, a marketplace listing assistant.

Goals:
- Use the provided reference product photos + user context to generate an accurate, high-converting marketplace listing.
- Be conservative: do NOT invent specs, model numbers, materials, dimensions, authenticity claims, compatibility, or warranty details.
- If uncertain, add "confirm: ____" items to the condition checklist.

Return data that is helpful for sellers:
- Concise, scannable title and description
- 5 strong bullets
- 10 searchable tags
- A condition checklist the seller can verify quickly
`.trim();

export const buildListingUserText = (context: StudioConfig) => `
Listing request (use attached reference photos):

Item Name: ${context.itemName || 'unknown'}
Brand: ${context.brand || 'unknown'}
Condition: ${context.condition}
Category Hint: ${context.categoryHint || 'none'}
Platform: ${context.platform}

Output tone:
- Clear, honest, marketplace-friendly
`.trim();

export const BASE_STYLE = (stylePrompt: string) => 
  `${stylePrompt}. clean studio lighting, realistic product photography, sharp focus, accurate colors, no extra objects, no text overlay, no watermark, no logo stamp, perfectly centered square composition.`;

export const ANGLE_PROMPTS_SYSTEM_PROMPT = `
You are SnapSell's photo prompt writer.

Task:
- Use the attached reference photos to write 4 prompts (Front, 3/4 Angle, Side, Detail) for studio-quality product images.
- Keep the generated item consistent with the reference: same shape, color, material, markings, and overall identity.
- Do not add extra objects, logos, text overlays, watermarks, hands, props, or background clutter.
- Prompts should be precise, realistic product photography, 1:1 square composition.

Return:
- prompts: object with keys: "Front", "3/4 Angle", "Side", "Detail"
- negative_prompt: a single string
`.trim();

export const buildAnglePromptsUserText = (params: {
  context: StudioConfig;
  listingPhotoStylePrompt?: string;
}) => `
Photo prompt request (use attached reference photos):

Item Name: ${params.context.itemName || 'product'}
Background Style: ${params.context.backgroundStyle}
Safe Mode: ${params.context.safeMode ? 'on' : 'off'}

Preferred style cue (from listing intelligence):
${params.listingPhotoStylePrompt || 'clean studio setup'}
`.trim();
