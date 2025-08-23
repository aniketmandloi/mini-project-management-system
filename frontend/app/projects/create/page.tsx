/**
 * Create Project Page
 *
 * Page for creating new projects with form validation and error handling.
 * Provides a comprehensive form for entering project details including
 * name, description, status, and due date.
 */

"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Layout } from "@/components/layout/Layout";
import { ProtectedRoute } from "@/components/common/ProtectedRoute";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { Button } from "@/components/common/Button";
import { useAuth } from "@/hooks/useAuth";
import { useMutation } from "@apollo/client/react";
import { CREATE_PROJECT_MUTATION } from "@/graphql/mutations";
import { GET_PROJECTS } from "@/graphql/queries";
import type {
  CreateProjectInput,
  UpdateProjectInput,
  FormError,
  Project,
} from "@/types";

interface CreateProjectResponse {
  createProject: {
    project?: Project;
    success: boolean;
    errors?: string[];
  };
}

export default function CreateProjectPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [formErrors, setFormErrors] = useState<FormError[]>([]);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const [createProject, { loading }] = useMutation(CREATE_PROJECT_MUTATION, {
    refetchQueries: [
      {
        query: GET_PROJECTS,
        variables: {
          organizationId: user?.organization?.id,
        },
      },
    ],
    onCompleted: (data) => {
      const response = data as CreateProjectResponse;
      if (!response.createProject.success) {
        // Convert string errors to FormError format for compatibility
        const errors = (response.createProject.errors || []).map((error) => ({
          field: "general",
          message: error,
        }));
        setFormErrors(errors);
        setGeneralError(null);
      } else if (response.createProject.project) {
        // Success - redirect to project detail
        router.push(`/projects/${response.createProject.project.id}`);
      }
    },
    onError: (error) => {
      console.error("Create project error:", error);
      setGeneralError(
        error.message ||
          "An unexpected error occurred while creating the project."
      );
      setFormErrors([]);
    },
  });

  /**
   * Handle form submission
   */
  const handleSubmit = async (
    data: CreateProjectInput | UpdateProjectInput
  ) => {
    setFormErrors([]);
    setGeneralError(null);

    try {
      const createData = data as CreateProjectInput;
      await createProject({
        variables: {
          input: {
            name: createData.name,
            description: createData.description || "",
            status: createData.status,
            dueDate: createData.dueDate || null,
          },
        },
      });
    } catch (error) {
      // Error is handled by onError callback
      console.error("Project creation failed:", error);
    }
  };

  /**
   * Handle form cancellation
   */
  const handleCancel = () => {
    router.push("/projects");
  };

  return (
    <ProtectedRoute requireOrganization={false}>
      <Layout>
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Page Header */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Create New Project
                </h1>
                <p className="text-gray-600 mt-1">
                  Set up a new project for your organization.
                </p>
                {user?.organization && (
                  <p className="text-sm text-gray-500 mt-1">
                    Organization: {user.organization.name}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                disabled={loading}
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
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                Back
              </Button>
            </div>
          </div>

          {/* General Error Message */}
          {generalError && (
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
                    Unable to Create Project
                  </h3>
                  <p className="text-sm text-red-700 mt-1">{generalError}</p>
                </div>
              </div>
            </div>
          )}

          {/* Project Creation Form */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <ProjectForm
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isLoading={loading}
              errors={formErrors}
              submitButtonText="Create Project"
              cancelButtonText="Cancel"
            />
          </div>

          {/* Form Guidelines */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg
                className="w-5 h-5 text-blue-400 mr-2 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-blue-800">
                  Project Creation Guidelines
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <ul className="list-disc list-inside space-y-1">
                    <li>
                      Choose a clear, descriptive name that team members can
                      easily understand
                    </li>
                    <li>
                      Provide a detailed description to help team members
                      understand the project goals
                    </li>
                    <li>
                      Select the appropriate status based on your current
                      project phase
                    </li>
                    <li>
                      Set realistic due dates to help with project planning and
                      tracking
                    </li>
                    <li>
                      You can always edit these details later from the project
                      settings
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
