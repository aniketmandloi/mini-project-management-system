"""
Authentication decorators for resolvers.

This module provides authentication decorators that can be used
with GraphQL resolvers to ensure proper authentication and authorization.
"""

from functools import wraps
from graphql import GraphQLError
from django.contrib.auth import get_user_model

User = get_user_model()


def login_required(func):
    """
    Decorator to require user authentication for resolvers.

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

        user = getattr(info.context, "user", None)
        if not user or not user.is_authenticated:
            raise GraphQLError("Authentication required")

        return func(*args, **kwargs)

    return wrapper


def organization_required(func):
    """
    Decorator to require organization membership for resolvers.

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

        user = getattr(info.context, "user", None)
        if not user or not user.is_authenticated:
            raise GraphQLError("Authentication required")

        organization = getattr(info.context, "organization", None)
        if not organization:
            raise GraphQLError("Organization context required")

        if not user.organization or user.organization.id != organization.id:
            raise GraphQLError("Organization membership required")

        return func(*args, **kwargs)

    return wrapper


def admin_required(func):
    """
    Decorator to require admin privileges for resolvers.

    Args:
        func: The resolver function to decorate

    Returns:
        Decorated function that checks admin privileges
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

        user = getattr(info.context, "user", None)
        if not user or not user.is_authenticated:
            raise GraphQLError("Authentication required")

        if not user.is_organization_admin:
            raise GraphQLError("Admin privileges required")

        return func(*args, **kwargs)

    return wrapper


def superuser_required(func):
    """
    Decorator to require superuser privileges for resolvers.

    Args:
        func: The resolver function to decorate

    Returns:
        Decorated function that checks superuser privileges
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

        user = getattr(info.context, "user", None)
        if not user or not user.is_authenticated:
            raise GraphQLError("Authentication required")

        if not user.is_superuser:
            raise GraphQLError("Superuser privileges required")

        return func(*args, **kwargs)

    return wrapper
