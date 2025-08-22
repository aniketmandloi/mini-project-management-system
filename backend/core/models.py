"""
Core models for the project management system.

This module defines the main data models including Organization, Project,
Task, and TaskComment with proper multi-tenant architecture support.
"""

from django.db import models
from django.utils import timezone
from django.core.validators import EmailValidator


class TimestampedModel(models.Model):
    """
    Abstract base model that provides created_at and updated_at timestamps.
    
    This model should be inherited by other models that need timestamp tracking.
    """
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        abstract = True


class Organization(TimestampedModel):
    """
    Organization model for multi-tenant architecture.
    
    Each organization represents a separate tenant in the system with
    isolated data access. All other models are scoped to an organization.
    """
    name = models.CharField(
        max_length=100,
        help_text="Name of the organization"
    )
    slug = models.SlugField(
        unique=True,
        help_text="URL-friendly unique identifier for the organization"
    )
    contact_email = models.EmailField(
        validators=[EmailValidator()],
        help_text="Primary contact email for the organization"
    )
    description = models.TextField(
        blank=True,
        help_text="Optional description of the organization"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether the organization is active"
    )
    
    objects = models.Manager()  # Use default manager for now
    
    class Meta:
        ordering = ['name']
        verbose_name = 'Organization'
        verbose_name_plural = 'Organizations'
    
    def __str__(self):
        return self.name


class Project(TimestampedModel):
    """
    Project model representing individual projects within an organization.
    
    Projects are scoped to organizations and contain tasks. Each project
    has a status, due date, and other metadata for project management.
    """
    
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('COMPLETED', 'Completed'),
        ('ON_HOLD', 'On Hold'),
        ('CANCELLED', 'Cancelled'),
    ]
    
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='projects',
        help_text="Organization this project belongs to"
    )
    name = models.CharField(
        max_length=200,
        help_text="Name of the project"
    )
    description = models.TextField(
        blank=True,
        help_text="Detailed description of the project"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='ACTIVE',
        help_text="Current status of the project"
    )
    due_date = models.DateField(
        null=True,
        blank=True,
        help_text="Target completion date for the project"
    )
    
    objects = models.Manager()  # Use default manager for now
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Project'
        verbose_name_plural = 'Projects'
        unique_together = ['organization', 'name']
    
    def __str__(self):
        return f"{self.organization.name} - {self.name}"
    
    @property
    def task_count(self):
        """Return the total number of tasks in this project."""
        return self.tasks.count()
    
    @property
    def completed_task_count(self):
        """Return the number of completed tasks in this project."""
        return self.tasks.filter(status='DONE').count()
    
    @property
    def completion_rate(self):
        """Return the completion rate as a percentage."""
        if self.task_count == 0:
            return 0
        return (self.completed_task_count / self.task_count) * 100


class Task(TimestampedModel):
    """
    Task model representing individual tasks within a project.
    
    Tasks are the smallest unit of work in the system and belong to projects.
    They have assignees, status tracking, and due dates.
    """
    
    STATUS_CHOICES = [
        ('TODO', 'To Do'),
        ('IN_PROGRESS', 'In Progress'),
        ('DONE', 'Done'),
    ]
    
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='tasks',
        help_text="Project this task belongs to"
    )
    title = models.CharField(
        max_length=200,
        help_text="Title of the task"
    )
    description = models.TextField(
        blank=True,
        help_text="Detailed description of the task"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='TODO',
        help_text="Current status of the task"
    )
    assignee_email = models.EmailField(
        blank=True,
        validators=[EmailValidator()],
        help_text="Email of the person assigned to this task"
    )
    due_date = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Due date and time for the task"
    )
    
    objects = models.Manager()  # Use default manager for now
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Task'
        verbose_name_plural = 'Tasks'
    
    def __str__(self):
        return f"{self.project.name} - {self.title}"
    
    @property
    def is_overdue(self):
        """Check if the task is overdue."""
        if not self.due_date:
            return False
        return self.due_date < timezone.now() and self.status != 'DONE'


class TaskComment(TimestampedModel):
    """
    TaskComment model for comments on tasks.
    
    Allows users to add comments to tasks for collaboration and
    communication about task progress and details.
    """
    
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='comments',
        help_text="Task this comment belongs to"
    )
    content = models.TextField(
        help_text="Content of the comment"
    )
    author_email = models.EmailField(
        validators=[EmailValidator()],
        help_text="Email of the comment author"
    )
    
    objects = models.Manager()  # Use default manager for now
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Task Comment'
        verbose_name_plural = 'Task Comments'
    
    def __str__(self):
        return f"Comment on {self.task.title} by {self.author_email}"