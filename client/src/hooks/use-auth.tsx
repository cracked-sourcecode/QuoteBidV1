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
import { apiFetch } from "@/lib/apiFetch";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<{ user: SelectUser, token?: string } | SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<{ user: SelectUser, token?: string } | SelectUser, Error, InsertUser>;
  isProfileComplete: () => boolean;
};

type LoginData = {
  username: string;
  password: string;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const {
    data: user,
    error,
    isLoading,
    refetch: refetchUser,
  } = useQuery<SelectUser | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: (failureCount, error) => {
      // Don't retry on 401 errors (unauthorized)
      if (error && 'status' in error && error.status === 401) {
        return false;
      }
      // Retry up to 2 times for other errors
      return failureCount < 2;
    },
    staleTime: 0, // Always consider data stale to ensure fresh auth checks
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnMount: true, // Always refetch on mount
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
      
      // Update the query cache with the user data
      queryClient.setQueryData(["/api/user"], user);
      
      // Force refetch to ensure the latest auth state
      await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
      
      // Automatically redirect to opportunities page after login
      // Only if we're not already on a valid post-login page
      if (location === "/auth" || location.includes("?tab=login") || location === "/login") {
        navigate("/opportunities");
      }
    },
    onError: (error: Error) => {
      // Clear any potentially stale tokens
      localStorage.removeItem("token");
      
      // Clear user data from cache
      queryClient.setQueryData(["/api/user"], null);
      
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      try {
        // First, call the logout API
        await apiRequest("POST", "/api/logout");
      } catch (error) {
        // Even if the API call fails, we still want to clear local state
        console.error("Logout API call failed:", error);
      }
      
      // Clear local storage
      localStorage.removeItem("token");
    },
    onSuccess: () => {
      // Clear the user from the query cache
      queryClient.setQueryData(["/api/user"], null);
      
      // Clear all queries to ensure a clean state
      queryClient.clear();
      
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
      
      // Navigate to home page
      navigate("/");
    },
    onError: (error: Error) => {
      // Even on error, clear local state
      localStorage.removeItem("token");
      queryClient.setQueryData(["/api/user"], null);
      queryClient.clear();
      
      console.error("Logout error:", error);
      
      // Still navigate away
      navigate("/");
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: InsertUser) => {
      const res = await apiRequest("POST", "/api/register", userData);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Registration failed");
      }
      return (await res.json()) as { user: SelectUser, token?: string } | SelectUser;
    },
    onSuccess: async (data: { user: SelectUser, token?: string } | SelectUser) => {
      const user = "user" in data ? data.user : data;
      
      // Store token if present
      if ("token" in data && data.token) {
        localStorage.setItem("token", data.token);
      }
      
      // Update the query cache with the user data
      queryClient.setQueryData(["/api/user"], user);
      
      // Force refetch to ensure the latest auth state
      await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      
      toast({
        title: "Registration successful",
        description: "Welcome to QuoteBid!",
      });
      
      // Redirect to appropriate page based on user state
      if (user.signup_stage && user.signup_stage !== 'ready') {
        navigate("/signup-wizard");
      } else {
        navigate("/opportunities");
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

  // Function to check if user profile is complete
  const isProfileComplete = () => {
    if (!user) return false;
    return user.profileCompleted === true;
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
        isProfileComplete,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}