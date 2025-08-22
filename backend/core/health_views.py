"""
Health check views for core application.

This module contains view classes for health check and monitoring endpoints.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db import connection
from django.core.cache import cache


class HealthCheckView(APIView):
    """Basic health check endpoint."""

    def get(self, request):
        return Response(
            {"status": "healthy", "message": "Project Management System is running"},
            status=status.HTTP_200_OK,
        )


class DatabaseHealthView(APIView):
    """Database connectivity health check."""

    def get(self, request):
        try:
            # Test database connection
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()

            return Response(
                {"status": "healthy", "message": "Database connection is working"},
                status=status.HTTP_200_OK,
            )
        except Exception as e:
            return Response(
                {
                    "status": "unhealthy",
                    "message": f"Database connection failed: {str(e)}",
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )


class ReadinessCheckView(APIView):
    """Readiness check for deployment."""

    def get(self, request):
        checks = {"database": False, "cache": False}

        # Check database
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
            checks["database"] = True
        except Exception:
            pass

        # Check cache
        try:
            cache.set("health_check", "test", 10)
            cache.get("health_check")
            checks["cache"] = True
        except Exception:
            pass

        all_healthy = all(checks.values())

        return Response(
            {"status": "ready" if all_healthy else "not_ready", "checks": checks},
            status=(
                status.HTTP_200_OK
                if all_healthy
                else status.HTTP_503_SERVICE_UNAVAILABLE
            ),
        )
