import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Lock, CheckCircle, AlertCircle, X } from "lucide-react";

// Password validation utility
const validatePassword = (password: string) => {
  const requirements = {
    minLength: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const strength = Object.values(requirements).filter(Boolean).length;
  const isValid = Object.values(requirements).every(Boolean);

  return {
    requirements,
    strength,
    isValid,
    strengthText: strength === 0 ? '' : 
                  strength <= 2 ? 'Weak' : 
                  strength <= 3 ? 'Fair' : 
                  strength === 4 ? 'Good' : 'Strong',
    strengthColor: strength === 0 ? '' : 
                   strength <= 2 ? 'text-red-400' : 
                   strength <= 3 ? 'text-yellow-400' : 
                   strength === 4 ? 'text-blue-400' : 'text-green-400'
  };
};

export default function ResetPassword() {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const [token, setToken] = useState<string>("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);

  // Password validation state
  const passwordValidation = validatePassword(password);
  const passwordsMatch = password === confirmPassword && confirmPassword !== '';

  // Extract token from URL parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const resetToken = params.get("token");
    
    if (resetToken) {
      setToken(resetToken);
      // Validate token on page load
      validateToken(resetToken);
    } else {
      setIsValidToken(false);
      toast({
        title: "Invalid Reset Link",
        description: "The password reset link is missing or invalid.",
        variant: "destructive",
      });
    }
  }, []);

  const validateToken = async (resetToken: string) => {
    try {
      const response = await fetch("/api/auth/validate-reset-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: resetToken }),
      });

      if (response.ok) {
        setIsValidToken(true);
      } else {
        const error = await response.json();
        setIsValidToken(false);
        toast({
          title: "Invalid Reset Link",
          description: error.message || "The password reset link has expired or is invalid.",
          variant: "destructive",
        });
      }
    } catch (error) {
      setIsValidToken(false);
      toast({
        title: "Connection Error",
        description: "Unable to validate reset link. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password || !confirmPassword) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }

    if (!passwordValidation.isValid) {
      toast({
        title: "Password Requirements Not Met",
        description: "Please ensure your password meets all security requirements.",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please make sure both passwords are the same.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          newPassword: password,
        }),
      });

      if (response.ok) {
        toast({
          title: "Password Reset Successful!",
          description: "Your password has been updated. You can now log in with your new password.",
        });
        
        // Redirect to login page after success
        setTimeout(() => navigate("/login"), 2000);
      } else {
        const error = await response.json();
        toast({
          title: "Reset Failed",
          description: error.message || "Failed to reset password. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Connection Error",
        description: "Unable to reset password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidToken === null) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-violet-900 relative overflow-hidden">
        {/* Animated mesh gradient */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{animationDelay: '2s'}}></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-violet-400 rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{animationDelay: '4s'}}></div>
        </div>

        <div className="relative z-10 w-full max-w-md mx-auto px-6">
          <div className="bg-gradient-to-br from-blue-900/50 via-purple-900/50 to-violet-900/50 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl p-8">
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
                <span className="text-gray-300">Validating reset link...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isValidToken === false) {
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
              <div className="mx-auto w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="h-6 w-6 text-red-400" />
              </div>
              <h3 className="text-xl font-semibold text-blue-100 mb-2">Invalid Reset Link</h3>
              <p className="text-gray-300 text-sm">
                The password reset link has expired or is invalid. Please request a new password reset.
              </p>
            </div>

            <Button 
              onClick={() => navigate("/login")} 
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-purple-600 hover:to-blue-700 text-white py-4 rounded-xl text-lg font-bold shadow-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
            >
              Back to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

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
            <div className="mx-auto w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-6 w-6 text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-blue-100 mb-2">Reset Your Password</h3>
            <p className="text-gray-300 text-sm">
              Enter your new password below. Make sure it's strong and secure.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your new password"
                  className="w-full px-4 py-3 text-base rounded-xl bg-white text-black placeholder-gray-500 border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all shadow-lg hover:shadow-xl pr-12"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-white mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                  className="w-full px-4 py-3 text-base rounded-xl bg-white text-black placeholder-gray-500 border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all shadow-lg hover:shadow-xl pr-12"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Password requirements and strength */}
            {password && (
              <div className="space-y-4">
                {/* Password strength indicator */}
                <div className="bg-white/10 rounded-xl p-4 border border-white/20">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-white">Password Strength</span>
                    {passwordValidation.strengthText && (
                      <span className={`text-sm font-bold ${passwordValidation.strengthColor}`}>
                        {passwordValidation.strengthText}
                      </span>
                    )}
                  </div>
                  
                  {/* Strength bar */}
                  <div className="w-full bg-gray-700 rounded-full h-2 mb-4">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        passwordValidation.strength === 0 ? 'w-0' :
                        passwordValidation.strength <= 2 ? 'w-2/5 bg-red-400' :
                        passwordValidation.strength <= 3 ? 'w-3/5 bg-yellow-400' :
                        passwordValidation.strength === 4 ? 'w-4/5 bg-blue-400' :
                        'w-full bg-green-400'
                      }`}
                    />
                  </div>

                  {/* Requirements checklist */}
                  <div className="space-y-2 text-sm">
                    <div className={`flex items-center space-x-2 ${passwordValidation.requirements.minLength ? 'text-green-400' : 'text-gray-400'}`}>
                      {passwordValidation.requirements.minLength ? <CheckCircle className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      <span>At least 8 characters</span>
                    </div>
                    <div className={`flex items-center space-x-2 ${passwordValidation.requirements.uppercase ? 'text-green-400' : 'text-gray-400'}`}>
                      {passwordValidation.requirements.uppercase ? <CheckCircle className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      <span>At least one uppercase letter</span>
                    </div>
                    <div className={`flex items-center space-x-2 ${passwordValidation.requirements.lowercase ? 'text-green-400' : 'text-gray-400'}`}>
                      {passwordValidation.requirements.lowercase ? <CheckCircle className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      <span>At least one lowercase letter</span>
                    </div>
                    <div className={`flex items-center space-x-2 ${passwordValidation.requirements.number ? 'text-green-400' : 'text-gray-400'}`}>
                      {passwordValidation.requirements.number ? <CheckCircle className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      <span>At least one number</span>
                    </div>
                    <div className={`flex items-center space-x-2 ${passwordValidation.requirements.special ? 'text-green-400' : 'text-gray-400'}`}>
                      {passwordValidation.requirements.special ? <CheckCircle className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      <span>At least one special character (!@#$%^&*)</span>
                    </div>
                    {confirmPassword && (
                      <div className={`flex items-center space-x-2 ${passwordsMatch ? 'text-green-400' : 'text-red-400'}`}>
                        {passwordsMatch ? <CheckCircle className="h-4 w-4" /> : <X className="h-4 w-4" />}
                        <span>Passwords match</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-purple-600 hover:to-blue-700 text-white py-4 rounded-xl text-lg font-bold shadow-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
              disabled={isLoading || !password || !confirmPassword || !passwordValidation.isValid || !passwordsMatch}
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Resetting Password...</span>
                </div>
              ) : (
                "Reset Password"
              )}
            </Button>

            {/* Back to login link */}
            <div className="text-center mt-8">
              <button 
                type="button"
                onClick={() => navigate("/login")}
                disabled={isLoading}
                className="text-blue-400 hover:text-blue-300 transition-colors duration-300 text-sm font-medium"
              >
                ← Back to Login
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 