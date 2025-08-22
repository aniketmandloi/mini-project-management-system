"""
JWT Authentication Middleware for Django.

This module provides Django middleware for JWT token authentication
that integrates with the GraphQL API authentication system.
"""

from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from django.utils.deprecation import MiddlewareMixin
from .utils import get_user_from_jwt_token

User = get_user_model()


class JWTAuthenticationMiddleware(MiddlewareMixin):
    """
    Django middleware for JWT authentication.

    This middleware extracts JWT tokens from the Authorization header
    and authenticates users for GraphQL requests.
    """

    def process_request(self, request):
        """
        Process the request to extract and validate JWT token.

        Args:
            request: Django HTTP request
        """
        # Skip authentication for non-GraphQL endpoints
        if not request.path.startswith("/graphql"):
            return None

        # Get Authorization header
        auth_header = request.META.get("HTTP_AUTHORIZATION", "")

        if not auth_header.startswith("Bearer "):
            # No bearer token, use anonymous user
            request.user = AnonymousUser()
            request.organization = None
            return None

        # Extract token
        token = auth_header.split(" ")[1] if len(auth_header.split(" ")) == 2 else None

        if not token:
            request.user = AnonymousUser()
            request.organization = None
            return None

        # Get user from JWT token
        user = get_user_from_jwt_token(token)

        if user:
            request.user = user
            request.organization = user.organization
        else:
            request.user = AnonymousUser()
            request.organization = None

        return None
