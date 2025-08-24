/**
 * Reusable Input Component
 *
 * A versatile input component that supports various types including text, email, password,
 * textarea, date, and select. Provides consistent styling, validation state display,
 * and accessibility features across the application.
 */

"use client";

import React, { forwardRef } from "react";
import { cn } from "@/utils/cn";
import type { InputProps } from "@/types";

/**
 * Input component with validation and error handling
 * Supports multiple input types and provides consistent UI/UX
 */
export const Input = forwardRef<
  HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  InputProps
>(
  (
    {
      id,
      name,
      type = "text",
      value,
      placeholder,
      required = false,
      disabled = false,
      error,
      label,
      options = [],
      onChange,
      onKeyDown,
      autoComplete,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const baseInputClasses = cn(
      "w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400",
      "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
      "transition-colors duration-200",
      "text-gray-900", // Ensure text is dark and visible
      {
        // Normal state
        "border-gray-300 bg-white": !error && !disabled,
        // Error state
        "border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500 text-gray-900":
          error && !disabled,
        // Disabled state
        "border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed": disabled,
      },
      className
    );

    const labelClasses = cn("block text-sm font-medium mb-1", {
      "text-gray-700": !error,
      "text-red-700": error,
    });

    const renderInput = () => {
      const commonProps = {
        id,
        name,
        value,
        placeholder,
        required,
        disabled,
        className: baseInputClasses,
        onChange: (
          e: React.ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
          >
        ) => onChange(e.target.value),
        onKeyDown,
        autoComplete,
        ...props,
      };

      switch (type) {
        case "textarea":
          return (
            <textarea
              {...commonProps}
              ref={ref as React.Ref<HTMLTextAreaElement>}
              rows={4}
            />
          );

        case "select":
          return (
            <select {...commonProps} ref={ref as React.Ref<HTMLSelectElement>}>
              {placeholder && (
                <option value="" disabled>
                  {placeholder}
                </option>
              )}
              {options.map((option, index) => (
                <option key={`${option.value}-${index}`} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          );

        default:
          return (
            <input
              {...commonProps}
              type={type}
              ref={ref as React.Ref<HTMLInputElement>}
            />
          );
      }
    };

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className={labelClasses}>
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          {renderInput()}

          {/* Error icon */}
          {error && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-red-500"
                fill="currentColor"
                viewBox="0 0 20 20"
                role="img"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        {/* Help text for children */}
        {children && !error && (
          <div className="mt-1 text-sm text-gray-500">{children}</div>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
