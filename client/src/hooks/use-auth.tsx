import React, { createContext, ReactNode, useContext, useEffect, useState } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<{ user: SelectUser, token?: string } | SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<{ user: SelectUser, token?: string } | SelectUser, Error, InsertUser>;
  isProfileComplete: () => boolean;
};

type LoginData = Pick<InsertUser, "username" | "password">;

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Prevent login/auth redirects on specific pages
  const shouldPreventRedirect = (path: string) => {
    return path === "/" || path.startsWith("/subscribe") || path.startsWith("/premium");
  };
  
  // Handle login and navigation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Login failed");
      }
      return (await res.json()) as { user: SelectUser, token?: string } | SelectUser;
    },
    onSuccess: async (data: { user: SelectUser, token?: string } | SelectUser) => {
      const user = "user" in data ? data.user : data;
      // Store token if present
      if ("token" in data && data.token) {
        localStorage.setItem("token", data.token);
      }
      queryClient.setQueryData(["/api/user"], user);
      
      // Sync theme from database for logged-in user
      try {
        // We need to import the theme hook here, but we can't due to circular dependency
        // So we'll trigger a custom event that the theme provider can listen to
        window.dispatchEvent(new CustomEvent('userLoggedIn'));
      } catch (error) {
        console.log('Failed to sync theme after login:', error);
      }
      
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
      
      // Automatically redirect to opportunities page after login
      // Only if we're not already on a valid post-login page
      if (location === "/auth" || location.includes("?tab=login")) {
        navigate("/opportunities");
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: InsertUser) => {
      const res = await apiRequest("POST", "/api/auth/signup/start", userData);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Registration failed");
      }
      return (await res.json()) as { user: SelectUser, token?: string } | SelectUser;
    },
    onSuccess: (data: { user: SelectUser, token?: string } | SelectUser) => {
      const user = "user" in data ? data.user : data;
      // Store token if present
      if ("token" in data && data.token) {
        localStorage.setItem("token", data.token);
      }
      queryClient.setQueryData(["/api/user"], user);
      
      // Sync theme from database for new user (should default to dark)
      try {
        window.dispatchEvent(new CustomEvent('userLoggedIn'));
      } catch (error) {
        console.log('Failed to sync theme after signup:', error);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      // Clear the token from localStorage
      localStorage.removeItem("token");
      
      // Clear all signup wizard related localStorage items to prevent redirect bugs
      localStorage.removeItem("in_signup_wizard");
      localStorage.removeItem("signup_email");
      localStorage.removeItem("signup_highest_step");
      localStorage.removeItem("signup_data");
      
      // Clear the user from query cache immediately
      queryClient.setQueryData(["/api/user"], null);
      
      // Cancel any outgoing queries
      queryClient.cancelQueries({ queryKey: ["/api/user"] });
      
      // Remove the query from cache entirely
      queryClient.removeQueries({ queryKey: ["/api/user"] });
      
      // Invalidate all queries to ensure fresh data
      queryClient.invalidateQueries();
      
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
      
      // No navigation here - this is handled by the LogoutHandler component
    },
    onError: (error: Error) => {
      // Even on error, clear the local state
      localStorage.removeItem("token");
      
      // Clear all signup wizard related localStorage items to prevent redirect bugs
      localStorage.removeItem("in_signup_wizard");
      localStorage.removeItem("signup_email");
      localStorage.removeItem("signup_highest_step");
      localStorage.removeItem("signup_data");
      
      queryClient.setQueryData(["/api/user"], null);
      queryClient.cancelQueries({ queryKey: ["/api/user"] });
      queryClient.removeQueries({ queryKey: ["/api/user"] });
      
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Check if user profile is complete
  const isProfileComplete = () => {
    if (!user) return false;
    
    // First check if profileCompleted flag is set
    if (user.profileCompleted) return true;
    
    // Fallback check for required profile fields
    return !!(
      user.fullName && 
      user.email && 
      user.industry && 
      user.bio
    );
  };

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        isProfileComplete
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}