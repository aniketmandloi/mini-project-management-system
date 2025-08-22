"""
GraphQL query definitions.

This module defines all GraphQL queries for the project management system,
including queries for organizations, projects, tasks, and analytics.
"""

import graphene
from graphene import relay
from django.contrib.auth import get_user_model
from django.db.models import Q, Count, Avg
from graphql import GraphQLError
from core.models import Organization, Project, Task, TaskComment
from .types import (
    UserType,
    OrganizationType,
    ProjectType,
    TaskType,
    TaskCommentType,
    ProjectStatistics,
    TaskStatistics,
    OrganizationStatistics,
    ProjectConnection,
    TaskConnection,
    TaskCommentConnection,
    ProjectFilterInput,
    TaskFilterInput,
    SortOrder,
)
from .middleware import get_organization_from_context, get_user_from_context

User = get_user_model()


class Query(graphene.ObjectType):
    """
    Main GraphQL query class.

    Defines all available queries with proper organization-scoped access control.
    """

    # User queries
    me = graphene.Field(UserType, description="Get current authenticated user")
    users = graphene.List(
        UserType, description="Get all users in the current organization"
    )
    user = graphene.Field(
        UserType, id=graphene.ID(required=True), description="Get a specific user by ID"
    )

    # Organization queries
    organization = graphene.Field(
        OrganizationType, description="Get current organization details"
    )

    # Project queries
    projects = graphene.Field(
        ProjectConnection,
        filters=graphene.Argument(ProjectFilterInput),
        sort_by=graphene.String(default_value="created_at"),
        sort_order=graphene.Argument(SortOrder, default_value=SortOrder.DESC),
        first=graphene.Int(default_value=20),
        after=graphene.String(),
        description="Get projects with filtering, sorting, and pagination",
    )
    project = graphene.Field(
        ProjectType,
        id=graphene.ID(required=True),
        description="Get a specific project by ID",
    )

    # Task queries
    tasks = graphene.Field(
        TaskConnection,
        filters=graphene.Argument(TaskFilterInput),
        sort_by=graphene.String(default_value="created_at"),
        sort_order=graphene.Argument(SortOrder, default_value=SortOrder.DESC),
        first=graphene.Int(default_value=20),
        after=graphene.String(),
        description="Get tasks with filtering, sorting, and pagination",
    )
    task = graphene.Field(
        TaskType, id=graphene.ID(required=True), description="Get a specific task by ID"
    )

    # Task comment queries
    task_comments = graphene.Field(
        TaskCommentConnection,
        task_id=graphene.ID(required=True),
        first=graphene.Int(default_value=20),
        after=graphene.String(),
        description="Get comments for a specific task with pagination",
    )

    # Analytics and statistics queries
    organization_statistics = graphene.Field(
        OrganizationStatistics, description="Get comprehensive organization statistics"
    )
    project_statistics = graphene.Field(
        ProjectStatistics,
        description="Get project statistics for the current organization",
    )
    task_statistics = graphene.Field(
        TaskStatistics,
        project_id=graphene.ID(),
        description="Get task statistics (organization-wide or for specific project)",
    )

    # User resolvers
    def resolve_me(self, info):
        """Get the current authenticated user."""
        return get_user_from_context(info)

    def resolve_users(self, info):
        """Get all users in the current organization."""
        organization = get_organization_from_context(info)
        return User.objects.filter(organization=organization).order_by(
            "first_name", "last_name"
        )

    def resolve_user(self, info, id):
        """Get a specific user by ID within the current organization."""
        organization = get_organization_from_context(info)
        try:
            return User.objects.get(id=id, organization=organization)
        except User.DoesNotExist:
            raise GraphQLError(f"User with ID {id} not found")

    # Organization resolvers
    def resolve_organization(self, info):
        """Get the current organization."""
        return get_organization_from_context(info)

    # Project resolvers
    def resolve_projects(
        self,
        info,
        filters=None,
        sort_by="created_at",
        sort_order=SortOrder.DESC,
        first=20,
        after=None,
    ):
        """Get projects with filtering, sorting, and pagination."""
        organization = get_organization_from_context(info)
        queryset = Project.objects.filter(organization=organization)

        # Apply filters
        if filters:
            if filters.get("status"):
                queryset = queryset.filter(status=filters["status"])
            if filters.get("name_contains"):
                queryset = queryset.filter(name__icontains=filters["name_contains"])
            if filters.get("created_after"):
                queryset = queryset.filter(created_at__gte=filters["created_after"])
            if filters.get("created_before"):
                queryset = queryset.filter(created_at__lte=filters["created_before"])
            if filters.get("due_after"):
                queryset = queryset.filter(due_date__gte=filters["due_after"])
            if filters.get("due_before"):
                queryset = queryset.filter(due_date__lte=filters["due_before"])

        # Apply sorting
        sort_prefix = "-" if sort_order == SortOrder.DESC else ""
        queryset = queryset.order_by(f"{sort_prefix}{sort_by}")

        # Apply pagination (simplified - in production, use proper cursor-based pagination)
        total_count = queryset.count()
        start_offset = 0
        if after:
            try:
                start_offset = int(after)
            except (ValueError, TypeError):
                start_offset = 0

        paginated_queryset = queryset[start_offset : start_offset + first]

        # Create page info
        has_next = start_offset + first < total_count
        has_previous = start_offset > 0
        end_cursor = str(start_offset + len(paginated_queryset))

        return {
            "edges": paginated_queryset,
            "page_info": {
                "has_next_page": has_next,
                "has_previous_page": has_previous,
                "start_cursor": str(start_offset),
                "end_cursor": end_cursor,
            },
            "total_count": total_count,
        }

    def resolve_project(self, info, id):
        """Get a specific project by ID within the current organization."""
        organization = get_organization_from_context(info)
        try:
            return Project.objects.get(id=id, organization=organization)
        except Project.DoesNotExist:
            raise GraphQLError(f"Project with ID {id} not found")

    # Task resolvers
    def resolve_tasks(
        self,
        info,
        filters=None,
        sort_by="created_at",
        sort_order=SortOrder.DESC,
        first=20,
        after=None,
    ):
        """Get tasks with filtering, sorting, and pagination."""
        organization = get_organization_from_context(info)
        queryset = Task.objects.filter(project__organization=organization)

        # Apply filters
        if filters:
            if filters.get("status"):
                queryset = queryset.filter(status=filters["status"])
            if filters.get("title_contains"):
                queryset = queryset.filter(title__icontains=filters["title_contains"])
            if filters.get("assignee_email"):
                queryset = queryset.filter(assignee_email=filters["assignee_email"])
            if filters.get("project_id"):
                queryset = queryset.filter(project_id=filters["project_id"])
            if filters.get("created_after"):
                queryset = queryset.filter(created_at__gte=filters["created_after"])
            if filters.get("created_before"):
                queryset = queryset.filter(created_at__lte=filters["created_before"])
            if filters.get("due_after"):
                queryset = queryset.filter(due_date__gte=filters["due_after"])
            if filters.get("due_before"):
                queryset = queryset.filter(due_date__lte=filters["due_before"])

        # Apply sorting
        sort_prefix = "-" if sort_order == SortOrder.DESC else ""
        queryset = queryset.order_by(f"{sort_prefix}{sort_by}")

        # Apply pagination (simplified)
        total_count = queryset.count()
        start_offset = 0
        if after:
            try:
                start_offset = int(after)
            except (ValueError, TypeError):
                start_offset = 0

        paginated_queryset = queryset[start_offset : start_offset + first]

        # Create page info
        has_next = start_offset + first < total_count
        has_previous = start_offset > 0
        end_cursor = str(start_offset + len(paginated_queryset))

        return {
            "edges": paginated_queryset,
            "page_info": {
                "has_next_page": has_next,
                "has_previous_page": has_previous,
                "start_cursor": str(start_offset),
                "end_cursor": end_cursor,
            },
            "total_count": total_count,
        }

    def resolve_task(self, info, id):
        """Get a specific task by ID within the current organization."""
        organization = get_organization_from_context(info)
        try:
            return Task.objects.get(id=id, project__organization=organization)
        except Task.DoesNotExist:
            raise GraphQLError(f"Task with ID {id} not found")

    # Task comment resolvers
    def resolve_task_comments(self, info, task_id, first=20, after=None):
        """Get comments for a specific task with pagination."""
        organization = get_organization_from_context(info)

        # Verify task belongs to the organization
        try:
            task = Task.objects.get(id=task_id, project__organization=organization)
        except Task.DoesNotExist:
            raise GraphQLError(f"Task with ID {task_id} not found")

        queryset = TaskComment.objects.filter(task=task).order_by("-created_at")

        # Apply pagination (simplified)
        total_count = queryset.count()
        start_offset = 0
        if after:
            try:
                start_offset = int(after)
            except (ValueError, TypeError):
                start_offset = 0

        paginated_queryset = queryset[start_offset : start_offset + first]

        # Create page info
        has_next = start_offset + first < total_count
        has_previous = start_offset > 0
        end_cursor = str(start_offset + len(paginated_queryset))

        return {
            "edges": paginated_queryset,
            "page_info": {
                "has_next_page": has_next,
                "has_previous_page": has_previous,
                "start_cursor": str(start_offset),
                "end_cursor": end_cursor,
            },
            "total_count": total_count,
        }

    # Analytics resolvers
    def resolve_organization_statistics(self, info):
        """Get comprehensive organization statistics."""
        organization = get_organization_from_context(info)

        # Project statistics
        projects = Project.objects.filter(organization=organization)
        project_stats = {
            "total_projects": projects.count(),
            "active_projects": projects.filter(status="ACTIVE").count(),
            "completed_projects": projects.filter(status="COMPLETED").count(),
            "on_hold_projects": projects.filter(status="ON_HOLD").count(),
            "cancelled_projects": projects.filter(status="CANCELLED").count(),
            "overdue_projects": self._get_overdue_projects_count(projects),
            "completion_rate": self._calculate_project_completion_rate(projects),
        }

        # Task statistics
        tasks = Task.objects.filter(project__organization=organization)
        task_stats = {
            "total_tasks": tasks.count(),
            "todo_tasks": tasks.filter(status="TODO").count(),
            "in_progress_tasks": tasks.filter(status="IN_PROGRESS").count(),
            "completed_tasks": tasks.filter(status="DONE").count(),
            "overdue_tasks": self._get_overdue_tasks_count(tasks),
            "completion_rate": self._calculate_task_completion_rate(tasks),
            "average_completion_time": self._calculate_average_completion_time(tasks),
        }

        # User statistics
        users = User.objects.filter(organization=organization)
        most_active_users = self._get_most_active_users(organization)

        return {
            "project_stats": project_stats,
            "task_stats": task_stats,
            "user_count": users.count(),
            "most_active_users": most_active_users,
            "recent_activity_count": self._get_recent_activity_count(organization),
        }

    def resolve_project_statistics(self, info):
        """Get project statistics for the current organization."""
        organization = get_organization_from_context(info)
        projects = Project.objects.filter(organization=organization)

        return {
            "total_projects": projects.count(),
            "active_projects": projects.filter(status="ACTIVE").count(),
            "completed_projects": projects.filter(status="COMPLETED").count(),
            "on_hold_projects": projects.filter(status="ON_HOLD").count(),
            "cancelled_projects": projects.filter(status="CANCELLED").count(),
            "overdue_projects": self._get_overdue_projects_count(projects),
            "completion_rate": self._calculate_project_completion_rate(projects),
        }

    def resolve_task_statistics(self, info, project_id=None):
        """Get task statistics (organization-wide or for specific project)."""
        organization = get_organization_from_context(info)

        if project_id:
            # Get statistics for specific project
            try:
                project = Project.objects.get(id=project_id, organization=organization)
                tasks = Task.objects.filter(project=project)
            except Project.DoesNotExist:
                raise GraphQLError(f"Project with ID {project_id} not found")
        else:
            # Get organization-wide statistics
            tasks = Task.objects.filter(project__organization=organization)

        return {
            "total_tasks": tasks.count(),
            "todo_tasks": tasks.filter(status="TODO").count(),
            "in_progress_tasks": tasks.filter(status="IN_PROGRESS").count(),
            "completed_tasks": tasks.filter(status="DONE").count(),
            "overdue_tasks": self._get_overdue_tasks_count(tasks),
            "completion_rate": self._calculate_task_completion_rate(tasks),
            "average_completion_time": self._calculate_average_completion_time(tasks),
        }

    # Helper methods for statistics
    def _get_overdue_projects_count(self, projects):
        """Get count of overdue projects."""
        from django.utils import timezone

        return projects.filter(
            due_date__lt=timezone.now().date(), status__in=["ACTIVE", "ON_HOLD"]
        ).count()

    def _get_overdue_tasks_count(self, tasks):
        """Get count of overdue tasks."""
        from django.utils import timezone

        return tasks.filter(
            due_date__lt=timezone.now(), status__in=["TODO", "IN_PROGRESS"]
        ).count()

    def _calculate_project_completion_rate(self, projects):
        """Calculate project completion rate as percentage."""
        total = projects.count()
        if total == 0:
            return 0.0
        completed = projects.filter(status="COMPLETED").count()
        return (completed / total) * 100

    def _calculate_task_completion_rate(self, tasks):
        """Calculate task completion rate as percentage."""
        total = tasks.count()
        if total == 0:
            return 0.0
        completed = tasks.filter(status="DONE").count()
        return (completed / total) * 100

    def _calculate_average_completion_time(self, tasks):
        """Calculate average task completion time in hours."""
        completed_tasks = tasks.filter(status="DONE").exclude(updated_at__isnull=True)
        if not completed_tasks.exists():
            return 0.0

        total_hours = 0
        count = 0
        for task in completed_tasks:
            delta = task.updated_at - task.created_at
            total_hours += delta.total_seconds() / 3600
            count += 1

        return total_hours / count if count > 0 else 0.0

    def _get_most_active_users(self, organization, limit=5):
        """Get most active users based on task assignments and comments."""
        users = User.objects.filter(organization=organization)

        # Annotate users with activity counts
        users_with_activity = users.annotate(
            assigned_tasks=Count("task", distinct=True),
            comments_made=Count("taskcomment", distinct=True),
        ).order_by("-assigned_tasks", "-comments_made")[:limit]

        return list(users_with_activity)

    def _get_recent_activity_count(self, organization):
        """Get count of recent activity in the last 7 days."""
        from django.utils import timezone
        from datetime import timedelta

        week_ago = timezone.now() - timedelta(days=7)

        # Count recent tasks, projects, and comments
        recent_tasks = Task.objects.filter(
            project__organization=organization, created_at__gte=week_ago
        ).count()

        recent_projects = Project.objects.filter(
            organization=organization, created_at__gte=week_ago
        ).count()

        recent_comments = TaskComment.objects.filter(
            task__project__organization=organization, created_at__gte=week_ago
        ).count()

        return recent_tasks + recent_projects + recent_comments
