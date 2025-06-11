import React, { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");

    try {
      console.log("Sending forgot password request for:", email);
      
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      console.log("Response status:", response.status);
      console.log("Response ok:", response.ok);
      
      // Check if response is JSON
      const contentType = response.headers.get("content-type");
      console.log("Response content-type:", contentType);
      
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server returned non-JSON response");
      }

      const data = await response.json();
      console.log("Response data:", data);

      if (response.ok) {
        setIsSuccess(true);
        setMessage(data.message || "Password reset email sent successfully!");
      } else {
        setMessage(data.message || "An error occurred. Please try again.");
      }
    } catch (error) {
      console.error("Forgot password error:", error);
      if (error instanceof Error) {
        setMessage(`Error: ${error.message}`);
      } else {
        setMessage("Network error. Please check your connection and try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-violet-900 relative overflow-hidden">
      {/* Animated mesh gradient */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-violet-400 rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{animationDelay: '4s'}}></div>
      </div>

      <div className="relative z-10 w-full max-w-md mx-auto px-6">
        <div className="bg-gradient-to-br from-blue-900/50 via-purple-900/50 to-violet-900/50 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl p-8 lg:p-12">
          
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-black text-white mb-2">
              <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Quote</span>
              <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Bid</span>
            </h2>
            <h3 className="text-xl font-semibold text-blue-100 mb-2">Forgot Password</h3>
            <p className="text-gray-300 text-sm">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>

          {/* Success/Error Message */}
          {message && (
            <div className={`mb-6 p-4 rounded-xl border ${
              isSuccess 
                ? 'bg-green-500/10 border-green-400/30 text-green-300' 
                : 'bg-red-500/10 border-red-400/30 text-red-300'
            }`}>
              <p className="text-sm font-medium text-center">{message}</p>
            </div>
          )}

          {!isSuccess ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="Enter your email address"
                  className="w-full px-4 py-3 text-base rounded-xl bg-white text-black placeholder-gray-500 border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all shadow-lg hover:shadow-xl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-purple-600 hover:to-blue-700 text-white py-4 rounded-xl text-lg font-bold shadow-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
              >
                {isLoading ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <p className="text-gray-300 text-sm mb-6">
                Check your email for a password reset link. It may take a few minutes to arrive.
              </p>
            </div>
          )}

          {/* Back to login link */}
          <div className="text-center mt-8">
            <Link 
              href="/login" 
              className="text-blue-400 hover:text-blue-300 transition-colors duration-300 text-sm font-medium"
            >
              ← Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 