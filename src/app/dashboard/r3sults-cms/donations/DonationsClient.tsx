"use client";
import React, { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout";
import { useAuth } from "@/context/AuthContext";
import {
  CurrencyDollarIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

interface Donation {
  id: string;
  campaignId: string;
  campaign?: { title: string; slug: string };
  donorFirstName?: string;
  donorLastName?: string;
  donorEmail?: string;
  donorPhone?: string;
  amount: number;
  currency: string;
  recurring: boolean;
  recurringInterval?: string;
  status: string;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  succeeded: "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20",
  completed: "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20",
  pending: "text-yellow-400 bg-yellow-500/10 border border-yellow-500/20",
  failed: "text-red-400 bg-red-500/10 border border-red-500/20",
  refunded: "text-blue-400 bg-blue-500/10 border border-blue-500/20",
};

export default function DonationsClient() {
  const { token } = useAuth();
  const authToken = token ?? (typeof window !== "undefined" ? localStorage.getItem("auth-token") : null);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [totalRaised, setTotalRaised] = useState(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3000);
  };

  const fetchDonations = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch campaigns to get total raised
      const campaignsRes = await fetch("/api/cms/campaigns?limit=100", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const campaignsData = await campaignsRes.json();
      if (campaignsData.success && campaignsData.data?.campaigns) {
        const raised = campaignsData.data.campaigns.reduce(
          (sum: number, c: any) => sum + (c.raisedAmount || 0),
          0
        );
        setTotalRaised(raised);
      }

      // 2. Fetch donations list from API
      let url = "/api/cms/donations?limit=100";
      if (statusFilter !== "ALL") url += `&status=${statusFilter}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.success && data.data?.donations) {
        setDonations(data.data.donations);
      }
    } catch (e) {
      console.error("Fetch donations error:", e);
    } finally {
      setIsLoading(false);
    }
  }, [authToken, search, statusFilter]);

  useEffect(() => {
    if (authToken) {
      fetchDonations();
    }
  }, [fetchDonations, authToken]);

  const handleDeleteDonation = async (d: Donation) => {
    const donorName = `${d.donorFirstName || ""} ${d.donorLastName || ""}`.trim() || d.donorEmail || "this donation";
    if (!confirm(`Are you sure you want to delete the $${d.amount} donation from ${donorName}? This will deduct $${d.amount} from the campaign's raised total.`)) {
      return;
    }

    setActionLoading(d.id);
    try {
      const res = await fetch(`/api/cms/donations?id=${d.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const result = await res.json();
      if (result.success) {
        setDonations(prev => prev.filter(item => item.id !== d.id));
        setTotalRaised(prev => Math.max(0, prev - d.amount));
        showToast("Donation deleted and campaign amount updated successfully");
      } else {
        showToast(result.error || "Failed to delete donation", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Network error deleting donation", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleExportCSV = () => {
    if (donations.length === 0) return;
    const headers = ["ID", "Donor Name", "Email", "Phone", "Campaign", "Campaign ID", "Amount", "Currency", "Type", "Status", "Date"];
    const rows = donations.map(d => [
      d.id,
      `${d.donorFirstName || ""} ${d.donorLastName || ""}`.trim() || "Anonymous",
      d.donorEmail || "",
      d.donorPhone || "",
      d.campaign?.title || "Direct Support",
      d.campaignId,
      d.amount,
      d.currency.toUpperCase(),
      d.recurring ? "Monthly" : "One-time",
      d.status,
      new Date(d.createdAt).toLocaleString()
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `donations_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[var(--bg-primary)] p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30">
              <CurrencyDollarIcon className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">All Donations</h1>
              <p className="text-sm text-[var(--text-muted)]">Across all campaigns</p>
            </div>
          </div>
          <button 
            onClick={handleExportCSV}
            disabled={donations.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowDownTrayIcon className="w-4 h-4" /> Export CSV
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Raised", value: `$${totalRaised.toLocaleString()}`, color: "text-emerald-400" },
            { label: "Total Donations", value: donations.length.toString(), color: "text-blue-400" },
            { label: "Recurring", value: donations.filter(d => d.recurring).length.toString(), color: "text-purple-400" },
            { label: "Completed", value: donations.filter(d => d.status === "succeeded" || d.status === "completed").length.toString(), color: "text-rose-400" },
          ].map(s => (
            <div key={s.label} className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] p-4">
              <p className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wide mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Table & Filtering */}
        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] overflow-hidden">
          {/* Controls Bar */}
          <div className="p-4 border-b border-[var(--border-color)] flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search donors or campaigns..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl py-2 pl-10 pr-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--border-color)] transition-all"
              />
            </div>
            
            <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
              {["ALL", "succeeded", "pending", "failed"].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shrink-0 border ${
                    statusFilter === st
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                      : "bg-[var(--bg-primary)] border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {st === "ALL" ? "All Statuses" : st}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-sm text-[var(--text-muted)]">
              Loading donation history...
            </div>
          ) : donations.length === 0 ? (
            <div className="p-12 text-center">
              <CurrencyDollarIcon className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3 opacity-50" />
              <p className="text-[var(--text-primary)] font-semibold">No donation records found</p>
              <p className="text-sm text-[var(--text-muted)] mt-1">Try broadening your search or filter settings.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-color)] bg-[var(--bg-primary)]/40 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                    <th className="px-6 py-4">Donor</th>
                    <th className="px-6 py-4">Campaign</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {donations.map((d) => (
                    <tr key={d.id} className="hover:bg-[var(--bg-primary)]/30 transition-colors text-sm">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-[var(--text-primary)]">
                          {d.donorFirstName || d.donorLastName 
                            ? `${d.donorFirstName || ""} ${d.donorLastName || ""}`.trim() 
                            : "Anonymous"}
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">{d.donorEmail || "No email"}</div>
                        {d.donorPhone && <div className="text-[10px] text-[var(--text-muted)] mt-0.5">{d.donorPhone}</div>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-[var(--text-primary)] max-w-xs truncate">
                          {d.campaign?.title || "Direct Support"}
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)]">ID: {d.campaignId}</div>
                      </td>
                      <td className="px-6 py-4 font-black text-emerald-400">
                        ${d.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <span className="text-[10px] font-normal uppercase ml-1 opacity-70">${d.currency}</span>
                      </td>
                      <td className="px-6 py-4">
                        {d.recurring ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            Monthly
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-500/10 text-[var(--text-muted)] border border-[var(--border-color)]">
                            One-time
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase border ${
                          STATUS_COLORS[d.status] || "text-slate-400 bg-slate-500/10 border-slate-500/20"
                        }`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-[var(--text-muted)]">
                        {new Date(d.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDeleteDonation(d)}
                          disabled={actionLoading === d.id}
                          className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-all disabled:opacity-50"
                          title="Delete donation and deduct from campaign"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Toast */}
        {toastMsg && (
          <div className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl text-sm font-medium ${toastMsg.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
            {toastMsg.text}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

