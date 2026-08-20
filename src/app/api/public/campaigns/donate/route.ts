import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      campaignId,
      amount,
      donorFirstName,
      donorLastName,
      donorEmail,
      donorPhone,
      stripeSessionId,
      stripePaymentId,
      recurring,
    } = body;

    if (!campaignId || !amount) {
      return NextResponse.json({ success: false, error: "CampaignId and amount are required" }, { status: 400 });
    }

    const prisma = await getPrismaClient();

    // Check if campaign exists
    const campaign = await (prisma as any).campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      return NextResponse.json({ success: false, error: "Campaign not found" }, { status: 404 });
    }

    // Create the CampaignDonation record and update the Campaign's raisedAmount in a transaction!
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create donation record
      const donation = await (tx as any).campaignDonation.create({
        data: {
          campaignId,
          amount: parseFloat(String(amount)),
          donorFirstName,
          donorLastName,
          donorEmail,
          donorPhone,
          stripeSessionId,
          stripePaymentId,
          recurring: !!recurring,
          status: "succeeded",
        },
      });

      // 2. Update Campaign raisedAmount
      const updatedCampaign = await (tx as any).campaign.update({
        where: { id: campaignId },
        data: {
          raisedAmount: {
            increment: parseFloat(String(amount)),
          },
        },
      });

      return { donation, campaign: updatedCampaign };
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Donate callback error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
