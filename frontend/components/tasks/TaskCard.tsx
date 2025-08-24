/**
 * Task Card Component
 *
 * Displays task information in a card format. Supports drag-and-drop functionality
 * for kanban boards and provides quick actions for task management.
 * Can be used in both board and list views.
 */

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/common/Button";
import { cn } from "@/utils/cn";
import type { Task, TaskStatus } from "@/types";

export interface TaskCardProps {
  task: Task;
  view?: "board" | "list";
  draggable?: boolean;
  onStatusChange?: (taskId: string, status: TaskStatus) => Promise<void>;
  onDelete?: (taskId: string) => Promise<void>;
  onEdit?: (task: Task) => void;
  className?: string;
}

/**
 * TaskCard component for displaying task information
 * Supports both board and list view modes with drag-and-drop functionality
 */
export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  view = "board",
  draggable = false,
  onStatusChange,
  onDelete,
  onEdit,
  className,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
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
  const getStatusBadge = (status: TaskStatus) => {
    const baseClasses =
      "inline-flex px-2 py-1 text-xs font-semibold rounded-full";
    switch (status) {
      case "TODO":
        return `${baseClasses} bg-gray-100 text-gray-800`;
      case "IN_PROGRESS":
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case "DONE":
        return `${baseClasses} bg-green-100 text-green-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  /**
   * Get priority styling (if priority field is added in the future)
   */
  const getPriorityIndicator = (priority?: string) => {
    if (!priority) return null;

    switch (priority.toLowerCase()) {
      case "high":
        return (
          <div
            className="w-3 h-3 bg-red-500 rounded-full"
            title="High Priority"
          />
        );
      case "medium":
        return (
          <div
            className="w-3 h-3 bg-yellow-500 rounded-full"
            title="Medium Priority"
          />
        );
      case "low":
        return (
          <div
            className="w-3 h-3 bg-green-500 rounded-full"
            title="Low Priority"
          />
        );
      default:
        return null;
    }
  };

  /**
   * Check if task is overdue
   */
  const isOverdue = (): boolean => {
    if (!task.dueDate || task.status === "DONE") return false;
    return new Date(task.dueDate) < new Date();
  };

  /**
   * Handle status change
   */
  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (!onStatusChange || newStatus === task.status) return;

    setIsUpdating(true);
    try {
      await onStatusChange(task.id, newStatus);
    } catch (error) {
      console.error("Failed to update task status:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Handle task deletion
   */
  const handleDelete = async () => {
    if (!onDelete) return;

    setIsDeleting(true);
    try {
      await onDelete(task.id);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error("Failed to delete task:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Handle drag start
   */
  const handleDragStart = (e: React.DragEvent) => {
    if (!draggable) {
      e.preventDefault();
      return;
    }

    e.dataTransfer.setData(
      "text/plain",
      JSON.stringify({
        taskId: task.id,
        currentStatus: task.status,
      })
    );
    e.dataTransfer.effectAllowed = "move";
  };

  const cardClasses = cn(
    "bg-white rounded-lg shadow-sm border border-gray-200 transition-all duration-200",
    {
      "p-3 hover:shadow-md cursor-pointer": view === "board",
      "p-4 hover:shadow-md": view === "list",
      "cursor-move": draggable,
      "opacity-50": isUpdating,
      "border-red-300 bg-red-50": isOverdue() && view === "board",
    },
    className
  );

  if (view === "list") {
    return (
      <>
        <div className={cardClasses}>
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-3">
                <Link
                  href={`/tasks/${task.id}`}
                  className="text-lg font-semibold text-gray-900 hover:text-blue-600 truncate"
                >
                  {task.title}
                </Link>
                <span className={getStatusBadge(task.status)}>
                  {task.status.replace("_", " ")}
                </span>
                {isOverdue() && (
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                    Overdue
                  </span>
                )}
              </div>
              <p className="text-gray-600 mt-1 truncate">
                {task.description || "No description provided"}
              </p>
              <div className="flex items-center space-x-6 mt-2 text-sm text-gray-500">
                <span>Project: {task.project.name}</span>
                {task.assigneeEmail && (
                  <span>Assigned to: {task.assigneeEmail}</span>
                )}
                <span>Created: {formatDate(task.createdAt)}</span>
                {task.dueDate && (
                  <span
                    className={isOverdue() ? "text-red-600 font-medium" : ""}
                  >
                    Due: {formatDate(task.dueDate)}
                  </span>
                )}
                {task.commentCount && task.commentCount > 0 && (
                  <span className="flex items-center">
                    <svg
                      className="w-4 h-4 mr-1"
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
                    {task.commentCount} comment
                    {task.commentCount !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2 ml-4">
              <Link href={`/tasks/${task.id}`}>
                <Button variant="secondary" size="sm">
                  View
                </Button>
              </Link>
              {onEdit && (
                <Button variant="ghost" size="sm" onClick={() => onEdit(task)}>
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
              )}
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
                  Delete Task
                </h3>
                <div className="mt-2 px-7 py-3">
                  <p className="text-sm text-gray-500">
                    Are you sure you want to delete &quot;{task.title}&quot;?
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

  // Board view (default)
  return (
    <>
      <div
        className={cardClasses}
        draggable={draggable}
        onDragStart={handleDragStart}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center space-x-2">
            {getPriorityIndicator()}
            {isOverdue() && (
              <div
                className="w-2 h-2 bg-red-500 rounded-full"
                title="Overdue"
              />
            )}
          </div>
          <div className="flex items-center space-x-1">
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(task)}
                className="p-1"
              >
                <svg
                  className="w-3 h-3"
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
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="p-1"
              >
                <svg
                  className="w-3 h-3 text-red-500"
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
          href={`/tasks/${task.id}`}
          className="block hover:text-blue-600 transition-colors"
        >
          <h4 className="font-semibold text-gray-900 mb-2 line-clamp-2">
            {task.title}
          </h4>
        </Link>

        {task.description && (
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
            {task.description}
          </p>
        )}

        {/* Task metadata */}
        <div className="space-y-2">
          {task.assigneeEmail && (
            <div className="flex items-center text-xs text-gray-500">
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
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              {task.assigneeEmail}
            </div>
          )}

          {task.dueDate && (
            <div
              className={cn(
                "flex items-center text-xs",
                isOverdue() ? "text-red-600 font-medium" : "text-gray-500"
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
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              Due: {formatDate(task.dueDate)}
            </div>
          )}

          {task.commentCount && task.commentCount > 0 && (
            <div className="flex items-center text-xs text-gray-500">
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
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              {task.commentCount}
            </div>
          )}

          <div className="text-xs text-gray-400">#{task.id.slice(-6)}</div>
        </div>

        {/* Status change buttons for board view */}
        {onStatusChange && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Status:</span>
              <select
                value={task.status}
                onChange={(e) =>
                  handleStatusChange(e.target.value as TaskStatus)
                }
                disabled={isUpdating}
                className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={(e) => e.stopPropagation()}
              >
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="DONE">Done</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal for Board View */}
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
                Delete Task
              </h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete &quot;{task.title}&quot;? This
                  action cannot be undone.
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
