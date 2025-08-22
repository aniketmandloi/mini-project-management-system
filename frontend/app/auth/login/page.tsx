/**
 * Login Page
 *
 * Authentication page for user login. This is a placeholder that will be
 * implemented in the next step (Step 13: Authentication UI components).
 */

"use client";

import React from "react";
import { PublicRoute } from "@/components/common/ProtectedRoute";

export default function LoginPage() {
  return (
    <PublicRoute>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 bg-blue-600 rounded-lg flex items-center justify-center mb-6">
              <span className="text-white font-bold text-lg">PM</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">
              Sign in to your account
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Welcome to Project Management System
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600">
                Login form will be implemented in Step 13
              </p>
              <div className="text-sm text-gray-500">
                <p>This is a placeholder for the authentication system.</p>
                <p className="mt-2">Coming next:</p>
                <ul className="mt-1 text-left space-y-1">
                  <li>• Login form with validation</li>
                  <li>• Registration functionality</li>
                  <li>• Password reset</li>
                  <li>• GraphQL authentication integration</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Don&apos;t have an account?{" "}
              <a
                href="/auth/register"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Sign up
              </a>
            </p>
          </div>
        </div>
      </div>
    </PublicRoute>
  );
}
