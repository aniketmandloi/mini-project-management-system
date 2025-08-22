"""
Django admin configuration for accounts models.

This module configures the Django admin interface for user management,
providing a comprehensive interface for managing users, sessions, and tokens.
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from .models import User, UserSession, EmailVerificationToken


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """
    Admin configuration for the custom User model.

    Extends Django's built-in UserAdmin to include organization-specific
    fields and email verification status.
    """

    list_display = [
        "email",
        "get_full_name",
        "organization",
        "is_organization_admin",
        "email_verified",
        "is_active",
        "created_at",
    ]
    list_filter = [
        "is_active",
        "is_staff",
        "is_superuser",
        "is_organization_admin",
        "email_verified",
        "organization",
        "created_at",
    ]
    search_fields = ["email", "first_name", "last_name", "username"]
    readonly_fields = ["created_at", "updated_at", "last_login", "email_verified_at"]
    ordering = ["-created_at"]

    fieldsets = (
        (
            "Personal Information",
            {"fields": ("email", "username", "first_name", "last_name")},
        ),
        ("Organization", {"fields": ("organization", "is_organization_admin")}),
        (
            "Email Verification",
            {
                "fields": ("email_verified", "email_verified_at"),
                "classes": ("collapse",),
            },
        ),
        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                ),
                "classes": ("collapse",),
            },
        ),
        (
            "Security",
            {"fields": ("last_login", "last_login_ip"), "classes": ("collapse",)},
        ),
        (
            "Timestamps",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    add_fieldsets = (
        (
            "Required Information",
            {
                "classes": ("wide",),
                "fields": (
                    "email",
                    "username",
                    "first_name",
                    "last_name",
                    "password1",
                    "password2",
                ),
            },
        ),
        (
            "Organization",
            {
                "fields": ("organization", "is_organization_admin"),
            },
        ),
        (
            "Permissions",
            {
                "fields": ("is_active", "is_staff", "is_superuser"),
            },
        ),
    )

    def get_full_name(self, obj):
        """Display the user's full name."""
        return obj.get_full_name()

    get_full_name.short_description = "Full Name"


@admin.register(UserSession)
class UserSessionAdmin(admin.ModelAdmin):
    """
    Admin configuration for UserSession model.

    Provides session management capabilities with user filtering,
    activity tracking, and security monitoring.
    """

    list_display = [
        "user",
        "ip_address",
        "user_agent_short",
        "is_active",
        "created_at",
        "last_activity",
    ]
    list_filter = ["is_active", "created_at", "last_activity", "user__organization"]
    search_fields = [
        "user__email",
        "user__first_name",
        "user__last_name",
        "ip_address",
        "session_key",
    ]
    readonly_fields = ["created_at", "last_activity", "session_key"]

    fieldsets = (
        ("Session Information", {"fields": ("user", "session_key", "is_active")}),
        ("Client Information", {"fields": ("ip_address", "user_agent")}),
        (
            "Timestamps",
            {"fields": ("created_at", "last_activity"), "classes": ("collapse",)},
        ),
    )

    def user_agent_short(self, obj):
        """Display a shortened version of the user agent."""
        if len(obj.user_agent) > 50:
            return obj.user_agent[:47] + "..."
        return obj.user_agent

    user_agent_short.short_description = "User Agent"

    actions = ["deactivate_sessions"]

    def deactivate_sessions(self, request, queryset):
        """Admin action to deactivate selected sessions."""
        updated = queryset.update(is_active=False)
        self.message_user(
            request, f"{updated} session(s) were successfully deactivated."
        )

    deactivate_sessions.short_description = "Deactivate selected sessions"


@admin.register(EmailVerificationToken)
class EmailVerificationTokenAdmin(admin.ModelAdmin):
    """
    Admin configuration for EmailVerificationToken model.

    Provides token management for email verification processes.
    """

    list_display = [
        "user",
        "email",
        "token_short",
        "is_valid_display",
        "created_at",
        "expires_at",
        "used_at",
    ]
    list_filter = ["created_at", "expires_at", "used_at", "user__organization"]
    search_fields = [
        "user__email",
        "user__first_name",
        "user__last_name",
        "email",
        "token",
    ]
    readonly_fields = ["created_at", "used_at", "is_valid_display"]

    fieldsets = (
        ("Token Information", {"fields": ("user", "email", "token")}),
        ("Validity", {"fields": ("expires_at", "is_valid_display")}),
        ("Usage", {"fields": ("used_at",), "classes": ("collapse",)}),
        ("Timestamps", {"fields": ("created_at",), "classes": ("collapse",)}),
    )

    def token_short(self, obj):
        """Display a shortened version of the token."""
        return f"{obj.token[:8]}..."

    token_short.short_description = "Token"

    def is_valid_display(self, obj):
        """Display token validity with color coding."""
        if obj.is_valid():
            return format_html('<span style="color: green;">Valid</span>')
        elif obj.is_used():
            return format_html('<span style="color: blue;">Used</span>')
        else:
            return format_html('<span style="color: red;">Expired</span>')

    is_valid_display.short_description = "Status"
