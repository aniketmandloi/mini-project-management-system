"""
Health check URL configuration for core application.

This module defines URL patterns for health check and monitoring endpoints.
"""

from django.urls import path
from . import health_views

app_name = "health"

urlpatterns = [
    # Health check endpoints
    path("", health_views.HealthCheckView.as_view(), name="health_check"),
    path("db/", health_views.DatabaseHealthView.as_view(), name="database_health"),
    path("ready/", health_views.ReadinessCheckView.as_view(), name="readiness_check"),
]
