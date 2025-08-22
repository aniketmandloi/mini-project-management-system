"""
Enhanced organization context middleware for multi-tenant architecture.

This module provides comprehensive middleware to automatically inject organization
context into requests based on user authentication, request headers, and GraphQL
operations, ensuring proper data isolation across all application layers.
"""

from django.utils.deprecation import MiddlewareMixin
from django.http import JsonResponse
from django.contrib.auth.models import AnonymousUser
from rest_framework import status
from .context import GraphQLContext
import logging

logger = logging.getLogger(__name__)


class OrganizationMiddleware(MiddlewareMixin):
    """
    Enhanced middleware to inject organization context into requests.

    This middleware ensures that all requests are scoped to the appropriate
    organization based on the authenticated user and request headers, with
    special handling for GraphQL operations.
    """

    def process_request(self, request):
        """
        Process the request to add organization context.

        Args:
            request: The HTTP request object
        """
        # Initialize organization context
        request.organization = None
        request.graphql_context = None

        # Skip organization context for certain paths
        skip_paths = [
            "/admin/",
            "/health/",
            "/static/",
            "/media/",
        ]

        # Check if we should skip organization processing
        if any(request.path.startswith(path) for path in skip_paths):
            return None

        # Special handling for GraphQL requests
        if request.path.startswith("/graphql"):
            return self._process_graphql_request(request)

        # For regular API requests, set organization context
        return self._process_api_request(request)

    def _process_graphql_request(self, request):
        """
        Process GraphQL requests with organization context.

        Args:
            request: The HTTP request object
        """
        # Create GraphQL context for organization isolation
        request.graphql_context = GraphQLContext(request)

        # Set organization from GraphQL context
        if request.graphql_context.has_organization_context:
            request.organization = request.graphql_context.organization

        return None

    def _process_api_request(self, request):
        """
        Process regular API requests with organization context.

        Args:
            request: The HTTP request object
        """
        # For authenticated users, set organization context
        if hasattr(request, "user") and request.user.is_authenticated:
            # Try to get organization from header first
            org_slug = request.META.get("HTTP_X_ORGANIZATION")

            if org_slug:
                # Validate user has access to this organization
                if hasattr(request.user, "can_access_organization_by_slug"):
                    if request.user.can_access_organization_by_slug(org_slug):
                        try:
                            from .models import Organization

                            request.organization = Organization.objects.get(
                                slug=org_slug, is_active=True
                            )
                        except Organization.DoesNotExist:
                            logger.warning(f"Organization not found: {org_slug}")
                            return JsonResponse(
                                {"error": "Organization not found"},
                                status=status.HTTP_404_NOT_FOUND,
                            )
                    else:
                        logger.warning(
                            f"Access denied to organization: {org_slug} for user: {request.user.id}"
                        )
                        return JsonResponse(
                            {"error": "Access denied to organization"},
                            status=status.HTTP_403_FORBIDDEN,
                        )
                else:
                    # Fallback if user doesn't have the method
                    if (
                        hasattr(request.user, "organization")
                        and request.user.organization
                    ):
                        if request.user.organization.slug == org_slug:
                            request.organization = request.user.organization
                        else:
                            return JsonResponse(
                                {"error": "Access denied to organization"},
                                status=status.HTTP_403_FORBIDDEN,
                            )
            else:
                # Use user's default organization
                if hasattr(request.user, "organization"):
                    request.organization = request.user.organization

        return None

    def process_response(self, request, response):
        """
        Process the response to add organization-related headers.

        Args:
            request: The HTTP request object
            response: The HTTP response object

        Returns:
            HttpResponse: The modified response
        """
        # Add organization context to response headers for debugging
        if hasattr(request, "organization") and request.organization:
            response["X-Current-Organization"] = request.organization.slug
            response["X-Current-Organization-Id"] = str(request.organization.id)

        # Add user context for debugging
        if hasattr(request, "user") and request.user.is_authenticated:
            response["X-Current-User-Id"] = str(request.user.id)

        return response


class GraphQLOrganizationMiddleware(MiddlewareMixin):
    """
    Specialized middleware for GraphQL organization isolation.

    This middleware works in conjunction with the main OrganizationMiddleware
    to provide enhanced organization context specifically for GraphQL operations.
    """

    def process_request(self, request):
        """
        Process GraphQL requests to ensure proper organization context.

        Args:
            request: The HTTP request object
        """
        # Only process GraphQL requests
        if not request.path.startswith("/graphql"):
            return None

        # Ensure we have a user (even if anonymous)
        if not hasattr(request, "user"):
            request.user = AnonymousUser()

        # Create or enhance GraphQL context
        if not hasattr(request, "graphql_context"):
            request.graphql_context = GraphQLContext(request)

        # Set organization context for GraphQL
        if request.graphql_context.has_organization_context:
            request.organization = request.graphql_context.organization

        return None

    def process_view(self, request, view_func, view_args, view_kwargs):
        """
        Process the view for GraphQL requests.

        Args:
            request: The HTTP request object
            view_func: The view function
            view_args: View arguments
            view_kwargs: View keyword arguments
        """
        # Only process GraphQL requests
        if not request.path.startswith("/graphql"):
            return None

        # Ensure GraphQL context is available
        if not hasattr(request, "graphql_context"):
            request.graphql_context = GraphQLContext(request)

        return None


def get_organization_from_context(info):
    """
    Utility function to get organization from GraphQL info context.

    Args:
        info: GraphQL resolver info object

    Returns:
        Organization instance or None

    Raises:
        GraphQLError: If organization context is required but not available
    """
    context = info.context

    # If it's our custom GraphQL context
    if isinstance(context, GraphQLContext):
        return context.organization

    # If it's a Django request with organization
    if hasattr(context, "organization"):
        return context.organization

    # If it's a Django request, create GraphQL context
    if hasattr(context, "user"):
        graphql_context = GraphQLContext(context)
        return graphql_context.organization

    return None


def get_user_from_context(info):
    """
    Utility function to get user from GraphQL info context.

    Args:
        info: GraphQL resolver info object

    Returns:
        User instance

    Raises:
        GraphQLError: If authentication is required but user is not authenticated
    """
    context = info.context

    # If it's our custom GraphQL context
    if isinstance(context, GraphQLContext):
        return context.user

    # If it's a Django request
    if hasattr(context, "user"):
        return context.user

    return AnonymousUser()


def require_organization_context(info):
    """
    Utility function to require organization context in GraphQL resolvers.

    Args:
        info: GraphQL resolver info object

    Returns:
        Organization instance

    Raises:
        GraphQLError: If organization context is not available
    """
    context = info.context

    # If it's our custom GraphQL context
    if isinstance(context, GraphQLContext):
        context.require_organization_context()
        return context.organization

    # Fallback for regular Django request context
    organization = get_organization_from_context(info)
    if not organization:
        from graphql import GraphQLError

        raise GraphQLError("Organization context required")

    return organization
