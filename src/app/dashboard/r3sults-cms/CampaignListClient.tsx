"use client";
import React, { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout";
import Link from "next/link";
import {
  PlusIcon, MagnifyingGlassIcon, PencilSquareIcon,
  TrashIcon, HeartIcon, CalendarIcon, MapPinIcon,
  CurrencyDollarIcon, CheckCircleIcon, ClockIcon, XCircleIcon,
  ArrowTopRightOnSquareIcon, Squares2X2Icon, ShareIcon, ArchiveBoxIcon,
  Bars3Icon, ArrowPathIcon, XMarkIcon, ClipboardDocumentIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "@/context/AuthContext";
import QRCode from "qrcode";

const DOMAIN = "https://www.r3sults.org";

interface Campaign {
  id: string;
  title: string;
  slug: string;
  subtitle?: string;
  type: string;
  status: string;
  organization?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  bannerUrl?: string;
  primaryColor?: string;
  goalAmount?: number;
  raisedAmount?: number;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  _count: { donations: number; media: number };
}

const TYPE_CONFIG: Record<string, { label: string; emoji: string; bg: string; text: string; border: string }> = {
  DISASTER_RELIEF: { label: "Disaster Relief", emoji: "🌊", bg: "bg-red-50 dark:bg-red-950/30", text: "text-red-700 dark:text-red-400", border: "border-red-200 dark:border-red-900/40" },
  FUNDRAISING: { label: "Donation", emoji: "💰", bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-900/40" },
  EVENT: { label: "Event", emoji: "🎉", bg: "bg-purple-50 dark:bg-purple-950/30", text: "text-purple-700 dark:text-purple-400", border: "border-purple-200 dark:border-purple-900/40" },
  EMERGENCY: { label: "Emergency", emoji: "🚨", bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-700 dark:text-amber-400", border: "border-amber-200 dark:border-amber-900/40" },
  EDUCATION: { label: "Education", emoji: "📚", bg: "bg-blue-50 dark:bg-blue-950/30", text: "text-blue-700 dark:text-blue-400", border: "border-blue-200 dark:border-blue-900/40" },
  MEDICAL: { label: "Medical Aid", emoji: "🏥", bg: "bg-pink-50 dark:bg-pink-950/30", text: "text-pink-700 dark:text-pink-400", border: "border-pink-200 dark:border-pink-900/40" },
  COMMUNITY: { label: "Community", emoji: "🤝", bg: "bg-teal-50 dark:bg-teal-950/30", text: "text-teal-700 dark:text-teal-400", border: "border-teal-200 dark:border-teal-900/40" },
};

const STATUS_CONFIG: Record<string, { label: string; icon: any; bg: string; text: string; dot: string }> = {
  PUBLISHED: { label: "Published", icon: CheckCircleIcon, bg: "bg-emerald-50 text-emerald-700 border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500" },
  DRAFT: { label: "Draft", icon: ClockIcon, bg: "bg-amber-50 text-amber-700 border-amber-200", text: "text-amber-700", dot: "bg-amber-500" },
  UNPUBLISHED: { label: "Unpublished", icon: XCircleIcon, bg: "bg-theme-input text-theme-primary border-theme", text: "text-theme-primary", dot: "bg-slate-400" },
  ARCHIVED: { label: "Archived", icon: ArchiveBoxIcon, bg: "bg-gray-100 text-gray-600 border-gray-200", text: "text-gray-600", dot: "bg-gray-400" },
};

// ─── Share / QR Modal ────────────────────────────────────────────────────────
function ShareModal({ campaign, onClose }: { campaign: Campaign; onClose: () => void }) {
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const url = `${DOMAIN}/campaigns/${campaign.slug}`;

  useEffect(() => {
    QRCode.toDataURL(url, {
      width: 240,
      margin: 2,
      color: { dark: "#1e293b", light: "#ffffff" },
      errorCorrectionLevel: "H",
    }).then(setQrDataUrl).catch(console.error);
  }, [url]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Share Campaign</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Scan or share the QR code</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* QR Code */}
        <div className="flex flex-col items-center justify-center py-6 px-5 gap-4">
          {qrDataUrl ? (
            <div className="p-3 rounded-2xl bg-white border-2 border-slate-100 shadow-inner">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="Campaign QR Code" className="w-48 h-48" />
            </div>
          ) : (
            <div className="w-48 h-48 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse flex items-center justify-center">
              <span className="text-xs text-slate-400">Generating...</span>
            </div>
          )}

          {/* Campaign Info */}
          <div className="w-full space-y-2 text-center">
            <p className="font-bold text-slate-900 dark:text-white text-sm leading-snug">{campaign.title}</p>
            {campaign.organization && (
              <p className="text-xs text-slate-500 dark:text-slate-400">by {campaign.organization}</p>
            )}
            {campaign.startDate && (
              <div className="flex items-center justify-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>{new Date(campaign.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
              </div>
            )}
            {campaign.location && (
              <div className="flex items-center justify-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                <MapPinIcon className="w-3.5 h-3.5" />
                <span className="truncate max-w-[200px]">{campaign.location}</span>
              </div>
            )}
          </div>

          {/* URL display */}
          <div className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono break-all text-center">
            {url}
          </div>

          {/* Actions */}
          <div className="flex gap-2 w-full">
            <button
              onClick={handleCopy}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                copied
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300 hover:text-indigo-600"
              }`}
            >
              <ClipboardDocumentIcon className="w-3.5 h-3.5" />
              {copied ? "Copied!" : "Copy Link"}
            </button>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-all"
            >
              <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
              Open Page
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CampaignListClient() {
  const { token } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [shareModalCampaign, setShareModalCampaign] = useState<Campaign | null>(null);

  const authToken = token ?? (typeof window !== "undefined" ? localStorage.getItem("auth-token") : null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3000);
  };

  const fetchCampaigns = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "24",
        ...(search && { search }),
        ...(statusFilter !== "ALL" && { status: statusFilter }),
        ...(typeFilter !== "ALL" && { type: typeFilter }),
      });
      const res = await fetch(`/api/cms/campaigns?${params}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.success) {
        setCampaigns(data.data.campaigns);
        setTotal(data.data.total);
      }
    } catch (e) {
      console.error(e);
      showToast("Failed to load campaigns", "error");
    } finally {
      setIsLoading(false);
    }
  }, [authToken, page, search, statusFilter, typeFilter]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) return;
    setActionLoading(id);
    try {
      const res = await fetch(`/api/cms/campaigns/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.success) {
        showToast("Campaign deleted successfully");
        fetchCampaigns();
      } else {
        showToast(data.error || "Delete failed", "error");
      }
    } catch (e) {
      showToast("Network error deleting campaign", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleTogglePublish = async (campaign: Campaign) => {
    setActionLoading(campaign.id);
    const newStatus = campaign.status === "PUBLISHED" ? "UNPUBLISHED" : "PUBLISHED";
    try {
      const res = await fetch(`/api/cms/campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(newStatus === "PUBLISHED" ? "🎉 Campaign published live!" : "Campaign unpublished");
        fetchCampaigns();
      } else {
        showToast(data.error || "Update failed", "error");
      }
    } catch (e) {
      showToast("Network error updating status", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const stats = {
    total: campaigns.length,
    published: campaigns.filter(c => c.status === "PUBLISHED").length,
    drafts: campaigns.filter(c => c.status === "DRAFT").length,
    totalRaised: campaigns.reduce((sum, c) => sum + (c.raisedAmount || 0), 0),
    totalGoal: campaigns.reduce((sum, c) => sum + (c.goalAmount || 0), 0),
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-4 space-y-8 max-w-7xl mx-auto">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-theme/80 dark:border-theme">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {/* <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200/60 dark:bg-indigo-950/40 dark:text-indigo-400">
                R3sults CMS
              </span> */}
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-theme-primary tracking-tight">
              Campaigns & Drives
            </h1>
            <p className="text-sm text-theme-secondary mt-0.5">
              Create, configure, publish, and monitor your fundraising campaigns and events.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchCampaigns()}
              title="Refresh list"
              className="p-2.5 rounded-xl border border-theme bg-theme-card text-theme-secondary hover:bg-theme-secondary transition-all shadow-sm"
            >
              <ArrowPathIcon className={`w-4 h-4 ${isLoading ? "animate-spin text-indigo-600" : ""}`} />
            </button>
            <Link
              href="/dashboard/r3sults-cms/create"
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition-all duration-200 shadow-md shadow-indigo-600/20 hover:shadow-indigo-600/30"
            >
              <PlusIcon className="w-4 h-4" />
              Create Page
            </Link>
          </div>
        </div>

        {/* Modern Metrics Overview */}
        {/* <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Total Campaigns",
              value: total,
              icon: RectangleStackIcon,
              color: "text-indigo-600 dark:text-indigo-400",
              bg: "bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-100 dark:border-indigo-900/30",
            },
            {
              label: "Active & Live",
              value: stats.published,
              icon: GlobeAltIcon,
              color: "text-emerald-600 dark:text-emerald-400",
              bg: "bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/30",
            },
            {
              label: "In Draft",
              value: stats.drafts,
              icon: ClockIcon,
              color: "text-amber-600 dark:text-amber-400",
              bg: "bg-amber-50/50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/30",
            },
            {
              label: "Total Raised",
              value: `$${stats.totalRaised.toLocaleString()}`,
              icon: CurrencyDollarIcon,
              color: "text-rose-600 dark:text-rose-400",
              bg: "bg-rose-50/50 dark:bg-rose-950/30 border-rose-100 dark:border-rose-900/30",
            },
          ].map(s => (
            <div
              key={s.label}
              className={`rounded-2xl border p-5 bg-theme-card shadow-sm transition-all hover:shadow-md ${s.bg}`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-theme-secondary">
                  {s.label}
                </span>
                <div className={`p-2 rounded-xl bg-theme-card/80 dark:bg-theme-card shadow-sm ${s.color}`}>
                  <s.icon className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-theme-primary tracking-tight">{s.value}</p>
            </div>
          ))}
        </div> */}

        {/* Filter & Search Bar */}
        <div className="bg-theme-card p-4 rounded-2xl border border-theme shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-secondary" />
              <input
                type="text"
                placeholder="Search by title, organization, or location..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-theme-secondary border border-theme text-theme-primary text-sm focus:outline-none focus:border-indigo-600 transition-colors"
              />
            </div>

            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 rounded-xl bg-theme-secondary border border-theme text-theme-primary text-sm font-medium focus:outline-none focus:border-indigo-600 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="PUBLISHED">Published Live</option>
              <option value="DRAFT">Draft</option>
              <option value="UNPUBLISHED">Unpublished</option>
            </select>

            <select
              value={typeFilter}
              onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 rounded-xl bg-theme-secondary border border-theme text-theme-primary text-sm font-medium focus:outline-none focus:border-indigo-600 cursor-pointer"
            >
              <option value="ALL">All Types</option>
              <option value="DISASTER_RELIEF">Disaster Relief</option>
              <option value="FUNDRAISING">Donation Drive</option>
              <option value="EVENT">Event</option>
              <option value="EMERGENCY">Emergency Response</option>
              <option value="EDUCATION">Education</option>
              <option value="MEDICAL">Medical Aid</option>
              <option value="COMMUNITY">Community</option>
            </select>
          </div>

          <div className="flex items-center gap-1 border border-theme p-1 rounded-xl bg-theme-secondary">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-all ${viewMode === "grid" ? "bg-theme-card dark:bg-slate-700 text-indigo-600 shadow-sm" : "text-theme-secondary hover:text-theme-secondary"}`}
              title="Grid View"
            >
              <Squares2X2Icon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg transition-all ${viewMode === "table" ? "bg-theme-card dark:bg-slate-700 text-indigo-600 shadow-sm" : "text-theme-secondary hover:text-theme-secondary"}`}
              title="Table View"
            >
              <Bars3Icon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-2xl bg-theme-card border border-theme p-4 space-y-4 animate-pulse">
                <div className="h-44 bg-theme-input rounded-xl" />
                <div className="h-4 bg-theme-input rounded w-3/4" />
                <div className="h-3 bg-theme-input rounded w-1/2" />
                <div className="h-8 bg-theme-input rounded" />
              </div>
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl bg-theme-card border border-dashed border-theme dark:border-theme p-8">
            <div className="p-4 rounded-2xl bg-indigo-50 text-indigo-600 mb-3">
              <HeartIcon className="w-10 h-10" />
            </div>
            <h3 className="text-lg font-bold text-theme-primary">No campaigns found</h3>
            <p className="text-sm text-theme-secondary max-w-sm mt-1 mb-5">
              {search || statusFilter !== "ALL" || typeFilter !== "ALL"
                ? "Try adjusting your filters or search terms."
                : "Create your first professional campaign to accept donations and publish directly on r3sults.org."}
            </p>
            <Link
              href="/dashboard/r3sults-cms/create"
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition-all shadow-md"
            >
              <PlusIcon className="w-4 h-4" /> Create Page
            </Link>
          </div>
        ) : viewMode === "grid" ? (
          /* Grid View Cards */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map(campaign => {
              const typeCfg = TYPE_CONFIG[campaign.type] || TYPE_CONFIG.DISASTER_RELIEF;
              const statusCfg = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.DRAFT;
              const percentage = campaign.goalAmount && campaign.raisedAmount ? (campaign.raisedAmount / campaign.goalAmount) * 100 : 0;
              const progress = Math.min(100, percentage);
              const isOverGoal = percentage > 100;
              const primaryColor = campaign.primaryColor || "#991B1B";

              return (
                <div
                  key={campaign.id}
                  className="group rounded-2xl bg-theme-card border border-theme overflow-hidden hover:border-indigo-500/50 dark:hover:border-indigo-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/5 flex flex-col justify-between"
                >
                  <div>
                    {/* Banner Media Top */}
                    <div className="relative h-44 w-full overflow-hidden bg-theme-input">
                      {campaign.bannerUrl ? (
                        <img
                          src={campaign.bannerUrl}
                          alt={campaign.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div
                          className="flex flex-col items-center justify-center h-full"
                          style={{ background: `linear-gradient(135deg, ${primaryColor}22, ${primaryColor}08)` }}
                        >
                          <span className="text-3xl opacity-60 mb-1">{typeCfg.emoji}</span>
                          <HeartIcon className="w-8 h-8 opacity-20" style={{ color: primaryColor }} />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                      {/* Top badging */}
                      <div className="absolute top-3 left-3 flex items-center gap-1.5">
                        <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border backdrop-blur-md ${typeCfg.bg} ${typeCfg.text} ${typeCfg.border}`}>
                          {typeCfg.emoji} {typeCfg.label}
                        </span>
                      </div>

                      <div className="absolute top-3 right-3">
                        <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border backdrop-blur-md flex items-center gap-1.5 bg-theme-card/90 dark:bg-theme-card/90 ${statusCfg.text} ${statusCfg.bg}`}>
                          <div className={`w-2 h-2 rounded-full ${statusCfg.dot} animate-pulse`} />
                          {statusCfg.label}
                        </span>
                      </div>

                      {/* Bottom banner info */}
                      {campaign.location && (
                        <div className="absolute bottom-2.5 left-3 right-3 text-white/90 text-xs flex items-center gap-1 font-medium truncate">
                          <MapPinIcon className="w-3.5 h-3.5 shrink-0 text-white" />
                          <span className="truncate">{campaign.location}</span>
                        </div>
                      )}
                    </div>

                    {/* Card Body */}
                    <div className="p-5 space-y-3.5">
                      <div>
                        <h3 className="font-bold text-theme-primary text-base leading-snug line-clamp-1 group-hover:text-indigo-600 transition-colors">
                          {campaign.title}
                        </h3>
                        {campaign.subtitle ? (
                          <p className="text-xs text-theme-secondary mt-1 line-clamp-1 font-medium">
                            {campaign.subtitle}
                          </p>
                        ) : (
                          <p className="text-xs text-theme-secondary mt-1">Hosted by {campaign.organization || "R3sults"}</p>
                        )}
                      </div>

                      {/* Goal & Progress */}
                      {campaign.goalAmount ? (
                        <div className="space-y-1.5 pt-1">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-theme-primary font-bold">
                              ${(campaign.raisedAmount || 0).toLocaleString()}
                            </span>
                            <span className="text-theme-secondary">
                              Goal: ${campaign.goalAmount.toLocaleString()}
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-theme-input overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700 bg-indigo-600"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[11px] text-theme-secondary">
                            <span className={isOverGoal ? "text-emerald-500 font-bold" : ""}>
                              {isOverGoal ? `+${percentage.toFixed(0)}%` : `${percentage.toFixed(0)}%`} funded
                            </span>
                            <span>{campaign._count?.donations || 0} donors</span>
                          </div>
                        </div>
                      ) : (
                        <div className="pt-1 flex items-center justify-between text-xs text-theme-secondary">
                          <span>Ongoing drive</span>
                          <span>{campaign._count?.donations || 0} donors</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="px-5 py-3.5 border-t border-theme bg-theme-secondary flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/dashboard/r3sults-cms/${campaign.id}/edit`}
                        className="px-3 py-1.5 rounded-lg bg-theme-card border border-theme text-xs font-semibold text-theme-primary hover:border-indigo-300 hover:text-indigo-600 transition-all shadow-sm flex items-center gap-1"
                      >
                        <PencilSquareIcon className="w-3.5 h-3.5" /> Edit
                      </Link>
                      <a
                        href={`${DOMAIN}/campaigns/${campaign.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg bg-theme-card border border-theme text-theme-secondary hover:text-indigo-600 transition-all shadow-sm"
                        title="View live on r3sults.org"
                      >
                        <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                      </a>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setShareModalCampaign(campaign)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 flex items-center gap-1"
                        title="Share campaign with QR code"
                      >
                        <ShareIcon className="w-3.5 h-3.5" /> Share
                      </button>
                      <button
                        onClick={() => handleTogglePublish(campaign)}
                        disabled={actionLoading === campaign.id}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                          campaign.status === "PUBLISHED"
                            ? "bg-theme-input text-theme-secondary border-theme hover:bg-slate-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                        }`}
                      >
                        {campaign.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                      </button>
                      <button
                        onClick={() => handleDelete(campaign.id, campaign.title)}
                        disabled={actionLoading === campaign.id}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
                        title="Delete campaign"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table View */
          <div className="bg-theme-card rounded-2xl border border-theme overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-theme-secondary border-b border-theme text-xs uppercase font-bold text-theme-secondary">
                  <tr>
                    <th className="px-6 py-3.5">Campaign</th>
                    <th className="px-6 py-3.5">Type</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Raised / Goal</th>
                    <th className="px-6 py-3.5">Donors</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-[var(--border-color)]">
                  {campaigns.map(campaign => {
                    const typeCfg = TYPE_CONFIG[campaign.type] || TYPE_CONFIG.DISASTER_RELIEF;
                    const statusCfg = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.DRAFT;
                    return (
                      <tr key={campaign.id} className="hover:bg-theme-secondary/70 dark:hover:bg-theme-card/40 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {campaign.bannerUrl ? (
                              <img src={campaign.bannerUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 font-bold">
                                {typeCfg.emoji}
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-theme-primary leading-tight">{campaign.title}</p>
                              <p className="text-xs text-theme-secondary mt-0.5">{campaign.location || campaign.organization || "R3sults"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-md text-xs font-semibold border ${typeCfg.bg} ${typeCfg.text} ${typeCfg.border}`}>
                            {typeCfg.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusCfg.bg}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                            {statusCfg.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-theme-primary">${(campaign.raisedAmount || 0).toLocaleString()}</p>
                          <p className="text-xs text-theme-secondary">of ${campaign.goalAmount ? campaign.goalAmount.toLocaleString() : "No goal"}</p>
                        </td>
                        <td className="px-6 py-4 font-semibold text-theme-primary dark:text-theme-secondary">
                          {campaign._count?.donations || 0}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/dashboard/r3sults-cms/${campaign.id}/edit`}
                              className="p-1.5 text-theme-secondary hover:text-indigo-600 transition-colors"
                              title="Edit"
                            >
                              <PencilSquareIcon className="w-4 h-4" />
                            </Link>
                            <a
                              href={`${DOMAIN}/campaigns/${campaign.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 text-theme-secondary hover:text-indigo-600 transition-colors"
                              title="View Live"
                            >
                              <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                            </a>
                            <button
                              onClick={() => setShareModalCampaign(campaign)}
                              className="p-1.5 text-indigo-500 hover:text-indigo-700 transition-colors"
                              title="Share QR code"
                            >
                              <ShareIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(campaign.id, campaign.title)}
                              className="p-1.5 text-red-500 hover:text-red-700 transition-colors"
                              title="Delete"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Toast */}
        {toastMsg && (
          <div className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl text-sm font-medium animate-slide-up ${toastMsg.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
            {toastMsg.text}
          </div>
        )}

        {/* Share / QR Modal */}
        {shareModalCampaign && (
          <ShareModal
            campaign={shareModalCampaign}
            onClose={() => setShareModalCampaign(null)}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
