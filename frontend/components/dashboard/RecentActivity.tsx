/**
 * RecentActivity Component
 *
 * Displays a feed of recent project and task activities within the organization.
 * Shows actions like task completions, project updates, new assignments, and other
 * relevant events with timestamps and user information.
 */

"use client";

import React from "react";
import Link from "next/link";
import { Task, Project } from "@/types";

interface ActivityItem {
  id: string;
  type:
    | "task_completed"
    | "task_created"
    | "task_updated"
    | "project_created"
    | "project_updated"
    | "comment_added";
  description: string;
  timestamp: string;
  user?: {
    email: string;
    firstName?: string;
    lastName?: string;
  };
  relatedTask?: Task;
  relatedProject?: Project;
}

interface RecentActivityProps {
  activities?: ActivityItem[];
  recentTasks?: Task[];
  isLoading?: boolean;
  maxItems?: number;
}

/**
 * Recent activity feed component
 * Shows timeline of recent actions and events in the organization
 */
export const RecentActivity: React.FC<RecentActivityProps> = ({
  activities = [],
  recentTasks = [],
  isLoading = false,
  maxItems = 10,
}) => {
  const getActivityIcon = (type: ActivityItem["type"]): React.ReactNode => {
    switch (type) {
      case "task_completed":
        return (
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <svg
              className="w-4 h-4 text-green-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        );
      case "task_created":
        return (
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <svg
              className="w-4 h-4 text-blue-600"
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
          </div>
        );
      case "task_updated":
        return (
          <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
            <svg
              className="w-4 h-4 text-yellow-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </div>
        );
      case "project_created":
        return (
          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
            <svg
              className="w-4 h-4 text-purple-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
        );
      case "project_updated":
        return (
          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
            <svg
              className="w-4 h-4 text-indigo-600"
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
          </div>
        );
      case "comment_added":
        return (
          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
            <svg
              className="w-4 h-4 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
            <svg
              className="w-4 h-4 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        );
    }
  };

  const formatRelativeTime = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInMinutes = Math.floor(
        (now.getTime() - date.getTime()) / (1000 * 60)
      );

      if (diffInMinutes < 1) return "Just now";
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) return `${diffInHours}h ago`;

      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) return `${diffInDays}d ago`;

      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    } catch {
      return "Unknown";
    }
  };

  const getUserDisplayName = (user?: ActivityItem["user"]): string => {
    if (!user) return "Unknown user";
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.email;
  };

  const generateRecentTaskActivities = (): ActivityItem[] => {
    return recentTasks.slice(0, maxItems).map((task) => ({
      id: `task-${task.id}`,
      type: task.status === "DONE" ? "task_completed" : "task_created",
      description:
        task.status === "DONE"
          ? `completed task "${task.title}"`
          : `created task "${task.title}"`,
      timestamp: task.createdAt,
      relatedTask: task,
    }));
  };

  const allActivities = [...activities, ...generateRecentTaskActivities()]
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    .slice(0, maxItems);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="h-6 bg-gray-200 rounded w-32 mb-6 animate-pulse"></div>
        <div className="space-y-4">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex items-start space-x-3 animate-pulse">
              <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Recent Activity
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Latest updates from your organization
          </p>
        </div>
        <Link
          href="/activity"
          className="text-sm text-blue-600 hover:text-blue-500 font-medium"
        >
          View all →
        </Link>
      </div>

      {/* Activity Feed */}
      {allActivities.length === 0 ? (
        <div className="text-center py-8">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No recent activity
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Activity will appear here as your team works on projects and tasks.
          </p>
        </div>
      ) : (
        <div className="flow-root">
          <ul className="-mb-8">
            {allActivities.map((activity, index) => (
              <li key={activity.id}>
                <div className="relative pb-8">
                  {index !== allActivities.length - 1 && (
                    <span
                      className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                      aria-hidden="true"
                    />
                  )}
                  <div className="relative flex items-start space-x-3">
                    {/* Activity Icon */}
                    {getActivityIcon(activity.type)}

                    {/* Activity Content */}
                    <div className="min-w-0 flex-1">
                      <div>
                        <div className="text-sm">
                          <span className="font-medium text-gray-900">
                            {getUserDisplayName(activity.user)}
                          </span>{" "}
                          <span className="text-gray-600">
                            {activity.description}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          {formatRelativeTime(activity.timestamp)}
                        </p>
                      </div>

                      {/* Related Links */}
                      <div className="mt-2 text-xs">
                        {activity.relatedTask && (
                          <Link
                            href={`/tasks/${activity.relatedTask.id}`}
                            className="text-blue-600 hover:text-blue-500 font-medium"
                          >
                            View task →
                          </Link>
                        )}
                        {activity.relatedProject && (
                          <Link
                            href={`/projects/${activity.relatedProject.id}`}
                            className="text-blue-600 hover:text-blue-500 font-medium"
                          >
                            View project →
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Show More Link */}
      {allActivities.length >= maxItems && (
        <div className="mt-6 text-center">
          <Link
            href="/activity"
            className="text-sm text-blue-600 hover:text-blue-500 font-medium"
          >
            Show more activity
          </Link>
        </div>
      )}
    </div>
  );
};

export default RecentActivity;
