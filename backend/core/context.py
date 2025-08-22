"""
GraphQL context with organization isolation.

This module provides GraphQL context utilities that ensure all data operations
are scoped to the current user's organization, implementing proper multi-tenant
data isolation throughout the application.
"""

from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from graphql import GraphQLError
from .models import Organization

User = get_user_model()


class GraphQLContext:
    """
    Custom GraphQL context class that provides organization isolation.

    This context ensures that all GraphQL operations are properly scoped
    to the authenticated user's organization, preventing data leakage
    between different tenants.
    """

    def __init__(self, request):
        """
        Initialize the GraphQL context.

        Args:
            request: Django HTTP request object
        """
        self.request = request
        self._user = None
        self._organization = None
        self._user_resolved = False
        self._organization_resolved = False

    @property
    def user(self):
        """
        Get the authenticated user from the request.

        Returns:
            User instance if authenticated, AnonymousUser otherwise
        """
        if not self._user_resolved:
            self._user = getattr(self.request, "user", AnonymousUser())
            self._user_resolved = True
        return self._user

    @property
    def organization(self):
        """
        Get the organization context for the current user.

        Returns:
            Organization instance if user has organization access, None otherwise

        Raises:
            GraphQLError: If user is authenticated but has no organization context
        """
        if not self._organization_resolved:
            if self.user.is_authenticated:
                # Check if organization is already set on request (by middleware)
                self._organization = getattr(self.request, "organization", None)

                # If not set by middleware, get from user's organization
                if not self._organization and hasattr(self.user, "organization"):
                    self._organization = self.user.organization

                # Ensure organization is active
                if self._organization and not self._organization.is_active:
                    self._organization = None

            self._organization_resolved = True

        return self._organization

    @property
    def is_authenticated(self):
        """
        Check if the current user is authenticated.

        Returns:
            bool: True if user is authenticated, False otherwise
        """
        return self.user.is_authenticated

    @property
    def has_organization_context(self):
        """
        Check if the current user has organization context.

        Returns:
            bool: True if user has organization access, False otherwise
        """
        return self.organization is not None

    def require_authentication(self):
        """
        Require user authentication for the current operation.

        Raises:
            GraphQLError: If user is not authenticated
        """
        if not self.is_authenticated:
            raise GraphQLError("Authentication required")

    def require_organization_context(self):
        """
        Require organization context for the current operation.

        Raises:
            GraphQLError: If user is not authenticated or has no organization context
        """
        self.require_authentication()

        if not self.has_organization_context:
            raise GraphQLError("Organization context required")

    def require_organization_admin(self):
        """
        Require organization admin privileges for the current operation.

        Raises:
            GraphQLError: If user is not an organization admin
        """
        self.require_organization_context()

        if not self.user.is_organization_admin:
            raise GraphQLError("Organization admin privileges required")

    def require_superuser(self):
        """
        Require superuser privileges for the current operation.

        Raises:
            GraphQLError: If user is not a superuser
        """
        self.require_authentication()

        if not self.user.is_superuser:
            raise GraphQLError("Superuser privileges required")

    def filter_by_organization(self, queryset):
        """
        Filter a queryset to only include records from the current organization.

        Args:
            queryset: Django QuerySet to filter

        Returns:
            Filtered QuerySet scoped to current organization

        Raises:
            GraphQLError: If no organization context is available
        """
        self.require_organization_context()

        # Determine the organization field name based on the model
        model = queryset.model

        if hasattr(model, "organization"):
            return queryset.filter(organization=self.organization)
        elif hasattr(model, "project") and hasattr(
            model.project.field.related_model, "organization"
        ):
            return queryset.filter(project__organization=self.organization)
        elif hasattr(model, "task") and hasattr(
            model.task.field.related_model, "project"
        ):
            return queryset.filter(task__project__organization=self.organization)
        else:
            # If we can't determine organization relationship, raise error
            raise GraphQLError(
                f"Unable to apply organization filtering to {model.__name__}"
            )

    def validate_organization_access(self, obj):
        """
        Validate that the current user has access to the given object.

        Args:
            obj: Model instance to validate access for

        Returns:
            bool: True if user has access, False otherwise

        Raises:
            GraphQLError: If no organization context is available
        """
        self.require_organization_context()

        # Check direct organization relationship
        if hasattr(obj, "organization"):
            return obj.organization.id == self.organization.id

        # Check through project relationship
        if hasattr(obj, "project") and hasattr(obj.project, "organization"):
            return obj.project.organization.id == self.organization.id

        # Check through task relationship
        if hasattr(obj, "task") and hasattr(obj.task, "project"):
            return obj.task.project.organization.id == self.organization.id

        # If we can't determine relationship, deny access
        return False

    def get_organization_by_slug(self, slug):
        """
        Get organization by slug with proper access validation.

        Args:
            slug: Organization slug

        Returns:
            Organization instance if accessible, None otherwise
        """
        try:
            organization = Organization.objects.get(slug=slug, is_active=True)

            # If user is authenticated, ensure they have access
            if self.is_authenticated:
                if (
                    self.user.organization
                    and self.user.organization.id == organization.id
                ):
                    return organization
                elif self.user.is_superuser:
                    return organization
                else:
                    return None

            # Anonymous users have no organization access
            return None

        except Organization.DoesNotExist:
            return None

    def can_access_organization(self, organization):
        """
        Check if the current user can access the given organization.

        Args:
            organization: Organization instance

        Returns:
            bool: True if user can access organization, False otherwise
        """
        if not self.is_authenticated:
            return False

        if self.user.is_superuser:
            return True

        if self.user.organization and self.user.organization.id == organization.id:
            return True

        return False


def get_graphql_context(request):
    """
    Create a GraphQL context from a Django request.

    Args:
        request: Django HTTP request

    Returns:
        GraphQLContext instance
    """
    return GraphQLContext(request)


def require_organization_access(context, organization_id=None, organization_slug=None):
    """
    Utility function to require organization access in resolvers.

    Args:
        context: GraphQL context
        organization_id: Optional organization ID to validate access for
        organization_slug: Optional organization slug to validate access for

    Returns:
        Organization instance if access is granted

    Raises:
        GraphQLError: If access is denied or organization not found
    """
    if not isinstance(context, GraphQLContext):
        context = GraphQLContext(
            context.request if hasattr(context, "request") else context
        )

    context.require_organization_context()

    # If specific organization is requested, validate access
    if organization_id:
        try:
            organization = Organization.objects.get(id=organization_id, is_active=True)
            if not context.can_access_organization(organization):
                raise GraphQLError("Access denied to organization")
            return organization
        except Organization.DoesNotExist:
            raise GraphQLError("Organization not found")

    if organization_slug:
        organization = context.get_organization_by_slug(organization_slug)
        if not organization:
            raise GraphQLError("Organization not found or access denied")
        return organization

    # Return current organization
    return context.organization
