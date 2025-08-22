"""
Analytics resolvers and calculations for project management statistics.

This module provides dedicated analytics functionality for calculating
project completion rates, task statistics, user activity metrics, and
other business intelligence data with proper organization-scoped access control.
"""

import graphene
from django.db.models import Count, Avg, Q
from django.utils import timezone
from datetime import timedelta
from graphql import GraphQLError
from core.models import Organization, Project, Task, TaskComment
from core.permissions import require_permission, IsAuthenticated, IsOrganizationMember
from .middleware import get_organization_from_context
from .types import (
    ProjectStatistics,
    TaskStatistics,
    OrganizationStatistics,
    UserType,
)


class AnalyticsQuery(graphene.ObjectType):
    """
    Dedicated analytics query class for project management statistics.

    Provides comprehensive analytics capabilities including project completion rates,
    task distribution analysis, user activity metrics, and performance trends.
    """

    # Advanced analytics queries
    project_completion_trends = graphene.List(
        graphene.Float,
        days=graphene.Int(default_value=30),
        description="Get project completion trends over specified days",
    )

    task_completion_trends = graphene.List(
        graphene.Float,
        days=graphene.Int(default_value=30),
        project_id=graphene.ID(),
        description="Get task completion trends over specified days",
    )

    user_productivity_metrics = graphene.List(
        UserType,
        limit=graphene.Int(default_value=10),
        description="Get user productivity metrics ranked by activity",
    )

    project_health_score = graphene.Float(
        project_id=graphene.ID(required=True),
        description="Calculate project health score based on multiple factors",
    )

    overdue_items_analysis = graphene.Field(
        graphene.String,  # JSON string containing detailed analysis
        description="Get detailed analysis of overdue projects and tasks",
    )

    @require_permission(IsAuthenticated, IsOrganizationMember)
    def resolve_project_completion_trends(self, info, days=30):
        """
        Get project completion trends over the specified number of days.

        Returns a list of completion rates for each day, allowing
        frontend to render trend charts and analytics dashboards.
        """
        organization = get_organization_from_context(info)
        if not organization:
            raise GraphQLError("Organization context required")

        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)

        trends = []
        current_date = start_date

        while current_date <= end_date:
            # Get projects that existed on this date
            projects_on_date = Project.objects.filter(
                organization=organization, created_at__date__lte=current_date
            )

            # Calculate completion rate for this date
            total_projects = projects_on_date.count()
            if total_projects > 0:
                completed_projects = projects_on_date.filter(
                    status="COMPLETED", updated_at__date__lte=current_date
                ).count()
                completion_rate = (completed_projects / total_projects) * 100
            else:
                completion_rate = 0.0

            trends.append(completion_rate)
            current_date += timedelta(days=1)

        return trends

    @require_permission(IsAuthenticated, IsOrganizationMember)
    def resolve_task_completion_trends(self, info, days=30, project_id=None):
        """
        Get task completion trends over the specified number of days.

        Can be scoped to a specific project or organization-wide.
        """
        organization = get_organization_from_context(info)
        if not organization:
            raise GraphQLError("Organization context required")

        if project_id:
            # Verify project belongs to organization
            try:
                project = Project.objects.get(id=project_id, organization=organization)
                base_queryset = Task.objects.filter(project=project)
            except Project.DoesNotExist:
                raise GraphQLError(f"Project with ID {project_id} not found")
        else:
            base_queryset = Task.objects.filter(project__organization=organization)

        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)

        trends = []
        current_date = start_date

        while current_date <= end_date:
            # Get tasks that existed on this date
            tasks_on_date = base_queryset.filter(created_at__date__lte=current_date)

            # Calculate completion rate for this date
            total_tasks = tasks_on_date.count()
            if total_tasks > 0:
                completed_tasks = tasks_on_date.filter(
                    status="DONE", updated_at__date__lte=current_date
                ).count()
                completion_rate = (completed_tasks / total_tasks) * 100
            else:
                completion_rate = 0.0

            trends.append(completion_rate)
            current_date += timedelta(days=1)

        return trends

    @require_permission(IsAuthenticated, IsOrganizationMember)
    def resolve_user_productivity_metrics(self, info, limit=10):
        """
        Get user productivity metrics ranked by activity.

        Includes task completion rates, comment activity, and project involvement.
        """
        from django.contrib.auth import get_user_model

        User = get_user_model()
        organization = get_organization_from_context(info)
        if not organization:
            raise GraphQLError("Organization context required")

        # Get users with productivity metrics
        users = (
            User.objects.filter(organization=organization)
            .annotate(
                # Count assigned tasks
                total_assigned_tasks=Count(
                    "task",
                    filter=Q(task__project__organization=organization),
                    distinct=True,
                ),
                # Count completed tasks
                completed_assigned_tasks=Count(
                    "task",
                    filter=Q(
                        task__project__organization=organization, task__status="DONE"
                    ),
                    distinct=True,
                ),
                # Count comments made
                comments_made=Count(
                    "taskcomment",
                    filter=Q(taskcomment__task__project__organization=organization),
                    distinct=True,
                ),
                # Count projects involved in
                projects_involved=Count(
                    "task__project",
                    filter=Q(task__project__organization=organization),
                    distinct=True,
                ),
            )
            .order_by(
                "-total_assigned_tasks", "-completed_assigned_tasks", "-comments_made"
            )[:limit]
        )

        return list(users)

    @require_permission(IsAuthenticated, IsOrganizationMember)
    def resolve_project_health_score(self, info, project_id):
        """
        Calculate project health score based on multiple factors.

        Factors include:
        - Task completion rate
        - On-time delivery rate
        - Team activity level
        - Overdue task ratio
        """
        organization = get_organization_from_context(info)
        if not organization:
            raise GraphQLError("Organization context required")

        try:
            project = Project.objects.get(id=project_id, organization=organization)
        except Project.DoesNotExist:
            raise GraphQLError(f"Project with ID {project_id} not found")

        tasks = Task.objects.filter(project=project)
        total_tasks = tasks.count()

        if total_tasks == 0:
            return 100.0  # New project with no tasks gets perfect score

        # Factor 1: Task completion rate (40% weight)
        completed_tasks = tasks.filter(status="DONE").count()
        completion_score = (completed_tasks / total_tasks) * 40

        # Factor 2: On-time delivery rate (30% weight)
        tasks_with_due_dates = tasks.exclude(due_date__isnull=True)
        if tasks_with_due_dates.exists():
            on_time_tasks = tasks_with_due_dates.filter(
                status="DONE", updated_at__lte=tasks_with_due_dates.first().due_date
            ).count()
            on_time_score = (on_time_tasks / tasks_with_due_dates.count()) * 30
        else:
            on_time_score = 30.0  # Perfect score if no due dates set

        # Factor 3: Activity level (20% weight)
        recent_activity = TaskComment.objects.filter(
            task__project=project, created_at__gte=timezone.now() - timedelta(days=7)
        ).count()
        # Normalize activity score (max 10 comments per week = perfect score)
        activity_score = min(recent_activity / 10, 1.0) * 20

        # Factor 4: Overdue penalty (10% weight)
        overdue_tasks = tasks.filter(
            due_date__lt=timezone.now(), status__in=["TODO", "IN_PROGRESS"]
        ).count()
        overdue_penalty = (overdue_tasks / total_tasks) * 10

        # Calculate final health score
        health_score = (
            completion_score + on_time_score + activity_score - overdue_penalty
        )
        return max(0.0, min(100.0, health_score))

    @require_permission(IsAuthenticated, IsOrganizationMember)
    def resolve_overdue_items_analysis(self, info):
        """
        Get detailed analysis of overdue projects and tasks.

        Returns JSON string containing comprehensive overdue analysis
        including categorization, impact assessment, and recommendations.
        """
        import json

        organization = get_organization_from_context(info)
        if not organization:
            raise GraphQLError("Organization context required")

        now = timezone.now()
        today = now.date()

        # Analyze overdue projects
        overdue_projects = Project.objects.filter(
            organization=organization,
            due_date__lt=today,
            status__in=["ACTIVE", "ON_HOLD"],
        )

        # Analyze overdue tasks
        overdue_tasks = Task.objects.filter(
            project__organization=organization,
            due_date__lt=now,
            status__in=["TODO", "IN_PROGRESS"],
        )

        # Categorize by severity (days overdue)
        def categorize_overdue_items(items, date_field):
            categories = {
                "critical": [],  # >30 days overdue
                "high": [],  # 15-30 days overdue
                "medium": [],  # 7-14 days overdue
                "low": [],  # 1-6 days overdue
            }

            for item in items:
                due_date = getattr(item, date_field)
                if isinstance(due_date, timezone.datetime):
                    days_overdue = (now - due_date).days
                else:  # date object
                    days_overdue = (today - due_date).days

                if days_overdue > 30:
                    categories["critical"].append(
                        {
                            "id": str(item.id),
                            "name": getattr(item, "name", getattr(item, "title", "")),
                            "days_overdue": days_overdue,
                        }
                    )
                elif days_overdue > 15:
                    categories["high"].append(
                        {
                            "id": str(item.id),
                            "name": getattr(item, "name", getattr(item, "title", "")),
                            "days_overdue": days_overdue,
                        }
                    )
                elif days_overdue > 7:
                    categories["medium"].append(
                        {
                            "id": str(item.id),
                            "name": getattr(item, "name", getattr(item, "title", "")),
                            "days_overdue": days_overdue,
                        }
                    )
                else:
                    categories["low"].append(
                        {
                            "id": str(item.id),
                            "name": getattr(item, "name", getattr(item, "title", "")),
                            "days_overdue": days_overdue,
                        }
                    )

            return categories

        project_categories = categorize_overdue_items(overdue_projects, "due_date")
        task_categories = categorize_overdue_items(overdue_tasks, "due_date")

        # Calculate impact metrics
        total_projects = Project.objects.filter(organization=organization).count()
        total_tasks = Task.objects.filter(project__organization=organization).count()

        overdue_project_percentage = (
            (overdue_projects.count() / total_projects * 100)
            if total_projects > 0
            else 0
        )
        overdue_task_percentage = (
            (overdue_tasks.count() / total_tasks * 100) if total_tasks > 0 else 0
        )

        # Generate recommendations
        recommendations = []

        if len(project_categories["critical"]) > 0:
            recommendations.append(
                {
                    "priority": "URGENT",
                    "message": f"{len(project_categories['critical'])} projects are critically overdue (>30 days). Immediate attention required.",
                    "action": "Review project scope and deadlines, consider resource reallocation.",
                }
            )

        if len(task_categories["critical"]) > 0:
            recommendations.append(
                {
                    "priority": "HIGH",
                    "message": f"{len(task_categories['critical'])} tasks are critically overdue. Break down into smaller tasks or reassign.",
                    "action": "Contact assignees and stakeholders to identify blockers.",
                }
            )

        if overdue_project_percentage > 20:
            recommendations.append(
                {
                    "priority": "MEDIUM",
                    "message": f"{overdue_project_percentage:.1f}% of projects are overdue. Review planning processes.",
                    "action": "Implement better deadline setting and progress tracking.",
                }
            )

        analysis = {
            "summary": {
                "overdue_projects_count": overdue_projects.count(),
                "overdue_tasks_count": overdue_tasks.count(),
                "overdue_project_percentage": overdue_project_percentage,
                "overdue_task_percentage": overdue_task_percentage,
            },
            "project_categories": project_categories,
            "task_categories": task_categories,
            "recommendations": recommendations,
            "generated_at": now.isoformat(),
        }

        return json.dumps(analysis, indent=2)


# Export the analytics functionality for use in main query
analytics_query = AnalyticsQuery()
