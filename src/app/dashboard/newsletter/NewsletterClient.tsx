'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Badge, Button, Card, Input, Table } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-toastify';
import type { EditorRef } from 'react-email-editor';
import {
  ArrowPathIcon,
  BoltIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  EnvelopeIcon,
  MagnifyingGlassIcon,
  PaperAirplaneIcon,
  UsersIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';

const EmailEditor = dynamic(() => import('react-email-editor'), { ssr: false });

interface Subscriber {
  id: string;
  email: string;
  isActive: boolean;
  subscribedAt: string;
  unsubscribedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SubscribersResponse {
  success: boolean;
  data?: {
    subscribers: Subscriber[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
  message?: string;
}

interface StatsResponse {
  success: boolean;
  data?: {
    totalActive: number;
    totalInactive: number;
    total: number;
  };
  message?: string;
}

interface NewsletterTemplate {
  id: string;
  name: string;
  subject: string;
  description: string;
  html: string;
  accent: string;
}

const NEWSLETTER_TEMPLATES: NewsletterTemplate[] = [
  {
    id: 'weekly-update',
    name: 'Weekly Update',
    subject: 'Your Weekly Results Update',
    description: 'Highlights, achievements, and action items',
    html: '<div style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px"><div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden"><div style="padding:18px 24px;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff"><h1 style="margin:0;font-size:24px">Weekly Highlights</h1><p style="margin:8px 0 0 0;opacity:.9">A quick roundup from the week</p></div><div style="padding:24px"><p>Hello there, here are the top updates from this week.</p><ul><li>Key milestone #1</li><li>Key milestone #2</li><li>Upcoming action items</li></ul><p>Thank you for being with us.</p></div></div></div>',
    accent: 'from-violet-500 to-indigo-500',
  },
  {
    id: 'product-launch',
    name: 'Product Launch',
    subject: 'We just launched something new',
    description: 'Feature release with CTA and benefits',
    html: '<div style="font-family:Arial,sans-serif;background:#f3f4f6;padding:24px"><div style="max-width:640px;margin:0 auto;background:#111827;color:#f9fafb;border-radius:12px;overflow:hidden"><div style="padding:24px;border-bottom:1px solid #374151"><p style="margin:0;color:#f59e0b;font-weight:700;letter-spacing:.08em">NEW RELEASE</p><h1 style="margin:10px 0 0 0;font-size:26px">We just launched something new</h1></div><div style="padding:24px;background:#fff;color:#111827"><p>We are excited to introduce our latest release.</p><p><strong>What is new:</strong></p><ul><li>Feature A</li><li>Feature B</li><li>Performance improvements</li></ul><p><a href=\"https://r3sults-backend.vercel.app\" style=\"display:inline-block;background:#dc2626;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none\">Explore now</a></p></div></div></div>',
    accent: 'from-orange-500 to-red-500',
  },
  {
    id: 'announcement',
    name: 'Announcement',
    subject: 'Important Announcement',
    description: 'Important operational notice template',
    html: '<div style="font-family:Arial,sans-serif;background:#eef2ff;padding:24px"><div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #c7d2fe;border-radius:12px"><div style="padding:16px 24px;border-bottom:1px solid #e5e7eb;background:#eef2ff"><h1 style="margin:0;font-size:24px;color:#312e81">Important Update</h1></div><div style="padding:24px"><p>We have an important announcement for our community.</p><p>Please review the details and let us know if you have any questions.</p><p>Regards,<br/>R3sults Team</p></div></div></div>',
    accent: 'from-blue-500 to-cyan-500',
  },
];

function getBackendBase(): string {
  const raw =
    typeof window === 'undefined'
      ? process.env.NEXT_PUBLIC_DOMAIN_NAME || process.env.DOMAIN_NAME
      : process.env.NEXT_PUBLIC_DOMAIN_NAME;
  return (raw || '').trim().replace(/\/$/, '');
}

export default function NewsletterClient() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [stats, setStats] = useState({ totalActive: 0, totalInactive: 0, total: 0 });
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('active');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [subject, setSubject] = useState('');
  const [html, setHtml] = useState('<h1>Hello!</h1><p>Write your newsletter content here.</p>');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [allSelected, setAllSelected] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const emailEditorRef = useRef<EditorRef | null>(null);
  const campaignImageInputRef = useRef<HTMLInputElement | null>(null);

  const extractHtmlFromEditor = useCallback(async (): Promise<string> => {
    const editor = emailEditorRef.current?.editor;
    if (!editor) return html;
    return await new Promise((resolve) => {
      editor.exportHtml((data: { html: string }) => {
        resolve(data?.html || html);
      });
    });
  }, [html]);

  const loadTemplateIntoEditor = useCallback((templateHtml: string) => {
    const editor = emailEditorRef.current?.editor;
    if (!editor) return;
    const safeDesign = {
      body: {
        id: 'root',
        rows: [
          {
            id: 'row-1',
            cells: [1],
            columns: [
              {
                id: 'col-1',
                contents: [
                  {
                    id: 'text-1',
                    type: 'text',
                    values: {
                      containerPadding: '0px',
                      text: templateHtml,
                    },
                  },
                ],
                values: {
                  backgroundColor: '',
                  padding: '0px',
                },
              },
            ],
            values: {
              backgroundColor: '',
              columnsBackgroundColor: '',
              columnsBorderRadius: '0px',
              columnsPadding: '0px',
              hideDesktop: false,
              hideMobile: false,
              noStackMobile: false,
              padding: '0px',
            },
          },
        ],
        values: {
          backgroundColor: '#f3f4f6',
          contentWidth: '680px',
          contentAlign: 'center',
          fontFamily: {
            label: 'Arial',
            value: 'arial,helvetica,sans-serif',
          },
          preheaderText: '',
        },
      },
      counters: {
        u_row: 1,
        u_column: 1,
        u_content_text: 1,
      },
      schemaVersion: 12,
    };
    editor.loadDesign(safeDesign as unknown as object);
  }, []);

  const loadEmptyEditor = useCallback(() => {
    setSubject('New campaign');
    setHtml('');
    const editor = emailEditorRef.current?.editor;
    if (!editor) {
      toast.info('Editor is still loading — try again in a moment.');
      return;
    }
    const emptyDesign = {
      body: {
        id: 'root',
        rows: [
          {
            id: 'row-blank',
            cells: [1],
            columns: [
              {
                id: 'col-blank',
                contents: [
                  {
                    id: 'text-blank',
                    type: 'text',
                    values: {
                      containerPadding: '24px',
                      text:
                        '<p style="margin:0;color:#64748b;font-family:Arial,sans-serif">Empty canvas — add content from the toolbox or use <strong>Create new campaign</strong> to place an image.</p>',
                    },
                  },
                ],
                values: { backgroundColor: '', padding: '0px' },
              },
            ],
            values: {
              backgroundColor: '',
              columnsBackgroundColor: '',
              columnsBorderRadius: '0px',
              columnsPadding: '0px',
              hideDesktop: false,
              hideMobile: false,
              noStackMobile: false,
              padding: '0px',
            },
          },
        ],
        values: {
          backgroundColor: '#f3f4f6',
          contentWidth: '680px',
          contentAlign: 'center',
          fontFamily: {
            label: 'Arial',
            value: 'arial,helvetica,sans-serif',
          },
          preheaderText: '',
        },
      },
      counters: { u_row: 1, u_column: 1, u_content_text: 1 },
      schemaVersion: 12,
    };
    editor.loadDesign(emptyDesign as unknown as object);
    toast.success('Blank template ready — build your custom campaign.');
  }, []);

  const addImageToCanvas = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) {
        toast.error('Please choose an image file');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const html = `<div style="font-family:Arial,sans-serif;padding:16px;text-align:center"><p style="margin:0 0 12px 0;color:#64748b;font-size:14px">Campaign image</p><img src="${dataUrl}" alt="" style="max-width:100%;height:auto;border-radius:12px;display:block;margin:0 auto" /></div>`;
        setSubject((s) => s.trim() || 'New campaign');
        setHtml(html);
        loadTemplateIntoEditor(html);
        toast.success('Image added to the editor canvas');
      };
      reader.readAsDataURL(file);
    },
    [loadTemplateIntoEditor]
  );

  const backendBase = getBackendBase();

  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }),
    [token]
  );

  const fetchStats = useCallback(async () => {
    if (!token || !backendBase) return;
    try {
      const res = await fetch(`${backendBase}/api/newsletter/stats`, { headers: authHeaders });
      const data: StatsResponse = await res.json();
      if (!res.ok || !data.success || !data.data) {
        return;
      }
      setStats(data.data);
    } catch {
      // keep page usable even if stats fails
    }
  }, [authHeaders, backendBase, token]);

  const fetchSubscribers = useCallback(async () => {
    if (!token) {
      setSubscribers([]);
      return;
    }
    if (!backendBase) {
      toast.error('Backend URL not configured. Set NEXT_PUBLIC_DOMAIN_NAME in .env.local');
      setSubscribers([]);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (search.trim()) params.set('search', search.trim());
      if (status !== 'all') params.set('status', status);

      const res = await fetch(`${backendBase}/api/newsletter/subscribers?${params.toString()}`, {
        headers: authHeaders,
      });
      const data: SubscribersResponse = await res.json();

      if (!res.ok || !data.success || !data.data) {
        toast.error(data.message || 'Failed to load subscribers');
        setSubscribers([]);
        return;
      }

      setSubscribers(data.data.subscribers || []);
      setPage(data.data.pagination.page || 1);
      setPages(data.data.pagination.pages || 1);
      setTotal(data.data.pagination.total || 0);
      setSelectedIds(new Set());
      setAllSelected(false);
    } catch {
      toast.error('Failed to load subscribers');
      setSubscribers([]);
    } finally {
      setLoading(false);
    }
  }, [authHeaders, backendBase, token, page, limit, search, status]);

  useEffect(() => {
    fetchSubscribers();
  }, [fetchSubscribers]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const toggleOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
    setAllSelected(false);
  };

  const handleSelectAll = async () => {
    if (!token || !backendBase) return;
    if (allSelected) {
      setSelectedIds(new Set());
      setAllSelected(false);
      return;
    }
    try {
      const res = await fetch(`${backendBase}/api/newsletter/subscribers/all`, { headers: authHeaders });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.message || 'Failed to fetch all subscribers');
        return;
      }
      const ids = (data.data?.subscribers || []).map((s: { id: string }) => s.id);
      setSelectedIds(new Set(ids));
      setAllSelected(true);
      toast.success(`Selected ${ids.length} active subscriber(s)`);
    } catch {
      toast.error('Failed to fetch all subscribers');
    }
  };

  const handleSend = async () => {
    if (!token || !backendBase) return;
    const latestHtml = await extractHtmlFromEditor();
    setHtml(latestHtml);
    if (!subject.trim()) {
      toast.error('Subject is required');
      return;
    }
    if (!latestHtml.trim()) {
      toast.error('Newsletter HTML content is required');
      return;
    }

    const hasSelected = selectedIds.size > 0;
    const payload = hasSelected
      ? { subject: subject.trim(), html: latestHtml, emailIds: Array.from(selectedIds) }
      : { subject: subject.trim(), html: latestHtml, sendToAll: true };

    setSending(true);
    try {
      const res = await fetch(`${backendBase}/api/newsletter/send`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.message || 'Failed to send newsletter');
        return;
      }
      const d = data.data || {};
      toast.success(`Sent: ${d.sent ?? 0}, Failed: ${d.failed ?? 0}, Recipients: ${d.totalRecipients ?? 0}`);
    } catch {
      toast.error('Failed to send newsletter');
    } finally {
      setSending(false);
    }
  };

  const applyTemplate = (template: NewsletterTemplate) => {
    setSubject(template.subject);
    setHtml(template.html);
    loadTemplateIntoEditor(template.html);
  };

  const previewDocument = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${subject || 'Newsletter Preview'}</title>
    <style>
      body {
        margin: 0;
        font-family: Arial, Helvetica, sans-serif;
        background: #f7f7fb;
        color: #111827;
      }
      .mail {
        max-width: 680px;
        margin: 0 auto;
        background: #ffffff;
        border: 1px solid #e5e7eb;
        padding: 24px;
      }
      img {
        max-width: 100%;
        height: auto;
      }
      a { color: #dc2626; }
    </style>
  </head>
  <body>
    <div class="mail">
      ${html || '<p>(Empty content)</p>'}
    </div>
  </body>
</html>`;

  const columns = [
    {
      key: 'select',
      label: '',
      width: '56px',
      render: (s: Subscriber) => (
        <input
          type="checkbox"
          checked={selectedIds.has(s.id)}
          onChange={() => toggleOne(s.id)}
          className="w-4 h-4 rounded border-[var(--border-color)]"
          aria-label={`Select ${s.email}`}
        />
      ),
    },
    {
      key: 'email',
      label: 'Email',
      render: (s: Subscriber) => <span className="font-medium text-[var(--text-primary)]">{s.email}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (s: Subscriber) => (
        <Badge variant={s.isActive ? 'success' : 'secondary'}>{s.isActive ? 'active' : 'inactive'}</Badge>
      ),
    },
    {
      key: 'subscribedAt',
      label: 'Subscribed',
      render: (s: Subscriber) => (
        <span className="text-[var(--text-muted)]">{new Date(s.subscribedAt).toLocaleString()}</span>
      ),
    },
    {
      key: 'updatedAt',
      label: 'Updated',
      render: (s: Subscriber) => (
        <span className="text-[var(--text-muted)]">{new Date(s.updatedAt).toLocaleString()}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border-l-4 border-l-emerald-500">
          <p className="text-sm text-[var(--text-muted)]">Active</p>
          <p className="text-2xl font-bold text-emerald-400">{stats.totalActive}</p>
        </Card>
        <Card className="p-4 border-l-4 border-l-amber-500">
          <p className="text-sm text-[var(--text-muted)]">Inactive</p>
          <p className="text-2xl font-bold text-amber-400">{stats.totalInactive}</p>
        </Card>
        <Card className="p-4 border-l-4 border-l-purple-500">
          <p className="text-sm text-[var(--text-muted)]">Total</p>
          <p className="text-2xl font-bold text-purple-400">{stats.total}</p>
        </Card>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input
            icon={<MagnifyingGlassIcon className="w-5 h-5" />}
            placeholder="Search by email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as 'all' | 'active' | 'inactive');
              setPage(1);
            }}
            className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-[var(--text-primary)]"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            value={String(limit)}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
            className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-2 text-[var(--text-primary)]"
          >
            <option value="20">20 / page</option>
            <option value="50">50 / page</option>
            <option value="100">100 / page</option>
          </select>
          <Button variant="secondary" onClick={() => { fetchSubscribers(); fetchStats(); }} leftIcon={<ArrowPathIcon className="w-4 h-4" />}>
            Refresh
          </Button>
        </div>
      </Card>

      <Card className="p-4 space-y-4">
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={handleSelectAll} leftIcon={<UsersIcon className="w-4 h-4" />}>
              {allSelected ? 'Clear all selection' : 'Select all active'}
            </Button>
            <Badge variant="primary">{selectedIds.size} selected</Badge>
          </div>
          <div className="text-sm text-[var(--text-muted)]">Page {page} of {pages} · {total} total</div>
        </div>

        <Table columns={columns} data={subscribers} isLoading={loading} emptyMessage="No subscribers found" />

        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
            Previous
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages}>
            Next
          </Button>
        </div>
      </Card>

      <Card className="p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[var(--primary-500)]/10 border border-[var(--primary-500)]/30">
              <EnvelopeIcon className="w-5 h-5 text-[var(--primary-500)]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Campaign composer</h3>
              <p className="text-sm text-[var(--text-muted)]">Build and preview your newsletter in real-time</p>
            </div>
          </div>
          <Badge variant="primary" className="inline-flex items-center gap-1.5">
            <BoltIcon className="w-3.5 h-3.5" />
            Live editor
          </Badge>
        </div>

        <div>
          <p className="text-sm font-medium text-[var(--text-primary)] mb-2">Pre-made templates</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2">
            {NEWSLETTER_TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => applyTemplate(template)}
                className="text-left p-0 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:shadow-md hover:border-[var(--primary-500)]/40 transition-all overflow-hidden"
              >
                <div className={`h-1.5 bg-gradient-to-r ${template.accent}`} />
                <div className="p-3">
                  <p className="font-semibold text-sm text-[var(--text-primary)]">{template.name}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-1">{template.description}</p>
                  <p className="text-[11px] text-[var(--text-muted)] mt-2 line-clamp-1">Subject: {template.subject}</p>
                </div>
              </button>
            ))}
            <button
              type="button"
              onClick={loadEmptyEditor}
              className="text-left p-0 rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-card)] hover:shadow-md hover:border-violet-500/50 transition-all overflow-hidden"
            >
              <div className="h-1.5 bg-gradient-to-r from-slate-500 to-zinc-600" />
              <div className="p-3">
                <p className="font-semibold text-sm text-[var(--text-primary)]">Add new template</p>
                <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">Open an empty editor to create a custom campaign from scratch.</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => campaignImageInputRef.current?.click()}
              className="text-left p-0 rounded-xl border border-dashed border-[var(--primary-500)]/40 bg-[var(--bg-card)] hover:shadow-md hover:border-[var(--primary-500)] transition-all overflow-hidden"
            >
              <div className="h-1.5 bg-gradient-to-r from-rose-500 to-orange-500" />
              <div className="p-3 flex gap-2 items-start">
                <PhotoIcon className="w-5 h-5 text-[var(--primary-500)] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm text-[var(--text-primary)]">Create new campaign</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">Upload an image — it is placed directly in the newsletter editor canvas.</p>
                </div>
              </div>
            </button>
          </div>
          <input
            ref={campaignImageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) addImageToCanvas(f);
              e.target.value = '';
            }}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <Input
              placeholder="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-2">Compose</label>
              <div className="rounded-lg border border-[var(--border-color)] bg-white overflow-hidden">
                <EmailEditor
                  ref={emailEditorRef}
                  minHeight={420}
                  onReady={() => {
                    const editor = emailEditorRef.current?.editor as unknown as {
                      addEventListener?: (event: string, cb: () => void) => void;
                      exportHtml: (cb: (data: { html: string }) => void) => void;
                    } | undefined;
                    editor?.addEventListener?.('design:updated', () => {
                      editor.exportHtml((data: { html: string }) => {
                        setHtml(data?.html || '');
                      });
                    });
                    if (!subject.trim()) {
                      setSubject('Newsletter Campaign');
                    }
                    if (html.trim()) {
                      loadTemplateIntoEditor(html);
                    }
                  }}
                  options={{
                    appearance: {
                      theme: 'modern_light',
                      panels: {
                        tools: { dock: 'left' },
                      },
                    },
                    features: {
                      stockImages: true,
                    },
                  }}
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm text-[var(--text-muted)]">Live preview</label>
              <div className="flex items-center gap-2">
                <div className="inline-flex rounded-lg border border-[var(--border-color)] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setPreviewMode('desktop')}
                    className={`px-3 py-1.5 text-sm inline-flex items-center gap-1.5 ${previewMode === 'desktop' ? 'bg-[var(--primary-500)] text-white' : 'bg-[var(--bg-card)] text-[var(--text-primary)]'}`}
                  >
                    <ComputerDesktopIcon className="w-4 h-4" />
                    Desktop
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode('mobile')}
                    className={`px-3 py-1.5 text-sm inline-flex items-center gap-1.5 ${previewMode === 'mobile' ? 'bg-[var(--primary-500)] text-white' : 'bg-[var(--bg-card)] text-[var(--text-primary)]'}`}
                  >
                    <DevicePhoneMobileIcon className="w-4 h-4" />
                    Mobile
                  </button>
                </div>
                <Button variant="primary" onClick={handleSend} isLoading={sending} leftIcon={<PaperAirplaneIcon className="w-4 h-4" />}>
                  Send newsletter
                </Button>
              </div>
            </div>
            <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-input)] p-3 flex justify-center min-h-[420px] w-full">
              <iframe
                title="Newsletter preview"
                srcDoc={previewDocument}
                className={`h-[400px] rounded border border-[var(--border-color)] bg-white ${previewMode === 'mobile' ? 'w-[375px]' : 'w-full'}`}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center justify-between pt-1">
          <p className="text-sm text-[var(--text-muted)]">
            Sending mode: {selectedIds.size > 0 ? `selected (${selectedIds.size})` : 'all active subscribers'}
          </p>
        
        </div>
      </Card>
    </div>
  );
}

