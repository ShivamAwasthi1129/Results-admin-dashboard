import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function makeSlug(title: string) {
  return title.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").substring(0, 80);
}

const SAMPLE_CAMPAIGNS = [
  {
    title: "Hurricane Relief Fund 2026",
    subtitle: "Emergency aid for Gulf Coast communities hit hardest",
    type: "DISASTER_RELIEF",
    organization: "R3sults",
    location: "Gulf Coast, Texas & Louisiana",
    description: "Every registration to this event will bring us closer to achieving our mission. Together, we can create a brighter, more compassionate world for all. Thank you for supporting our mission, your support is invaluable.",
    primaryColor: "#991B1B",
    colorMode: "Light",
    backgroundStyle: "Static shapes",
    backgroundTheme: "Health",
    goalAmount: 150000,
    status: "PUBLISHED",
    startDate: new Date("2026-08-01"),
    endDate: new Date("2026-12-31"),
    donationConfig: JSON.stringify({ allowCustomAmount: true, allowRecurring: true, recurringIntervals: ["monthly", "weekly"], tiers: [{ id: "1", name: "Supporter", amount: 25, description: "Emergency supplies for one family" }, { id: "2", name: "Champion", amount: 100, description: "Funds clean water for a week" }, { id: "3", name: "Hero", amount: 500, description: "Helps rebuild a damaged home" }, { id: "4", name: "Guardian", amount: 1000, description: "Sponsors full community recovery kit" }] }),
  },
  {
    title: "Annual Gala Fundraiser 2026",
    subtitle: "A night of hope, celebration, and giving back",
    type: "EVENT",
    organization: "R3sults",
    location: "Houston Convention Center, Houston TX",
    description: "Join us for an extraordinary evening of giving and celebration. Every ticket purchase directly supports our relief programs.",
    primaryColor: "#6D28D9",
    colorMode: "Light",
    backgroundStyle: "Animated",
    backgroundTheme: "Particles",
    goalAmount: 75000,
    status: "PUBLISHED",
    startDate: new Date("2026-09-18T16:00:00"),
    endDate: new Date("2026-09-18T20:00:00"),
    salesOpenDate: new Date("2026-08-20"),
    salesCloseDate: new Date("2026-09-17"),
    recurrence: "once",
    donationConfig: JSON.stringify({ allowCustomAmount: false, allowRecurring: false, recurringIntervals: [], tiers: [{ id: "1", name: "General Admission", amount: 50, description: "Full program access" }, { id: "2", name: "VIP Table", amount: 250, description: "Reserved VIP table with dinner" }, { id: "3", name: "Platinum Sponsor", amount: 1000, description: "Full sponsorship with speaking slot" }] }),
  },
  {
    title: "Education for Every Child",
    subtitle: "Help us put books in the hands of 10,000 children",
    type: "EDUCATION",
    organization: "R3sults",
    location: "United States",
    description: "Education is the most powerful tool we have. Help us provide every child with the materials they need to succeed.",
    primaryColor: "#1D4ED8",
    colorMode: "Light",
    backgroundStyle: "Static shapes",
    backgroundTheme: "School",
    goalAmount: 50000,
    status: "PUBLISHED",
    startDate: new Date("2026-08-15"),
    endDate: new Date("2026-11-30"),
    donationConfig: JSON.stringify({ allowCustomAmount: true, allowRecurring: true, recurringIntervals: ["monthly", "yearly"], tiers: [{ id: "1", name: "Book Sponsor", amount: 15, description: "Provides one full set of textbooks" }, { id: "2", name: "Class Sponsor", amount: 75, description: "Supplies an entire classroom" }, { id: "3", name: "School Sponsor", amount: 500, description: "Equips an entire school library" }] }),
  },
  {
    title: "Medical Aid for Flood Survivors",
    subtitle: "Providing critical medical care in flood-affected regions",
    type: "MEDICAL",
    organization: "R3sults",
    location: "Bihar & Assam, India",
    description: "Floods have devastated communities. Your donation directly funds medical teams, medicine, and emergency healthcare.",
    primaryColor: "#BE185D",
    colorMode: "Light",
    backgroundStyle: "Static shapes",
    backgroundTheme: "Health",
    goalAmount: 25000,
    status: "PUBLISHED",
    startDate: new Date("2026-07-01"),
    endDate: new Date("2026-10-31"),
    donationConfig: JSON.stringify({ allowCustomAmount: true, allowRecurring: false, recurringIntervals: [], tiers: [{ id: "1", name: "First Aid Kit", amount: 20, description: "Basic first aid for one family" }, { id: "2", name: "Medical Care", amount: 100, description: "One week of care for a patient" }, { id: "3", name: "Field Hospital", amount: 500, description: "Contributes to temporary hospital setup" }] }),
  },
];

export async function POST(request: NextRequest) {
  try {
    const prisma = await getPrismaClient();
    const results: any[] = [];
    for (const campaign of SAMPLE_CAMPAIGNS) {
      const baseSlug = makeSlug(campaign.title);
      const existing = await (prisma as any).campaign.findUnique({ where: { slug: baseSlug } });
      if (existing) { results.push({ title: campaign.title, status: "SKIPPED" }); continue; }
      const created = await (prisma as any).campaign.create({
        data: { ...campaign, slug: baseSlug, publishedAt: campaign.status === "PUBLISHED" ? new Date() : null },
      });
      results.push({ title: created.title, id: created.id, status: "CREATED" });
    }
    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error("Seed campaigns error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ message: "POST to this endpoint to seed sample campaigns" });
}
