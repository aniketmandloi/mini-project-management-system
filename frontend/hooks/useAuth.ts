/**
 * Custom hook for authentication functionality
 * Provides convenient access to auth context and additional auth utilities
 */

"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "../contexts/AuthContext";
import { authUtils, authNavigation } from "../lib/auth";
import type { UseAuthArgs, LoginInput, RegisterInput } from "../types";

/**
 * Custom authentication hook with additional utilities
 * @param options - Configuration options for the hook
 */
export function useAuth(options: UseAuthArgs = {}) {
  const { redirectOnSuccess = "/dashboard", redirectOnLogout = "/auth/login" } =
    options;

  const router = useRouter();
  const authContext = useAuthContext();

  /**
   * Enhanced login with navigation
   */
  const loginWithRedirect = useCallback(
    async (input: LoginInput): Promise<void> => {
      try {
        await authContext.login(input);

        // Get redirect URL or use default
        const redirectUrl =
          authNavigation.getLoginRedirect() || redirectOnSuccess;
        router.push(redirectUrl);
      } catch (error) {
        throw error;
      }
    },
    [authContext, router, redirectOnSuccess]
  );

  /**
   * Enhanced register with navigation
   */
  const registerWithRedirect = useCallback(
    async (input: RegisterInput): Promise<void> => {
      try {
        await authContext.register(input);

        // After successful registration, redirect to dashboard or intended page
        const redirectUrl =
          authNavigation.getLoginRedirect() || redirectOnSuccess;
        router.push(redirectUrl);
      } catch (error) {
        throw error;
      }
    },
    [authContext, router, redirectOnSuccess]
  );

  /**
   * Enhanced logout with navigation
   */
  const logoutWithRedirect = useCallback(async (): Promise<void> => {
    try {
      await authContext.logout();
      router.push(redirectOnLogout);
    } catch (error) {
      console.error("Logout error:", error);
      // Even if logout fails, redirect to login
      router.push(redirectOnLogout);
    }
  }, [authContext, router, redirectOnLogout]);

  /**
   * Check if current route requires authentication
   */
  const requiresAuth = useCallback((pathname?: string): boolean => {
    const path = pathname || window.location.pathname;

    // Public routes that don't require authentication
    const publicRoutes = [
      "/auth/login",
      "/auth/register",
      "/auth/forgot-password",
      "/auth/reset-password",
      "/", // Landing page
    ];

    return !publicRoutes.includes(path) && !path.startsWith("/public/");
  }, []);

  /**
   * Protect route - redirect if not authenticated and route requires auth
   */
  const protectRoute = useCallback(
    (pathname?: string): void => {
      const path = pathname || window.location.pathname;

      if (
        requiresAuth(path) &&
        !authContext.isAuthenticated &&
        !authContext.isLoading
      ) {
        authNavigation.setLoginRedirect(path);
        router.push("/auth/login");
      }
    },
    [authContext.isAuthenticated, authContext.isLoading, router, requiresAuth]
  );

  /**
   * Get user's organization information
   */
  const getOrganization = useCallback(() => {
    return authContext.user?.organization || null;
  }, [authContext.user]);

  /**
   * Get user's organization ID
   */
  const getOrganizationId = useCallback((): string | null => {
    return authContext.user?.organization?.id || authUtils.getOrganizationId();
  }, [authContext.user]);

  /**
   * Get current user ID
   */
  const getUserId = useCallback((): string | null => {
    return authContext.user?.id || authUtils.getUserId();
  }, [authContext.user]);

  /**
   * Check if user has a specific permission (placeholder for future role-based auth)
   */
  const hasPermission = useCallback(
    (permission: string): boolean => {
      // For now, all authenticated users have all permissions
      // This can be extended later with role-based permissions
      return authContext.isAuthenticated;
    },
    [authContext.isAuthenticated]
  );

  /**
   * Check if user is admin (placeholder for future role-based auth)
   */
  const isAdmin = useCallback((): boolean => {
    // For now, all users are admins in their organization
    // This can be extended later with role-based permissions
    return authContext.isAuthenticated;
  }, [authContext.isAuthenticated]);

  return {
    // Auth context values
    user: authContext.user,
    isAuthenticated: authContext.isAuthenticated,
    isLoading: authContext.isLoading,

    // Auth methods
    login: authContext.login,
    register: authContext.register,
    logout: authContext.logout,
    refreshToken: authContext.refreshToken,

    // Enhanced methods with navigation
    loginWithRedirect,
    registerWithRedirect,
    logoutWithRedirect,

    // Route protection
    requiresAuth,
    protectRoute,

    // User utilities
    getOrganization,
    getOrganizationId,
    getUserId,

    // Permission checks (for future use)
    hasPermission,
    isAdmin,
  };
}

/**
 * Hook for requiring authentication on a page
 * Automatically handles redirect if user is not authenticated
 */
export function useRequireAuth() {
  const { isAuthenticated, isLoading, protectRoute } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      protectRoute();
    }
  }, [isLoading, protectRoute]);

  return {
    isAuthenticated,
    isLoading,
  };
}

/**
 * Hook for preventing access when already authenticated
 * Useful for login/register pages
 */
export function useRequireGuest() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, isLoading, router]);

  return {
    isAuthenticated,
    isLoading,
  };
}

/**
 * Hook for organization-specific functionality
 */
export function useOrganization() {
  const { user, getOrganization, getOrganizationId } = useAuth();

  return {
    organization: getOrganization(),
    organizationId: getOrganizationId(),
    organizationSlug: user?.organization?.slug || null,
    organizationName: user?.organization?.name || null,
  };
}

export default useAuth;
