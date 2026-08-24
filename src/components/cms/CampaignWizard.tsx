"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { DashboardLayout } from "@/components/layout";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeftIcon, ChevronRightIcon, CheckIcon, XMarkIcon,
  PhotoIcon, VideoCameraIcon, TrashIcon, ArrowUpTrayIcon,
  GlobeAltIcon, EyeIcon, PlusIcon, MinusIcon, DevicePhoneMobileIcon, ComputerDesktopIcon,
  HeartIcon, CalendarIcon, MapPinIcon, DocumentTextIcon, SwatchIcon,
  CurrencyDollarIcon, CheckCircleIcon, SparklesIcon, TagIcon,
} from "@heroicons/react/24/outline";

// ─── Types ─────────────────────────────────────────────────────────────
interface DonationTier { id: string; name: string; amount: number; description: string; }
interface WizardData {
  type: string;
  title: string; subtitle: string; fontStyle: string;
  startDate: string; endDate: string; salesOpenDate: string; salesCloseDate: string; recurrence: string;
  location: string;
  description: string;
  primaryColor: string; colorMode: string; backgroundStyle: string; backgroundTheme: string;
  bannerUrl: string; bannerPublicId: string; bannerType: string;
  logoUrl: string; logoPublicId: string;
  goalAmount: string; allowCustomAmount: boolean; tiers: DonationTier[]; allowRecurring: boolean;
  recurringIntervals: string[];
  organization: string;
}

const CAMPAIGN_TYPES = [
  { value: "DISASTER_RELIEF", label: "Disaster Relief", emoji: "🌊", desc: "Emergency fundraising for disaster victims and recovery efforts." },
  { value: "FUNDRAISING", label: "Donation", emoji: "💰", desc: "Accept one-time and recurring gifts from supporters." },
  { value: "EVENT", label: "Event", emoji: "🎉", desc: "Sell tickets, manage registrations, and raise funds." },
  { value: "EMERGENCY", label: "Emergency Response", emoji: "🚨", desc: "Rapid response campaigns for urgent crises." },
  { value: "EDUCATION", label: "Education", emoji: "📚", desc: "Support educational programs, scholarships, and learning." },
  { value: "MEDICAL", label: "Medical Aid", emoji: "🏥", desc: "Fund medical supplies, treatments, and healthcare access." },
  { value: "COMMUNITY", label: "Community", emoji: "🤝", desc: "Build and strengthen local communities and infrastructure." },
];

const FONT_STYLES = [
  { value: "Classic", label: "Classic", font: "font-serif" },
  { value: "Bubbly", label: "Bubbly", font: "font-sans font-extrabold" },
  { value: "Elegant", label: "Elegant", font: "italic font-light" },
  { value: "Slab Serif", label: "Slab Serif", font: "font-mono font-bold" },
  { value: "Futuristic", label: "Futuristic", font: "font-mono uppercase tracking-widest" },
  { value: "Handwritten", label: "Handwritten", font: "italic font-medium" },
];

const PALETTE = [
  "#991B1B","#B45309","#92400E","#1E7E3A","#065F46","#1D4ED8","#6D28D9","#BE185D","#000000","#4B5563",
];

const BG_THEMES: Record<string, string[]> = {
  Simple: [],
  Animated: ["Particles", "Waves", "Stars", "Confetti", "Bubbles"],
  "Static shapes": ["Abstract", "School", "Animals", "Aid", "Theatre", "Faith", "Environment", "Health", "Sports"],
};

const STEP_LABELS = ["Campaign Type", "Title & Style", "Dates", "Location", "Description", "Design", "Media", "Donation Setup"];

const DEFAULT_TIERS: DonationTier[] = [
  { id: "1", name: "Supporter", amount: 25, description: "Help us make a difference" },
  { id: "2", name: "Champion", amount: 50, description: "Your support goes a long way" },
  { id: "3", name: "Hero", amount: 100, description: "Be a hero for those in need" },
];

// ─── Main Wizard ─────────────────────────────────────────────────────────────
export default function CampaignWizard({ mode, campaignId }: { mode: "create" | "edit"; campaignId?: string }) {
  const { token } = useAuth();
  const router = useRouter();
  const authToken = token ?? (typeof window !== "undefined" ? localStorage.getItem("auth-token") : null);

  const [step, setStep] = useState(1);
  const [previewMode, setPreviewMode] = useState<"mobile" | "desktop">("mobile");
  const [isSaving, setIsSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(campaignId || null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertFormat = (syntax: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    let replacement = "";
    if (syntax === "B") replacement = `**${selectedText || "bold text"}**`;
    else if (syntax === "I") replacement = `*${selectedText || "italic text"}*`;
    else if (syntax === "U") replacement = `<u>${selectedText || "underlined text"}</u>`;
    else if (syntax === "list") replacement = `\n- ${selectedText || "list item"}`;
    const newValue = text.substring(0, start) + replacement + text.substring(end);
    up({ description: newValue });
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + (syntax === "list" ? 3 : 2), start + (syntax === "list" ? 3 : 2) + (selectedText || "text").length);
    }, 50);
  };

  // Google Places Autocomplete for Step 4 Location
  useEffect(() => {
    if (step === 4) {
      const scriptId = 'google-maps-places-script';
      let script = document.getElementById(scriptId) as HTMLScriptElement | null;
      
      const initAutocomplete = () => {
        const input = document.getElementById('campaign-location-input');
        if (input && (window as any).google?.maps?.places) {
          const autocomplete = new (window as any).google.maps.places.Autocomplete(input, {
            types: ['geocode'],
          });
          autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            if (place.formatted_address) {
              up({ location: place.formatted_address });
            }
          });
        }
      };

      if (!(window as any).google?.maps?.places) {
        if (!script) {
          script = document.createElement('script') as HTMLScriptElement;
          script.id = scriptId;
          script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyCfYSioz6pci4v1ryvRId9DniB_z4xNh-A&libraries=places';
          script.async = true;
          script.defer = true;
          script.onload = () => setTimeout(initAutocomplete, 200);
          document.head.appendChild(script);
        } else {
          script.addEventListener('load', () => setTimeout(initAutocomplete, 200));
        }
      } else {
        setTimeout(initAutocomplete, 100);
      }
    }
  }, [step]);

  const [data, setData] = useState<WizardData>({
    type: "", title: "", subtitle: "", fontStyle: "Classic",
    startDate: "", endDate: "", salesOpenDate: "", salesCloseDate: "", recurrence: "once",
    location: "", description: `🎉 Excitement is in the air! Get ready to be part of something extraordinary at r3sults's fundraising event. It's an event like no other, and we want you to be there! 🎉\n\nEvery registration to this event will bring us closer to achieving our mission. Together, we can create a brighter, more compassionate world for all.\n\nThank you for supporting our mission, your support is invaluable.`,
    primaryColor: "#991B1B", colorMode: "Light", backgroundStyle: "Simple", backgroundTheme: "",
    bannerUrl: "", bannerPublicId: "", bannerType: "image", logoUrl: "", logoPublicId: "",
    goalAmount: "", allowCustomAmount: true, tiers: DEFAULT_TIERS, allowRecurring: false,
    recurringIntervals: ["monthly"], organization: "R3sults",
  });

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Load existing campaign in edit mode
  useEffect(() => {
    if (mode === "edit" && campaignId) {
      fetch(`/api/cms/campaigns/${campaignId}`, { headers: { Authorization: `Bearer ${authToken}` } })
        .then(r => r.json())
        .then(d => {
          if (d.success && d.data) {
            const c = d.data;
            const dc = typeof c.donationConfig === "string" ? JSON.parse(c.donationConfig) : c.donationConfig || {};
            setData({
              type: c.type || "", title: c.title || "", subtitle: c.subtitle || "", fontStyle: c.fontStyle || "Classic",
              startDate: c.startDate ? c.startDate.substring(0, 16) : "",
              endDate: c.endDate ? c.endDate.substring(0, 16) : "",
              salesOpenDate: c.salesOpenDate ? c.salesOpenDate.substring(0, 16) : "",
              salesCloseDate: c.salesCloseDate ? c.salesCloseDate.substring(0, 16) : "",
              recurrence: c.recurrence || "once",
              location: c.location || "", description: c.description || "",
              primaryColor: c.primaryColor || "#991B1B", colorMode: c.colorMode || "Light",
              backgroundStyle: c.backgroundStyle || "Simple", backgroundTheme: c.backgroundTheme || "",
              bannerUrl: c.bannerUrl || "", bannerPublicId: c.bannerPublicId || "",
              bannerType: c.bannerType || "image", logoUrl: c.logoUrl || "", logoPublicId: c.logoPublicId || "",
              goalAmount: c.goalAmount ? String(c.goalAmount) : "",
              allowCustomAmount: dc.allowCustomAmount !== false,
              tiers: dc.tiers || DEFAULT_TIERS,
              allowRecurring: dc.allowRecurring || false,
              recurringIntervals: dc.recurringIntervals || ["monthly"],
              organization: c.organization || "R3sults",
            });
            setSavedId(c.id);
          }
        })
        .catch(console.error);
    }
  }, [mode, campaignId, authToken]);

  const up = (patch: Partial<WizardData>) => setData(prev => ({ ...prev, ...patch }));

  // Save or Publish
  const saveProgress = async (publish = false) => {
    if (!data.title.trim()) {
      showToast("Please enter a campaign title", "error");
      setStep(2);
      return;
    }
    if (!data.type) {
      showToast("Please select a campaign type", "error");
      setStep(1);
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        title: data.title,
        subtitle: data.subtitle,
        type: data.type,
        fontStyle: data.fontStyle,
        startDate: data.startDate || null,
        endDate: data.endDate || null,
        salesOpenDate: data.salesOpenDate || null,
        salesCloseDate: data.salesCloseDate || null,
        recurrence: data.recurrence,
        location: data.location,
        description: data.description,
        primaryColor: data.primaryColor,
        colorMode: data.colorMode,
        backgroundStyle: data.backgroundStyle,
        backgroundTheme: data.backgroundTheme,
        bannerUrl: data.bannerUrl,
        bannerPublicId: data.bannerPublicId,
        bannerType: data.bannerType,
        logoUrl: data.logoUrl,
        logoPublicId: data.logoPublicId,
        goalAmount: data.goalAmount ? parseFloat(data.goalAmount) : 0,
        organization: data.organization,
        donationConfig: JSON.stringify({
          allowCustomAmount: data.allowCustomAmount,
          tiers: data.tiers,
          allowRecurring: data.allowRecurring,
          recurringIntervals: data.recurringIntervals,
        }),
        status: publish ? "PUBLISHED" : "DRAFT",
      };

      let res: Response;
      if (savedId) {
        res = await fetch(`/api/cms/campaigns/${savedId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/cms/campaigns", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
          body: JSON.stringify(payload),
        });
      }

      const result = await res.json();
      if (result.success) {
        const id = result.data?.id || savedId;
        setSavedId(id);
        showToast(publish ? "🎉 Campaign published successfully!" : "Draft saved!");
        if (publish) {
          setTimeout(() => router.push("/dashboard/r3sults-cms"), 1200);
        }
      } else {
        showToast(result.error || "Save failed", "error");
      }
    } catch (e: any) {
      showToast(e.message || "Network error", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleMediaUpload = async (file: File, type: "banner" | "logo") => {
    const isBanner = type === "banner";
    const maxMB = isBanner && data.bannerType === "video" ? 5 : 2;
    if (file.size > maxMB * 1024 * 1024) {
      showToast(`File too large. Max size is ${maxMB} MB`, "error");
      return;
    }
    setUploadProgress(10);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", "campaigns");
    fd.append("resourceType", isBanner && data.bannerType === "video" ? "video" : "image");

    try {
      setUploadProgress(40);
      const res = await fetch("/api/cms/media", {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
        body: fd,
      });
      setUploadProgress(80);
      const result = await res.json();
      if (result.success && result.data) {
        const mediaData = result.data;
        if (isBanner) {
          up({ bannerUrl: mediaData.url, bannerPublicId: mediaData.publicId });
          if (savedId) {
            await fetch(`/api/cms/campaigns/${savedId}`, {
              method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
              body: JSON.stringify({ bannerUrl: mediaData.url, bannerPublicId: mediaData.publicId, bannerType: data.bannerType }),
            });
          }
        } else {
          up({ logoUrl: mediaData.url, logoPublicId: mediaData.publicId });
          if (savedId) {
            await fetch(`/api/cms/campaigns/${savedId}`, {
              method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
              body: JSON.stringify({ logoUrl: mediaData.url, logoPublicId: mediaData.publicId }),
            });
          }
        }
        showToast("Media uploaded successfully!");
        setTimeout(() => setUploadProgress(null), 1000);
      } else { showToast(result.error || "Upload failed", "error"); setUploadProgress(null); }
    } catch (e) { showToast("Upload error", "error"); setUploadProgress(null); }
  };

  const canNext = () => {
    if (step === 1 && !data.type) return false;
    if (step === 2 && !data.title.trim()) return false;
    return true;
  };

  return (
    <DashboardLayout noPadding>
      <div className="h-[calc(100vh-65px)] bg-slate-50 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="h-14 shrink-0 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-sm z-30">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/r3sults-cms" className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
              <ChevronLeftIcon className="w-4 h-4" /> Back to Campaigns
            </Link>
            <span className="text-slate-300">|</span>
            <span className="text-sm font-semibold text-slate-800">
              {mode === "create" ? "Create Campaign" : "Edit Campaign"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => saveProgress(false)} disabled={isSaving}
              className="px-4 py-1.5 rounded-xl text-sm font-medium bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-50 shadow-sm">
              {isSaving ? "Saving..." : "Save Draft"}
            </button>
            <button onClick={() => saveProgress(true)} disabled={isSaving}
              className="px-5 py-1.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-all disabled:opacity-50 shadow-sm">
              🚀 Publish
            </button>
          </div>
        </div>

        {/* Progress Steps Header */}
        <div className="h-14 shrink-0 bg-white border-b border-slate-100 px-6 flex items-center overflow-x-auto z-20">
          <div className="flex items-center gap-1 min-w-max mx-auto max-w-4xl">
            {STEP_LABELS.map((label, i) => {
              const sNum = i + 1;
              const isActive = step === sNum;
              const isDone = step > sNum;
              return (
                <React.Fragment key={label}>
                  <button onClick={() => { if (isDone || isActive) setStep(sNum); }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${isActive ? "bg-indigo-600 text-white shadow-sm" : isDone ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:text-slate-700"}`}>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${isActive ? "bg-white/20 text-white" : isDone ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                      {isDone ? <CheckIcon className="w-3 h-3" /> : sNum}
                    </span>
                    <span className="hidden sm:block">{label}</span>
                  </button>
                  {i < STEP_LABELS.length - 1 && <div className={`w-6 h-0.5 shrink-0 ${isDone ? "bg-indigo-600" : "bg-slate-200"}`} />}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Body: Left form 50% + Right preview 50% */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Form Panel (50% width, self-contained vertical scroll) */}
          <div className="w-full lg:w-1/2 h-full overflow-y-auto p-6 lg:p-10 bg-white flex flex-col justify-between border-r border-slate-200">
            <div className="max-w-xl mx-auto w-full">
              <StepContent step={step} data={data} up={up}
                onBannerUpload={(f: File) => handleMediaUpload(f, "banner")}
                onLogoUpload={(f: File) => handleMediaUpload(f, "logo")}
                bannerInputRef={bannerInputRef} logoInputRef={logoInputRef}
                uploadProgress={uploadProgress}
                textareaRef={textareaRef} onFormat={insertFormat} />
            </div>

            {/* Bottom Nav buttons */}
            <div className="max-w-xl mx-auto w-full flex items-center justify-between mt-8 pt-4 border-t border-slate-200">
              <button onClick={() => step > 1 && setStep(s => s - 1)} disabled={step === 1}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-all text-sm font-medium">
                <ChevronLeftIcon className="w-4 h-4" /> Back
              </button>
              {step < 8 ? (
                <button onClick={() => canNext() && setStep(s => s + 1)} disabled={!canNext()}
                  className="flex items-center gap-1.5 px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold text-sm transition-all shadow-sm">
                  Next <ChevronRightIcon className="w-4 h-4" />
                </button>
              ) : (
                <button onClick={() => saveProgress(true)} disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-all shadow-md shadow-emerald-900/20">
                  <CheckCircleIcon className="w-4 h-4" /> Publish Campaign
                </button>
              )}
            </div>
          </div>

          {/* Right Preview Panel (50% width, dot-grid background, centered mockups) */}
          <div className="hidden lg:flex lg:w-1/2 h-full flex-col justify-between p-6 overflow-hidden relative"
               style={{ backgroundColor: "#f8fafc", backgroundImage: "radial-gradient(#cbd5e1 1.5px, transparent 1.5px)", backgroundSize: "24px 24px" }}>
            {/* Top toggle bar */}
            <div className="flex items-center justify-center gap-2 py-1">
              <button onClick={() => setPreviewMode("mobile")}
                title="Mobile Phone preview"
                className={`p-1.5 rounded-lg transition-all ${previewMode === "mobile" ? "text-indigo-600 bg-white shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>
                <DevicePhoneMobileIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => setPreviewMode(previewMode === "mobile" ? "desktop" : "mobile")}
                className={`relative w-12 h-6 rounded-full transition-all duration-300 ${previewMode === "desktop" ? "bg-indigo-600" : "bg-slate-300"}`}>
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300 ${previewMode === "desktop" ? "translate-x-6" : "translate-x-0.5"}`} />
              </button>
              <button onClick={() => setPreviewMode("desktop")}
                title="Tablet / Desktop preview"
                className={`p-1.5 rounded-lg transition-all ${previewMode === "desktop" ? "text-indigo-600 bg-white shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>
                <ComputerDesktopIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Centered Mockup Area */}
            <div className="flex-1 flex flex-col items-center justify-center relative w-full my-auto overflow-hidden">
              {/* Sleek Tablet Frame */}
              <div className={`w-full max-w-[560px] mx-auto absolute transition-all duration-500 ease-in-out transform ${
                previewMode === "desktop"
                  ? "opacity-100 scale-100 pointer-events-auto z-10"
                  : "opacity-0 scale-95 pointer-events-none z-0"
              }`}>
                <div className="bg-[#18181b] rounded-[24px] p-2.5 shadow-2xl border-[3px] border-[#2e3035] flex flex-col">
                  {/* Browser chrome */}
                  <div className="flex items-center gap-2 px-2 py-1.5 mb-1.5">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    </div>
                    <div className="flex-1 bg-white/10 rounded-md h-4 px-2 flex items-center text-[9px] text-slate-400 font-mono">
                      r3sults.org/campaigns/preview
                    </div>
                  </div>
                  {/* Screen */}
                  <div className="bg-white rounded-[16px] overflow-hidden w-full" style={{ height: "350px" }}>
                    <div className="h-full overflow-y-auto">
                      <CampaignPreviewCard data={data} mode="desktop" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Sleek iPhone 15 Pro Frame */}
              <div className={`absolute transition-all duration-500 ease-in-out h-full flex flex-col justify-center py-2 transform ${
                previewMode === "mobile"
                  ? "opacity-100 scale-100 pointer-events-auto z-10"
                  : "opacity-0 scale-95 pointer-events-none z-0"
              }`}>
                <div className="w-[270px] h-[540px] max-h-[90%] bg-[#101014] rounded-[40px] p-[6px] shadow-2xl relative border-2 border-[#2e2f33] flex flex-col mx-auto shrink-0 min-w-0">
                  {/* Dynamic Island pill notch */}
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-4 bg-[#101014] rounded-full z-30 flex items-center justify-between px-2">
                    <div className="w-2 h-2 rounded-full bg-[#18181b] border border-slate-800" />
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/80 opacity-60" />
                  </div>
                  {/* Screen */}
                  <div className="bg-white rounded-[34px] overflow-hidden w-full flex-1 flex flex-col relative shadow-inner">
                    <div className="h-full overflow-y-auto hide-scrollbar">
                      <CampaignPreviewCard data={data} mode="mobile" />
                    </div>
                  </div>
                  {/* Home indicator bar */}
                  <div className="flex justify-center pt-2 ">
                    <div className="w-24 h-1 rounded-full bg-slate-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom helper text */}
            <p className="text-center text-[11px] text-slate-500 py-1">
              All changes can be edited later.
            </p>
          </div>
        </div>

        {/* Toast */}
        {toastMsg && (
          <div className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl text-sm font-medium animate-slide-up ${toastMsg.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
            {toastMsg.text}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

// ─── Step Content Router ─────────────────────────────────────────────────────────────
function StepContent({ step, data, up, onBannerUpload, onLogoUpload, bannerInputRef, logoInputRef, uploadProgress, textareaRef, onFormat }: any) {
  switch (step) {
    case 1: return <Step1Type data={data} up={up} />;
    case 2: return <Step2Title data={data} up={up} />;
    case 3: return <Step3Dates data={data} up={up} />;
    case 4: return <Step4Location data={data} up={up} />;
    case 5: return <Step5Description data={data} up={up} textareaRef={textareaRef} onFormat={onFormat} />;
    case 6: return <Step6Style data={data} up={up} />;
    case 7: return <Step7Media data={data} up={up} onBannerUpload={onBannerUpload} onLogoUpload={onLogoUpload} bannerInputRef={bannerInputRef} logoInputRef={logoInputRef} uploadProgress={uploadProgress} />;
    case 8: return <Step8DonationConfig data={data} up={up} />;
    default: return null;
  }
}

// ─── Step 1: Type ─────────────────────────────────────────────────────────────
function Step1Type({ data, up }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">What campaign do you want to create?</h2>
        <p className="text-sm text-slate-500 mt-1">Select a campaign type to get started. You can adjust donation options later.</p>
      </div>
      <div className="space-y-2">
        {CAMPAIGN_TYPES.map(t => {
          const isSelected = data.type === t.value;
          return (
            <button key={t.value} onClick={() => up({ type: t.value })}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 text-left transition-all ${isSelected ? "border-indigo-600 bg-indigo-50/40 shadow-sm" : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50/50"}`}>
              <span className="text-2xl">{t.emoji}</span>
              <div className="flex-1">
                <p className={`font-semibold text-sm ${isSelected ? "text-indigo-900" : "text-slate-800"}`}>{t.label}</p>
                <p className="text-[11px] text-slate-500 mt-0">{t.desc}</p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? "border-indigo-600" : "border-slate-300"}`}>
                {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 2: Title & Font ─────────────────────────────────────────────────────
function Step2Title({ data, up }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Title your campaign</h2>
        <p className="text-sm text-slate-500 mt-1">Give your campaign a compelling, clear name and tagline.</p>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-800 mb-1.5">Title *</label>
          <input type="text" value={data.title} onChange={e => up({ title: e.target.value })}
            placeholder="e.g. Annual Gala"
            className="w-full px-4 py-3 rounded-xl bg-white border border-slate-300 text-slate-800 focus:outline-none focus:border-indigo-600 transition-colors text-base font-medium" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-800 mb-1.5">Subtitle / Tagline (optional)</label>
          <input type="text" value={data.subtitle} onChange={e => up({ subtitle: e.target.value })}
            placeholder="e.g. A night of hope, celebration, and giving back"
            className="w-full px-4 py-3 rounded-xl bg-white border border-slate-300 text-slate-800 focus:outline-none focus:border-indigo-600 transition-colors text-sm" />
          <p className="text-xs text-slate-400 mt-1">This appears directly below the title on your campaign page.</p>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-800 mb-1.5">Organization Name</label>
          <input type="text" value={data.organization} onChange={e => up({ organization: e.target.value })}
            placeholder="R3sults"
            className="w-full px-4 py-3 rounded-xl bg-white border border-slate-300 text-slate-800 focus:outline-none focus:border-indigo-600 transition-colors text-sm" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-800 mb-2">Font Style</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {FONT_STYLES.map(f => (
              <button key={f.value} onClick={() => up({ fontStyle: f.value })}
                className={`p-3.5 rounded-xl border-2 text-center transition-all ${data.fontStyle === f.value ? "border-indigo-600 bg-indigo-50/40 text-indigo-900 shadow-sm" : "border-slate-200 hover:border-indigo-200 bg-white text-slate-700"}`}>
                <span className={`text-sm ${f.font}`}>{f.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step 3: Dates ────────────────────────────────────────────────────────────
function Step3Dates({ data, up }: any) {
  const datesSelected = !!data.startDate && !!data.endDate;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Set date(s) for your campaign</h2>
        <p className="text-sm text-slate-500 mt-1">You can choose one date range or leave blank for ongoing campaigns.</p>
      </div>
      <div className="space-y-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <span className="font-semibold text-slate-800 text-sm">Campaign Dates</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Start Date</label>
            <input 
              type="datetime-local" 
              value={data.startDate} 
              onChange={e => {
                const newStart = e.target.value;
                const patch: any = { startDate: newStart };
                if (data.salesOpenDate && newStart && data.salesOpenDate < newStart) {
                  patch.salesOpenDate = newStart;
                }
                if (data.salesCloseDate && newStart && data.salesCloseDate < newStart) {
                  patch.salesCloseDate = newStart;
                }
                up(patch);
              }}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 focus:outline-none focus:border-indigo-600 text-sm" 
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">End Date</label>
            <input 
              type="datetime-local" 
              value={data.endDate} 
              onChange={e => {
                const newEnd = e.target.value;
                const patch: any = { endDate: newEnd };
                if (data.salesOpenDate && newEnd && data.salesOpenDate > newEnd) {
                  patch.salesOpenDate = newEnd;
                }
                if (data.salesCloseDate && newEnd && data.salesCloseDate > newEnd) {
                  patch.salesCloseDate = newEnd;
                }
                up(patch);
              }}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 focus:outline-none focus:border-indigo-600 text-sm" 
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Campaign Recurrence</label>
          <select value={data.recurrence} onChange={e => up({ recurrence: e.target.value })}
            className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 focus:outline-none focus:border-indigo-600 text-sm">
            <option value="once">Occurs once</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
      </div>
      <div
        className={`space-y-4 p-5 rounded-2xl border shadow-sm transition-all duration-300 ${
          !datesSelected
            ? "opacity-50 bg-slate-50 border-slate-100 cursor-not-allowed"
            : "bg-white border-slate-200"
        }`}
      >
        <span className={`font-semibold text-sm ${!datesSelected ? "text-slate-400" : "text-slate-800"}`}>Donation Window</span>
        {!datesSelected && (
          <p className="text-xs text-amber-600 font-medium">⚠️ Please select Campaign Start &amp; End Dates first to enable the donation window.</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Donations Open</label>
            <input 
              type="datetime-local" 
              value={data.salesOpenDate} 
              disabled={!datesSelected}
              min={data.startDate || undefined}
              max={data.endDate || undefined}
              onChange={e => {
                let val = e.target.value;
                if (data.startDate && val < data.startDate) val = data.startDate;
                if (data.endDate && val > data.endDate) val = data.endDate;
                up({ salesOpenDate: val });
              }}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 focus:outline-none focus:border-indigo-600 text-sm disabled:cursor-not-allowed disabled:opacity-60 disabled:pointer-events-none" 
            />
            <p className="text-xs text-slate-400 mt-1">If empty, opens on campaign creation.</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Donations Close</label>
            <input 
              type="datetime-local" 
              value={data.salesCloseDate} 
              disabled={!datesSelected}
              min={data.salesOpenDate || data.startDate || undefined}
              max={data.endDate || undefined}
              onChange={e => {
                let val = e.target.value;
                const minVal = data.salesOpenDate || data.startDate;
                if (minVal && val < minVal) val = minVal;
                if (data.endDate && val > data.endDate) val = data.endDate;
                up({ salesCloseDate: val });
              }}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 focus:outline-none focus:border-indigo-600 text-sm disabled:cursor-not-allowed disabled:opacity-60" 
            />
            <p className="text-xs text-slate-400 mt-1">If empty, closes when campaign ends.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step 4: Location ─────────────────────────────────────────────────────────
function Step4Location({ data, up }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Set the location of your campaign</h2>
        <p className="text-sm text-slate-500 mt-1">Let donors know where the impact will be. Leave blank for global campaigns.</p>
      </div>
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <label className="block text-sm font-semibold text-slate-800 mb-2">📍 Location / Impact Area</label>
        <input type="text" value={data.location} onChange={e => up({ location: e.target.value })}
          id="campaign-location-input" placeholder="e.g. Houston, Texas or Southern United States"
          className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 focus:outline-none focus:border-indigo-600 transition-colors text-sm" />
        <p className="text-xs text-slate-400 mt-2">Start typing to see Google address suggestions, or leave blank for virtual campaigns.</p>
      </div>
      <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100">
        <p className="text-sm text-indigo-700 font-medium">💡 Tip</p>
        <p className="text-xs text-slate-600 mt-0.5">Being specific about location builds trust. Add a city, state, country, or describe the affected region.</p>
      </div>
    </div>
  );
}

// ─── Step 5: Description ──────────────────────────────────────────────────────
function Step5Description({ data, up, textareaRef, onFormat }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Tell us more about your campaign</h2>
        <p className="text-sm text-slate-500 mt-1">Inspire supporters by sharing the story, goals, and impact.</p>
      </div>
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <label className="block text-sm font-semibold text-slate-800 mb-2">Description</label>
        <div className="flex items-center gap-2 p-1.5 mb-2 rounded-xl bg-slate-50 border border-slate-200">
          <button type="button" onClick={() => onFormat("B")} className="w-8 h-8 rounded-lg bg-white hover:bg-indigo-50 border border-slate-300 text-slate-800 text-xs font-bold flex items-center justify-center transition-all">B</button>
          <button type="button" onClick={() => onFormat("I")} className="w-8 h-8 rounded-lg bg-white hover:bg-indigo-50 border border-slate-300 text-slate-800 text-xs italic flex items-center justify-center transition-all">I</button>
          <button type="button" onClick={() => onFormat("U")} className="w-8 h-8 rounded-lg bg-white hover:bg-indigo-50 border border-slate-300 text-slate-800 text-xs underline flex items-center justify-center transition-all">U</button>
          <button type="button" onClick={() => onFormat("list")} className="px-2.5 h-8 rounded-lg bg-white hover:bg-indigo-50 border border-slate-300 text-slate-800 text-xs flex items-center justify-center transition-all">• List</button>
          <div className="w-px h-5 bg-slate-300" />
          <span className="text-xs text-slate-500">Formatting Tools</span>
        </div>
        <textarea ref={textareaRef} value={data.description} onChange={e => up({ description: e.target.value })} rows={8}
          placeholder="Tell your story..."
          className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 focus:outline-none focus:border-indigo-600 transition-colors resize-none text-sm leading-relaxed" />
        <p className="text-xs text-slate-400 mt-1.5">{data.description ? data.description.length : 0} characters</p>
      </div>
    </div>
  );
}

// ─── Step 6: Style ────────────────────────────────────────────────────────────
function Step6Style({ data, up }: any) {
  const bgStyleModes = Object.keys(BG_THEMES);
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Style your campaign</h2>
        <p className="text-sm text-slate-500 mt-1">Choose colors and visual style that match your campaign's tone.</p>
      </div>
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
        <label className="block text-sm font-semibold text-slate-800">Primary Color</label>
        <div className="flex items-center gap-2 flex-wrap">
          {PALETTE.map(color => (
            <button key={color} onClick={() => up({ primaryColor: color })}
              className={`w-9 h-9 rounded-xl border-2 transition-all flex items-center justify-center ${data.primaryColor === color ? "border-slate-800 scale-110 shadow-md" : "border-transparent hover:scale-105"}`}
              style={{ background: color }}>
              {data.primaryColor === color && <CheckIcon className="w-4 h-4 text-white" />}
            </button>
          ))}
          <div className="flex items-center gap-2">
            <input type="color" value={data.primaryColor} onChange={e => up({ primaryColor: e.target.value })}
              className="w-9 h-9 rounded-xl border-2 border-slate-300 cursor-pointer bg-transparent" />
            <span className="text-xs text-slate-500">Custom</span>
          </div>
        </div>
      </div>
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
        <label className="block text-sm font-semibold text-slate-800">Display Mode</label>
        <div className="grid grid-cols-2 gap-2.5">
          {["Light", "Dark"].map(m => (
            <button key={m} onClick={() => up({ colorMode: m })}
              className={`py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${data.colorMode === m ? "border-indigo-600 bg-indigo-50/50 text-indigo-900 shadow-sm" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
              {m === "Light" ? "☀️ Light Mode" : "🌙 Dark Mode"}
            </button>
          ))}
        </div>
      </div>
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
        <label className="block text-sm font-semibold text-slate-800">Background Style</label>
        <div className="grid grid-cols-3 gap-2">
          {bgStyleModes.map(style => (
            <button key={style} onClick={() => up({ backgroundStyle: style, backgroundTheme: style === "Animated" ? "Particles" : (style === "Static shapes" ? "Abstract" : "") })}
              className={`py-2.5 rounded-xl text-xs font-semibold border-2 transition-all ${data.backgroundStyle === style ? "border-indigo-600 bg-indigo-50/50 text-indigo-900 shadow-sm" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
              {style}
            </button>
          ))}
        </div>
        {BG_THEMES[data.backgroundStyle]?.length > 0 && (
          <div>
            <p className="text-xs text-slate-500 mb-2">Select a theme:</p>
            <div className="grid grid-cols-3 gap-2">
              {BG_THEMES[data.backgroundStyle].map((theme: string) => (
                <button key={theme} onClick={() => up({ backgroundTheme: theme })}
                  className={`py-2 rounded-xl text-xs font-medium border transition-all ${data.backgroundTheme === theme ? "border-indigo-600 bg-indigo-600 text-white shadow-sm" : "border-slate-200 text-slate-600 hover:border-indigo-200"}`}>
                  {theme}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Step 7: Media ────────────────────────────────────────────────────────────
function Step7Media({ data, up, onBannerUpload, onLogoUpload, bannerInputRef, logoInputRef, uploadProgress }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Add campaign media</h2>
        <p className="text-sm text-slate-500 mt-1">Upload a banner (max 2 MB image / 5 MB video) and optional logo.</p>
      </div>
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-slate-800">Campaign Banner</label>
          {data.bannerUrl && (
            <button onClick={() => up({ bannerUrl: "", bannerPublicId: "" })} className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1">
              <TrashIcon className="w-3.5 h-3.5" /> Remove
            </button>
          )}
        </div>
        <div className="flex gap-4">
          {["image", "video"].map(t => (
            <label key={t} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="bannerType" value={t} checked={data.bannerType === t} onChange={() => up({ bannerType: t })} className="accent-indigo-600" />
              <span className="text-sm text-slate-700 capitalize">{t === "image" ? "🖼️ Image" : "🎬 Video"}</span>
            </label>
          ))}
        </div>
        <input ref={bannerInputRef} type="file" accept={data.bannerType === "image" ? "image/*" : "video/*"}
          className="hidden" onChange={e => e.target.files?.[0] && onBannerUpload(e.target.files[0])} />
        {data.bannerUrl ? (
          <div className="relative rounded-xl overflow-hidden aspect-video border border-slate-200 bg-slate-950 flex items-center justify-center">
            {data.bannerType === "video"
              ? <video src={data.bannerUrl} className="w-full h-full object-contain" controls />
              : <img src={data.bannerUrl} alt="Banner" className="w-full h-full object-contain" />}
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-3 z-10">
              <button onClick={() => bannerInputRef.current?.click()} className="px-3 py-1.5 bg-white text-black rounded-xl text-xs font-semibold">Replace</button>
              <button onClick={() => up({ bannerUrl: "", bannerPublicId: "" })} className="px-3 py-1.5 bg-red-600 text-white rounded-xl text-xs font-semibold">Delete</button>
            </div>
          </div>
        ) : (
          <button onClick={() => bannerInputRef.current?.click()}
            className="w-full aspect-video rounded-xl border-2 border-dashed border-slate-300 hover:border-indigo-400 flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-indigo-600 transition-all bg-slate-50/50">
            {data.bannerType === "image" ? <PhotoIcon className="w-10 h-10 text-slate-400" /> : <VideoCameraIcon className="w-10 h-10 text-slate-400" />}
            <span className="text-sm font-medium">Click to upload {data.bannerType}</span>
            <span className="text-xs text-slate-400">Max {data.bannerType === "image" ? "2 MB" : "5 MB"}</span>
          </button>
        )}
        {uploadProgress !== null && (
          <div className="space-y-1">
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-600 transition-all duration-300 rounded-full" style={{ width: `${uploadProgress}%` }} />
            </div>
            <p className="text-xs text-slate-500">Uploading... {uploadProgress}%</p>
          </div>
        )}
      </div>
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-slate-800">Organization Logo <span className="text-slate-400 font-normal">(optional)</span></label>
          {data.logoUrl && (
            <button onClick={() => up({ logoUrl: "", logoPublicId: "" })} className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1">
              <TrashIcon className="w-3.5 h-3.5" /> Remove
            </button>
          )}
        </div>
        <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && onLogoUpload(e.target.files[0])} />
        {data.logoUrl ? (
          <div className="relative w-28 h-28 rounded-xl overflow-hidden border border-slate-200">
            <img src={data.logoUrl} alt="Logo" className="w-full h-full object-contain" />
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
              <button onClick={() => logoInputRef.current?.click()} className="px-2 py-1 bg-white text-black rounded-lg text-xs font-semibold">Replace</button>
            </div>
          </div>
        ) : (
          <button onClick={() => logoInputRef.current?.click()}
            className="w-28 h-28 rounded-xl border-2 border-dashed border-slate-300 hover:border-indigo-400 flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-indigo-600 transition-all bg-slate-50/50">
            <PhotoIcon className="w-6 h-6 text-slate-400" />
            <span className="text-xs">Upload logo</span>
          </button>
        )}
        <p className="text-xs text-slate-400">Square logo recommended. Max 2 MB.</p>
      </div>
    </div>
  );
}

// ─── Step 8: Donation Config ──────────────────────────────────────────────────
function Step8DonationConfig({ data, up }: any) {
  const addTier = () => {
    const newTier: DonationTier = { id: Date.now().toString(), name: "New Tier", amount: 10, description: "" };
    up({ tiers: [...data.tiers, newTier] });
  };
  const removeTier = (id: string) => up({ tiers: data.tiers.filter((t: DonationTier) => t.id !== id) });
  const updateTier = (id: string, patch: Partial<DonationTier>) =>
    up({ tiers: data.tiers.map((t: DonationTier) => t.id === id ? { ...t, ...patch } : t) });
  const toggleInterval = (interval: string) => {
    const curr: string[] = data.recurringIntervals;
    up({ recurringIntervals: curr.includes(interval) ? curr.filter((i: string) => i !== interval) : [...curr, interval] });
  };
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Donation Configuration</h2>
        <p className="text-sm text-slate-500 mt-1">Set up donation tiers, goals, and recurring options.</p>
      </div>
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
        <label className="block text-sm font-semibold text-slate-800">💰 Fundraising Goal (USD)</label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
          <input type="number" value={data.goalAmount} onChange={e => up({ goalAmount: e.target.value })}
            placeholder="0 = No goal"
            className="w-full pl-8 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 focus:outline-none focus:border-indigo-600 transition-colors text-sm" />
        </div>
        <p className="text-xs text-slate-400">Leave 0 or empty if you don't have a specific target goal.</p>
      </div>
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-slate-800">💝 Donation Tiers</label>
          <button onClick={addTier} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-all">
            <PlusIcon className="w-3.5 h-3.5" /> Add Tier
          </button>
        </div>
        <div className="space-y-2">
          {data.tiers.map((tier: DonationTier) => (
            <div key={tier.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-600 mb-1 block">Tier Name</label>
                  <input type="text" value={tier.name} onChange={e => updateTier(tier.id, { name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-800 text-sm focus:outline-none focus:border-indigo-600" />
                </div>
                <div>
                  <label className="text-xs text-slate-600 mb-1 block">Amount ($)</label>
                  <input type="number" value={tier.amount} onChange={e => updateTier(tier.id, { amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-800 text-sm focus:outline-none focus:border-indigo-600" />
                </div>
              </div>
              <div className="flex gap-2">
                <input type="text" value={tier.description} onChange={e => updateTier(tier.id, { description: e.target.value })}
                  placeholder="Tier description (optional)"
                  className="flex-1 px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-800 text-sm focus:outline-none focus:border-indigo-600" />
                <button onClick={() => removeTier(tier.id)} className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 transition-all">
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
        <label className="flex items-center gap-3 cursor-pointer pt-2" onClick={() => up({ allowCustomAmount: !data.allowCustomAmount })}>
          <div className={`relative w-11 h-6 rounded-full transition-colors ${data.allowCustomAmount ? "bg-indigo-600" : "bg-slate-300"}`}>
            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${data.allowCustomAmount ? "translate-x-5" : "translate-x-0.5"}`} />
          </div>
          <span className="text-sm text-slate-800 font-medium">Allow custom donation amounts</span>
        </label>
      </div>
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        <label className="flex items-center gap-3 cursor-pointer" onClick={() => up({ allowRecurring: !data.allowRecurring })}>
          <div className={`relative w-11 h-6 rounded-full transition-colors ${data.allowRecurring ? "bg-indigo-600" : "bg-slate-300"}`}>
            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${data.allowRecurring ? "translate-x-5" : "translate-x-0.5"}`} />
          </div>
          <span className="text-sm font-semibold text-slate-800">🔄 Enable Recurring Donations</span>
        </label>
        {data.allowRecurring && (
          <div>
            <p className="text-xs text-slate-500 mb-2">Select allowed recurring intervals:</p>
            <div className="flex flex-wrap gap-2">
              {["weekly", "monthly", "quarterly", "yearly"].map(interval => (
                <button key={interval} onClick={() => toggleInterval(interval)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border-2 capitalize transition-all ${data.recurringIntervals.includes(interval) ? "border-indigo-600 bg-indigo-50 text-indigo-900 font-semibold" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                  {interval}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Preview Card & Background ───────────────────────────────────────────────
function getPreviewBackgroundStyle(data: any, isDark: boolean, primaryColor: string) {
  const bgColor = isDark ? "#0f1117" : "#ffffff";
  const textColor = isDark ? "#f1f5f9" : "#0f172a";
  let styles: any = {
    background: bgColor,
    color: textColor,
    position: "relative" as const,
    transition: "all 0.3s ease",
  };

  if (data.backgroundStyle === "Animated") {
    if (data.backgroundTheme === "Particles") {
      styles.background = `radial-gradient(${primaryColor}1a 2px, transparent 2px)`;
      styles.backgroundSize = "16px 16px";
    } else if (data.backgroundTheme === "Waves") {
      styles.background = `linear-gradient(135deg, ${bgColor} 60%, ${primaryColor}11 100%)`;
    } else if (data.backgroundTheme === "Stars") {
      styles.background = isDark
        ? "radial-gradient(circle at 50% 50%, #1e1b4b 0%, #020617 100%)"
        : "radial-gradient(circle at 50% 50%, #e0e7ff 0%, #ffffff 100%)";
    } else if (data.backgroundTheme === "Confetti") {
      styles.background = `repeating-linear-gradient(45deg, ${primaryColor}08 0px, ${primaryColor}08 2px, transparent 2px, transparent 8px)`;
    } else if (data.backgroundTheme === "Bubbles") {
      styles.background = `radial-gradient(circle, ${primaryColor}15 10%, transparent 10%), radial-gradient(circle, ${primaryColor}08 20%, transparent 20%)`;
      styles.backgroundSize = "30px 30px, 60px 60px";
    } else {
      styles.background = `linear-gradient(to bottom, ${bgColor}, ${primaryColor}0a)`;
    }
  } else if (data.backgroundStyle === "Static shapes") {
    if (data.backgroundTheme === "Abstract") {
      styles.background = `linear-gradient(135deg, ${primaryColor}0d 0%, ${bgColor} 50%, ${primaryColor}05 100%)`;
    } else if (data.backgroundTheme === "Environment") {
      styles.background = isDark ? "linear-gradient(to bottom right, #022c22, #020617)" : "linear-gradient(to bottom right, #f0fdf4, #ffffff)";
    } else if (data.backgroundTheme === "Health" || data.backgroundTheme === "Aid") {
      styles.background = isDark ? "linear-gradient(to right, #450a0a, #020617)" : "linear-gradient(to right, #fef2f2, #ffffff)";
    } else if (data.backgroundTheme === "School") {
      styles.background = isDark ? "linear-gradient(135deg, #1e1b4b, #020617)" : "linear-gradient(135deg, #eff6ff, #ffffff)";
    } else if (data.backgroundTheme === "Sports") {
      styles.background = isDark ? "linear-gradient(to right, #052e16, #020617)" : "linear-gradient(to right, #f0fdf4, #ecfdf5)";
    } else if (data.backgroundTheme === "Faith") {
      styles.background = isDark ? "linear-gradient(135deg, #2e1065, #020617)" : "linear-gradient(135deg, #faf5ff, #ffffff)";
    } else if (data.backgroundTheme === "Animals") {
      styles.background = isDark ? "linear-gradient(to bottom right, #78350f, #020617)" : "linear-gradient(to bottom right, #fef3c7, #ffffff)";
    } else if (data.backgroundTheme === "Theatre") {
      styles.background = isDark ? "linear-gradient(to bottom right, #831843, #020617)" : "linear-gradient(to bottom right, #fce7f3, #ffffff)";
    } else {
      styles.background = `radial-gradient(${primaryColor}0d 1.5px, transparent 0)`;
      styles.backgroundSize = "24px 24px";
    }
  }

  return styles;
}

function CampaignPreviewCard({ data, mode }: { data: any; mode: "mobile" | "desktop" }) {
  const fontClass = FONT_STYLES.find(f => f.value === data.fontStyle)?.font || "";
  const isDark = data.colorMode === "Dark";
  const primaryColor = data.primaryColor || "#991B1B";
  const textColor = isDark ? "#f1f5f9" : "#0f172a";
  const mutedColor = isDark ? "#94a3b8" : "#64748b";
  const bgStyle = getPreviewBackgroundStyle(data, isDark, primaryColor);

  // ─── Desktop / Tablet View (2 Columns matching Zeffy desktop reference) ──────
  if (mode === "desktop") {
    return (
      <div className="w-full min-h-full p-4 flex flex-col justify-between text-[11px] relative overflow-hidden" style={bgStyle}>
        <BackgroundEffects data={data} isDark={isDark} primaryColor={primaryColor} />
        <div className="grid grid-cols-2 gap-4 items-start relative z-10">
          {/* Left Column: Banner + Hosted by + Description */}
          <div className="space-y-2.5">
            <div className="relative rounded-xl overflow-hidden bg-slate-950 flex flex-col items-center justify-center" style={{ background: data.bannerUrl ? "#090d16" : `linear-gradient(135deg,${primaryColor}44,${primaryColor}11)` }}>
              {data.bannerUrl ? (
                <>
                  {data.bannerType === "video" ? (
                    <video src={data.bannerUrl} className="relative z-10 w-full h-auto max-h-[400px] object-contain" autoPlay loop muted />
                  ) : (
                    <img src={data.bannerUrl} alt={data.title || "Banner"} className="relative z-10 w-full h-auto max-h-[400px] object-contain" />
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center w-full aspect-[4/3]"><HeartIcon className="w-10 h-10 opacity-30" style={{ color: primaryColor }} /></div>
              )}
            </div>
            {/* Hosted by */}
            <div className="flex items-center gap-1.5">
              {data.logoUrl
                ? <img src={data.logoUrl} alt="Logo" className="w-4 h-4 rounded-full object-contain bg-white p-0.5" />
                : <div className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold text-white" style={{ background: primaryColor }}>{(data.organization || "R")[0]}</div>
              }
              <span className="text-[10px] font-semibold" style={{ color: mutedColor }}>Hosted by {data.organization || "r3sults"}</span>
            </div>
            {/* Description */}
            <div className="space-y-1 pt-1">
              <p className="font-bold text-[10px]" style={{ color: textColor }}>About this event</p>
              <p className="text-[9px] line-clamp-3 leading-relaxed break-words" style={{ color: mutedColor }}>
                {data.description || "Excitement is in the air! Get ready to be part of something extraordinary..."}
              </p>
            </div>
          </div>

          {/* Right Column: Title + Subtitle + Dates + Tickets / Donate */}
          <div className="space-y-2">
            <div>
              <h2 className={`text-base font-extrabold leading-tight break-words ${fontClass}`} style={{ color: textColor }}>
                {data.title || "Campaign Title"}
              </h2>
              {/* Step 2 Subtitle / Tagline display */}
              {data.subtitle && (
                <p className="text-[11px] font-medium leading-normal mt-1 break-words" style={{ color: primaryColor }}>
                  {data.subtitle}
                </p>
              )}
            </div>

            {/* Date and Location pills */}
            <div className="space-y-1 text-[10px]">
              {data.startDate && (
                <div className="flex items-center gap-1.5" style={{ color: mutedColor }}>
                  <CalendarIcon className="w-3.5 h-3.5 shrink-0" style={{ color: primaryColor }} />
                  <span>{new Date(data.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} {new Date(data.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              )}
              {data.location && (
                <div className="flex items-center gap-1.5" style={{ color: mutedColor }}>
                  <MapPinIcon className="w-3.5 h-3.5 shrink-0" style={{ color: primaryColor }} />
                  <span className="truncate">{data.location}</span>
                </div>
              )}
            </div>

            {/* Goal Progress Bar */}
            {data.goalAmount && (
              <div className="space-y-1">
                <div className="flex justify-between text-[9px]" style={{ color: mutedColor }}>
                  <span className="font-bold" style={{ color: primaryColor }}>$0 raised</span>
                  <span>Goal: ${parseFloat(data.goalAmount || "0").toLocaleString()}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: primaryColor + "22" }}>
                  <div className="h-full rounded-full" style={{ background: primaryColor, width: "0%" }} />
                </div>
              </div>
            )}

            {/* Tiers list */}
            <div className="space-y-1.5">
              {data.tiers.slice(0, 2).map((tier: DonationTier) => (
                <div key={tier.id} className="p-2 rounded-xl border flex items-center justify-between" style={{ borderColor: primaryColor + "33", background: "rgba(255,255,255,0.6)" }}>
                  <div className="min-w-0 mr-2 flex-1">
                    <span className="text-[10px] font-bold block truncate" style={{ color: textColor }}>{tier.name}</span>
                    <span className="text-[11px] font-extrabold" style={{ color: primaryColor }}>${tier.amount}</span>
                  </div>
                  <button className="px-2.5 py-1 rounded-lg text-white text-[9px] font-bold shadow-sm shrink-0" style={{ background: primaryColor }}>
                    Select
                  </button>
                </div>
              ))}
            </div>

            <button className="w-full py-2 rounded-xl text-white text-xs font-bold shadow-md" style={{ background: primaryColor }}>
              Donate Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Mobile View (Phone Frame matching Zeffy reference) ──────────────────────
  return (
    <div className="w-full min-h-full flex flex-col relative overflow-hidden min-w-0" style={bgStyle}>
      <BackgroundEffects data={data} isDark={isDark} primaryColor={primaryColor} />
      {/* Banner image */}
      <div className="relative overflow-hidden shrink-0 z-10 flex flex-col items-center justify-center" style={{ background: data.bannerUrl ? "transparent" : `linear-gradient(135deg,${primaryColor}66,${primaryColor}22)` }}>
        {data.bannerUrl ? (
          <>
            {data.bannerType === "video" ? (
              <video src={data.bannerUrl} className="relative z-10 w-full h-auto max-h-[350px] object-contain block" autoPlay loop muted />
            ) : (
              <img src={data.bannerUrl} alt={data.title || "Banner"} className="relative z-10 w-full h-auto max-h-[350px] object-contain block" />
            )}
          </>
        ) : (
          <div className="flex items-center justify-center w-full h-[170px]"><HeartIcon className="w-12 h-12 opacity-30" style={{ color: primaryColor }} /></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none z-20" />
      </div>

      {/* Content */}
      <div className="p-4 space-y-3 flex-1 relative z-10 min-w-0 w-full" style={{ color: textColor }}>
        {/* Organization row */}
        <div className="flex items-center gap-2">
          {data.logoUrl
            ? <img src={data.logoUrl} alt="Logo" className="w-6 h-6 rounded-full object-contain bg-white p-0.5 border border-gray-200 shrink-0" />
            : <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: primaryColor }}>{(data.organization || "R")[0]}</div>
          }
          <span className="text-xs font-semibold truncate" style={{ color: mutedColor }}>{data.organization || "r3sults"}</span>
        </div>

        {/* Sales badge */}
        {data.salesOpenDate && (
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium border max-w-full" style={{ borderColor: primaryColor + "66", color: primaryColor, background: primaryColor + "11" }}>
            <CalendarIcon className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">Sales open on {new Date(data.salesOpenDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
          </div>
        )}

        {/* Title */}
        <div className="min-w-0 w-full break-words">
          <h3 className={`text-lg font-bold leading-tight break-words ${fontClass}`} style={{ color: textColor }}>
            {data.title || "Campaign Title"}
          </h3>
          {/* Step 2 Subtitle / Tagline display */}
          {data.subtitle && (
            <p className="text-xs font-medium leading-normal mt-1 break-words" style={{ color: primaryColor }}>
              {data.subtitle}
            </p>
          )}
        </div>

        {/* Date & Time card */}
        {data.startDate && (
          <div className="flex items-center gap-3 text-xs p-2 rounded-xl border min-w-0 w-full" style={{ borderColor: primaryColor + "22", background: primaryColor + "08" }}>
            <div className="flex flex-col items-center justify-center w-8 h-8 rounded-lg bg-white shadow-sm font-bold shrink-0" style={{ color: primaryColor }}>
              <span className="text-[8px] uppercase">{new Date(data.startDate).toLocaleDateString("en-US", { month: "short" })}</span>
              <span className="text-xs leading-none">{new Date(data.startDate).getDate()}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-xs truncate" style={{ color: textColor }}>
                {new Date(data.startDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              </p>
              <p className="text-[10px] truncate" style={{ color: mutedColor }}>
                {new Date(data.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {data.endDate && <> – {new Date(data.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</>}
              </p>
            </div>
          </div>
        )}

        {/* Location card — text wraps, never overflows the phone frame */}
        {data.location && (
          <div className="flex items-start gap-2 text-xs p-2 rounded-xl border min-w-0 w-full overflow-hidden" style={{ borderColor: primaryColor + "22", background: primaryColor + "08", color: mutedColor }}>
            <MapPinIcon className="w-4 h-4 shrink-0 mt-0.5" style={{ color: primaryColor }} />
            <span className="break-words whitespace-normal text-xs font-medium min-w-0 flex-1" style={{ color: textColor, wordBreak: "break-word", overflowWrap: "anywhere" }}>{data.location}</span>
          </div>
        )}

        {/* Description snippet */}
        {data.description && (
          <p className="text-xs leading-relaxed line-clamp-2 break-words" style={{ color: mutedColor }}>{data.description}</p>
        )}

        {/* Goal Progress */}
        {data.goalAmount && (
          <div className="w-full">
            <div className="flex justify-between text-xs mb-1" style={{ color: mutedColor }}>
              <span className="font-bold shrink-0" style={{ color: primaryColor }}>$0 raised</span>
              <span className="truncate ml-2">${parseFloat(data.goalAmount || "0").toLocaleString()} goal</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: primaryColor + "22" }}>
              <div className="h-full rounded-full" style={{ background: primaryColor, width: "0%" }} />
            </div>
          </div>
        )}

        {/* Tiers */}
        {data.tiers.slice(0, 2).map((tier: DonationTier) => (
          <div key={tier.id} className="p-2.5 rounded-xl border flex items-center justify-between min-w-0 w-full" style={{ borderColor: primaryColor + "33" }}>
            <div className="min-w-0 flex-1 mr-2">
              <span className="text-xs font-semibold block truncate" style={{ color: textColor }}>{tier.name}</span>
              {tier.description && <p className="text-[10px] mt-0.5 truncate" style={{ color: mutedColor }}>{tier.description}</p>}
            </div>
            <span className="text-sm font-bold shrink-0" style={{ color: primaryColor }}>${tier.amount}</span>
          </div>
        ))}

        {/* CTA Button */}
        <button className="w-full py-2.5 rounded-xl text-white text-sm font-bold mt-1 shadow-md shrink-0" style={{ background: primaryColor }}>
          Donate Now
        </button>
      </div>
    </div>
  );
}

// ─── Background Effects Component and Logic ─────────────────────────────────
const BACKGROUND_ANIMATIONS_CSS = `
  @keyframes drift-particle {
    0% { transform: translateY(0) translateX(0); opacity: 0.1; }
    50% { transform: translateY(-40px) translateX(20px); opacity: 0.5; }
    100% { transform: translateY(-80px) translateX(-10px); opacity: 0.1; }
  }
  @keyframes twinkle-star {
    0%, 100% { opacity: 0.2; transform: scale(0.8); }
    50% { opacity: 1; transform: scale(1.2); }
  }
  @keyframes rise-bubble {
    0% { transform: translateY(110%) scale(0.8); opacity: 0; }
    10% { opacity: 0.4; }
    90% { opacity: 0.4; }
    100% { transform: translateY(-10%) scale(1.1); opacity: 0; }
  }
  @keyframes fall-confetti {
    0% { transform: translateY(-20px) rotate(0deg) translateX(0px); opacity: 1; }
    50% { transform: translateY(200px) rotate(180deg) translateX(15px); opacity: 0.8; }
    100% { transform: translateY(400px) rotate(360deg) translateX(-15px); opacity: 0; }
  }
  @keyframes move-wave {
    0% { transform: translateX(0) translateZ(0) scaleY(1); }
    50% { transform: translateX(-25%) translateZ(0) scaleY(0.85); }
    100% { transform: translateX(-50%) translateZ(0) scaleY(1); }
  }
`;

function BackgroundEffects({ data, isDark, primaryColor }: { data: any; isDark: boolean; primaryColor: string }) {
  const { backgroundStyle, backgroundTheme } = data;
  if (backgroundStyle === "Simple" || !backgroundStyle) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
      <style dangerouslySetInnerHTML={{ __html: BACKGROUND_ANIMATIONS_CSS }} />
      {backgroundStyle === "Animated" && <AnimatedEffects theme={backgroundTheme} primaryColor={primaryColor} />}
      {backgroundStyle === "Static shapes" && <StaticShapeEffects theme={backgroundTheme} primaryColor={primaryColor} isDark={isDark} />}
    </div>
  );
}

function AnimatedEffects({ theme, primaryColor }: { theme: string; primaryColor: string }) {
  const particleConfig = useRef(Array.from({ length: 15 }).map((_, i) => ({
    left: `${(i * 7 + 13) % 100}%`,
    top: `${(i * 13 + 7) % 100}%`,
    size: `${(i % 3) * 2 + 3}px`,
    delay: `${(i * 0.3) % 5}s`,
    duration: `${(i * 1.5) % 8 + 8}s`,
  })));

  const starConfig = useRef(Array.from({ length: 15 }).map((_, i) => ({
    left: `${(i * 9 + 5) % 100}%`,
    top: `${(i * 11 + 17) % 80}%`,
    size: `${(i % 2) * 1.5 + 2}px`,
    delay: `${(i * 0.4) % 4}s`,
    duration: `${(i % 3) * 1 + 2}s`,
  })));

  const bubbleConfig = useRef(Array.from({ length: 12 }).map((_, i) => ({
    left: `${(i * 8 + 6) % 100}%`,
    size: `${(i % 3) * 4 + 8}px`,
    delay: `${(i * 0.5) % 6}s`,
    duration: `${(i * 1.2) % 6 + 6}s`,
    drift: `${((i % 2 === 0 ? 1 : -1) * (i * 5 + 10))}px`,
  })));

  const confettiColors = ["#f43f5e", "#3b82f6", "#10b981", "#eab308", "#8b5cf6", "#f97316"];
  const confettiConfig = useRef(Array.from({ length: 18 }).map((_, i) => ({
    left: `${(i * 6 + 4) % 100}%`,
    color: confettiColors[i % confettiColors.length],
    w: `${(i % 3) * 2 + 6}px`,
    h: `${(i % 4) * 3 + 8}px`,
    delay: `${(i * 0.3) % 5}s`,
    duration: `${(i * 0.8) % 4 + 4}s`,
  })));

  if (theme === "Particles") {
    return (
      <>
        {particleConfig.current.map((p, idx) => (
          <div
            key={idx}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
              backgroundColor: primaryColor,
              opacity: 0.15,
              animationName: "drift-particle",
              animationDuration: p.duration,
              animationTimingFunction: "linear",
              animationIterationCount: "infinite",
              animationDelay: p.delay,
            }}
          />
        ))}
      </>
    );
  }

  if (theme === "Stars") {
    return (
      <>
        {starConfig.current.map((s, idx) => (
          <div
            key={idx}
            className="absolute pointer-events-none flex items-center justify-center animate-pulse"
            style={{
              left: s.left,
              top: s.top,
              width: s.size,
              height: s.size,
              animationName: "twinkle-star",
              animationDuration: s.duration,
              animationTimingFunction: "ease-in-out",
              animationIterationCount: "infinite",
              animationDelay: s.delay,
            }}
          >
            <svg viewBox="0 0 24 24" className="w-full h-full fill-current animate-spin" style={{ color: primaryColor, animationDuration: "12s" }}>
              <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5Z" />
            </svg>
          </div>
        ))}
      </>
    );
  }

  if (theme === "Bubbles") {
    return (
      <>
        {bubbleConfig.current.map((b, idx) => (
          <div
            key={idx}
            className="absolute rounded-full border pointer-events-none"
            style={{
              left: b.left,
              bottom: "-20px",
              width: b.size,
              height: b.size,
              borderColor: `${primaryColor}44`,
              background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.8) 0%, ${primaryColor}11 100%)`,
              animationName: "rise-bubble",
              animationDuration: b.duration,
              animationTimingFunction: "ease-in",
              animationIterationCount: "infinite",
              animationDelay: b.delay,
            }}
          />
        ))}
      </>
    );
  }

  if (theme === "Confetti") {
    return (
      <>
        {confettiConfig.current.map((c, idx) => (
          <div
            key={idx}
            className="absolute pointer-events-none"
            style={{
              left: c.left,
              top: "-20px",
              width: c.w,
              height: c.h,
              backgroundColor: c.color,
              borderRadius: "2px",
              animationName: "fall-confetti",
              animationDuration: c.duration,
              animationTimingFunction: "linear",
              animationIterationCount: "infinite",
              animationDelay: c.delay,
            }}
          />
        ))}
      </>
    );
  }

  if (theme === "Waves") {
    return (
      <div className="absolute inset-x-0 bottom-0 h-20 overflow-hidden pointer-events-none opacity-20">
        <svg className="absolute w-[200%] h-full bottom-0 left-0" viewBox="0 0 1200 120" preserveAspectRatio="none" style={{ animation: "move-wave 12s linear infinite" }}>
          <path d="M0,60 C150,90 350,30 500,60 C650,90 850,30 1000,60 C1150,90 1350,30 1500,60 L1500,120 L0,120 Z" fill={primaryColor} />
        </svg>
        <svg className="absolute w-[200%] h-full bottom-0 left-0 opacity-70" viewBox="0 0 1200 120" preserveAspectRatio="none" style={{ animation: "move-wave 8s linear infinite", animationDirection: "reverse" }}>
          <path d="M0,50 C180,80 380,20 540,50 C700,80 900,20 1060,50 C1220,80 1420,20 1580,50 L1580,120 L0,120 Z" fill={primaryColor} />
        </svg>
      </div>
    );
  }

  return null;
}

function StaticShapeEffects({ theme, primaryColor, isDark }: { theme: string; primaryColor: string; isDark: boolean }) {
  const opacityClass = isDark ? "opacity-[0.18]" : "opacity-[0.13]";
  const strokeColor = primaryColor;

  const renderIcon = (type: string) => {
    switch (type) {
      case "leaf":
        return (
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z M12 2v20 M8 12h8" stroke={strokeColor} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        );
      case "book":
        return (
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5V4.5z" stroke={strokeColor} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        );
      case "cap":
        return (
          <path d="M12 2L2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M22 7v10" stroke={strokeColor} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        );
      case "heart":
        return (
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill={strokeColor} />
        );
      case "cross":
        return (
          <path d="M12 2v20 M7 8h10" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />
        );
      case "aid-cross":
        return (
          <path d="M19 10.5h-5.5V5h-3v5.5H5v3h5.5V19h3v-5.5H19v-3z" fill={strokeColor} />
        );
      case "music":
        return (
          <path d="M9 18V5l12-2v13 M9 10l12-2 M9 21a3 3 0 1 1-3-3 3 3 0 0 1 3 3zm12-2a3 3 0 1 1-3-3 3 3 0 0 1 3 3z" stroke={strokeColor} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        );
      case "paw":
        return (
          <path d="M12 14a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm-4-4a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm8 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-6-6a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm4 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z" fill={strokeColor} />
        );
      case "tree":
        return (
          <path d="M12 2L3 17h6v5h6v-5h6L12 2z" stroke={strokeColor} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        );
      case "globe":
        return (
          <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M2 12h20 M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke={strokeColor} strokeWidth="1.5" fill="none" />
        );
      case "trophy":
        return (
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55.45 1 1 1h2c.55 0 1-.45 1-1v-2.34M12 2a6 6 0 0 1 6 6v3a6 6 0 0 1-6 6 6 6 0 0 1-6-6V8a6 6 0 0 1 6-6z" stroke={strokeColor} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        );
      case "circle":
        return <circle cx="12" cy="12" r="10" stroke={strokeColor} strokeWidth="1.5" fill="none" />;
      case "triangle":
        return <path d="M12 2L2 22h20L12 2z" stroke={strokeColor} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />;
      case "square":
        return <rect x="3" y="3" width="18" height="18" rx="2" stroke={strokeColor} strokeWidth="1.5" fill="none" />;
      default:
        return <circle cx="12" cy="12" r="4" fill={strokeColor} />;
    }
  };

  const getIconsForTheme = (t: string): string[] => {
    switch (t) {
      case "Abstract": return ["circle", "triangle", "square", "circle", "triangle", "square"];
      case "School": return ["book", "cap", "book", "cap", "book", "cap"];
      case "Animals": return ["paw", "leaf", "paw", "leaf", "paw", "leaf"];
      case "Aid": return ["heart", "aid-cross", "heart", "aid-cross", "heart", "aid-cross"];
      case "Theatre": return ["music", "circle", "music", "circle", "music", "circle"];
      case "Faith": return ["cross", "circle", "cross", "circle", "cross", "circle"];
      case "Environment": return ["leaf", "tree", "globe", "leaf", "tree", "globe"];
      case "Health": return ["heart", "aid-cross", "heart", "aid-cross", "heart", "aid-cross"];
      case "Sports": return ["trophy", "circle", "trophy", "circle", "trophy", "circle"];
      default: return ["circle", "triangle", "square", "circle", "triangle", "square"];
    }
  };

  const icons = getIconsForTheme(theme);

  const positions = [
    { top: "5%",  left: "5%",  transform: "rotate(15deg) scale(4)" },
    { top: "10%", right: "5%", transform: "rotate(-25deg) scale(5)" },
    { top: "45%", left: "2%",  transform: "rotate(10deg) scale(3.5)" },
    { top: "40%", right: "2%", transform: "rotate(-15deg) scale(3.5)" },
    { bottom: "10%", left: "8%",  transform: "rotate(-10deg) scale(4)" },
    { bottom: "5%",  right: "8%", transform: "rotate(30deg) scale(3.5)" },
  ];

  return (
    <>
      {positions.map((pos, idx) => (
        <svg
          key={idx}
          viewBox="0 0 24 24"
          className={`absolute pointer-events-none w-8 h-8 ${opacityClass}`}
          style={{
            ...pos,
            transition: "all 0.5s ease",
          } as any}
        >
          {renderIcon(icons[idx % icons.length])}
        </svg>
      ))}
    </>
  );
}
