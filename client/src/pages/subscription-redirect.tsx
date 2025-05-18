import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export default function SubscriptionRedirect() {
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');

    if (!sessionId) {
      setError("Missing session information");
      return;
    }

    // Get the checkout URL and redirect
    apiFetch(`/api/get-checkout-url?session_id=${sessionId}`)
      .then(response => {
        if (!response.ok) {
          throw new Error("Failed to get checkout URL");
        }
        return response.json();
      })
      .then(data => {
        if (data?.url) {
          // Direct redirection to Stripe
          window.location.href = data.url;
        } else {
          setError("Invalid checkout URL");
        }
      })
      .catch(err => {
        console.error("Checkout redirection error:", err);
        setError(err.message || "Failed to redirect to checkout");
      });
  }, [setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-lg text-center">
        {error ? (
          <>
            <h1 className="text-2xl font-bold text-red-600 mb-4">Checkout Error</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button 
              onClick={() => setLocation('/subscribe')}
              className="bg-qpurple hover:bg-qpurple-dark"
            >
              Return to Subscription Page
            </Button>
          </>
        ) : (
          <>
            <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <h1 className="text-2xl font-bold mb-4">Redirecting to Checkout</h1>
            <p className="text-gray-600">Please wait while we redirect you to the secure payment page...</p>
          </>
        )}
      </div>
    </div>
  );
}