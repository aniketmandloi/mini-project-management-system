/**
 * useProjects Hook
 *
 * Custom hook for managing projects data with GraphQL queries.
 * Provides projects fetching, caching, error handling, and refetch functionality.
 * Supports filtering and pagination parameters.
 */

import { useQuery } from "@apollo/client/react";
import { GET_PROJECTS } from "@/graphql/queries";
import type { Project, UseProjectsArgs, AsyncOperation } from "@/types";

/**
 * Hook for fetching and managing projects data
 * Provides loading states, error handling, and refetch functionality
 */
export const useProjects = (
  args: UseProjectsArgs = {}
): AsyncOperation<Project[]> & { refetch: () => Promise<void> } => {
  const { status, limit = 50, offset = 0 } = args;

  console.log("🚀 useProjects: Setting up useQuery with variables:", {
    filters: status ? { status } : undefined,
    sortBy: "created_at",
    sortOrder: "DESC",
    first: limit,
    after: offset > 0 ? btoa(`arrayconnection:${offset - 1}`) : undefined,
  });

  // Check if user has access token
  const hasToken = typeof window !== "undefined" && localStorage.getItem("accessToken");
  
  const {
    data,
    loading,
    error,
    refetch: apolloRefetch,
  } = useQuery(GET_PROJECTS, {
    variables: {
      filters: status ? { status } : undefined,
      sortBy: "created_at",
      sortOrder: "DESC",
      first: limit,
      after: offset > 0 ? btoa(`arrayconnection:${offset - 1}`) : undefined,
    },
    skip: !hasToken, // Skip query if no access token
    errorPolicy: "all",
    notifyOnNetworkStatusChange: true,
    fetchPolicy: "cache-and-network",
    onError: (error) => {
      console.error("🚨 Projects Query Error:", error);
      console.error("🚨 Network Error:", error.networkError);
      console.error("🚨 GraphQL Errors:", error.graphQLErrors);
    },
    onCompleted: (data) => {
      console.log("✅ Projects Query Completed:", data);
    },
  });

  console.log("🚀 useProjects: Query state - loading:", loading, "error:", error, "data:", data);

  /**
   * Extract projects from GraphQL response format
   * Backend returns projects directly in edges array, not wrapped in nodes
   */
  console.log("Raw projects data:", data);
  const projects: Project[] =
    (data as { projects?: { edges?: Project[] } })?.projects?.edges || [];
  console.log("Extracted projects:", projects);
  console.log(
    "Project IDs:",
    projects.map((p) => ({ id: p.id, name: p.name }))
  );

  /**
   * Handle refetch with error handling
   */
  const refetch = async (): Promise<void> => {
    try {
      await apolloRefetch();
    } catch (error) {
      console.error("Failed to refetch projects:", error);
      throw error;
    }
  };

  /**
   * Format error message
   */
  const getErrorMessage = (): string | null => {
    if (!error) return null;

    const errorWithNetwork = error as { networkError?: unknown };
    if (errorWithNetwork.networkError) {
      return "Network error occurred. Please check your connection and try again.";
    }

    const errorWithGraphQL = error as {
      graphQLErrors?: Array<{ message: string }>;
    };
    if (
      errorWithGraphQL.graphQLErrors &&
      errorWithGraphQL.graphQLErrors.length > 0
    ) {
      return errorWithGraphQL.graphQLErrors[0].message;
    }

    const errorWithMessage = error as { message?: string };
    return (
      errorWithMessage.message ||
      "An unexpected error occurred while loading projects."
    );
  };

  return {
    data: projects,
    loading,
    error: getErrorMessage(),
    refetch,
  };
};
