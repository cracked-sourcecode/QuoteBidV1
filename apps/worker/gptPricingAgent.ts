/**
 * GPT-4o Pricing Agent
 * 
 * Uses OpenAI function calling to make intelligent pricing decisions
 * for complex market scenarios beyond simple deterministic rules.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";
import { z } from "zod";
import type { PricingSnapshot } from "../../lib/pricing/pricingEngine";
import { FEATURE_FLAGS } from "../../config/featureFlags";
import { sendNotification } from "./sendNotification.js";
import { priceUpdates } from "../wsServer";

// ES Module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Environment configuration
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const GPT_BATCH_SIZE = parseInt(process.env.GPT_BATCH_SIZE || "50");
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:5050";

// Load pricing agent specification for GPT context
const AGENT_SPEC = fs.readFileSync(
  path.resolve(__dirname, "../../docs/pricing-agent.md"),
  "utf-8"
);

// Initialize OpenAI client (optional for testing)
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

// Zod schemas for validation
const PriceActionSchema = z.object({
  opportunityId: z.string(),
  action: z.enum(["set", "increase", "decrease"]),
  price: z.number().optional(),
});

const NotifyActionSchema = z.object({
  opportunityId: z.string(),
  template: z.enum(["PRICE_DROP", "LAST_CALL"]),
});

const GPTResponseSchema = z.object({
  actions: z.array(PriceActionSchema),
  notifications: z.array(NotifyActionSchema).optional().default([]),
});

type PriceAction = z.infer<typeof PriceActionSchema>;
type NotifyAction = z.infer<typeof NotifyActionSchema>;

// OpenAI function schema for pricing actions
const pricingFunctions = [
  {
    name: "pricing_actions",
    description: "Set or tweak prices and optionally trigger email notifications",
    parameters: {
      type: "object",
      properties: {
        actions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              opportunityId: { type: "string" },
              action: { enum: ["set", "increase", "decrease"] },
              price: { type: "number" }, // required if action === "set"
            },
            required: ["opportunityId", "action"],
          },
        },
        notifications: {
          type: "array",
          items: {
            type: "object",
            properties: {
              opportunityId: { type: "string" },
              template: { enum: ["PRICE_DROP", "LAST_CALL"] },
            },
            required: ["opportunityId", "template"],
          },
        },
      },
      required: ["actions"],
    },
  },
];

/**
 * Build context prompt for GPT with current market conditions
 */
function buildContextPrompt(snapshots: PricingSnapshot[], priceStep: number = 5): string {
  return `You are QuoteBid's intelligent pricing agent. Analyze these ${snapshots.length} opportunities and make pricing decisions.

CURRENT MARKET SNAPSHOTS:
${snapshots.map(s => `
- Opportunity ${s.opportunityId}: Current $${s.current_price}
  - Demand: ${s.pitches} pitches, ${s.clicks} clicks, ${s.saves} saves, ${s.drafts} drafts
  - Time pressure: ${s.hoursRemaining.toFixed(1)} hours remaining
  - Tier: ${s.tier} (1=premium, 3=basic)
  ${s.outlet_avg_price ? `- Outlet avg: $${s.outlet_avg_price}` : ''}
  ${s.successRateOutlet ? `- Success rate: ${(s.successRateOutlet * 100).toFixed(1)}%` : ''}
`).join('')}

PRICING GUIDELINES:
1. **Demand-driven**: High pitch/click counts = increase prices
2. **Time urgency**: <12 hours remaining = aggressive pricing moves
3. **Market anchoring**: Consider outlet averages when available
4. **Tier respect**: Tier 1 should generally be >$200, Tier 3 <$150
5. **Price bands**: Stay within $50-$500 range, move in $${priceStep} increments (admin configured)

NOTIFICATION TRIGGERS:
- PRICE_DROP: When reducing price >$10 to alert interested users
- LAST_CALL: When <6 hours remaining and high demand

Be strategic but conservative. Only make changes that clearly improve market efficiency.`;
}

/**
 * Call OpenAI GPT-4o with function calling for pricing decisions
 */
async function callGPTAgent(snapshots: PricingSnapshot[], priceStep: number = 5): Promise<{ actions: PriceAction[]; notifications: NotifyAction[] }> {
  console.log(`🤖 Calling GPT-4o for ${snapshots.length} pricing decisions...`);
  
  // Check if OpenAI is configured
  if (!openai) {
    console.log(`🤖 OpenAI not configured, returning no actions for ${snapshots.length} snapshots`);
    return { actions: [], notifications: [] };
  }
  
  const startTime = Date.now();
  
  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content: AGENT_SPEC.slice(0, 4000), // Keep token budget sane
        },
        {
          role: "system",
          content: buildContextPrompt(snapshots, priceStep),
        },
        {
          role: "user", 
          content: "Analyze these opportunities and return pricing actions via function calling.",
        },
      ],
      functions: pricingFunctions,
      function_call: { name: "pricing_actions" },
      temperature: 0,
      max_tokens: 1000, // Increased for larger batches
    });

    const latency = Date.now() - startTime;
    console.log(`⚡ GPT-4o responded in ${latency}ms`);

    // Extract function call result
    const functionCall = response.choices[0]?.message?.function_call;
    if (!functionCall || functionCall.name !== "pricing_actions") {
      throw new Error("GPT did not return expected function call");
    }

    // Parse and validate the response
    const rawResult = JSON.parse(functionCall.arguments);
    const validatedResult = GPTResponseSchema.parse(rawResult);

    console.log(`✅ GPT returned ${validatedResult.actions.length} price actions, ${validatedResult.notifications.length} notifications`);
    
    return validatedResult;

  } catch (error) {
    console.error("❌ GPT-4o call failed:", error);
    throw error;
  }
}

/**
 * Execute a single price action via API
 */
async function executePriceAction(action: PriceAction, snapshot?: PricingSnapshot, priceStep: number = 5): Promise<void> {
  const url = `${API_BASE_URL}/api/opportunity/${action.opportunityId}/price`;
  
  let finalPrice: number;
  
  // Determine final price based on action type
  if (action.action === "set") {
    if (!action.price) {
      throw new Error(`Price required for 'set' action on opportunity ${action.opportunityId}`);
    }
    finalPrice = action.price;
  } else {
    // For increase/decrease, we need the current price from snapshot
    const currentPrice = snapshot?.current_price;
    if (!currentPrice) {
      throw new Error(`Current price not available for '${action.action}' action on opportunity ${action.opportunityId}`);
    }
    
    const stepSize = priceStep; // Use admin-configured price step
    finalPrice = action.action === "increase" 
      ? currentPrice + stepSize 
      : currentPrice - stepSize;
  }

  // v2: pricingEngine.ts handles bounds
  // finalPrice = Math.max(50, Math.min(500, finalPrice));

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        price: finalPrice,
        snapshot: snapshot || null,
      }),
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }

    console.log(`💰 Updated OPP ${action.opportunityId}: ${action.action} → $${finalPrice}`);
    
    // Emit real-time price update for GPT changes
    try {
      const oldPrice = snapshot?.current_price || finalPrice;
      const trend = Math.sign(finalPrice - oldPrice);
      
      priceUpdates.priceChanged({
        id: parseInt(action.opportunityId),
        oldPrice,
        newPrice: finalPrice,
        trend,
        timestamp: new Date().toISOString(),
        source: "gpt"
      });
    } catch (wsError) {
      console.warn("⚠️ WebSocket emission failed for GPT update:", wsError);
      // Don't fail the price update if WebSocket fails
    }

  } catch (error) {
    console.error(`❌ Failed to update opportunity ${action.opportunityId}:`, error);
    throw error;
  }
}

/**
 * Main function to process GPT pricing decisions
 */
export async function queueForGPT(snapshots: PricingSnapshot[], priceStep: number = 5): Promise<{ ok: boolean }> {
  console.log(`🚀 Processing ${snapshots.length} snapshots with GPT-4o...`);

  // Validate batch size
  if (snapshots.length > GPT_BATCH_SIZE) {
    console.warn(`⚠️ Batch size ${snapshots.length} exceeds limit ${GPT_BATCH_SIZE}, truncating`);
    snapshots = snapshots.slice(0, GPT_BATCH_SIZE);
  }

  if (snapshots.length === 0) {
    console.log("📭 No snapshots to process");
    return { ok: true };
  }

  try {
    // Get pricing decisions from GPT
    const { actions, notifications } = await callGPTAgent(snapshots, priceStep);

    // Create lookup map for snapshots
    const snapshotMap = new Map(snapshots.map(s => [s.opportunityId, s]));

    // Execute all price actions
    for (const action of actions) {
      const snapshot = snapshotMap.get(action.opportunityId);
      await executePriceAction(action, snapshot, priceStep);
    }

    // Send notifications
    if (FEATURE_FLAGS.ENABLE_PRICE_EMAILS || FEATURE_FLAGS.ENABLE_PRICE_PUSHES) {
      for (const notification of notifications) {
        try {
          await sendNotification(notification.opportunityId, notification.template);
          console.log(`📧 Sent ${notification.template} notification for OPP ${notification.opportunityId}`);
        } catch (error) {
          console.error(`❌ Failed to send notification for OPP ${notification.opportunityId}:`, error);
          // Don't throw - notifications are non-critical
        }
      }
    } else {
      if (notifications.length > 0) {
        console.log(`🔕 ${notifications.length} notifications suppressed by feature flag`);
      }
    }

    console.log(`✅ GPT batch processing complete: ${actions.length} prices updated, ${notifications.length} notifications sent`);
    return { ok: true };

  } catch (error) {
    console.error("💥 GPT batch processing failed:", error);
    throw error;
  }
}

/**
 * Get GPT agent statistics
 */
export function getGPTAgentStats() {
  return {
    status: "live",
    model: OPENAI_MODEL,
    batchSize: GPT_BATCH_SIZE,
    features: [
      "OpenAI function calling",
      "Intelligent price adjustments",
      "Email notifications",
      "Market context analysis"
    ]
  };
}