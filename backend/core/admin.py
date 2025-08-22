"""
Django admin configuration for core models.

This module configures the Django admin interface for the core models,
providing a user-friendly interface for managing organizations, projects,
tasks, and comments.
"""

from django.contrib import admin
from django.utils.html import format_html
from .models import Organization, Project, Task, TaskComment


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    """
    Admin configuration for Organization model.

    Provides a comprehensive admin interface for managing organizations
    with search, filtering, and display customization.
    """

    list_display = ["name", "slug", "contact_email", "is_active", "created_at"]
    list_filter = ["is_active", "created_at"]
    search_fields = ["name", "slug", "contact_email"]
    prepopulated_fields = {"slug": ("name",)}
    readonly_fields = ["created_at", "updated_at"]

    fieldsets = (
        (
            "Basic Information",
            {"fields": ("name", "slug", "contact_email", "description")},
        ),
        ("Status", {"fields": ("is_active",)}),
        (
            "Timestamps",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    """
    Admin configuration for Project model.

    Provides project management capabilities with organization filtering,
    status tracking, and task statistics.
    """

    list_display = [
        "name",
        "organization",
        "status",
        "task_count_display",
        "completion_rate_display",
        "due_date",
        "created_at",
    ]
    list_filter = ["status", "organization", "created_at", "due_date"]
    search_fields = ["name", "description", "organization__name"]
    readonly_fields = [
        "created_at",
        "updated_at",
        "task_count_display",
        "completion_rate_display",
    ]

    fieldsets = (
        ("Basic Information", {"fields": ("organization", "name", "description")}),
        ("Project Details", {"fields": ("status", "due_date")}),
        (
            "Statistics",
            {
                "fields": ("task_count_display", "completion_rate_display"),
                "classes": ("collapse",),
            },
        ),
        (
            "Timestamps",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    def task_count_display(self, obj):
        """Display the total number of tasks in the project."""
        return obj.task_count

    task_count_display.short_description = "Total Tasks"

    def completion_rate_display(self, obj):
        """Display the completion rate as a formatted percentage."""
        rate = obj.completion_rate
        color = "green" if rate >= 75 else "orange" if rate >= 50 else "red"
        return format_html('<span style="color: {};">{:.1f}%</span>', color, rate)

    completion_rate_display.short_description = "Completion Rate"


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    """
    Admin configuration for Task model.

    Provides task management with project filtering, status tracking,
    and assignee management.
    """

    list_display = [
        "title",
        "project",
        "status",
        "assignee_email",
        "due_date",
        "is_overdue_display",
        "created_at",
    ]
    list_filter = [
        "status",
        "project__organization",
        "project",
        "created_at",
        "due_date",
    ]
    search_fields = [
        "title",
        "description",
        "assignee_email",
        "project__name",
        "project__organization__name",
    ]
    readonly_fields = ["created_at", "updated_at", "is_overdue_display"]

    fieldsets = (
        ("Basic Information", {"fields": ("project", "title", "description")}),
        ("Assignment & Status", {"fields": ("status", "assignee_email", "due_date")}),
        (
            "Status Information",
            {"fields": ("is_overdue_display",), "classes": ("collapse",)},
        ),
        (
            "Timestamps",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    def is_overdue_display(self, obj):
        """Display whether the task is overdue with color coding."""
        if obj.is_overdue:
            return format_html('<span style="color: red;">Yes</span>')
        elif obj.due_date and obj.status != "DONE":
            return format_html('<span style="color: green;">No</span>')
        return format_html('<span style="color: gray;">N/A</span>')

    is_overdue_display.short_description = "Overdue"


@admin.register(TaskComment)
class TaskCommentAdmin(admin.ModelAdmin):
    """
    Admin configuration for TaskComment model.

    Provides comment management with task filtering and author tracking.
    """

    list_display = ["task", "author_email", "content_preview", "created_at"]
    list_filter = ["task__project__organization", "task__project", "task", "created_at"]
    search_fields = ["content", "author_email", "task__title", "task__project__name"]
    readonly_fields = ["created_at", "updated_at"]

    fieldsets = (
        ("Comment Information", {"fields": ("task", "author_email", "content")}),
        (
            "Timestamps",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    def content_preview(self, obj):
        """Display a truncated preview of the comment content."""
        if len(obj.content) > 50:
            return obj.content[:47] + "..."
        return obj.content

    content_preview.short_description = "Content Preview"
