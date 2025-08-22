/**
 * Authentication context provider for managing user authentication state
 * Provides authentication methods, user data, and loading states throughout the app
 */

"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { clearCache } from "../lib/apollo";
import {
  authUtils,
  tokenManager,
  userManager,
  tokenRefresh,
} from "../lib/auth";
import type {
  User,
  AuthContextType,
  LoginInput,
  RegisterInput,
} from "../types";

/**
 * Authentication context
 */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Props for AuthProvider component
 */
interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * Authentication provider component
 */
export function AuthProvider({ children }: AuthProviderProps) {
  // State
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  /**
   * Refresh authentication tokens
   */
  const refreshToken = useCallback(async (): Promise<void> => {
    try {
      const refreshToken = tokenManager.getRefreshToken();

      if (!refreshToken) {
        throw new Error("No refresh token available");
      }

      // For now, we'll implement a simple fetch-based refresh
      const response = await fetch(
        process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT ||
          "http://localhost:8000/graphql/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: `
            mutation RefreshToken($refreshToken: String!) {
              refreshToken(refreshToken: $refreshToken) {
                tokens {
                  accessToken
                  refreshToken
                }
                user {
                  id
                  email
                  firstName
                  lastName
                  isActive
                  organization {
                    id
                    name
                    slug
                    contactEmail
                    createdAt
                  }
                }
              }
            }
          `,
            variables: {
              refreshToken,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Network error");
      }

      const data = await response.json();

      if (data.errors) {
        throw new Error(data.errors[0].message);
      }

      const { tokens, user: userData } = data.data.refreshToken;

      // Update stored tokens and user data
      authUtils.setAuthData(tokens, userData);
      setUser(userData);
    } catch (error) {
      console.error("Token refresh error:", error);
      // If refresh fails, logout user
      authUtils.logout();
      setUser(null);
      throw error;
    }
  }, []);

  /**
   * Setup automatic token refresh
   */
  const setupTokenRefresh = useCallback(() => {
    return tokenRefresh.setupAutoRefresh(refreshToken);
  }, [refreshToken]);

  /**
   * Initialize authentication state on app load
   */
  const initializeAuth = useCallback(async () => {
    try {
      setIsLoading(true);

      // Check if user has valid tokens
      if (!authUtils.isAuthenticated()) {
        // Try to refresh token if available
        if (authUtils.canRefreshToken()) {
          await refreshToken();
        } else {
          // No valid authentication
          setUser(null);
          setIsLoading(false);
          setIsInitialized(true);
          return;
        }
      }

      // Get stored user data
      const storedUser = userManager.getUser();
      if (storedUser) {
        setUser(storedUser);
        setupTokenRefresh();
      } else {
        // Token exists but no user data - this shouldn't happen
        // Clear tokens and require re-login
        authUtils.logout();
        setUser(null);
      }
    } catch (error) {
      console.error("Error initializing auth:", error);
      authUtils.logout();
      setUser(null);
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  }, [refreshToken, setupTokenRefresh]);

  /**
   * Login user with email and password
   */
  const login = useCallback(
    async (input: LoginInput): Promise<void> => {
      try {
        setIsLoading(true);

        // For now, we'll implement a simple fetch-based login
        // This will be replaced with proper GraphQL mutations later
        const response = await fetch(
          process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT ||
            "http://localhost:8000/graphql/",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query: `
            mutation Login($email: String!, $password: String!) {
              login(email: $email, password: $password) {
                tokens {
                  accessToken
                  refreshToken
                }
                user {
                  id
                  email
                  firstName
                  lastName
                  isActive
                  organization {
                    id
                    name
                    slug
                    contactEmail
                    createdAt
                  }
                }
              }
            }
          `,
              variables: {
                email: input.email,
                password: input.password,
              },
            }),
          }
        );

        if (!response.ok) {
          throw new Error("Network error");
        }

        const data = await response.json();

        if (data.errors) {
          throw new Error(data.errors[0].message);
        }

        const { tokens, user: userData } = data.data.login;

        // Store authentication data
        authUtils.setAuthData(tokens, userData);
        setUser(userData);

        // Setup token refresh
        setupTokenRefresh();

        // Clear any existing Apollo cache to avoid stale data
        await clearCache();
      } catch (error) {
        console.error("Login error:", error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [setupTokenRefresh]
  );

  /**
   * Register new user and organization
   */
  const register = useCallback(
    async (input: RegisterInput): Promise<void> => {
      try {
        setIsLoading(true);

        // For now, we'll implement a simple fetch-based register
        // This will be replaced with proper GraphQL mutations later
        const response = await fetch(
          process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT ||
            "http://localhost:8000/graphql/",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query: `
            mutation Register(
              $email: String!
              $password: String!
              $firstName: String!
              $lastName: String!
              $organizationName: String!
            ) {
              register(
                email: $email
                password: $password
                firstName: $firstName
                lastName: $lastName
                organizationName: $organizationName
              ) {
                tokens {
                  accessToken
                  refreshToken
                }
                user {
                  id
                  email
                  firstName
                  lastName
                  isActive
                  organization {
                    id
                    name
                    slug
                    contactEmail
                    createdAt
                  }
                }
              }
            }
          `,
              variables: {
                email: input.email,
                password: input.password,
                firstName: input.firstName,
                lastName: input.lastName,
                organizationName: input.organizationName,
              },
            }),
          }
        );

        if (!response.ok) {
          throw new Error("Network error");
        }

        const data = await response.json();

        if (data.errors) {
          throw new Error(data.errors[0].message);
        }

        const { tokens, user: userData } = data.data.register;

        // Store authentication data
        authUtils.setAuthData(tokens, userData);
        setUser(userData);

        // Setup token refresh
        setupTokenRefresh();

        // Clear any existing Apollo cache
        await clearCache();
      } catch (error) {
        console.error("Registration error:", error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [setupTokenRefresh]
  );

  /**
   * Logout user and clear all authentication data
   */
  const logout = useCallback(async (): Promise<void> => {
    try {
      // Clear local auth data
      authUtils.logout();
      setUser(null);

      // Clear Apollo cache
      await clearCache();

      // Optionally call logout endpoint to invalidate tokens on server
      // await logoutMutation();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Always clear local state even if server call fails
      authUtils.logout();
      setUser(null);
    }
  }, []);

  /**
   * Initialize authentication on component mount
   */
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  /**
   * Setup token refresh when user changes
   */
  useEffect(() => {
    if (user && isInitialized) {
      const cleanup = setupTokenRefresh();
      return cleanup || undefined;
    }
  }, [user, isInitialized, setupTokenRefresh]);

  /**
   * Context value
   */
  const contextValue: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    refreshToken,
  };

  // Don't render children until auth is initialized
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

/**
 * Hook to use authentication context
 * Must be used within AuthProvider
 */
export function useAuthContext(): AuthContextType {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }

  return context;
}

/**
 * Higher-order component for protecting routes that require authentication
 */
export function withAuth<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, isLoading } = useAuthContext();

    // Show loading while checking authentication
    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      if (typeof window !== "undefined") {
        window.location.href = "/auth/login";
      }
      return null;
    }

    return <Component {...props} />;
  };
}

/**
 * Higher-order component for protecting routes that require NO authentication (like login/register)
 */
export function withoutAuth<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  return function UnauthenticatedComponent(props: P) {
    const { isAuthenticated, isLoading } = useAuthContext();

    // Show loading while checking authentication
    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }

    // Redirect to dashboard if already authenticated
    if (isAuthenticated) {
      if (typeof window !== "undefined") {
        window.location.href = "/dashboard";
      }
      return null;
    }

    return <Component {...props} />;
  };
}

export default AuthContext;
