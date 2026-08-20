"use client";
import React from "react";
import { DashboardLayout } from "@/components/layout";
import { FilmIcon, PhotoIcon } from "@heroicons/react/24/outline";
export default function MediaLibraryClient() {
  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[var(--bg-primary)] p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/20 border border-purple-500/30"><FilmIcon className="w-6 h-6 text-purple-400" /></div>
          <div><h1 className="text-2xl font-bold text-[var(--text-primary)]">Media Library</h1><p className="text-sm text-[var(--text-muted)]">All campaign media assets</p></div>
        </div>
        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] p-8 text-center">
          <PhotoIcon className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3 opacity-50" />
          <p className="text-[var(--text-primary)] font-semibold">Media library coming soon</p>
          <p className="text-sm text-[var(--text-muted)] mt-1">All banners, logos, and images uploaded during campaign creation will appear here.</p>
        </div>
      </div>
    </DashboardLayout>
  );
}