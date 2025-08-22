"""
Organization context middleware for multi-tenant architecture.

This module provides middleware to automatically inject organization context
into requests based on user authentication and request headers.
"""

from django.utils.deprecation import MiddlewareMixin
from django.http import JsonResponse
from rest_framework import status


class OrganizationMiddleware(MiddlewareMixin):
    """
    Middleware to inject organization context into requests.
    
    This middleware ensures that all requests are scoped to the appropriate
    organization based on the authenticated user and request headers.
    """
    
    def process_request(self, request):
        """
        Process the request to add organization context.
        
        Args:
            request: The HTTP request object
        """
        # Initialize organization context
        request.organization = None
        
        # Skip organization context for certain paths
        skip_paths = [
            '/admin/',
            '/health/',
            '/api/auth/login/',
            '/api/auth/register/',
            '/graphql/',  # GraphQL will handle its own context
        ]
        
        if any(request.path.startswith(path) for path in skip_paths):
            return None
        
        # For authenticated users, set organization context
        if hasattr(request, 'user') and request.user.is_authenticated:
            # Try to get organization from header first
            org_slug = request.META.get('HTTP_X_ORGANIZATION')
            
            if org_slug:
                # Validate user has access to this organization
                if request.user.can_access_organization_by_slug(org_slug):
                    try:
                        from .models import Organization
                        request.organization = Organization.objects.get_by_slug(org_slug)
                    except Organization.DoesNotExist:
                        return JsonResponse(
                            {'error': 'Organization not found'},
                            status=status.HTTP_404_NOT_FOUND
                        )
                else:
                    return JsonResponse(
                        {'error': 'Access denied to organization'},
                        status=status.HTTP_403_FORBIDDEN
                    )
            else:
                # Use user's default organization
                request.organization = request.user.organization
        
        return None
    
    def process_response(self, request, response):
        """
        Process the response to add organization-related headers.
        
        Args:
            request: The HTTP request object
            response: The HTTP response object
            
        Returns:
            HttpResponse: The modified response
        """
        # Add organization context to response headers for debugging
        if hasattr(request, 'organization') and request.organization:
            response['X-Current-Organization'] = request.organization.slug
        
        return response