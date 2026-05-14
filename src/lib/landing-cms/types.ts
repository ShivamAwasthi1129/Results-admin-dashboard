// Types for the Landing Content CMS API integration

export interface SectionMeta {
  id: string;
  page: string;
  section: string;
  sortOrder: number;
  updatedAt: string;
}

export interface SectionDetail {
  id: string;
  page: string;
  section: string;
  content: Record<string, unknown>;
  sortOrder: number;
  updatedAt: string;
}

export interface SectionsListResponse {
  success: boolean;
  data: {
    pages: Record<string, SectionMeta[]>;
    total: number;
  };
}

export interface SectionDetailResponse {
  success: boolean;
  data: SectionDetail;
}

export interface SaveSectionResponse {
  success: boolean;
  data: SectionDetail;
  message: string;
}

export interface SeedResponse {
  success: boolean;
  message: string;
  data: unknown;
}

export interface UploadResponse {
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

// Human-readable labels for section keys
export const SECTION_LABELS: Record<string, string> = {
  hero: '🎬 Hero Section',
  delayedEmergencyResponse: '⚡ Emergency Response Stats',
  buildingSection: '🏗️ What We Are Building',
  lifelineSection: '🛟 Lifeline Features',
  comingSoonSection: '⌚ Coming Soon (Wearable)',
  inActionVideos: '🎥 In Action Videos',
  testimonialsSection: '💬 Testimonials',
  liveImpactUpdates: '📡 Live Impact Updates',
  instagramReels: '📱 Instagram Reels',
  guidesResourcesSection: '📚 Guides & Resources',
  communitySection: '👥 Community Section',
  footer: '🔻 Footer',
  forms: '📝 Forms',
  contactSection: '📞 Contact Section',
  quoteSection: '💭 Quote Section',
  visionMissionSection: '🎯 Vision & Mission',
  teamLeadershipSection: '👔 Team Leadership',
  teamAdditionalSection: '👥 Additional Team',
};

export const SECTION_COLORS: Record<string, string> = {
  hero: '#991B1B',
  delayedEmergencyResponse: '#B45309',
  buildingSection: '#1D4ED8',
  lifelineSection: '#059669',
  comingSoonSection: '#7C3AED',
  inActionVideos: '#DC2626',
  testimonialsSection: '#0891B2',
  liveImpactUpdates: '#EA580C',
  instagramReels: '#C026D3',
  guidesResourcesSection: '#2563EB',
  communitySection: '#16A34A',
};
