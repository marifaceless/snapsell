
import { ListingIntelligence } from '../types';

const TIMEOUT_MS = 30000;

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

export const generateText = async (prompt: string, apiKey: string): Promise<ListingIntelligence | null> => {
  const encoded = encodeURIComponent(prompt.trim());
  const url = `https://gen.pollinations.ai/text/${encoded}?key=${apiKey}`;
  
  try {
    const response = await fetchWithTimeout(url);
    if (!response.ok) throw new Error('Text generation failed');
    const text = await response.text();
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(text);
  } catch (error) {
    console.error('Error generating listing intelligence:', error);
    return null;
  }
};

interface ImageParams {
  prompt: string;
  apiKey: string;
  width: number;
  height: number;
  seed: number;
  imageUrl?: string;
  model: string;
  safe: boolean;
}

const buildImageUrl = (params: ImageParams) => {
  const encoded = encodeURIComponent(params.prompt);
  let url = `https://gen.pollinations.ai/image/${encoded}?key=${params.apiKey}&model=${params.model}&width=${params.width}&height=${params.height}&seed=${params.seed}&safe=${params.safe}`;
  if (params.imageUrl) {
    url += `&image=${encodeURIComponent(params.imageUrl)}`;
  }
  return url;
};

export const generateImageWithFallback = async (
  prompt: string,
  apiKey: string,
  width: number,
  height: number,
  seed: number,
  imageUrl: string,
  safe: boolean = true
): Promise<{ url: string; fallbackUsed: boolean; error?: string }> => {
  // Step 1: Try nanobanana-pro with reference
  try {
    const primaryUrl = buildImageUrl({ prompt, apiKey, width, height, seed, imageUrl, model: 'nanobanana-pro', safe });
    const response = await fetchWithTimeout(primaryUrl);
    if (response.ok) return { url: primaryUrl, fallbackUsed: false };
  } catch (e) {
    console.warn('nanobanana-pro failed, trying kontext fallback...');
  }

  // Step 2: Try kontext with reference
  try {
    const fallbackUrl = buildImageUrl({ prompt, apiKey, width, height, seed, imageUrl, model: 'kontext', safe });
    const response = await fetchWithTimeout(fallbackUrl);
    if (response.ok) return { url: fallbackUrl, fallbackUsed: true };
  } catch (e) {
    console.warn('kontext failed, trying text-to-image fallback...');
  }

  // Step 3: Try nanobanana-pro WITHOUT reference
  try {
    const textOnlyUrl = buildImageUrl({ prompt, apiKey, width, height, seed, model: 'nanobanana-pro', safe });
    const response = await fetchWithTimeout(textOnlyUrl);
    if (response.ok) return { url: textOnlyUrl, fallbackUsed: true, error: 'Reference photo couldn’t be used; results may not match your item perfectly.' };
  } catch (e) {
    console.error('All image fallbacks failed');
  }

  return { url: '', fallbackUsed: true, error: 'Failed to generate image after multiple attempts.' };
};
