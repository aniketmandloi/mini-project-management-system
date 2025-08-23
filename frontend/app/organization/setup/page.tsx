/**
 * Organization Setup Page
 *
 * Temporary page for users who need to create or join an organization
 * This is a placeholder implementation for Step 15 testing
 */

"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { useAuth } from "@/hooks/useAuth";

export default function OrganizationSetupPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [organizationName, setOrganizationName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateOrganization = async () => {
    setIsLoading(true);
    // TODO: Implement organization creation mutation
    // For now, just redirect to projects
    setTimeout(() => {
      router.push("/projects");
    }, 1000);
  };

  const handleSkipForNow = () => {
    // Temporarily allow access without organization for testing
    router.push("/projects");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Organization Setup
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Create or join an organization to get started
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Create New Organization
            </h3>
            <div className="space-y-4">
              <Input
                id="organizationName"
                name="organizationName"
                type="text"
                label="Organization Name"
                value={organizationName}
                onChange={setOrganizationName}
                placeholder="Enter organization name"
                disabled={isLoading}
              />
              <Button
                variant="primary"
                size="md"
                onClick={handleCreateOrganization}
                loading={isLoading}
                disabled={!organizationName.trim()}
                className="w-full"
              >
                Create Organization
              </Button>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
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
                  <h4 className="text-sm font-medium text-yellow-800">
                    Temporary Development Setup
                  </h4>
                  <p className="mt-1 text-sm text-yellow-700">
                    Organization setup is not fully implemented yet. You can
                    skip this step for now to test the project management
                    features.
                  </p>
                  <div className="mt-3">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleSkipForNow}
                      disabled={isLoading}
                    >
                      Skip for Now (Testing Mode)
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {user && (
            <div className="border-t border-gray-200 pt-4">
              <p className="text-xs text-gray-500">
                Logged in as: {user.email}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
