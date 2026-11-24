from typing import Any

from pydantic import BaseModel, Field, model_validator


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=8_000)
    system_prompt: str | None = Field(default=None, max_length=4_000)


class ChatResponse(BaseModel):
    message: str
    model: str


class ResumeChatRequest(BaseModel):
    resume_text: str = Field(min_length=1, max_length=40_000)
    message: str = Field(min_length=1, max_length=8_000)


class ResumeGenerateRequest(BaseModel):
    resume_text: str = Field(min_length=20, max_length=40_000)
    target_job_role: str = Field(min_length=1, max_length=160)


class ResumeContact(BaseModel):
    name: str = ""
    email: str = ""
    phone: str = ""
    location: str = ""
    website: str = ""
    linkedin: str = ""
    github: str = ""


class ResumeItem(BaseModel):
    title: str
    organization: str = ""
    location: str = ""
    dates: str = ""
    details: list[str] = Field(default_factory=list)

    @model_validator(mode="before")
    @classmethod
    def normalize_model_fields(cls, value: Any) -> Any:
        if not isinstance(value, dict):
            return value

        normalized = dict(value)
        aliases = {
            "title": ("degree", "role", "position", "project_name", "name"),
            "organization": ("institution", "university", "company", "employer", "school"),
            "location": ("city",),
            "dates": ("year", "graduation_year", "period", "date"),
            "details": ("description", "responsibilities", "highlights", "bullets"),
        }
        for field, alternatives in aliases.items():
            if field not in normalized:
                for alternative in alternatives:
                    if alternative in normalized:
                        normalized[field] = normalized[alternative]
                        break

        if isinstance(normalized.get("details"), str):
            normalized["details"] = [normalized["details"]]
        return normalized


class ResumeSkillGroup(BaseModel):
    category: str
    skills: list[str] = Field(default_factory=list)


class ResumeContent(BaseModel):
    contact: ResumeContact = Field(default_factory=ResumeContact)
    summary: str = ""
    technical_skills: list[ResumeSkillGroup] = Field(default_factory=list)
    education: list[ResumeItem] = Field(default_factory=list)
    projects: list[ResumeItem] = Field(default_factory=list)
    experience: list[ResumeItem] = Field(default_factory=list)
    certifications: list[str] = Field(default_factory=list)
    achievements: list[str] = Field(default_factory=list)


class ResumeGenerateResponse(BaseModel):
    resume: ResumeContent
    latex_source: str

