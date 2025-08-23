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
import { useMutation } from "@apollo/client/react";
import { clearCache } from "../lib/apollo";
import {
  authUtils,
  tokenManager,
  userManager,
  tokenRefresh,
} from "../lib/auth";
import {
  LOGIN_MUTATION,
  REGISTER_MUTATION,
  LOGOUT_MUTATION,
  REFRESH_TOKEN_MUTATION,
} from "../graphql/mutations";
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

  // Apollo mutations
  const [loginMutation] = useMutation(LOGIN_MUTATION);
  const [registerMutation] = useMutation(REGISTER_MUTATION);
  const [logoutMutation] = useMutation(LOGOUT_MUTATION);
  const [refreshTokenMutation] = useMutation(REFRESH_TOKEN_MUTATION);

  /**
   * Refresh authentication tokens
   */
  const refreshToken = useCallback(async (): Promise<void> => {
    try {
      const refreshTokenValue = tokenManager.getRefreshToken();

      if (!refreshTokenValue) {
        console.error("AuthContext: No refresh token available");
        throw new Error("No refresh token available");
      }

      console.log("AuthContext: Refreshing token using stored refresh token");

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
              refreshToken: refreshTokenValue,
            },
          }),
        }
      );

      if (!response.ok) {
        console.error(
          `AuthContext: Refresh token request failed with status ${response.status}: ${response.statusText}`
        );
        const errorText = await response.text().catch(() => "No response body");
        console.error("AuthContext: Response body:", errorText);
        throw new Error(
          `Network error: ${response.status} ${response.statusText}`
        );
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
    console.log("AuthContext: Initializing auth...");
    try {
      setIsLoading(true);

      // Check if user has valid tokens
      if (!authUtils.isAuthenticated()) {
        // Try to refresh token if available
        if (authUtils.canRefreshToken()) {
          console.log("AuthContext: Attempting token refresh...");
          await refreshToken();
        } else {
          // No valid authentication
          console.log(
            "AuthContext: No valid tokens available, user not authenticated"
          );
          setUser(null);
          setIsLoading(false);
          setIsInitialized(true);
          return;
        }
      } else {
        console.log("AuthContext: User has valid access token");
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

        const result = await loginMutation({
          variables: {
            input: {
              email: input.email,
              password: input.password,
            },
          },
        });

        console.log("Login mutation result:", result);

        const { data } = result;

        if ((data as any)?.login) {
          const loginResult = (data as any).login;
          console.log("Login result:", loginResult);

          if (loginResult.success) {
            console.log("Login success - setting up user data...");
            const tokens = {
              accessToken: loginResult.accessToken,
              refreshToken: loginResult.refreshToken,
            };
            const userData = loginResult.user;

            // Store authentication data
            console.log("Storing auth data:", tokens, userData);
            authUtils.setAuthData(tokens, userData);
            setUser(userData);
            console.log("User set successfully");

            // Debug: Check if tokens are actually stored
            console.log(
              "Stored accessToken:",
              localStorage.getItem("accessToken")
            );
            console.log("Stored user:", localStorage.getItem("user"));

            // Setup token refresh
            console.log("Setting up token refresh...");
            setupTokenRefresh();

            // Clear any existing Apollo cache to avoid stale data
            console.log("Clearing Apollo cache...");
            await clearCache();
            console.log("Login completed successfully!");
          } else {
            throw new Error(loginResult.errors?.join(", ") || "Login failed");
          }
        } else {
          console.error("Login failed - full result:", result);
          throw new Error("Login failed - no data received");
        }
      } catch (error: any) {
        console.error("Login error:", error);

        // Handle GraphQL errors
        if (error.graphQLErrors && error.graphQLErrors.length > 0) {
          const graphQLError = error.graphQLErrors[0];
          throw new Error(graphQLError.message || "Login failed");
        } else if (error.networkError) {
          throw new Error(
            "Network error. Please check your connection and try again."
          );
        } else if (error.message) {
          throw new Error(error.message);
        } else {
          throw new Error("An unexpected error occurred during login");
        }
      } finally {
        setIsLoading(false);
      }
    },
    [loginMutation, setupTokenRefresh]
  );

  /**
   * Register new user and organization
   */
  const register = useCallback(
    async (input: RegisterInput): Promise<void> => {
      try {
        setIsLoading(true);

        const result = await registerMutation({
          variables: {
            input: {
              email: input.email,
              password: input.password,
              firstName: input.firstName,
              lastName: input.lastName,
              // For now, we'll register without organization_id and let backend handle it
              // Later we can add organization creation flow
            },
          },
        });

        console.log("Register mutation result:", result);

        const { data } = result;

        if ((data as any)?.register) {
          const registerResult = (data as any).register;

          if (registerResult.success) {
            const tokens = {
              accessToken: registerResult.accessToken,
              refreshToken: registerResult.refreshToken,
            };
            const userData = registerResult.user;

            // Store authentication data
            authUtils.setAuthData(tokens, userData);
            setUser(userData);
          } else {
            throw new Error(
              registerResult.errors?.join(", ") || "Registration failed"
            );
          }

          // Setup token refresh
          setupTokenRefresh();

          // Clear any existing Apollo cache
          await clearCache();
        } else {
          console.error("Registration failed - full result:", result);
          throw new Error("Registration failed - no data received");
        }
      } catch (error: any) {
        console.error("Registration error:", error);

        // Handle GraphQL errors
        if (error.graphQLErrors && error.graphQLErrors.length > 0) {
          const graphQLError = error.graphQLErrors[0];
          throw new Error(graphQLError.message || "Registration failed");
        } else if (error.networkError) {
          throw new Error(
            "Network error. Please check your connection and try again."
          );
        } else if (error.message) {
          throw new Error(error.message);
        } else {
          throw new Error("An unexpected error occurred during registration");
        }
      } finally {
        setIsLoading(false);
      }
    },
    [registerMutation, setupTokenRefresh]
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
