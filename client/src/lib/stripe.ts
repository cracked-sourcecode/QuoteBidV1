// Stripe utilities for creating and managing payment intents
import { apiRequest } from "@/lib/queryClient";

/**
 * Creates a payment intent with manual capture method
 * This allows us to place a hold on a card but only capture funds later
 * @param pitchId - If provided, links this payment intent to the specified pitch
 */
export async function createPaymentIntent({ 
  amount, 
  metadata = {}, 
  pitchId = null 
}: { 
  amount: number, 
  metadata?: Record<string, string>,
  pitchId?: number | null 
}) {
  try {
    const response = await apiRequest("POST", "/api/create-payment-intent", {
      amount,
      capture_method: "manual",
      metadata,
      pitchId
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to create payment intent");
    }
    
    const data = await response.json();
    return { 
      intentId: data.paymentIntentId,
      clientSecret: data.clientSecret 
    };
  } catch (error) {
    console.error("Error creating payment intent:", error);
    throw error;
  }
}

/**
 * Captures a payment intent that was previously authorized
 * Use this when the service has been delivered and you want to charge the customer
 */
export async function capturePaymentIntent(paymentIntentId: string) {
  try {
    const response = await apiRequest("POST", `/api/capture-payment-intent/${paymentIntentId}`, {});
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to capture payment intent");
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error capturing payment intent:", error);
    throw error;
  }
}