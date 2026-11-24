from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: str = Field(min_length=1, max_length=120)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class ProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str
    preferred_language: str
    skill_level: str
    target_role: str
    interests: str
    goals: str


class ProfileUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    preferred_language: str | None = Field(default=None, max_length=80)
    skill_level: str | None = Field(default=None, max_length=40)
    target_role: str | None = Field(default=None, max_length=120)
    interests: str | None = Field(default=None, max_length=500)
    goals: str | None = Field(default=None, max_length=1000)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: EmailStr
    profile: ProfileResponse | None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

