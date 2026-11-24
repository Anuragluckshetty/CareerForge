from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlalchemy import inspect, text

from app.api.assistant import router as assistant_router
from app.api.auth import router as auth_router
from app.api.agents import router as agents_router
from app.api.practice import router as practice_router
from app.config.settings import settings
from app.database.session import Base, engine
from app.models import user as user_model  # noqa: F401
from sqlalchemy.exc import SQLAlchemyError

@asynccontextmanager
async def lifespan(_: FastAPI):
    try:
        Base.metadata.create_all(bind=engine)
        if engine.dialect.name == "postgresql":
            profile_foreign_keys = inspect(engine).get_foreign_keys("student_profiles")
            has_user_foreign_key = any(
                "user_id" in key.get("constrained_columns", [])
                and key.get("referred_table") == "users"
                for key in profile_foreign_keys
            )
            if not has_user_foreign_key:
                with engine.begin() as connection:
                    connection.execute(
                        text(
                            "ALTER TABLE student_profiles "
                            "ADD CONSTRAINT fk_student_profiles_user_id_users "
                            "FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE"
                        )
                    )
    except SQLAlchemyError:
        if settings.app_env.lower() == "production":
            raise
    yield


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="Personalized placement preparation API.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(assistant_router, prefix=settings.api_v1_prefix)
app.include_router(auth_router, prefix=settings.api_v1_prefix)
app.include_router(agents_router, prefix=settings.api_v1_prefix)
app.include_router(practice_router, prefix=settings.api_v1_prefix)


@app.get("/health", tags=["system"])
def health_check() -> dict[str, str]:
    """Report that the API process is ready to receive requests."""
    return {"status": "ok", "service": settings.app_name}

