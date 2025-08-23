/**
 * Projects List Page
 *
 * Main projects listing page that displays all projects for the current organization.
 * Provides filtering, sorting, and search functionality along with options to create
 * new projects and navigate to detailed project views.
 */

"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Layout } from "@/components/layout/Layout";
import { ProtectedRoute } from "@/components/common/ProtectedRoute";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { useProjects } from "@/hooks/useProjects";
import { useAuth } from "@/hooks/useAuth";
import type { Project, ProjectStatus } from "@/types";

const PROJECT_STATUSES: { value: ProjectStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All Projects" },
  { value: "ACTIVE", label: "Active" },
  { value: "PLANNING", label: "Planning" },
  { value: "ON_HOLD", label: "On Hold" },
  { value: "COMPLETED", label: "Completed" },
];

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "-created_at", label: "Newest First" },
  { value: "created_at", label: "Oldest First" },
  { value: "name", label: "Name A-Z" },
  { value: "-name", label: "Name Z-A" },
  { value: "-due_date", label: "Due Date (Latest)" },
  { value: "due_date", label: "Due Date (Earliest)" },
];

export default function ProjectListPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "ALL">(
    "ALL"
  );
  const [sortBy, setSortBy] = useState("-created_at");
  const [view, setView] = useState<"grid" | "list">("grid");

  const {
    data: projects,
    loading: isLoading,
    error,
    refetch,
  } = useProjects({
    organizationId: user?.organization?.id,
    status: statusFilter === "ALL" ? undefined : statusFilter,
  });

  /**
   * Filter and sort projects based on current filters
   */
  const filteredProjects = useMemo(() => {
    if (!projects) return [];

    const filtered = projects.filter((project: Project) => {
      const searchLower = searchQuery.toLowerCase();
      return (
        project.name.toLowerCase().includes(searchLower) ||
        project.description.toLowerCase().includes(searchLower)
      );
    });

    // Sort projects
    filtered.sort((a: Project, b: Project) => {
      const [field, direction] = sortBy.startsWith("-")
        ? [sortBy.slice(1), -1]
        : [sortBy, 1];

      let aVal: string | number, bVal: string | number;

      switch (field) {
        case "name":
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case "created_at":
          aVal = new Date(a.createdAt).getTime();
          bVal = new Date(b.createdAt).getTime();
          break;
        case "due_date":
          aVal = a.dueDate ? new Date(a.dueDate).getTime() : 0;
          bVal = b.dueDate ? new Date(b.dueDate).getTime() : 0;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return -1 * direction;
      if (aVal > bVal) return 1 * direction;
      return 0;
    });

    return filtered;
  }, [projects, searchQuery, sortBy]);

  /**
   * Get project statistics
   */
  const projectStats = useMemo(() => {
    if (!projects) {
      return {
        total: 0,
        active: 0,
        completed: 0,
        onHold: 0,
        planning: 0,
      };
    }

    return projects.reduce(
      (acc, project) => {
        const statusKey = project.status.toLowerCase() as keyof typeof acc;
        return {
          ...acc,
          total: acc.total + 1,
          [statusKey]: (acc[statusKey] as number) + 1,
        };
      },
      { total: 0, active: 0, completed: 0, onHold: 0, planning: 0 }
    );
  }, [projects]);

  /**
   * Handle project deletion
   */
  const handleProjectDelete = async (projectId: string) => {
    // TODO: Implement project deletion
    console.log("Delete project:", projectId);
    await refetch();
  };

  return (
    <ProtectedRoute requireOrganization={false}>
      <Layout>
        <div className="space-y-6">
          {/* Page Header */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
                <p className="text-gray-600 mt-1">
                  Manage and track your organization&apos;s projects.
                </p>
                {user?.organization && (
                  <p className="text-sm text-gray-500 mt-1">
                    Organization: {user.organization.name}
                  </p>
                )}
              </div>
              <Link href="/projects/create">
                <Button variant="primary" size="md">
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
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  New Project
                </Button>
              </Link>
            </div>

            {/* Project Statistics */}
            <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {projectStats.total}
                </div>
                <div className="text-sm text-gray-500">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {projectStats.active}
                </div>
                <div className="text-sm text-gray-500">Active</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {projectStats.planning}
                </div>
                <div className="text-sm text-gray-500">Planning</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {projectStats.onHold}
                </div>
                <div className="text-sm text-gray-500">On Hold</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {projectStats.completed}
                </div>
                <div className="text-sm text-gray-500">Completed</div>
              </div>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
              {/* Search */}
              <div className="flex-1">
                <Input
                  id="search"
                  name="search"
                  type="text"
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={setSearchQuery}
                />
              </div>

              {/* Status Filter */}
              <div className="w-full md:w-48">
                <Input
                  id="status"
                  name="status"
                  type="select"
                  value={statusFilter}
                  onChange={(value) =>
                    setStatusFilter(value as ProjectStatus | "ALL")
                  }
                  options={PROJECT_STATUSES}
                />
              </div>

              {/* Sort */}
              <div className="w-full md:w-48">
                <Input
                  id="sort"
                  name="sort"
                  type="select"
                  value={sortBy}
                  onChange={setSortBy}
                  options={SORT_OPTIONS}
                />
              </div>

              {/* View Toggle */}
              <div className="flex bg-gray-100 rounded-md p-1">
                <button
                  onClick={() => setView("grid")}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    view === "grid"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setView("list")}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    view === "list"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Error State */}
          {error && (
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
                    Failed to load projects
                  </h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
              <div className="mt-3">
                <Button variant="secondary" size="sm" onClick={() => refetch()}>
                  Try again
                </Button>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
              <div className="flex items-center justify-center">
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
                <span className="ml-3 text-gray-600">Loading projects...</span>
              </div>
            </div>
          )}

          {/* Projects Grid/List */}
          {!isLoading && !error && (
            <>
              {filteredProjects.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                  <h3 className="mt-4 text-lg font-medium text-gray-900">
                    No projects found
                  </h3>
                  <p className="mt-2 text-gray-600">
                    {searchQuery || statusFilter !== "ALL"
                      ? "Try adjusting your filters or search terms."
                      : "Get started by creating your first project."}
                  </p>
                  {!searchQuery && statusFilter === "ALL" && (
                    <div className="mt-6">
                      <Link href="/projects/create">
                        <Button variant="primary" size="md">
                          Create Project
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className={
                    view === "grid"
                      ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                      : "space-y-4"
                  }
                >
                  {filteredProjects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      view={view}
                      onDelete={handleProjectDelete}
                    />
                  ))}
                </div>
              )}

              {/* Results Summary */}
              {filteredProjects.length > 0 && (
                <div className="flex items-center justify-between text-sm text-gray-600 px-2">
                  <span>
                    Showing {filteredProjects.length} of {projects?.length || 0}{" "}
                    projects
                  </span>
                  {(searchQuery || statusFilter !== "ALL") && (
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setStatusFilter("ALL");
                      }}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
