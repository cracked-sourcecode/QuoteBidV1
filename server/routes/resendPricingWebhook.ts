import { Router, Request, Response } from "express";
import { emailClicks } from "../../shared/schema";
import { getDb } from "../db";

const router = Router();

router.post("/webhooks/resend/pricing", async (req: Request, res: Response) => {
  try {
    const { type, data } = req.body;

    // Ignore non-click events
    if (type !== "email.clicked") {
      return res.json({ ok: true, ignored: true, reason: "not a click event" });
    }

    // Only accept emails tagged with x-pricing
    if (!data.tags?.includes("x-pricing")) {
      return res.json({ ok: true, ignored: true, reason: "not a pricing email" });
    }

    // Extract opportunity ID from headers
    const opportunityId = data.headers?.["X-Opportunity-ID"];
    if (!opportunityId) {
      console.warn("Resend click webhook: Missing X-Opportunity-ID header");
      return res.json({ ok: true, ignored: true, reason: "missing opportunity ID" });
    }

    // Insert the email click record
    await getDb().insert(emailClicks).values({
      opportunityId: Number(opportunityId),
      clickedAt: new Date(data.timestamp || Date.now()),
    });

    console.log(`📧 Email click recorded for opportunity ${opportunityId}`);
    return res.json({ ok: true, recorded: true, opportunityId: Number(opportunityId) });

  } catch (error) {
    console.error("Resend pricing webhook error:", error);
    return res.status(500).json({ ok: false, error: "Internal server error" });
  }
});

export default router; 