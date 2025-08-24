/**
 * Task List Page
 *
 * List view for managing tasks with advanced filtering, sorting, and bulk operations.
 * Provides a table-like interface for efficient task management and data analysis.
 * Supports pagination, search, and export functionality.
 */

"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { TaskCard } from "@/components/tasks/TaskCard";
import { TaskForm } from "@/components/tasks/TaskForm";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { useTasks } from "@/hooks/useTasks";
import { useProjects } from "@/hooks/useProjects";
import { cn } from "@/utils/cn";
import type {
  Task,
  TaskStatus,
  CreateTaskInput,
  UpdateTaskInput,
} from "@/types";

type SortField = "title" | "status" | "assigneeEmail" | "dueDate" | "createdAt";
type SortOrder = "asc" | "desc";

interface TaskListProps {
  projectId?: string;
  className?: string;
}

/**
 * TaskList component for table-style task management
 */
export const TaskList: React.FC<TaskListProps> = ({ projectId, className }) => {
  const searchParams = useSearchParams();
  const initialProjectId = projectId || searchParams?.get("project") || "";

  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "">("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [tasksPerPage] = useState(25);

  // Fetch tasks and projects
  const {
    data: allTasks,
    loading: tasksLoading,
    error: tasksError,
    refetch: refetchTasks,
    createTask,
    updateTask,
    deleteTask,
    bulkUpdateTasks,
    bulkDeleteTasks,
  } = useTasks({
    projectId: selectedProjectId || undefined,
    status: statusFilter || undefined,
    assigneeEmail: assigneeFilter || undefined,
    limit: 1000, // High limit for list view with client-side pagination
  });

  const {
    data: projects,
    loading: projectsLoading,
    error: projectsError,
  } = useProjects({ limit: 100 });

  /**
   * Get the selected project
   */
  const selectedProject = projects?.find((p) => p.id === selectedProjectId);

  /**
   * Filter and sort tasks
   */
  const getFilteredAndSortedTasks = (): Task[] => {
    if (!allTasks) return [];

    const filtered = allTasks.filter((task) => {
      const matchesSearch =
        !searchTerm ||
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (task.description &&
          task.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        task.id.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesSearch;
    });

    // Sort tasks
    filtered.sort((a, b) => {
      let aValue: string | number, bValue: string | number;

      switch (sortField) {
        case "title":
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case "status":
          aValue = a.status;
          bValue = b.status;
          break;
        case "assigneeEmail":
          aValue = a.assigneeEmail || "";
          bValue = b.assigneeEmail || "";
          break;
        case "dueDate":
          aValue = a.dueDate ? new Date(a.dueDate).getTime() : 0;
          bValue = b.dueDate ? new Date(b.dueDate).getTime() : 0;
          break;
        case "createdAt":
        default:
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
      }

      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  };

  const filteredTasks = getFilteredAndSortedTasks();

  /**
   * Paginate tasks
   */
  const getPaginatedTasks = (): Task[] => {
    const startIndex = (currentPage - 1) * tasksPerPage;
    const endIndex = startIndex + tasksPerPage;
    return filteredTasks.slice(startIndex, endIndex);
  };

  const paginatedTasks = getPaginatedTasks();
  const totalPages = Math.ceil(filteredTasks.length / tasksPerPage);

  /**
   * Handle sort change
   */
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  /**
   * Handle task selection
   */
  const handleTaskSelect = (taskId: string, selected: boolean) => {
    setSelectedTasks((prev) => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(taskId);
      } else {
        newSet.delete(taskId);
      }
      return newSet;
    });
  };

  /**
   * Handle select all tasks
   */
  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedTasks(new Set(paginatedTasks.map((task) => task.id)));
    } else {
      setSelectedTasks(new Set());
    }
  };

  /**
   * Handle task deletion
   */
  const handleTaskDelete = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      setSelectedTasks((prev) => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
    } catch (error) {
      console.error("Failed to delete task:", error);
    }
  };

  /**
   * Handle bulk operations
   */
  const handleBulkStatusUpdate = async (status: TaskStatus) => {
    if (selectedTasks.size === 0) return;

    try {
      await bulkUpdateTasks(Array.from(selectedTasks), { status });
      setSelectedTasks(new Set());
    } catch (error) {
      console.error("Failed to bulk update tasks:", error);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTasks.size === 0) return;

    if (
      !confirm(
        `Are you sure you want to delete ${selectedTasks.size} selected task(s)?`
      )
    ) {
      return;
    }

    try {
      await bulkDeleteTasks(Array.from(selectedTasks));
      setSelectedTasks(new Set());
    } catch (error) {
      console.error("Failed to bulk delete tasks:", error);
    }
  };

  /**
   * Handle task edit
   */
  const handleTaskEdit = (task: Task) => {
    setEditingTask(task);
    setShowTaskForm(true);
  };

  /**
   * Handle create new task
   */
  const handleCreateTask = () => {
    if (!selectedProjectId) {
      alert("Please select a project first");
      return;
    }
    setEditingTask(null);
    setShowTaskForm(true);
  };

  /**
   * Handle task form submission
   */
  const handleTaskFormSubmit = async (
    data: CreateTaskInput | UpdateTaskInput
  ) => {
    try {
      if (editingTask) {
        await updateTask(editingTask.id, data as UpdateTaskInput);
      } else {
        await createTask(data as CreateTaskInput);
      }
      setShowTaskForm(false);
      setEditingTask(null);
    } catch (error) {
      console.error("Failed to save task:", error);
      throw error;
    }
  };

  /**
   * Handle task form cancel
   */
  const handleTaskFormCancel = () => {
    setShowTaskForm(false);
    setEditingTask(null);
  };

  /**
   * Get unique assignees for filter dropdown
   */
  const getUniqueAssignees = (): string[] => {
    if (!allTasks) return [];
    const assignees = allTasks
      .map((task) => task.assigneeEmail)
      .filter((email): email is string => !!email)
      .filter((email, index, self) => self.indexOf(email) === index);
    return assignees.sort();
  };

  /**
   * Reset pagination when filters change
   */
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    statusFilter,
    assigneeFilter,
    selectedProjectId,
    sortField,
    sortOrder,
  ]);

  const isLoading = tasksLoading || projectsLoading;
  const hasError = tasksError || projectsError;
  const hasSelectedTasks = selectedTasks.size > 0;
  const isAllSelected =
    paginatedTasks.length > 0 &&
    paginatedTasks.every((task) => selectedTasks.has(task.id));

  const statusOptions = [
    { value: "", label: "All statuses" },
    { value: "TODO", label: "To Do" },
    { value: "IN_PROGRESS", label: "In Progress" },
    { value: "DONE", label: "Done" },
  ];

  return (
    <div className={cn("h-full flex flex-col", className)}>
      {/* Project Selection and Task Summary */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {selectedProject ? selectedProject.name : "Select a Project"}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {selectedProject
                ? `${filteredTasks.length} task${
                    filteredTasks.length !== 1 ? "s" : ""
                  } found`
                : "Choose a project to view and manage tasks"}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="primary"
              onClick={handleCreateTask}
              disabled={!selectedProjectId || isLoading}
              className="shadow-sm"
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
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              New Task
            </Button>
          </div>
        </div>

        {/* Task Statistics */}
        {selectedProject && filteredTasks.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
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
                      d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-blue-900">
                    Total Tasks
                  </p>
                  <p className="text-2xl font-semibold text-blue-900">
                    {filteredTasks.length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
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
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-yellow-900">
                    In Progress
                  </p>
                  <p className="text-2xl font-semibold text-yellow-900">
                    {
                      filteredTasks.filter((t) => t.status === "IN_PROGRESS")
                        .length
                    }
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-900">
                    Completed
                  </p>
                  <p className="text-2xl font-semibold text-green-900">
                    {filteredTasks.filter((t) => t.status === "DONE").length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-red-600"
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
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-900">Overdue</p>
                  <p className="text-2xl font-semibold text-red-900">
                    {
                      filteredTasks.filter((t) => {
                        if (!t.dueDate || t.status === "DONE") return false;
                        return new Date(t.dueDate) < new Date();
                      }).length
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filters and Controls */}
      <div className="p-6 border-b border-gray-200 bg-gray-50">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Project Filter */}
            <Input
              id="project-filter"
              name="projectFilter"
              type="select"
              label="Project"
              placeholder="All projects"
              value={selectedProjectId}
              onChange={setSelectedProjectId}
              options={(() => {
                const uniqueProjects = (projects || [])
                  .filter(
                    (project, index, self) =>
                      self.findIndex((p) => p?.id === project?.id) === index
                  )
                  .filter((project) => project?.id && project?.name); // Ensure valid projects

                console.log("TaskList - Original projects:", projects);
                console.log("TaskList - Unique projects:", uniqueProjects);

                return uniqueProjects.map((project) => ({
                  value: project.id,
                  label: project.name,
                }));
              })()}
              disabled={isLoading}
              className="bg-white"
            />

            {/* Search Filter */}
            <Input
              id="search-filter"
              name="searchFilter"
              type="text"
              label="Search Tasks"
              placeholder="Search by title, description..."
              value={searchTerm}
              onChange={setSearchTerm}
              disabled={isLoading}
              className="bg-white"
            />

            {/* Status Filter */}
            <Input
              id="status-filter"
              name="statusFilter"
              type="select"
              label="Status"
              value={statusFilter}
              onChange={(value) => setStatusFilter(value as TaskStatus | "")}
              options={statusOptions}
              disabled={isLoading}
              className="bg-white"
            />

            {/* Assignee Filter */}
            <Input
              id="assignee-filter"
              name="assigneeFilter"
              type="select"
              label="Assignee"
              placeholder="All assignees"
              value={assigneeFilter}
              onChange={setAssigneeFilter}
              options={[
                { value: "", label: "All assignees" },
                ...getUniqueAssignees().map((email) => ({
                  value: email,
                  label: email,
                })),
              ]}
              disabled={isLoading}
              className="bg-white"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            <Button
              variant="secondary"
              onClick={() => refetchTasks()}
              disabled={isLoading}
              className="bg-white shadow-sm"
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
            {(searchTerm || statusFilter || assigneeFilter) && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("");
                  setAssigneeFilter("");
                }}
                disabled={isLoading}
                className="text-gray-600 hover:text-gray-900"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {hasSelectedTasks && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-700">
              {selectedTasks.size} task{selectedTasks.size !== 1 ? "s" : ""}{" "}
              selected
            </span>
            <div className="flex items-center space-x-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleBulkStatusUpdate("TODO")}
                disabled={isLoading}
              >
                Mark as To Do
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleBulkStatusUpdate("IN_PROGRESS")}
                disabled={isLoading}
              >
                Mark as In Progress
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleBulkStatusUpdate("DONE")}
                disabled={isLoading}
              >
                Mark as Done
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleBulkDelete}
                disabled={isLoading}
              >
                Delete Selected
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {hasError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <svg
              className="w-5 h-5 text-red-400 mr-3"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-red-800">
              {tasksError ||
                projectsError ||
                "Failed to load data. Please try again."}
            </p>
          </div>
        </div>
      )}

      {/* No Project Selected */}
      {!selectedProjectId && !isLoading && (
        <div className="flex-1 flex items-center justify-center">
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
                d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Select a Project
            </h3>
            <p className="text-gray-500 mb-4">
              Choose a project from the dropdown above to view and manage tasks.
            </p>
          </div>
        </div>
      )}

      {/* Task List */}
      {selectedProjectId && (
        <div className="flex-1 flex flex-col">
          {/* Table Header */}
          {paginatedTasks.length > 0 && (
            <div className="mb-4 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2">Select All</span>
                </div>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => handleSort("title")}
                    className="flex items-center hover:text-gray-900"
                  >
                    Title
                    {sortField === "title" && (
                      <svg
                        className={cn(
                          "w-4 h-4 ml-1",
                          sortOrder === "desc" && "rotate-180"
                        )}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 15l7-7 7 7"
                        />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={() => handleSort("status")}
                    className="flex items-center hover:text-gray-900"
                  >
                    Status
                    {sortField === "status" && (
                      <svg
                        className={cn(
                          "w-4 h-4 ml-1",
                          sortOrder === "desc" && "rotate-180"
                        )}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 15l7-7 7 7"
                        />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={() => handleSort("assigneeEmail")}
                    className="flex items-center hover:text-gray-900"
                  >
                    Assignee
                    {sortField === "assigneeEmail" && (
                      <svg
                        className={cn(
                          "w-4 h-4 ml-1",
                          sortOrder === "desc" && "rotate-180"
                        )}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 15l7-7 7 7"
                        />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={() => handleSort("dueDate")}
                    className="flex items-center hover:text-gray-900"
                  >
                    Due Date
                    {sortField === "dueDate" && (
                      <svg
                        className={cn(
                          "w-4 h-4 ml-1",
                          sortOrder === "desc" && "rotate-180"
                        )}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 15l7-7 7 7"
                        />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={() => handleSort("createdAt")}
                    className="flex items-center hover:text-gray-900"
                  >
                    Created
                    {sortField === "createdAt" && (
                      <svg
                        className={cn(
                          "w-4 h-4 ml-1",
                          sortOrder === "desc" && "rotate-180"
                        )}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 15l7-7 7 7"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Task Items */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative">
                    <div className="w-12 h-12 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600"></div>
                  </div>
                  <span className="text-gray-600 font-medium">
                    Loading tasks...
                  </span>
                </div>
              </div>
            ) : paginatedTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full opacity-20 animate-pulse"></div>
                  <svg
                    className="w-20 h-20 text-gray-400 mb-6 relative z-10"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {searchTerm || statusFilter || assigneeFilter
                    ? "No matching tasks found"
                    : "Ready to get started?"}
                </h3>
                <p className="text-gray-600 mb-6 max-w-md">
                  {searchTerm || statusFilter || assigneeFilter
                    ? "Try adjusting your filters or search terms to find what you're looking for."
                    : "Create your first task to start organizing your work and tracking progress on this project."}
                </p>

                {searchTerm || statusFilter || assigneeFilter ? (
                  <div className="flex items-center space-x-3">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setSearchTerm("");
                        setStatusFilter("");
                        setAssigneeFilter("");
                      }}
                      disabled={isLoading}
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
                      Clear Filters
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleCreateTask}
                      disabled={!selectedProjectId || isLoading}
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
                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                        />
                      </svg>
                      New Task
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-3">
                    <Button
                      variant="primary"
                      onClick={handleCreateTask}
                      disabled={!selectedProjectId || isLoading}
                      className="min-w-[140px]"
                    >
                      <svg
                        className="w-5 h-5 mr-2"
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
                      Create First Task
                    </Button>
                    <div className="text-sm text-gray-400 hidden sm:block">
                      or
                    </div>
                    <div className="text-sm text-gray-500">
                      Start with a{" "}
                      <button
                        onClick={() => {
                          setShowTaskForm(true);
                          setEditingTask(null);
                        }}
                        className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                      >
                        sample task
                      </button>
                    </div>
                  </div>
                )}

                {/* Quick tips */}
                <div className="mt-8 p-4 bg-gray-50 rounded-lg max-w-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    💡 Quick Tips:
                  </h4>
                  <ul className="text-sm text-gray-600 space-y-1 text-left">
                    <li>• Use clear, specific task titles</li>
                    <li>• Set due dates to track deadlines</li>
                    <li>• Assign tasks to team members</li>
                    <li>• Add descriptions for context</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="p-6 space-y-3">
                {paginatedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center space-x-4 p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all duration-150"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTasks.has(task.id)}
                      onChange={(e) =>
                        handleTaskSelect(task.id, e.target.checked)
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div className="flex-1">
                      <TaskCard
                        task={task}
                        view="list"
                        onDelete={handleTaskDelete}
                        onEdit={handleTaskEdit}
                        className="border-none shadow-none p-0 bg-transparent"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing{" "}
                  <span className="font-medium">
                    {(currentPage - 1) * tasksPerPage + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium">
                    {Math.min(currentPage * tasksPerPage, filteredTasks.length)}
                  </span>{" "}
                  of <span className="font-medium">{filteredTasks.length}</span>{" "}
                  tasks
                </div>
                <div className="flex items-center space-x-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(1, prev - 1))
                    }
                    disabled={currentPage === 1}
                    className="bg-white shadow-sm"
                  >
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
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                    Previous
                  </Button>
                  <div className="flex items-center space-x-1 px-3">
                    <span className="text-sm text-gray-500">Page</span>
                    <span className="text-sm font-medium text-gray-900">
                      {currentPage}
                    </span>
                    <span className="text-sm text-gray-500">of</span>
                    <span className="text-sm font-medium text-gray-900">
                      {totalPages}
                    </span>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="bg-white shadow-sm"
                  >
                    Next
                    <svg
                      className="w-4 h-4 ml-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Task Form Modal */}
      {showTaskForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 w-full max-w-2xl">
            <TaskForm
              task={editingTask || undefined}
              project={selectedProject}
              projects={projects || []}
              onSubmit={handleTaskFormSubmit}
              onCancel={handleTaskFormCancel}
              className="shadow-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskList;

export async function getServerSideProps() {
  return {
    props: {},
  };
}
