'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Badge, Button, Card, Input, Modal } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { listActions, type RbacAction } from '@/lib/rbac-client';
import {
  WrenchScrewdriverIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  CubeIcon,
  CommandLineIcon,
  TagIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
  POST: 'text-green-500 bg-green-500/10 border-green-500/20',
  PUT: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
  PATCH: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
  DELETE: 'text-red-500 bg-red-500/10 border-red-500/20',
};

export default function ActionsDirectoryPage() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [actions, setActions] = useState<RbacAction[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1
  });

  const fetchActions = async (page = 1) => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await listActions(token, page, 20);
      if (res.success && res.data) {
        setActions(res.data.actions || []);
        setPagination(res.data.pagination || { page: 1, limit: 20, total: 0, pages: 1 });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchActions(1);
  }, [token]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return actions;
    return actions.filter((a) =>
      `${a.actionKey} ${a.displayName || ''} ${a.description || ''} ${a.module}`.toLowerCase().includes(needle)
    );
  }, [actions, q]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      void fetchActions(newPage);
    }
  };

  return (
    <DashboardLayout
      title="Actions Directory"
      subtitle={`Explore all ${pagination.total} registered RBAC actions across the system`}
      icon={<WrenchScrewdriverIcon className="w-8 h-8 text-[var(--primary-500)]" />}
    >
      <div className="space-y-6">
        {/* Header Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2">
          <div className="relative max-w-md w-full">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by module, key, or display name..."
              className="input-field pl-10"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="secondary" 
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1 || loading}
            >
              Previous
            </Button>
            <span className="text-sm font-medium px-4 py-2 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]">
              Page {pagination.page} of {pagination.pages}
            </span>
            <Button 
              variant="secondary" 
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages || loading}
            >
              Next
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <Card key={i} className="p-6 skeleton h-32">
                <div key={i} />
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 flex flex-col items-center justify-center text-center space-y-4">
            <CommandLineIcon className="w-16 h-16 text-[var(--text-muted)] opacity-20" />
            <div>
              <p className="text-xl font-semibold">No actions found</p>
              <p className="text-[var(--text-muted)] mt-1">Try adjusting your search query or check another page.</p>
            </div>
            <Button variant="secondary" onClick={() => setQ('')}>Clear Search</Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((action) => (
              <Card key={action.id} className="group p-4 border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] transition-all flex flex-col justify-between hover:shadow-md">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 ${action.httpMethod ? METHOD_COLORS[action.httpMethod] || 'text-[var(--text-muted)] border-[var(--border-color)]' : 'text-blue-500 bg-blue-500/10 border-blue-500/20'}`}>
                      {action.httpMethod || 'API'}
                    </span>
                    <Badge variant="secondary" className="text-[10px] py-0 px-1.5 opacity-70">{action.module}</Badge>
                  </div>
                  
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-[var(--text-primary)] truncate">
                      {action.displayName || action.actionKey.split('.').pop()}
                    </h3>
                    <p className="text-[10px] font-mono text-[var(--text-muted)] truncate mt-0.5">
                      {action.actionKey}
                    </p>
                  </div>

                  {action.description && (
                    <p className="text-xs text-[var(--text-muted)] line-clamp-2 italic leading-snug">
                      {action.description}
                    </p>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between pt-3 border-t border-[var(--border-color)] opacity-60">
                   <div className="flex items-center gap-1.5">
                      <TagIcon className="w-3 h-3 text-[var(--primary-500)]" />
                      <span className="text-[10px] font-medium text-[var(--text-muted)]">Registered Action</span>
                   </div>
                   <div className="p-1 rounded bg-[var(--bg-secondary)]">
                      <CubeIcon className="w-3 h-3 text-[var(--text-muted)]" />
                   </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Bottom Pagination for better UX */}
        {!loading && filtered.length > 0 && (
          <div className="flex items-center justify-center gap-4 py-6">
            <Button 
              variant="secondary" 
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1 || loading}
            >
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                // Show pages around current page
                let pageNum = pagination.page - 2 + i;
                if (pagination.page <= 2) pageNum = i + 1;
                if (pagination.page >= pagination.pages - 1) pageNum = pagination.pages - 4 + i;
                
                if (pageNum < 1 || pageNum > pagination.pages) return null;
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${pagination.page === pageNum ? 'bg-[var(--primary-500)] text-white shadow-lg' : 'bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-color)] hover:border-[var(--primary-500)]'}`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <Button 
              variant="secondary" 
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages || loading}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
