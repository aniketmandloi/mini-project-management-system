"""
URL configuration for accounts application.

This module defines URL patterns for authentication and user management endpoints.
"""

from django.urls import path
from . import views

app_name = "accounts"

urlpatterns = [
    # Authentication endpoints
    path("login/", views.LoginView.as_view(), name="login"),
    path("logout/", views.LogoutView.as_view(), name="logout"),
    path("refresh/", views.RefreshTokenView.as_view(), name="refresh_token"),
    # User management endpoints
    path("profile/", views.UserProfileView.as_view(), name="profile"),
    path(
        "change-password/", views.ChangePasswordView.as_view(), name="change_password"
    ),
    # Email verification endpoints
    path("verify-email/", views.VerifyEmailView.as_view(), name="verify_email"),
    path(
        "resend-verification/",
        views.ResendVerificationView.as_view(),
        name="resend_verification",
    ),
]
