'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  CloudArrowUpIcon,
  CommandLineIcon,
  EyeIcon,
  NewspaperIcon,
  PencilSquareIcon,
  ServerStackIcon,
  SparklesIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { Badge, Button, Card, Input, Modal } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-toastify';
import {
  fetchSectionsList,
  fetchSectionDetail,
  saveSectionFull,
  seedLandingContent,
  uploadMedia,
} from '@/lib/landing-cms/api';
import type { SectionMeta, SectionDetail } from '@/lib/landing-cms/types';
import { SECTION_LABELS, SECTION_COLORS } from '@/lib/landing-cms/types';
import JsonFieldEditor from '@/lib/landing-cms/JsonFieldEditor';

/* ─── News & Media (kept from old code) ─── */
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
  'wildfires', 'earthquake', 'hurricane', 'tornado', 'landslide', 'tsunami', 'heatwave',
] as const;
const NEWS_CACHE_KEY = 'homepage_news_media_cache_v1';
const NEWS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
type NewsCacheRecord = { fetchedAt: number; articles: NewsMediaArticle[] };
type NewsCacheMap = Record<string, NewsCacheRecord>;

function readNewsCache(): NewsCacheMap {
  if (typeof window === 'undefined') return {};
  try { const raw = window.localStorage.getItem(NEWS_CACHE_KEY); return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}
function writeNewsCache(next: NewsCacheMap): void {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(NEWS_CACHE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
}

/* ─── Main Component ─── */
export default function HomepageManagementClient() {
  const { token } = useAuth();

  // Section list state
  const [loading, setLoading] = useState(true);
  const [homeSections, setHomeSections] = useState<SectionMeta[]>([]);
  const [selectedSection, setSelectedSection] = useState<{ page: string, section: string } | null>(null);

  // Section detail state
  const [sectionLoading, setSectionLoading] = useState(false);
  const [sectionDetail, setSectionDetail] = useState<SectionDetail | null>(null);
  const [editedContent, setEditedContent] = useState<Record<string, unknown> | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Save / Seed state
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // Upload state
  const [uploading, setUploading] = useState(false);

  // Preview
  const [previewOpen, setPreviewOpen] = useState(false);

  // News & Media state (preserved from old code)
  const [newsOpen, setNewsOpen] = useState(false);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [newsArticles, setNewsArticles] = useState<NewsMediaArticle[]>([]);
  const [selectedNewsQuery, setSelectedNewsQuery] = useState<string>('wildfires');
  const [targetNewsIndex, setTargetNewsIndex] = useState<number | null>(null);

  const authHeaders = useMemo(() => {
    const h: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [token]);

  /* ─── Load sections list ─── */
  const loadSections = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetchSectionsList(token);
      if (res.success && res.data?.pages) {
        // Flatten all sections from all pages
        const allSections: SectionMeta[] = [];
        Object.entries(res.data.pages).forEach(([page, sections]) => {
          allSections.push(...sections.map(s => ({ ...s, page })));
        });

        setHomeSections(allSections);
        if (!selectedSection && allSections.length > 0) {
          const first = allSections[0];
          setSelectedSection({ page: first.page, section: first.section });
        }
      } else {
        setHomeSections([]);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load sections list');
    } finally {
      setLoading(false);
    }
  }, [token, selectedSection]);

  useEffect(() => { loadSections(); }, [loadSections]);

  /* ─── Load section detail ─── */
  const loadSectionDetail = useCallback(async (page: string, sectionKey: string) => {
    if (!token) return;
    setSectionLoading(true);
    try {
      const res = await fetchSectionDetail(page, sectionKey, token);
      if (res.success && res.data) {
        setSectionDetail(res.data);
        setEditedContent(JSON.parse(JSON.stringify(res.data.content)));
        setIsDirty(false);
      } else {
        setSectionDetail(null);
        setEditedContent(null);
        toast.error('Section not found');
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load section');
    } finally {
      setSectionLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (selectedSection) loadSectionDetail(selectedSection.page, selectedSection.section);
  }, [selectedSection, loadSectionDetail]);

  /* ─── Save section ─── */
  const handleSave = async () => {
    if (!selectedSection || !editedContent || !token) return;
    setSaving(true);
    try {
      const sortOrder = sectionDetail?.sortOrder ?? 0;
      const res = await saveSectionFull(selectedSection.page, selectedSection.section, editedContent, sortOrder, token);
      if (res.success) {
        toast.success(res.message || 'Section saved!');
        setSectionDetail(res.data);
        setEditedContent(JSON.parse(JSON.stringify(res.data.content)));
        setIsDirty(false);
      } else {
        toast.error('Save failed');
      }
    } catch (e) {
      console.error(e);
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  /* ─── Seed data ─── */
  const handleSeed = async () => {
    if (!token) return;
    if (!confirm('This will seed/overwrite all landing content with defaults from the JSON file. Continue?')) return;
    setSeeding(true);
    try {
      const res = await seedLandingContent(token);
      if (res.success) {
        toast.success(res.message || 'Seeding complete!');
        await loadSections();
      } else {
        toast.error(res.message || 'Seeding failed');
      }
    } catch (e) {
      console.error(e);
      toast.error('Seeding failed');
    } finally {
      setSeeding(false);
    }
  };

  /* ─── Upload media ─── */
  const handleUpload = async (file: File, fieldKey?: string) => {
    if (!selectedSection || !token) return;
    setUploading(true);
    try {
      const res = await uploadMedia(file, selectedSection.page, selectedSection.section, token, undefined, fieldKey);
      if (res.success) {
        toast.success('Media uploaded! URL copied to clipboard.');
        navigator.clipboard.writeText(res.data.url).catch(() => { });
        return res.data.url;
      } else {
        toast.error('Upload failed');
      }
    } catch (e) {
      console.error(e);
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
    return null;
  };

  /* ─── Content change handler ─── */
  const handleContentChange = (newContent: unknown) => {
    setEditedContent(newContent as Record<string, unknown>);
    setIsDirty(true);
  };

  /* ─── News & Media (preserved) ─── */
  const loadNewsAndMedia = async () => {
    setNewsOpen(true);
    await loadNewsByQuery('wildfires');
  };

  const loadNewsByQuery = async (query: string) => {
    setSelectedNewsQuery(query);
    setNewsError(null);
    const cached = readNewsCache()[query];
    if (cached && Date.now() - cached.fetchedAt < NEWS_CACHE_TTL_MS) {
      setNewsArticles(cached.articles);
      setNewsLoading(false);
      return;
    }
    setNewsLoading(true);
    try {
      const res = await fetch(`/api/news-media?country=us&limit=12&q=${encodeURIComponent(query)}`, {
        headers: authHeaders, cache: 'no-store',
      });
      const json = await res.json();
      if (!res.ok || !json.success || !json.data) {
        setNewsError(json.error || 'Unable to load news');
        return;
      }
      const articles = Array.isArray(json.data.articles) ? json.data.articles : [];
      setNewsArticles(articles);
      const cache = readNewsCache();
      cache[query] = { fetchedAt: Date.now(), articles };
      writeNewsCache(cache);
    } catch {
      setNewsError('Unable to load news');
    } finally {
      setNewsLoading(false);
    }
  };

  /* ─── Render ─── */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-12 h-12 border-4 border-[#991B1B] border-t-transparent rounded-full animate-spin" />
        <p className="text-[var(--text-muted)] animate-pulse">Loading CMS sections…</p>
      </div>
    );
  }

  const isEmpty = homeSections.length === 0;

  return (
    <div className="space-y-6">
      {/* ─── Top Bar ─── */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {/* Top bar buttons removed for clean UI */}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Removed Seed button */}
          {isDirty && (
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={saving}
              className="!bg-emerald-600 hover:!bg-emerald-700 animate-pulse-once"
            >
              <CloudArrowUpIcon className="w-4 h-4 mr-1.5" />
              {saving ? 'Saving…' : 'Save Section'}
            </Button>
          )}
        </div>
      </div>

      {/* ─── Empty State ─── */}
      {isEmpty && (
        <Card className="p-8 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-amber-500/20 to-red-500/20 flex items-center justify-center">
            <SparklesIcon className="w-8 h-8 text-amber-500" />
          </div>
          <h3 className="text-xl font-bold text-[var(--text-primary)]">No Content Found</h3>
          <p className="text-[var(--text-muted)] max-w-md mx-auto">
            The CMS has no landing content yet. Click &quot;Seed Default Data&quot; to populate
            all sections from the content structure JSON file.
          </p>
          <Button variant="primary" onClick={handleSeed} disabled={seeding} className="!bg-amber-600 hover:!bg-amber-700">
            <ServerStackIcon className="w-4 h-4 mr-1.5" />
            {seeding ? 'Seeding…' : 'Seed Default Data Now'}
          </Button>
        </Card>
      )}

      {/* ─── Main Layout ─── */}
      {!isEmpty && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Sidebar */}
          <div className="xl:col-span-4 2xl:col-span-3">
            <Card className="p-4 space-y-3 sticky top-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <PencilSquareIcon className="w-5 h-5" />
                  Home Sections
                </h3>
                <Badge variant="secondary">{homeSections.length}</Badge>
              </div>
              <ul className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
                {Object.entries(
                  homeSections.reduce((acc, s) => {
                    if (!acc[s.page]) acc[s.page] = [];
                    acc[s.page].push(s);
                    return acc;
                  }, {} as Record<string, SectionMeta[]>)
                ).map(([page, sections]) => (
                  <li key={page} className="space-y-2">
                    <h4 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider px-3 flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-[var(--text-muted)]" />
                      {page} Page
                    </h4>
                    <ul className="space-y-1">
                      {sections.map((s) => {
                        const active = selectedSection?.page === s.page && s.section === selectedSection?.section;
                        const label = SECTION_LABELS[s.section] || s.section;
                        const color = SECTION_COLORS[s.section] || '#6B7280';
                        return (
                          <li key={`${s.page}-${s.section}`}>
                            <button
                              type="button"
                              className={`w-full text-left rounded-xl px-3 py-2 transition-all duration-200 border ${active
                                  ? 'border-[#991B1B] bg-[#991B1B]/5 shadow-sm shadow-[#991B1B]/10 dark:bg-[#991B1B]/10'
                                  : 'border-transparent hover:border-[var(--border-color)] hover:bg-[var(--bg-secondary)]'
                                }`}
                              onClick={() => setSelectedSection({ page: s.page, section: s.section })}
                            >
                              <div className="flex items-center gap-2.5">
                                <div
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ backgroundColor: active ? '#991B1B' : color }}
                                />
                                <div className="min-w-0 flex-1">
                                  <p className={`text-sm font-medium truncate ${active ? 'text-[#991B1B]' : 'text-[var(--text-primary)]'}`}>
                                    {label}
                                  </p>
                                </div>
                                {active && (
                                  <CheckCircleIcon className="w-4 h-4 text-[#991B1B] shrink-0" />
                                )}
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          {/* Editor */}
          <div className="xl:col-span-8 2xl:col-span-9">
            <Card className="p-5 space-y-5">
              {sectionLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-8 h-8 border-3 border-[#991B1B] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : sectionDetail && editedContent ? (
                <>
                  {/* Section Header */}
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                        {SECTION_LABELS[sectionDetail.section] || sectionDetail.section}
                        {isDirty && (
                          <Badge variant="warning" className="text-[10px]">unsaved</Badge>
                        )}
                      </h3>
                      <p className="text-xs text-[var(--text-muted)] mt-1">
                        Page: <strong>{sectionDetail.page}</strong> · Section: <strong>{sectionDetail.section}</strong> · Sort: {sectionDetail.sortOrder}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="primary"
                        onClick={handleSave}
                        disabled={saving || !isDirty}
                        className="!bg-emerald-600 hover:!bg-emerald-700"
                      >
                        <CheckCircleIcon className="w-4 h-4 mr-1.5" />
                        {saving ? 'Saving…' : 'Save'}
                      </Button>
                    </div>
                  </div>

                  {/* Content Editor */}
                  <div className="max-h-[calc(100vh-280px)] overflow-y-auto pr-1 space-y-3">
                    {sectionDetail.section === 'liveImpactUpdates' && editedContent?.items ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
                          <p className="text-sm font-medium text-amber-800">Live Impact Updates Manager</p>
                          <Button variant="secondary" size="sm" onClick={() => {
                            const items = [...(editedContent.items as any[])];
                            items.unshift({
                              date: '', time: '', image: '', title: '', country: '', paragraph: '', sourceLink: ''
                            });
                            handleContentChange({ ...editedContent, items });
                          }}>
                            Add New Update
                          </Button>
                        </div>
                        {(editedContent.items as any[]).map((item, idx) => (
                          <Card key={idx} className="p-4 space-y-3 border-l-4 border-l-[#991B1B]">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold uppercase text-[var(--text-muted)]">Update #{idx + 1}</span>
                              <div className="flex items-center gap-2">
                                <Button variant="secondary" size="sm" onClick={() => {
                                  setTargetNewsIndex(idx);
                                  loadNewsAndMedia();
                                }}>
                                  <SparklesIcon className="w-3.5 h-3.5 mr-1" /> Fetch from News
                                </Button>
                                <Button variant="secondary" size="sm" className="text-red-600" onClick={() => {
                                  const items = [...(editedContent.items as any[])];
                                  items.splice(idx, 1);
                                  handleContentChange({ ...editedContent, items });
                                }}>
                                  Remove
                                </Button>
                              </div>
                            </div>
                            <JsonFieldEditor
                              data={item}
                              onChange={(val) => {
                                const items = [...(editedContent.items as any[])];
                                items[idx] = val;
                                handleContentChange({ ...editedContent, items });
                              }}
                              label={`Update ${idx + 1}`}
                              depth={1}
                              onUpload={(file) => handleUpload(file)}
                            />
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <JsonFieldEditor
                        data={editedContent}
                        onChange={handleContentChange}
                        label={`${sectionDetail.section} content`}
                        depth={0}
                        onUpload={(file) => handleUpload(file)}
                      />
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-[var(--text-muted)]">
                  <PencilSquareIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>Select a section from the sidebar to begin editing.</p>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* ─── Preview Modal ─── */}
      <Modal isOpen={previewOpen} onClose={() => setPreviewOpen(false)} title="Section JSON Preview" size="xl">
        {editedContent ? (
          <pre className="bg-[var(--bg-secondary)] p-4 rounded-xl text-xs overflow-auto max-h-[70vh] font-mono text-[var(--text-secondary)]">
            {JSON.stringify(editedContent, null, 2)}
          </pre>
        ) : (
          <p className="text-[var(--text-muted)]">No content to preview.</p>
        )}
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
                    onClick={() => { if (!newsLoading && query !== selectedNewsQuery) void loadNewsByQuery(query); }}
                    disabled={newsLoading}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${selectedNewsQuery === query
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
                      <div key={key} className="relative group">
                        <Card className="p-3 transition-all hover:ring-2 hover:ring-[#991B1B]/50">
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
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
                                  <Badge variant="secondary">{item.q || 'general'}</Badge>
                                  <span>{item.source_name || 'Unknown source'}</span>
                                  {item.pubDate && <span>{new Date(item.pubDate).toLocaleString()}</span>}
                                </div>
                                {targetNewsIndex !== null && (
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    className="!bg-[#991B1B] !text-white h-7 px-3"
                                    onClick={() => {
                                      const dateObj = item.pubDate ? new Date(item.pubDate) : new Date();
                                      const mappedUpdate = {
                                        date: dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
                                        time: dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                                        image: item.image_url || '',
                                        title: item.title || '',
                                        country: Array.isArray(item.country) ? item.country[0] : (item.country || 'USA'),
                                        paragraph: item.description || '',
                                        sourceLink: item.link || ''
                                      };

                                      const items = [...(editedContent?.items as any[])];
                                      items[targetNewsIndex] = mappedUpdate;
                                      handleContentChange({ ...editedContent, items });
                                      setTargetNewsIndex(null);
                                      setNewsOpen(false);
                                      toast.success('News published to update #' + (targetNewsIndex + 1));
                                    }}
                                  >
                                    Select to Publish
                                  </Button>
                                )}
                              </div>
                              <p className="font-medium text-[var(--text-primary)]">{item.title || 'Untitled'}</p>
                              {item.description && <p className="text-sm text-[var(--text-secondary)]">{item.description}</p>}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                {metadataEntries.map(([field, value]) => {
                                  const normalized = Array.isArray(value) ? value.join(', ') : typeof value === 'object' ? JSON.stringify(value) : String(value);
                                  return (
                                    <div key={`${key}-${field}`} className="rounded border border-[var(--border-color)] px-2 py-1 bg-[var(--bg-secondary)]">
                                      <span className="font-semibold text-[var(--text-primary)]">{field}: </span>
                                      <span className="text-[var(--text-muted)]">{normalized}</span>
                                    </div>
                                  );
                                })}
                              </div>
                              {item.link && (
                                <a href={item.link} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline break-all">
                                  {item.link}
                                </a>
                              )}
                            </div>
                          </div>
                        </Card>
                      </div>
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
