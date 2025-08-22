"""
User models for authentication and account management.

This module defines custom user models and related functionality for
the project management system, including multi-tenant organization support.
"""

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.core.validators import EmailValidator
from django.utils import timezone


class User(AbstractUser):
    """
    Custom user model extending Django's AbstractUser.
    
    This model adds organization-specific fields and email-based authentication
    while maintaining compatibility with Django's built-in authentication system.
    """
    
    email = models.EmailField(
        unique=True,
        validators=[EmailValidator()],
        help_text="Email address used for authentication"
    )
    first_name = models.CharField(
        max_length=150,
        help_text="User's first name"
    )
    last_name = models.CharField(
        max_length=150,
        help_text="User's last name"
    )
    organization = models.ForeignKey(
        'core.Organization',
        on_delete=models.CASCADE,
        related_name='users',
        null=True,
        blank=True,
        help_text="Organization this user belongs to"
    )
    is_organization_admin = models.BooleanField(
        default=False,
        help_text="Whether this user is an admin for their organization"
    )
    last_login_ip = models.GenericIPAddressField(
        null=True,
        blank=True,
        help_text="IP address of the last login"
    )
    email_verified = models.BooleanField(
        default=False,
        help_text="Whether the user's email has been verified"
    )
    email_verified_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the email was verified"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Use email as the username field
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name']
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'User'
        verbose_name_plural = 'Users'
    
    def __str__(self):
        return f"{self.get_full_name()} ({self.email})"
    
    def get_full_name(self):
        """Return the user's full name."""
        return f"{self.first_name} {self.last_name}".strip()
    
    def get_short_name(self):
        """Return the user's first name."""
        return self.first_name
    
    def verify_email(self):
        """Mark the user's email as verified."""
        self.email_verified = True
        self.email_verified_at = timezone.now()
        self.save(update_fields=['email_verified', 'email_verified_at'])
    
    def can_access_organization(self, organization):
        """Check if the user can access a specific organization."""
        return self.organization_id == organization.id if organization else False
    
    def has_organization_permission(self, permission):
        """Check if the user has a specific permission within their organization."""
        if not self.organization:
            return False
        return self.is_organization_admin or self.is_superuser
    
    def can_access_organization_by_slug(self, slug):
        """Check if the user can access an organization by its slug."""
        if not self.organization:
            return False
        return self.organization.slug == slug


class UserSession(models.Model):
    """
    User session tracking model.
    
    This model tracks user sessions for security and analytics purposes,
    including device information and login history.
    """
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='sessions',
        help_text="User this session belongs to"
    )
    session_key = models.CharField(
        max_length=40,
        unique=True,
        help_text="Django session key"
    )
    ip_address = models.GenericIPAddressField(
        help_text="IP address of the session"
    )
    user_agent = models.TextField(
        blank=True,
        help_text="User agent string from the browser"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    last_activity = models.DateTimeField(
        auto_now=True,
        help_text="Last activity timestamp"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether the session is still active"
    )
    
    class Meta:
        ordering = ['-last_activity']
        verbose_name = 'User Session'
        verbose_name_plural = 'User Sessions'
    
    def __str__(self):
        return f"{self.user.email} - {self.ip_address}"
    
    def deactivate(self):
        """Deactivate this session."""
        self.is_active = False
        self.save(update_fields=['is_active'])


class EmailVerificationToken(models.Model):
    """
    Email verification token model.
    
    This model stores tokens used for email verification during
    user registration and email change processes.
    """
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='verification_tokens',
        help_text="User this token belongs to"
    )
    token = models.CharField(
        max_length=64,
        unique=True,
        help_text="Verification token"
    )
    email = models.EmailField(
        validators=[EmailValidator()],
        help_text="Email address to verify"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(
        help_text="When this token expires"
    )
    used_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When this token was used"
    )
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Email Verification Token'
        verbose_name_plural = 'Email Verification Tokens'
    
    def __str__(self):
        return f"Token for {self.email}"
    
    def is_expired(self):
        """Check if the token has expired."""
        return timezone.now() > self.expires_at
    
    def is_used(self):
        """Check if the token has been used."""
        return self.used_at is not None
    
    def is_valid(self):
        """Check if the token is valid (not expired and not used)."""
        return not self.is_expired() and not self.is_used()
    
    def mark_as_used(self):
        """Mark the token as used."""
        self.used_at = timezone.now()
        self.save(update_fields=['used_at'])