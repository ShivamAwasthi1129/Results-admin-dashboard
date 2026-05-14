'use client';

import React, { useState } from 'react';
import { PlusIcon, TrashIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface JsonEditorProps {
  data: unknown;
  onChange: (data: unknown) => void;
  label?: string;
  depth?: number;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/** Collapsible, recursive JSON editor for arbitrary content */
export default function JsonFieldEditor({ data, onChange, label = 'Content', depth = 0 }: JsonEditorProps) {
  const [collapsed, setCollapsed] = useState(depth > 1);

  if (data === null || data === undefined) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-[var(--text-muted)]">{label}:</span>
        <input
          className="input-field text-sm flex-1"
          value=""
          placeholder="null"
          onChange={(e) => onChange(e.target.value || null)}
        />
      </div>
    );
  }

  if (typeof data === 'boolean') {
    return (
      <label className="flex items-center gap-2 py-1">
        <input type="checkbox" checked={data} onChange={(e) => onChange(e.target.checked)}
          className="w-4 h-4 rounded border-[var(--border-color)] text-[#991B1B] focus:ring-[#991B1B]" />
        <span className="text-sm font-medium text-[var(--text-secondary)]">{label}</span>
      </label>
    );
  }

  if (typeof data === 'number') {
    return (
      <div>
        <label className="text-xs font-medium text-[var(--text-muted)] mb-1 block">{label}</label>
        <input
          type="number"
          className="input-field text-sm"
          value={data}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
        />
      </div>
    );
  }

  if (typeof data === 'string') {
    const isLong = data.length > 80;
    const isUrl = data.startsWith('http') || data.startsWith('/');
    return (
      <div>
        <label className="text-xs font-medium text-[var(--text-muted)] mb-1 block">{label}</label>
        {isLong ? (
          <textarea
            className="input-field text-sm min-h-[70px] resize-y"
            value={data}
            onChange={(e) => onChange(e.target.value)}
          />
        ) : (
          <div className="relative">
            <input
              className="input-field text-sm"
              value={data}
              onChange={(e) => onChange(e.target.value)}
            />
            {isUrl && data.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i) && (
              <img src={data} alt="" className="mt-1 h-12 rounded border border-[var(--border-color)] object-cover" />
            )}
          </div>
        )}
      </div>
    );
  }

  if (Array.isArray(data)) {
    return (
      <div className={`rounded-xl border border-[var(--border-color)] ${depth > 0 ? 'bg-[var(--bg-secondary)]/30' : ''}`}>
        <div
          className="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-t-xl transition-colors cursor-pointer group"
          onClick={() => setCollapsed(!collapsed)}
        >
          <span className="flex items-center gap-1.5">
            {collapsed ? <ChevronRightIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
            {label} <span className="font-normal text-[var(--text-muted)]">({data.length} items)</span>
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const sample = data.length > 0 && isObject(data[0])
                ? Object.fromEntries(Object.keys(data[0]).map(k => [k, '']))
                : '';
              onChange([...data, sample]);
            }}
            className="text-xs px-2 py-1 rounded-lg bg-[var(--primary-500)]/10 text-[var(--primary-500)] hover:bg-[var(--primary-500)]/20 transition-colors"
          >
            <PlusIcon className="w-3.5 h-3.5 inline mr-0.5" /> Add
          </button>
        </div>
        {!collapsed && (
          <div className="px-3 pb-3 space-y-2">
            {data.map((item, i) => (
              <div key={i} className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-2.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-[var(--text-muted)]">Item {i + 1}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = [...data];
                      next.splice(i, 1);
                      onChange(next);
                    }}
                    className="text-xs text-red-500 hover:text-red-700 flex items-center gap-0.5"
                  >
                    <TrashIcon className="w-3.5 h-3.5" /> Remove
                  </button>
                </div>
                <JsonFieldEditor data={item} onChange={(v) => {
                  const next = [...data];
                  next[i] = v;
                  onChange(next);
                }} label={`Item ${i + 1}`} depth={depth + 1} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (isObject(data)) {
    const entries = Object.entries(data);
    return (
      <div className={`rounded-xl border border-[var(--border-color)] ${depth > 0 ? 'bg-[var(--bg-secondary)]/30' : ''}`}>
        <button
          type="button"
          className="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-t-xl transition-colors"
          onClick={() => setCollapsed(!collapsed)}
        >
          <span className="flex items-center gap-1.5">
            {collapsed ? <ChevronRightIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
            {label} <span className="font-normal text-[var(--text-muted)]">({entries.length} fields)</span>
          </span>
        </button>
        {!collapsed && (
          <div className="px-3 pb-3 space-y-3">
            {entries.map(([key, val]) => (
              <JsonFieldEditor
                key={key}
                data={val}
                onChange={(v) => onChange({ ...data, [key]: v })}
                label={key}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return <div className="text-xs text-[var(--text-muted)]">{label}: (unsupported type)</div>;
}
