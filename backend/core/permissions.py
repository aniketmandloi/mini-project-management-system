"""
Organization-based permission system for multi-tenant architecture.

This module provides comprehensive permission utilities and classes to ensure
proper access control across organizations, projects, tasks, and comments in
the multi-tenant project management system.
"""

from functools import wraps
from typing import Optional, Union
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from graphql import GraphQLError
from .models import Organization, Project, Task, TaskComment
from .context import GraphQLContext

User = get_user_model()


class PermissionDenied(Exception):
    """Custom exception for permission denied errors."""

    pass


class BasePermission:
    """
    Base permission class for organization-based permissions.

    All permission classes should inherit from this base class
    and implement the has_permission method.
    """

    def has_permission(self, user, organization=None, obj=None):
        """
        Check if user has permission.

        Args:
            user: User instance
            organization: Organization instance (optional)
            obj: Object to check permission for (optional)

        Returns:
            bool: True if permission granted, False otherwise
        """
        return False

    def get_error_message(self):
        """
        Get error message for permission denied.

        Returns:
            str: Error message
        """
        return "Permission denied"


class IsAuthenticated(BasePermission):
    """Permission class to check if user is authenticated."""

    def has_permission(self, user, organization=None, obj=None):
        """Check if user is authenticated."""
        return user and user.is_authenticated

    def get_error_message(self):
        """Get error message for authentication required."""
        return "Authentication required"


class IsOrganizationMember(BasePermission):
    """Permission class to check if user is a member of the organization."""

    def has_permission(self, user, organization=None, obj=None):
        """Check if user is a member of the organization."""
        if not user or not user.is_authenticated:
            return False

        if not organization:
            return False

        return (
            user.organization
            and user.organization.id == organization.id
            and organization.is_active
        )

    def get_error_message(self):
        """Get error message for organization membership required."""
        return "Organization membership required"


class IsOrganizationAdmin(BasePermission):
    """Permission class to check if user is an admin of the organization."""

    def has_permission(self, user, organization=None, obj=None):
        """Check if user is an admin of the organization."""
        if not IsOrganizationMember().has_permission(user, organization, obj):
            return False

        return user.is_organization_admin

    def get_error_message(self):
        """Get error message for organization admin required."""
        return "Organization admin privileges required"


class IsSuperUser(BasePermission):
    """Permission class to check if user is a superuser."""

    def has_permission(self, user, organization=None, obj=None):
        """Check if user is a superuser."""
        return user and user.is_authenticated and user.is_superuser

    def get_error_message(self):
        """Get error message for superuser required."""
        return "Superuser privileges required"


class CanAccessProject(BasePermission):
    """Permission class to check if user can access a specific project."""

    def has_permission(self, user, organization=None, obj=None):
        """Check if user can access the project."""
        if not isinstance(obj, Project):
            return False

        # Check if user is member of the project's organization
        return IsOrganizationMember().has_permission(user, obj.organization, obj)

    def get_error_message(self):
        """Get error message for project access denied."""
        return "Access denied to project"


class CanEditProject(BasePermission):
    """Permission class to check if user can edit a specific project."""

    def has_permission(self, user, organization=None, obj=None):
        """Check if user can edit the project."""
        if not CanAccessProject().has_permission(user, organization, obj):
            return False

        # Only organization admins can edit projects by default
        # This can be extended to include project-specific permissions
        return IsOrganizationAdmin().has_permission(user, obj.organization, obj)

    def get_error_message(self):
        """Get error message for project edit denied."""
        return "Permission denied to edit project"


class CanAccessTask(BasePermission):
    """Permission class to check if user can access a specific task."""

    def has_permission(self, user, organization=None, obj=None):
        """Check if user can access the task."""
        if not isinstance(obj, Task):
            return False

        # Check if user can access the task's project
        return CanAccessProject().has_permission(user, organization, obj.project)

    def get_error_message(self):
        """Get error message for task access denied."""
        return "Access denied to task"


class CanEditTask(BasePermission):
    """Permission class to check if user can edit a specific task."""

    def has_permission(self, user, organization=None, obj=None):
        """Check if user can edit the task."""
        if not CanAccessTask().has_permission(user, organization, obj):
            return False

        # Users can edit tasks if they are:
        # 1. Organization admin
        # 2. Task assignee (if assignee_email matches user email)
        if IsOrganizationAdmin().has_permission(user, obj.project.organization, obj):
            return True

        # Check if user is the assignee
        if obj.assignee_email and user.email == obj.assignee_email:
            return True

        return False

    def get_error_message(self):
        """Get error message for task edit denied."""
        return "Permission denied to edit task"


class CanAccessComment(BasePermission):
    """Permission class to check if user can access a specific comment."""

    def has_permission(self, user, organization=None, obj=None):
        """Check if user can access the comment."""
        if not isinstance(obj, TaskComment):
            return False

        # Check if user can access the comment's task
        return CanAccessTask().has_permission(user, organization, obj.task)

    def get_error_message(self):
        """Get error message for comment access denied."""
        return "Access denied to comment"


class CanEditComment(BasePermission):
    """Permission class to check if user can edit a specific comment."""

    def has_permission(self, user, organization=None, obj=None):
        """Check if user can edit the comment."""
        if not CanAccessComment().has_permission(user, organization, obj):
            return False

        # Users can edit comments if they are:
        # 1. Organization admin
        # 2. Comment author (if author_email matches user email)
        if IsOrganizationAdmin().has_permission(
            user, obj.task.project.organization, obj
        ):
            return True

        # Check if user is the comment author
        if obj.author_email and user.email == obj.author_email:
            return True

        return False

    def get_error_message(self):
        """Get error message for comment edit denied."""
        return "Permission denied to edit comment"


def check_permission(
    permission_class, user, organization=None, obj=None, raise_exception=True
):
    """
    Check permission using a permission class.

    Args:
        permission_class: Permission class instance or class
        user: User instance
        organization: Organization instance (optional)
        obj: Object to check permission for (optional)
        raise_exception: Whether to raise exception on failure

    Returns:
        bool: True if permission granted

    Raises:
        PermissionDenied: If permission denied and raise_exception is True
    """
    if not isinstance(permission_class, BasePermission):
        permission_class = permission_class()

    if permission_class.has_permission(user, organization, obj):
        return True

    if raise_exception:
        raise PermissionDenied(permission_class.get_error_message())

    return False


def require_permission(*permission_classes):
    """
    Decorator to require specific permissions for GraphQL resolvers.

    Args:
        permission_classes: Permission class instances or classes

    Returns:
        Decorated function
    """

    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Get GraphQL info from args
            info = None
            for arg in args:
                if hasattr(arg, "context"):
                    info = arg
                    break

            if not info:
                raise GraphQLError("Internal error: Could not access request context")

            # Get user and organization from context
            if isinstance(info.context, GraphQLContext):
                user = info.context.user
                organization = info.context.organization
            else:
                user = getattr(info.context, "user", AnonymousUser())
                organization = getattr(info.context, "organization", None)

            # Check all required permissions
            for permission_class in permission_classes:
                try:
                    check_permission(permission_class, user, organization)
                except PermissionDenied as e:
                    raise GraphQLError(str(e))

            return func(*args, **kwargs)

        return wrapper

    return decorator


def require_object_permission(permission_class, obj_param="id", obj_model=None):
    """
    Decorator to require object-specific permissions for GraphQL resolvers.

    Args:
        permission_class: Permission class for object access
        obj_param: Parameter name containing object ID
        obj_model: Model class to fetch object from

    Returns:
        Decorated function
    """

    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Get GraphQL info from args
            info = None
            for arg in args:
                if hasattr(arg, "context"):
                    info = arg
                    break

            if not info:
                raise GraphQLError("Internal error: Could not access request context")

            # Get user and organization from context
            if isinstance(info.context, GraphQLContext):
                user = info.context.user
                organization = info.context.organization
            else:
                user = getattr(info.context, "user", AnonymousUser())
                organization = getattr(info.context, "organization", None)

            # Get object ID from kwargs
            obj_id = kwargs.get(obj_param)
            if not obj_id:
                raise GraphQLError(f"Object ID parameter '{obj_param}' not found")

            # Fetch object
            try:
                if obj_model:
                    obj = obj_model.objects.get(id=obj_id)
                else:
                    raise GraphQLError("Object model not specified")
            except obj_model.DoesNotExist:
                raise GraphQLError(f"{obj_model.__name__} not found")

            # Check permission
            try:
                check_permission(permission_class, user, organization, obj)
            except PermissionDenied as e:
                raise GraphQLError(str(e))

            return func(*args, **kwargs)

        return wrapper

    return decorator


# Utility functions for common permission checks
def can_user_access_organization(user, organization):
    """Check if user can access the given organization."""
    return check_permission(
        IsOrganizationMember(), user, organization, raise_exception=False
    )


def can_user_edit_project(user, project):
    """Check if user can edit the given project."""
    return check_permission(CanEditProject(), user, obj=project, raise_exception=False)


def can_user_edit_task(user, task):
    """Check if user can edit the given task."""
    return check_permission(CanEditTask(), user, obj=task, raise_exception=False)


def can_user_edit_comment(user, comment):
    """Check if user can edit the given comment."""
    return check_permission(CanEditComment(), user, obj=comment, raise_exception=False)


def filter_queryset_by_organization(queryset, organization):
    """
    Filter queryset to only include objects accessible by the organization.

    Args:
        queryset: Django QuerySet
        organization: Organization instance

    Returns:
        Filtered QuerySet
    """
    model = queryset.model

    if model == Organization:
        return queryset.filter(id=organization.id, is_active=True)
    elif model == Project:
        return queryset.filter(organization=organization)
    elif model == Task:
        return queryset.filter(project__organization=organization)
    elif model == TaskComment:
        return queryset.filter(task__project__organization=organization)
    else:
        # For User model or other models, check if they have organization relationship
        if hasattr(model, "organization"):
            return queryset.filter(organization=organization)
        else:
            return queryset.none()  # Return empty queryset for unknown models


def get_user_organizations(user):
    """
    Get all organizations accessible by the user.

    Args:
        user: User instance

    Returns:
        QuerySet of Organization instances
    """
    if not user.is_authenticated:
        return Organization.objects.none()

    if user.is_superuser:
        return Organization.objects.filter(is_active=True)

    # Regular users can only access their own organization
    if user.organization:
        return Organization.objects.filter(id=user.organization.id, is_active=True)

    return Organization.objects.none()
