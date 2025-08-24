/**
 * Tasks Page - Main task management hub
 *
 * Modern task management interface with dashboard-style design.
 * Provides task overview, filtering, and management capabilities.
 */

"use client";

import React, { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { ProtectedRoute } from "@/components/common/ProtectedRoute";
import { TaskList } from "@/pages/tasks/TaskList";
import { TaskBoard } from "@/pages/tasks/TaskBoard";
import { Button } from "@/components/common/Button";
import { cn } from "@/utils/cn";

type ViewMode = "list" | "board";

export default function TasksPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  return (
    <ProtectedRoute requireOrganization={false}>
      <Layout>
        <div className="space-y-6">
          {/* Page Header */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Task Management
                </h1>
                <p className="text-gray-600 mt-1">
                  Organize, track, and manage your tasks efficiently
                </p>
              </div>

              {/* View Toggle */}
              <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                <Button
                  variant={viewMode === "list" ? "primary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "px-4 py-2 text-sm font-medium rounded-md transition-all",
                    viewMode === "list"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  )}
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
                      d="M4 6h16M4 10h16M4 14h16M4 18h16"
                    />
                  </svg>
                  List View
                </Button>
                <Button
                  variant={viewMode === "board" ? "primary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("board")}
                  className={cn(
                    "px-4 py-2 text-sm font-medium rounded-md transition-all",
                    viewMode === "board"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  )}
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
                      d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
                    />
                  </svg>
                  Board View
                </Button>
              </div>
            </div>
          </div>

          {/* Task View Content */}
          <div className="min-h-[600px]">
            {viewMode === "list" ? (
              <TaskList className="bg-white rounded-lg shadow-sm border border-gray-200" />
            ) : (
              <TaskBoard className="bg-white rounded-lg shadow-sm border border-gray-200 p-6" />
            )}
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
