"""
GraphQL API models.

This module is intentionally minimal as the GraphQL API app
doesn't define its own database models. It uses models from
the core and accounts apps through GraphQL types and resolvers.
"""

# This file exists to satisfy Django's app structure requirements.
# The GraphQL API app doesn't define its own database models,
# instead it provides GraphQL interfaces to models defined in
# other apps (core, accounts).
