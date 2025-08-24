/**
 * Task Form Component
 *
 * Form component for creating and editing tasks. Supports validation,
 * error handling, and provides a consistent interface for task management.
 * Can be used in modals or as a standalone page component.
 */

"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { cn } from "@/utils/cn";
import type {
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  TaskStatus,
  Project,
  FormError,
} from "@/types";

export interface TaskFormProps {
  task?: Task;
  project?: Project;
  projects?: Project[];
  onSubmit: (data: CreateTaskInput | UpdateTaskInput) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  className?: string;
}

interface TaskFormData {
  title: string;
  description: string;
  status: TaskStatus;
  assigneeEmail: string;
  dueDate: string;
  projectId: string;
}

const defaultFormData: TaskFormData = {
  title: "",
  description: "",
  status: "TODO",
  assigneeEmail: "",
  dueDate: "",
  projectId: "",
};

/**
 * TaskForm component for creating and editing tasks
 * Provides validation and error handling
 */
export const TaskForm: React.FC<TaskFormProps> = ({
  task,
  project,
  projects = [],
  onSubmit,
  onCancel,
  isLoading = false,
  className,
}) => {
  const [formData, setFormData] = useState<TaskFormData>(defaultFormData);
  const [errors, setErrors] = useState<FormError[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!task;

  /**
   * Initialize form data
   */
  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || "",
        status: task.status,
        assigneeEmail: task.assigneeEmail || "",
        dueDate: task.dueDate ? task.dueDate.split("T")[0] : "",
        projectId: task.project.id,
      });
    } else if (project) {
      setFormData((prev) => ({
        ...prev,
        projectId: project.id,
      }));
    }
  }, [task, project]);

  /**
   * Handle form field changes
   */
  const handleChange = (field: keyof TaskFormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear field-specific errors
    setErrors((prev) => prev.filter((error) => error.field !== field));
  };

  /**
   * Get field error message
   */
  const getFieldError = (field: string): string | undefined => {
    const error = errors.find((err) => err.field === field);
    return error?.message;
  };

  /**
   * Validate form data
   */
  const validateForm = (): boolean => {
    const newErrors: FormError[] = [];

    // Title validation
    if (!formData.title.trim()) {
      newErrors.push({ field: "title", message: "Title is required" });
    } else if (formData.title.trim().length < 3) {
      newErrors.push({
        field: "title",
        message: "Title must be at least 3 characters long",
      });
    } else if (formData.title.trim().length > 200) {
      newErrors.push({
        field: "title",
        message: "Title must be less than 200 characters",
      });
    }

    // Project validation (for create mode)
    if (!isEditing && !formData.projectId) {
      newErrors.push({ field: "projectId", message: "Project is required" });
    }

    // Description validation (optional but with length limit)
    if (formData.description && formData.description.length > 1000) {
      newErrors.push({
        field: "description",
        message: "Description must be less than 1000 characters",
      });
    }

    // Assignee email validation (optional but must be valid email format)
    if (formData.assigneeEmail && !isValidEmail(formData.assigneeEmail)) {
      newErrors.push({
        field: "assigneeEmail",
        message: "Please enter a valid email address",
      });
    }

    // Due date validation (optional but must be in the future for new tasks)
    if (formData.dueDate) {
      const dueDate = new Date(formData.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (dueDate < today && !isEditing) {
        newErrors.push({
          field: "dueDate",
          message: "Due date must be today or in the future",
        });
      }
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  /**
   * Email validation helper
   */
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors([]);

    try {
      const submitData = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        status: formData.status,
        assigneeEmail: formData.assigneeEmail.trim() || undefined,
        dueDate: formData.dueDate || undefined,
        ...(isEditing ? { id: task!.id } : { projectId: formData.projectId }),
      };

      await onSubmit(submitData as CreateTaskInput | UpdateTaskInput);
    } catch (error) {
      console.error("Form submission error:", error);

      // Handle GraphQL errors
      if (error && typeof error === "object" && "message" in error) {
        setErrors([
          { field: "general", message: (error as { message: string }).message },
        ]);
      } else {
        setErrors([
          {
            field: "general",
            message: "An unexpected error occurred. Please try again.",
          },
        ]);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle form reset/cancel
   */
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      // Reset form if no cancel handler
      setFormData(
        task
          ? {
              title: task.title,
              description: task.description || "",
              status: task.status,
              assigneeEmail: task.assigneeEmail || "",
              dueDate: task.dueDate ? task.dueDate.split("T")[0] : "",
              projectId: task.project.id,
            }
          : defaultFormData
      );
      setErrors([]);
    }
  };

  const statusOptions = [
    { value: "TODO", label: "To Do" },
    { value: "IN_PROGRESS", label: "In Progress" },
    { value: "DONE", label: "Done" },
    { value: "CANCELLED", label: "Cancelled" },
  ];

  const projectOptions = projects.map((proj) => ({
    value: proj.id,
    label: proj.name,
  }));

  return (
    <div
      className={cn(
        "bg-white rounded-lg shadow-sm border border-gray-200",
        className
      )}
    >
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditing ? "Edit Task" : "Create New Task"}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {isEditing
              ? "Update task information and settings"
              : "Fill in the details below to create a new task"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* General error message */}
          {getFieldError("general") && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <svg
                  className="h-5 w-5 text-red-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="ml-3">
                  <p className="text-sm text-red-800">
                    {getFieldError("general")}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            {/* Task Title */}
            <Input
              id="title"
              name="title"
              type="text"
              label="Task Title"
              placeholder="Enter task title..."
              value={formData.title}
              onChange={(value) => handleChange("title", value)}
              error={getFieldError("title")}
              required
              disabled={isSubmitting || isLoading}
              className="col-span-1"
            />

            {/* Project Selection (only for create mode) */}
            {!isEditing && (
              <Input
                id="projectId"
                name="projectId"
                type="select"
                label="Project"
                placeholder="Select a project"
                value={formData.projectId}
                onChange={(value) => handleChange("projectId", value)}
                options={projectOptions}
                error={getFieldError("projectId")}
                required
                disabled={isSubmitting || isLoading || !!project}
              />
            )}

            {/* Task Status */}
            <Input
              id="status"
              name="status"
              type="select"
              label="Status"
              value={formData.status}
              onChange={(value) => handleChange("status", value as TaskStatus)}
              options={statusOptions}
              error={getFieldError("status")}
              disabled={isSubmitting || isLoading}
            />

            {/* Assignee Email */}
            <Input
              id="assigneeEmail"
              name="assigneeEmail"
              type="email"
              label="Assignee Email"
              placeholder="Enter assignee email (optional)"
              value={formData.assigneeEmail}
              onChange={(value) => handleChange("assigneeEmail", value)}
              error={getFieldError("assigneeEmail")}
              disabled={isSubmitting || isLoading}
            />

            {/* Due Date */}
            <Input
              id="dueDate"
              name="dueDate"
              type="date"
              label="Due Date"
              value={formData.dueDate}
              onChange={(value) => handleChange("dueDate", value)}
              error={getFieldError("dueDate")}
              disabled={isSubmitting || isLoading}
            />

            {/* Task Description */}
            <Input
              id="description"
              name="description"
              type="textarea"
              label="Description"
              placeholder="Enter task description (optional)..."
              value={formData.description}
              onChange={(value) => handleChange("description", value)}
              error={getFieldError("description")}
              disabled={isSubmitting || isLoading}
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="secondary"
              onClick={handleCancel}
              disabled={isSubmitting || isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting || isLoading}
              disabled={isSubmitting || isLoading}
            >
              {isEditing ? "Update Task" : "Create Task"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
