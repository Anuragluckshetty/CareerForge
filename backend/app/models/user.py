from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.session import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(256))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    profile: Mapped["StudentProfile | None"] = relationship(
        back_populates="user", cascade="all, delete-orphan", uselist=False
    )


class StudentProfile(Base):
    __tablename__ = "student_profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(120), default="Student")
    preferred_language: Mapped[str] = mapped_column(String(80), default="Python")
    skill_level: Mapped[str] = mapped_column(String(40), default="beginner")
    target_role: Mapped[str] = mapped_column(String(120), default="Software Engineer")
    interests: Mapped[str] = mapped_column(String(500), default="")
    goals: Mapped[str] = mapped_column(String(1000), default="")
    user: Mapped[User] = relationship(back_populates="profile")

