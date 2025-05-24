import { createContext, ReactNode, useContext, useState } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { AdminUser } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { apiFetch } from "@/lib/apiFetch";
import { useToast } from "@/hooks/use-toast";

type AdminLoginData = {
  username: string;
  password: string;
};

type AdminAuthContextType = {
  adminUser: AdminUser | null;
  isLoading: boolean;
  error: Error | null;
  sessionExpiresAt: Date | null;
  adminLoginMutation: UseMutationResult<AdminUser, Error, AdminLoginData>;
  adminLogoutMutation: UseMutationResult<void, Error, void>;
};

export const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  // Track session expiry
  const [sessionExpiresAt, setSessionExpiresAt] = useState<Date | null>(null);
  
  // Query to check if admin is logged in
  const {
    data: adminUser,
    error,
    isLoading,
    refetch: refetchAdminUser
  } = useQuery<AdminUser | null>({
    queryKey: ["/api/admin/current"],
    queryFn: async () => {
      try {
        console.log("Checking admin authentication status...");
        const res = await apiFetch("/api/admin/current", {
          credentials: "include",
          headers: {
            "Cache-Control": "no-cache",
            "Pragma": "no-cache"
          }
        });
        
        console.log(`Admin auth response status: ${res.status}`);
        
        if (!res.ok) {
          if (res.status === 401) {
            console.log("Admin not authenticated (401)");
          } else {
            console.warn(`Admin auth failed with status: ${res.status}`);
          }
          return null;
        }
        
        const userData = await res.json();
        
        // Handle session expiry information
        if (userData.sessionExpiresAt) {
          try {
            const expiryDate = new Date(userData.sessionExpiresAt);
            console.log(`Admin session expires at: ${expiryDate.toLocaleString()}`);
            setSessionExpiresAt(expiryDate);
          } catch (e) {
            console.error("Error parsing session expiry date:", e);
          }
        }
        
        console.log("Admin authenticated successfully:", userData.username);
        return userData;
      } catch (error) {
        console.error("Admin auth error:", error);
        return null;
      }
    },
    retry: 2, // Increased retries 
    retryDelay: 1000,
    staleTime: 3 * 60 * 1000, // 3 minutes - check status more frequently to maintain session
    refetchOnWindowFocus: true, // Refresh when tab gets focus
    refetchOnMount: true, // Refresh when component mounts
    refetchInterval: 10 * 60 * 1000, // Refresh every 10 minutes to keep session alive
  });

  // Admin login mutation
  const adminLoginMutation = useMutation({
    mutationFn: async (credentials: AdminLoginData) => {
      const res = await apiRequest("POST", "/api/admin/login", credentials);
      if (!res.ok) {
        throw new Error("Invalid admin credentials");
      }
      return await res.json();
    },
    onSuccess: (admin: AdminUser) => {
      // If admin response includes session expiry info, capture it
      if (admin && (admin as any).sessionExpiresAt) {
        try {
          const expiryDate = new Date((admin as any).sessionExpiresAt);
          console.log(`Admin session set to expire at: ${expiryDate.toLocaleString()}`);
          setSessionExpiresAt(expiryDate);
          
          // Store admin user data in the query cache
          queryClient.setQueryData(["/api/admin/current"], admin);
        } catch (e) {
          console.error("Error parsing session expiry on login:", e);
          queryClient.setQueryData(["/api/admin/current"], admin);
        }
      } else {
        queryClient.setQueryData(["/api/admin/current"], admin);
      }
      
      toast({
        title: "Admin Login Successful",
        description: "You are now logged in as an administrator",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Admin Login Failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    },
  });

  // Admin logout mutation
  const adminLogoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/admin/logout");
    },
    onSuccess: () => {
      // Clear all admin authentication data
      queryClient.setQueryData(["/api/admin/current"], null);
      setSessionExpiresAt(null);
      
      toast({
        title: "Admin Logout Successful",
        description: "You have been logged out from admin account",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AdminAuthContext.Provider
      value={{
        adminUser: adminUser || null,
        isLoading,
        error,
        sessionExpiresAt,
        adminLoginMutation,
        adminLogoutMutation,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  return {
    isAdmin: false,
    adminUser: null,
    login: async () => {},
    logout: async () => {},
    register: async () => {},
    loading: false,
    error: null,
  };
}