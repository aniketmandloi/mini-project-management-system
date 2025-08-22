/**
 * Apollo Client configuration for GraphQL integration
 * Handles authentication, caching, error handling, and request/response interceptors
 */

import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  from,
  gql,
} from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { onError } from "@apollo/client/link/error";
import { RetryLink } from "@apollo/client/link/retry";
import { GraphQLError } from "graphql";

// GraphQL endpoint - adjust based on your backend URL
const GRAPHQL_ENDPOINT =
  process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || "http://localhost:8000/graphql/";

/**
 * HTTP link for GraphQL requests
 */
const httpLink = createHttpLink({
  uri: GRAPHQL_ENDPOINT,
  credentials: "include", // Include cookies for session-based auth if needed
});

/**
 * Authentication link to add JWT token to requests
 */
const authLink = setContext((_, { headers }) => {
  // Get token from localStorage
  let token = null;

  if (typeof window !== "undefined") {
    token = localStorage.getItem("accessToken");
  }

  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
      "Content-Type": "application/json",
    },
  };
});

/**
 * Error link for handling GraphQL and network errors
 */
const errorLink = onError((errorHandler) => {
  // Handle GraphQL errors
  if ((errorHandler as any).graphQLErrors) {
    (errorHandler as any).graphQLErrors.forEach((error: GraphQLError) => {
      console.error(
        `GraphQL error: Message: ${error.message}, Location: ${error.locations}, Path: ${error.path}`
      );

      // Handle authentication errors
      if (
        error.extensions?.code === "UNAUTHENTICATED" ||
        error.extensions?.code === "FORBIDDEN"
      ) {
        // Clear tokens and redirect to login
        if (typeof window !== "undefined") {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");

          // Only redirect if not already on auth pages
          if (!window.location.pathname.includes("/auth/")) {
            window.location.href = "/auth/login";
          }
        }
      }
    });
  }

  // Handle network errors
  const networkError = (errorHandler as any).networkError;
  if (networkError) {
    console.error("Network error:", networkError);

    // Handle specific network error cases
    if ("statusCode" in networkError) {
      const statusCode = (networkError as Error & { statusCode?: number })
        .statusCode;
      switch (statusCode) {
        case 401:
          // Unauthorized - clear tokens and redirect
          if (typeof window !== "undefined") {
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");

            if (!window.location.pathname.includes("/auth/")) {
              window.location.href = "/auth/login";
            }
          }
          break;
        case 403:
          // Forbidden
          console.error("Access forbidden");
          break;
        case 500:
          // Server error
          console.error("Internal server error");
          break;
        default:
          console.error("Unknown network error:", statusCode);
      }
    }
  }
});

/**
 * Retry link for failed requests
 */
const retryLink = new RetryLink({
  delay: {
    initial: 300,
    max: Infinity,
    jitter: true,
  },
  attempts: {
    max: 3,
    retryIf: (error) => {
      // Retry on network errors but not on GraphQL errors
      return !!error && !("response" in error && error.response);
    },
  },
});

/**
 * Apollo Client cache configuration
 */
const cache = new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        // Configure pagination for projects
        projects: {
          keyArgs: ["organizationId", "status"],
          merge(existing = { edges: [], pageInfo: {} }, incoming) {
            return {
              ...incoming,
              edges: [...existing.edges, ...incoming.edges],
              pageInfo: incoming.pageInfo,
            };
          },
        },
        // Configure pagination for tasks
        tasks: {
          keyArgs: ["projectId", "status", "assigneeEmail"],
          merge(existing = { edges: [], pageInfo: {} }, incoming) {
            return {
              ...incoming,
              edges: [...existing.edges, ...incoming.edges],
              pageInfo: incoming.pageInfo,
            };
          },
        },
        // Configure pagination for comments
        taskComments: {
          keyArgs: ["taskId"],
          merge(existing = { edges: [], pageInfo: {} }, incoming) {
            return {
              ...incoming,
              edges: [...existing.edges, ...incoming.edges],
              pageInfo: incoming.pageInfo,
            };
          },
        },
      },
    },
    Project: {
      fields: {
        // Update task count when tasks change
        taskCount: {
          read(existing) {
            // This will be automatically updated when tasks are fetched
            return existing;
          },
        },
        completedTasks: {
          read(existing) {
            return existing;
          },
        },
        completionRate: {
          read(existing, { readField }) {
            const taskCount = readField("taskCount") as number;
            const completedTasks = readField("completedTasks") as number;

            if (taskCount && completedTasks) {
              return Math.round((completedTasks / taskCount) * 100);
            }

            return existing || 0;
          },
        },
      },
    },
    Task: {
      fields: {
        // Update comment count when comments change
        commentCount: {
          read(existing) {
            return existing;
          },
        },
      },
    },
  },
  // Cache data persistence (optional)
  possibleTypes: {
    // Define possible types for union types if needed
  },
});

/**
 * Create Apollo Client instance
 */
export const apolloClient = new ApolloClient({
  link: from([retryLink, errorLink, authLink, httpLink]),
  cache,
  defaultOptions: {
    watchQuery: {
      errorPolicy: "all",
      notifyOnNetworkStatusChange: true,
    },
    query: {
      errorPolicy: "all",
    },
    mutate: {
      errorPolicy: "all",
    },
  },
  // Enable dev tools in development
  // connectToDevTools: process.env.NODE_ENV === "development",
});

/**
 * Clear Apollo Client cache
 * Useful when logging out or switching organizations
 */
export function clearCache(): Promise<void> {
  return apolloClient.clearStore().then(() => {});
}

/**
 * Reset Apollo Client cache and refetch all active queries
 * More aggressive than clearCache, useful for hard resets
 */
export function resetCache(): Promise<void> {
  return apolloClient.resetStore().then(() => {});
}

/**
 * Utility to check if Apollo Client is ready
 */
export function isApolloClientReady(): boolean {
  return !!apolloClient;
}

/**
 * Get the current cache state (useful for debugging)
 */
export function getCacheState() {
  if (process.env.NODE_ENV === "development") {
    return apolloClient.cache.extract();
  }
  return null;
}

/**
 * Types for cache operations
 */
interface ProjectCacheFields {
  [fieldName: string]: (existing: unknown) => unknown;
}

interface TaskCacheFields {
  [fieldName: string]: (existing: unknown) => unknown;
}

interface ProjectData {
  id: string;
  name: string;
  description?: string;
  status: string;
  dueDate?: string;
  createdAt: string;
  taskCount?: number;
  completedTasks?: number;
  completionRate?: number;
}

/**
 * Manual cache update utilities
 */
export const cacheUpdates = {
  /**
   * Update project in cache after mutation
   */
  updateProject: (projectId: string, updatedFields: ProjectCacheFields) => {
    apolloClient.cache.modify({
      id: apolloClient.cache.identify({ __typename: "Project", id: projectId }),
      fields: updatedFields,
    });
  },

  /**
   * Update task in cache after mutation
   */
  updateTask: (taskId: string, updatedFields: TaskCacheFields) => {
    apolloClient.cache.modify({
      id: apolloClient.cache.identify({ __typename: "Task", id: taskId }),
      fields: updatedFields,
    });
  },

  /**
   * Add new project to cache
   */
  addProject: (newProject: ProjectData) => {
    apolloClient.cache.modify({
      fields: {
        projects(existing = { edges: [], pageInfo: {} }) {
          const newProjectRef = apolloClient.cache.writeFragment({
            data: newProject,
            fragment: gql`
              fragment NewProject on Project {
                id
                name
                description
                status
                dueDate
                createdAt
                taskCount
                completedTasks
                completionRate
              }
            `,
          });

          return {
            ...existing,
            edges: [
              { node: newProjectRef, cursor: newProject.id },
              ...existing.edges,
            ],
          };
        },
      },
    });
  },

  /**
   * Remove project from cache
   */
  removeProject: (projectId: string) => {
    apolloClient.cache.evict({
      id: apolloClient.cache.identify({ __typename: "Project", id: projectId }),
    });
    apolloClient.cache.gc();
  },
};

// Export default client for convenience
export default apolloClient;
