import { Metadata } from "next";
import CampaignWizard from "@/components/cms/CampaignWizard";

export const metadata: Metadata = {
  title: "Create Campaign | R3sults.org CMS",
};

export default function CreateCampaignPage() {
  return <CampaignWizard mode="create" />;
}