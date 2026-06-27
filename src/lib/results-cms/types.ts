// Types for the Results.org Home Page CMS API integration

export type ResultsSectionKey =
  | 'hero'
  | 'approach'
  | 'impact'
  | 'operations'
  | 'testimonials'
  | 'donate'
  | 'stories'
  | 'news'
  | 'volunteer';

export const RESULTS_SECTION_KEYS: ResultsSectionKey[] = [
  'hero',
  'approach',
  'impact',
  'operations',
  'testimonials',
  'donate',
  'stories',
  'news',
  'volunteer',
];

export const RESULTS_SECTION_LABELS: Record<ResultsSectionKey, string> = {
  hero: '🎬 Hero Section',
  approach: '🔄 Our Approach',
  impact: '📊 Impact Stats',
  operations: '⚙️ Operations',
  testimonials: '💬 Testimonials',
  donate: '💝 Donate Section',
  stories: '📖 Stories & Updates',
  news: '📰 News & Media',
  volunteer: '🤝 Volunteer & Partner',
};

export const RESULTS_SECTION_COLORS: Record<ResultsSectionKey, string> = {
  hero: '#991B1B',
  approach: '#1D4ED8',
  impact: '#059669',
  operations: '#B45309',
  testimonials: '#0891B2',
  donate: '#DC2626',
  stories: '#7C3AED',
  news: '#C026D3',
  volunteer: '#EA580C',
};

export const RESULTS_SECTION_DESCRIPTIONS: Record<ResultsSectionKey, string> = {
  hero: 'Hero banner with headline, stats, CTA buttons, and background image',
  approach: 'Full-cycle methodology phases (Prepare, Respond, Recover)',
  impact: 'Animated counters and impact statistics',
  operations: 'Operational pillars and positioning statement',
  testimonials: 'Testimonial cards from survivors, volunteers, and partners',
  donate: 'Donation tiers and trust/legal block',
  stories: 'Story cards from the field',
  news: 'News feed with lead story, side stories, and wire items',
  volunteer: 'Volunteer and partner cards with roles and CTAs',
};

// ─── API Response Types ───────────────────────────────────────────────────────

export interface ResultsMetaResponse {
  success: boolean;
  data: {
    exists: boolean;
    id: string;
    sections: ResultsSectionKey[];
    version: number;
    updatedBy: string;
    createdAt: string;
    updatedAt: string;
  };
}

export interface ResultsSectionDetailResponse {
  success: boolean;
  data: {
    section: ResultsSectionKey;
    content: Record<string, unknown>;
    version: number;
    updatedBy?: string;
    updatedAt: string;
  };
}

export interface ResultsSaveResponse {
  success: boolean;
  data: {
    section: ResultsSectionKey;
    content: Record<string, unknown>;
    version: number;
    updatedAt: string;
  };
  message: string;
}

export interface ResultsSeedResponse {
  success: boolean;
  data: {
    id: string;
    version: number;
    sections: ResultsSectionKey[];
    updatedAt: string;
  };
  message: string;
}

export interface ResultsUploadResponse {
  success: boolean;
  data: {
    url: string;
    publicId: string;
    mediaType: string;
    width: number;
    height: number;
    format: string;
    bytes: number;
    key?: string;
  };
  message: string;
}

export interface ResultsFullContentResponse {
  success: boolean;
  data: {
    id: string;
    content: Record<ResultsSectionKey, Record<string, unknown>>;
    version: number;
    updatedBy: string;
    createdAt: string;
    updatedAt: string;
  };
}
