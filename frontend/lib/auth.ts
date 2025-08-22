/**
 * Authentication utilities and token management
 * Handles JWT tokens, user session, and authentication state persistence
 */

import type { User, AuthTokens } from "../types";

// Token storage keys
const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const USER_DATA_KEY = "userData";

/**
 * Check if we're running in the browser
 */
const isBrowser = typeof window !== "undefined";

/**
 * Token management utilities
 */
export const tokenManager = {
  /**
   * Store authentication tokens
   */
  setTokens(tokens: AuthTokens): void {
    if (!isBrowser) return;

    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  },

  /**
   * Get access token
   */
  getAccessToken(): string | null {
    if (!isBrowser) return null;

    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  /**
   * Get refresh token
   */
  getRefreshToken(): string | null {
    if (!isBrowser) return null;

    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  /**
   * Clear all tokens
   */
  clearTokens(): void {
    if (!isBrowser) return;

    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },

  /**
   * Check if user has valid tokens
   */
  hasValidTokens(): boolean {
    if (!isBrowser) return false;

    const accessToken = this.getAccessToken();
    const refreshToken = this.getRefreshToken();

    return !!(accessToken && refreshToken);
  },
};

/**
 * User data management utilities
 */
export const userManager = {
  /**
   * Store user data
   */
  setUser(user: User): void {
    if (!isBrowser) return;

    localStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
  },

  /**
   * Get stored user data
   */
  getUser(): User | null {
    if (!isBrowser) return null;

    try {
      const userData = localStorage.getItem(USER_DATA_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error("Error parsing user data:", error);
      return null;
    }
  },

  /**
   * Clear user data
   */
  clearUser(): void {
    if (!isBrowser) return;

    localStorage.removeItem(USER_DATA_KEY);
  },

  /**
   * Update specific user fields
   */
  updateUser(updates: Partial<User>): void {
    if (!isBrowser) return;

    const currentUser = this.getUser();
    if (currentUser) {
      const updatedUser = { ...currentUser, ...updates };
      this.setUser(updatedUser);
    }
  },
};

/**
 * JWT token utilities
 */
export const jwtUtils = {
  /**
   * Decode JWT token payload (without verification)
   * Note: This is for client-side token inspection only, not for security
   */
  decodeToken(token: string): Record<string, unknown> | null {
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );

      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error("Error decoding JWT token:", error);
      return null;
    }
  },

  /**
   * Check if token is expired
   */
  isTokenExpired(token: string): boolean {
    const decoded = this.decodeToken(token);

    if (!decoded || !decoded.exp) {
      return true;
    }

    // Token expiration is in seconds, Date.now() is in milliseconds
    return (decoded.exp as number) * 1000 < Date.now();
  },

  /**
   * Get token expiration date
   */
  getTokenExpiration(token: string): Date | null {
    const decoded = this.decodeToken(token);

    if (!decoded || !decoded.exp) {
      return null;
    }

    return new Date((decoded.exp as number) * 1000);
  },

  /**
   * Get time until token expires (in milliseconds)
   */
  getTimeUntilExpiration(token: string): number | null {
    const expiration = this.getTokenExpiration(token);

    if (!expiration) {
      return null;
    }

    return expiration.getTime() - Date.now();
  },
};

/**
 * Authentication state utilities
 */
export const authUtils = {
  /**
   * Check if user is currently authenticated
   */
  isAuthenticated(): boolean {
    const token = tokenManager.getAccessToken();

    if (!token) {
      return false;
    }

    // Check if token is not expired
    return !jwtUtils.isTokenExpired(token);
  },

  /**
   * Check if refresh token is available and valid
   */
  canRefreshToken(): boolean {
    const refreshToken = tokenManager.getRefreshToken();

    if (!refreshToken) {
      return false;
    }

    // Check if refresh token is not expired
    return !jwtUtils.isTokenExpired(refreshToken);
  },

  /**
   * Get user's organization ID from token
   */
  getOrganizationId(): string | null {
    const token = tokenManager.getAccessToken();

    if (!token) {
      return null;
    }

    const decoded = jwtUtils.decodeToken(token);
    return (decoded?.organization_id as string) || null;
  },

  /**
   * Get user ID from token
   */
  getUserId(): string | null {
    const token = tokenManager.getAccessToken();

    if (!token) {
      return null;
    }

    const decoded = jwtUtils.decodeToken(token);
    return (decoded?.user_id as string) || (decoded?.sub as string) || null;
  },

  /**
   * Complete logout - clear all auth data
   */
  logout(): void {
    tokenManager.clearTokens();
    userManager.clearUser();
  },

  /**
   * Set up authentication data after successful login
   */
  setAuthData(tokens: AuthTokens, user: User): void {
    tokenManager.setTokens(tokens);
    userManager.setUser(user);
  },
};

/**
 * Navigation utilities for authentication
 */
export const authNavigation = {
  /**
   * Get redirect URL after login
   */
  getLoginRedirect(): string {
    if (!isBrowser) return "/dashboard";

    // Get the intended destination from URL params or storage
    const urlParams = new URLSearchParams(window.location.search);
    const redirect =
      urlParams.get("redirect") || sessionStorage.getItem("loginRedirect");

    // Clear stored redirect
    sessionStorage.removeItem("loginRedirect");

    // Return dashboard as default, or the intended redirect
    return redirect || "/dashboard";
  },

  /**
   * Store current URL as login redirect destination
   */
  setLoginRedirect(path?: string): void {
    if (!isBrowser) return;

    const redirectPath =
      path || window.location.pathname + window.location.search;

    // Don't redirect to auth pages
    if (redirectPath.includes("/auth/")) {
      return;
    }

    sessionStorage.setItem("loginRedirect", redirectPath);
  },

  /**
   * Navigate to login page with optional redirect
   */
  redirectToLogin(redirectPath?: string): void {
    if (!isBrowser) return;

    if (redirectPath) {
      this.setLoginRedirect(redirectPath);
    }

    window.location.href = "/auth/login";
  },

  /**
   * Navigate to dashboard (default post-auth destination)
   */
  redirectToDashboard(): void {
    if (!isBrowser) return;

    window.location.href = "/dashboard";
  },
};

/**
 * Token refresh utilities
 */
export const tokenRefresh = {
  /**
   * Set up automatic token refresh
   */
  setupAutoRefresh(refreshCallback: () => Promise<void>): (() => void) | null {
    if (!isBrowser) return null;

    const token = tokenManager.getAccessToken();

    if (!token) {
      return null;
    }

    const timeUntilExpiration = jwtUtils.getTimeUntilExpiration(token);

    if (!timeUntilExpiration || timeUntilExpiration <= 0) {
      return null;
    }

    // Refresh token 5 minutes before expiration
    const refreshTime = Math.max(timeUntilExpiration - 5 * 60 * 1000, 1000);

    const timeoutId = setTimeout(async () => {
      try {
        await refreshCallback();
      } catch (error) {
        console.error("Auto token refresh failed:", error);
        authUtils.logout();
        authNavigation.redirectToLogin();
      }
    }, refreshTime);

    // Return cleanup function
    return () => clearTimeout(timeoutId);
  },
};

/**
 * Development utilities
 */
export const devUtils = {
  /**
   * Log current auth state (development only)
   */
  logAuthState(): void {
    if (process.env.NODE_ENV !== "development") return;

    console.log("Auth State:", {
      isAuthenticated: authUtils.isAuthenticated(),
      canRefreshToken: authUtils.canRefreshToken(),
      accessToken: tokenManager.getAccessToken() ? "***exists***" : null,
      refreshToken: tokenManager.getRefreshToken() ? "***exists***" : null,
      user: userManager.getUser(),
      organizationId: authUtils.getOrganizationId(),
      userId: authUtils.getUserId(),
    });
  },

  /**
   * Clear all auth data (development only)
   */
  clearAllAuthData(): void {
    if (process.env.NODE_ENV !== "development") return;

    authUtils.logout();
    console.log("All auth data cleared");
  },
};
