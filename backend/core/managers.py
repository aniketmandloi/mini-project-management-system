"""
Custom model managers for multi-tenant architecture.

This module provides custom model managers that automatically filter
data based on the current organization context, ensuring proper
data isolation in the multi-tenant system.
"""

from django.db import models
from django.core.exceptions import ValidationError


class OrganizationManager(models.Manager):
    """
    Custom manager for Organization model.
    
    Provides utility methods for organization management and validation.
    """
    
    def get_by_slug(self, slug):
        """
        Get an organization by its slug.
        
        Args:
            slug: The organization slug to search for
            
        Returns:
            Organization instance
            
        Raises:
            Organization.DoesNotExist: If organization with slug doesn't exist
        """
        return self.get(slug=slug, is_active=True)
    
    def active(self):
        """
        Return only active organizations.
        
        Returns:
            QuerySet of active organizations
        """
        return self.filter(is_active=True)


class OrganizationScopedManager(models.Manager):
    """
    Base manager for models that are scoped to an organization.
    
    This manager provides methods to filter data based on organization
    context, ensuring proper multi-tenant data isolation.
    """
    
    def for_organization(self, organization):
        """
        Filter queryset to only include objects for the specified organization.
        
        Args:
            organization: Organization instance or ID
            
        Returns:
            QuerySet filtered by organization
        """
        if hasattr(organization, 'id'):
            organization_id = organization.id
        else:
            organization_id = organization
            
        return self.filter(organization_id=organization_id)
    
    def get_for_organization(self, organization, **kwargs):
        """
        Get a single object for the specified organization.
        
        Args:
            organization: Organization instance or ID
            **kwargs: Additional filter parameters
            
        Returns:
            Model instance
            
        Raises:
            Model.DoesNotExist: If object doesn't exist
            Model.MultipleObjectsReturned: If multiple objects found
        """
        return self.for_organization(organization).get(**kwargs)


class ProjectManager(OrganizationScopedManager):
    """
    Custom manager for Project model.
    
    Provides project-specific query methods with organization scoping.
    """
    
    def active_for_organization(self, organization):
        """
        Get active projects for an organization.
        
        Args:
            organization: Organization instance or ID
            
        Returns:
            QuerySet of active projects
        """
        return self.for_organization(organization).filter(status='ACTIVE')
    
    def completed_for_organization(self, organization):
        """
        Get completed projects for an organization.
        
        Args:
            organization: Organization instance or ID
            
        Returns:
            QuerySet of completed projects
        """
        return self.for_organization(organization).filter(status='COMPLETED')
    
    def with_task_counts(self, organization=None):
        """
        Annotate projects with task counts.
        
        Args:
            organization: Optional organization to filter by
            
        Returns:
            QuerySet with task count annotations
        """
        queryset = self.all()
        if organization:
            queryset = self.for_organization(organization)
            
        return queryset.annotate(
            total_tasks=models.Count('tasks'),
            completed_tasks=models.Count(
                'tasks',
                filter=models.Q(tasks__status='DONE')
            )
        )


class TaskManager(models.Manager):
    """
    Custom manager for Task model.
    
    Provides task-specific query methods with project and organization scoping.
    """
    
    def for_project(self, project):
        """
        Filter tasks for a specific project.
        
        Args:
            project: Project instance or ID
            
        Returns:
            QuerySet filtered by project
        """
        if hasattr(project, 'id'):
            project_id = project.id
        else:
            project_id = project
            
        return self.filter(project_id=project_id)
    
    def for_organization(self, organization):
        """
        Filter tasks for a specific organization.
        
        Args:
            organization: Organization instance or ID
            
        Returns:
            QuerySet filtered by organization
        """
        if hasattr(organization, 'id'):
            organization_id = organization.id
        else:
            organization_id = organization
            
        return self.filter(project__organization_id=organization_id)
    
    def by_status(self, status):
        """
        Filter tasks by status.
        
        Args:
            status: Task status (TODO, IN_PROGRESS, DONE)
            
        Returns:
            QuerySet filtered by status
        """
        return self.filter(status=status)
    
    def assigned_to(self, email):
        """
        Filter tasks assigned to a specific email.
        
        Args:
            email: Assignee email address
            
        Returns:
            QuerySet filtered by assignee
        """
        return self.filter(assignee_email=email)
    
    def overdue(self):
        """
        Get overdue tasks (past due date and not completed).
        
        Returns:
            QuerySet of overdue tasks
        """
        from django.utils import timezone
        return self.filter(
            due_date__lt=timezone.now(),
            status__in=['TODO', 'IN_PROGRESS']
        )
    
    def for_organization_with_status(self, organization, status):
        """
        Get tasks for an organization with a specific status.
        
        Args:
            organization: Organization instance or ID
            status: Task status
            
        Returns:
            QuerySet filtered by organization and status
        """
        return self.for_organization(organization).by_status(status)


class TaskCommentManager(models.Manager):
    """
    Custom manager for TaskComment model.
    
    Provides comment-specific query methods with task and organization scoping.
    """
    
    def for_task(self, task):
        """
        Filter comments for a specific task.
        
        Args:
            task: Task instance or ID
            
        Returns:
            QuerySet filtered by task
        """
        if hasattr(task, 'id'):
            task_id = task.id
        else:
            task_id = task
            
        return self.filter(task_id=task_id)
    
    def for_organization(self, organization):
        """
        Filter comments for a specific organization.
        
        Args:
            organization: Organization instance or ID
            
        Returns:
            QuerySet filtered by organization
        """
        if hasattr(organization, 'id'):
            organization_id = organization.id
        else:
            organization_id = organization
            
        return self.filter(task__project__organization_id=organization_id)
    
    def by_author(self, email):
        """
        Filter comments by author email.
        
        Args:
            email: Author email address
            
        Returns:
            QuerySet filtered by author
        """
        return self.filter(author_email=email)
    
    def recent(self, limit=10):
        """
        Get recent comments with optional limit.
        
        Args:
            limit: Maximum number of comments to return
            
        Returns:
            QuerySet of recent comments
        """
        return self.order_by('-created_at')[:limit]