import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from 'wouter';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { Shield, Eye, EyeOff } from 'lucide-react';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { adminLoginMutation } = useAdminAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      await adminLoginMutation.mutateAsync({ username, password });
      
      // After successful login, redirect to admin dashboard
      // Use setTimeout to ensure the auth state is updated
      setTimeout(() => {
        setLocation('/admin');
      }, 100);
      
    } catch (error) {
      console.error('Login error:', error);
      setError(error instanceof Error ? error.message : 'Login failed');
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
      
      <div className="w-full max-w-md bg-gradient-to-br from-blue-900 via-purple-900 to-violet-900 shadow-2xl rounded-3xl border border-white/20 relative z-10">
        <div className="p-8 lg:p-12">
          {/* Header with Shield Icon */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl shadow-lg">
                <Shield className="h-8 w-8 text-white" />
              </div>
            </div>
            <h2 className="text-4xl font-black text-white mb-2">
              Admin Portal
            </h2>
            <p className="text-xl font-semibold text-blue-100">
              Secure Access Required
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-400/50 rounded-xl backdrop-blur-sm">
              <p className="text-sm font-medium text-red-300 text-center">{error}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-semibold text-white mb-2">
                Admin Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                placeholder="Enter admin username"
                className="rounded-xl bg-white text-black placeholder-gray-500 border-2 border-gray-200 px-4 py-3 w-full focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all shadow-lg hover:shadow-xl"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={adminLoginMutation.isPending}
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-white mb-2">
                Admin Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Enter admin password"
                  className="rounded-xl bg-white text-black placeholder-gray-500 border-2 border-gray-200 px-4 py-3 w-full focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all shadow-lg hover:shadow-xl pr-12"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={adminLoginMutation.isPending}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={adminLoginMutation.isPending}
              className="w-full py-4 text-lg font-bold rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-700 text-white shadow-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {adminLoginMutation.isPending ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Authenticating...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <Shield className="h-5 w-5" />
                  Access Admin Portal
                </div>
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-sm text-blue-200/80">
              Admin access is restricted and monitored for security
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}