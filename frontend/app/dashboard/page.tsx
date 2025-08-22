/**
 * Dashboard Page
 *
 * Main dashboard view providing an overview of projects, tasks, and recent activity.
 * This is the default landing page for authenticated users. Integrates all dashboard
 * components to provide a comprehensive view of organizational activity.
 */

"use client";

import React, { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { ProtectedRoute } from "@/components/common/ProtectedRoute";
import { ProjectOverview } from "@/components/dashboard/ProjectOverview";
import { TaskStats } from "@/components/dashboard/TaskStats";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { Button } from "@/components/common/Button";
import { useDashboard } from "@/hooks/useDashboard";
import { useAuth } from "@/hooks/useAuth";

export default function DashboardPage() {
  const { user } = useAuth();
  const {
    data: dashboardData,
    isLoading,
    error,
    refetch,
  } = useDashboard({
    refreshInterval: 30000, // Refresh every 30 seconds
  });

  const [isRefreshing, setIsRefreshing] = useState(false);

  /**
   * Handle manual refresh of dashboard data
   */
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  };

  /**
   * Handle project creation
   */
  const handleCreateProject = () => {
    // TODO: Open project creation modal or navigate to create page
    console.log("Create project clicked");
  };

  /**
   * Get welcome message based on time of day
   */
  const getWelcomeMessage = (): string => {
    const hour = new Date().getHours();
    let timeOfDay = "day";

    if (hour < 12) timeOfDay = "morning";
    else if (hour < 17) timeOfDay = "afternoon";
    else timeOfDay = "evening";

    const firstName = user?.firstName || user?.email?.split("@")[0] || "there";
    return `Good ${timeOfDay}, ${firstName}!`;
  };

  return (
    <ProtectedRoute requireOrganization={false}>
      <Layout>
        <div className="space-y-6">
          {/* Page Header */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {getWelcomeMessage()}
                </h1>
                <p className="text-gray-600 mt-1">
                  Here&apos;s an overview of your projects and tasks.
                </p>
                {user?.organization && (
                  <p className="text-sm text-gray-500 mt-1">
                    Organization: {user.organization.name}
                  </p>
                )}
              </div>
              <div className="flex space-x-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleRefresh}
                  loading={isRefreshing}
                  disabled={isRefreshing}
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Refresh
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleCreateProject}
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  New Project
                </Button>
              </div>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <svg
                  className="w-5 h-5 text-red-400 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-red-800">
                    Failed to load dashboard data
                  </h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
              <div className="mt-3">
                <Button variant="secondary" size="sm" onClick={handleRefresh}>
                  Try again
                </Button>
              </div>
            </div>
          )}

          {/* Dashboard Components */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Task Statistics - Full width on mobile, spans 2 columns on large screens */}
            <div className="lg:col-span-2">
              <TaskStats
                stats={
                  dashboardData?.stats || {
                    totalProjects: 0,
                    activeProjects: 0,
                    completedProjects: 0,
                    totalTasks: 0,
                    completedTasks: 0,
                    overallCompletionRate: 0,
                    projectsByStatus: [],
                    tasksByStatus: [],
                  }
                }
                isLoading={isLoading}
                organizationId={user?.organization?.id}
              />
            </div>

            {/* Recent Activity */}
            <div className="lg:col-span-1">
              <RecentActivity
                recentTasks={dashboardData?.recentTasks || []}
                isLoading={isLoading}
                maxItems={8}
              />
            </div>
          </div>

          {/* Project Overview - Full width */}
          <ProjectOverview
            projects={dashboardData?.projects || []}
            isLoading={isLoading}
            onCreateProject={handleCreateProject}
          />
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
