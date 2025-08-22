/**
 * RegisterForm Component
 *
 * Form component for user registration. Handles comprehensive form validation,
 * submission, error handling, and integrates with the authentication system via GraphQL.
 * Includes organization creation and provides proper loading states and user feedback.
 */

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { useAuth } from "@/hooks/useAuth";
import { validateRegistrationForm, getFieldError } from "@/utils/validation";
import type { FormError, RegisterInput } from "@/types";

interface RegisterFormProps {
  onSuccess?: () => void;
  redirectTo?: string;
}

/**
 * Registration form with validation and authentication integration
 * Handles user registration with organization creation, proper error handling and loading states
 */
export const RegisterForm: React.FC<RegisterFormProps> = ({
  onSuccess,
  redirectTo,
}) => {
  const { registerWithRedirect } = useAuth({ redirectOnSuccess: redirectTo });

  // Form state
  const [formData, setFormData] = useState<RegisterInput>({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    organizationName: "",
  });

  const [errors, setErrors] = useState<FormError[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  /**
   * Handles form input changes
   */
  const handleInputChange = (field: keyof RegisterInput, value: string) => {
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
    const validationErrors = validateRegistrationForm(
      formData.email,
      formData.password,
      formData.firstName,
      formData.lastName,
      formData.organizationName
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
      await registerWithRedirect(formData);

      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: unknown) {
      console.error("Registration error:", error);

      // Handle GraphQL errors
      const err = error as Record<string, unknown>;
      if (
        err.graphQLErrors &&
        Array.isArray(err.graphQLErrors) &&
        err.graphQLErrors.length > 0
      ) {
        const graphQLError = err.graphQLErrors[0] as Record<string, unknown>;
        const extensions = graphQLError.extensions as Record<string, unknown>;

        // Handle specific field errors
        if (extensions?.field) {
          setErrors([
            {
              field: extensions.field as string,
              message: graphQLError.message as string,
            },
          ]);
        } else {
          setSubmitError(
            (graphQLError.message as string) || "Registration failed"
          );
        }
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
        {/* Personal Information Section */}
        <div className="space-y-4">
          <div className="flex items-center text-sm font-medium text-gray-700 border-b border-gray-200 pb-2 mb-4">
            <svg
              className="w-4 h-4 mr-2 text-blue-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                clipRule="evenodd"
              />
            </svg>
            Personal Information
          </div>

          {/* First Name */}
          <Input
            id="firstName"
            name="firstName"
            type="text"
            label="First Name"
            placeholder="Enter your first name"
            value={formData.firstName}
            onChange={(value) => handleInputChange("firstName", value)}
            onKeyDown={handleKeyDown}
            error={getFieldError(errors, "firstName") || undefined}
            required
            disabled={isSubmitting}
            autoComplete="given-name"
          />

          {/* Last Name */}
          <Input
            id="lastName"
            name="lastName"
            type="text"
            label="Last Name"
            placeholder="Enter your last name"
            value={formData.lastName}
            onChange={(value) => handleInputChange("lastName", value)}
            onKeyDown={handleKeyDown}
            error={getFieldError(errors, "lastName") || undefined}
            required
            disabled={isSubmitting}
            autoComplete="family-name"
          />

          {/* Email */}
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

          {/* Password */}
          <Input
            id="password"
            name="password"
            type="password"
            label="Password"
            placeholder="Choose a strong password"
            value={formData.password}
            onChange={(value) => handleInputChange("password", value)}
            onKeyDown={handleKeyDown}
            error={getFieldError(errors, "password") || undefined}
            required
            disabled={isSubmitting}
            autoComplete="new-password"
          >
            <span className="text-xs text-gray-500">
              Minimum 8 characters required
            </span>
          </Input>
        </div>

        {/* Organization Information Section */}
        <div className="space-y-4">
          <div className="flex items-center text-sm font-medium text-gray-700 border-b border-gray-200 pb-2 mb-4">
            <svg
              className="w-4 h-4 mr-2 text-blue-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-6a1 1 0 00-1-1H9a1 1 0 00-1 1v6a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z"
                clipRule="evenodd"
              />
            </svg>
            Organization Information
          </div>

          {/* Organization Name */}
          <Input
            id="organizationName"
            name="organizationName"
            type="text"
            label="Organization Name"
            placeholder="Enter your organization name"
            value={formData.organizationName}
            onChange={(value) => handleInputChange("organizationName", value)}
            onKeyDown={handleKeyDown}
            error={getFieldError(errors, "organizationName") || undefined}
            required
            disabled={isSubmitting}
            autoComplete="organization"
          >
            <span className="text-xs text-gray-500">
              This will be used to create your organization workspace
            </span>
          </Input>
        </div>

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
                <p className="font-medium">Registration failed</p>
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
            {isSubmitting ? "Creating account..." : "Create account"}
          </Button>
        </div>

        {/* Login link */}
        <div className="pt-4 text-center border-t border-gray-100">
          <p className="text-sm text-gray-600">
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors"
            >
              Sign in instead
            </Link>
          </p>
        </div>
      </form>

      {/* Development note */}
      {process.env.NODE_ENV === "development" && (
        <div className="mt-8 p-4 bg-gray-50 rounded-md border text-xs text-gray-500">
          <h4 className="font-medium text-gray-700 mb-2">Development Info:</h4>
          <p>This form connects to the GraphQL backend server.</p>
          <p>
            Registration creates both user account and organization workspace.
          </p>
          <p>
            Form validation is handled client-side with real server
            authentication.
          </p>
        </div>
      )}
    </div>
  );
};

export default RegisterForm;
