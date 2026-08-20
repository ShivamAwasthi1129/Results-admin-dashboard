import { Metadata } from "next";
import DonationsClient from "./DonationsClient";

export const metadata: Metadata = { title: "All Donations | R3sults.org CMS" };

export default function DonationsPage() {
  return <DonationsClient />;
}