/**
 * Core TypeScript interfaces for the project management system
 * Defines all GraphQL types and application state interfaces
 */

// Organization types
export interface Organization {
  id: string;
  name: string;
  slug: string;
  contactEmail: string;
  createdAt: string;
}

// Project types
export type ProjectStatus = "ACTIVE" | "COMPLETED" | "ON_HOLD" | "PLANNING";

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  dueDate?: string;
  createdAt: string;
  organization: Organization;
  taskCount?: number;
  completedTaskCount?: number;
  completionRate?: number;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  status: ProjectStatus;
  dueDate?: string;
}

export interface UpdateProjectInput {
  id: string;
  name?: string;
  description?: string;
  status?: ProjectStatus;
  dueDate?: string;
}

// Task types
export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE" | "CANCELLED";

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assigneeEmail?: string;
  dueDate?: string;
  createdAt: string;
  project: Project;
  comments?: TaskComment[];
  commentCount?: number;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  status: TaskStatus;
  assigneeEmail?: string;
  dueDate?: string;
  projectId: string;
}

export interface UpdateTaskInput {
  id: string;
  title?: string;
  description?: string;
  status?: TaskStatus;
  assigneeEmail?: string;
  dueDate?: string;
}

// Task Comment types
export interface TaskComment {
  id: string;
  content: string;
  authorEmail: string;
  timestamp: string;
  task: Task;
}

export interface CreateTaskCommentInput {
  content: string;
  taskId: string;
}

// User and Authentication types
export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isActive: boolean;
  organization?: Organization;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationName: string;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

// Project Statistics types
export interface ProjectStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalTasks: number;
  completedTasks: number;
  overallCompletionRate: number;
  projectsByStatus: {
    status: ProjectStatus;
    count: number;
  }[];
  tasksByStatus: {
    status: TaskStatus;
    count: number;
  }[];
}

// Dashboard types
export interface DashboardData {
  projects: Project[];
  recentTasks: Task[];
  stats: ProjectStats;
}

// API Response types
export interface ApiError {
  message: string;
  code?: string;
  field?: string;
}

export interface PaginationInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string;
  endCursor?: string;
  totalCount: number;
}

export interface Connection<T> {
  edges: {
    node: T;
    cursor: string;
  }[];
  pageInfo: PaginationInfo;
}

// Form types
export interface FormError {
  field: string;
  message: string;
}

export interface FormState<T> {
  data: T;
  errors: FormError[];
  isSubmitting: boolean;
  isValid: boolean;
}

// UI Component prop types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface ButtonProps extends BaseComponentProps {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
}

export interface InputProps extends BaseComponentProps {
  id: string;
  name: string;
  type?: "text" | "email" | "password" | "textarea" | "date" | "select";
  value: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  label?: string;
  options?: { value: string; label: string }[];
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  autoComplete?: string;
}

export interface ModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

// Utility types
export type LoadingState = "idle" | "loading" | "success" | "error";

export interface AsyncOperation<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch?: () => Promise<void>;
}

// Hook argument types
export interface UseAuthArgs {
  redirectOnSuccess?: string;
  redirectOnLogout?: string;
}

export interface UseProjectsArgs {
  organizationId?: string;
  status?: ProjectStatus;
  limit?: number;
  offset?: number;
}

export interface UseTasksArgs {
  projectId?: string;
  status?: TaskStatus;
  assigneeEmail?: string;
  limit?: number;
  offset?: number;
}

export interface UseCommentsArgs {
  taskId: string;
  limit?: number;
  offset?: number;
}

export interface UseDashboardArgs {
  refreshInterval?: number;
}
