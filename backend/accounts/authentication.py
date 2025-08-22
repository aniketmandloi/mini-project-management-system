"""
Custom authentication classes for the project management system.

This module provides JWT authentication and organization-based authentication
for the multi-tenant architecture.
"""

import jwt
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.utils.translation import gettext_lazy as _

User = get_user_model()


class JWTAuthentication(BaseAuthentication):
    """
    JWT authentication class.

    This class handles JWT token authentication for API requests.
    It validates JWT tokens and returns the authenticated user.
    """

    def authenticate(self, request):
        """
        Authenticate a request using JWT token.

        Args:
            request: The HTTP request object

        Returns:
            tuple: (user, token) if authentication succeeds, None otherwise
        """
        auth_header = request.META.get("HTTP_AUTHORIZATION")

        if not auth_header:
            return None

        try:
            auth_type, token = auth_header.split(" ", 1)
        except ValueError:
            return None

        if auth_type.lower() != "bearer":
            return None

        try:
            payload = jwt.decode(
                token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
            )
        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed(_("Token has expired"))
        except jwt.InvalidTokenError:
            raise AuthenticationFailed(_("Invalid token"))

        try:
            user = User.objects.get(id=payload["user_id"])
        except User.DoesNotExist:
            raise AuthenticationFailed(_("User not found"))

        if not user.is_active:
            raise AuthenticationFailed(_("User account is disabled"))

        return (user, token)

    def authenticate_header(self, request):
        """
        Return the authentication header for 401 responses.

        Args:
            request: The HTTP request object

        Returns:
            str: The authentication header value
        """
        return "Bearer"


class OrganizationAuthentication(BaseAuthentication):
    """
    Organization-based authentication class.

    This class ensures that users can only access resources
    within their organization context.
    """

    def authenticate(self, request):
        """
        Authenticate a request with organization context.

        This method should be used after JWT authentication
        to ensure organization-level access control.

        Args:
            request: The HTTP request object

        Returns:
            tuple: (user, token) if authentication succeeds, None otherwise
        """
        # This relies on JWT authentication being run first
        if not hasattr(request, "user") or not request.user.is_authenticated:
            return None

        org_header = request.META.get("HTTP_X_ORGANIZATION")

        if not org_header:
            # If no organization header, use user's default organization
            if request.user.organization:
                request.organization = request.user.organization
                return (request.user, None)
            else:
                raise AuthenticationFailed(_("No organization context provided"))

        # Validate that user has access to the specified organization
        if not request.user.can_access_organization_by_slug(org_header):
            raise AuthenticationFailed(_("Access denied to organization"))

        # Set organization context on request
        try:
            from core.models import Organization

            request.organization = Organization.objects.get_by_slug(org_header)
        except Organization.DoesNotExist:
            raise AuthenticationFailed(_("Organization not found"))

        return (request.user, None)


def create_jwt_token(user):
    """
    Create a JWT token for a user.

    Args:
        user: User instance

    Returns:
        dict: Dictionary containing access and refresh tokens
    """
    from datetime import datetime, timedelta

    # Access token payload
    access_payload = {
        "user_id": user.id,
        "email": user.email,
        "organization_id": user.organization_id,
        "exp": datetime.utcnow()
        + timedelta(seconds=settings.JWT_ACCESS_TOKEN_LIFETIME),
        "iat": datetime.utcnow(),
        "token_type": "access",
    }

    # Refresh token payload
    refresh_payload = {
        "user_id": user.id,
        "exp": datetime.utcnow()
        + timedelta(seconds=settings.JWT_REFRESH_TOKEN_LIFETIME),
        "iat": datetime.utcnow(),
        "token_type": "refresh",
    }

    access_token = jwt.encode(
        access_payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )

    refresh_token = jwt.encode(
        refresh_payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "access_token_expires_in": settings.JWT_ACCESS_TOKEN_LIFETIME,
        "refresh_token_expires_in": settings.JWT_REFRESH_TOKEN_LIFETIME,
    }


def refresh_jwt_token(refresh_token):
    """
    Refresh a JWT token using a refresh token.

    Args:
        refresh_token: The refresh token string

    Returns:
        dict: Dictionary containing new access and refresh tokens

    Raises:
        AuthenticationFailed: If refresh token is invalid or expired
    """
    try:
        payload = jwt.decode(
            refresh_token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
    except jwt.ExpiredSignatureError:
        raise AuthenticationFailed(_("Refresh token has expired"))
    except jwt.InvalidTokenError:
        raise AuthenticationFailed(_("Invalid refresh token"))

    if payload.get("token_type") != "refresh":
        raise AuthenticationFailed(_("Invalid token type"))

    try:
        user = User.objects.get(id=payload["user_id"])
    except User.DoesNotExist:
        raise AuthenticationFailed(_("User not found"))

    if not user.is_active:
        raise AuthenticationFailed(_("User account is disabled"))

    return create_jwt_token(user)
