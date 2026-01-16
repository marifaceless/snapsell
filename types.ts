
export interface ListingIntelligence {
  product_summary: string;
  likely_category: string;
  key_attributes: string[];
  do_not_invent: string[];
  photo_style_prompt: string;
  platform_listing: {
    title: string;
    short_description: string;
    bullets: string[];
    tags: string[];
    condition_checklist: string[];
  };
  platform_variants: {
    facebook_marketplace: PlatformVariant;
    ebay: PlatformVariant;
  };
}

export interface PlatformVariant {
  title: string;
  short_description: string;
  bullets: string[];
}

export enum Condition {
  New = 'New',
  LikeNew = 'Like New',
  Good = 'Good',
  Fair = 'Fair',
  ForParts = 'For parts'
}

export enum Platform {
  FB = 'Facebook Marketplace',
  eBay = 'eBay',
  Etsy = 'Etsy',
  Kijiji = 'Kijiji',
  Shopify = 'Shopify'
}

export enum BackgroundStyle {
  PureWhite = 'Pure white',
  SoftGradient = 'Soft gradient',
  RealTabletop = 'Real tabletop',
  LifestyleMinimal = 'Lifestyle minimal'
}

export interface StudioConfig {
  itemName: string;
  brand: string;
  condition: Condition;
  categoryHint: string;
  platform: Platform;
  backgroundStyle: BackgroundStyle;
  imageSize: 768 | 1024;
  seed: number;
  referenceImageUrls: string[];
  safeMode: boolean;
}

export interface ImageResult {
  id: string;
  label: string;
  url: string | null;
  status: 'idle' | 'loading' | 'success' | 'error';
  fallbackUsed: boolean;
  error?: string;
  prompt?: string;
  modelUsed?: string;
}
