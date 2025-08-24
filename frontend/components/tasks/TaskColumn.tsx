/**
 * Task Column Component
 *
 * A column component for the kanban board that displays tasks grouped by status.
 * Supports drag-and-drop functionality and provides visual feedback for drop zones.
 * Handles task status changes and provides column-level actions.
 */

"use client";

import React, { useState } from "react";
import { TaskCard } from "./TaskCard";
import { Button } from "@/components/common/Button";
import { cn } from "@/utils/cn";
import type { Task, TaskStatus } from "@/types";

export interface TaskColumnProps {
  title: string;
  status: TaskStatus;
  tasks: Task[];
  taskCount: number;
  onTaskStatusChange?: (taskId: string, newStatus: TaskStatus) => Promise<void>;
  onTaskDelete?: (taskId: string) => Promise<void>;
  onTaskEdit?: (task: Task) => void;
  onCreateTask?: (status: TaskStatus) => void;
  isLoading?: boolean;
  className?: string;
}

/**
 * TaskColumn component for kanban board
 * Handles drag-and-drop operations and task status management
 */
export const TaskColumn: React.FC<TaskColumnProps> = ({
  title,
  status,
  tasks,
  taskCount,
  onTaskStatusChange,
  onTaskDelete,
  onTaskEdit,
  onCreateTask,
  isLoading = false,
  className,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  /**
   * Get column color scheme based on status
   */
  const getColumnColors = (status: TaskStatus) => {
    switch (status) {
      case "TODO":
        return {
          header: "bg-gray-100 border-gray-300",
          headerText: "text-gray-700",
          accent: "border-gray-400",
          count: "bg-gray-200 text-gray-700",
        };
      case "IN_PROGRESS":
        return {
          header: "bg-blue-100 border-blue-300",
          headerText: "text-blue-700",
          accent: "border-blue-400",
          count: "bg-blue-200 text-blue-700",
        };
      case "DONE":
        return {
          header: "bg-green-100 border-green-300",
          headerText: "text-green-700",
          accent: "border-green-400",
          count: "bg-green-200 text-green-700",
        };
      default:
        return {
          header: "bg-gray-100 border-gray-300",
          headerText: "text-gray-700",
          accent: "border-gray-400",
          count: "bg-gray-200 text-gray-700",
        };
    }
  };

  const colors = getColumnColors(status);

  /**
   * Handle drag over event
   */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  };

  /**
   * Handle drag leave event
   */
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    // Only set drag over to false if we're leaving the column entirely
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragOver(false);
    }
  };

  /**
   * Handle drop event
   */
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (!onTaskStatusChange) return;

    try {
      const data = JSON.parse(e.dataTransfer.getData("text/plain"));
      const { taskId, currentStatus } = data;

      // Don't update if dropped on the same column
      if (currentStatus === status) return;

      setIsUpdating(true);
      await onTaskStatusChange(taskId, status);
    } catch (error) {
      console.error("Failed to update task status:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Handle task status change from within the task card
   */
  const handleTaskStatusChange = async (
    taskId: string,
    newStatus: TaskStatus
  ) => {
    if (!onTaskStatusChange) return;

    setIsUpdating(true);
    try {
      await onTaskStatusChange(taskId, newStatus);
    } catch (error) {
      console.error("Failed to update task status:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Handle task deletion
   */
  const handleTaskDelete = async (taskId: string) => {
    if (!onTaskDelete) return;

    setIsUpdating(true);
    try {
      await onTaskDelete(taskId);
    } catch (error) {
      console.error("Failed to delete task:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-gray-50 rounded-lg border-2 border-dashed transition-all duration-300 ease-in-out relative",
        {
          [colors.accent]: isDragOver,
          "border-gray-200": !isDragOver,
          "opacity-75": isUpdating || isLoading,
          "transform scale-105 shadow-lg bg-blue-25": isDragOver,
        },
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column Header */}
      <div
        className={cn(
          "flex items-center justify-between p-4 rounded-t-lg border-b border-gray-200",
          colors.header
        )}
      >
        <div className="flex items-center space-x-3">
          <h3
            className={cn(
              "font-semibold text-sm uppercase tracking-wide",
              colors.headerText
            )}
          >
            {title}
          </h3>
          <span
            className={cn(
              "px-2 py-1 text-xs font-medium rounded-full",
              colors.count
            )}
          >
            {taskCount}
          </span>
        </div>

        {onCreateTask && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCreateTask(status)}
            disabled={isUpdating || isLoading}
            className="p-1"
          >
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
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
          </Button>
        )}
      </div>

      {/* Tasks Container */}
      <div className="flex-1 p-3 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex flex-col items-center space-y-2">
              <svg
                className="animate-spin h-6 w-6 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span className="text-sm text-gray-500">Loading tasks...</span>
            </div>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <svg
              className="w-12 h-12 text-gray-300 mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <p className="text-sm text-gray-500 mb-2">
              No tasks in {title.toLowerCase()}
            </p>
            {onCreateTask && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onCreateTask(status)}
                disabled={isUpdating}
                className="text-xs"
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
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                Add task
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task, index) => (
              <TaskCard
                key={`${task.id}-${index}-${status}`}
                task={task}
                view="board"
                draggable={!!onTaskStatusChange}
                onStatusChange={handleTaskStatusChange}
                onDelete={onTaskDelete ? handleTaskDelete : undefined}
                onEdit={onTaskEdit}
                className="transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:border-blue-200"
              />
            ))}
          </div>
        )}

        {/* Drop Zone Indicator */}
        {isDragOver && (
          <div className="mt-3 p-6 border-2 border-dashed border-blue-400 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg text-center animate-pulse">
            <svg
              className="w-10 h-10 text-blue-500 mx-auto mb-3 animate-bounce"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
              />
            </svg>
            <p className="text-sm text-blue-700 font-semibold">
              Drop task here to move to {title}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Release to update status
            </p>
          </div>
        )}
      </div>

      {/* Column Footer (optional stats) */}
      {taskCount > 0 && (
        <div className="px-4 py-2 bg-gray-100 rounded-b-lg border-t border-gray-200">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              {tasks.length} task{tasks.length !== 1 ? "s" : ""} visible
            </span>
            {taskCount > tasks.length && (
              <span>{taskCount - tasks.length} more...</span>
            )}
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isUpdating && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <svg
              className="animate-spin h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Updating...</span>
          </div>
        </div>
      )}
    </div>
  );
};
