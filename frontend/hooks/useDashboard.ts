/**
 * useDashboard Hook
 *
 * Custom hook for managing dashboard data including projects, tasks, statistics,
 * and recent activity. Provides data fetching, loading states, error handling,
 * and real-time updates for the dashboard interface.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import type { DashboardData, UseDashboardArgs } from "@/types";

interface DashboardState {
  data: DashboardData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  refetchStats: () => Promise<void>;
}

/**
 * Mock dashboard data for development
 * This will be replaced with actual GraphQL data when the backend is connected
 */
const generateMockDashboardData = (): DashboardData => {
  return {
    projects: [
      {
        id: "1",
        name: "Website Redesign",
        description: "Complete overhaul of the company website",
        status: "ACTIVE",
        dueDate: "2024-02-15",
        createdAt: "2024-01-01T00:00:00Z",
        organization: {
          id: "org1",
          name: "Tech Corp",
          slug: "tech-corp",
          contactEmail: "contact@techcorp.com",
          createdAt: "2023-01-01T00:00:00Z",
        },
        taskCount: 12,
        completedTaskCount: 8,
        completionRate: 67,
      },
      {
        id: "2",
        name: "Mobile App Development",
        description: "Native mobile app for iOS and Android",
        status: "ACTIVE",
        dueDate: "2024-03-01",
        createdAt: "2024-01-05T00:00:00Z",
        organization: {
          id: "org1",
          name: "Tech Corp",
          slug: "tech-corp",
          contactEmail: "contact@techcorp.com",
          createdAt: "2023-01-01T00:00:00Z",
        },
        taskCount: 25,
        completedTaskCount: 15,
        completionRate: 60,
      },
      {
        id: "3",
        name: "Database Migration",
        description: "Migrate from MySQL to PostgreSQL",
        status: "PLANNING",
        dueDate: "2024-02-28",
        createdAt: "2024-01-10T00:00:00Z",
        organization: {
          id: "org1",
          name: "Tech Corp",
          slug: "tech-corp",
          contactEmail: "contact@techcorp.com",
          createdAt: "2023-01-01T00:00:00Z",
        },
        taskCount: 8,
        completedTaskCount: 3,
        completionRate: 38,
      },
    ],
    recentTasks: [
      {
        id: "task1",
        title: "Update homepage design",
        description: "Redesign the homepage with new branding",
        status: "DONE",
        assigneeEmail: "john@techcorp.com",
        dueDate: "2024-01-20T00:00:00Z",
        createdAt: "2024-01-15T00:00:00Z",
        project: {
          id: "1",
          name: "Website Redesign",
          description: "Complete overhaul of the company website",
          status: "ACTIVE",
          dueDate: "2024-02-15",
          createdAt: "2024-01-01T00:00:00Z",
          organization: {
            id: "org1",
            name: "Tech Corp",
            slug: "tech-corp",
            contactEmail: "contact@techcorp.com",
            createdAt: "2023-01-01T00:00:00Z",
          },
        },
      },
      {
        id: "task2",
        title: "Set up development environment",
        description: "Configure development tools and dependencies",
        status: "IN_PROGRESS",
        assigneeEmail: "sarah@techcorp.com",
        dueDate: "2024-01-25T00:00:00Z",
        createdAt: "2024-01-18T00:00:00Z",
        project: {
          id: "2",
          name: "Mobile App Development",
          description: "Native mobile app for iOS and Android",
          status: "ACTIVE",
          dueDate: "2024-03-01",
          createdAt: "2024-01-05T00:00:00Z",
          organization: {
            id: "org1",
            name: "Tech Corp",
            slug: "tech-corp",
            contactEmail: "contact@techcorp.com",
            createdAt: "2023-01-01T00:00:00Z",
          },
        },
      },
    ],
    stats: {
      totalProjects: 3,
      activeProjects: 2,
      completedProjects: 0,
      totalTasks: 45,
      completedTasks: 26,
      overallCompletionRate: 58,
      projectsByStatus: [
        { status: "ACTIVE", count: 2 },
        { status: "PLANNING", count: 1 },
        { status: "COMPLETED", count: 0 },
        { status: "ON_HOLD", count: 0 },
      ],
      tasksByStatus: [
        { status: "TODO", count: 12 },
        { status: "IN_PROGRESS", count: 7 },
        { status: "DONE", count: 26 },
        { status: "CANCELLED", count: 0 },
      ],
    },
  };
};

/**
 * Hook for managing dashboard data and state
 * Currently uses mock data - will be updated to use GraphQL when backend is ready
 */
export const useDashboard = (args: UseDashboardArgs = {}): DashboardState => {
  const { refreshInterval = 30000 } = args; // Default 30 seconds

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Simulate data fetching
   */
  const fetchData = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const mockData = generateMockDashboardData();
      setDashboardData(mockData);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Manually refetch dashboard data
   */
  const refetch = useCallback(async (): Promise<void> => {
    await fetchData();
  }, [fetchData]);

  /**
   * Refetch only statistics data
   */
  const refetchStats = useCallback(async (): Promise<void> => {
    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      const mockData = generateMockDashboardData();
      setDashboardData((prev) =>
        prev ? { ...prev, stats: mockData.stats } : mockData
      );
    } catch (err) {
      console.error("Stats refetch error:", err);
    }
  }, []);

  /**
   * Initial data load
   */
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /**
   * Set up automatic refresh interval
   */
  useEffect(() => {
    if (!refreshInterval) return;

    const interval = setInterval(() => {
      refetchStats();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, refetchStats]);

  return {
    data: dashboardData,
    isLoading,
    error,
    refetch,
    refetchStats,
  };
};

/**
 * Hook for dashboard statistics only
 * Lighter version for components that only need stats
 */
export const useDashboardStats = () => {
  const { data, isLoading, error, refetchStats } = useDashboard();

  return {
    stats: data?.stats || null,
    isLoading,
    error,
    refetch: refetchStats,
  };
};

/**
 * Hook for recent projects only
 * Optimized for components showing recent project data
 */
export const useRecentProjects = (limit: number = 5) => {
  const { data, isLoading, error, refetch } = useDashboard();

  return {
    projects: data?.projects?.slice(0, limit) || [],
    isLoading,
    error,
    refetch,
  };
};

/**
 * Hook for recent tasks only
 * Optimized for components showing recent task data
 */
export const useRecentTasks = (limit: number = 10) => {
  const { data, isLoading, error, refetch } = useDashboard();

  return {
    tasks: data?.recentTasks?.slice(0, limit) || [],
    isLoading,
    error,
    refetch,
  };
};

export default useDashboard;
