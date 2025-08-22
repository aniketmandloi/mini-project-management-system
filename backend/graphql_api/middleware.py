"""
GraphQL middleware for authentication and organization context.

This module provides GraphQL middleware to handle authentication
and organization context in GraphQL resolvers.
"""

from django.contrib.auth import get_user_model
from django.http import HttpRequest
from graphql import GraphQLError
from rest_framework.exceptions import AuthenticationFailed

User = get_user_model()


class AuthenticationMiddleware:
    """
    GraphQL middleware for JWT authentication.
    
    This middleware authenticates users using JWT tokens and adds
    user information to the GraphQL context.
    """
    
    def resolve(self, next, root, info, **args):
        """
        Resolve method for authentication middleware.
        
        Args:
            next: Next resolver in the chain
            root: Root value for the resolver
            info: GraphQL resolve info
            **args: Additional arguments
            
        Returns:
            The result of the next resolver
        """
        request = info.context
        
        # Skip authentication for introspection queries
        if info.field_name in ['__schema', '__type']:
            return next(root, info, **args)
        
        # Skip authentication for public mutations/queries
        public_operations = ['login', 'register', 'refreshToken']
        if info.field_name in public_operations:
            return next(root, info, **args)
        
        # Check if user is authenticated
        if not hasattr(request, 'user') or not request.user.is_authenticated:
            raise GraphQLError('Authentication required')
        
        return next(root, info, **args)


class OrganizationMiddleware:
    """
    GraphQL middleware for organization context.
    
    This middleware ensures that all GraphQL operations are scoped
    to the user's organization context.
    """
    
    def resolve(self, next, root, info, **args):
        """
        Resolve method for organization middleware.
        
        Args:
            next: Next resolver in the chain
            root: Root value for the resolver
            info: GraphQL resolve info
            **args: Additional arguments
            
        Returns:
            The result of the next resolver
        """
        request = info.context
        
        # Skip organization context for certain operations
        skip_operations = ['login', 'register', 'refreshToken', '__schema', '__type']
        if info.field_name in skip_operations:
            return next(root, info, **args)
        
        # Ensure user has organization context
        if hasattr(request, 'user') and request.user.is_authenticated:
            if not hasattr(request, 'organization') or not request.organization:
                if not request.user.organization:
                    raise GraphQLError('No organization context available')
                request.organization = request.user.organization
        
        return next(root, info, **args)


def get_organization_from_context(info):
    """
    Extract organization from GraphQL context.
    
    Args:
        info: GraphQL resolve info
        
    Returns:
        Organization: The organization from the request context
        
    Raises:
        GraphQLError: If no organization context is available
    """
    request = info.context
    
    if not hasattr(request, 'organization') or not request.organization:
        raise GraphQLError('No organization context available')
    
    return request.organization


def get_user_from_context(info):
    """
    Extract authenticated user from GraphQL context.
    
    Args:
        info: GraphQL resolve info
        
    Returns:
        User: The authenticated user from the request context
        
    Raises:
        GraphQLError: If user is not authenticated
    """
    request = info.context
    
    if not hasattr(request, 'user') or not request.user.is_authenticated:
        raise GraphQLError('Authentication required')
    
    return request.user