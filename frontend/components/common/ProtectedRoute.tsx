/**
 * Protected Route Component
 *
 * Wrapper component that ensures only authenticated users can access certain routes.
 * Redirects unauthenticated users to the login page and shows loading states.
 */

"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
  requireOrganization?: boolean;
  fallback?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  redirectTo = "/auth/login",
  requireOrganization = true,
  fallback,
}) => {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  console.log(
    "ProtectedRoute render - isLoading:",
    isLoading,
    "isAuthenticated:",
    isAuthenticated,
    "user:",
    user
  );

  useEffect(() => {
    console.log(
      "ProtectedRoute useEffect - isLoading:",
      isLoading,
      "isAuthenticated:",
      isAuthenticated,
      "user:",
      user
    );

    // Don't redirect while still loading
    if (isLoading) {
      console.log("ProtectedRoute: Still loading, waiting...");
      return;
    }

    // Check if user is authenticated via AuthContext OR localStorage (fallback)
    const hasTokens =
      typeof window !== "undefined" && localStorage.getItem("accessToken");
    const hasStoredUser =
      typeof window !== "undefined" && localStorage.getItem("userData");

    console.log(
      "ProtectedRoute: hasTokens:",
      !!hasTokens,
      "hasStoredUser:",
      !!hasStoredUser
    );

    // Redirect if not authenticated (check both AuthContext and localStorage)
    if (!isAuthenticated && !hasTokens) {
      console.log(
        "ProtectedRoute: Not authenticated, redirecting to:",
        redirectTo
      );
      router.push(redirectTo);
      return;
    }

    // If AuthContext says not authenticated but localStorage has tokens,
    // wait a bit more for initialization to complete
    if (!isAuthenticated && hasTokens) {
      console.log(
        "ProtectedRoute: AuthContext not ready but tokens exist, waiting..."
      );
      return;
    }

    // Check organization requirement (only if we have a user)
    const currentUser =
      user ||
      (hasStoredUser
        ? JSON.parse(localStorage.getItem("userData") || "{}")
        : null);

    if (requireOrganization && currentUser && !currentUser.organization) {
      console.log(
        "ProtectedRoute: Organization required but user has none, redirecting to /organization/setup"
      );
      router.push("/organization/setup");
      return;
    }

    console.log("ProtectedRoute: All checks passed, allowing access");
  }, [
    isLoading,
    isAuthenticated,
    user,
    requireOrganization,
    redirectTo,
    router,
  ]);

  // Show loading state
  if (isLoading) {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      )
    );
  }

  // Don't render anything while redirecting
  if (!isAuthenticated || !user) {
    return null;
  }

  // Check organization requirement
  if (requireOrganization && !user.organization) {
    return null; // Will redirect via useEffect
  }

  // Render protected content
  return <>{children}</>;
};

/**
 * Higher-Order Component version of ProtectedRoute
 *
 * Usage:
 * const ProtectedComponent = withProtectedRoute(MyComponent, {
 *   requireOrganization: true,
 *   redirectTo: '/custom-login'
 * });
 */
export function withProtectedRoute<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<ProtectedRouteProps, "children">
) {
  const WrappedComponent = (props: P) => (
    <ProtectedRoute {...options}>
      <Component {...props} />
    </ProtectedRoute>
  );

  WrappedComponent.displayName = `withProtectedRoute(${
    Component.displayName || Component.name
  })`;
  return WrappedComponent;
}

/**
 * Public Route Component
 *
 * Wrapper component that redirects authenticated users away from public routes
 * (like login/register pages) to the dashboard.
 */
export const PublicRoute: React.FC<{
  children: React.ReactNode;
  redirectTo?: string;
}> = ({ children, redirectTo = "/dashboard" }) => {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Don't redirect while still loading
    if (isLoading) return;

    // Redirect authenticated users away from public routes
    if (isAuthenticated && user) {
      router.push(redirectTo);
      return;
    }
  }, [isLoading, isAuthenticated, user, redirectTo, router]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Don't render anything if authenticated (will redirect)
  if (isAuthenticated && user) {
    return null;
  }

  // Render public content
  return <>{children}</>;
};
