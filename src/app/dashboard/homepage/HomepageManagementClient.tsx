'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownIcon,
  ArrowPathIcon,
  ArrowUpIcon,
  DocumentDuplicateIcon,
  EyeIcon,
  NewspaperIcon,
  PlusIcon,
  RocketLaunchIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { Badge, Button, Card, Input, Modal } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { buildNewSection } from '@/lib/homepage-cms/section-registry';
import type { HomePageDocument, HomeSection } from '@/lib/homepage-cms/types';
import { toast } from 'react-toastify';

interface CmsHomeResponse {
  success: boolean;
  data?: {
    draft: HomePageDocument;
    published: HomePageDocument | null;
    publishedVersion: number;
    publishedAt: string | null;
    hasUnpublishedChanges: boolean;
  };
  error?: string;
  details?: string[];
}

interface SectionTypeRow {
  type: string;
  displayName: string;
  description: string;
}

interface NewsMediaArticle {
  [key: string]: unknown;
  article_id?: string;
  title?: string;
  description?: string | null;
  link?: string;
  image_url?: string | null;
  pubDate?: string;
  source_name?: string;
  source_url?: string;
  category?: string[];
  country?: string[];
  q?: string;
}

const NEWS_QUERY_OPTIONS = [
  'wildfires',
  'earthquake',
  'hurricane',
  'tornado',
  'landslide',
  'tsunami',
  'heatwave',
] as const;
const NEWS_CACHE_KEY = 'homepage_news_media_cache_v1';
const NEWS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

type NewsCacheRecord = {
  fetchedAt: number;
  articles: NewsMediaArticle[];
};

type NewsCacheMap = Record<string, NewsCacheRecord>;

function readNewsCache(): NewsCacheMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(NEWS_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as NewsCacheMap;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed;
  } catch {
    return {};
  }
}

function writeNewsCache(next: NewsCacheMap): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(NEWS_CACHE_KEY, JSON.stringify(next));
  } catch {
    // ignore quota/storage errors
  }
}

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

function sortSections(sections: HomeSection[]): HomeSection[] {
  return [...sections].sort((a, b) => a.order - b.order);
}

function renumberOrders(sections: HomeSection[]): HomeSection[] {
  const sorted = sortSections(sections);
  return sorted.map((s, i) => ({ ...s, order: i + 1 }));
}

export default function HomepageManagementClient() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [draft, setDraft] = useState<HomePageDocument | null>(null);
  const [publishedVersion, setPublishedVersion] = useState(0);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(true);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [changeNote, setChangeNote] = useState('');
  const [sectionTypes, setSectionTypes] = useState<SectionTypeRow[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [allPreviewOpen, setAllPreviewOpen] = useState(false);
  const [versions, setVersions] = useState<
    { id: string; versionNumber: number; createdAt: string; changeNote: string | null; sectionCount: number }[]
  >([]);
  const [newsOpen, setNewsOpen] = useState(false);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [newsArticles, setNewsArticles] = useState<NewsMediaArticle[]>([]);
  const [selectedNewsQuery, setSelectedNewsQuery] = useState<string>('wildfires');
  const selectedKeyRef = useRef<string | null>(null);
  selectedKeyRef.current = selectedKey;

  const authHeaders = useMemo(() => {
    const h: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [token]);

  const loadAll = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [homeRes, typesRes, verRes] = await Promise.all([
        fetch('/api/cms/homepage', { headers: authHeaders, cache: 'no-store' }),
        fetch('/api/cms/section-types', { headers: authHeaders, cache: 'no-store' }),
        fetch('/api/cms/homepage/versions', { headers: authHeaders, cache: 'no-store' }),
      ]);
      const homeJson = (await homeRes.json()) as CmsHomeResponse;
      if (!homeRes.ok || !homeJson.success || !homeJson.data) {
        toast.error(homeJson.error || 'Failed to load homepage CMS');
        return;
      }
      const d = homeJson.data.draft;
      setPublishedVersion(homeJson.data.publishedVersion);
      setPublishedAt(homeJson.data.publishedAt);
      setHasUnpublishedChanges(homeJson.data.hasUnpublishedChanges);

      const typesJson = (await typesRes.json()) as { success?: boolean; data?: { sectionTypes: SectionTypeRow[] } };
      if (typesRes.ok && typesJson.data?.sectionTypes) {
        setSectionTypes(typesJson.data.sectionTypes);
      }

      const verJson = (await verRes.json()) as {
        success?: boolean;
        data?: { versions: typeof versions };
      };
      if (verRes.ok && verJson.data?.versions) {
        setVersions(verJson.data.versions);
      }

      const prev = selectedKeyRef.current;
      const nextKey =
        prev && d.page.sections.some((s) => s.sectionKey === prev)
          ? prev
          : (d.page.sections[0]?.sectionKey ?? null);
      setDraft(d);
      setSelectedKey(nextKey);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load homepage CMS');
    } finally {
      setLoading(false);
    }
  }, [token, authHeaders]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const selectSection = (key: string) => {
    if (!draft) return;
    setSelectedKey(key);
  };

  const selected = useMemo(() => {
    if (!draft || !selectedKey) return null;
    return draft.page.sections.find((s) => s.sectionKey === selectedKey) ?? null;
  }, [draft, selectedKey]);

  const updateDraftSections = (sections: HomeSection[]) => {
    if (!draft) return;
    setDraft({
      ...draft,
      page: { ...draft.page, sections: renumberOrders(sections) },
    });
    setHasUnpublishedChanges(true);
  };

  const updateSectionMeta = (key: string, patch: Partial<HomeSection>) => {
    if (!draft) return;
    const next = draft.page.sections.map((x) => (x.sectionKey === key ? { ...x, ...patch } : x));
    updateDraftSections(next);
  };

  const updateSectionData = (key: string, data: Record<string, unknown>) => {
    updateSectionMeta(key, { data });
  };

  const getAtPath = (value: JsonValue, path: (string | number)[]): JsonValue => {
    let cur: JsonValue = value;
    for (const part of path) {
      if (Array.isArray(cur) && typeof part === 'number') {
        cur = cur[part] as JsonValue;
      } else if (cur && typeof cur === 'object' && !Array.isArray(cur) && typeof part === 'string') {
        cur = (cur as Record<string, JsonValue>)[part];
      } else {
        return null;
      }
    }
    return cur;
  };

  const setAtPath = (value: JsonValue, path: (string | number)[], nextValue: JsonValue): JsonValue => {
    if (path.length === 0) return nextValue;
    const [head, ...rest] = path;
    if (Array.isArray(value) && typeof head === 'number') {
      const arr = [...value];
      arr[head] = setAtPath(arr[head] as JsonValue, rest, nextValue);
      return arr;
    }
    if (value && typeof value === 'object' && !Array.isArray(value) && typeof head === 'string') {
      const obj = { ...(value as Record<string, JsonValue>) };
      obj[head] = setAtPath(obj[head] as JsonValue, rest, nextValue);
      return obj;
    }
    return value;
  };

  const removeAtPath = (value: JsonValue, path: (string | number)[]): JsonValue => {
    if (path.length === 0) return value;
    const [head, ...rest] = path;
    if (rest.length === 0) {
      if (Array.isArray(value) && typeof head === 'number') {
        const arr = [...value];
        arr.splice(head, 1);
        return arr;
      }
      if (value && typeof value === 'object' && !Array.isArray(value) && typeof head === 'string') {
        const obj = { ...(value as Record<string, JsonValue>) };
        delete obj[head];
        return obj;
      }
      return value;
    }
    if (Array.isArray(value) && typeof head === 'number') {
      const arr = [...value];
      arr[head] = removeAtPath(arr[head] as JsonValue, rest);
      return arr;
    }
    if (value && typeof value === 'object' && !Array.isArray(value) && typeof head === 'string') {
      const obj = { ...(value as Record<string, JsonValue>) };
      obj[head] = removeAtPath(obj[head] as JsonValue, rest);
      return obj;
    }
    return value;
  };

  const appendAtPath = (value: JsonValue, path: (string | number)[], item: JsonValue): JsonValue => {
    const target = getAtPath(value, path);
    if (!Array.isArray(target)) return value;
    const updated = [...target, item];
    return setAtPath(value, path, updated);
  };

  const saveDraft = async () => {
    if (!draft || !token) return;
    setSaving(true);
    try {
      const res = await fetch('/api/cms/homepage', {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify(draft),
      });
      const json = (await res.json()) as CmsHomeResponse;
      if (!res.ok || !json.success || !json.data) {
        toast.error(json.error || 'Save failed');
        if (json.details?.length) json.details.forEach((d) => toast.error(d));
        return;
      }
      setDraft(json.data.draft);
      setHasUnpublishedChanges(json.data.hasUnpublishedChanges);
      toast.success('Draft saved');
    } catch (e) {
      console.error(e);
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    if (!token) return;
    setPublishing(true);
    try {
      const res = await fetch('/api/cms/homepage/publish', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ changeNote: changeNote.trim() || undefined }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        details?: string[];
        data?: { publishedVersion: number; publishedAt: string | null; hasUnpublishedChanges: boolean };
      };
      if (!res.ok || !json.success) {
        toast.error(json.error || 'Publish failed');
        json.details?.forEach((d) => toast.error(d));
        return;
      }
      if (json.data) {
        setPublishedVersion(json.data.publishedVersion);
        setPublishedAt(json.data.publishedAt);
        setHasUnpublishedChanges(json.data.hasUnpublishedChanges);
      }
      setChangeNote('');
      toast.success('Published');
      await loadAll();
    } catch (e) {
      console.error(e);
      toast.error('Publish failed');
    } finally {
      setPublishing(false);
    }
  };

  const move = (key: string, dir: -1 | 1) => {
    if (!draft) return;
    const sorted = sortSections(draft.page.sections);
    const idx = sorted.findIndex((s) => s.sectionKey === key);
    if (idx < 0) return;
    const j = idx + dir;
    if (j < 0 || j >= sorted.length) return;
    const copy = [...sorted];
    [copy[idx], copy[j]] = [copy[j], copy[idx]];
    updateDraftSections(copy);
  };

  const toggleEnabled = (key: string) => {
    if (!draft) return;
    const next = draft.page.sections.map((s) =>
      s.sectionKey === key ? { ...s, enabled: !s.enabled } : s
    );
    updateDraftSections(next);
  };

  const duplicateSection = (key: string) => {
    if (!draft) return;
    const s = draft.page.sections.find((x) => x.sectionKey === key);
    if (!s) return;
    const copy: HomeSection = {
      ...s,
      sectionKey: `${s.sectionKey}_copy_${Date.now().toString(36)}`,
      label: `${s.label || s.sectionKey} (copy)`,
      order: draft.page.sections.length + 1,
      data: JSON.parse(JSON.stringify(s.data)) as Record<string, unknown>,
    };
    const merged = [...draft.page.sections, copy];
    updateDraftSections(merged);
    setSelectedKey(copy.sectionKey);
    toast.success('Duplicate added — reorder and save draft');
  };

  const deleteSection = (key: string) => {
    if (!draft) return;
    if (!confirm('Delete this section from the draft?')) return;
    const next = draft.page.sections.filter((s) => s.sectionKey !== key);
    updateDraftSections(next);
    setSelectedKey(renumberOrders(next)[0]?.sectionKey ?? null);
  };

  const addSection = (type: string) => {
    if (!draft) return;
    const template = draft.page.sections.find((s) => s.type === type);
    const maxOrder = Math.max(0, ...draft.page.sections.map((s) => s.order));
    const created = buildNewSection(type, maxOrder + 1, template);
    const merged = [...draft.page.sections, created];
    updateDraftSections(merged);
    setSelectedKey(created.sectionKey);
    setAddOpen(false);
    toast.success('Section added — edit and save draft');
  };

  const rollback = async (versionId: string) => {
    if (!token || !confirm('Restore this version into your draft? Current draft edits will be replaced.')) return;
    try {
      const res = await fetch('/api/cms/homepage/rollback', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ versionId }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string; data?: { draft: HomePageDocument } };
      if (!res.ok || !json.success || !json.data) {
        toast.error(json.error || 'Rollback failed');
        return;
      }
      setDraft(json.data.draft);
      setHasUnpublishedChanges(true);
      const k = json.data.draft.page.sections[0]?.sectionKey ?? null;
      setSelectedKey(k);
      toast.success('Draft restored from version');
      await loadAll();
    } catch (e) {
      console.error(e);
      toast.error('Rollback failed');
    }
  };

  const loadNewsAndMedia = async () => {
    setNewsOpen(true);
    await loadNewsByQuery('wildfires');
  };

  const loadNewsByQuery = async (query: string) => {
    setSelectedNewsQuery(query);
    setNewsError(null);
    const cached = readNewsCache()[query];
    const hasFreshCache = Boolean(cached && Date.now() - cached.fetchedAt < NEWS_CACHE_TTL_MS);

    if (hasFreshCache && cached) {
      setNewsArticles(cached.articles);
      setNewsLoading(false);
      return;
    }

    setNewsLoading(true);
    try {
      const res = await fetch(`/api/news-media?country=us&limit=12&q=${encodeURIComponent(query)}`, {
        headers: authHeaders,
        cache: 'no-store',
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        data?: {
          selectedQuery?: string;
          articles?: NewsMediaArticle[];
        };
      };
      if (!res.ok || !json.success || !json.data) {
        const msg = json.error || 'Unable to load news and media';
        setNewsError(msg);
        toast.error(msg);
        return;
      }
      const nextArticles = Array.isArray(json.data.articles) ? json.data.articles : [];
      setNewsArticles(nextArticles);
      const cache = readNewsCache();
      cache[query] = {
        fetchedAt: Date.now(),
        articles: nextArticles,
      };
      writeNewsCache(cache);
    } catch (e) {
      console.error(e);
      setNewsError('Unable to load news and media');
      toast.error('Unable to load news and media');
    } finally {
      setNewsLoading(false);
    }
  };

  if (loading || !draft) {
    return (
      <div className="flex items-center justify-center min-h-[320px] text-[var(--text-muted)]">
        Loading homepage builder…
      </div>
    );
  }

  const ordered = sortSections(draft.page.sections);
  const selectedData = (selected?.data || {}) as Record<string, JsonValue>;

  const updateSelectedDataByPath = (path: (string | number)[], val: JsonValue) => {
    if (!selected) return;
    const base = selectedData as unknown as JsonValue;
    const nextRoot = setAtPath(base, path, val);
    updateSectionData(selected.sectionKey, nextRoot as Record<string, unknown>);
  };

  const removeSelectedDataByPath = (path: (string | number)[]) => {
    if (!selected) return;
    const base = selectedData as unknown as JsonValue;
    const nextRoot = removeAtPath(base, path);
    updateSectionData(selected.sectionKey, nextRoot as Record<string, unknown>);
  };

  const appendSelectedDataByPath = (path: (string | number)[], item: JsonValue) => {
    if (!selected) return;
    const base = selectedData as unknown as JsonValue;
    const nextRoot = appendAtPath(base, path, item);
    updateSectionData(selected.sectionKey, nextRoot as Record<string, unknown>);
  };

  const addObjectField = (path: (string | number)[]) => {
    if (!selected) return;
    const root = selectedData as unknown as JsonValue;
    const target = getAtPath(root, path);
    if (!target || typeof target !== 'object' || Array.isArray(target)) return;
    const obj = { ...(target as Record<string, JsonValue>) };
    let i = 1;
    let key = `newField${i}`;
    while (key in obj) {
      i += 1;
      key = `newField${i}`;
    }
    obj[key] = '';
    updateSelectedDataByPath(path, obj);
  };

  const renderInputForPrimitive = (value: JsonPrimitive, path: (string | number)[], label: string) => {
    if (typeof value === 'boolean') {
      return (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={value}
            onChange={(e) => updateSelectedDataByPath(path, e.target.checked)}
          />
          <span>{label}</span>
        </label>
      );
    }

    if (typeof value === 'number') {
      return (
        <Input
          label={label}
          type="number"
          value={String(value)}
          onChange={(e) => updateSelectedDataByPath(path, Number(e.target.value || 0))}
        />
      );
    }

    const str = value ?? '';
    const multiline = typeof str === 'string' && str.length > 90;
    if (multiline) {
      return (
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">{label}</label>
          <textarea
            className="input-field min-h-[90px]"
            value={String(str)}
            onChange={(e) => updateSelectedDataByPath(path, e.target.value)}
          />
        </div>
      );
    }
    return (
      <Input
        label={label}
        value={String(str)}
        onChange={(e) => updateSelectedDataByPath(path, e.target.value)}
      />
    );
  };

  const renderEditor = (value: JsonValue, path: (string | number)[] = [], title?: string): React.ReactNode => {
    const label = title ?? String(path[path.length - 1] ?? 'Root');
    if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return <div>{renderInputForPrimitive(value, path, label)}</div>;
    }

    if (Array.isArray(value)) {
      return (
        <Card className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="font-medium text-sm">{label} (list)</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => appendSelectedDataByPath(path, '')}
            >
              <PlusIcon className="w-4 h-4 mr-1" />
              Add item
            </Button>
          </div>
          {value.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No items yet.</p>
          ) : (
            <div className="space-y-2">
              {value.map((item, index) => (
                <div key={`${path.join('.')}.${index}`} className="rounded-lg border border-[var(--border-color)] p-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-[var(--text-muted)]">Item {index + 1}</span>
                    <button
                      type="button"
                      className="text-xs text-red-600"
                      onClick={() => removeSelectedDataByPath([...path, index])}
                    >
                      Remove
                    </button>
                  </div>
                  {renderEditor(item, [...path, index], `Item ${index + 1}`)}
                </div>
              ))}
            </div>
          )}
        </Card>
      );
    }

    const entries = Object.entries(value);
    return (
      <Card className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="font-medium text-sm">{label}</p>
          <Button variant="ghost" size="sm" onClick={() => addObjectField(path)}>
            <PlusIcon className="w-4 h-4 mr-1" />
            Add field
          </Button>
        </div>
        {entries.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No fields yet.</p>
        ) : (
          <div className="space-y-2">
            {entries.map(([k, v]) => (
              <div key={`${path.join('.')}.${k}`} className="rounded-lg border border-[var(--border-color)] p-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold">{k}</span>
                  {path.length > 0 && (
                    <button
                      type="button"
                      className="text-xs text-red-600"
                      onClick={() => removeSelectedDataByPath([...path, k])}
                    >
                      Remove field
                    </button>
                  )}
                </div>
                {renderEditor(v, [...path, k], k)}
              </div>
            ))}
          </div>
        )}
      </Card>
    );
  };

  const textFrom = (obj: Record<string, unknown>, keys: string[], fallback = '—'): string => {
    for (const k of keys) {
      const v = obj[k];
      if (typeof v === 'string' && v.trim()) return v;
    }
    return fallback;
  };

  const mediaUrlFrom = (obj: Record<string, unknown>, key: string, fallback = 'configured'): string => {
    const v = obj[key];
    if (typeof v === 'string' && v.trim()) return v;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const url = (v as Record<string, unknown>).url;
      if (typeof url === 'string' && url.trim()) return url;
    }
    return fallback;
  };

  const SectionPreview = ({ section }: { section: HomeSection }) => {
    const d = section.data as Record<string, unknown>;
    const title = section.label || section.sectionKey;
    const type = section.type;
    const headingLines = Array.isArray(d.headingLines) ? d.headingLines.filter((x) => typeof x === 'string') as string[] : [];
    const items = Array.isArray(d.items) ? d.items : [];
    const cards = Array.isArray(d.cards) ? d.cards : [];
    const bulletPoints = Array.isArray(d.bulletPoints) ? d.bulletPoints : [];

    return (
      <Card className="p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="font-semibold">{title}</p>
            <p className="text-xs text-[var(--text-muted)]">{type}</p>
          </div>
          <Badge variant={section.enabled ? 'success' : 'warning'} size="sm">
            {section.enabled ? 'Enabled' : 'Disabled'}
          </Badge>
        </div>

        {type === 'hero' && (
          <>
            <p className="text-sm font-medium">{headingLines.join(' ') || textFrom(d, ['heading', 'title'])}</p>
            <p className="text-sm text-[var(--text-muted)]">{textFrom(d, ['description', 'subheading'])}</p>
            <p className="text-xs text-[var(--text-muted)]">Video: {mediaUrlFrom(d, 'backgroundVideo', textFrom(d, ['videoUrl'], 'configured'))}</p>
          </>
        )}

        {type === 'impact_stats' && (
          <>
            <p className="text-sm font-medium">{textFrom(d, ['titleHighlight', 'titlePrefix'])}</p>
            <p className="text-sm text-[var(--text-muted)]">{textFrom(d, ['subtitle'])}</p>
            <p className="text-xs text-[var(--text-muted)]">{cards.length} stat card(s)</p>
          </>
        )}

        {type === 'lifeline_features_grid' && (
          <>
            <p className="text-sm font-medium">{textFrom(d, ['titleHighlight', 'titlePrefix', 'title'])}</p>
            <p className="text-sm text-[var(--text-muted)]">{textFrom(d, ['subtitle'])}</p>
            <p className="text-xs text-[var(--text-muted)]">{items.length} feature item(s)</p>
          </>
        )}

        {type === 'live_impact_updates' && (
          <>
            <p className="text-sm font-medium">{textFrom(d, ['titleHighlight', 'titlePrefix', 'title'])}</p>
            <p className="text-xs text-[var(--text-muted)]">{items.length} update item(s)</p>
          </>
        )}

        {type === 'community_cta' && (
          <>
            <p className="text-sm font-medium">{textFrom(d, ['title', 'badgeText'])}</p>
            <p className="text-sm text-[var(--text-muted)]">{textFrom(d, ['description'])}</p>
            <p className="text-xs text-[var(--text-muted)]">{bulletPoints.length} bullet point(s)</p>
          </>
        )}

        {!['hero', 'impact_stats', 'lifeline_features_grid', 'live_impact_updates', 'community_cta'].includes(type) && (
          <p className="text-sm text-[var(--text-muted)]">
            GUI preview for this section is generic. Content updates are still fully editable in the form.
          </p>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={() => setPreviewOpen(true)}>
            <EyeIcon className="w-4 h-4 mr-1.5" />
            Preview selected section
          </Button>
          <Button variant="secondary" onClick={() => setAllPreviewOpen(true)}>
            <EyeIcon className="w-4 h-4 mr-1.5" />
            Preview all sections
          </Button>
          <Button variant="secondary" onClick={() => window.open('/api/public/pages/home', '_blank')}>
            Open published JSON
          </Button>
          <Button variant="secondary" onClick={loadNewsAndMedia}>
            <NewspaperIcon className="w-4 h-4 mr-1.5" />
            News and Media
          </Button>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[200px]">
            <label className="text-xs text-[var(--text-muted)] block mb-1">Publish note (optional)</label>
            <Input value={changeNote} onChange={(e) => setChangeNote(e.target.value)} placeholder="e.g. Hero copy update" />
          </div>
          <Button variant="primary" onClick={publish} disabled={publishing} className="!bg-emerald-700 hover:!bg-emerald-800">
            <RocketLaunchIcon className="w-4 h-4 mr-1.5" />
            {publishing ? 'Publishing…' : 'Publish'}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-sm text-[var(--text-muted)]">
        <span>
          Published version:{' '}
          <strong className="text-[var(--text-primary)]">{publishedVersion || '—'}</strong>
        </span>
        <span className="hidden sm:inline">·</span>
        <span>
          Last publish:{' '}
          <strong className="text-[var(--text-primary)]">
            {publishedAt ? new Date(publishedAt).toLocaleString() : 'never'}
          </strong>
        </span>
        {hasUnpublishedChanges && (
          <Badge variant="warning" className="ml-0 sm:ml-2">
            Unpublished changes
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <Card className="xl:col-span-5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-[var(--text-primary)]">Sections</h3>
            <Button variant="secondary" size="sm" onClick={() => setAddOpen(true)}>
              <PlusIcon className="w-4 h-4 mr-1" />
              Add section
            </Button>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Reorder with arrows. Disabled sections stay in the draft but are omitted from the public API after publish.
          </p>
          <ul className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
            {ordered.map((s) => {
              const active = s.sectionKey === selectedKey;
              return (
                <li
                  key={s.sectionKey}
                  className={`rounded-xl border p-3 cursor-pointer transition-colors ${
                    active
                      ? 'border-[#991B1B] bg-red-50/50 dark:bg-red-950/20'
                      : 'border-[var(--border-color)] hover:bg-[var(--bg-secondary)]'
                  }`}
                  onClick={() => selectSection(s.sectionKey)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-[var(--text-primary)] truncate">
                          {s.label || s.sectionKey}
                        </span>
                        <Badge variant="secondary" className="text-[10px]">
                          {s.type}
                        </Badge>
                        {!s.enabled && (
                          <Badge variant="warning" className="text-[10px]">
                            off
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5">order {s.order}</p>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          className="p-1 rounded border border-[var(--border-color)] hover:bg-[var(--bg-secondary)]"
                          onClick={() => move(s.sectionKey, -1)}
                          aria-label="Move up"
                        >
                          <ArrowUpIcon className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          className="p-1 rounded border border-[var(--border-color)] hover:bg-[var(--bg-secondary)]"
                          onClick={() => move(s.sectionKey, 1)}
                          aria-label="Move down"
                        >
                          <ArrowDownIcon className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex gap-1 flex-wrap justify-end">
                        <button
                          type="button"
                          className="text-xs px-2 py-0.5 rounded bg-[var(--bg-secondary)]"
                          onClick={() => toggleEnabled(s.sectionKey)}
                        >
                          {s.enabled ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          type="button"
                          className="text-xs px-2 py-0.5 rounded bg-[var(--bg-secondary)]"
                          onClick={() => duplicateSection(s.sectionKey)}
                        >
                          <DocumentDuplicateIcon className="w-3.5 h-3.5 inline" />
                        </button>
                        <button
                          type="button"
                          className="text-xs px-2 py-0.5 rounded text-red-600"
                          onClick={() => deleteSection(s.sectionKey)}
                        >
                          <TrashIcon className="w-3.5 h-3.5 inline" />
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="xl:col-span-7 p-4 space-y-4">
          <h3 className="font-semibold text-[var(--text-primary)]">Page & selected section</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Page title"
              value={draft.page.title}
              onChange={(e) => {
                setDraft({ ...draft, page: { ...draft.page, title: e.target.value } });
                setHasUnpublishedChanges(true);
              }}
            />
            <Input
              label="Slug"
              value={draft.page.slug}
              onChange={(e) => {
                setDraft({ ...draft, page: { ...draft.page, slug: e.target.value } });
                setHasUnpublishedChanges(true);
              }}
            />
          </div>

          {selected ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Section key (stable id)"
                  value={selected.sectionKey}
                  onChange={(e) => {
                    const v = e.target.value.trim();
                    if (!v) return;
                    const oldKey = selected.sectionKey;
                    const keyExists = draft.page.sections.some((x) => x.sectionKey === v && x.sectionKey !== oldKey);
                    if (keyExists) {
                      toast.error('sectionKey must be unique');
                      return;
                    }
                    const next = draft.page.sections.map((x) =>
                      x.sectionKey === oldKey ? { ...x, sectionKey: v } : x
                    );
                    setSelectedKey(v);
                    updateDraftSections(next);
                  }}
                />
                <Input
                  label="Admin label"
                  value={selected.label ?? ''}
                  onChange={(e) => {
                    updateSectionMeta(selected.sectionKey, { label: e.target.value });
                  }}
                />
              </div>
              <div>
                <label className="text-xs text-[var(--text-muted)] block mb-2">Content editor (GUI)</label>
                <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
                  {renderEditor(selectedData as unknown as JsonValue, [], 'Section data')}
                </div>
              </div>
              <div>
                <label className="text-xs text-[var(--text-muted)] block mb-2">Live preview</label>
                <SectionPreview section={selected} />
              </div>
            </>
          ) : (
            <p className="text-[var(--text-muted)]">Select a section to edit.</p>
          )}
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
          <h3 className="font-semibold text-[var(--text-primary)]">Version history</h3>
          <Button variant="ghost" size="sm" onClick={() => loadAll()}>
            <ArrowPathIcon className="w-4 h-4 mr-1" />
            Refresh
          </Button>
        </div>
        {versions.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No publishes yet. Publishing creates a snapshot you can restore.</p>
        ) : (
          <ul className="divide-y divide-[var(--border-color)]">
            {versions.map((v) => (
              <li key={v.id} className="py-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                <div>
                  <span className="font-medium text-[var(--text-primary)]">v{v.versionNumber}</span>
                  <span className="text-[var(--text-muted)] mx-2">
                    {new Date(v.createdAt).toLocaleString()}
                  </span>
                  <span className="text-[var(--text-muted)]">({v.sectionCount} sections)</span>
                  {v.changeNote && (
                    <span className="block text-xs text-[var(--text-muted)] mt-0.5">{v.changeNote}</span>
                  )}
                </div>
                <Button variant="secondary" size="sm" onClick={() => rollback(v.id)}>
                  Restore to draft
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Add section" size="lg">
        <p className="text-sm text-[var(--text-muted)] mb-3">
          New sections are appended with default data for that type. Edit JSON on the right, then save draft.
        </p>
        <ul className="space-y-2 max-h-[360px] overflow-y-auto">
          {sectionTypes.map((t) => (
            <li key={t.type}>
              <button
                type="button"
                className="w-full text-left rounded-lg border border-[var(--border-color)] p-3 hover:bg-[var(--bg-secondary)] transition-colors"
                onClick={() => addSection(t.type)}
              >
                <span className="font-medium text-[var(--text-primary)]">{t.displayName}</span>
                <span className="text-xs text-[var(--text-muted)] block">{t.type}</span>
                <span className="text-xs text-[var(--text-muted)]">{t.description}</span>
              </button>
            </li>
          ))}
        </ul>
      </Modal>

      <Modal isOpen={previewOpen} onClose={() => setPreviewOpen(false)} title="Draft preview (JSON)" size="xl">
        {selected ? (
          <SectionPreview section={selected} />
        ) : (
          <p className="text-[var(--text-muted)]">Select a section first.</p>
        )}
      </Modal>

      <Modal isOpen={allPreviewOpen} onClose={() => setAllPreviewOpen(false)} title="All section previews" size="xl">
        <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
          {ordered.map((s) => (
            <SectionPreview key={s.sectionKey} section={s} />
          ))}
          {ordered.length === 0 && (
            <p className="text-[var(--text-muted)]">No sections available.</p>
          )}
        </div>
      </Modal>

      <Modal isOpen={newsOpen} onClose={() => setNewsOpen(false)} title="News and media" size="xl">
        <div className="space-y-4 max-h-[72vh] overflow-y-auto pr-1">
          {newsLoading ? (
            <p className="text-sm text-[var(--text-muted)]">Loading latest updates...</p>
          ) : newsError ? (
            <p className="text-sm text-red-600">{newsError}</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {NEWS_QUERY_OPTIONS.map((query) => (
                  <button
                    key={query}
                    type="button"
                    onClick={() => {
                      if (!newsLoading && query !== selectedNewsQuery) void loadNewsByQuery(query);
                    }}
                    disabled={newsLoading}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      selectedNewsQuery === query
                        ? 'bg-[#991B1B] text-white border-[#991B1B]'
                        : 'border-[var(--border-color)] hover:bg-[var(--bg-secondary)]'
                    }`}
                  >
                    {query}
                  </button>
                ))}
              </div>
              <div className="text-xs text-[var(--text-muted)]">
                Showing: <span className="font-semibold text-[var(--text-primary)]">{selectedNewsQuery}</span> ({newsArticles.length} articles)
              </div>
              {newsArticles.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">No articles available for selected categories.</p>
              ) : (
                <div className="space-y-3">
                  {newsArticles.map((item, index) => {
                    const key = item.article_id || item.link || `${item.title || 'article'}-${index}`;
                    const metadataEntries = Object.entries(item).filter(([field, value]) => {
                      if (field.startsWith('ai_')) return false;
                      if (['article_id', 'title', 'description', 'link', 'image_url', 'q'].includes(field)) return false;
                      if (value == null) return false;
                      if (typeof value === 'string' && !value.trim()) return false;
                      if (Array.isArray(value) && value.length === 0) return false;
                      return true;
                    });
                    return (
                      <Card key={key} className="p-3">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                          <div className="md:col-span-3">
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={item.title || 'news image'}
                                className="w-full h-[110px] object-cover rounded-lg border border-[var(--border-color)]"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-[110px] rounded-lg border border-dashed border-[var(--border-color)] flex items-center justify-center text-xs text-[var(--text-muted)]">
                                No image available
                              </div>
                            )}
                          </div>
                          <div className="md:col-span-9 space-y-2">
                            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
                              <Badge variant="secondary">{item.q || 'general'}</Badge>
                              <span>{item.source_name || 'Unknown source'}</span>
                              {item.pubDate && <span>{new Date(item.pubDate).toLocaleString()}</span>}
                            </div>
                            <p className="font-medium text-[var(--text-primary)]">{item.title || 'Untitled'}</p>
                            {item.description && (
                              <p className="text-sm text-[var(--text-secondary)]">{item.description}</p>
                            )}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                              {metadataEntries.map(([field, value]) => {
                                const normalized = Array.isArray(value)
                                  ? value.join(', ')
                                  : typeof value === 'object'
                                    ? JSON.stringify(value)
                                    : String(value);
                                return (
                                  <div
                                    key={`${key}-${field}`}
                                    className="rounded border border-[var(--border-color)] px-2 py-1 bg-[var(--bg-secondary)]"
                                  >
                                    <span className="font-semibold text-[var(--text-primary)]">{field}: </span>
                                    <span className="text-[var(--text-muted)]">{normalized}</span>
                                  </div>
                                );
                              })}
                            </div>
                            {item.link && (
                              <a
                                href={item.link}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sm text-blue-600 hover:underline break-all"
                              >
                                {item.link}
                              </a>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
