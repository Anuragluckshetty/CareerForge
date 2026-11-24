"""FastAPI routers used by the CareerForge application."""

from app.api.agents import router as agents_router
from app.api.assistant import router as assistant_router
from app.api.auth import router as auth_router
from app.api.practice import router as practice_router

__all__ = [
    "agents_router",
    "assistant_router",
    "auth_router",
    "practice_router",
]

