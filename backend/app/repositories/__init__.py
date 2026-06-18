"""Data-access layer.

Repositories encapsulate all persistence concerns and expose intention-revealing
methods to the service layer, keeping SQLAlchemy out of the API and business code.
"""
from app.repositories.user import UserRepository
from app.repositories.document import DocumentRepository

__all__ = ["UserRepository", "DocumentRepository"]
