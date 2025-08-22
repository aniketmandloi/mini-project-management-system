"""
Utility functions for business logic.

This module provides common utility functions used across the project
management system for data processing, calculations, and business operations.
"""

import re
import secrets
import string
from datetime import datetime, timedelta
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from core.models import Organization, Project, Task, TaskComment


def generate_slug(text, max_length=50):
    """
    Generate a URL-friendly slug from text.

    Args:
        text: Text to convert to slug
        max_length: Maximum length of the slug

    Returns:
        URL-friendly slug string
    """
    # Convert to lowercase and replace spaces with hyphens
    slug = text.lower().strip()

    # Remove or replace special characters
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[-\s]+", "-", slug)

    # Remove leading/trailing hyphens
    slug = slug.strip("-")

    # Truncate to max length
    if len(slug) > max_length:
        slug = slug[:max_length].rstrip("-")

    return slug


def generate_unique_slug(text, model_class, max_length=50, organization=None):
    """
    Generate a unique slug for a model instance.

    Args:
        text: Text to convert to slug
        model_class: Django model class
        max_length: Maximum length of the slug
        organization: Organization context for uniqueness check

    Returns:
        Unique slug string
    """
    base_slug = generate_slug(text, max_length - 10)  # Reserve space for suffix
    slug = base_slug
    counter = 1

    while True:
        # Check if slug exists
        queryset = model_class.objects.filter(slug=slug)
        if organization and hasattr(model_class, "organization"):
            queryset = queryset.filter(organization=organization)

        if not queryset.exists():
            return slug

        # Generate next variation
        suffix = f"-{counter}"
        if len(base_slug) + len(suffix) <= max_length:
            slug = f"{base_slug}{suffix}"
        else:
            # Truncate base slug to make room for suffix
            truncated_base = base_slug[: max_length - len(suffix)]
            slug = f"{truncated_base}{suffix}"

        counter += 1

        # Prevent infinite loops
        if counter > 1000:
            # Use random suffix as fallback
            random_suffix = "".join(
                secrets.choice(string.ascii_lowercase + string.digits) for _ in range(6)
            )
            slug = f"{base_slug[:max_length-7]}-{random_suffix}"
            break

    return slug


def calculate_project_completion_rate(project):
    """
    Calculate completion rate for a project.

    Args:
        project: Project instance

    Returns:
        Completion rate as a percentage (0-100)
    """
    total_tasks = project.tasks.count()
    if total_tasks == 0:
        return 0.0

    completed_tasks = project.tasks.filter(status="DONE").count()
    return (completed_tasks / total_tasks) * 100


def calculate_project_statistics(project):
    """
    Calculate comprehensive statistics for a project.

    Args:
        project: Project instance

    Returns:
        Dictionary with project statistics
    """
    tasks = project.tasks.all()
    total_tasks = tasks.count()

    if total_tasks == 0:
        return {
            "total_tasks": 0,
            "completed_tasks": 0,
            "in_progress_tasks": 0,
            "todo_tasks": 0,
            "completion_rate": 0.0,
            "overdue_tasks": 0,
            "average_completion_time": 0.0,
            "days_since_last_activity": None,
        }

    completed_tasks = tasks.filter(status="DONE").count()
    in_progress_tasks = tasks.filter(status="IN_PROGRESS").count()
    todo_tasks = tasks.filter(status="TODO").count()

    # Calculate overdue tasks
    now = timezone.now()
    overdue_tasks = tasks.filter(
        due_date__lt=now, status__in=["TODO", "IN_PROGRESS"]
    ).count()

    # Calculate average completion time
    completed_task_objects = tasks.filter(status="DONE")
    total_completion_time = 0
    completion_count = 0

    for task in completed_task_objects:
        if task.updated_at and task.created_at:
            completion_time = task.updated_at - task.created_at
            total_completion_time += completion_time.total_seconds()
            completion_count += 1

    average_completion_time = (
        total_completion_time / completion_count / 3600  # Convert to hours
        if completion_count > 0
        else 0.0
    )

    # Calculate days since last activity
    last_activity = None
    for task in tasks.order_by("-updated_at"):
        if task.updated_at:
            last_activity = task.updated_at
            break

    days_since_last_activity = None
    if last_activity:
        days_since_last_activity = (now - last_activity).days

    return {
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "in_progress_tasks": in_progress_tasks,
        "todo_tasks": todo_tasks,
        "completion_rate": (completed_tasks / total_tasks) * 100,
        "overdue_tasks": overdue_tasks,
        "average_completion_time": average_completion_time,
        "days_since_last_activity": days_since_last_activity,
    }


def calculate_organization_statistics(organization):
    """
    Calculate comprehensive statistics for an organization.

    Args:
        organization: Organization instance

    Returns:
        Dictionary with organization statistics
    """
    projects = Project.objects.filter(organization=organization)
    tasks = Task.objects.filter(project__organization=organization)

    # Project statistics
    total_projects = projects.count()
    active_projects = projects.filter(status="ACTIVE").count()
    completed_projects = projects.filter(status="COMPLETED").count()
    on_hold_projects = projects.filter(status="ON_HOLD").count()
    cancelled_projects = projects.filter(status="CANCELLED").count()

    # Calculate overdue projects
    now = timezone.now()
    overdue_projects = projects.filter(
        due_date__lt=now.date(), status__in=["ACTIVE", "ON_HOLD"]
    ).count()

    # Task statistics
    total_tasks = tasks.count()
    completed_tasks = tasks.filter(status="DONE").count()
    in_progress_tasks = tasks.filter(status="IN_PROGRESS").count()
    todo_tasks = tasks.filter(status="TODO").count()

    # Calculate overdue tasks
    overdue_tasks = tasks.filter(
        due_date__lt=now, status__in=["TODO", "IN_PROGRESS"]
    ).count()

    # User statistics
    users = organization.users.all()
    total_users = users.count()
    active_users = users.filter(is_active=True).count()
    admin_users = users.filter(is_organization_admin=True).count()

    return {
        "projects": {
            "total": total_projects,
            "active": active_projects,
            "completed": completed_projects,
            "on_hold": on_hold_projects,
            "cancelled": cancelled_projects,
            "overdue": overdue_projects,
            "completion_rate": (
                (completed_projects / total_projects * 100) if total_projects > 0 else 0
            ),
        },
        "tasks": {
            "total": total_tasks,
            "completed": completed_tasks,
            "in_progress": in_progress_tasks,
            "todo": todo_tasks,
            "overdue": overdue_tasks,
            "completion_rate": (
                (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
            ),
        },
        "users": {
            "total": total_users,
            "active": active_users,
            "admins": admin_users,
        },
    }


def get_recent_activity(organization, days=7, limit=50):
    """
    Get recent activity for an organization.

    Args:
        organization: Organization instance
        days: Number of days to look back
        limit: Maximum number of activities to return

    Returns:
        List of recent activity items
    """
    cutoff_date = timezone.now() - timedelta(days=days)
    activities = []

    # Recent projects
    recent_projects = Project.objects.filter(
        organization=organization, created_at__gte=cutoff_date
    ).order_by("-created_at")[: limit // 3]

    for project in recent_projects:
        activities.append(
            {
                "type": "project_created",
                "timestamp": project.created_at,
                "description": f"Project '{project.name}' was created",
                "object_id": project.id,
                "object_type": "project",
            }
        )

    # Recent tasks
    recent_tasks = Task.objects.filter(
        project__organization=organization, created_at__gte=cutoff_date
    ).order_by("-created_at")[: limit // 3]

    for task in recent_tasks:
        activities.append(
            {
                "type": "task_created",
                "timestamp": task.created_at,
                "description": f"Task '{task.title}' was created in project '{task.project.name}'",
                "object_id": task.id,
                "object_type": "task",
            }
        )

    # Recent comments
    recent_comments = TaskComment.objects.filter(
        task__project__organization=organization, created_at__gte=cutoff_date
    ).order_by("-created_at")[: limit // 3]

    for comment in recent_comments:
        activities.append(
            {
                "type": "comment_added",
                "timestamp": comment.created_at,
                "description": f"Comment added to task '{comment.task.title}'",
                "object_id": comment.id,
                "object_type": "comment",
                "author_email": comment.author_email,
            }
        )

    # Sort all activities by timestamp
    activities.sort(key=lambda x: x["timestamp"], reverse=True)

    return activities[:limit]


def send_notification_email(recipient_email, subject, template_name, context):
    """
    Send a notification email to a user.

    Args:
        recipient_email: Email address to send to
        subject: Email subject
        template_name: Email template name (without .html extension)
        context: Template context dictionary

    Returns:
        Boolean indicating if email was sent successfully
    """
    try:
        html_message = render_to_string(f"emails/{template_name}.html", context)
        plain_message = strip_tags(html_message)

        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient_email],
            html_message=html_message,
            fail_silently=False,
        )
        return True
    except Exception as e:
        # Log the error (in a real application, use proper logging)
        print(f"Failed to send email to {recipient_email}: {str(e)}")
        return False


def sanitize_html_content(content):
    """
    Sanitize HTML content to prevent XSS attacks.

    Args:
        content: HTML content to sanitize

    Returns:
        Sanitized HTML content
    """
    # This is a simple implementation
    # In production, use a library like bleach for comprehensive HTML sanitization

    # Remove script tags
    content = re.sub(
        r"<script[^>]*?>.*?</script>", "", content, flags=re.IGNORECASE | re.DOTALL
    )

    # Remove javascript: URLs
    content = re.sub(r"javascript:", "", content, flags=re.IGNORECASE)

    # Remove on* event handlers
    content = re.sub(r'on\w+\s*=\s*["\'][^"\']*["\']', "", content, flags=re.IGNORECASE)

    return content


def format_duration(seconds):
    """
    Format duration in seconds to a human-readable string.

    Args:
        seconds: Duration in seconds

    Returns:
        Formatted duration string
    """
    if seconds < 60:
        return f"{int(seconds)} seconds"
    elif seconds < 3600:
        minutes = int(seconds // 60)
        return f"{minutes} minute{'s' if minutes != 1 else ''}"
    elif seconds < 86400:
        hours = int(seconds // 3600)
        return f"{hours} hour{'s' if hours != 1 else ''}"
    else:
        days = int(seconds // 86400)
        return f"{days} day{'s' if days != 1 else ''}"


def validate_file_upload(file, allowed_types=None, max_size=None):
    """
    Validate an uploaded file.

    Args:
        file: Uploaded file object
        allowed_types: List of allowed MIME types
        max_size: Maximum file size in bytes

    Returns:
        Dictionary with validation result and errors
    """
    errors = []

    if not file:
        errors.append("No file provided")
        return {"valid": False, "errors": errors}

    # Check file size
    if max_size and file.size > max_size:
        max_mb = max_size / (1024 * 1024)
        errors.append(f"File size exceeds {max_mb:.1f}MB limit")

    # Check file type
    if allowed_types and file.content_type not in allowed_types:
        errors.append(f"File type '{file.content_type}' not allowed")

    # Check file name
    if not file.name or len(file.name) > 255:
        errors.append("Invalid file name")

    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "file_info": {
            "name": file.name,
            "size": file.size,
            "content_type": file.content_type,
        },
    }


def generate_api_key(length=32):
    """
    Generate a secure API key.

    Args:
        length: Length of the API key

    Returns:
        Generated API key string
    """
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


def mask_email(email):
    """
    Mask an email address for privacy.

    Args:
        email: Email address to mask

    Returns:
        Masked email address
    """
    if "@" not in email:
        return email

    local, domain = email.split("@", 1)

    if len(local) <= 2:
        masked_local = local[0] + "*"
    else:
        masked_local = local[0] + "*" * (len(local) - 2) + local[-1]

    return f"{masked_local}@{domain}"
