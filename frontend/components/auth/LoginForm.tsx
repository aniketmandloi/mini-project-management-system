/**
 * LoginForm Component
 *
 * Form component for user authentication. Handles form validation, submission,
 * error handling, and integrates with the authentication system via GraphQL.
 * Provides proper loading states and user feedback.
 */

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { useAuth } from "@/hooks/useAuth";
import { validateLoginForm, getFieldError } from "@/utils/validation";
import type { FormError, LoginInput } from "@/types";

interface LoginFormProps {
  onSuccess?: () => void;
  redirectTo?: string;
}

/**
 * Login form with validation and authentication integration
 * Handles user login with proper error handling and loading states
 */
export const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  redirectTo,
}) => {
  const { loginWithRedirect } = useAuth({ redirectOnSuccess: redirectTo });

  // Form state
  const [formData, setFormData] = useState<LoginInput>({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState<FormError[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loginSuccess, setLoginSuccess] = useState(false);

  /**
   * Handles form input changes
   */
  const handleInputChange = (field: keyof LoginInput, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear field-specific errors when user starts typing
    if (errors.length > 0) {
      setErrors((prev) => prev.filter((error) => error.field !== field));
    }

    // Clear general submit error
    if (submitError) {
      setSubmitError(null);
    }
  };

  /**
   * Validates the form and returns whether it's valid
   */
  const validateForm = (): boolean => {
    const validationErrors = validateLoginForm(
      formData.email,
      formData.password
    );
    setErrors(validationErrors);
    return validationErrors.length === 0;
  };

  /**
   * Handles form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous errors
    setSubmitError(null);

    // Validate form
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await loginWithRedirect(formData);

      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }

      // Add manual redirect button for testing
      console.log("Login successful, showing manual redirect option");
      setLoginSuccess(true);
    } catch (error: unknown) {
      console.error("Login error:", error);

      // Handle GraphQL errors
      const err = error as Record<string, unknown>;
      if (
        err.graphQLErrors &&
        Array.isArray(err.graphQLErrors) &&
        err.graphQLErrors.length > 0
      ) {
        const graphQLError = err.graphQLErrors[0] as Record<string, unknown>;
        setSubmitError(
          (graphQLError.message as string) || "Invalid email or password"
        );
      } else if (err.networkError) {
        setSubmitError(
          "Network error. Please check your connection and try again."
        );
      } else if (err.message) {
        setSubmitError(err.message as string);
      } else {
        setSubmitError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handles keyboard navigation (Enter key)
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isSubmitting) {
      const formEvent = e as unknown as React.FormEvent;
      handleSubmit(formEvent);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {/* Email field */}
        <Input
          id="email"
          name="email"
          type="email"
          label="Email Address"
          placeholder="Enter your email"
          value={formData.email}
          onChange={(value) => handleInputChange("email", value)}
          onKeyDown={handleKeyDown}
          error={getFieldError(errors, "email") || undefined}
          required
          disabled={isSubmitting}
          autoComplete="email"
        />

        {/* Password field */}
        <Input
          id="password"
          name="password"
          type="password"
          label="Password"
          placeholder="Enter your password"
          value={formData.password}
          onChange={(value) => handleInputChange("password", value)}
          onKeyDown={handleKeyDown}
          error={getFieldError(errors, "password") || undefined}
          required
          disabled={isSubmitting}
          autoComplete="current-password"
        />

        {/* Login success */}
        {loginSuccess && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 shadow-sm">
            <div className="flex items-start">
              <svg
                className="w-5 h-5 mr-3 flex-shrink-0 text-green-500 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <p className="font-medium">Login successful!</p>
                <p className="mt-1">
                  If redirect doesn&apos;t work, click the button below:
                </p>
                <button
                  onClick={() => (window.location.href = "/dashboard")}
                  className="mt-2 px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                >
                  Go to Dashboard
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Submit error */}
        {submitError && (
          <div
            className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 shadow-sm"
            role="alert"
          >
            <div className="flex items-start">
              <svg
                className="w-5 h-5 mr-3 flex-shrink-0 text-red-500 mt-0.5"
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
                <p className="font-medium">Sign in failed</p>
                <p className="mt-1">{submitError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Submit button */}
        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full shadow-sm hover:shadow-md transition-shadow"
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </Button>
        </div>

        {/* Additional links */}
        <div className="pt-4 space-y-4 border-t border-gray-100">
          {/* Forgot password link - placeholder for future implementation */}
          <div className="text-center">
            <Link
              href="/auth/forgot-password"
              className="text-sm text-blue-600 hover:text-blue-700 hover:underline transition-colors"
            >
              Forgot your password?
            </Link>
          </div>

          {/* Register link */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Don&apos;t have an account?{" "}
              <Link
                href="/auth/register"
                className="font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors"
              >
                Create one now
              </Link>
            </p>
          </div>
        </div>
      </form>

      {/* Development note */}
      {process.env.NODE_ENV === "development" && (
        <div className="mt-6 p-4 bg-gray-50 rounded-md border text-xs text-gray-500">
          <h4 className="font-medium text-gray-700 mb-2">Development Info:</h4>
          <p>This form connects to the GraphQL backend server.</p>
          <p>
            Form validation is handled client-side with real server
            authentication.
          </p>
        </div>
      )}
    </div>
  );
};

export default LoginForm;
