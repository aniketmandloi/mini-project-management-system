/**
 * Project Form Component
 *
 * Reusable form component for creating and editing projects. Provides
 * comprehensive validation, error handling, and supports all project
 * fields with appropriate input types.
 */

"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import type {
  CreateProjectInput,
  UpdateProjectInput,
  FormError,
  ProjectStatus,
} from "@/types";

const PROJECT_STATUSES: { value: ProjectStatus; label: string }[] = [
  { value: "PLANNING", label: "Planning" },
  { value: "ACTIVE", label: "Active" },
  { value: "ON_HOLD", label: "On Hold" },
  { value: "COMPLETED", label: "Completed" },
];

export interface ProjectFormProps {
  initialData?: Partial<CreateProjectInput & { id?: string }>;
  onSubmit: (data: CreateProjectInput | UpdateProjectInput) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  errors?: FormError[];
  submitButtonText?: string;
  cancelButtonText?: string;
  mode?: "create" | "edit";
}

/**
 * ProjectForm component for creating and editing projects
 * Provides comprehensive form validation and error handling
 */
export const ProjectForm: React.FC<ProjectFormProps> = ({
  initialData = {},
  onSubmit,
  onCancel,
  isLoading = false,
  errors = [],
  submitButtonText = "Save Project",
  cancelButtonText = "Cancel",
  mode = "create",
}) => {
  const [formData, setFormData] = useState<CreateProjectInput>({
    name: initialData.name || "",
    description: initialData.description || "",
    status: (initialData.status as ProjectStatus) || "PLANNING",
    dueDate: initialData.dueDate || "",
  });

  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Reset form when initialData changes
  useEffect(() => {
    setFormData({
      name: initialData.name || "",
      description: initialData.description || "",
      status: (initialData.status as ProjectStatus) || "PLANNING",
      dueDate: initialData.dueDate || "",
    });
  }, [
    initialData.name,
    initialData.description,
    initialData.status,
    initialData.dueDate,
  ]);

  // Update validation errors when errors prop changes
  useEffect(() => {
    const errorMap: Record<string, string> = {};
    errors.forEach((error) => {
      errorMap[error.field] = error.message;
    });
    setValidationErrors(errorMap);
  }, [errors]);

  /**
   * Validate form fields
   */
  const validateField = (name: string, value: string): string => {
    switch (name) {
      case "name":
        if (!value.trim()) {
          return "Project name is required";
        }
        if (value.trim().length < 3) {
          return "Project name must be at least 3 characters";
        }
        if (value.trim().length > 100) {
          return "Project name must be less than 100 characters";
        }
        return "";

      case "description":
        if (value.trim().length > 500) {
          return "Description must be less than 500 characters";
        }
        return "";

      case "dueDate":
        if (value) {
          const dueDate = new Date(value);
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          if (dueDate < today) {
            return "Due date cannot be in the past";
          }
        }
        return "";

      default:
        return "";
    }
  };

  /**
   * Handle input field changes
   */
  const handleFieldChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors((prev) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [name]: _, ...rest } = prev;
        return rest;
      });
    }

    // Validate field if it has been touched
    if (touched[name]) {
      const error = validateField(name, value);
      setValidationErrors((prev) => ({
        ...prev,
        [name]: error,
      }));
    }
  };

  /**
   * Handle field blur (mark as touched and validate)
   */
  const handleFieldBlur = (name: string, value: string) => {
    setTouched((prev) => ({ ...prev, [name]: true }));
    const error = validateField(name, value);
    setValidationErrors((prev) => ({
      ...prev,
      [name]: error,
    }));
  };

  /**
   * Validate entire form
   */
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    let hasErrors = false;

    // Validate all fields
    Object.keys(formData).forEach((key) => {
      const error = validateField(
        key,
        formData[key as keyof CreateProjectInput] as string
      );
      if (error) {
        newErrors[key] = error;
        hasErrors = true;
      }
    });

    setValidationErrors(newErrors);
    setTouched({
      name: true,
      description: true,
      status: true,
      dueDate: true,
    });

    return !hasErrors;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const submitData =
        mode === "edit" && initialData?.id
          ? ({ ...formData, id: initialData.id } as UpdateProjectInput)
          : formData;

      await onSubmit(submitData);
    } catch (error) {
      console.error("Form submission error:", error);
    }
  };

  /**
   * Format date for input field
   */
  const formatDateForInput = (dateString: string): string => {
    if (!dateString) return "";
    return new Date(dateString).toISOString().split("T")[0];
  };

  /**
   * Get field error message
   */
  const getFieldError = (fieldName: string): string => {
    return validationErrors[fieldName] || "";
  };

  /**
   * Check if form has changes
   */
  const hasChanges = (): boolean => {
    if (mode === "create") {
      return (
        formData.name.trim() !== "" ||
        (formData.description || "").trim() !== "" ||
        formData.status !== "PLANNING" ||
        formData.dueDate !== ""
      );
    }

    return (
      formData.name !== (initialData.name || "") ||
      formData.description !== (initialData.description || "") ||
      formData.status !== (initialData.status || "PLANNING") ||
      formData.dueDate !== (initialData.dueDate || "")
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Project Name */}
      <div>
        <Input
          id="name"
          name="name"
          type="text"
          label="Project Name"
          value={formData.name}
          onChange={(value) => handleFieldChange("name", value)}
          onKeyDown={(e) => {
            if (e.key === "Tab" || e.key === "Enter") {
              handleFieldBlur("name", formData.name || "");
            }
          }}
          placeholder="Enter project name"
          required
          error={getFieldError("name")}
          disabled={isLoading}
          autoComplete="off"
        />
        <p className="mt-1 text-xs text-gray-500">
          Choose a clear, descriptive name for your project (3-100 characters)
        </p>
      </div>

      {/* Project Description */}
      <div>
        <Input
          id="description"
          name="description"
          type="textarea"
          label="Description"
          value={formData.description || ""}
          onChange={(value) => handleFieldChange("description", value)}
          onKeyDown={(e) => {
            if (e.key === "Tab") {
              handleFieldBlur("description", formData.description || "");
            }
          }}
          placeholder="Describe your project goals, scope, and objectives"
          error={getFieldError("description")}
          disabled={isLoading}
        />
        <p className="mt-1 text-xs text-gray-500">
          Provide a detailed description to help team members understand the
          project (optional, max 500 characters)
        </p>
        <div className="mt-1 text-xs text-gray-400 text-right">
          {(formData.description || "").length}/500 characters
        </div>
      </div>

      {/* Project Status */}
      <div>
        <Input
          id="status"
          name="status"
          type="select"
          label="Status"
          value={formData.status}
          onChange={(value) => handleFieldChange("status", value)}
          options={PROJECT_STATUSES}
          error={getFieldError("status")}
          disabled={isLoading}
          required
        />
        <p className="mt-1 text-xs text-gray-500">
          Select the current phase of your project
        </p>
      </div>

      {/* Due Date */}
      <div>
        <Input
          id="dueDate"
          name="dueDate"
          type="date"
          label="Due Date"
          value={formatDateForInput(formData.dueDate || "")}
          onChange={(value) => handleFieldChange("dueDate", value)}
          onKeyDown={(e) => {
            if (e.key === "Tab" || e.key === "Enter") {
              handleFieldBlur("dueDate", formData.dueDate || "");
            }
          }}
          error={getFieldError("dueDate")}
          disabled={isLoading}
        />
        <p className="mt-1 text-xs text-gray-500">
          Set a target completion date for your project (optional)
        </p>
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={onCancel}
          disabled={isLoading}
        >
          {cancelButtonText}
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="md"
          loading={isLoading}
          disabled={
            isLoading ||
            Object.keys(validationErrors).some((key) => validationErrors[key])
          }
        >
          {submitButtonText}
        </Button>
      </div>

      {/* Unsaved Changes Warning */}
      {hasChanges() && !isLoading && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-center">
            <svg
              className="w-4 h-4 text-yellow-400 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-sm text-yellow-800">
              You have unsaved changes. Make sure to save your work before
              leaving this page.
            </p>
          </div>
        </div>
      )}

      {/* Validation Summary */}
      {Object.keys(validationErrors).length > 0 &&
        Object.values(validationErrors).some((error) => error) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-start">
              <svg
                className="w-4 h-4 text-red-400 mr-2 mt-0.5"
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
                <h4 className="text-sm font-medium text-red-800">
                  Please fix the following errors:
                </h4>
                <ul className="mt-1 text-sm text-red-700 list-disc list-inside">
                  {Object.entries(validationErrors).map(([field, error]) =>
                    error ? (
                      <li key={field}>
                        {field.charAt(0).toUpperCase() + field.slice(1)}:{" "}
                        {error}
                      </li>
                    ) : null
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}
    </form>
  );
};
