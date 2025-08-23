/**
 * GraphQL queries for the project management system
 * Defines all query operations for fetching data
 */

import { gql } from "@apollo/client";

// User and Authentication Queries
export const GET_CURRENT_USER = gql`
  query GetCurrentUser {
    currentUser {
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
`;

export const GET_ORGANIZATION = gql`
  query GetOrganization($id: ID!) {
    organization(id: $id) {
      id
      name
      slug
      contactEmail
      createdAt
      projectCount
      userCount
    }
  }
`;

// Project Queries
export const GET_PROJECTS = gql`
  query GetProjects(
    $filters: ProjectFilterInput
    $sortBy: String
    $sortOrder: SortOrder
    $first: Int
    $after: String
  ) {
    projects(
      filters: $filters
      sortBy: $sortBy
      sortOrder: $sortOrder
      first: $first
      after: $after
    ) {
      edges {
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
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      totalCount
    }
  }
`;

export const GET_PROJECT = gql`
  query GetProject($id: ID!) {
    project(id: $id) {
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
  }
`;

export const GET_PROJECT_STATS = gql`
  query GetProjectStats($projectId: ID!) {
    projectStats(projectId: $projectId) {
      totalTasks
      completedTasks
      inProgressTasks
      todoTasks
      overdueTasks
      completionRate
      tasksByStatus {
        status
        count
      }
      tasksByAssignee {
        assigneeEmail
        count
      }
      recentActivity {
        id
        type
        description
        timestamp
        user {
          email
          firstName
          lastName
        }
      }
    }
  }
`;

// Task Queries
export const GET_TASKS = gql`
  query GetTasks(
    $projectId: ID
    $status: String
    $assigneeEmail: String
    $first: Int
    $after: String
    $orderBy: String
  ) {
    tasks(
      projectId: $projectId
      status: $status
      assigneeEmail: $assigneeEmail
      first: $first
      after: $after
      orderBy: $orderBy
    ) {
      edges {
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
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      totalCount
    }
  }
`;

export const GET_TASK = gql`
  query GetTask($id: ID!) {
    task(id: $id) {
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
        organization {
          id
          name
          slug
        }
      }
    }
  }
`;

export const GET_TASK_WITH_COMMENTS = gql`
  query GetTaskWithComments($id: ID!) {
    task(id: $id) {
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
        organization {
          id
          name
          slug
        }
      }
      comments(first: 50, orderBy: "timestamp") {
        edges {
          node {
            id
            content
            authorEmail
            timestamp
          }
        }
        pageInfo {
          hasNextPage
        }
        totalCount
      }
    }
  }
`;

// Task Comment Queries
export const GET_TASK_COMMENTS = gql`
  query GetTaskComments(
    $taskId: ID!
    $first: Int
    $after: String
    $orderBy: String
  ) {
    taskComments(
      taskId: $taskId
      first: $first
      after: $after
      orderBy: $orderBy
    ) {
      edges {
        id
        content
        authorEmail
        timestamp
        task {
          id
          title
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      totalCount
    }
  }
`;

// Dashboard Queries
export const GET_DASHBOARD_DATA = gql`
  query GetDashboardData($organizationId: ID!) {
    dashboardData(organizationId: $organizationId) {
      stats {
        totalProjects
        activeProjects
        completedProjects
        totalTasks
        completedTasks
        overallCompletionRate
        projectsByStatus {
          status
          count
        }
        tasksByStatus {
          status
          count
        }
      }
      recentProjects: projects(first: 5, orderBy: "-created_at") {
        edges {
          node {
            id
            name
            status
            dueDate
            completionRate
            taskCount
          }
        }
      }
      recentTasks: tasks(first: 10, orderBy: "-created_at") {
        edges {
          node {
            id
            title
            status
            assigneeEmail
            dueDate
            project {
              id
              name
            }
          }
        }
      }
      overdueTasks: tasks(status: "overdue", first: 5) {
        edges {
          node {
            id
            title
            dueDate
            assigneeEmail
            project {
              id
              name
            }
          }
        }
      }
    }
  }
`;

// Analytics Queries
export const GET_ORGANIZATION_ANALYTICS = gql`
  query GetOrganizationAnalytics(
    $organizationId: ID!
    $startDate: String
    $endDate: String
  ) {
    organizationAnalytics(
      organizationId: $organizationId
      startDate: $startDate
      endDate: $endDate
    ) {
      overview {
        totalProjects
        totalTasks
        completedTasks
        activeUsers
        completionRate
      }
      projectTrends {
        date
        projectsCreated
        projectsCompleted
      }
      taskTrends {
        date
        tasksCreated
        tasksCompleted
      }
      productivityMetrics {
        averageTaskCompletionTime
        averageProjectDuration
        taskCompletionRate
        projectCompletionRate
      }
      topPerformers {
        userEmail
        tasksCompleted
        projectsCompleted
      }
    }
  }
`;

export const GET_PROJECT_ANALYTICS = gql`
  query GetProjectAnalytics(
    $projectId: ID!
    $startDate: String
    $endDate: String
  ) {
    projectAnalytics(
      projectId: $projectId
      startDate: $startDate
      endDate: $endDate
    ) {
      overview {
        totalTasks
        completedTasks
        inProgressTasks
        todoTasks
        overdueTasks
        completionRate
      }
      taskTrends {
        date
        tasksCreated
        tasksCompleted
      }
      statusDistribution {
        status
        count
        percentage
      }
      assigneePerformance {
        assigneeEmail
        tasksAssigned
        tasksCompleted
        completionRate
      }
      velocityMetrics {
        averageCompletionTime
        throughput
        burndownData {
          date
          remainingTasks
          completedTasks
        }
      }
    }
  }
`;

// Search Queries
export const SEARCH_PROJECTS = gql`
  query SearchProjects($query: String!, $organizationId: ID!) {
    searchProjects(query: $query, organizationId: $organizationId) {
      id
      name
      description
      status
      dueDate
      taskCount
      completionRate
      relevanceScore
    }
  }
`;

export const SEARCH_TASKS = gql`
  query SearchTasks($query: String!, $organizationId: ID, $projectId: ID) {
    searchTasks(
      query: $query
      organizationId: $organizationId
      projectId: $projectId
    ) {
      id
      title
      description
      status
      assigneeEmail
      dueDate
      project {
        id
        name
      }
      relevanceScore
    }
  }
`;

export const GLOBAL_SEARCH = gql`
  query GlobalSearch($query: String!, $organizationId: ID!) {
    globalSearch(query: $query, organizationId: $organizationId) {
      projects {
        id
        name
        description
        status
        relevanceScore
      }
      tasks {
        id
        title
        description
        status
        project {
          id
          name
        }
        relevanceScore
      }
      comments {
        id
        content
        authorEmail
        task {
          id
          title
          project {
            id
            name
          }
        }
        relevanceScore
      }
    }
  }
`;

// Activity Feed Queries
export const GET_ACTIVITY_FEED = gql`
  query GetActivityFeed(
    $organizationId: ID!
    $first: Int
    $after: String
    $activityType: String
  ) {
    activityFeed(
      organizationId: $organizationId
      first: $first
      after: $after
      activityType: $activityType
    ) {
      edges {
        node {
          id
          type
          description
          timestamp
          user {
            email
            firstName
            lastName
          }
          relatedObject {
            ... on Project {
              id
              name
            }
            ... on Task {
              id
              title
              project {
                id
                name
              }
            }
          }
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      totalCount
    }
  }
`;
