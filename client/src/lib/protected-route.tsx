import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    console.log('[ProtectedRoute] Auth is loading for path:', path);
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  if (!user) {
    console.log('[ProtectedRoute] No user found, redirecting to login from:', path);
    // Redirect to login page with return path encoded for proper redirection after login
    return (
      <Route path={path}>
        <Redirect to={`/login?returnPath=${encodeURIComponent(path)}`} />
      </Route>
    );
  }

  console.log('[ProtectedRoute] User authenticated, rendering component for:', path);
  return <Route path={path} component={Component} />;
}