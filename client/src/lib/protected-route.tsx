import { useAuth } from "@/hooks/use-auth";
import { LoadingScreen } from "@/components/ui/loading-screen";
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
    // Skip loading screen for authentication - it should be very fast
    // and causes stacking with page loading screens
    return null;
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to={`/login?returnPath=${encodeURIComponent(path)}`} />
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}