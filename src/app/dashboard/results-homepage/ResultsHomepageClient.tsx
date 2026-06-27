'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  CloudArrowUpIcon,
  ExclamationTriangleIcon,
  GlobeAltIcon,
  InformationCircleIcon,
  PencilSquareIcon,
  ServerStackIcon,
  SparklesIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { Badge, Button, Card, Modal } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-toastify';
import {
  fetchResultsMeta,
  fetchResultsSection,
  patchResultsSection,
  seedResultsContent,
  uploadResultsMedia,
} from '@/lib/results-cms/api';
import {
  RESULTS_SECTION_KEYS,
  RESULTS_SECTION_LABELS,
  RESULTS_SECTION_COLORS,
  RESULTS_SECTION_DESCRIPTIONS,
} from '@/lib/results-cms/types';
import type { ResultsSectionKey, ResultsMetaResponse } from '@/lib/results-cms/types';
import JsonFieldEditor from '@/lib/landing-cms/JsonFieldEditor';

/* ─── Helpers ─── */
function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

/* ─── Main Component ─── */
export default function ResultsHomepageClient() {
  const { token } = useAuth();

  // ── State: section list & selection ──────────────────────────────────────
  const [selectedSection, setSelectedSection] = useState<ResultsSectionKey>('hero');

  // ── State: metadata ───────────────────────────────────────────────────────
  const [meta, setMeta] = useState<ResultsMetaResponse['data'] | null>(null);
  const [metaLoading, setMetaLoading] = useState(true);

  // ── State: section detail ─────────────────────────────────────────────────
  const [sectionLoading, setSectionLoading] = useState(false);
  const [sectionContent, setSectionContent] = useState<Record<string, unknown> | null>(null);
  const [editedContent, setEditedContent] = useState<Record<string, unknown> | null>(null);
  const [sectionVersion, setSectionVersion] = useState<number | null>(null);
  const [sectionUpdatedAt, setSectionUpdatedAt] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // ── State: actions ────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [uploading, setUploading] = useState(false);

  // ── State: modals ─────────────────────────────────────────────────────────
  const [seedConfirmOpen, setSeedConfirmOpen] = useState(false);
  const [jsonPreviewOpen, setJsonPreviewOpen] = useState(false);

  // ── State: section load errors ────────────────────────────────────────────
  const [sectionError, setSectionError] = useState<string | null>(null);

  /* ─── Load metadata ──────────────────────────────────────────────────────── */
  const loadMeta = useCallback(async () => {
    if (!token) return;
    setMetaLoading(true);
    try {
      const res = await fetchResultsMeta(token);
      if (res.success && res.data) {
        setMeta(res.data);
      }
    } catch (e) {
      console.error('[ResultsCMS] meta load error:', e);
    } finally {
      setMetaLoading(false);
    }
  }, [token]);

  useEffect(() => { loadMeta(); }, [loadMeta]);

  /* ─── Load section content ───────────────────────────────────────────────── */
  const loadSection = useCallback(async (section: ResultsSectionKey) => {
    if (!token) return;
    setSectionLoading(true);
    setSectionError(null);
    setSectionContent(null);
    setEditedContent(null);
    setIsDirty(false);
    try {
      const res = await fetchResultsSection(section, token);
      if (res.success && res.data) {
        setSectionContent(res.data.content);
        setEditedContent(JSON.parse(JSON.stringify(res.data.content)));
        setSectionVersion(res.data.version);
        setSectionUpdatedAt(res.data.updatedAt);
        setIsDirty(false);
      } else {
        setSectionError('Section not found or content not seeded yet.');
      }
    } catch (e) {
      console.error('[ResultsCMS] section load error:', e);
      setSectionError('Failed to load section. Check network or API availability.');
    } finally {
      setSectionLoading(false);
    }
  }, [token]);

  useEffect(() => { loadSection(selectedSection); }, [selectedSection, loadSection]);

  /* ─── Handle section switch (warn if dirty) ──────────────────────────────── */
  const handleSectionSwitch = (section: ResultsSectionKey) => {
    if (isDirty) {
      if (!confirm('You have unsaved changes. Switch sections and discard them?')) return;
    }
    setSelectedSection(section);
  };

  /* ─── Content change handler ─────────────────────────────────────────────── */
  const handleContentChange = (newContent: unknown) => {
    setEditedContent(newContent as Record<string, unknown>);
    setIsDirty(true);
  };

  /* ─── Save (PATCH) ───────────────────────────────────────────────────────── */
  const handleSave = async () => {
    if (!editedContent || !token) return;
    setSaving(true);
    try {
      const res = await patchResultsSection(selectedSection, editedContent, token);
      if (res.success) {
        toast.success(res.message || `Section "${selectedSection}" saved! (v${res.data.version})`);
        setSectionContent(res.data.content);
        setEditedContent(JSON.parse(JSON.stringify(res.data.content)));
        setSectionVersion(res.data.version);
        setSectionUpdatedAt(res.data.updatedAt);
        setIsDirty(false);
        // Refresh meta version
        await loadMeta();
      } else {
        toast.error('Save failed. Please try again.');
      }
    } catch (e) {
      console.error('[ResultsCMS] save error:', e);
      toast.error('Save failed. Check network or auth.');
    } finally {
      setSaving(false);
    }
  };

  /* ─── Discard changes ────────────────────────────────────────────────────── */
  const handleDiscard = () => {
    if (!sectionContent) return;
    setEditedContent(JSON.parse(JSON.stringify(sectionContent)));
    setIsDirty(false);
    toast.info('Changes discarded.');
  };

  /* ─── Upload media ───────────────────────────────────────────────────────── */
  const handleUpload = async (file: File, fieldKey?: string): Promise<string | null> => {
    if (!token) return null;
    setUploading(true);
    try {
      const res = await uploadResultsMedia(file, selectedSection, token, fieldKey);
      if (res.success) {
        toast.success('Media uploaded! URL ready to use.');
        navigator.clipboard.writeText(res.data.url).catch(() => { });
        return res.data.url;
      } else {
        toast.error(res.message || 'Upload failed');
      }
    } catch (e) {
      console.error('[ResultsCMS] upload error:', e);
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
    return null;
  };

  /* ─── Seed content ───────────────────────────────────────────────────────── */
  const handleSeed = async () => {
    if (!token) return;
    setSeeding(true);
    setSeedConfirmOpen(false);
    try {
      const res = await seedResultsContent(token);
      if (res.success) {
        toast.success(res.message || 'Content seeded successfully!');
        await loadMeta();
        await loadSection(selectedSection);
      } else {
        toast.error(res.message || 'Seeding failed');
      }
    } catch (e) {
      console.error('[ResultsCMS] seed error:', e);
      toast.error('Seeding failed');
    } finally {
      setSeeding(false);
    }
  };

  /* ─── Render ─────────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-5">
      {/* ── Metadata Bar ── */}
      {/* <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"> */}
        {/* Left: meta info */}
        {/* <div className="flex flex-wrap items-center gap-3">
          {metaLoading ? (
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Connecting to r3sults.org CMS…
            </div>
          ) : meta ? (
            <>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  Connected
                </span>
              </div>
              {meta.version !== null && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">v{meta.version}</span>
                </div>
              )}
              {meta.updatedAt && (
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                  <InformationCircleIcon className="w-3.5 h-3.5" />
                  Last updated: <span className="font-medium text-[var(--text-secondary)]">{formatDate(meta.updatedAt)}</span>
                </div>
              )}
              <Badge variant="secondary" className="text-[10px] font-semibold">
                {meta.sections?.length ?? 9} sections
              </Badge>
            </>
          ) : (
            <div className="flex items-center gap-2 text-xs text-amber-600">
              <ExclamationTriangleIcon className="w-4 h-4" />
              Unable to connect to r3sults.org CMS
            </div>
          )}
        </div> */}

        {/* Right: action buttons */}
        {/* <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={loadMeta}
            disabled={metaLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-[var(--border-color)] hover:bg-[var(--bg-secondary)] transition-colors disabled:opacity-50"
          >
            <ArrowPathIcon className={`w-3.5 h-3.5 ${metaLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {isDirty && (
            <>
              <button
                type="button"
                onClick={handleDiscard}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-[var(--border-color)] text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] transition-colors"
              >
                <XMarkIcon className="w-3.5 h-3.5" />
                Discard
              </button>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={saving}
                className="!bg-emerald-600 hover:!bg-emerald-700 !text-white gap-1.5 animate-pulse-once"
              >
                <CloudArrowUpIcon className="w-4 h-4" />
                {saving ? 'Saving…' : 'Save Section'}
              </Button>
            </>
          )}
        </div> */}
      {/* </div> */}

      {/* ── Main Layout ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* ── Sidebar ── */}
        <div className="xl:col-span-4 2xl:col-span-3">
          <Card className="p-4 space-y-3 sticky top-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <GlobeAltIcon className="w-4 h-4" />
                r3sults.org Sections
              </h3>
              <Badge variant="secondary">{RESULTS_SECTION_KEYS.length}</Badge>
            </div>
            <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
              Select a section to load and edit its content. Changes are saved via PATCH (deep-merge).
            </p>
            <ul className="space-y-1 max-h-[60vh] overflow-y-auto pr-1">
              {RESULTS_SECTION_KEYS.map((key) => {
                const active = selectedSection === key;
                const color = RESULTS_SECTION_COLORS[key];
                const label = RESULTS_SECTION_LABELS[key];
                const desc = RESULTS_SECTION_DESCRIPTIONS[key];
                return (
                  <li key={key}>
                    <button
                      type="button"
                      onClick={() => handleSectionSwitch(key)}
                      className={`w-full text-left rounded-xl px-3 py-2.5 transition-all duration-200 border ${
                        active
                          ? 'border-[#991B1B] bg-[#991B1B]/5 shadow-sm shadow-[#991B1B]/10 dark:bg-[#991B1B]/10'
                          : 'border-transparent hover:border-[var(--border-color)] hover:bg-[var(--bg-secondary)]'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div
                          className="w-2 h-2 rounded-full shrink-0 mt-1.5"
                          style={{ backgroundColor: active ? '#991B1B' : color }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-medium truncate ${active ? 'text-[#991B1B]' : 'text-[var(--text-primary)]'}`}>
                            {label}
                          </p>
                          <p className="text-[10px] text-[var(--text-muted)] line-clamp-2 leading-relaxed mt-0.5">
                            {desc}
                          </p>
                        </div>
                        {active && (
                          <CheckCircleIcon className="w-4 h-4 text-[#991B1B] shrink-0 mt-0.5" />
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>

        {/* ── Editor Panel ── */}
        <div className="xl:col-span-8 2xl:col-span-9">
          <Card className="p-5 space-y-5">
            {sectionLoading ? (
              /* Loading skeleton */
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-10 h-10 border-4 border-[#991B1B]/30 border-t-[#991B1B] rounded-full animate-spin" />
                <p className="text-sm text-[var(--text-muted)] animate-pulse">
                  Loading <strong>{RESULTS_SECTION_LABELS[selectedSection]}</strong>…
                </p>
              </div>
            ) : sectionError ? (
              /* Error state */
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
                  <ExclamationTriangleIcon className="w-7 h-7 text-red-500" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-[var(--text-primary)]">Failed to load section</p>
                  <p className="text-sm text-[var(--text-muted)] mt-1 max-w-sm">{sectionError}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => loadSection(selectedSection)}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl border border-[var(--border-color)] hover:bg-[var(--bg-secondary)] transition-colors"
                  >
                    <ArrowPathIcon className="w-4 h-4" />
                    Retry
                  </button>
                </div>
              </div>
            ) : editedContent ? (
              <>
                {/* Section Header */}
                <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-[var(--border-color)]">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-bold text-[var(--text-primary)]">
                        {RESULTS_SECTION_LABELS[selectedSection]}
                      </h3>
                      {isDirty && (
                        <Badge variant="warning" className="text-[10px] animate-pulse">
                          unsaved changes
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      Section: <strong className="text-[var(--text-secondary)]">{selectedSection}</strong>
                      {sectionVersion !== null && (
                        <> · Version: <strong className="text-[var(--text-secondary)]">v{sectionVersion}</strong></>
                      )}
                      {sectionUpdatedAt && (
                        <> · Updated: <strong className="text-[var(--text-secondary)]">{formatDate(sectionUpdatedAt)}</strong></>
                      )}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {RESULTS_SECTION_DESCRIPTIONS[selectedSection]}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setJsonPreviewOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-[var(--border-color)] hover:bg-[var(--bg-secondary)] transition-colors"
                    >
                      <PencilSquareIcon className="w-3.5 h-3.5" />
                      JSON Preview
                    </button>
                    {isDirty && (
                      <Button
                        variant="primary"
                        onClick={handleSave}
                        disabled={saving}
                        className="!bg-emerald-600 hover:!bg-emerald-700 !text-white"
                      >
                        <CheckCircleIcon className="w-4 h-4 mr-1" />
                        {saving ? 'Saving…' : 'Save'}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Upload indicator */}
                {uploading && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-700 dark:text-blue-400">
                    <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
                    Uploading media…
                  </div>
                )}

                {/* JSON Field Editor */}
                <div className="max-h-[calc(100vh-320px)] overflow-y-auto pr-1 space-y-3">
                  <JsonFieldEditor
                    data={editedContent}
                    onChange={handleContentChange}
                    label={`${selectedSection} content`}
                    depth={0}
                    onUpload={(file) => handleUpload(file)}
                  />
                </div>

                {/* Bottom save bar (sticky-feel for long content) */}
                {isDirty && (
                  <div className="flex items-center justify-between pt-4 border-t border-[var(--border-color)]">
                    <p className="text-xs text-[var(--text-muted)] flex items-center gap-1.5">
                      <SparklesIcon className="w-3.5 h-3.5 text-amber-500" />
                      You have unsaved changes in <strong>{RESULTS_SECTION_LABELS[selectedSection]}</strong>
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleDiscard}
                        className="px-3 py-1.5 text-xs font-medium rounded-xl border border-[var(--border-color)] hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] transition-colors"
                      >
                        Discard
                      </button>
                      <Button
                        variant="primary"
                        onClick={handleSave}
                        disabled={saving}
                        className="!bg-emerald-600 hover:!bg-emerald-700 !text-white"
                      >
                        <CloudArrowUpIcon className="w-4 h-4 mr-1" />
                        {saving ? 'Saving…' : 'Save Section'}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Empty state */
              <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-red-500/20 flex items-center justify-center">
                  <SparklesIcon className="w-7 h-7 text-amber-500" />
                </div>
                <div>
                  <p className="font-semibold text-[var(--text-primary)]">No Content Found</p>
                  <p className="text-sm text-[var(--text-muted)] mt-1 max-w-sm">
                    This section hasn't been seeded yet. Click "Seed Defaults" to populate all 9 sections with default content.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSeedConfirmOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 transition-colors"
                >
                  <ServerStackIcon className="w-4 h-4" />
                  Seed Default Content
                </button>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* ── JSON Preview Modal ── */}
      <Modal isOpen={jsonPreviewOpen} onClose={() => setJsonPreviewOpen(false)} title="Section JSON Preview" size="xl">
        {editedContent ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-muted)]">
                {selectedSection} · {JSON.stringify(editedContent).length.toLocaleString()} chars
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(editedContent, null, 2));
                  toast.success('JSON copied to clipboard');
                }}
                className="text-xs px-2.5 py-1 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-secondary)] transition-colors"
              >
                Copy JSON
              </button>
            </div>
            <pre className="bg-[var(--bg-secondary)] p-4 rounded-xl text-xs overflow-auto max-h-[65vh] font-mono text-[var(--text-secondary)] border border-[var(--border-color)]">
              {JSON.stringify(editedContent, null, 2)}
            </pre>
          </div>
        ) : (
          <p className="text-[var(--text-muted)] text-sm">No content loaded.</p>
        )}
      </Modal>

      {/* ── Seed Confirmation Modal ── */}
      <Modal isOpen={seedConfirmOpen} onClose={() => setSeedConfirmOpen(false)} title="⚠️ Seed Default Content" size="md">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">This will overwrite all content</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                Seeding will reset all 9 sections on the r3sults.org backend to their default values.
                Any custom edits will be permanently lost.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setSeedConfirmOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-xl border border-[var(--border-color)] hover:bg-[var(--bg-secondary)] transition-colors"
            >
              Cancel
            </button>
            <Button
              variant="primary"
              onClick={handleSeed}
              disabled={seeding}
              className="!bg-amber-600 hover:!bg-amber-700 !text-white"
            >
              <ServerStackIcon className="w-4 h-4 mr-1.5" />
              {seeding ? 'Seeding…' : 'Yes, Seed Defaults'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
