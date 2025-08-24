/**
 * Task Detail Page
 *
 * Detailed view of a single task with full information, comments, and editing capabilities.
 * Provides comprehensive task management including status updates, assignments,
 * due dates, and comment threads for collaboration.
 */

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation } from "@apollo/client/react";
import { TaskForm } from "@/components/tasks/TaskForm";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { useTaskWithComments, useTasks } from "@/hooks/useTasks";
import { useProjects } from "@/hooks/useProjects";
import {
  CREATE_COMMENT_MUTATION,
  UPDATE_COMMENT_MUTATION,
  DELETE_COMMENT_MUTATION,
} from "@/graphql/mutations";
import { cn } from "@/utils/cn";
import type {
  TaskComment,
  TaskStatus,
  UpdateTaskInput,
  CreateTaskInput,
  CreateTaskCommentInput,
} from "@/types";

interface TaskDetailProps {
  taskId?: string;
  className?: string;
}

/**
 * TaskDetail component for viewing and managing individual tasks
 */
export const TaskDetail: React.FC<TaskDetailProps> = ({
  taskId: propTaskId,
  className,
}) => {
  const params = useParams();
  const router = useRouter();
  const taskId = propTaskId || (params?.id as string);

  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [editingComment, setEditingComment] = useState<TaskComment | null>(
    null
  );
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch task with comments
  const {
    data: task,
    loading: taskLoading,
    error: taskError,
    refetch: refetchTask,
  } = useTaskWithComments(taskId);

  // Get task operations
  const { updateTask, deleteTask } = useTasks();

  // Get projects for editing
  const { data: projects } = useProjects({ limit: 100 });

  // Comment mutations
  const [createCommentMutation] = useMutation(CREATE_COMMENT_MUTATION);
  const [updateCommentMutation] = useMutation(UPDATE_COMMENT_MUTATION);
  const [deleteCommentMutation] = useMutation(DELETE_COMMENT_MUTATION);

  /**
   * Format date for display
   */
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  /**
   * Format relative date
   */
  const formatRelativeDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = (now.getTime() - date.getTime()) / 1000;

    if (diffInSeconds < 60) return "just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800)
      return `${Math.floor(diffInSeconds / 86400)}d ago`;

    return formatDate(dateString);
  };

  /**
   * Get status badge styling
   */
  const getStatusBadge = (status: TaskStatus) => {
    const baseClasses =
      "inline-flex px-3 py-1 text-sm font-semibold rounded-full";
    switch (status) {
      case "TODO":
        return `${baseClasses} bg-gray-100 text-gray-800`;
      case "IN_PROGRESS":
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case "DONE":
        return `${baseClasses} bg-green-100 text-green-800`;
      case "CANCELLED":
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  /**
   * Check if task is overdue
   */
  const isOverdue = (): boolean => {
    if (!task?.dueDate || task.status === "DONE") return false;
    return new Date(task.dueDate) < new Date();
  };

  /**
   * Handle quick status change
   */
  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (!task || newStatus === task.status) return;

    setIsUpdating(true);
    try {
      await updateTask(task.id, { status: newStatus });
      await refetchTask();
    } catch (error) {
      console.error("Failed to update task status:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Handle task form submission
   */
  const handleTaskFormSubmit = async (data: UpdateTaskInput) => {
    if (!task) return;

    try {
      await updateTask(task.id, data);
      await refetchTask();
      setShowEditForm(false);
    } catch (error) {
      console.error("Failed to update task:", error);
      throw error;
    }
  };

  /**
   * Handle task deletion
   */
  const handleTaskDelete = async () => {
    if (!task) return;

    try {
      await deleteTask(task.id);
      router.push(`/tasks?project=${task.project.id}`);
    } catch (error) {
      console.error("Failed to delete task:", error);
    }
  };

  /**
   * Handle comment submission
   */
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !task) return;

    try {
      const input: CreateTaskCommentInput = {
        content: newComment.trim(),
        taskId: task.id,
      };

      await createCommentMutation({
        variables: { input },
      });

      setNewComment("");
      await refetchTask();
    } catch (error) {
      console.error("Failed to create comment:", error);
    }
  };

  /**
   * Handle comment edit
   */
  const handleCommentEdit = async (
    comment: TaskComment,
    newContent: string
  ) => {
    if (!newContent.trim() || newContent === comment.content) {
      setEditingComment(null);
      return;
    }

    try {
      await updateCommentMutation({
        variables: {
          id: comment.id,
          input: { content: newContent.trim(), taskId: comment.task.id },
        },
      });

      setEditingComment(null);
      await refetchTask();
    } catch (error) {
      console.error("Failed to update comment:", error);
    }
  };

  /**
   * Handle comment deletion
   */
  const handleCommentDelete = async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;

    try {
      await deleteCommentMutation({
        variables: { id: commentId },
      });

      await refetchTask();
    } catch (error) {
      console.error("Failed to delete comment:", error);
    }
  };

  if (taskLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center space-y-3">
          <svg
            className="animate-spin h-8 w-8 text-gray-400"
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
          <span className="text-gray-500">Loading task...</span>
        </div>
      </div>
    );
  }

  if (taskError || !task) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-center">
          <svg
            className="w-16 h-16 text-gray-300 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Task not found
          </h3>
          <p className="text-gray-500 mb-4">
            {taskError || "The requested task could not be loaded."}
          </p>
          <Link href="/tasks">
            <Button variant="primary">Back to Tasks</Button>
          </Link>
        </div>
      </div>
    );
  }

  const statusOptions = [
    { value: "TODO", label: "To Do" },
    { value: "IN_PROGRESS", label: "In Progress" },
    { value: "DONE", label: "Done" },
    { value: "CANCELLED", label: "Cancelled" },
  ];

  const comments = (task.comments as TaskComment[]) || [];

  return (
    <div className={cn("max-w-4xl mx-auto", className)}>
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-6">
        <Link href="/projects" className="hover:text-gray-900">
          Projects
        </Link>
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
            clipRule="evenodd"
          />
        </svg>
        <Link
          href={`/projects/${task.project.id}`}
          className="hover:text-gray-900"
        >
          {task.project.name}
        </Link>
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
            clipRule="evenodd"
          />
        </svg>
        <Link
          href={`/tasks?project=${task.project.id}`}
          className="hover:text-gray-900"
        >
          Tasks
        </Link>
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
            clipRule="evenodd"
          />
        </svg>
        <span className="text-gray-900 font-medium truncate">{task.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Task Header */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start space-x-3">
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    {task.title}
                  </h1>
                  <div className="flex items-center space-x-3">
                    <span className={getStatusBadge(task.status)}>
                      {task.status.replace("_", " ")}
                    </span>
                    {isOverdue() && (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                        Overdue
                      </span>
                    )}
                    <span className="text-sm text-gray-500">
                      #{task.id.slice(-6)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowEditForm(true)}
                  disabled={isUpdating}
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
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  Edit
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isUpdating}
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
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  Delete
                </Button>
              </div>
            </div>

            {/* Task Description */}
            {task.description && (
              <div className="prose prose-sm max-w-none">
                <p className="text-gray-700 whitespace-pre-wrap">
                  {task.description}
                </p>
              </div>
            )}
          </div>

          {/* Comments Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Comments ({comments.length})
            </h2>

            {/* New Comment Form */}
            <form onSubmit={handleCommentSubmit} className="mb-6">
              <Input
                id="new-comment"
                name="newComment"
                type="textarea"
                placeholder="Add a comment..."
                value={newComment}
                onChange={setNewComment}
                disabled={isUpdating}
              />
              <div className="flex justify-end mt-3">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={!newComment.trim() || isUpdating}
                >
                  Add Comment
                </Button>
              </div>
            </form>

            {/* Comments List */}
            <div className="space-y-4">
              {comments.length === 0 ? (
                <div className="text-center py-8">
                  <svg
                    className="w-12 h-12 text-gray-300 mx-auto mb-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                  <p className="text-gray-500">No comments yet</p>
                  <p className="text-sm text-gray-400">
                    Be the first to add a comment
                  </p>
                </div>
              ) : (
                comments.map((comment: TaskComment) => (
                  <div
                    key={comment.id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                          <svg
                            className="w-5 h-5 text-gray-600"
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
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {comment.authorEmail}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatRelativeDate(comment.timestamp)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingComment(comment)}
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCommentDelete(comment.id)}
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
                      </div>
                    </div>

                    {editingComment?.id === comment.id ? (
                      <div className="space-y-2">
                        <Input
                          id={`edit-comment-${comment.id}`}
                          name={`editComment-${comment.id}`}
                          type="textarea"
                          value={editingComment?.content || ""}
                          onChange={(value) =>
                            editingComment &&
                            setEditingComment({
                              ...editingComment,
                              content: value,
                            })
                          }
                        />
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() =>
                              editingComment &&
                              handleCommentEdit(comment, editingComment.content)
                            }
                          >
                            Save
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setEditingComment(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-700 whitespace-pre-wrap">
                        {comment.content}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Status Update */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Status</h3>
            <div className="space-y-2">
              {statusOptions.map((status) => (
                <button
                  key={status.value}
                  onClick={() => handleStatusChange(status.value as TaskStatus)}
                  disabled={isUpdating || task.status === status.value}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm rounded-md transition-colors",
                    task.status === status.value
                      ? "bg-blue-100 text-blue-800 font-medium cursor-default"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  )}
                >
                  {status.label}
                  {task.status === status.value && (
                    <svg
                      className="w-4 h-4 ml-2 inline"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Task Details */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Details
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <dt className="text-gray-500">Project</dt>
                <dd className="text-gray-900 font-medium">
                  <Link
                    href={`/projects/${task.project.id}`}
                    className="hover:text-blue-600"
                  >
                    {task.project.name}
                  </Link>
                </dd>
              </div>

              {task.assigneeEmail && (
                <div>
                  <dt className="text-gray-500">Assignee</dt>
                  <dd className="text-gray-900">{task.assigneeEmail}</dd>
                </div>
              )}

              {task.dueDate && (
                <div>
                  <dt className="text-gray-500">Due Date</dt>
                  <dd
                    className={cn(
                      "text-gray-900",
                      isOverdue() && "text-red-600 font-medium"
                    )}
                  >
                    {formatDate(task.dueDate)}
                    {isOverdue() && " (Overdue)"}
                  </dd>
                </div>
              )}

              <div>
                <dt className="text-gray-500">Created</dt>
                <dd className="text-gray-900">{formatDate(task.createdAt)}</dd>
              </div>

              {task.commentCount && task.commentCount > 0 && (
                <div>
                  <dt className="text-gray-500">Comments</dt>
                  <dd className="text-gray-900">{task.commentCount}</dd>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Actions
            </h3>
            <div className="space-y-2">
              <Link href={`/tasks?project=${task.project.id}`}>
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full justify-start"
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
                      d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  View All Tasks
                </Button>
              </Link>
              <Link href={`/tasks/board?project=${task.project.id}`}>
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full justify-start"
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
                      d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2h2a2 2 0 002-2z"
                    />
                  </svg>
                  Task Board
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Task Modal */}
      {showEditForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 w-full max-w-2xl">
            <TaskForm
              task={task}
              projects={projects || []}
              onSubmit={
                handleTaskFormSubmit as (
                  data: CreateTaskInput | UpdateTaskInput
                ) => Promise<void>
              }
              onCancel={() => setShowEditForm(false)}
              className="shadow-xl"
            />
          </div>
        </div>
      )}

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
                  Are you sure you want to delete &quot;{task.title}&quot;? This
                  action cannot be undone and will also delete all associated
                  comments.
                </p>
              </div>
              <div className="flex items-center px-4 py-3 space-x-3">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleTaskDelete}
                  loading={isUpdating}
                  className="flex-1"
                >
                  Delete Task
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isUpdating}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskDetail;

export async function getServerSideProps() {
  return {
    props: {},
  };
}
