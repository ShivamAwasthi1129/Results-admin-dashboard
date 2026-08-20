// src/app/dashboard/r3sults-cms/page.tsx
import { Metadata } from "next";
import CampaignListClient from "./CampaignListClient";

export const metadata: Metadata = {
  title: "R3sults.org CMS | Campaigns",
};

export default function R3sultsCMSPage() {
  return <CampaignListClient />;
}