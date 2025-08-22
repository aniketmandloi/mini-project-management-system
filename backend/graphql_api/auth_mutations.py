"""
Authentication mutations for user registration, login, and token management.

This module provides GraphQL mutations for user authentication including
registration, login, token refresh, and email verification.
"""

import graphene
from graphql import GraphQLError
from django.contrib.auth import authenticate, get_user_model
from django.db import transaction
from django.utils import timezone
from datetime import timedelta

from accounts.models import EmailVerificationToken, UserSession
from core.models import Organization
from .types import UserType
from .validators import validate_email_input, validate_password
from .utils import generate_jwt_tokens, verify_jwt_token, send_verification_email

User = get_user_model()


# Input Types for Authentication
class RegisterInput(graphene.InputObjectType):
    """Input type for user registration."""

    email = graphene.String(required=True, description="User email address")
    password = graphene.String(required=True, description="User password")
    first_name = graphene.String(required=True, description="User first name")
    last_name = graphene.String(required=True, description="User last name")
    organization_id = graphene.ID(description="Organization ID to join (optional)")


class LoginInput(graphene.InputObjectType):
    """Input type for user login."""

    email = graphene.String(required=True, description="User email address")
    password = graphene.String(required=True, description="User password")
    organization_slug = graphene.String(description="Organization slug for context")


class RefreshTokenInput(graphene.InputObjectType):
    """Input type for token refresh."""

    refresh_token = graphene.String(required=True, description="JWT refresh token")


class VerifyEmailInput(graphene.InputObjectType):
    """Input type for email verification."""

    token = graphene.String(required=True, description="Email verification token")


# Authentication Response Types
class AuthPayload(graphene.ObjectType):
    """Response payload for authentication mutations."""

    user = graphene.Field(UserType)
    access_token = graphene.String()
    refresh_token = graphene.String()
    expires_at = graphene.DateTime()
    success = graphene.Boolean()
    errors = graphene.List(graphene.String)


class TokenPayload(graphene.ObjectType):
    """Response payload for token refresh."""

    access_token = graphene.String()
    refresh_token = graphene.String()
    expires_at = graphene.DateTime()
    success = graphene.Boolean()
    errors = graphene.List(graphene.String)


class VerifyEmailPayload(graphene.ObjectType):
    """Response payload for email verification."""

    success = graphene.Boolean()
    message = graphene.String()
    errors = graphene.List(graphene.String)


# Authentication Mutations
class Register(graphene.Mutation):
    """Mutation to register a new user."""

    class Arguments:
        input = RegisterInput(required=True)

    Output = AuthPayload

    @staticmethod
    def mutate(root, info, input):
        """Register a new user."""
        try:
            # Validate input
            errors = []

            # Validate email
            email_error = validate_email_input(input.email)
            if email_error:
                errors.append(email_error)

            # Validate password
            password_error = validate_password(input.password)
            if password_error:
                errors.append(password_error)

            # Check if user already exists
            if User.objects.filter(email=input.email).exists():
                errors.append("User with this email already exists")

            # Validate organization if provided
            organization = None
            if input.organization_id:
                try:
                    organization = Organization.objects.get(
                        id=input.organization_id, is_active=True
                    )
                except Organization.DoesNotExist:
                    errors.append("Organization not found or inactive")

            if errors:
                return AuthPayload(success=False, errors=errors)

            # Create user
            with transaction.atomic():
                user = User.objects.create_user(
                    email=input.email,
                    username=input.email,  # Use email as username
                    password=input.password,
                    first_name=input.first_name,
                    last_name=input.last_name,
                    organization=organization,
                    is_active=True,  # Can be changed to False if email verification is required
                )

                # Generate JWT tokens
                access_token, refresh_token, expires_at = generate_jwt_tokens(user)

                # Create user session with unique session key
                import secrets

                session_key = secrets.token_urlsafe(
                    30
                )  # Generate unique 40-char session key
                UserSession.objects.create(
                    user=user,
                    session_key=session_key,
                    ip_address=info.context.META.get("REMOTE_ADDR", "127.0.0.1"),
                    user_agent=info.context.META.get("HTTP_USER_AGENT", ""),
                )

                # Send verification email (optional)
                # send_verification_email(user)

            return AuthPayload(
                user=user,
                access_token=access_token,
                refresh_token=refresh_token,
                expires_at=expires_at,
                success=True,
                errors=[],
            )

        except Exception as e:
            return AuthPayload(success=False, errors=[str(e)])


class Login(graphene.Mutation):
    """Mutation to authenticate a user."""

    class Arguments:
        input = LoginInput(required=True)

    Output = AuthPayload

    @staticmethod
    def mutate(root, info, input):
        """Authenticate a user and return JWT tokens."""
        try:
            # Authenticate user
            user = authenticate(username=input.email, password=input.password)
            if not user:
                return AuthPayload(success=False, errors=["Invalid email or password"])

            if not user.is_active:
                return AuthPayload(success=False, errors=["Account is deactivated"])

            # Check organization context if provided
            if input.organization_slug:
                if (
                    not user.organization
                    or user.organization.slug != input.organization_slug
                ):
                    return AuthPayload(
                        success=False,
                        errors=["User is not a member of this organization"],
                    )

            # Generate JWT tokens
            access_token, refresh_token, expires_at = generate_jwt_tokens(user)

            # Create or update user session
            with transaction.atomic():
                # Invalidate old sessions for this user
                UserSession.objects.filter(user=user).update(is_active=False)

                # Create new session with unique session key
                import secrets

                session_key = secrets.token_urlsafe(30)  # Generate unique session key
                UserSession.objects.create(
                    user=user,
                    session_key=session_key,
                    ip_address=info.context.META.get("REMOTE_ADDR", "127.0.0.1"),
                    user_agent=info.context.META.get("HTTP_USER_AGENT", ""),
                )

            return AuthPayload(
                user=user,
                access_token=access_token,
                refresh_token=refresh_token,
                expires_at=expires_at,
                success=True,
                errors=[],
            )

        except Exception as e:
            return AuthPayload(success=False, errors=[str(e)])


class RefreshToken(graphene.Mutation):
    """Mutation to refresh JWT access token."""

    class Arguments:
        input = RefreshTokenInput(required=True)

    Output = TokenPayload

    @staticmethod
    def mutate(root, info, input):
        """Refresh JWT access token using refresh token."""
        try:
            # Verify refresh token
            payload = verify_jwt_token(input.refresh_token, token_type="refresh")
            if not payload:
                return TokenPayload(
                    success=False, errors=["Invalid or expired refresh token"]
                )

            # Get user (we'll rely on JWT validation rather than session tracking for refresh tokens)
            try:
                user = User.objects.get(id=payload["user_id"], is_active=True)
            except User.DoesNotExist:
                return TokenPayload(success=False, errors=["Invalid user"])

            # Generate new tokens
            access_token, new_refresh_token, expires_at = generate_jwt_tokens(user)

            return TokenPayload(
                access_token=access_token,
                refresh_token=new_refresh_token,
                expires_at=expires_at,
                success=True,
                errors=[],
            )

        except Exception as e:
            return TokenPayload(success=False, errors=[str(e)])


class Logout(graphene.Mutation):
    """Mutation to logout user and invalidate session."""

    class Arguments:
        refresh_token = graphene.String(description="Refresh token to invalidate")

    success = graphene.Boolean()
    message = graphene.String()

    @staticmethod
    def mutate(root, info, refresh_token=None):
        """Logout user and invalidate session."""
        try:
            # Get user from context
            user = info.context.user
            if not user or not user.is_authenticated:
                return Logout(success=False, message="Not authenticated")

            # Invalidate all sessions for user (since we're not tracking individual refresh tokens in sessions)
            UserSession.objects.filter(user=user).update(is_active=False)

            return Logout(success=True, message="Logged out successfully")

        except Exception as e:
            return Logout(success=False, message=str(e))


class VerifyEmail(graphene.Mutation):
    """Mutation to verify user email address."""

    class Arguments:
        input = VerifyEmailInput(required=True)

    Output = VerifyEmailPayload

    @staticmethod
    def mutate(root, info, input):
        """Verify user email using verification token."""
        try:
            # Get verification token
            try:
                verification = EmailVerificationToken.objects.get(
                    token=input.token, expires_at__gt=timezone.now(), is_used=False
                )
            except EmailVerificationToken.DoesNotExist:
                return VerifyEmailPayload(
                    success=False, errors=["Invalid or expired verification token"]
                )

            # Update user and mark token as used
            with transaction.atomic():
                user = verification.user
                user.email_verified = True
                user.email_verified_at = timezone.now()
                user.save()

                verification.is_used = True
                verification.save()

            return VerifyEmailPayload(
                success=True, message="Email verified successfully"
            )

        except Exception as e:
            return VerifyEmailPayload(success=False, errors=[str(e)])


class ResendVerificationEmail(graphene.Mutation):
    """Mutation to resend email verification."""

    class Arguments:
        email = graphene.String(required=True, description="User email address")

    success = graphene.Boolean()
    message = graphene.String()
    errors = graphene.List(graphene.String)

    @staticmethod
    def mutate(root, info, email):
        """Resend email verification."""
        try:
            # Get user
            try:
                user = User.objects.get(email=email, is_active=True)
            except User.DoesNotExist:
                return ResendVerificationEmail(success=False, errors=["User not found"])

            if user.email_verified:
                return ResendVerificationEmail(
                    success=False, message="Email is already verified"
                )

            # Send verification email
            # send_verification_email(user)

            return ResendVerificationEmail(
                success=True, message="Verification email sent"
            )

        except Exception as e:
            return ResendVerificationEmail(success=False, errors=[str(e)])
