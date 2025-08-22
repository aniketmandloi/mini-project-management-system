"""
Django settings for project_management project.

This module contains all Django configuration settings for the project management system,
including database configuration, GraphQL setup, authentication, and multi-tenant support.
"""

import os
from pathlib import Path
from decouple import config

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Security Settings
SECRET_KEY = config(
    "SECRET_KEY", default="fn4xj=!6_!a=x@h@u#z&q0d*uv5nj_8trxs##6!qfn2ho@jkh$"
)
DEBUG = config("DEBUG", default=True, cast=bool)
ALLOWED_HOSTS = config(
    "ALLOWED_HOSTS",
    default="localhost,127.0.0.1",
    cast=lambda v: [s.strip() for s in v.split(",")],
)

# Application definition
DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "corsheaders",
    "graphene_django",
]

LOCAL_APPS = [
    "core",
    "accounts",
    "graphql_api",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "graphql_api.jwt_middleware.JWTAuthenticationMiddleware",  # JWT auth for GraphQL
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "project_management.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "project_management.wsgi.application"

# Database Configuration
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": config("DB_NAME", default="project_management_db"),
        "USER": config("DB_USER", default="postgres"),
        "PASSWORD": config("DB_PASSWORD", default=""),
        "HOST": config("DB_HOST", default="localhost"),
        "PORT": config("DB_PORT", default="5432"),
    }
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

# Internationalization
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_L10N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

# Media files
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# Django REST Framework Configuration
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication",
        "accounts.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
}

# GraphQL Configuration
GRAPHENE = {
    "SCHEMA": "graphql_api.schema.schema",
    "MIDDLEWARE": [
        "graphql_api.middleware.AuthenticationMiddleware",
        "graphql_api.middleware.OrganizationMiddleware",
    ],
}

# CORS Configuration
CORS_ALLOWED_ORIGINS = config(
    "CORS_ALLOWED_ORIGINS",
    default="http://localhost:3000,http://127.0.0.1:3000",
    cast=lambda v: [s.strip() for s in v.split(",")],
)

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_ALL_ORIGINS = DEBUG  # Only in development

# JWT Configuration
JWT_SECRET_KEY = config("JWT_SECRET_KEY", default=SECRET_KEY)
JWT_ALGORITHM = config("JWT_ALGORITHM", default="HS256")
JWT_ACCESS_TOKEN_LIFETIME_MINUTES = config(
    "JWT_ACCESS_TOKEN_LIFETIME_MINUTES", default=60, cast=int
)  # 1 hour
JWT_REFRESH_TOKEN_LIFETIME_DAYS = config(
    "JWT_REFRESH_TOKEN_LIFETIME_DAYS", default=7, cast=int
)  # 7 days

# Authentication Configuration
AUTH_USER_MODEL = "accounts.User"

# Site Configuration
SITE_NAME = config("SITE_NAME", default="Project Management System")
FRONTEND_URL = config("FRONTEND_URL", default="http://localhost:3000")
DEFAULT_FROM_EMAIL = config(
    "DEFAULT_FROM_EMAIL", default="noreply@projectmanagement.local"
)

# Email Configuration (for production)
if not DEBUG:
    EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
    EMAIL_HOST = config("EMAIL_HOST", default="smtp.gmail.com")
    EMAIL_PORT = config("EMAIL_PORT", default=587, cast=int)
    EMAIL_USE_TLS = config("EMAIL_USE_TLS", default=True, cast=bool)
    EMAIL_HOST_USER = config("EMAIL_HOST_USER", default="")
    EMAIL_HOST_PASSWORD = config("EMAIL_HOST_PASSWORD", default="")
else:
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# Logging Configuration
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {module} {process:d} {thread:d} {message}",
            "style": "{",
        },
        "simple": {
            "format": "{levelname} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "file": {
            "level": "INFO",
            "class": "logging.FileHandler",
            "filename": BASE_DIR / "logs" / "django.log",
            "formatter": "verbose",
        },
        "console": {
            "level": "DEBUG",
            "class": "logging.StreamHandler",
            "formatter": "simple",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "WARNING",
    },
    "loggers": {
        "django": {
            "handlers": ["file", "console"],
            "level": "INFO",
            "propagate": False,
        },
        "core": {
            "handlers": ["file", "console"],
            "level": "DEBUG",
            "propagate": False,
        },
        "accounts": {
            "handlers": ["file", "console"],
            "level": "DEBUG",
            "propagate": False,
        },
        "graphql_api": {
            "handlers": ["file", "console"],
            "level": "DEBUG",
            "propagate": False,
        },
    },
}

# Create logs directory if it doesn't exist
os.makedirs(BASE_DIR / "logs", exist_ok=True)

# Security Settings for Production
if not DEBUG:
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_SECONDS = 31536000  # 1 year
    SECURE_REDIRECT_EXEMPT = []
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

# Cache Configuration
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "unique-snowflake",
    }
}

# Session Configuration
SESSION_ENGINE = "django.contrib.sessions.backends.db"
SESSION_COOKIE_AGE = 86400  # 24 hours
SESSION_COOKIE_HTTPONLY = True
SESSION_SAVE_EVERY_REQUEST = True

# CSRF Configuration
CSRF_COOKIE_HTTPONLY = True
CSRF_TRUSTED_ORIGINS = CORS_ALLOWED_ORIGINS

# Default Auto Field
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
