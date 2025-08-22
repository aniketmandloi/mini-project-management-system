"""
URL configuration for core application.

This module defines URL patterns for core business logic endpoints.
"""

from django.urls import path
from . import views

app_name = "core"

urlpatterns = [
    # Organization endpoints
    path(
        "organizations/", views.OrganizationListView.as_view(), name="organization_list"
    ),
    path(
        "organizations/<int:pk>/",
        views.OrganizationDetailView.as_view(),
        name="organization_detail",
    ),
    # Project endpoints
    path("projects/", views.ProjectListView.as_view(), name="project_list"),
    path(
        "projects/<int:pk>/", views.ProjectDetailView.as_view(), name="project_detail"
    ),
    # Task endpoints
    path("tasks/", views.TaskListView.as_view(), name="task_list"),
    path("tasks/<int:pk>/", views.TaskDetailView.as_view(), name="task_detail"),
    # Task comment endpoints
    path(
        "tasks/<int:task_pk>/comments/",
        views.TaskCommentListView.as_view(),
        name="task_comment_list",
    ),
    path(
        "comments/<int:pk>/",
        views.TaskCommentDetailView.as_view(),
        name="task_comment_detail",
    ),
]
