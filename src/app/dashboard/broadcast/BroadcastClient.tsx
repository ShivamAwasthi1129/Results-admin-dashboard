'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Input, Modal, Table } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-toastify';
import {
  MegaphoneIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  MapPinIcon,
  CalendarDaysIcon,
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

interface BroadcastRecipient {
  id: string;
  fullName: string;
  email: string | null;
  phoneNumber: string | null;
}

interface Broadcast {
  id: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  radius: number;
  sentBy: string;
  sentCount: number;
  createdAt: string;
  recipients?: BroadcastRecipient[];
  sentByUser?: unknown;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages?: number;
}

function getApiBase(): string {
  if (typeof window !== 'undefined') {
    return '';
  }
  const base = process.env.NEXT_PUBLIC_APP_URL || process.env.DOMAIN_NAME || 'http://localhost:3000';
  return base.replace(/\/$/, '');
}

/** Backend domain from env (e.g. https://r3sults-backend.vercel.app) for direct API calls like view-by-id */
function getBackendBase(): string {
  const base = typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_DOMAIN_NAME || '').replace(/\/$/, '')
    : (process.env.DOMAIN_NAME || '').replace(/\/$/, '');
  return base;
}

export default function BroadcastClient() {
  const { token } = useAuth();
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Broadcast | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    latitude: '',
    longitude: '',
    radius: '',
  });

  const fetchList = useCallback(
    async (page = pagination.page) => {
      if (!token) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('limit', String(pagination.limit));
        if (search.trim()) params.set('search', search.trim());
        const base = getApiBase();
        const url = `${base}/api/admin/broadcast?${params.toString()}`;
        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          toast.error(err.message || err.error || 'Failed to load broadcasts');
          setBroadcasts([]);
          return;
        }
        const data = await res.json();
        const list = data?.data?.broadcasts ?? [];
        const pag = data?.data?.pagination ?? {};
        setBroadcasts(list);
        setPagination({
          page: pag.page ?? page,
          limit: pag.limit ?? pagination.limit,
          total: pag.total ?? 0,
          totalPages: pag.totalPages ?? (Math.ceil((pag.total ?? 0) / (pag.limit ?? 20)) || 1),
        });
      } catch (e) {
        console.error(e);
        toast.error('Failed to load broadcasts');
        setBroadcasts([]);
      } finally {
        setIsLoading(false);
      }
    },
    [token, pagination.limit, search]
  );

  useEffect(() => {
    fetchList(pagination.page);
  }, [token, pagination.page]);

  const handleSearch = () => {
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const fetchOne = async (id: string) => {
    if (!token) return;
    const backendBase = getBackendBase();
    if (!backendBase) {
      toast.error('Backend URL not configured (NEXT_PUBLIC_DOMAIN_NAME)');
      return;
    }
    try {
      const url = `${backendBase}/api/admin/broadcast/${id}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.message || data?.error || 'Broadcast not found');
        return;
      }
      const broadcast = data?.data?.broadcast ?? null;
      setSelected(broadcast);
      setDetailOpen(true);
      if (data?.message) {
        toast.success(data.message);
      }
    } catch (e) {
      toast.error('Failed to load broadcast');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error('Please log in');
      return;
    }
    const lat = parseFloat(createForm.latitude);
    const lng = parseFloat(createForm.longitude);
    const radius = parseFloat(createForm.radius);
    if (Number.isNaN(lat) || lat < -90 || lat > 90) {
      toast.error('Latitude must be between -90 and 90');
      return;
    }
    if (Number.isNaN(lng) || lng < -180 || lng > 180) {
      toast.error('Longitude must be between -180 and 180');
      return;
    }
    if (Number.isNaN(radius) || radius <= 0) {
      toast.error('Radius must be greater than 0 (meters)');
      return;
    }
    if (!createForm.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!createForm.description.trim()) {
      toast.error('Description is required');
      return;
    }
    setIsSubmitting(true);
    try {
      const base = getApiBase();
      const res = await fetch(`${base}/api/admin/broadcast`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          latitude: lat,
          longitude: lng,
          radius,
          title: createForm.title.trim(),
          description: createForm.description.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.message || data.error || 'Failed to create broadcast');
        return;
      }
      toast.success('Broadcast sent successfully');
      setCreateOpen(false);
      setCreateForm({ title: '', description: '', latitude: '', longitude: '', radius: '' });
      fetchList(pagination.page);
    } catch (e) {
      toast.error('Failed to create broadcast');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (s: string) => {
    try {
      return new Date(s).toLocaleString();
    } catch {
      return s;
    }
  };

  const totalPages = pagination.totalPages ?? (Math.ceil(pagination.total / pagination.limit) || 1);

  const columns = [
    {
      key: 'title',
      label: 'Title',
      render: (b: Broadcast) => (
        <div className="font-medium text-[var(--text-primary)]">{b.title}</div>
      ),
    },
    {
      key: 'description',
      label: 'Description',
      render: (b: Broadcast) => (
        <div className="text-sm text-[var(--text-muted)] max-w-xs truncate">{b.description}</div>
      ),
    },
    {
      key: 'location',
      label: 'Location',
      render: (b: Broadcast) => (
        <div className="text-sm text-[var(--text-secondary)] flex items-center gap-1">
          <MapPinIcon className="w-4 h-4" />
          {b.latitude.toFixed(4)}, {b.longitude.toFixed(4)} · {b.radius}m
        </div>
      ),
    },
    {
      key: 'sentCount',
      label: 'Sent',
      render: (b: Broadcast) => (
        <span className="text-[var(--text-primary)]">{b.sentCount}</span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Created',
      render: (b: Broadcast) => (
        <div className="text-sm text-[var(--text-muted)] flex items-center gap-1">
          <CalendarDaysIcon className="w-4 h-4" />
          {formatDate(b.createdAt)}
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (b: Broadcast) => (
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<EyeIcon className="w-4 h-4" />}
          onClick={(e) => {
            e.stopPropagation();
            fetchOne(b.id);
          }}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <div className="flex flex-nowrap items-center gap-2 mb-4">
          <Input
            placeholder="Search title or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className=""
          />
          <Button variant="primary" onClick={handleSearch} leftIcon={<MagnifyingGlassIcon className="w-5 h-5" />}>
            Search
          </Button>
          <Button variant="secondary" onClick={() => fetchList(pagination.page)} leftIcon={<ArrowPathIcon className="w-5 h-5" />}>
            Refresh
          </Button>
          <Button className="flex-shrink-0" variant="primary" onClick={() => setCreateOpen(true)} leftIcon={<PlusIcon className="w-5 h-5 " />}>
            Create Broadcast
          </Button>
        </div>

        <Table
          columns={columns}
          data={broadcasts}
          isLoading={isLoading}
          emptyMessage="No broadcasts found. Create one to send geo-targeted notifications."
          rowKey="id"
        />

        {pagination.total > 0 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--border-color)]">
            <p className="text-sm text-[var(--text-muted)]">
              Page {pagination.page} of {totalPages} · {pagination.total} total
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<ChevronLeftIcon className="w-4 h-4" />}
                onClick={() => setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
                disabled={pagination.page <= 1}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                rightIcon={<ChevronRightIcon className="w-4 h-4" />}
                onClick={() => setPagination((p) => ({ ...p, page: Math.min(totalPages, p.page + 1) }))}
                disabled={pagination.page >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Detail modal */}
      <Modal isOpen={detailOpen} onClose={() => { setDetailOpen(false); setSelected(null); }} title="Broadcast Details" size="lg">
        {selected && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-[var(--text-muted)]">Title</p>
              <p className="font-semibold text-[var(--text-primary)]">{selected.title}</p>
            </div>
            <div>
              <p className="text-sm text-[var(--text-muted)]">Description</p>
              <p className="text-[var(--text-secondary)]">{selected.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-[var(--text-muted)]">Latitude</p>
                <p className="text-[var(--text-primary)]">{selected.latitude}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--text-muted)]">Longitude</p>
                <p className="text-[var(--text-primary)]">{selected.longitude}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--text-muted)]">Radius (m)</p>
                <p className="text-[var(--text-primary)]">{selected.radius}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--text-muted)]">Sent count</p>
                <p className="text-[var(--text-primary)]">{selected.sentCount}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-[var(--text-muted)]">Created at</p>
              <p className="text-[var(--text-primary)]">{formatDate(selected.createdAt)}</p>
            </div>

            {selected.recipients && selected.recipients.length > 0 && (
              <div className="pt-4 border-t border-[var(--border-color)]">
                <p className="text-sm font-medium text-[var(--text-primary)] mb-2">Recipients ({selected.recipients.length})</p>
                <div className="max-h-60 overflow-y-auto rounded-lg border border-[var(--border-color)]">
                  <table className="w-full text-sm">
                    <thead className="bg-[var(--bg-input)] sticky top-0">
                      <tr>
                        <th className="text-left py-2 px-3 text-[var(--text-muted)] font-medium">Name</th>
                        <th className="text-left py-2 px-3 text-[var(--text-muted)] font-medium">Email</th>
                        <th className="text-left py-2 px-3 text-[var(--text-muted)] font-medium">Phone</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-color)]">
                      {selected.recipients.map((r) => (
                        <tr key={r.id}>
                          <td className="py-2 px-3 text-[var(--text-primary)]">{r.fullName || '—'}</td>
                          <td className="py-2 px-3 text-[var(--text-secondary)]">{r.email || '—'}</td>
                          <td className="py-2 px-3 text-[var(--text-secondary)]">{r.phoneNumber || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {selected.recipients && selected.recipients.length === 0 && (
              <div className="pt-4 border-t border-[var(--border-color)]">
                <p className="text-sm text-[var(--text-muted)]">No recipients for this broadcast.</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Create modal */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Create Broadcast" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Title"
            required
            placeholder="e.g. Storm Warning"
            value={createForm.title}
            onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
          />
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Description</label>
            <textarea
              className="input-field w-full min-h-[100px]"
              required
              placeholder="Notification body text..."
              value={createForm.description}
              onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Latitude (-90 to 90)"
              type="number"
              step="any"
              required
              placeholder="28.6139"
              value={createForm.latitude}
              onChange={(e) => setCreateForm((f) => ({ ...f, latitude: e.target.value }))}
            />
            <Input
              label="Longitude (-180 to 180)"
              type="number"
              step="any"
              required
              placeholder="77.209"
              value={createForm.longitude}
              onChange={(e) => setCreateForm((f) => ({ ...f, longitude: e.target.value }))}
            />
            <Input
              label="Radius (meters)"
              type="number"
              min="1"
              required
              placeholder="5000"
              value={createForm.radius}
              onChange={(e) => setCreateForm((f) => ({ ...f, radius: e.target.value }))}
            />
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Users within the given radius of the center (latitude, longitude) will receive this push notification and an in-app notification.
          </p>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={isSubmitting}>
              Send Broadcast
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
