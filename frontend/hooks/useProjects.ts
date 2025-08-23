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
  const { organizationId, status, limit = 50, offset = 0 } = args;

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
    errorPolicy: "all",
    notifyOnNetworkStatusChange: true,
    fetchPolicy: "cache-and-network",
  });

  /**
   * Extract projects from GraphQL response format
   */
  const projects: Project[] =
    (data as { projects?: { edges?: Project[] } })?.projects?.edges || [];

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

    if ((error as any).networkError) {
      return "Network error occurred. Please check your connection and try again.";
    }

    if (
      (error as any).graphQLErrors &&
      (error as any).graphQLErrors.length > 0
    ) {
      return (error as any).graphQLErrors[0].message;
    }

    return (
      (error as any).message ||
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
