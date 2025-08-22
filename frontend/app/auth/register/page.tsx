/**
 * Registration Page
 *
 * Authentication page for new user registration. Provides a comprehensive
 * registration form for creating new accounts and organizations with proper
 * validation and error handling.
 */

"use client";

import React from "react";
import Link from "next/link";
import { RegisterForm } from "@/components/auth/RegisterForm";

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <Link href="/" className="inline-block">
            <div className="mx-auto h-14 w-14 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center mb-6 hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg">
              <span className="text-white font-bold text-xl">PM</span>
            </div>
          </Link>
          <h2 className="text-3xl font-bold text-gray-900">
            Join Project Management
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Create your account and organization to get started
          </p>
        </div>

        {/* Registration Form Container */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
          <RegisterForm redirectTo="/dashboard" />
        </div>

        {/* Additional Links */}
        <div className="text-center space-y-4">
          <p className="text-sm text-gray-600">
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
            >
              Sign in instead
            </Link>
          </p>

          <div className="text-xs text-gray-500">
            <p>
              By creating an account, you agree to our{" "}
              <Link href="/terms" className="text-blue-600 hover:text-blue-500">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                className="text-blue-600 hover:text-blue-500"
              >
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
