"""
Utility functions for GraphQL API.

This module provides utility functions for JWT token handling,
email services, and other common operations.
"""

import jwt
import secrets
from datetime import datetime, timedelta
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone
from django.utils.html import strip_tags
from accounts.models import EmailVerificationToken

User = get_user_model()


def generate_jwt_tokens(user):
    """
    Generate JWT access and refresh tokens for a user.

    Args:
        user: User instance

    Returns:
        Tuple of (access_token, refresh_token, expires_at)
    """
    now = timezone.now()
    access_expires = now + timedelta(minutes=settings.JWT_ACCESS_TOKEN_LIFETIME_MINUTES)
    refresh_expires = now + timedelta(days=settings.JWT_REFRESH_TOKEN_LIFETIME_DAYS)

    # Access token payload
    access_payload = {
        "user_id": user.id,
        "email": user.email,
        "organization_id": user.organization.id if user.organization else None,
        "is_organization_admin": user.is_organization_admin,
        "exp": access_expires,
        "iat": now,
        "type": "access",
    }

    # Refresh token payload
    refresh_payload = {
        "user_id": user.id,
        "exp": refresh_expires,
        "iat": now,
        "type": "refresh",
    }

    # Generate tokens
    access_token = jwt.encode(
        access_payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )
    refresh_token = jwt.encode(
        refresh_payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )

    return access_token, refresh_token, refresh_expires


def verify_jwt_token(token, token_type="access"):
    """
    Verify and decode JWT token.

    Args:
        token: JWT token string
        token_type: Token type ('access' or 'refresh')

    Returns:
        Token payload if valid, None otherwise
    """
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )

        # Check token type
        if payload.get("type") != token_type:
            return None

        # Check expiration
        if payload.get("exp", 0) < timezone.now().timestamp():
            return None

        return payload

    except jwt.InvalidTokenError:
        return None


def get_user_from_jwt_token(token):
    """
    Get user instance from JWT token.

    Args:
        token: JWT access token

    Returns:
        User instance if token is valid, None otherwise
    """
    payload = verify_jwt_token(token, token_type="access")
    if not payload:
        return None

    try:
        return User.objects.get(id=payload["user_id"], is_active=True)
    except User.DoesNotExist:
        return None


def generate_verification_token():
    """
    Generate a secure random token for email verification.

    Returns:
        Random token string
    """
    return secrets.token_urlsafe(32)


def send_verification_email(user):
    """
    Send email verification email to user.

    Args:
        user: User instance
    """
    # Generate verification token
    token = generate_verification_token()
    expires_at = timezone.now() + timedelta(hours=24)

    # Create verification record
    EmailVerificationToken.objects.create(user=user, token=token, expires_at=expires_at)

    # Email content
    subject = f"Verify your email - {settings.SITE_NAME}"
    verification_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"

    html_message = render_to_string(
        "emails/verify_email.html",
        {
            "user": user,
            "verification_url": verification_url,
            "site_name": settings.SITE_NAME,
        },
    )
    plain_message = strip_tags(html_message)

    # Send email
    send_mail(
        subject=subject,
        message=plain_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        html_message=html_message,
        fail_silently=False,
    )


def send_password_reset_email(user, reset_token):
    """
    Send password reset email to user.

    Args:
        user: User instance
        reset_token: Password reset token
    """
    subject = f"Reset your password - {settings.SITE_NAME}"
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"

    html_message = render_to_string(
        "emails/password_reset.html",
        {"user": user, "reset_url": reset_url, "site_name": settings.SITE_NAME},
    )
    plain_message = strip_tags(html_message)

    send_mail(
        subject=subject,
        message=plain_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        html_message=html_message,
        fail_silently=False,
    )


def generate_slug(text, max_length=50):
    """
    Generate URL-friendly slug from text.

    Args:
        text: Text to convert to slug
        max_length: Maximum length of slug

    Returns:
        URL-friendly slug string
    """
    import re

    # Convert to lowercase and replace spaces with hyphens
    slug = text.lower().replace(" ", "-")

    # Remove special characters except hyphens
    slug = re.sub(r"[^a-z0-9-]", "", slug)

    # Remove multiple consecutive hyphens
    slug = re.sub(r"-+", "-", slug)

    # Remove leading/trailing hyphens
    slug = slug.strip("-")

    # Truncate if too long
    if len(slug) > max_length:
        slug = slug[:max_length].rstrip("-")

    return slug


def sanitize_html(content):
    """
    Sanitize HTML content to prevent XSS attacks.

    Args:
        content: HTML content string

    Returns:
        Sanitized HTML string
    """
    import bleach

    # Allowed tags and attributes
    allowed_tags = [
        "p",
        "br",
        "strong",
        "em",
        "u",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "ul",
        "ol",
        "li",
        "blockquote",
        "a",
        "img",
    ]

    allowed_attributes = {
        "a": ["href", "title"],
        "img": ["src", "alt", "width", "height"],
    }

    return bleach.clean(content, tags=allowed_tags, attributes=allowed_attributes)


def calculate_completion_rate(total, completed):
    """
    Calculate completion rate as percentage.

    Args:
        total: Total count
        completed: Completed count

    Returns:
        Completion rate as percentage (0-100)
    """
    if total == 0:
        return 0.0
    return round((completed / total) * 100, 2)


def get_time_until_deadline(deadline):
    """
    Get time remaining until deadline.

    Args:
        deadline: Deadline datetime

    Returns:
        Dictionary with days, hours, and minutes remaining
    """
    if not deadline:
        return None

    now = timezone.now()
    if deadline <= now:
        return {"overdue": True, "days": 0, "hours": 0, "minutes": 0}

    delta = deadline - now
    days = delta.days
    hours, remainder = divmod(delta.seconds, 3600)
    minutes, _ = divmod(remainder, 60)

    return {
        "overdue": False,
        "days": days,
        "hours": hours,
        "minutes": minutes,
        "total_minutes": int(delta.total_seconds() / 60),
    }


def validate_file_upload(file, allowed_types=None, max_size=None):
    """
    Validate uploaded file.

    Args:
        file: Uploaded file
        allowed_types: List of allowed MIME types
        max_size: Maximum file size in bytes

    Returns:
        Tuple of (is_valid, error_message)
    """
    if not file:
        return False, "No file provided"

    # Check file size
    if max_size and file.size > max_size:
        max_mb = max_size / (1024 * 1024)
        return False, f"File size exceeds {max_mb}MB limit"

    # Check file type
    if allowed_types and file.content_type not in allowed_types:
        return False, f"File type {file.content_type} not allowed"

    return True, None


def generate_api_key():
    """
    Generate a secure API key.

    Returns:
        API key string
    """
    return f"pm_{secrets.token_urlsafe(32)}"


def paginate_queryset(queryset, page=1, per_page=20, max_per_page=100):
    """
    Paginate a Django queryset.

    Args:
        queryset: Django queryset
        page: Page number (1-based)
        per_page: Items per page
        max_per_page: Maximum items per page

    Returns:
        Dictionary with pagination info and results
    """
    # Validate parameters
    page = max(1, page)
    per_page = min(max_per_page, max(1, per_page))

    # Calculate pagination
    total_count = queryset.count()
    total_pages = (total_count + per_page - 1) // per_page
    offset = (page - 1) * per_page

    # Get page results
    results = list(queryset[offset : offset + per_page])

    return {
        "results": results,
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total_count": total_count,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_previous": page > 1,
            "next_page": page + 1 if page < total_pages else None,
            "previous_page": page - 1 if page > 1 else None,
        },
    }
