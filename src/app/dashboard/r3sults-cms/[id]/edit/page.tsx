import { Metadata } from "next";
import CampaignWizard from "@/components/cms/CampaignWizard";

export const metadata: Metadata = {
  title: "Edit Campaign | R3sults.org CMS",
};

export default async function EditCampaignPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const raw = await params;
  return <CampaignWizard mode="edit" campaignId={raw.id} />;
}
