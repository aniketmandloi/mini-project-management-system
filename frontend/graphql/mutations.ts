/**
 * GraphQL mutations for the project management system
 * Defines all mutation operations for authentication, projects, tasks, and comments
 */

import { gql } from "@apollo/client";

// Authentication Mutations
export const LOGIN_MUTATION = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      success
      errors
      accessToken
      refreshToken
      expiresAt
      user {
        id
        email
        firstName
        lastName
        fullName
        isActive
        organization {
          id
          name
          slug
          contactEmail
          createdAt
        }
      }
    }
  }
`;

export const REGISTER_MUTATION = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      success
      errors
      accessToken
      refreshToken
      expiresAt
      user {
        id
        email
        firstName
        lastName
        fullName
        isActive
        organization {
          id
          name
          slug
          contactEmail
          createdAt
        }
      }
    }
  }
`;

export const REFRESH_TOKEN_MUTATION = gql`
  mutation RefreshToken($refreshToken: String!) {
    refreshToken(refreshToken: $refreshToken) {
      tokens {
        accessToken
        refreshToken
      }
      user {
        id
        email
        firstName
        lastName
        isActive
        organization {
          id
          name
          slug
          contactEmail
          createdAt
        }
      }
    }
  }
`;

export const LOGOUT_MUTATION = gql`
  mutation Logout {
    logout {
      success
    }
  }
`;

// Project Mutations
export const CREATE_PROJECT_MUTATION = gql`
  mutation CreateProject($input: ProjectInput!) {
    createProject(input: $input) {
      project {
        id
        name
        description
        status
        dueDate
        createdAt
        taskCount
        completedTaskCount
        completionRate
        organization {
          id
          name
          slug
        }
      }
      success
      errors
    }
  }
`;

export const UPDATE_PROJECT_MUTATION = gql`
  mutation UpdateProject($id: ID!, $input: ProjectInput!) {
    updateProject(id: $id, input: $input) {
      project {
        id
        name
        description
        status
        dueDate
        createdAt
        taskCount
        completedTaskCount
        completionRate
        organization {
          id
          name
          slug
        }
      }
      success
      errors
    }
  }
`;

export const DELETE_PROJECT_MUTATION = gql`
  mutation DeleteProject($id: ID!) {
    deleteProject(id: $id) {
      success
      errors
    }
  }
`;

// Task Mutations
export const CREATE_TASK_MUTATION = gql`
  mutation CreateTask($input: TaskInput!) {
    createTask(input: $input) {
      task {
        id
        title
        description
        status
        assigneeEmail
        dueDate
        createdAt
        commentCount
        project {
          id
          name
          status
        }
      }
      errors {
        field
        message
      }
    }
  }
`;

export const UPDATE_TASK_MUTATION = gql`
  mutation UpdateTask($id: ID!, $input: TaskInput!) {
    updateTask(id: $id, input: $input) {
      task {
        id
        title
        description
        status
        assigneeEmail
        dueDate
        createdAt
        commentCount
        project {
          id
          name
          status
        }
      }
      errors {
        field
        message
      }
    }
  }
`;

export const DELETE_TASK_MUTATION = gql`
  mutation DeleteTask($id: ID!) {
    deleteTask(id: $id) {
      success
      errors {
        field
        message
      }
    }
  }
`;

// Task Comment Mutations
export const CREATE_COMMENT_MUTATION = gql`
  mutation CreateComment($input: TaskCommentInput!) {
    createTaskComment(input: $input) {
      comment {
        id
        content
        authorEmail
        timestamp
        task {
          id
          title
        }
      }
      errors {
        field
        message
      }
    }
  }
`;

export const UPDATE_COMMENT_MUTATION = gql`
  mutation UpdateComment($id: ID!, $input: TaskCommentInput!) {
    updateTaskComment(id: $id, input: $input) {
      comment {
        id
        content
        authorEmail
        timestamp
        task {
          id
          title
        }
      }
      errors {
        field
        message
      }
    }
  }
`;

export const DELETE_COMMENT_MUTATION = gql`
  mutation DeleteComment($id: ID!) {
    deleteTaskComment(id: $id) {
      success
      errors {
        field
        message
      }
    }
  }
`;

// Organization Mutations
export const UPDATE_ORGANIZATION_MUTATION = gql`
  mutation UpdateOrganization($id: ID!, $input: OrganizationInput!) {
    updateOrganization(id: $id, input: $input) {
      organization {
        id
        name
        slug
        contactEmail
        createdAt
      }
      errors {
        field
        message
      }
    }
  }
`;

// Bulk Operations
export const BULK_UPDATE_TASKS_MUTATION = gql`
  mutation BulkUpdateTasks($taskIds: [ID!]!, $updates: TaskUpdateInput!) {
    bulkUpdateTasks(taskIds: $taskIds, updates: $updates) {
      tasks {
        id
        title
        description
        status
        assigneeEmail
        dueDate
        createdAt
        project {
          id
          name
        }
      }
      errors {
        field
        message
      }
    }
  }
`;

export const BULK_DELETE_TASKS_MUTATION = gql`
  mutation BulkDeleteTasks($taskIds: [ID!]!) {
    bulkDeleteTasks(taskIds: $taskIds) {
      success
      deletedCount
      errors {
        field
        message
      }
    }
  }
`;

// File Upload Mutations (for future use)
export const UPLOAD_AVATAR_MUTATION = gql`
  mutation UploadAvatar($file: Upload!) {
    uploadAvatar(file: $file) {
      user {
        id
        email
        firstName
        lastName
        avatarUrl
      }
      errors {
        field
        message
      }
    }
  }
`;

export const UPLOAD_PROJECT_ATTACHMENT_MUTATION = gql`
  mutation UploadProjectAttachment($file: Upload!, $projectId: ID!) {
    uploadProjectAttachment(file: $file, projectId: $projectId) {
      attachment {
        id
        filename
        fileSize
        mimeType
        downloadUrl
        uploadedAt
      }
      errors {
        field
        message
      }
    }
  }
`;
