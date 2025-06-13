import React, { useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { AuthContext } from "@/hooks/use-auth";
import { useContext } from "react";
import { useTheme } from "@/hooks/use-theme";

export default function LoginPage() {
  const [, navigate] = useLocation();
  const [form, setForm] = useState({ username: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const authContext = useContext(AuthContext);
  if (!authContext) {
    throw new Error("LoginPage must be used within AuthProvider");
  }
  
  const { loginMutation } = authContext;
  const { refreshThemeFromDatabase } = useTheme();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Convert username to lowercase and remove spaces automatically
    if (name === "username") {
      setForm({ ...form, [name]: value.toLowerCase().replace(/\s/g, '') });
    } else if (name === "password") {
      // Remove spaces from password automatically
      setForm({ ...form, [name]: value.replace(/\s/g, '') });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      // Use the proper login mutation from auth context
      await loginMutation.mutateAsync(form);
      
      // Refresh theme from database after successful login
      console.log('🎨 [LOGIN] Login successful, refreshing theme from database...');
      await refreshThemeFromDatabase();
      
      // Navigation is handled by the loginMutation onSuccess callback
      navigate("/opportunities");
    } catch (err: any) {
      console.error('Login error:', err);
      // Show specific error message for invalid credentials
      if (err.message?.toLowerCase().includes('invalid') || err.message?.toLowerCase().includes('password')) {
        setError("Wrong username or password. Please try again.");
      } else {
        setError(err.message || "Login failed. Please try again.");
      }
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-violet-900 relative overflow-hidden">
      {/* Animated mesh gradient */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-violet-400 rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{animationDelay: '4s'}}></div>
      </div>
      
      <div className="w-full max-w-md bg-gradient-to-br from-blue-900 via-purple-900 to-violet-900 shadow-2xl rounded-3xl border border-white/20 relative z-10">
        <div className="p-8 lg:p-12">
          <h2 className="text-4xl font-black text-center text-white mb-2">
            QuoteBid
          </h2>
          <h3 className="text-xl font-semibold text-center mb-8 text-blue-100">Sign In</h3>
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-400/50 rounded-xl">
              <p className="text-sm font-medium text-red-300 text-center">{error}</p>
            </div>
          )}
          <form className="space-y-6" onSubmit={handleSubmit}>
            <input
              aria-label="Username"
              name="username"
              required
              placeholder="username"
              className="rounded-xl bg-white text-black placeholder-gray-500 border-2 border-gray-200 px-4 py-3 w-full focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all shadow-lg hover:shadow-xl lowercase"
              value={form.username}
              onChange={handleChange}
              disabled={loginMutation.isPending}
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
            />
            <div>
              <div className="flex justify-between items-center mb-3">
                <label htmlFor="password" className="font-semibold text-white">Password</label>
                <Link href="/forgot-password" className="text-sm text-blue-300 hover:text-blue-200 hover:underline">Forgot password?</Link>
              </div>
              <div className="relative">
                <input
                  aria-label="Password"
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Enter your password"
                  className="rounded-xl bg-white text-black placeholder-gray-500 border-2 border-gray-200 px-4 py-3 w-full focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all shadow-lg hover:shadow-xl pr-10"
                  value={form.password}
                  onChange={handleChange}
                  disabled={loginMutation.isPending}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.243 0-7.892-2.476-9.614-6m0 0L3 12l.736-1M13.875 18.825A10.05 10.05 0 0112 19c4.243 0 7.892-2.476 9.614-6m0 0L21 12l-.736 1M13.875 18.825L15 12m-3 7a3 3 0 01-3-3m3 3a3 3 0 003-3m-6-6a3 3 0 016 0" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full py-4 text-lg font-bold rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-purple-600 hover:to-blue-700 text-white shadow-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
            >
              {loginMutation.isPending ? "Logging in…" : "Log In"}
            </Button>
          </form>
          <p className="text-center text-sm mt-6 text-blue-200">
            Don&apos;t have an account? <Link href="/register" className="font-medium text-blue-300 hover:text-white hover:underline">Create one here</Link>
          </p>
        </div>
      </div>
    </div>
  );
} 