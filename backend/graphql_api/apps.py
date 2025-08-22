"""
GraphQL API application configuration.

This module defines the configuration for the GraphQL API Django application
which handles GraphQL schema, queries, mutations, and API middleware.
"""

from django.apps import AppConfig


class GraphqlApiConfig(AppConfig):
    """
    Configuration class for the GraphQL API application.
    
    This class defines the configuration settings for the GraphQL API app,
    including the default auto field type and the application name.
    """
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'graphql_api'
    verbose_name = 'GraphQL API'
    
    def ready(self):
        """
        Called when the application is ready.
        
        This method is called when Django starts up and the application
        is ready to be used. It can be used to register signal handlers
        or perform other initialization tasks.
        """
        pass