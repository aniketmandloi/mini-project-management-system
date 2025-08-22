"""
Permission classes for multi-tenant access control.

This module provides permission decorators and functions to ensure
proper access control in the multi-tenant project management system.
"""

from functools import wraps
from graphql import GraphQLError
from django.contrib.auth import get_user_model
from core.models import Organization, Project, Task, TaskComment
from .middleware import get_organization_from_context, get_user_from_context

User = get_user_model()


def require_authentication(func):
    """
    Decorator to require user authentication for GraphQL resolvers.

    Args:
        func: The resolver function to decorate

    Returns:
        Decorated function that checks authentication
    """

    @wraps(func)
    def wrapper(*args, **kwargs):
        # Get info from args (standard GraphQL resolver signature)
        info = None
        for arg in args:
            if hasattr(arg, "context"):
                info = arg
                break

        if not info:
            raise GraphQLError("Internal error: Could not access request context")

        try:
            user = get_user_from_context(info)
            if not user.is_authenticated:
                raise GraphQLError("Authentication required")
        except GraphQLError:
            raise
        except Exception:
            raise GraphQLError("Authentication required")

        return func(*args, **kwargs)

    return wrapper


def require_organization_member(func):
    """
    Decorator to require organization membership for GraphQL resolvers.

    Args:
        func: The resolver function to decorate

    Returns:
        Decorated function that checks organization membership
    """

    @wraps(func)
    def wrapper(*args, **kwargs):
        # Get info from args
        info = None
        for arg in args:
            if hasattr(arg, "context"):
                info = arg
                break

        if not info:
            raise GraphQLError("Internal error: Could not access request context")

        try:
            user = get_user_from_context(info)
            organization = get_organization_from_context(info)

            if not user.organization or user.organization.id != organization.id:
                raise GraphQLError("Organization membership required")

        except GraphQLError:
            raise
        except Exception:
            raise GraphQLError("Permission denied")

        return func(*args, **kwargs)

    return wrapper


def require_organization_admin(func):
    """
    Decorator to require organization admin privileges for GraphQL resolvers.

    Args:
        func: The resolver function to decorate

    Returns:
        Decorated function that checks organization admin privileges
    """

    @wraps(func)
    def wrapper(*args, **kwargs):
        # Get info from args
        info = None
        for arg in args:
            if hasattr(arg, "context"):
                info = arg
                break

        if not info:
            raise GraphQLError("Internal error: Could not access request context")

        try:
            user = get_user_from_context(info)
            organization = get_organization_from_context(info)

            if not user.organization or user.organization.id != organization.id:
                raise GraphQLError("Organization membership required")

            if not user.is_organization_admin and not user.is_superuser:
                raise GraphQLError("Organization admin privileges required")

        except GraphQLError:
            raise
        except Exception:
            raise GraphQLError("Permission denied")

        return func(*args, **kwargs)

    return wrapper


def can_view_organization(user, organization):
    """
    Check if user can view an organization.

    Args:
        user: User instance
        organization: Organization instance

    Returns:
        Boolean indicating if user can view the organization
    """
    if not user.is_authenticated:
        return False

    # Superusers can view any organization
    if user.is_superuser:
        return True

    # Users can view their own organization
    if user.organization and user.organization.id == organization.id:
        return True

    return False


def can_edit_organization(user, organization):
    """
    Check if user can edit an organization.

    Args:
        user: User instance
        organization: Organization instance

    Returns:
        Boolean indicating if user can edit the organization
    """
    if not user.is_authenticated:
        return False

    # Superusers can edit any organization
    if user.is_superuser:
        return True

    # Organization admins can edit their organization
    if (
        user.organization
        and user.organization.id == organization.id
        and user.is_organization_admin
    ):
        return True

    return False


def can_view_project(user, project):
    """
    Check if user can view a project.

    Args:
        user: User instance
        project: Project instance

    Returns:
        Boolean indicating if user can view the project
    """
    if not user.is_authenticated:
        return False

    # Check organization access first
    if not can_view_organization(user, project.organization):
        return False

    # All organization members can view projects
    return True


def can_edit_project(user, project):
    """
    Check if user can edit a project.

    Args:
        user: User instance
        project: Project instance

    Returns:
        Boolean indicating if user can edit the project
    """
    if not user.is_authenticated:
        return False

    # Check organization access first
    if not can_view_organization(user, project.organization):
        return False

    # Superusers can edit any project
    if user.is_superuser:
        return True

    # Organization admins can edit any project in their organization
    if user.is_organization_admin:
        return True

    # In the future, we might add project-specific roles
    # For now, all organization members can edit projects
    return True


def can_delete_project(user, project):
    """
    Check if user can delete a project.

    Args:
        user: User instance
        project: Project instance

    Returns:
        Boolean indicating if user can delete the project
    """
    if not user.is_authenticated:
        return False

    # Check organization access first
    if not can_view_organization(user, project.organization):
        return False

    # Superusers can delete any project
    if user.is_superuser:
        return True

    # Organization admins can delete projects
    if user.is_organization_admin:
        return True

    # Regular users cannot delete projects (stricter than edit)
    return False


def can_view_task(user, task):
    """
    Check if user can view a task.

    Args:
        user: User instance
        task: Task instance

    Returns:
        Boolean indicating if user can view the task
    """
    if not user.is_authenticated:
        return False

    # Check project access first
    return can_view_project(user, task.project)


def can_edit_task(user, task):
    """
    Check if user can edit a task.

    Args:
        user: User instance
        task: Task instance

    Returns:
        Boolean indicating if user can edit the task
    """
    if not user.is_authenticated:
        return False

    # Check project access first
    if not can_view_project(user, task.project):
        return False

    # Superusers can edit any task
    if user.is_superuser:
        return True

    # Organization admins can edit any task in their organization
    if user.is_organization_admin:
        return True

    # Task assignees can edit their assigned tasks
    if task.assignee_email == user.email:
        return True

    # All organization members can edit tasks (collaborative approach)
    return True


def can_delete_task(user, task):
    """
    Check if user can delete a task.

    Args:
        user: User instance
        task: Task instance

    Returns:
        Boolean indicating if user can delete the task
    """
    if not user.is_authenticated:
        return False

    # Check project access first
    if not can_view_project(user, task.project):
        return False

    # Superusers can delete any task
    if user.is_superuser:
        return True

    # Organization admins can delete tasks
    if user.is_organization_admin:
        return True

    # Task assignees can delete their assigned tasks
    if task.assignee_email == user.email:
        return True

    # Regular users can delete tasks (collaborative approach)
    return True


def can_view_comment(user, comment):
    """
    Check if user can view a task comment.

    Args:
        user: User instance
        comment: TaskComment instance

    Returns:
        Boolean indicating if user can view the comment
    """
    if not user.is_authenticated:
        return False

    # Check task access first
    return can_view_task(user, comment.task)


def can_edit_comment(user, comment):
    """
    Check if user can edit a task comment.

    Args:
        user: User instance
        comment: TaskComment instance

    Returns:
        Boolean indicating if user can edit the comment
    """
    if not user.is_authenticated:
        return False

    # Check task access first
    if not can_view_task(user, comment.task):
        return False

    # Superusers can edit any comment
    if user.is_superuser:
        return True

    # Organization admins can edit any comment in their organization
    if user.is_organization_admin:
        return True

    # Comment authors can edit their own comments
    if comment.author_email == user.email:
        return True

    return False


def can_delete_comment(user, comment):
    """
    Check if user can delete a task comment.

    Args:
        user: User instance
        comment: TaskComment instance

    Returns:
        Boolean indicating if user can delete the comment
    """
    if not user.is_authenticated:
        return False

    # Check task access first
    if not can_view_task(user, comment.task):
        return False

    # Superusers can delete any comment
    if user.is_superuser:
        return True

    # Organization admins can delete any comment in their organization
    if user.is_organization_admin:
        return True

    # Comment authors can delete their own comments
    if comment.author_email == user.email:
        return True

    return False


def filter_queryset_by_permissions(queryset, user, permission_type="view"):
    """
    Filter a queryset based on user permissions.

    Args:
        queryset: Django queryset to filter
        user: User instance
        permission_type: Type of permission ('view', 'edit', 'delete')

    Returns:
        Filtered queryset
    """
    if not user.is_authenticated:
        return queryset.none()

    # Superusers can access everything
    if user.is_superuser:
        return queryset

    # Filter by user's organization
    model = queryset.model

    if model == Organization:
        # Users can only access their own organization
        if user.organization:
            return queryset.filter(id=user.organization.id)
        return queryset.none()

    elif model == Project:
        # Users can access projects in their organization
        if user.organization:
            return queryset.filter(organization=user.organization)
        return queryset.none()

    elif model == Task:
        # Users can access tasks in their organization's projects
        if user.organization:
            return queryset.filter(project__organization=user.organization)
        return queryset.none()

    elif model == TaskComment:
        # Users can access comments on tasks in their organization
        if user.organization:
            return queryset.filter(task__project__organization=user.organization)
        return queryset.none()

    # Default: return empty queryset for unknown models
    return queryset.none()


def get_user_permissions_summary(user):
    """
    Get a summary of user permissions for debugging/admin purposes.

    Args:
        user: User instance

    Returns:
        Dictionary with permission information
    """
    if not user.is_authenticated:
        return {"authenticated": False, "permissions": {}}

    permissions = {
        "authenticated": True,
        "is_superuser": user.is_superuser,
        "organization": {
            "id": user.organization.id if user.organization else None,
            "name": user.organization.name if user.organization else None,
            "is_admin": user.is_organization_admin,
        },
        "can_create_organization": not user.organization,  # Only users without org can create
        "can_edit_organization": user.is_organization_admin or user.is_superuser,
        "can_manage_projects": True if user.organization else False,
        "can_manage_tasks": True if user.organization else False,
        "can_comment": True if user.organization else False,
    }

    return permissions
