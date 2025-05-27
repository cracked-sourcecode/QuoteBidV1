import React, { useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function LoginPage() {
  const [, navigate] = useLocation();
  const [form, setForm] = useState({ username: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Convert username to lowercase automatically
    if (name === "username") {
      setForm({ ...form, [name]: value.toLowerCase() });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      // Clear any existing tokens before attempting login
      localStorage.removeItem('token');
      
      // First, logout any existing session
      try {
        await fetch("/api/logout", {
          method: "POST",
          credentials: 'include',
        });
      } catch (logoutError) {
        // Ignore logout errors, just continue with login
        console.log('Logout before login failed, continuing...');
      }
      
      // Now attempt login
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
        credentials: 'include', // Important for cookies
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        // Store the token if provided
        if (data.token) {
          localStorage.setItem('token', data.token);
        }
        // Navigate to opportunities page
        navigate("/opportunities");
      } else {
        // Show specific error message for invalid credentials
        if (res.status === 401 || data.message?.toLowerCase().includes('invalid') || data.message?.toLowerCase().includes('password')) {
          setError("Wrong username or password. Please try again.");
        } else {
          setError(data.message || "Login failed. Please try again.");
        }
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600">
      <Card className="w-full max-w-md shadow-2xl rounded-2xl">
        <CardContent className="p-8 lg:p-12">
          <h2 className="text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600 mb-2">
            QuoteBid
          </h2>
          <h3 className="text-xl font-semibold text-center mb-8 text-gray-900">Sign In</h3>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg animate-shake">
              <p className="text-sm font-medium text-red-600 text-center">{error}</p>
            </div>
          )}
          <form className="space-y-5" onSubmit={handleSubmit}>
            <input
              aria-label="Username"
              name="username"
              required
              placeholder="Username"
              className="rounded-xl border border-gray-300 px-4 py-3 w-full focus:ring-2 focus:ring-blue-600 lowercase"
              value={form.username}
              onChange={handleChange}
              disabled={loading}
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
            />
            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="password" className="font-medium text-gray-700">Password</label>
                <a href="#" className="text-sm text-blue-600 hover:underline">Forgot password?</a>
              </div>
              <div className="relative">
                <input
                  aria-label="Password"
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Enter your password"
                  className="rounded-xl border border-gray-300 px-4 py-3 w-full focus:ring-2 focus:ring-blue-600 pr-10"
                  value={form.password}
                  onChange={handleChange}
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10 0-1.657.403-3.22 1.125-4.575M15 12a3 3 0 11-6 0 3 3 0 016 0zm6.875-4.575A9.956 9.956 0 0122 9c0 5.523-4.477 10-10 10a9.956 9.956 0 01-4.575-1.125" /></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zm2.021 2.021A9.956 9.956 0 0022 12c0-5.523-4.477 10-10 10a9.956 9.956 0 01-4.575-1.125M9.879 9.879A3 3 0 0115 12m0 0a3 3 0 01-5.121-2.121" /></svg>
                  )}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-base font-medium rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 hover:opacity-90"
            >
              {loading ? "Logging in…" : "Log In"}
            </Button>
          </form>
          <p className="text-center text-sm mt-6 text-gray-500">
            Don&apos;t have an account? <Link href="/register" className="font-medium text-blue-600 hover:underline">Create one here</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
} 