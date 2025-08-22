"""
Business logic services for statistics and analytics calculations.

This module provides reusable business logic services for calculating
project statistics, user metrics, and organizational analytics. These
services can be used by GraphQL resolvers, API views, and background tasks.
"""

from django.db.models import Count, Avg, Q, F, Sum, Case, When, IntegerField
from django.utils import timezone
from datetime import timedelta, date
from typing import Dict, List, Optional, Tuple
from core.models import Organization, Project, Task, TaskComment


class ProjectStatisticsService:
    """
    Service class for calculating project-related statistics and metrics.

    Provides methods for calculating completion rates, performance metrics,
    project health scores, and trend analysis for projects within an organization.
    """

    def __init__(self, organization: Organization):
        """Initialize the service with an organization context."""
        self.organization = organization

    def get_basic_project_stats(self) -> Dict:
        """
        Get basic project statistics for the organization.

        Returns:
            Dictionary containing total, active, completed, on-hold, and cancelled project counts
        """
        projects = Project.objects.filter(organization=self.organization)

        stats = projects.aggregate(
            total_projects=Count("id"),
            active_projects=Count("id", filter=Q(status="ACTIVE")),
            completed_projects=Count("id", filter=Q(status="COMPLETED")),
            on_hold_projects=Count("id", filter=Q(status="ON_HOLD")),
            cancelled_projects=Count("id", filter=Q(status="CANCELLED")),
        )

        # Calculate overdue projects
        stats["overdue_projects"] = self.get_overdue_projects_count()

        # Calculate completion rate
        total = stats["total_projects"]
        completed = stats["completed_projects"]
        stats["completion_rate"] = (completed / total * 100) if total > 0 else 0.0

        return stats

    def get_overdue_projects_count(self) -> int:
        """Get count of projects that are overdue."""
        today = timezone.now().date()
        return Project.objects.filter(
            organization=self.organization,
            due_date__lt=today,
            status__in=["ACTIVE", "ON_HOLD"],
        ).count()

    def get_projects_by_status_distribution(self) -> Dict[str, int]:
        """
        Get distribution of projects by status.

        Returns:
            Dictionary mapping status names to counts
        """
        projects = Project.objects.filter(organization=self.organization)

        return projects.aggregate(
            ACTIVE=Count("id", filter=Q(status="ACTIVE")),
            COMPLETED=Count("id", filter=Q(status="COMPLETED")),
            ON_HOLD=Count("id", filter=Q(status="ON_HOLD")),
            CANCELLED=Count("id", filter=Q(status="CANCELLED")),
        )

    def get_project_completion_trend(self, days: int = 30) -> List[Tuple[date, float]]:
        """
        Get project completion rate trend over specified days.

        Args:
            days: Number of days to analyze

        Returns:
            List of tuples containing (date, completion_rate_percentage)
        """
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)

        trend_data = []
        current_date = start_date

        while current_date <= end_date:
            # Get projects that existed on this date
            projects_on_date = Project.objects.filter(
                organization=self.organization, created_at__date__lte=current_date
            )

            total_count = projects_on_date.count()
            if total_count > 0:
                completed_count = projects_on_date.filter(
                    status="COMPLETED", updated_at__date__lte=current_date
                ).count()
                completion_rate = (completed_count / total_count) * 100
            else:
                completion_rate = 0.0

            trend_data.append((current_date, completion_rate))
            current_date += timedelta(days=1)

        return trend_data

    def calculate_project_health_score(self, project: Project) -> float:
        """
        Calculate a comprehensive health score for a project.

        The health score is based on:
        - Task completion rate (40% weight)
        - On-time delivery rate (30% weight)
        - Recent activity level (20% weight)
        - Overdue penalty (10% deduction)

        Args:
            project: The project to analyze

        Returns:
            Health score between 0.0 and 100.0
        """
        tasks = Task.objects.filter(project=project)
        total_tasks = tasks.count()

        if total_tasks == 0:
            return 100.0  # New project gets perfect score

        # Factor 1: Task completion rate (40% weight)
        completed_tasks = tasks.filter(status="DONE").count()
        completion_score = (completed_tasks / total_tasks) * 40

        # Factor 2: On-time delivery rate (30% weight)
        tasks_with_due_dates = tasks.exclude(due_date__isnull=True)
        if tasks_with_due_dates.exists():
            on_time_tasks = 0
            for task in tasks_with_due_dates.filter(status="DONE"):
                if task.updated_at and task.updated_at <= task.due_date:
                    on_time_tasks += 1
            on_time_score = (on_time_tasks / tasks_with_due_dates.count()) * 30
        else:
            on_time_score = 30.0  # Perfect score if no due dates

        # Factor 3: Recent activity level (20% weight)
        week_ago = timezone.now() - timedelta(days=7)
        recent_comments = TaskComment.objects.filter(
            task__project=project, created_at__gte=week_ago
        ).count()
        recent_task_updates = tasks.filter(updated_at__gte=week_ago).count()
        total_activity = recent_comments + recent_task_updates

        # Normalize activity (assume 10 activities per week is optimal)
        activity_score = min(total_activity / 10, 1.0) * 20

        # Factor 4: Overdue penalty (10% deduction)
        now = timezone.now()
        overdue_tasks = tasks.filter(
            due_date__lt=now, status__in=["TODO", "IN_PROGRESS"]
        ).count()
        overdue_penalty = (overdue_tasks / total_tasks) * 10

        # Calculate final score
        health_score = (
            completion_score + on_time_score + activity_score - overdue_penalty
        )
        return max(0.0, min(100.0, health_score))


class TaskStatisticsService:
    """
    Service class for calculating task-related statistics and metrics.

    Provides methods for task completion analysis, workload distribution,
    performance tracking, and productivity metrics.
    """

    def __init__(self, organization: Organization, project: Optional[Project] = None):
        """
        Initialize the service with organization and optional project context.

        Args:
            organization: The organization to analyze
            project: Optional project to scope the analysis to
        """
        self.organization = organization
        self.project = project

    def get_basic_task_stats(self) -> Dict:
        """
        Get basic task statistics.

        Returns:
            Dictionary containing task counts by status and completion metrics
        """
        if self.project:
            tasks = Task.objects.filter(project=self.project)
        else:
            tasks = Task.objects.filter(project__organization=self.organization)

        stats = tasks.aggregate(
            total_tasks=Count("id"),
            todo_tasks=Count("id", filter=Q(status="TODO")),
            in_progress_tasks=Count("id", filter=Q(status="IN_PROGRESS")),
            completed_tasks=Count("id", filter=Q(status="DONE")),
        )

        # Calculate overdue tasks
        stats["overdue_tasks"] = self.get_overdue_tasks_count()

        # Calculate completion rate
        total = stats["total_tasks"]
        completed = stats["completed_tasks"]
        stats["completion_rate"] = (completed / total * 100) if total > 0 else 0.0

        # Calculate average completion time
        stats["average_completion_time"] = self.calculate_average_completion_time()

        return stats

    def get_overdue_tasks_count(self) -> int:
        """Get count of tasks that are overdue."""
        now = timezone.now()

        if self.project:
            tasks = Task.objects.filter(project=self.project)
        else:
            tasks = Task.objects.filter(project__organization=self.organization)

        return tasks.filter(
            due_date__lt=now, status__in=["TODO", "IN_PROGRESS"]
        ).count()

    def calculate_average_completion_time(self) -> float:
        """
        Calculate average task completion time in hours.

        Returns:
            Average completion time in hours, or 0.0 if no completed tasks
        """
        if self.project:
            completed_tasks = Task.objects.filter(
                project=self.project, status="DONE"
            ).exclude(updated_at__isnull=True)
        else:
            completed_tasks = Task.objects.filter(
                project__organization=self.organization, status="DONE"
            ).exclude(updated_at__isnull=True)

        if not completed_tasks.exists():
            return 0.0

        total_hours = 0
        count = 0

        for task in completed_tasks:
            if task.updated_at and task.created_at:
                delta = task.updated_at - task.created_at
                total_hours += delta.total_seconds() / 3600
                count += 1

        return total_hours / count if count > 0 else 0.0

    def get_task_distribution_by_assignee(self) -> Dict[str, Dict]:
        """
        Get task distribution by assignee.

        Returns:
            Dictionary mapping assignee emails to their task statistics
        """
        if self.project:
            tasks = Task.objects.filter(project=self.project)
        else:
            tasks = Task.objects.filter(project__organization=self.organization)

        # Get assignee statistics
        assignee_stats = (
            tasks.exclude(assignee_email="")
            .values("assignee_email")
            .annotate(
                total_tasks=Count("id"),
                completed_tasks=Count("id", filter=Q(status="DONE")),
                in_progress_tasks=Count("id", filter=Q(status="IN_PROGRESS")),
                todo_tasks=Count("id", filter=Q(status="TODO")),
            )
        )

        result = {}
        for stat in assignee_stats:
            email = stat["assignee_email"]
            total = stat["total_tasks"]
            completed = stat["completed_tasks"]

            result[email] = {
                "total_tasks": total,
                "completed_tasks": completed,
                "in_progress_tasks": stat["in_progress_tasks"],
                "todo_tasks": stat["todo_tasks"],
                "completion_rate": (completed / total * 100) if total > 0 else 0.0,
            }

        return result

    def get_task_completion_trend(self, days: int = 30) -> List[Tuple[date, float]]:
        """
        Get task completion rate trend over specified days.

        Args:
            days: Number of days to analyze

        Returns:
            List of tuples containing (date, completion_rate_percentage)
        """
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)

        trend_data = []
        current_date = start_date

        while current_date <= end_date:
            if self.project:
                tasks_on_date = Task.objects.filter(
                    project=self.project, created_at__date__lte=current_date
                )
            else:
                tasks_on_date = Task.objects.filter(
                    project__organization=self.organization,
                    created_at__date__lte=current_date,
                )

            total_count = tasks_on_date.count()
            if total_count > 0:
                completed_count = tasks_on_date.filter(
                    status="DONE", updated_at__date__lte=current_date
                ).count()
                completion_rate = (completed_count / total_count) * 100
            else:
                completion_rate = 0.0

            trend_data.append((current_date, completion_rate))
            current_date += timedelta(days=1)

        return trend_data


class UserProductivityService:
    """
    Service class for calculating user productivity and activity metrics.

    Provides methods for analyzing user performance, task completion rates,
    collaboration metrics, and productivity trends.
    """

    def __init__(self, organization: Organization):
        """Initialize the service with an organization context."""
        self.organization = organization

    def get_user_productivity_metrics(self, limit: int = 10) -> List[Dict]:
        """
        Get comprehensive user productivity metrics.

        Args:
            limit: Maximum number of users to return

        Returns:
            List of dictionaries containing user productivity data
        """
        from django.contrib.auth import get_user_model

        User = get_user_model()

        # Get users with comprehensive metrics
        users = User.objects.filter(organization=self.organization).annotate(
            # Task-related metrics
            total_assigned_tasks=Count(
                "task",
                filter=Q(task__project__organization=self.organization),
                distinct=True,
            ),
            completed_assigned_tasks=Count(
                "task",
                filter=Q(
                    task__project__organization=self.organization, task__status="DONE"
                ),
                distinct=True,
            ),
            # Collaboration metrics
            comments_made=Count(
                "taskcomment",
                filter=Q(taskcomment__task__project__organization=self.organization),
                distinct=True,
            ),
            # Project involvement
            projects_involved=Count(
                "task__project",
                filter=Q(task__project__organization=self.organization),
                distinct=True,
            ),
        )

        # Calculate additional metrics for each user
        user_metrics = []
        for user in users[:limit]:
            # Calculate completion rate
            total_tasks = user.total_assigned_tasks
            completed_tasks = user.completed_assigned_tasks
            completion_rate = (
                (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0.0
            )

            # Calculate average task completion time
            user_completed_tasks = Task.objects.filter(
                project__organization=self.organization,
                assignee_email=user.email,
                status="DONE",
            ).exclude(updated_at__isnull=True)

            avg_completion_time = 0.0
            if user_completed_tasks.exists():
                total_hours = 0
                count = 0
                for task in user_completed_tasks:
                    if task.updated_at and task.created_at:
                        delta = task.updated_at - task.created_at
                        total_hours += delta.total_seconds() / 3600
                        count += 1
                avg_completion_time = total_hours / count if count > 0 else 0.0

            # Calculate recent activity (last 7 days)
            week_ago = timezone.now() - timedelta(days=7)
            recent_activity = (
                TaskComment.objects.filter(
                    author_email=user.email,
                    task__project__organization=self.organization,
                    created_at__gte=week_ago,
                ).count()
                + Task.objects.filter(
                    assignee_email=user.email,
                    project__organization=self.organization,
                    updated_at__gte=week_ago,
                ).count()
            )

            user_metrics.append(
                {
                    "user": user,
                    "total_assigned_tasks": total_tasks,
                    "completed_assigned_tasks": completed_tasks,
                    "completion_rate": completion_rate,
                    "comments_made": user.comments_made,
                    "projects_involved": user.projects_involved,
                    "average_completion_time_hours": avg_completion_time,
                    "recent_activity_count": recent_activity,
                }
            )

        # Sort by overall productivity score
        user_metrics.sort(
            key=lambda x: (
                x["completion_rate"] * 0.4
                + x["recent_activity_count"] * 0.3
                + min(x["total_assigned_tasks"] / 10, 1) * 20
                + min(x["comments_made"] / 5, 1) * 10
            ),
            reverse=True,
        )

        return user_metrics

    def get_collaboration_metrics(self) -> Dict:
        """
        Get organization-wide collaboration metrics.

        Returns:
            Dictionary containing collaboration statistics
        """
        # Comment activity
        total_comments = TaskComment.objects.filter(
            task__project__organization=self.organization
        ).count()

        # Recent collaboration (last 7 days)
        week_ago = timezone.now() - timedelta(days=7)
        recent_comments = TaskComment.objects.filter(
            task__project__organization=self.organization, created_at__gte=week_ago
        ).count()

        # Task assignment distribution
        tasks_with_assignees = (
            Task.objects.filter(project__organization=self.organization)
            .exclude(assignee_email="")
            .count()
        )

        total_tasks = Task.objects.filter(
            project__organization=self.organization
        ).count()

        assignment_rate = (
            (tasks_with_assignees / total_tasks * 100) if total_tasks > 0 else 0.0
        )

        # Average comments per task
        avg_comments_per_task = total_comments / total_tasks if total_tasks > 0 else 0.0

        return {
            "total_comments": total_comments,
            "recent_comments": recent_comments,
            "task_assignment_rate": assignment_rate,
            "average_comments_per_task": avg_comments_per_task,
            "collaboration_trend": (
                "increasing" if recent_comments > total_comments / 52 else "stable"
            ),
        }


class OrganizationAnalyticsService:
    """
    Service class for comprehensive organization-wide analytics.

    Combines data from projects, tasks, and users to provide high-level
    insights and business intelligence for organizational decision-making.
    """

    def __init__(self, organization: Organization):
        """Initialize the service with an organization context."""
        self.organization = organization
        self.project_service = ProjectStatisticsService(organization)
        self.task_service = TaskStatisticsService(organization)
        self.user_service = UserProductivityService(organization)

    def get_comprehensive_analytics(self) -> Dict:
        """
        Get comprehensive organization analytics.

        Returns:
            Dictionary containing all major analytics categories
        """
        return {
            "project_statistics": self.project_service.get_basic_project_stats(),
            "task_statistics": self.task_service.get_basic_task_stats(),
            "user_productivity": self.user_service.get_user_productivity_metrics(5),
            "collaboration_metrics": self.user_service.get_collaboration_metrics(),
            "recent_activity_summary": self.get_recent_activity_summary(),
            "performance_indicators": self.get_key_performance_indicators(),
        }

    def get_recent_activity_summary(self, days: int = 7) -> Dict:
        """
        Get summary of recent activity across the organization.

        Args:
            days: Number of days to look back

        Returns:
            Dictionary containing recent activity metrics
        """
        cutoff_date = timezone.now() - timedelta(days=days)

        recent_projects = Project.objects.filter(
            organization=self.organization, created_at__gte=cutoff_date
        ).count()

        recent_tasks = Task.objects.filter(
            project__organization=self.organization, created_at__gte=cutoff_date
        ).count()

        recent_comments = TaskComment.objects.filter(
            task__project__organization=self.organization, created_at__gte=cutoff_date
        ).count()

        tasks_completed = Task.objects.filter(
            project__organization=self.organization,
            status="DONE",
            updated_at__gte=cutoff_date,
        ).count()

        return {
            "period_days": days,
            "new_projects": recent_projects,
            "new_tasks": recent_tasks,
            "tasks_completed": tasks_completed,
            "comments_added": recent_comments,
            "total_activity": recent_projects
            + recent_tasks
            + recent_comments
            + tasks_completed,
        }

    def get_key_performance_indicators(self) -> Dict:
        """
        Calculate key performance indicators (KPIs) for the organization.

        Returns:
            Dictionary containing important KPIs and their trends
        """
        # Overall completion rates
        project_completion_rate = self.project_service.get_basic_project_stats()[
            "completion_rate"
        ]
        task_completion_rate = self.task_service.get_basic_task_stats()[
            "completion_rate"
        ]

        # Efficiency metrics
        avg_task_completion_time = self.task_service.calculate_average_completion_time()

        # Quality metrics
        overdue_project_ratio = (
            self.project_service.get_overdue_projects_count()
            / max(Project.objects.filter(organization=self.organization).count(), 1)
        ) * 100

        overdue_task_ratio = (
            self.task_service.get_overdue_tasks_count()
            / max(
                Task.objects.filter(project__organization=self.organization).count(), 1
            )
        ) * 100

        # Team metrics
        from django.contrib.auth import get_user_model

        User = get_user_model()

        active_users = User.objects.filter(
            organization=self.organization, is_active=True
        ).count()

        # Productivity score (composite metric)
        productivity_score = (
            project_completion_rate * 0.3
            + task_completion_rate * 0.4
            + max(0, 100 - overdue_task_ratio) * 0.2
            + min(active_users / 10, 1) * 10  # Team size factor
        )

        return {
            "project_completion_rate": project_completion_rate,
            "task_completion_rate": task_completion_rate,
            "average_task_completion_hours": avg_task_completion_time,
            "overdue_project_percentage": overdue_project_ratio,
            "overdue_task_percentage": overdue_task_ratio,
            "active_team_members": active_users,
            "overall_productivity_score": min(100.0, productivity_score),
        }
