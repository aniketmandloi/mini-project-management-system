/**
 * GraphQL mutations for the project management system
 * Defines all mutation operations for authentication, projects, tasks, and comments
 */

import { gql } from "@apollo/client";

// Authentication Mutations
export const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
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

export const REGISTER_MUTATION = gql`
  mutation Register(
    $email: String!
    $password: String!
    $firstName: String!
    $lastName: String!
    $organizationName: String!
  ) {
    register(
      email: $email
      password: $password
      firstName: $firstName
      lastName: $lastName
      organizationName: $organizationName
    ) {
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
  mutation CreateProject(
    $name: String!
    $description: String
    $status: String!
    $dueDate: String
  ) {
    createProject(
      name: $name
      description: $description
      status: $status
      dueDate: $dueDate
    ) {
      project {
        id
        name
        description
        status
        dueDate
        createdAt
        taskCount
        completedTasks
        completionRate
        organization {
          id
          name
          slug
        }
      }
      errors {
        field
        message
      }
    }
  }
`;

export const UPDATE_PROJECT_MUTATION = gql`
  mutation UpdateProject(
    $id: ID!
    $name: String
    $description: String
    $status: String
    $dueDate: String
  ) {
    updateProject(
      id: $id
      name: $name
      description: $description
      status: $status
      dueDate: $dueDate
    ) {
      project {
        id
        name
        description
        status
        dueDate
        createdAt
        taskCount
        completedTasks
        completionRate
        organization {
          id
          name
          slug
        }
      }
      errors {
        field
        message
      }
    }
  }
`;

export const DELETE_PROJECT_MUTATION = gql`
  mutation DeleteProject($id: ID!) {
    deleteProject(id: $id) {
      success
      errors {
        field
        message
      }
    }
  }
`;

// Task Mutations
export const CREATE_TASK_MUTATION = gql`
  mutation CreateTask(
    $title: String!
    $description: String
    $status: String!
    $assigneeEmail: String
    $dueDate: String
    $projectId: ID!
  ) {
    createTask(
      title: $title
      description: $description
      status: $status
      assigneeEmail: $assigneeEmail
      dueDate: $dueDate
      projectId: $projectId
    ) {
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
  mutation UpdateTask(
    $id: ID!
    $title: String
    $description: String
    $status: String
    $assigneeEmail: String
    $dueDate: String
  ) {
    updateTask(
      id: $id
      title: $title
      description: $description
      status: $status
      assigneeEmail: $assigneeEmail
      dueDate: $dueDate
    ) {
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
  mutation CreateComment($content: String!, $taskId: ID!) {
    createComment(content: $content, taskId: $taskId) {
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
  mutation UpdateComment($id: ID!, $content: String!) {
    updateComment(id: $id, content: $content) {
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
    deleteComment(id: $id) {
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
  mutation UpdateOrganization($id: ID!, $name: String, $contactEmail: String) {
    updateOrganization(id: $id, name: $name, contactEmail: $contactEmail) {
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
