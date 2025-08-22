"""
Project Management System URL Configuration.

This module defines the main URL routing configuration for the project management system,
including GraphQL endpoints, admin interface, and API routes.
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from graphene_django.views import GraphQLView
from django.views.decorators.csrf import csrf_exempt


# Configure admin site headers
admin.site.site_header = "Project Management System Admin"
admin.site.site_title = "PMS Admin"
admin.site.index_title = "Welcome to Project Management System Administration"

urlpatterns = [
    # Admin interface
    path('admin/', admin.site.urls),
    
    # GraphQL endpoint
    path('graphql/', csrf_exempt(GraphQLView.as_view(graphiql=settings.DEBUG))),
    
    # API endpoints
    path('api/auth/', include('accounts.urls')),
    path('api/core/', include('core.urls')),
    
    # Health check endpoint
    path('health/', include('core.health_urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)