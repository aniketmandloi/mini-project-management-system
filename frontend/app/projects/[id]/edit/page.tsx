/**
 * Edit Project Page
 *
 * Page for editing existing projects with form validation and error handling.
 * Loads current project data and provides a form for updating project details.
 */

"use client";

import React, { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Layout } from "@/components/layout/Layout";
import { ProtectedRoute } from "@/components/common/ProtectedRoute";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { Button } from "@/components/common/Button";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@apollo/client/react";
import { GET_PROJECT, GET_PROJECTS } from "@/graphql/queries";
import { UPDATE_PROJECT_MUTATION } from "@/graphql/mutations";
import type {
  UpdateProjectInput,
  CreateProjectInput,
  FormError,
  Project,
} from "@/types";

interface UpdateProjectResponse {
  update_project: {
    project?: Project;
    success: boolean;
    errors?: string[];
  };
}

export default function EditProjectPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const projectId = params?.id as string;
  const [formErrors, setFormErrors] = useState<FormError[]>([]);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const {
    data: projectData,
    loading: projectLoading,
    error: projectError,
  } = useQuery(GET_PROJECT, {
    variables: { id: projectId },
    skip: !projectId,
  });

  const [updateProject, { loading: updateLoading }] = useMutation(
    UPDATE_PROJECT_MUTATION,
    {
      refetchQueries: [
        {
          query: GET_PROJECT,
          variables: { id: projectId },
        },
        {
          query: GET_PROJECTS,
          variables: {
            organizationId: user?.organization?.id,
          },
        },
      ],
      onCompleted: (data) => {
        const response = data as UpdateProjectResponse;
        if (!response.update_project.success) {
          // Convert string errors to FormError format for compatibility
          const errors = (response.update_project.errors || []).map(
            (error: string) => ({
              field: "general",
              message: error,
            })
          );
          setFormErrors(errors);
          setGeneralError(null);
        } else if (response.update_project.project) {
          // Success - redirect to project detail
          router.push(`/projects/${response.update_project.project.id}`);
        }
      },
      onError: (error) => {
        console.error("Update project error:", error);
        setGeneralError(
          error.message ||
            "An unexpected error occurred while updating the project."
        );
        setFormErrors([]);
      },
    }
  );

  const project = (projectData as { project?: Project })?.project || null;

  // Memoize initialData to prevent infinite re-renders
  const initialData = useMemo(() => {
    if (!project) return {};
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      dueDate: project.dueDate,
    };
  }, [project]);

  /**
   * Handle form submission
   */
  const handleSubmit = async (
    data: UpdateProjectInput | CreateProjectInput
  ) => {
    setFormErrors([]);
    setGeneralError(null);

    try {
      const updateData = data as UpdateProjectInput;
      await updateProject({
        variables: {
          id: projectId,
          input: {
            name: updateData.name,
            description: updateData.description || "",
            status: updateData.status,
            due_date: updateData.dueDate || null,
          },
        },
      });
    } catch (error) {
      // Error is handled by onError callback
      console.error("Project update failed:", error);
    }
  };

  /**
   * Handle form cancellation
   */
  const handleCancel = () => {
    router.push(`/projects/${projectId}`);
  };

  if (projectLoading) {
    return (
      <ProtectedRoute requireOrganization={false}>
        <Layout>
          <div className="flex items-center justify-center min-h-96">
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
            <span className="ml-3 text-gray-600">Loading project...</span>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (projectError || !project) {
    return (
      <ProtectedRoute requireOrganization={false}>
        <Layout>
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
            <svg
              className="mx-auto h-12 w-12 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-red-900">
              Project Not Found
            </h3>
            <p className="mt-2 text-red-700">
              {projectError?.message ||
                "The requested project could not be found."}
            </p>
            <div className="mt-6">
              <Button
                variant="primary"
                size="md"
                onClick={() => router.push("/projects")}
              >
                Back to Projects
              </Button>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requireOrganization={true}>
      <Layout>
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Page Header */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/projects/${projectId}`)}
                    disabled={updateLoading}
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
                    Back to Project
                  </Button>
                </div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Edit Project: {project.name}
                </h1>
                <p className="text-gray-600 mt-1">
                  Update your project details and settings.
                </p>
                {user?.organization && (
                  <p className="text-sm text-gray-500 mt-1">
                    Organization: {user.organization.name}
                  </p>
                )}
              </div>
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
                    Unable to Update Project
                  </h3>
                  <p className="text-sm text-red-700 mt-1">{generalError}</p>
                </div>
              </div>
            </div>
          )}

          {/* Project Edit Form */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <ProjectForm
              mode="edit"
              initialData={initialData}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isLoading={updateLoading}
              errors={formErrors}
              submitButtonText="Update Project"
              cancelButtonText="Cancel"
            />
          </div>

          {/* Current Project Info */}
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
                  Project Information
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="font-medium">Current Status:</span>{" "}
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {project.status.replace("_", " ")}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Tasks:</span>{" "}
                      {project.completedTaskCount || 0} of{" "}
                      {project.taskCount || 0} completed
                    </div>
                    <div>
                      <span className="font-medium">Created:</span>{" "}
                      {new Date(project.createdAt).toLocaleDateString()}
                    </div>
                    {project.dueDate && (
                      <div>
                        <span className="font-medium">Due Date:</span>{" "}
                        {new Date(project.dueDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Edit Guidelines */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg
                className="w-5 h-5 text-yellow-400 mr-2 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-yellow-800">
                  Important Notes
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <ul className="list-disc list-inside space-y-1">
                    <li>
                      Changing the project status will affect how it appears in
                      reports and dashboards
                    </li>
                    <li>
                      Team members will be notified of any changes made to the
                      project
                    </li>
                    <li>
                      Modifying the due date may impact task deadlines and
                      project timelines
                    </li>
                    <li>
                      All changes are saved immediately and cannot be undone
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
