"""
GraphQL types for all models.

This module defines GraphQL types using Graphene-Django for all models
in the project management system, including Organization, Project, Task, and TaskComment.
"""

import graphene
from graphene_django import DjangoObjectType
from graphene import relay
from django.contrib.auth import get_user_model
from core.models import Organization, Project, Task, TaskComment

User = get_user_model()


class UserType(DjangoObjectType):
    """
    GraphQL type for User model.

    Provides user information with organization context and
    security-aware field access.
    """

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "first_name",
            "last_name",
            "username",
            "is_active",
            "is_organization_admin",
            "email_verified",
            "created_at",
            "updated_at",
            "organization",
        )
        interfaces = (relay.Node,)

    full_name = graphene.String()
    initials = graphene.String()

    def resolve_full_name(self, info):
        """Return the user's full name."""
        return self.get_full_name()

    def resolve_initials(self, info):
        """Return the user's initials."""
        first_initial = self.first_name[0].upper() if self.first_name else ""
        last_initial = self.last_name[0].upper() if self.last_name else ""
        return f"{first_initial}{last_initial}"


class OrganizationType(DjangoObjectType):
    """
    GraphQL type for Organization model.

    Provides organization information with user and project statistics.
    """

    class Meta:
        model = Organization
        fields = (
            "id",
            "name",
            "slug",
            "contact_email",
            "description",
            "is_active",
            "created_at",
            "updated_at",
        )
        interfaces = (relay.Node,)

    user_count = graphene.Int()
    project_count = graphene.Int()
    active_project_count = graphene.Int()
    task_count = graphene.Int()
    completed_task_count = graphene.Int()

    def resolve_user_count(self, info):
        """Return the total number of users in this organization."""
        return self.users.count()

    def resolve_project_count(self, info):
        """Return the total number of projects in this organization."""
        return self.projects.count()

    def resolve_active_project_count(self, info):
        """Return the number of active projects in this organization."""
        return self.projects.filter(status="ACTIVE").count()

    def resolve_task_count(self, info):
        """Return the total number of tasks across all projects in this organization."""
        return Task.objects.filter(project__organization=self).count()

    def resolve_completed_task_count(self, info):
        """Return the number of completed tasks across all projects in this organization."""
        return Task.objects.filter(project__organization=self, status="DONE").count()


class ProjectType(DjangoObjectType):
    """
    GraphQL type for Project model.

    Provides project information with task statistics and completion metrics.
    """

    class Meta:
        model = Project
        fields = (
            "id",
            "name",
            "description",
            "status",
            "due_date",
            "created_at",
            "updated_at",
            "organization",
        )
        interfaces = (relay.Node,)

    task_count = graphene.Int()
    completed_task_count = graphene.Int()
    in_progress_task_count = graphene.Int()
    todo_task_count = graphene.Int()
    completion_rate = graphene.Float()
    is_overdue = graphene.Boolean()
    days_remaining = graphene.Int()

    def resolve_task_count(self, info):
        """Return the total number of tasks in this project."""
        return self.task_count

    def resolve_completed_task_count(self, info):
        """Return the number of completed tasks in this project."""
        return self.completed_task_count

    def resolve_in_progress_task_count(self, info):
        """Return the number of in-progress tasks in this project."""
        return self.tasks.filter(status="IN_PROGRESS").count()

    def resolve_todo_task_count(self, info):
        """Return the number of todo tasks in this project."""
        return self.tasks.filter(status="TODO").count()

    def resolve_completion_rate(self, info):
        """Return the completion rate as a percentage."""
        return self.completion_rate

    def resolve_is_overdue(self, info):
        """Check if the project is overdue."""
        if not self.due_date:
            return False
        from django.utils import timezone

        return self.due_date < timezone.now().date() and self.status != "COMPLETED"

    def resolve_days_remaining(self, info):
        """Return the number of days remaining until the due date."""
        if not self.due_date:
            return None
        from django.utils import timezone

        delta = self.due_date - timezone.now().date()
        return delta.days


class TaskType(DjangoObjectType):
    """
    GraphQL type for Task model.

    Provides task information with assignee details and status tracking.
    """

    class Meta:
        model = Task
        fields = (
            "id",
            "title",
            "description",
            "status",
            "assignee_email",
            "due_date",
            "created_at",
            "updated_at",
            "project",
        )
        interfaces = (relay.Node,)

    comment_count = graphene.Int()
    is_overdue = graphene.Boolean()
    assignee = graphene.Field(UserType)
    days_remaining = graphene.Int()
    hours_remaining = graphene.Int()

    def resolve_comment_count(self, info):
        """Return the number of comments on this task."""
        return self.comments.count()

    def resolve_is_overdue(self, info):
        """Check if the task is overdue."""
        return self.is_overdue

    def resolve_assignee(self, info):
        """Return the assigned user if assignee_email matches a user in the organization."""
        if not self.assignee_email:
            return None
        try:
            return User.objects.get(
                email=self.assignee_email, organization=self.project.organization
            )
        except User.DoesNotExist:
            return None

    def resolve_days_remaining(self, info):
        """Return the number of days remaining until the due date."""
        if not self.due_date:
            return None
        from django.utils import timezone

        delta = self.due_date - timezone.now()
        return delta.days

    def resolve_hours_remaining(self, info):
        """Return the number of hours remaining until the due date."""
        if not self.due_date:
            return None
        from django.utils import timezone

        delta = self.due_date - timezone.now()
        return int(delta.total_seconds() / 3600)


class TaskCommentType(DjangoObjectType):
    """
    GraphQL type for TaskComment model.

    Provides comment information with author details.
    """

    class Meta:
        model = TaskComment
        fields = ("id", "content", "author_email", "created_at", "updated_at", "task")
        interfaces = (relay.Node,)

    author = graphene.Field(UserType)

    def resolve_author(self, info):
        """Return the author user if author_email matches a user in the organization."""
        if not self.author_email:
            return None
        try:
            return User.objects.get(
                email=self.author_email, organization=self.task.project.organization
            )
        except User.DoesNotExist:
            return None


# Statistics and Analytics Types
class ProjectStatistics(graphene.ObjectType):
    """
    GraphQL type for project statistics.

    Provides aggregated statistics for projects within an organization.
    """

    total_projects = graphene.Int()
    active_projects = graphene.Int()
    completed_projects = graphene.Int()
    on_hold_projects = graphene.Int()
    cancelled_projects = graphene.Int()
    overdue_projects = graphene.Int()
    completion_rate = graphene.Float()


class TaskStatistics(graphene.ObjectType):
    """
    GraphQL type for task statistics.

    Provides aggregated statistics for tasks within an organization or project.
    """

    total_tasks = graphene.Int()
    todo_tasks = graphene.Int()
    in_progress_tasks = graphene.Int()
    completed_tasks = graphene.Int()
    overdue_tasks = graphene.Int()
    completion_rate = graphene.Float()
    average_completion_time = graphene.Float()  # in hours


class OrganizationStatistics(graphene.ObjectType):
    """
    GraphQL type for organization-wide statistics.

    Provides comprehensive analytics for an entire organization.
    """

    project_stats = graphene.Field(ProjectStatistics)
    task_stats = graphene.Field(TaskStatistics)
    user_count = graphene.Int()
    most_active_users = graphene.List(UserType)
    recent_activity_count = graphene.Int()


class TrendDataPoint(graphene.ObjectType):
    """
    GraphQL type for trend data points.

    Represents a single data point in trend analysis.
    """

    date = graphene.Date()
    value = graphene.Float()
    label = graphene.String()


class ProductivityMetrics(graphene.ObjectType):
    """
    GraphQL type for user productivity metrics.

    Provides detailed productivity analysis for users.
    """

    user = graphene.Field(UserType)
    total_assigned_tasks = graphene.Int()
    completed_assigned_tasks = graphene.Int()
    completion_rate = graphene.Float()
    comments_made = graphene.Int()
    projects_involved = graphene.Int()
    average_completion_time_hours = graphene.Float()
    recent_activity_count = graphene.Int()
    productivity_score = graphene.Float()


class ProjectHealthMetrics(graphene.ObjectType):
    """
    GraphQL type for project health analysis.

    Provides comprehensive health assessment for projects.
    """

    project = graphene.Field(ProjectType)
    health_score = graphene.Float()
    completion_score = graphene.Float()
    on_time_score = graphene.Float()
    activity_score = graphene.Float()
    overdue_penalty = graphene.Float()
    recommendations = graphene.List(graphene.String)


class AnalyticsSummary(graphene.ObjectType):
    """
    GraphQL type for analytics summary.

    Provides high-level overview of organizational analytics.
    """

    total_projects = graphene.Int()
    total_tasks = graphene.Int()
    total_users = graphene.Int()
    overall_project_completion_rate = graphene.Float()
    overall_task_completion_rate = graphene.Float()
    overdue_projects_percentage = graphene.Float()
    overdue_tasks_percentage = graphene.Float()
    productivity_score = graphene.Float()
    generated_at = graphene.DateTime()


# Enums for filtering and sorting
class ProjectStatusEnum(graphene.Enum):
    """Enum for project status values."""

    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    ON_HOLD = "ON_HOLD"
    CANCELLED = "CANCELLED"


class TaskStatusEnum(graphene.Enum):
    """Enum for task status values."""

    TODO = "TODO"
    IN_PROGRESS = "IN_PROGRESS"
    DONE = "DONE"


class SortOrder(graphene.Enum):
    """Enum for sort order."""

    ASC = "ASC"
    DESC = "DESC"


# Input types for filtering
class ProjectFilterInput(graphene.InputObjectType):
    """Input type for filtering projects."""

    status = graphene.Field(ProjectStatusEnum)
    name_contains = graphene.String()
    created_after = graphene.DateTime()
    created_before = graphene.DateTime()
    due_after = graphene.Date()
    due_before = graphene.Date()


class TaskFilterInput(graphene.InputObjectType):
    """Input type for filtering tasks."""

    status = graphene.Field(TaskStatusEnum)
    title_contains = graphene.String()
    assignee_email = graphene.String()
    project_id = graphene.ID()
    created_after = graphene.DateTime()
    created_before = graphene.DateTime()
    due_after = graphene.DateTime()
    due_before = graphene.DateTime()


# Pagination types
class PageInfo(graphene.ObjectType):
    """Page information for pagination."""

    has_next_page = graphene.Boolean()
    has_previous_page = graphene.Boolean()
    start_cursor = graphene.String()
    end_cursor = graphene.String()


class ProjectConnection(graphene.ObjectType):
    """Connection type for paginated project results."""

    edges = graphene.List(ProjectType)
    page_info = graphene.Field(PageInfo)
    total_count = graphene.Int()


class TaskConnection(graphene.ObjectType):
    """Connection type for paginated task results."""

    edges = graphene.List(TaskType)
    page_info = graphene.Field(PageInfo)
    total_count = graphene.Int()


class TaskCommentConnection(graphene.ObjectType):
    """Connection type for paginated task comment results."""

    edges = graphene.List(TaskCommentType)
    page_info = graphene.Field(PageInfo)
    total_count = graphene.Int()
