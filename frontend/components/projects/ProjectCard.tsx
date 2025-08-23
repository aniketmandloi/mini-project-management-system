/**
 * Project Card Component
 *
 * Displays project information in a card format. Supports both grid and list
 * view modes with different layouts. Includes project status, progress,
 * and quick action buttons.
 */

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/common/Button";
import { cn } from "@/utils/cn";
import type { Project } from "@/types";

export interface ProjectCardProps {
  project: Project;
  view?: "grid" | "list";
  onDelete?: (projectId: string) => Promise<void>;
  className?: string;
}

/**
 * ProjectCard component for displaying project information
 * Supports both grid and list view modes with responsive design
 */
export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  view = "grid",
  onDelete,
  className,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  /**
   * Format date for display
   */
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  /**
   * Get status badge styling
   */
  const getStatusBadge = (status: string) => {
    const baseClasses =
      "inline-flex px-2 py-1 text-xs font-semibold rounded-full";
    switch (status) {
      case "ACTIVE":
        return `${baseClasses} bg-green-100 text-green-800`;
      case "PLANNING":
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case "ON_HOLD":
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case "COMPLETED":
        return `${baseClasses} bg-gray-100 text-gray-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  /**
   * Get completion percentage
   */
  const getCompletionPercentage = (): number => {
    if (!project.taskCount || project.taskCount === 0) return 0;
    return Math.round(
      ((project.completedTaskCount || 0) / project.taskCount) * 100
    );
  };

  /**
   * Handle project deletion
   */
  const handleDelete = async () => {
    if (!onDelete) return;

    setIsDeleting(true);
    try {
      await onDelete(project.id);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error("Failed to delete project:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Check if project is overdue
   */
  const isOverdue = (): boolean => {
    if (!project.dueDate) return false;
    return (
      new Date(project.dueDate) < new Date() && project.status !== "COMPLETED"
    );
  };

  if (view === "list") {
    return (
      <>
        <div
          className={cn(
            "bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow",
            className
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-3">
                <Link
                  href={`/projects/${project.id}`}
                  className="text-lg font-semibold text-gray-900 hover:text-blue-600 truncate"
                >
                  {project.name}
                </Link>
                <span className={getStatusBadge(project.status)}>
                  {project.status.replace("_", " ")}
                </span>
                {isOverdue() && (
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                    Overdue
                  </span>
                )}
              </div>
              <p className="text-gray-600 mt-1 truncate">
                {project.description || "No description provided"}
              </p>
              <div className="flex items-center space-x-6 mt-2 text-sm text-gray-500">
                <span>
                  Tasks: {project.completedTaskCount || 0} /{" "}
                  {project.taskCount || 0}
                </span>
                {project.taskCount && project.taskCount > 0 && (
                  <span>Progress: {getCompletionPercentage()}%</span>
                )}
                <span>Created: {formatDate(project.createdAt)}</span>
                {project.dueDate && (
                  <span
                    className={isOverdue() ? "text-red-600 font-medium" : ""}
                  >
                    Due: {formatDate(project.dueDate)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2 ml-4">
              <Link href={`/projects/${project.id}`}>
                <Button variant="secondary" size="sm">
                  View
                </Button>
              </Link>
              <Link href={`/projects/${project.id}/edit`}>
                <Button variant="ghost" size="sm">
                  <svg
                    className="w-4 h-4"
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
                </Button>
              </Link>
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <svg
                    className="w-4 h-4 text-red-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </Button>
              )}
            </div>
          </div>
          {/* Progress Bar for List View */}
          {project.taskCount && project.taskCount > 0 && (
            <div className="mt-3">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${getCompletionPercentage()}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3 text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <svg
                    className="h-6 w-6 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mt-2">
                  Delete Project
                </h3>
                <div className="mt-2 px-7 py-3">
                  <p className="text-sm text-gray-500">
                    Are you sure you want to delete &quot;{project.name}&quot;?
                    This action cannot be undone.
                  </p>
                </div>
                <div className="flex items-center px-4 py-3 space-x-3">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleDelete}
                    loading={isDeleting}
                    className="flex-1"
                  >
                    Delete
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Grid view
  return (
    <>
      <div
        className={cn(
          "bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow",
          className
        )}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className={getStatusBadge(project.status)}>
              {project.status.replace("_", " ")}
            </span>
            {isOverdue() && (
              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                Overdue
              </span>
            )}
          </div>
          <div className="flex items-center space-x-1">
            <Link href={`/projects/${project.id}/edit`}>
              <Button variant="ghost" size="sm">
                <svg
                  className="w-4 h-4"
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
              </Button>
            </Link>
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <svg
                  className="w-4 h-4 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </Button>
            )}
          </div>
        </div>

        <Link
          href={`/projects/${project.id}`}
          className="block hover:text-blue-600 transition-colors"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
            {project.name}
          </h3>
        </Link>

        <p className="text-gray-600 text-sm mb-4 line-clamp-3">
          {project.description || "No description provided"}
        </p>

        {/* Task Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm text-gray-500 mb-1">
            <span>Tasks Progress</span>
            <span>
              {project.completedTaskCount || 0} / {project.taskCount || 0}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${getCompletionPercentage()}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
            <span>0%</span>
            <span className="font-medium">
              {getCompletionPercentage()}% Complete
            </span>
            <span>100%</span>
          </div>
        </div>

        {/* Project Dates */}
        <div className="text-xs text-gray-500 space-y-1 mb-4">
          <div className="flex items-center">
            <svg
              className="w-3 h-3 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            Created: {formatDate(project.createdAt)}
          </div>
          {project.dueDate && (
            <div
              className={cn(
                "flex items-center",
                isOverdue() ? "text-red-600 font-medium" : ""
              )}
            >
              <svg
                className="w-3 h-3 mr-1"
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
              Due: {formatDate(project.dueDate)}
              {isOverdue() && " (Overdue)"}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <Link href={`/projects/${project.id}`} className="flex-1">
            <Button variant="secondary" size="sm" className="w-full">
              View Details
            </Button>
          </Link>
          <Link href={`/tasks?project=${project.id}`}>
            <Button variant="ghost" size="sm">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                />
              </svg>
            </Button>
          </Link>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg
                  className="h-6 w-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-2">
                Delete Project
              </h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete &quot;{project.name}&quot;?
                  This action cannot be undone.
                </p>
              </div>
              <div className="flex items-center px-4 py-3 space-x-3">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleDelete}
                  loading={isDeleting}
                  className="flex-1"
                >
                  Delete
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
