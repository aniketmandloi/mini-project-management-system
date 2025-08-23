"""
Input validation for GraphQL mutations.

This module provides validation functions for all mutation inputs,
ensuring data integrity and business rule compliance.
"""

import re
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import (
    validate_password as django_validate_password,
)
from core.models import Organization, Project, Task

User = get_user_model()


def validate_organization_input(input_data, existing_organization=None):
    """
    Validate organization input data.

    Args:
        input_data: Organization input data
        existing_organization: Existing organization for updates (optional)

    Returns:
        List of error messages (empty if valid)
    """
    errors = []

    # Validate name
    if not input_data.get("name") or not input_data["name"].strip():
        errors.append("Organization name is required")
    elif len(input_data["name"].strip()) < 2:
        errors.append("Organization name must be at least 2 characters long")
    elif len(input_data["name"].strip()) > 100:
        errors.append("Organization name cannot exceed 100 characters")

    # Validate slug
    slug = input_data.get("slug", "").strip().lower()
    if not slug:
        errors.append("Organization slug is required")
    elif len(slug) < 2:
        errors.append("Organization slug must be at least 2 characters long")
    elif len(slug) > 50:
        errors.append("Organization slug cannot exceed 50 characters")
    elif not re.match(r"^[a-z0-9-]+$", slug):
        errors.append(
            "Organization slug can only contain lowercase letters, numbers, and hyphens"
        )
    elif slug.startswith("-") or slug.endswith("-"):
        errors.append("Organization slug cannot start or end with a hyphen")
    elif "--" in slug:
        errors.append("Organization slug cannot contain consecutive hyphens")

    # Reserved slugs
    reserved_slugs = [
        "admin",
        "api",
        "www",
        "mail",
        "ftp",
        "localhost",
        "app",
        "web",
        "blog",
        "news",
        "support",
        "help",
        "docs",
        "status",
    ]
    if slug in reserved_slugs:
        errors.append(f"The slug '{slug}' is reserved and cannot be used")

    # Validate contact email
    contact_email = input_data.get("contact_email", "").strip()
    if not contact_email:
        errors.append("Contact email is required")
    else:
        try:
            validate_email(contact_email)
        except ValidationError:
            errors.append("Invalid contact email format")

    # Validate description length
    description = input_data.get("description", "")
    if description and len(description) > 1000:
        errors.append("Organization description cannot exceed 1000 characters")

    return errors


def validate_project_input(input_data, existing_project=None):
    """
    Validate project input data.

    Args:
        input_data: Project input data
        existing_project: Existing project for updates (optional)

    Returns:
        List of error messages (empty if valid)
    """
    errors = []

    # Validate name
    if not input_data.get("name") or not input_data["name"].strip():
        errors.append("Project name is required")
    elif len(input_data["name"].strip()) < 2:
        errors.append("Project name must be at least 2 characters long")
    elif len(input_data["name"].strip()) > 200:
        errors.append("Project name cannot exceed 200 characters")

    # Validate description length
    description = input_data.get("description", "")
    if description and len(description) > 2000:
        errors.append("Project description cannot exceed 2000 characters")

    # Validate status
    valid_statuses = ["PLANNING", "ACTIVE", "COMPLETED", "ON_HOLD", "CANCELLED"]
    status = input_data.get("status")
    if status and status not in valid_statuses:
        errors.append(
            f"Invalid project status. Must be one of: {', '.join(valid_statuses)}"
        )

    # Validate due date
    due_date = input_data.get("dueDate")
    if due_date:
        from django.utils import timezone
        from datetime import date

        if isinstance(due_date, str):
            try:
                from datetime import datetime

                due_date = datetime.strptime(due_date, "%Y-%m-%d").date()
            except ValueError:
                errors.append("Invalid due date format. Use YYYY-MM-DD")
                return errors

        # Check if due date is not too far in the past (allow some flexibility for updates)
        if due_date < timezone.now().date() and not existing_project:
            errors.append("Project due date cannot be in the past")

    return errors


def validate_task_input(input_data, organization=None, existing_task=None):
    """
    Validate task input data.

    Args:
        input_data: Task input data
        organization: Organization context for validation
        existing_task: Existing task for updates (optional)

    Returns:
        List of error messages (empty if valid)
    """
    errors = []

    # Validate title
    if not input_data.get("title") or not input_data["title"].strip():
        errors.append("Task title is required")
    elif len(input_data["title"].strip()) < 2:
        errors.append("Task title must be at least 2 characters long")
    elif len(input_data["title"].strip()) > 200:
        errors.append("Task title cannot exceed 200 characters")

    # Validate description length
    description = input_data.get("description", "")
    if description and len(description) > 2000:
        errors.append("Task description cannot exceed 2000 characters")

    # Validate status
    valid_statuses = ["TODO", "IN_PROGRESS", "DONE"]
    status = input_data.get("status")
    if status and status not in valid_statuses:
        errors.append(
            f"Invalid task status. Must be one of: {', '.join(valid_statuses)}"
        )

    # Validate assignee email
    assignee_email = input_data.get("assignee_email", "").strip()
    if assignee_email:
        try:
            validate_email(assignee_email)

            # Check if assignee exists in the organization (optional validation)
            if organization:
                try:
                    User.objects.get(email=assignee_email, organization=organization)
                except User.DoesNotExist:
                    # This is a warning, not an error - external assignees are allowed
                    pass
        except ValidationError:
            errors.append("Invalid assignee email format")

    # Validate due date
    due_date = input_data.get("due_date")
    if due_date:
        from django.utils import timezone
        from datetime import datetime

        if isinstance(due_date, str):
            try:
                due_date = datetime.fromisoformat(due_date.replace("Z", "+00:00"))
            except ValueError:
                errors.append("Invalid due date format. Use ISO 8601 format")
                return errors

        # Check if due date is reasonable (not too far in the past)
        if due_date < timezone.now() and not existing_task:
            # Allow setting due dates up to 1 day in the past for flexibility
            from datetime import timedelta

            if due_date < timezone.now() - timedelta(days=1):
                errors.append("Task due date cannot be more than 1 day in the past")

    # Validate project_id is provided for new tasks
    if not existing_task and not input_data.get("project_id"):
        errors.append("Project ID is required for new tasks")

    return errors


def validate_comment_input(input_data, existing_comment=None):
    """
    Validate task comment input data.

    Args:
        input_data: Comment input data
        existing_comment: Existing comment for updates (optional)

    Returns:
        List of error messages (empty if valid)
    """
    errors = []

    # Validate content
    content = input_data.get("content", "").strip()
    if not content:
        errors.append("Comment content is required")
    elif len(content) < 1:
        errors.append("Comment content cannot be empty")
    elif len(content) > 2000:
        errors.append("Comment content cannot exceed 2000 characters")

    # Check for spam-like content (simple validation)
    if content:
        # Check for excessive repetition of characters
        if re.search(r"(.)\1{10,}", content):
            errors.append("Comment content appears to contain spam")

        # Check for excessive URLs (more than 3 URLs in a comment)
        url_pattern = r"http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+"
        urls = re.findall(url_pattern, content)
        if len(urls) > 3:
            errors.append("Comment contains too many URLs")

    # Validate task_id is provided for new comments
    if not existing_comment and not input_data.get("task_id"):
        errors.append("Task ID is required for new comments")

    return errors


def validate_email_domain(email):
    """
    Validate email domain against a list of allowed/blocked domains.

    Args:
        email: Email address to validate

    Returns:
        True if domain is allowed, False otherwise
    """
    # This is a placeholder for more sophisticated domain validation
    # In a real application, you might check against:
    # - Disposable email providers
    # - Company domain restrictions
    # - Blocked domain lists

    blocked_domains = [
        "10minutemail.com",
        "guerrillamail.com",
        "tempmail.org",
        "mailinator.com",
    ]

    domain = email.split("@")[1].lower() if "@" in email else ""
    return domain not in blocked_domains


def validate_slug_availability(slug, model_class, exclude_id=None):
    """
    Check if a slug is available for a given model.

    Args:
        slug: Slug to check
        model_class: Django model class to check against
        exclude_id: ID to exclude from the check (for updates)

    Returns:
        True if slug is available, False otherwise
    """
    queryset = model_class.objects.filter(slug=slug)
    if exclude_id:
        queryset = queryset.exclude(id=exclude_id)
    return not queryset.exists()


def validate_business_rules(
    input_data, model_type, organization=None, existing_instance=None
):
    """
    Validate business-specific rules for different model types.

    Args:
        input_data: Input data to validate
        model_type: Type of model ('organization', 'project', 'task', 'comment')
        organization: Organization context
        existing_instance: Existing instance for updates

    Returns:
        List of error messages (empty if valid)
    """
    errors = []

    if model_type == "project" and organization:
        # Check project limits for organization
        project_count = Project.objects.filter(organization=organization).count()
        if not existing_instance and project_count >= 100:  # Example limit
            errors.append(
                "Organization has reached the maximum number of projects (100)"
            )

        # Check for naming conflicts with completed projects
        name = input_data.get("name", "").strip()
        if name:
            existing_projects = Project.objects.filter(
                organization=organization, name__iexact=name, status="COMPLETED"
            )
            if existing_instance:
                existing_projects = existing_projects.exclude(id=existing_instance.id)

            if existing_projects.exists():
                errors.append(
                    f"A completed project with the name '{name}' already exists"
                )

    elif model_type == "task" and organization:
        # Check task limits per project
        project_id = input_data.get("project_id")
        if project_id:
            try:
                project = Project.objects.get(id=project_id, organization=organization)
                task_count = Task.objects.filter(project=project).count()
                if not existing_instance and task_count >= 1000:  # Example limit
                    errors.append(
                        "Project has reached the maximum number of tasks (1000)"
                    )
            except Project.DoesNotExist:
                errors.append("Invalid project ID")

    return errors


def validate_email_input(email):
    """
    Validate email address input.

    Args:
        email: Email address to validate

    Returns:
        Error message if invalid, None if valid
    """
    if not email or not email.strip():
        return "Email address is required"

    email = email.strip().lower()

    # Basic format validation
    try:
        validate_email(email)
    except ValidationError:
        return "Invalid email address format"

    # Check email length
    if len(email) > 254:
        return "Email address is too long"

    # Check domain validation
    if not validate_email_domain(email):
        return "Email domain is not allowed"

    return None


def validate_password(password):
    """
    Validate password strength.

    Args:
        password: Password to validate

    Returns:
        Error message if invalid, None if valid
    """
    if not password:
        return "Password is required"

    # Check minimum length
    if len(password) < 8:
        return "Password must be at least 8 characters long"

    # Check maximum length (for security)
    if len(password) > 128:
        return "Password is too long (maximum 128 characters)"

    # Use Django's built-in password validation
    try:
        django_validate_password(password)
    except ValidationError as e:
        return "; ".join(e.messages)

    # Additional custom validations
    if password.lower() in ["password", "123456789", "qwerty123", "admin123"]:
        return "Password is too common"

    # Check for at least one letter and one number
    if not re.search(r"[a-zA-Z]", password):
        return "Password must contain at least one letter"

    if not re.search(r"\d", password):
        return "Password must contain at least one number"

    return None
