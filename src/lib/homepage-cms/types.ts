export type HomePageSchemaVersion = 'home_v1';

export interface HomeSection {
  sectionKey: string;
  type: string;
  order: number;
  enabled: boolean;
  /** Admin-friendly name (optional; falls back to sectionKey in UI). */
  label?: string;
  data: Record<string, unknown>;
}

export interface HomePageDocument {
  schemaVersion: HomePageSchemaVersion;
  page: {
    slug: string;
    title: string;
    sections: HomeSection[];
  };
}

export interface HomePageVersionSnapshot {
  id: string;
  versionNumber: number;
  createdAt: string;
  snapshot: HomePageDocument;
  changeNote?: string;
}

export interface HomePageStoredState {
  draft: HomePageDocument;
  published: HomePageDocument | null;
  publishedVersion: number;
  publishedAt: string | null;
  versions: HomePageVersionSnapshot[];
}
