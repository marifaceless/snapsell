import { ListingIntelligence } from '../types';

const TIMEOUT_MS = 30000;
const BASE_URL = 'https://gen.pollinations.ai';

type ChatRole = 'system' | 'user' | 'assistant';

type MessageContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail?: 'auto' | 'low' | 'high' } };

type ChatMessage =
  | { role: ChatRole; content: string }
  | { role: ChatRole; content: MessageContentPart[] };

async function fetchWithTimeout(url: string, options: RequestInit = {}) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

function authHeaders(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
  };
}

function coerceJsonFromText(text: string) {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('Empty response');

  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (jsonMatch) return JSON.parse(jsonMatch[0]);

  return JSON.parse(trimmed);
}

async function chatCompletionsJson<T>(params: {
  apiKey: string;
  model: 'openai-fast' | 'openai' | 'openai-large';
  messages: ChatMessage[];
  jsonSchemaName: string;
  jsonSchema: Record<string, unknown>;
}) {
  const response = await fetchWithTimeout(`${BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      ...authHeaders(params.apiKey),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: params.model,
      messages: params.messages,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: params.jsonSchemaName,
          schema: params.jsonSchema,
          strict: true,
        },
      },
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    let details = '';
    try {
      details = JSON.stringify(await response.json());
    } catch {
      details = await response.text().catch(() => '');
    }
    throw new Error(`Pollinations chat error (${response.status}): ${details || response.statusText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === 'string') return coerceJsonFromText(content) as T;

  throw new Error('Unexpected Pollinations chat response format');
}

const LISTING_INTELLIGENCE_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'product_summary',
    'likely_category',
    'key_attributes',
    'do_not_invent',
    'photo_style_prompt',
    'platform_listing',
    'platform_variants',
  ],
  properties: {
    product_summary: { type: 'string' },
    likely_category: { type: 'string' },
    key_attributes: { type: 'array', items: { type: 'string' } },
    do_not_invent: { type: 'array', items: { type: 'string' } },
    photo_style_prompt: { type: 'string' },
    platform_listing: {
      type: 'object',
      additionalProperties: false,
      required: ['title', 'short_description', 'bullets', 'tags', 'condition_checklist'],
      properties: {
        title: { type: 'string' },
        short_description: { type: 'string' },
        bullets: { type: 'array', items: { type: 'string' } },
        tags: { type: 'array', items: { type: 'string' } },
        condition_checklist: { type: 'array', items: { type: 'string' } },
      },
    },
    platform_variants: {
      type: 'object',
      additionalProperties: false,
      required: ['facebook_marketplace', 'ebay'],
      properties: {
        facebook_marketplace: {
          type: 'object',
          additionalProperties: false,
          required: ['title', 'short_description', 'bullets'],
          properties: {
            title: { type: 'string' },
            short_description: { type: 'string' },
            bullets: { type: 'array', items: { type: 'string' } },
          },
        },
        ebay: {
          type: 'object',
          additionalProperties: false,
          required: ['title', 'short_description', 'bullets'],
          properties: {
            title: { type: 'string' },
            short_description: { type: 'string' },
            bullets: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
  },
} as const;

const PHOTO_PROMPTS_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['prompts', 'negative_prompt'],
  properties: {
    negative_prompt: { type: 'string' },
    prompts: {
      type: 'object',
      additionalProperties: false,
      required: ['Front', '3/4 Angle', 'Side', 'Detail'],
      properties: {
        Front: { type: 'string' },
        '3/4 Angle': { type: 'string' },
        Side: { type: 'string' },
        Detail: { type: 'string' },
      },
    },
  },
} as const;

function buildVisionUserContent(text: string, referenceImageUrls: string[]) {
  const parts: MessageContentPart[] = [{ type: 'text', text }];
  for (const url of referenceImageUrls) {
    if (!url?.trim()) continue;
    parts.push({ type: 'image_url', image_url: { url: url.trim(), detail: 'high' } });
  }
  return parts;
}

export async function generateListingIntelligence(params: {
  apiKey: string;
  systemPrompt: string;
  userText: string;
  referenceImageUrls: string[];
}): Promise<ListingIntelligence> {
  return chatCompletionsJson<ListingIntelligence>({
    apiKey: params.apiKey,
    model: 'openai-fast',
    jsonSchemaName: 'listing_intelligence',
    jsonSchema: LISTING_INTELLIGENCE_JSON_SCHEMA as unknown as Record<string, unknown>,
    messages: [
      { role: 'system', content: params.systemPrompt },
      { role: 'user', content: buildVisionUserContent(params.userText, params.referenceImageUrls) },
    ],
  });
}

export async function generateAnglePrompts(params: {
  apiKey: string;
  systemPrompt: string;
  userText: string;
  referenceImageUrls: string[];
}): Promise<{ prompts: Record<string, string>; negative_prompt: string }> {
  return chatCompletionsJson<{ prompts: Record<string, string>; negative_prompt: string }>({
    apiKey: params.apiKey,
    model: 'openai-fast',
    jsonSchemaName: 'listing_angle_prompts',
    jsonSchema: PHOTO_PROMPTS_JSON_SCHEMA as unknown as Record<string, unknown>,
    messages: [
      { role: 'system', content: params.systemPrompt },
      { role: 'user', content: buildVisionUserContent(params.userText, params.referenceImageUrls) },
    ],
  });
}

function buildImageUrl(params: {
  prompt: string;
  model: string;
  width: number;
  height: number;
  seed: number;
  safe: boolean;
  referenceImageUrls: string[];
  negativePrompt?: string;
}) {
  const encodedPrompt = encodeURIComponent(params.prompt.trim());
  const qs = new URLSearchParams();
  qs.set('model', params.model);
  qs.set('width', String(params.width));
  qs.set('height', String(params.height));
  qs.set('seed', String(params.seed));
  qs.set('safe', String(params.safe));
  if (params.negativePrompt) qs.set('negative_prompt', params.negativePrompt);
  if (params.referenceImageUrls.length > 0) {
    qs.set('image', params.referenceImageUrls.join('|'));
  }
  return `${BASE_URL}/image/${encodedPrompt}?${qs.toString()}`;
}

async function fetchImageAsObjectUrl(apiKey: string, url: string) {
  const response = await fetchWithTimeout(url, {
    headers: {
      ...authHeaders(apiKey),
      Accept: 'image/*',
    },
  });

  if (!response.ok) {
    let details = '';
    try {
      details = JSON.stringify(await response.json());
    } catch {
      details = await response.text().catch(() => '');
    }
    throw new Error(`Pollinations image error (${response.status}): ${details || response.statusText}`);
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export async function generateImageWithFallback(params: {
  apiKey: string;
  prompt: string;
  width: number;
  height: number;
  seed: number;
  safe: boolean;
  referenceImageUrls: string[];
  negativePrompt?: string;
}): Promise<{ objectUrl: string; fallbackUsed: boolean; modelUsed: string; warning?: string }> {
  const seed = Number.isFinite(params.seed) ? Math.floor(params.seed) : 0;

  // 1) nanobanana-pro + reference images
  try {
    const url = buildImageUrl({
      prompt: params.prompt,
      model: 'nanobanana-pro',
      width: params.width,
      height: params.height,
      seed,
      safe: params.safe,
      referenceImageUrls: params.referenceImageUrls,
      negativePrompt: params.negativePrompt,
    });
    const objectUrl = await fetchImageAsObjectUrl(params.apiKey, url);
    return { objectUrl, fallbackUsed: false, modelUsed: 'nanobanana-pro' };
  } catch (e) {
    // continue
  }

  // 2) kontext + reference images
  try {
    const url = buildImageUrl({
      prompt: params.prompt,
      model: 'kontext',
      width: params.width,
      height: params.height,
      seed,
      safe: params.safe,
      referenceImageUrls: params.referenceImageUrls,
      negativePrompt: params.negativePrompt,
    });
    const objectUrl = await fetchImageAsObjectUrl(params.apiKey, url);
    return {
      objectUrl,
      fallbackUsed: true,
      modelUsed: 'kontext',
      warning: 'Fallback model used to keep generation working; results may vary slightly.',
    };
  } catch (e) {
    // continue
  }

  // 3) nanobanana-pro without reference images
  try {
    const url = buildImageUrl({
      prompt: params.prompt,
      model: 'nanobanana-pro',
      width: params.width,
      height: params.height,
      seed,
      safe: params.safe,
      referenceImageUrls: [],
      negativePrompt: params.negativePrompt,
    });
    const objectUrl = await fetchImageAsObjectUrl(params.apiKey, url);
    return {
      objectUrl,
      fallbackUsed: true,
      modelUsed: 'nanobanana-pro',
      warning: 'Reference photo couldn’t be used; results may not match your item perfectly.',
    };
  } catch (e) {
    // continue
  }

  throw new Error('Failed to generate image after multiple attempts.');
}

export async function validatePollinationsKey(apiKey: string) {
  const response = await fetchWithTimeout(`${BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      ...authHeaders(apiKey),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      // Intentionally invalid request body: we only want to validate auth (401/403)
      // without spending any tokens on an actual completion.
      model: 'openai-fast',
      messages: [],
    }),
  });

  if (response.ok) return;
  if (response.status === 400) return; // authenticated, but request validation failed (expected)
  if (response.status === 401 || response.status === 403) {
    throw new Error('Invalid Pollinations API key.');
  }
  throw new Error(`Pollinations connection error (${response.status}).`);
}
