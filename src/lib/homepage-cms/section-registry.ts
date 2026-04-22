import type { HomeSection } from './types';

export interface SectionTypeInfo {
  type: string;
  displayName: string;
  description: string;
}

const deepClone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** Default `data` for a new section instance by type (minimal safe shapes). */
export function getDefaultDataForType(type: string, template?: HomeSection): Record<string, unknown> {
  if (template?.data && typeof template.data === 'object') {
    return deepClone(template.data);
  }
  switch (type) {
    case 'hero':
      return {
        backgroundVideo: { url: '', posterUrl: '' },
        overlayEnabled: true,
        headingLines: ['Line 1', 'Line 2', 'Line 3'],
        description: '',
        newsletterCard: { enabled: false, title: '' },
        tickerEnabled: false,
      };
    case 'impact_stats':
      return {
        titlePrefix: '',
        titleHighlight: '',
        subtitle: '',
        backgroundImage: '',
        cards: [
          {
            metric: '',
            metricLabel: '',
            title: '',
            description: '',
          },
        ],
        bottomTagline: '',
      };
    case 'feature_overview':
      return {
        titlePrefix: '',
        titleHighlight: '',
        subtitle: '',
        carouselEnabled: true,
        sideImageDesktop: '',
        sideImageMobile: '',
      };
    case 'lifeline_features_grid':
      return {
        titlePrefix: '',
        titleHighlight: '',
        titleSuffix: '',
        subtitle: '',
        items: [],
        emailPrompt: '',
        emailFormEnabled: false,
      };
    case 'coming_soon_wearable':
      return {
        revealText: '',
        productImage: '',
        titleLines: ['', '', ''],
        subtitle: '',
        emailFormEnabled: false,
      };
    case 'action_video_mobile':
    case 'action_video_desktop':
      return { videoUrl: '', controls: true };
    case 'testimonials':
    case 'guides':
    case 'footer':
      return { mode: 'component_managed', componentKey: '' };
    case 'live_impact_updates':
      return {
        titlePrefix: '',
        titleHighlight: '',
        subtitle: '',
        items: [],
      };
    case 'community_cta':
      return {
        badgeText: '',
        title: '',
        description: '',
        bulletPoints: [],
        formTitle: '',
        formDescription: '',
      };
    default:
      return {};
  }
}

export const SECTION_TYPES: SectionTypeInfo[] = [
  { type: 'hero', displayName: 'Hero', description: 'Top hero with video, headings, newsletter card' },
  { type: 'impact_stats', displayName: 'Impact stats', description: 'Metric cards over background image' },
  { type: 'feature_overview', displayName: 'Feature overview', description: 'Carousel + side images' },
  { type: 'lifeline_features_grid', displayName: 'Lifeline grid', description: 'Feature grid with icons' },
  { type: 'coming_soon_wearable', displayName: 'Coming soon wearable', description: 'Wearable teaser block' },
  { type: 'action_video_mobile', displayName: 'Action video (mobile)', description: 'Full-width mobile video' },
  { type: 'action_video_desktop', displayName: 'Action video (desktop)', description: 'Full-width desktop video' },
  { type: 'testimonials', displayName: 'Testimonials', description: 'Component-managed testimonials' },
  { type: 'live_impact_updates', displayName: 'Live impact updates', description: 'Impact story cards' },
  { type: 'guides', displayName: 'Guides', description: 'Component-managed guides' },
  { type: 'community_cta', displayName: 'Community CTA', description: 'Community signup block' },
  { type: 'footer', displayName: 'Footer', description: 'Component-managed footer' },
];

export function isRegisteredSectionType(type: string): boolean {
  return SECTION_TYPES.some((s) => s.type === type);
}

/** Optional: seed new section data from an existing section of the same type in `template`. */
export function buildNewSection(
  type: string,
  order: number,
  templateFromDoc?: HomeSection
): HomeSection {
  const template =
    templateFromDoc?.type === type ? templateFromDoc : undefined;
  const sectionKey = `new_${type}_${Date.now().toString(36)}`;
  return {
    sectionKey,
    type,
    order,
    enabled: true,
    label: sectionKey,
    data: getDefaultDataForType(type, template),
  };
}

export function sectionTypesForApi() {
  return SECTION_TYPES.map((s) => ({
    ...s,
    defaultData: getDefaultDataForType(s.type),
  }));
}
