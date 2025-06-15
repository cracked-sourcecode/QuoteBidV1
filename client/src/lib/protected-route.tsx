import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
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
  const { theme } = useTheme();

  if (isLoading) {
    console.log('[ProtectedRoute] Auth is loading for path:', path);
    return (
      <Route path={path}>
        <div className={`flex items-center justify-center min-h-screen ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'}`}>
          <div className="flex flex-col items-center">
            <Loader2 className={`h-8 w-8 animate-spin mb-3 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
            <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Authenticating...</p>
          </div>
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