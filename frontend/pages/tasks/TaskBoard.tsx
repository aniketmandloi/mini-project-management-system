/**
 * Task Board Page
 *
 * Kanban-style board for managing tasks across different statuses.
 * Supports drag-and-drop functionality, filtering, and real-time updates.
 * Provides an intuitive interface for task management and workflow visualization.
 */

"use client";

import React, { useState } from "react";
import { useSearchParams } from "next/navigation";
import { TaskColumn } from "@/components/tasks/TaskColumn";
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

interface TaskBoardProps {
  projectId?: string;
  className?: string;
}

/**
 * TaskBoard component for kanban-style task management
 */
export const TaskBoard: React.FC<TaskBoardProps> = ({
  projectId,
  className,
}) => {
  const searchParams = useSearchParams();
  const initialProjectId = projectId || searchParams?.get("project") || "";

  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId);
  const [searchTerm, setSearchTerm] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus>("TODO");

  // Fetch tasks and projects
  const {
    data: tasks,
    loading: tasksLoading,
    error: tasksError,
    refetch: refetchTasks,
    createTask,
    updateTask,
    deleteTask,
    updateTaskStatus,
  } = useTasks({
    projectId: selectedProjectId || undefined,
    limit: 200, // Higher limit for board view
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
   * Filter and group tasks by status
   */
  const getTasksByStatus = (status: TaskStatus): Task[] => {
    if (!tasks) return [];

    // Remove duplicates first by creating a Map with task ID as key
    const uniqueTasks = new Map(tasks.map(task => [task.id, task]));
    const deduplicatedTasks = Array.from(uniqueTasks.values());
    
    console.log(`📊 TaskBoard - ${status}: Original tasks: ${tasks.length}, After deduplication: ${deduplicatedTasks.length}`);

    return deduplicatedTasks
      .filter((task) => {
        const matchesStatus = task.status === status;
        const matchesSearch =
          !searchTerm ||
          task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (task.description &&
            task.description.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesAssignee =
          !assigneeFilter ||
          (task.assigneeEmail &&
            task.assigneeEmail
              .toLowerCase()
              .includes(assigneeFilter.toLowerCase()));

        return matchesStatus && matchesSearch && matchesAssignee;
      })
      .sort((a, b) => {
        // Sort by due date first (overdue first), then by creation date
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        if (a.dueDate && !b.dueDate) return -1;
        if (!a.dueDate && b.dueDate) return 1;
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
  };

  /**
   * Get task count by status (unfiltered for accurate counts)
   */
  const getTaskCountByStatus = (status: TaskStatus): number => {
    if (!tasks) return 0;
    
    // Remove duplicates first by creating a Map with task ID as key
    const uniqueTasks = new Map(tasks.map(task => [task.id, task]));
    const deduplicatedTasks = Array.from(uniqueTasks.values());
    
    return deduplicatedTasks.filter((task) => task.status === status).length;
  };

  /**
   * Handle task status change (drag-and-drop or manual)
   */
  const handleTaskStatusChange = async (
    taskId: string,
    newStatus: TaskStatus
  ) => {
    console.log("🎯 TaskBoard: handleTaskStatusChange called", { taskId, newStatus });
    try {
      console.log("🎯 TaskBoard: Calling updateTaskStatus...");
      const result = await updateTaskStatus(taskId, newStatus);
      console.log("🎯 TaskBoard: updateTaskStatus result:", result);
      // Optionally show success feedback
    } catch (error) {
      console.error("❌ TaskBoard: Failed to update task status:", error);
      // Optionally show error feedback
    }
  };

  /**
   * Handle task deletion
   */
  const handleTaskDelete = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      // Optionally show success feedback
    } catch (error) {
      console.error("Failed to delete task:", error);
      // Optionally show error feedback
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
  const handleCreateTask = (status: TaskStatus) => {
    if (!selectedProjectId) {
      alert("Please select a project first");
      return;
    }
    setEditingTask(null);
    setNewTaskStatus(status);
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
        await createTask({
          ...(data as CreateTaskInput),
          status: newTaskStatus,
          projectId: selectedProjectId,
        });
      }
      setShowTaskForm(false);
      setEditingTask(null);
    } catch (error) {
      console.error("Failed to save task:", error);
      throw error; // Let the form handle the error
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
    if (!tasks) return [];
    const assignees = tasks
      .map((task) => task.assigneeEmail)
      .filter((email): email is string => !!email)
      .filter((email, index, self) => self.indexOf(email) === index);
    return assignees.sort();
  };

  const columns = [
    { title: "To Do", status: "TODO" as TaskStatus },
    { title: "In Progress", status: "IN_PROGRESS" as TaskStatus },
    { title: "Done", status: "DONE" as TaskStatus },
  ];

  const isLoading = tasksLoading || projectsLoading;
  const hasError = tasksError || projectsError;

  return (
    <div className={cn("h-full flex flex-col", className)}>
      {/* Project Selection and Board Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {selectedProject ? selectedProject.name : "Select a Project"}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {selectedProject
                ? "Kanban board view for visual task management"
                : "Choose a project to view tasks in board format"}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="primary"
              onClick={() => handleCreateTask("TODO")}
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

        {/* Board Statistics */}
        {selectedProject && tasks && tasks.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            {columns.map((column) => {
              const columnTasks = getTasksByStatus(column.status);
              const totalTasks = getTaskCountByStatus(column.status);
              return (
                <div key={column.status} className="text-center">
                  <div
                    className={cn(
                      "text-2xl font-bold",
                      column.status === "TODO" && "text-gray-600",
                      column.status === "IN_PROGRESS" && "text-blue-600",
                      column.status === "DONE" && "text-green-600"
                    )}
                  >
                    {totalTasks}
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                    {column.title}
                  </div>
                  {columnTasks.length !== totalTasks && (
                    <div className="text-xs text-gray-500">
                      {columnTasks.length} visible
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Filters and Controls */}
      <div className="p-4 border border-gray-200 bg-gray-50 rounded-lg mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
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

                console.log("TaskBoard - Original projects:", projects);
                console.log("TaskBoard - Unique projects:", uniqueProjects);

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
              placeholder="Search by title or description..."
              value={searchTerm}
              onChange={setSearchTerm}
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
            {(searchTerm || assigneeFilter) && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSearchTerm("");
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

      {/* Kanban Board */}
      {selectedProjectId && (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 min-h-0">
          {columns.map((column) => (
            <TaskColumn
              key={column.status}
              title={column.title}
              status={column.status}
              tasks={getTasksByStatus(column.status)}
              taskCount={getTaskCountByStatus(column.status)}
              onTaskStatusChange={handleTaskStatusChange}
              onTaskDelete={handleTaskDelete}
              onTaskEdit={handleTaskEdit}
              onCreateTask={handleCreateTask}
              isLoading={isLoading}
              className="min-h-96"
            />
          ))}
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

export default TaskBoard;

export async function getServerSideProps() {
  return {
    props: {},
  };
}
