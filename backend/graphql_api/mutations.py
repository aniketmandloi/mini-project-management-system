"""
GraphQL mutations for CRUD operations.

This module defines all GraphQL mutations for creating, updating, and deleting
organizations, projects, tasks, and comments with proper validation and permissions.
"""

import graphene
from graphql import GraphQLError
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from core.models import Organization, Project, Task, TaskComment
from .types import (
    OrganizationType,
    ProjectType,
    TaskType,
    TaskCommentType,
    ProjectStatusEnum,
    TaskStatusEnum,
)
from .validators import (
    validate_organization_input,
    validate_project_input,
    validate_task_input,
    validate_comment_input,
)
from .permissions import (
    require_organization_admin,
    require_organization_member,
    can_edit_project,
    can_edit_task,
    can_edit_comment,
)
from .middleware import get_organization_from_context, get_user_from_context

User = get_user_model()


# Input Types for Mutations
class OrganizationInput(graphene.InputObjectType):
    """Input type for organization creation and updates."""

    name = graphene.String(required=True, description="Organization name")
    slug = graphene.String(required=True, description="URL-friendly unique identifier")
    contact_email = graphene.String(required=True, description="Primary contact email")
    description = graphene.String(description="Organization description")


class ProjectInput(graphene.InputObjectType):
    """Input type for project creation and updates."""

    name = graphene.String(required=True, description="Project name")
    description = graphene.String(description="Project description")
    status = graphene.Field(ProjectStatusEnum, description="Project status")
    due_date = graphene.Date(description="Project due date")


class TaskInput(graphene.InputObjectType):
    """Input type for task creation and updates."""

    title = graphene.String(required=True, description="Task title")
    description = graphene.String(description="Task description")
    status = graphene.Field(TaskStatusEnum, description="Task status")
    assignee_email = graphene.String(description="Assignee email address")
    due_date = graphene.DateTime(description="Task due date and time")
    project_id = graphene.ID(
        required=True, description="Project ID this task belongs to"
    )


class TaskCommentInput(graphene.InputObjectType):
    """Input type for task comment creation and updates."""

    content = graphene.String(required=True, description="Comment content")
    task_id = graphene.ID(required=True, description="Task ID this comment belongs to")


# Organization Mutations
class CreateOrganization(graphene.Mutation):
    """Mutation to create a new organization."""

    class Arguments:
        input = OrganizationInput(required=True)

    organization = graphene.Field(OrganizationType)
    success = graphene.Boolean()
    errors = graphene.List(graphene.String)

    @staticmethod
    def mutate(root, info, input):
        """Create a new organization."""
        try:
            # Validate input
            errors = validate_organization_input(input)
            if errors:
                return CreateOrganization(success=False, errors=errors)

            user = get_user_from_context(info)

            # Check if slug is unique
            if Organization.objects.filter(slug=input.slug).exists():
                return CreateOrganization(
                    success=False, errors=["Organization with this slug already exists"]
                )

            # Create organization
            with transaction.atomic():
                organization = Organization.objects.create(
                    name=input.name,
                    slug=input.slug,
                    contact_email=input.contact_email,
                    description=input.get("description", ""),
                )

                # Make the creator an admin of the organization
                user.organization = organization
                user.is_organization_admin = True
                user.save()

            return CreateOrganization(
                organization=organization, success=True, errors=[]
            )

        except Exception as e:
            return CreateOrganization(success=False, errors=[str(e)])


class UpdateOrganization(graphene.Mutation):
    """Mutation to update an existing organization."""

    class Arguments:
        id = graphene.ID(required=True)
        input = OrganizationInput(required=True)

    organization = graphene.Field(OrganizationType)
    success = graphene.Boolean()
    errors = graphene.List(graphene.String)

    @staticmethod
    @require_organization_admin
    def mutate(root, info, id, input):
        """Update an existing organization."""
        try:
            organization = get_organization_from_context(info)

            if str(organization.id) != str(id):
                return UpdateOrganization(
                    success=False, errors=["Cannot update different organization"]
                )

            # Validate input
            errors = validate_organization_input(input, organization)
            if errors:
                return UpdateOrganization(success=False, errors=errors)

            # Check if slug is unique (excluding current organization)
            if (
                input.slug != organization.slug
                and Organization.objects.filter(slug=input.slug).exists()
            ):
                return UpdateOrganization(
                    success=False, errors=["Organization with this slug already exists"]
                )

            # Update organization
            organization.name = input.name
            organization.slug = input.slug
            organization.contact_email = input.contact_email
            organization.description = input.get(
                "description", organization.description
            )
            organization.save()

            return UpdateOrganization(
                organization=organization, success=True, errors=[]
            )

        except Exception as e:
            return UpdateOrganization(success=False, errors=[str(e)])


# Project Mutations
class CreateProject(graphene.Mutation):
    """Mutation to create a new project."""

    class Arguments:
        input = ProjectInput(required=True)

    project = graphene.Field(ProjectType)
    success = graphene.Boolean()
    errors = graphene.List(graphene.String)

    @staticmethod
    @require_organization_member
    def mutate(root, info, input):
        """Create a new project."""
        try:
            organization = get_organization_from_context(info)

            # Validate input
            errors = validate_project_input(input)
            if errors:
                return CreateProject(success=False, errors=errors)

            # Check if project name is unique within organization
            if Project.objects.filter(
                organization=organization, name=input.name
            ).exists():
                return CreateProject(
                    success=False,
                    errors=["Project with this name already exists in organization"],
                )

            # Create project
            project = Project.objects.create(
                organization=organization,
                name=input.name,
                description=input.get("description", ""),
                status=input.get("status", "ACTIVE"),
                due_date=input.get("due_date"),
            )

            return CreateProject(project=project, success=True, errors=[])

        except Exception as e:
            return CreateProject(success=False, errors=[str(e)])


class UpdateProject(graphene.Mutation):
    """Mutation to update an existing project."""

    class Arguments:
        id = graphene.ID(required=True)
        input = ProjectInput(required=True)

    project = graphene.Field(ProjectType)
    success = graphene.Boolean()
    errors = graphene.List(graphene.String)

    @staticmethod
    @require_organization_member
    def mutate(root, info, id, input):
        """Update an existing project."""
        try:
            organization = get_organization_from_context(info)

            # Get project and verify permissions
            try:
                project = Project.objects.get(id=id, organization=organization)
            except Project.DoesNotExist:
                return UpdateProject(success=False, errors=["Project not found"])

            # Check permissions
            if not can_edit_project(get_user_from_context(info), project):
                return UpdateProject(success=False, errors=["Permission denied"])

            # Validate input
            errors = validate_project_input(input, project)
            if errors:
                return UpdateProject(success=False, errors=errors)

            # Check if project name is unique within organization (excluding current)
            if (
                input.name != project.name
                and Project.objects.filter(
                    organization=organization, name=input.name
                ).exists()
            ):
                return UpdateProject(
                    success=False,
                    errors=["Project with this name already exists in organization"],
                )

            # Update project
            project.name = input.name
            project.description = input.get("description", project.description)
            project.status = input.get("status", project.status)
            project.due_date = input.get("due_date", project.due_date)
            project.save()

            return UpdateProject(project=project, success=True, errors=[])

        except Exception as e:
            return UpdateProject(success=False, errors=[str(e)])


class DeleteProject(graphene.Mutation):
    """Mutation to delete a project."""

    class Arguments:
        id = graphene.ID(required=True)

    success = graphene.Boolean()
    errors = graphene.List(graphene.String)

    @staticmethod
    @require_organization_member
    def mutate(root, info, id):
        """Delete a project."""
        try:
            organization = get_organization_from_context(info)

            # Get project and verify permissions
            try:
                project = Project.objects.get(id=id, organization=organization)
            except Project.DoesNotExist:
                return DeleteProject(success=False, errors=["Project not found"])

            # Check permissions
            user = get_user_from_context(info)
            if not can_edit_project(user, project):
                return DeleteProject(success=False, errors=["Permission denied"])

            # Delete project (cascade will handle tasks and comments)
            project.delete()

            return DeleteProject(success=True, errors=[])

        except Exception as e:
            return DeleteProject(success=False, errors=[str(e)])


# Task Mutations
class CreateTask(graphene.Mutation):
    """Mutation to create a new task."""

    class Arguments:
        input = TaskInput(required=True)

    task = graphene.Field(TaskType)
    success = graphene.Boolean()
    errors = graphene.List(graphene.String)

    @staticmethod
    @require_organization_member
    def mutate(root, info, input):
        """Create a new task."""
        try:
            organization = get_organization_from_context(info)

            # Validate input
            errors = validate_task_input(input, organization)
            if errors:
                return CreateTask(success=False, errors=errors)

            # Get project and verify it belongs to organization
            try:
                project = Project.objects.get(
                    id=input.project_id, organization=organization
                )
            except Project.DoesNotExist:
                return CreateTask(success=False, errors=["Project not found"])

            # Create task
            task = Task.objects.create(
                project=project,
                title=input.title,
                description=input.get("description", ""),
                status=input.get("status", "TODO"),
                assignee_email=input.get("assignee_email", ""),
                due_date=input.get("due_date"),
            )

            return CreateTask(task=task, success=True, errors=[])

        except Exception as e:
            return CreateTask(success=False, errors=[str(e)])


class UpdateTask(graphene.Mutation):
    """Mutation to update an existing task."""

    class Arguments:
        id = graphene.ID(required=True)
        input = TaskInput(required=True)

    task = graphene.Field(TaskType)
    success = graphene.Boolean()
    errors = graphene.List(graphene.String)

    @staticmethod
    @require_organization_member
    def mutate(root, info, id, input):
        """Update an existing task."""
        try:
            organization = get_organization_from_context(info)

            # Get task and verify permissions
            try:
                task = Task.objects.get(id=id, project__organization=organization)
            except Task.DoesNotExist:
                return UpdateTask(success=False, errors=["Task not found"])

            # Check permissions
            if not can_edit_task(get_user_from_context(info), task):
                return UpdateTask(success=False, errors=["Permission denied"])

            # Validate input
            errors = validate_task_input(input, organization, task)
            if errors:
                return UpdateTask(success=False, errors=errors)

            # If project is being changed, verify new project
            if input.project_id and str(input.project_id) != str(task.project_id):
                try:
                    new_project = Project.objects.get(
                        id=input.project_id, organization=organization
                    )
                    task.project = new_project
                except Project.DoesNotExist:
                    return UpdateTask(success=False, errors=["New project not found"])

            # Update task
            task.title = input.title
            task.description = input.get("description", task.description)
            task.status = input.get("status", task.status)
            task.assignee_email = input.get("assignee_email", task.assignee_email)
            task.due_date = input.get("due_date", task.due_date)
            task.save()

            return UpdateTask(task=task, success=True, errors=[])

        except Exception as e:
            return UpdateTask(success=False, errors=[str(e)])


class DeleteTask(graphene.Mutation):
    """Mutation to delete a task."""

    class Arguments:
        id = graphene.ID(required=True)

    success = graphene.Boolean()
    errors = graphene.List(graphene.String)

    @staticmethod
    @require_organization_member
    def mutate(root, info, id):
        """Delete a task."""
        try:
            organization = get_organization_from_context(info)

            # Get task and verify permissions
            try:
                task = Task.objects.get(id=id, project__organization=organization)
            except Task.DoesNotExist:
                return DeleteTask(success=False, errors=["Task not found"])

            # Check permissions
            user = get_user_from_context(info)
            if not can_edit_task(user, task):
                return DeleteTask(success=False, errors=["Permission denied"])

            # Delete task (cascade will handle comments)
            task.delete()

            return DeleteTask(success=True, errors=[])

        except Exception as e:
            return DeleteTask(success=False, errors=[str(e)])


# Task Comment Mutations
class CreateTaskComment(graphene.Mutation):
    """Mutation to create a new task comment."""

    class Arguments:
        input = TaskCommentInput(required=True)

    comment = graphene.Field(TaskCommentType)
    success = graphene.Boolean()
    errors = graphene.List(graphene.String)

    @staticmethod
    @require_organization_member
    def mutate(root, info, input):
        """Create a new task comment."""
        try:
            organization = get_organization_from_context(info)
            user = get_user_from_context(info)

            # Validate input
            errors = validate_comment_input(input)
            if errors:
                return CreateTaskComment(success=False, errors=errors)

            # Get task and verify it belongs to organization
            try:
                task = Task.objects.get(
                    id=input.task_id, project__organization=organization
                )
            except Task.DoesNotExist:
                return CreateTaskComment(success=False, errors=["Task not found"])

            # Create comment
            comment = TaskComment.objects.create(
                task=task,
                content=input.content,
                author_email=user.email,
            )

            return CreateTaskComment(comment=comment, success=True, errors=[])

        except Exception as e:
            return CreateTaskComment(success=False, errors=[str(e)])


class UpdateTaskComment(graphene.Mutation):
    """Mutation to update an existing task comment."""

    class Arguments:
        id = graphene.ID(required=True)
        input = TaskCommentInput(required=True)

    comment = graphene.Field(TaskCommentType)
    success = graphene.Boolean()
    errors = graphene.List(graphene.String)

    @staticmethod
    @require_organization_member
    def mutate(root, info, id, input):
        """Update an existing task comment."""
        try:
            organization = get_organization_from_context(info)

            # Get comment and verify permissions
            try:
                comment = TaskComment.objects.get(
                    id=id, task__project__organization=organization
                )
            except TaskComment.DoesNotExist:
                return UpdateTaskComment(success=False, errors=["Comment not found"])

            # Check permissions
            if not can_edit_comment(get_user_from_context(info), comment):
                return UpdateTaskComment(success=False, errors=["Permission denied"])

            # Validate input
            errors = validate_comment_input(input, comment)
            if errors:
                return UpdateTaskComment(success=False, errors=errors)

            # Update comment
            comment.content = input.content
            comment.save()

            return UpdateTaskComment(comment=comment, success=True, errors=[])

        except Exception as e:
            return UpdateTaskComment(success=False, errors=[str(e)])


class DeleteTaskComment(graphene.Mutation):
    """Mutation to delete a task comment."""

    class Arguments:
        id = graphene.ID(required=True)

    success = graphene.Boolean()
    errors = graphene.List(graphene.String)

    @staticmethod
    @require_organization_member
    def mutate(root, info, id):
        """Delete a task comment."""
        try:
            organization = get_organization_from_context(info)

            # Get comment and verify permissions
            try:
                comment = TaskComment.objects.get(
                    id=id, task__project__organization=organization
                )
            except TaskComment.DoesNotExist:
                return DeleteTaskComment(success=False, errors=["Comment not found"])

            # Check permissions
            user = get_user_from_context(info)
            if not can_edit_comment(user, comment):
                return DeleteTaskComment(success=False, errors=["Permission denied"])

            # Delete comment
            comment.delete()

            return DeleteTaskComment(success=True, errors=[])

        except Exception as e:
            return DeleteTaskComment(success=False, errors=[str(e)])


# Import authentication mutations
from .auth_mutations import (
    Register,
    Login,
    RefreshToken,
    Logout,
    VerifyEmail,
    ResendVerificationEmail,
)


# Main Mutation class combining all mutations
class Mutation(graphene.ObjectType):
    """
    Main GraphQL mutation class combining all CRUD operations.

    This class provides all the mutations for managing organizations,
    projects, tasks, and comments in the project management system.
    """

    # Authentication mutations
    register = Register.Field()
    login = Login.Field()
    refresh_token = RefreshToken.Field()
    logout = Logout.Field()
    verify_email = VerifyEmail.Field()
    resend_verification_email = ResendVerificationEmail.Field()

    # Organization mutations
    create_organization = CreateOrganization.Field()
    update_organization = UpdateOrganization.Field()

    # Project mutations
    create_project = CreateProject.Field()
    update_project = UpdateProject.Field()
    delete_project = DeleteProject.Field()

    # Task mutations
    create_task = CreateTask.Field()
    update_task = UpdateTask.Field()
    delete_task = DeleteTask.Field()

    # Task comment mutations
    create_task_comment = CreateTaskComment.Field()
    update_task_comment = UpdateTaskComment.Field()
    delete_task_comment = DeleteTaskComment.Field()
