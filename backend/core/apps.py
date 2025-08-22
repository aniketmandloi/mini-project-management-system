"""
Core application configuration.

This module defines the configuration for the core Django application
which handles the main business logic for organizations, projects, and tasks.
"""

from django.apps import AppConfig


class CoreConfig(AppConfig):
    """
    Configuration class for the core application.
    
    This class defines the configuration settings for the core app,
    including the default auto field type and the application name.
    """
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core'
    verbose_name = 'Core'
    
    def ready(self):
        """
        Called when the application is ready.
        
        This method is called when Django starts up and the application
        is ready to be used. It can be used to register signal handlers
        or perform other initialization tasks.
        """
        pass