# SnapSell

SnapSell turns a few product photos into:
- A marketplace-ready listing pack (title, description, bullets, tags, condition checklist)
- A set of clean “studio” product images (Front / 3/4 Angle / Side / Detail)
- Use Here: https://snapsell-taupe.vercel.app/

## How it works (Pollinations-only)

SnapSell uses the Pollinations API gateway (`gen.pollinations.ai`):
- **Listing intelligence (vision):** `openai-fast` with your reference images + item context
- **Photo prompts (vision):** `openai-fast` generates one prompt per angle
- **Final images:** `nanobanana-pro` using your reference image(s)

No Gemini API keys are used in this repo.

## Reference images

SnapSell needs publicly accessible image URLs to send to Pollinations (for vision + image-to-image).
- You can paste a direct image URL (recommended).
- Or upload images; SnapSell uploads to **Imgur** using an anonymous Client-ID.

Privacy note: Imgur uploads are public/unlisted URLs. Don’t upload sensitive photos.

## Pollinations API key

Get a key at `https://enter.pollinations.ai`.
- **`pk_` keys:** meant for client-side apps (rate-limited / beta)
- **`sk_` keys:** server-side only (don’t expose publicly)

This app stores your key locally in the browser (`localStorage`) and sends requests directly from your device.

## Run locally

Prereqs: Node.js

1. Install deps: `npm install`
2. Start dev server: `npm run dev`
3. Open: `http://localhost:3000`

## Troubleshooting

- “Invalid Pollinations API key”: double-check your key in the onboarding screen.
- Image generation fails: try adding a more “direct” reference image URL (ends in `.jpg/.png/.webp`) or upload again.
- If Imgur upload is rate-limited: upload to another host (e.g. postimages.org) and paste the direct link.
