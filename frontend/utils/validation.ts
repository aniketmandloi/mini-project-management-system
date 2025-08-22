/**
 * Form validation utilities for the project management system
 * Provides reusable validation functions and error handling
 */

import type { FormError } from "../types";

/**
 * Email validation regex pattern
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Password validation requirements
 */
const PASSWORD_MIN_LENGTH = 8;

/**
 * Validates an email address
 * @param email - Email to validate
 * @returns Error message if invalid, null if valid
 */
export function validateEmail(email: string): string | null {
  if (!email) {
    return "Email is required";
  }

  if (!EMAIL_REGEX.test(email)) {
    return "Please enter a valid email address";
  }

  return null;
}

/**
 * Validates a password
 * @param password - Password to validate
 * @returns Error message if invalid, null if valid
 */
export function validatePassword(password: string): string | null {
  if (!password) {
    return "Password is required";
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  }

  return null;
}

/**
 * Validates a required text field
 * @param value - Value to validate
 * @param fieldName - Name of the field for error messages
 * @param minLength - Minimum length requirement
 * @param maxLength - Maximum length requirement
 * @returns Error message if invalid, null if valid
 */
export function validateRequired(
  value: string,
  fieldName: string,
  minLength = 1,
  maxLength = 1000
): string | null {
  if (!value || value.trim().length === 0) {
    return `${fieldName} is required`;
  }

  const trimmedValue = value.trim();

  if (trimmedValue.length < minLength) {
    return `${fieldName} must be at least ${minLength} character${
      minLength > 1 ? "s" : ""
    }`;
  }

  if (trimmedValue.length > maxLength) {
    return `${fieldName} must be no more than ${maxLength} characters`;
  }

  return null;
}

/**
 * Validates a date field
 * @param date - Date string to validate
 * @param fieldName - Name of the field for error messages
 * @param requireFuture - Whether the date must be in the future
 * @returns Error message if invalid, null if valid
 */
export function validateDate(
  date: string,
  fieldName: string,
  requireFuture = false
): string | null {
  if (!date) {
    return null; // Optional field
  }

  const parsedDate = new Date(date);

  if (isNaN(parsedDate.getTime())) {
    return `${fieldName} must be a valid date`;
  }

  if (requireFuture && parsedDate <= new Date()) {
    return `${fieldName} must be in the future`;
  }

  return null;
}

/**
 * Validates an organization slug
 * @param slug - Slug to validate
 * @returns Error message if invalid, null if valid
 */
export function validateSlug(slug: string): string | null {
  if (!slug) {
    return "Organization identifier is required";
  }

  const slugRegex = /^[a-z0-9-]+$/;

  if (!slugRegex.test(slug)) {
    return "Organization identifier can only contain lowercase letters, numbers, and hyphens";
  }

  if (slug.length < 2) {
    return "Organization identifier must be at least 2 characters";
  }

  if (slug.length > 50) {
    return "Organization identifier must be no more than 50 characters";
  }

  if (slug.startsWith("-") || slug.endsWith("-")) {
    return "Organization identifier cannot start or end with a hyphen";
  }

  return null;
}

/**
 * Validates login form data
 * @param email - Email to validate
 * @param password - Password to validate
 * @returns Array of validation errors
 */
export function validateLoginForm(
  email: string,
  password: string
): FormError[] {
  const errors: FormError[] = [];

  const emailError = validateEmail(email);
  if (emailError) {
    errors.push({ field: "email", message: emailError });
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    errors.push({ field: "password", message: passwordError });
  }

  return errors;
}

/**
 * Validates registration form data
 * @param email - Email to validate
 * @param password - Password to validate
 * @param firstName - First name to validate
 * @param lastName - Last name to validate
 * @param organizationName - Organization name to validate
 * @returns Array of validation errors
 */
export function validateRegistrationForm(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  organizationName: string
): FormError[] {
  const errors: FormError[] = [];

  const emailError = validateEmail(email);
  if (emailError) {
    errors.push({ field: "email", message: emailError });
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    errors.push({ field: "password", message: passwordError });
  }

  const firstNameError = validateRequired(firstName, "First name", 1, 50);
  if (firstNameError) {
    errors.push({ field: "firstName", message: firstNameError });
  }

  const lastNameError = validateRequired(lastName, "Last name", 1, 50);
  if (lastNameError) {
    errors.push({ field: "lastName", message: lastNameError });
  }

  const orgNameError = validateRequired(
    organizationName,
    "Organization name",
    2,
    100
  );
  if (orgNameError) {
    errors.push({ field: "organizationName", message: orgNameError });
  }

  return errors;
}

/**
 * Validates project form data
 * @param name - Project name to validate
 * @param description - Project description to validate
 * @param dueDate - Due date to validate
 * @returns Array of validation errors
 */
export function validateProjectForm(
  name: string,
  description: string,
  dueDate?: string
): FormError[] {
  const errors: FormError[] = [];

  const nameError = validateRequired(name, "Project name", 2, 200);
  if (nameError) {
    errors.push({ field: "name", message: nameError });
  }

  if (description && description.length > 2000) {
    errors.push({
      field: "description",
      message: "Description must be no more than 2000 characters",
    });
  }

  if (dueDate) {
    const dateError = validateDate(dueDate, "Due date", true);
    if (dateError) {
      errors.push({ field: "dueDate", message: dateError });
    }
  }

  return errors;
}

/**
 * Validates task form data
 * @param title - Task title to validate
 * @param description - Task description to validate
 * @param assigneeEmail - Assignee email to validate
 * @param dueDate - Due date to validate
 * @returns Array of validation errors
 */
export function validateTaskForm(
  title: string,
  description: string,
  assigneeEmail?: string,
  dueDate?: string
): FormError[] {
  const errors: FormError[] = [];

  const titleError = validateRequired(title, "Task title", 2, 200);
  if (titleError) {
    errors.push({ field: "title", message: titleError });
  }

  if (description && description.length > 2000) {
    errors.push({
      field: "description",
      message: "Description must be no more than 2000 characters",
    });
  }

  if (assigneeEmail) {
    const emailError = validateEmail(assigneeEmail);
    if (emailError) {
      errors.push({ field: "assigneeEmail", message: emailError });
    }
  }

  if (dueDate) {
    const dateError = validateDate(dueDate, "Due date");
    if (dateError) {
      errors.push({ field: "dueDate", message: dateError });
    }
  }

  return errors;
}

/**
 * Validates comment form data
 * @param content - Comment content to validate
 * @returns Array of validation errors
 */
export function validateCommentForm(content: string): FormError[] {
  const errors: FormError[] = [];

  const contentError = validateRequired(content, "Comment", 1, 1000);
  if (contentError) {
    errors.push({ field: "content", message: contentError });
  }

  return errors;
}

/**
 * Checks if a form has any errors
 * @param errors - Array of form errors
 * @returns True if form has errors, false otherwise
 */
export function hasFormErrors(errors: FormError[]): boolean {
  return errors.length > 0;
}

/**
 * Gets error message for a specific field
 * @param errors - Array of form errors
 * @param fieldName - Name of the field to get error for
 * @returns Error message if found, null otherwise
 */
export function getFieldError(
  errors: FormError[],
  fieldName: string
): string | null {
  const error = errors.find((err) => err.field === fieldName);
  return error ? error.message : null;
}
